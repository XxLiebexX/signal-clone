from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Auth Schemas
class PhoneLoginRequest(BaseModel):
    phone: str
    code: Optional[str] = "123456"

class FirebaseLoginRequest(BaseModel):
    phone: str
    firebase_id_token: str
    display_name: Optional[str] = None

class RegisterRequest(BaseModel):
    phone: str
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    about: Optional[str] = "Hey there! I am using Signal."
    password: str = "signal123"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

# User Schemas
class UserOut(BaseModel):
    id: str
    phone: str
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    about: Optional[str] = None
    status: str = "online"
    last_seen: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    about: Optional[str] = None
    status: Optional[str] = None

# Contact Schemas
class ContactCreate(BaseModel):
    phone_or_username: str
    nickname: Optional[str] = None

class ContactOut(BaseModel):
    id: str
    nickname: Optional[str] = None
    contact_user: UserOut

    class Config:
        from_attributes = True

# Reaction Schemas
class ReactionOut(BaseModel):
    id: str
    message_id: str
    user_id: str
    emoji: str
    created_at: datetime
    user_name: Optional[str] = None

    class Config:
        from_attributes = True

class ReactionCreate(BaseModel):
    emoji: str

# Message Schemas
class MessageCreate(BaseModel):
    conversation_id: str
    content: str
    message_type: Optional[str] = "text"
    media_url: Optional[str] = None
    reply_to_id: Optional[str] = None

class MessageOut(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender: UserOut
    reply_to_id: Optional[str] = None
    reply_to_content: Optional[str] = None
    reply_to_sender_name: Optional[str] = None
    content: str
    message_type: str
    media_url: Optional[str] = None
    status: str
    expires_at: Optional[datetime] = None
    created_at: datetime
    reactions: List[ReactionOut] = []

    class Config:
        from_attributes = True

# Conversation Member Schemas
class MemberOut(BaseModel):
    id: str
    user_id: str
    role: str
    user: UserOut

    class Config:
        from_attributes = True

# Conversation Schemas
class ConversationCreate(BaseModel):
    type: str # "direct" or "group"
    recipient_id: Optional[str] = None # for direct
    member_ids: Optional[List[str]] = [] # for group
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    description: Optional[str] = None

class ConversationUpdateTimer(BaseModel):
    disappearing_timer: int

class ConversationOut(BaseModel):
    id: str
    type: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    description: Optional[str] = None
    disappearing_timer: int = 0
    created_at: datetime
    updated_at: datetime
    members: List[MemberOut]
    last_message: Optional[MessageOut] = None
    unread_count: int = 0

    class Config:
        from_attributes = True

class AddGroupMember(BaseModel):
    user_id: str

TokenResponse.model_rebuild()
