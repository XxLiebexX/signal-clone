import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    phone = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    about = Column(String, default="Hey there! I am using Signal.")
    password_hash = Column(String, nullable=False)
    status = Column(String, default="online")
    last_seen = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    contacts = relationship("Contact", foreign_keys="Contact.user_id", back_populates="user", cascade="all, delete-orphan")
    memberships = relationship("ConversationMember", back_populates="user", cascade="all, delete-orphan")
    sent_messages = relationship("Message", back_populates="sender", cascade="all, delete-orphan")
    reactions = relationship("Reaction", back_populates="user", cascade="all, delete-orphan")


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    contact_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    nickname = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="contacts")
    contact_user = relationship("User", foreign_keys=[contact_id])


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=generate_uuid)
    type = Column(String, nullable=False)  # "direct" or "group"
    name = Column(String, nullable=True)   # for group chats
    avatar_url = Column(String, nullable=True)
    description = Column(String, nullable=True)
    disappearing_timer = Column(Integer, default=0) # 0 = off, seconds
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    members = relationship("ConversationMember", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class ConversationMember(Base):
    __tablename__ = "conversation_members"

    id = Column(String, primary_key=True, default=generate_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, default="member") # "admin" or "member"
    joined_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    conversation = relationship("Conversation", back_populates="members")
    user = relationship("User", back_populates="memberships")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reply_to_id = Column(String, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)
    content = Column(Text, nullable=False)
    message_type = Column(String, default="text") # "text", "image", "file", "audio", "system"
    media_url = Column(String, nullable=True)
    status = Column(String, default="sent") # "sent", "delivered", "read"
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", back_populates="sent_messages")
    reply_to = relationship("Message", remote_side=[id])
    reactions = relationship("Reaction", back_populates="message", cascade="all, delete-orphan")
    receipts = relationship("MessageReceipt", back_populates="message", cascade="all, delete-orphan")


class MessageReceipt(Base):
    __tablename__ = "message_receipts"

    id = Column(String, primary_key=True, default=generate_uuid)
    message_id = Column(String, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="delivered") # "delivered", "read"
    updated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    message = relationship("Message", back_populates="receipts")
    user = relationship("User")


class Reaction(Base):
    __tablename__ = "reactions"

    id = Column(String, primary_key=True, default=generate_uuid)
    message_id = Column(String, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    emoji = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    message = relationship("Message", back_populates="reactions")
    user = relationship("User", back_populates="reactions")


class Story(Base):
    __tablename__ = "stories"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=True)
    media_url = Column(String, nullable=True)
    bg_color = Column(String, default="from-purple-600 to-indigo-900")
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")
