import os
import shutil
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models import Conversation, ConversationMember, Message, User, MessageReceipt, Reaction
from app.schemas import MessageOut, MessageCreate, ReactionOut, ReactionCreate, UserOut
from app.auth import get_current_user
from app.websocket_manager import manager

router = APIRouter(tags=["messages"])

def build_message_out(msg: Message, db: Session) -> dict:
    sender_out = UserOut.model_validate(msg.sender)
    
    reply_content = None
    reply_sender_name = None
    if msg.reply_to_id:
        parent = db.query(Message).filter(Message.id == msg.reply_to_id).first()
        if parent:
            reply_content = parent.content
            if parent.sender:
                reply_sender_name = parent.sender.display_name

    reactions_out = []
    for r in msg.reactions:
        u_name = r.user.display_name if r.user else "User"
        reactions_out.append({
            "id": r.id,
            "message_id": r.message_id,
            "user_id": r.user_id,
            "emoji": r.emoji,
            "created_at": r.created_at,
            "user_name": u_name
        })

    return {
        "id": msg.id,
        "conversation_id": msg.conversation_id,
        "sender_id": msg.sender_id,
        "sender": sender_out,
        "reply_to_id": msg.reply_to_id,
        "reply_to_content": reply_content,
        "reply_to_sender_name": reply_sender_name,
        "content": msg.content,
        "message_type": msg.message_type,
        "media_url": msg.media_url,
        "status": msg.status,
        "expires_at": msg.expires_at.isoformat() + "Z" if isinstance(msg.expires_at, datetime) else (str(msg.expires_at) + "Z" if msg.expires_at and not str(msg.expires_at).endswith("Z") else msg.expires_at),
        "created_at": msg.created_at.isoformat() + "Z" if isinstance(msg.created_at, datetime) else (str(msg.created_at) + "Z" if msg.created_at and not str(msg.created_at).endswith("Z") else msg.created_at),
        "reactions": reactions_out
    }

@router.get("/api/conversations/{conversation_id}/messages", response_model=List[MessageOut])
def get_messages(conversation_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    is_member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id
    ).first()

    if not is_member:
        if conv.type == "group":
            db.add(ConversationMember(conversation_id=conversation_id, user_id=current_user.id, role="member"))
            db.commit()
        else:
            raise HTTPException(status_code=403, detail="Not a member of this direct conversation")

    # Purge expired disappearing messages first
    now = datetime.utcnow()
    db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.expires_at.isnot(None),
        Message.expires_at <= now
    ).delete(synchronize_session=False)
    db.commit()

    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at.asc()).all()

    return [build_message_out(m, db) for m in messages]

@router.post("/api/messages", response_model=MessageOut)
async def create_message(req: MessageCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == req.conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    is_member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == req.conversation_id,
        ConversationMember.user_id == current_user.id
    ).first()
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")

    expires_at = None
    if conv.disappearing_timer and conv.disappearing_timer > 0:
        expires_at = datetime.utcnow() + timedelta(seconds=conv.disappearing_timer)

    msg = Message(
        conversation_id=req.conversation_id,
        sender_id=current_user.id,
        content=req.content,
        message_type=req.message_type or "text",
        media_url=req.media_url,
        reply_to_id=req.reply_to_id,
        status="sent",
        expires_at=expires_at
    )
    db.add(msg)
    conv.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(msg)

    # Automatically create delivery receipt for sender
    r = MessageReceipt(message_id=msg.id, user_id=current_user.id, status="read")
    db.add(r)
    db.commit()

    msg_payload = build_message_out(msg, db)
    
    # Broadcast to all conversation members via WebSocket
    all_members = [m.user_id for m in conv.members]
    await manager.broadcast_to_users(
        {"type": "new_message", "message": msg_payload},
        all_members
    )

    return msg_payload

@router.post("/api/messages/{message_id}/read")
async def mark_message_read(message_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    receipt = db.query(MessageReceipt).filter(
        MessageReceipt.message_id == message_id,
        MessageReceipt.user_id == current_user.id
    ).first()

    if not receipt:
        receipt = MessageReceipt(message_id=message_id, user_id=current_user.id, status="read")
        db.add(receipt)
    else:
        receipt.status = "read"
        receipt.updated_at = datetime.utcnow()

    msg.status = "read"
    db.commit()

    # Notify sender & members
    conv = db.query(Conversation).filter(Conversation.id == msg.conversation_id).first()
    all_members = [m.user_id for m in conv.members] if conv else [msg.sender_id]

    await manager.broadcast_to_users(
        {"type": "message_read", "message_id": message_id, "conversation_id": msg.conversation_id, "user_id": current_user.id},
        all_members
    )

    return {"status": "success"}

@router.post("/api/messages/{message_id}/reactions", response_model=ReactionOut)
async def add_reaction(message_id: str, req: ReactionCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    existing = db.query(Reaction).filter(
        Reaction.message_id == message_id,
        Reaction.user_id == current_user.id
    ).first()

    if existing:
        if existing.emoji == req.emoji:
            # Same emoji clicked -> Toggle Off (remove reaction)
            db.delete(existing)
            db.commit()
            
            conv = db.query(Conversation).filter(Conversation.id == msg.conversation_id).first()
            all_members = [m.user_id for m in conv.members] if conv else []
            await manager.broadcast_to_users(
                {"type": "reaction_removed", "message_id": message_id, "reaction_id": existing.id, "conversation_id": msg.conversation_id},
                all_members
            )
            return {"id": existing.id, "message_id": message_id, "user_id": current_user.id, "emoji": req.emoji, "created_at": datetime.utcnow(), "user_name": current_user.display_name}
        else:
            # Different emoji clicked -> Replace existing reaction with new emoji!
            existing.emoji = req.emoji
            existing.created_at = datetime.utcnow()
            db.commit()
            db.refresh(existing)

            reaction_payload = {
                "id": existing.id,
                "message_id": existing.message_id,
                "user_id": existing.user_id,
                "emoji": existing.emoji,
                "created_at": existing.created_at,
                "user_name": current_user.display_name
            }

            conv = db.query(Conversation).filter(Conversation.id == msg.conversation_id).first()
            all_members = [m.user_id for m in conv.members] if conv else []
            await manager.broadcast_to_users(
                {"type": "reaction_added", "message_id": message_id, "reaction": reaction_payload, "conversation_id": msg.conversation_id},
                all_members
            )
            return reaction_payload

    # Create new reaction if user has none
    reaction = Reaction(message_id=message_id, user_id=current_user.id, emoji=req.emoji)
    db.add(reaction)
    db.commit()
    db.refresh(reaction)

    reaction_payload = {
        "id": reaction.id,
        "message_id": reaction.message_id,
        "user_id": reaction.user_id,
        "emoji": reaction.emoji,
        "created_at": reaction.created_at,
        "user_name": current_user.display_name
    }

    conv = db.query(Conversation).filter(Conversation.id == msg.conversation_id).first()
    all_members = [m.user_id for m in conv.members] if conv else []
    await manager.broadcast_to_users(
        {"type": "reaction_added", "message_id": message_id, "reaction": reaction_payload, "conversation_id": msg.conversation_id},
        all_members
    )

    return reaction_payload

# Upload endpoint for images and files
UPLOAD_DIR = "./static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    content_type = file.content_type or ""
    if content_type.startswith("image"):
        msg_type = "image"
    elif content_type.startswith("audio") or file.filename.endswith(('.mp3', '.wav', '.ogg', '.m4a', '.webm', '.aac')):
        msg_type = "audio"
    else:
        msg_type = "file"

    return {
        "url": f"/static/uploads/{filename}",
        "filename": file.filename,
        "content_type": content_type,
        "message_type": msg_type
    }
