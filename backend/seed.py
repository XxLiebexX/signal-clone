import sys
import os

# Ensure backend folder is on python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta
from app.database import SessionLocal, engine, Base
from app.models import User, Contact, Conversation, ConversationMember, Message, MessageReceipt, Reaction
from app.auth import get_password_hash

def seed_database():
    print("Resetting SQLite Database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    print("Creating users: Yuvraj, Angel, Anshi, Khushi...")
    password_hash = get_password_hash("signal123")

    u1 = User(
        phone="+919876543210",
        username="yuvraj",
        display_name="Yuvraj",
        avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
        about="Privacy Enthusiast & Tech Lead 🛡️",
        password_hash=password_hash,
        status="online"
    )
    u2 = User(
        phone="+919876543211",
        username="angel",
        display_name="Angel",
        avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80",
        about="Building modern fullstack applications 🚀",
        password_hash=password_hash,
        status="online"
    )
    u3 = User(
        phone="+919876543212",
        username="anshi",
        display_name="Anshi",
        avatar_url="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80",
        about="Signal UI & Encrypted Chat Advocate ✨",
        password_hash=password_hash,
        status="away"
    )
    u4 = User(
        phone="+919876543213",
        username="khushi",
        display_name="Khushi",
        avatar_url="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80",
        about="Designing pixel-perfect interfaces 🎨",
        password_hash=password_hash,
        status="online"
    )

    db.add_all([u1, u2, u3, u4])
    db.commit()

    print("Seeding Contacts for Yuvraj, Angel, Anshi, Khushi...")
    contacts = [
        Contact(user_id=u1.id, contact_id=u2.id, nickname="Angel"),
        Contact(user_id=u1.id, contact_id=u3.id, nickname="Anshi"),
        Contact(user_id=u1.id, contact_id=u4.id, nickname="Khushi"),
        Contact(user_id=u2.id, contact_id=u1.id, nickname="Yuvraj"),
        Contact(user_id=u2.id, contact_id=u3.id, nickname="Anshi"),
        Contact(user_id=u2.id, contact_id=u4.id, nickname="Khushi"),
        Contact(user_id=u3.id, contact_id=u1.id, nickname="Yuvraj"),
        Contact(user_id=u3.id, contact_id=u2.id, nickname="Angel"),
        Contact(user_id=u3.id, contact_id=u4.id, nickname="Khushi"),
        Contact(user_id=u4.id, contact_id=u1.id, nickname="Yuvraj"),
        Contact(user_id=u4.id, contact_id=u2.id, nickname="Angel"),
        Contact(user_id=u4.id, contact_id=u3.id, nickname="Anshi"),
    ]
    db.add_all(contacts)
    db.commit()

    print("Seeding Conversations & Messages...")
    now = datetime.utcnow()

    # 1. Direct Chat: Yuvraj <-> Angel
    conv1 = Conversation(type="direct", updated_at=now - timedelta(minutes=5))
    db.add(conv1)
    db.commit()
    db.refresh(conv1)

    db.add_all([
        ConversationMember(conversation_id=conv1.id, user_id=u1.id, role="admin"),
        ConversationMember(conversation_id=conv1.id, user_id=u2.id, role="member"),
    ])

    m1_1 = Message(
        conversation_id=conv1.id,
        sender_id=u2.id,
        content="Hey Yuvraj! The Signal real-time messaging pipeline looks super smooth 🔥",
        status="read",
        created_at=now - timedelta(hours=2)
    )
    db.add(m1_1)
    db.commit()

    m1_2 = Message(
        conversation_id=conv1.id,
        sender_id=u1.id,
        reply_to_id=m1_1.id,
        content="Thanks Angel! Test out sending messages, disappearing timers, and voice/video calls.",
        status="read",
        created_at=now - timedelta(hours=1, minutes=45)
    )
    db.add(m1_2)
    db.commit()

    m1_3 = Message(
        conversation_id=conv1.id,
        sender_id=u2.id,
        content="Check out this design layout mockup screenshot:",
        message_type="image",
        media_url="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
        status="read",
        created_at=now - timedelta(minutes=20)
    )
    db.add(m1_3)
    db.commit()

    m1_4 = Message(
        conversation_id=conv1.id,
        sender_id=u1.id,
        content="Looks clean! Let's check with Anshi and Khushi in the group chat as well.",
        status="delivered",
        created_at=now - timedelta(minutes=5)
    )
    db.add(m1_4)
    db.commit()

    r1 = Reaction(message_id=m1_4.id, user_id=u2.id, emoji="❤️")
    db.add(r1)

    # 2. Direct Chat: Yuvraj <-> Anshi (Disappearing Timer = 30s)
    conv2 = Conversation(type="direct", disappearing_timer=30, updated_at=now - timedelta(minutes=15))
    db.add(conv2)
    db.commit()

    db.add_all([
        ConversationMember(conversation_id=conv2.id, user_id=u1.id, role="admin"),
        ConversationMember(conversation_id=conv2.id, user_id=u3.id, role="member"),
    ])

    sys_msg2 = Message(
        conversation_id=conv2.id,
        sender_id=u3.id,
        content="Anshi set disappearing messages to 30 seconds",
        message_type="system",
        created_at=now - timedelta(minutes=40)
    )
    msg2_1 = Message(
        conversation_id=conv2.id,
        sender_id=u3.id,
        content="Hey Yuvraj! Self-destructing messages are enabled in this conversation ⏳",
        status="read",
        created_at=now - timedelta(minutes=15)
    )
    db.add_all([sys_msg2, msg2_1])
    db.commit()

    # 3. Direct Chat: Yuvraj <-> Khushi
    conv3 = Conversation(type="direct", updated_at=now - timedelta(minutes=30))
    db.add(conv3)
    db.commit()

    db.add_all([
        ConversationMember(conversation_id=conv3.id, user_id=u1.id, role="admin"),
        ConversationMember(conversation_id=conv3.id, user_id=u4.id, role="member"),
    ])

    msg3_1 = Message(
        conversation_id=conv3.id,
        sender_id=u4.id,
        content="Hi Yuvraj! The dark theme OLED color palette `#121212` and `#2C6BED` look awesome!",
        status="read",
        created_at=now - timedelta(minutes=30)
    )
    db.add(msg3_1)
    db.commit()

    # 4. Group Conversation: 🚀 Signal Squad (Yuvraj, Angel, Anshi, Khushi)
    conv4 = Conversation(
        type="group",
        name="🚀 Signal Squad",
        avatar_url="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=256&q=80",
        description="Official group for Yuvraj, Angel, Anshi & Khushi.",
        updated_at=now - timedelta(minutes=2)
    )
    db.add(conv4)
    db.commit()

    db.add_all([
        ConversationMember(conversation_id=conv4.id, user_id=u1.id, role="admin"),
        ConversationMember(conversation_id=conv4.id, user_id=u2.id, role="member"),
        ConversationMember(conversation_id=conv4.id, user_id=u3.id, role="member"),
        ConversationMember(conversation_id=conv4.id, user_id=u4.id, role="member"),
    ])

    sys_g1 = Message(
        conversation_id=conv4.id,
        sender_id=u1.id,
        content="Yuvraj created the group \"🚀 Signal Squad\"",
        message_type="system",
        created_at=now - timedelta(hours=4)
    )
    gmsg1 = Message(
        conversation_id=conv4.id,
        sender_id=u2.id,
        content="Angel joined the group chat!",
        status="read",
        created_at=now - timedelta(hours=3)
    )
    gmsg2 = Message(
        conversation_id=conv4.id,
        sender_id=u3.id,
        content="Anshi here! WebSockets real-time sync is working perfectly 🙌",
        status="read",
        created_at=now - timedelta(minutes=50)
    )
    gmsg3 = Message(
        conversation_id=conv4.id,
        sender_id=u4.id,
        content="Khushi here! Testing double blue check read receipts in group chat ✨",
        status="read",
        created_at=now - timedelta(minutes=2)
    )
    db.add_all([sys_g1, gmsg1, gmsg2, gmsg3])
    db.commit()

    print("Database successfully re-seeded with Yuvraj, Angel, Anshi, Khushi!")

if __name__ == "__main__":
    seed_database()
