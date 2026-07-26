from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import Conversation, ConversationMember, User, Message, MessageReceipt
from app.schemas import (
    ConversationOut, ConversationCreate, ConversationUpdateTimer, AddGroupMember,
    MemberOut, MessageOut, UserOut
)
from app.auth import get_current_user
from app.websocket_manager import manager

router = APIRouter(prefix="/api/conversations", tags=["conversations"])

def build_conversation_out(conv: Conversation, current_user_id: str, db: Session) -> dict:
    members_out = [
        {
            "id": m.id,
            "user_id": m.user_id,
            "role": m.role,
            "user": UserOut.model_validate(m.user)
        }
        for m in conv.members
    ]

    last_msg = db.query(Message).filter(
        Message.conversation_id == conv.id
    ).order_by(Message.created_at.desc()).first()

    last_msg_out = None
    if last_msg:
        sender_out = UserOut.model_validate(last_msg.sender)
        last_msg_out = {
            "id": last_msg.id,
            "conversation_id": last_msg.conversation_id,
            "sender_id": last_msg.sender_id,
            "sender": sender_out,
            "reply_to_id": last_msg.reply_to_id,
            "content": last_msg.content,
            "message_type": last_msg.message_type,
            "media_url": last_msg.media_url,
            "status": last_msg.status,
            "expires_at": last_msg.expires_at,
            "created_at": last_msg.created_at,
            "reactions": []
        }

    # Count unread messages (messages in this conversation sent by others that don't have a read receipt for current_user)
    unread_count = db.query(Message).filter(
        Message.conversation_id == conv.id,
        Message.sender_id != current_user_id,
        ~Message.id.in_(
            db.query(MessageReceipt.message_id).filter(
                MessageReceipt.user_id == current_user_id,
                MessageReceipt.status == "read"
            )
        )
    ).count()

    # For direct chat visual fallback, if conversation has no name, set name to the other participant's display name
    name = conv.name
    avatar_url = conv.avatar_url
    if conv.type == "direct":
        members_list = db.query(ConversationMember).filter(ConversationMember.conversation_id == conv.id).all()
        other_member = next((m for m in members_list if m.user_id != current_user_id), None)
        if other_member and other_member.user:
            name = other_member.user.display_name
            avatar_url = other_member.user.avatar_url

    return {
        "id": conv.id,
        "type": conv.type,
        "name": name,
        "avatar_url": avatar_url,
        "description": conv.description,
        "disappearing_timer": conv.disappearing_timer,
        "created_at": conv.created_at,
        "updated_at": conv.updated_at,
        "members": members_out,
        "last_message": last_msg_out,
        "unread_count": unread_count
    }

@router.get("", response_model=List[ConversationOut])
def get_conversations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Find all conversation IDs current user belongs to
    member_conv_ids = db.query(ConversationMember.conversation_id).filter(
        ConversationMember.user_id == current_user.id
    ).all()
    conv_ids = [c[0] for c in member_conv_ids]

    conversations = db.query(Conversation).filter(
        Conversation.id.in_(conv_ids)
    ).order_by(Conversation.updated_at.desc()).all()

    seen_direct_partners = set()
    deduped_conversations = []
    for conv in conversations:
        if conv.type == "direct":
            members_list = db.query(ConversationMember).filter(ConversationMember.conversation_id == conv.id).all()
            other_member = next((m for m in members_list if m.user_id != current_user.id), None)
            if other_member:
                if other_member.user_id in seen_direct_partners:
                    continue
                seen_direct_partners.add(other_member.user_id)
        deduped_conversations.append(conv)

    result = [build_conversation_out(conv, current_user.id, db) for conv in deduped_conversations]
    return result

@router.post("", response_model=ConversationOut)
async def create_conversation(req: ConversationCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if req.type == "direct":
        if not req.recipient_id:
            raise HTTPException(status_code=400, detail="recipient_id required for direct chat")
        
        # Check if direct conversation already exists between these 2 users (filter by type == 'direct' to avoid matching group chats)
        my_conv_ids = [cm.conversation_id for cm in db.query(ConversationMember).filter(ConversationMember.user_id == current_user.id).all()]
        my_direct_conv_ids = [
            c.id for c in db.query(Conversation.id).filter(
                Conversation.type == "direct",
                Conversation.id.in_(my_conv_ids)
            ).all()
        ]
        existing = db.query(ConversationMember.conversation_id).filter(
            ConversationMember.conversation_id.in_(my_direct_conv_ids),
            ConversationMember.user_id == req.recipient_id
        ).first()

        if existing:
            conv = db.query(Conversation).filter(Conversation.id == existing[0]).first()
            return build_conversation_out(conv, current_user.id, db)

        conv = Conversation(type="direct")
        db.add(conv)
        db.commit()
        db.refresh(conv)

        m1 = ConversationMember(conversation_id=conv.id, user_id=current_user.id, role="admin")
        m2 = ConversationMember(conversation_id=conv.id, user_id=req.recipient_id, role="member")
        db.add_all([m1, m2])
        db.commit()

        fresh_conv = db.query(Conversation).filter(Conversation.id == conv.id).first()
        return build_conversation_out(fresh_conv, current_user.id, db)

    elif req.type == "group":
        if not req.name:
            raise HTTPException(status_code=400, detail="Group name is required")
        
        conv = Conversation(
            type="group",
            name=req.name,
            avatar_url=req.avatar_url,
            description=req.description
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

        # Add creator as admin
        admin_member = ConversationMember(conversation_id=conv.id, user_id=current_user.id, role="admin")
        db.add(admin_member)

        # Add other members
        member_ids = req.member_ids or []
        for uid in set(member_ids):
            if uid != current_user.id:
                db.add(ConversationMember(conversation_id=conv.id, user_id=uid, role="member"))
        
        # Add system message
        sys_msg = Message(
            conversation_id=conv.id,
            sender_id=current_user.id,
            content=f"{current_user.display_name} created the group \"{req.name}\"",
            message_type="system"
        )
        db.add(sys_msg)
        db.commit()
        db.refresh(conv)

        # Notify via WebSocket
        all_members = [m.user_id for m in conv.members]
        conv_payload = build_conversation_out(conv, current_user.id, db)
        
        await manager.broadcast_to_users(
            {"type": "new_conversation", "conversation": conv_payload},
            all_members
        )

        return conv_payload

    else:
        raise HTTPException(status_code=400, detail="Invalid conversation type")

@router.get("/{id}", response_model=ConversationOut)
def get_conversation_details(id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    is_member = any(m.user_id == current_user.id for m in conv.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")

    return build_conversation_out(conv, current_user.id, db)

@router.post("/{id}/read")
async def mark_conversation_read(id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    msgs = db.query(Message.id).filter(
        Message.conversation_id == id,
        Message.sender_id != current_user.id
    ).all()
    msg_ids = [m[0] for m in msgs]

    if msg_ids:
        existing_receipts = db.query(MessageReceipt).filter(
            MessageReceipt.message_id.in_(msg_ids),
            MessageReceipt.user_id == current_user.id
        ).all()
        existing_msg_ids = {r.message_id for r in existing_receipts}

        for r in existing_receipts:
            r.status = "read"
            r.updated_at = datetime.utcnow()

        for mid in msg_ids:
            if mid not in existing_msg_ids:
                db.add(MessageReceipt(message_id=mid, user_id=current_user.id, status="read"))

        db.query(Message).filter(Message.id.in_(msg_ids)).update({Message.status: "read"}, synchronize_session=False)
        db.commit()

    return {"status": "success"}

@router.put("/{id}/disappearing", response_model=ConversationOut)
async def update_disappearing_timer(id: str, req: ConversationUpdateTimer, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    is_member = any(m.user_id == current_user.id for m in conv.members)
    if not is_member:
        if conv.type == "group":
            db.add(ConversationMember(conversation_id=id, user_id=current_user.id, role="member"))
            db.commit()
            db.refresh(conv)
        else:
            raise HTTPException(status_code=403, detail="Not a member of this direct conversation")

    conv.disappearing_timer = req.disappearing_timer
    conv.updated_at = datetime.utcnow()

    # System message
    timer_text = "off"
    if req.disappearing_timer > 0:
        sec = req.disappearing_timer
        if sec < 60:
            timer_text = f"{sec} seconds"
        elif sec < 3600:
            timer_text = f"{sec // 60} minutes"
        elif sec < 86400:
            timer_text = f"{sec // 3600} hours"
        else:
            timer_text = f"{sec // 86400} days"
    
    sys_msg = Message(
        conversation_id=conv.id,
        sender_id=current_user.id,
        content=f"{current_user.display_name} set disappearing messages to {timer_text}",
        message_type="system"
    )
    db.add(sys_msg)
    db.commit()

    all_members = [m.user_id for m in conv.members]
    await manager.broadcast_to_users(
        {"type": "disappearing_timer_updated", "conversation_id": conv.id, "timer": req.disappearing_timer},
        all_members
    )

    return build_conversation_out(conv, current_user.id, db)

@router.post("/{id}/members", response_model=ConversationOut)
async def add_group_member(id: str, req: AddGroupMember, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == id, Conversation.type == "group").first()
    if not conv:
        raise HTTPException(status_code=404, detail="Group conversation not found")
    
    new_user = db.query(User).filter(User.id == req.user_id).first()
    if not new_user:
        raise HTTPException(status_code=404, detail="Target user not found")

    existing = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == id,
        ConversationMember.user_id == req.user_id
    ).first()

    if not existing:
        m = ConversationMember(conversation_id=id, user_id=req.user_id, role="member")
        db.add(m)
        sys_msg = Message(
            conversation_id=id,
            sender_id=current_user.id,
            content=f"{current_user.display_name} added {new_user.display_name} to the group",
            message_type="system"
        )
        db.add(sys_msg)
        db.commit()
        db.refresh(conv)

    all_members = [m.user_id for m in conv.members]
    conv_payload = build_conversation_out(conv, current_user.id, db)
    await manager.broadcast_to_users(
        {"type": "member_added", "conversation": conv_payload},
        all_members
    )

    return conv_payload

@router.delete("/{id}/members/{user_id}", response_model=ConversationOut)
async def remove_group_member(id: str, user_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == id, Conversation.type == "group").first()
    if not conv:
        raise HTTPException(status_code=404, detail="Group conversation not found")
    
    target_member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == id,
        ConversationMember.user_id == user_id
    ).first()

    if target_member:
        removed_user = db.query(User).filter(User.id == user_id).first()
        removed_name = removed_user.display_name if removed_user else "User"

        db.delete(target_member)
        
        sys_content = f"{current_user.display_name} removed {removed_name} from the group" if user_id != current_user.id else f"{removed_name} left the group"
        sys_msg = Message(
            conversation_id=id,
            sender_id=current_user.id,
            content=sys_content,
            message_type="system"
        )
        db.add(sys_msg)
        db.commit()
        db.refresh(conv)

    all_members = [m.user_id for m in conv.members] + [user_id]
    conv_payload = build_conversation_out(conv, current_user.id, db)
    await manager.broadcast_to_users(
        {"type": "member_removed", "conversation_id": id, "removed_user_id": user_id},
        all_members
    )

    return conv_payload
