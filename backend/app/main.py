import json
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import os

from app.database import engine, Base, get_db, SessionLocal
from app.models import User, Conversation, ConversationMember, Message
from app.routers import auth_router, users_router, conversations_router, messages_router, stories_router
from app.websocket_manager import manager
from app.auth import SECRET_KEY, ALGORITHM, get_password_hash
from jose import jwt, JWTError

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

# Create Database tables
Base.metadata.create_all(bind=engine)

DEMO_ACCOUNTS = [
    {
        "phone": "+919876543210",
        "username": "yuvraj",
        "display_name": "Yuvraj",
        "avatar_url": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200",
        "about": "Privacy Enthusiast & Tech Lead 🛡️"
    },
    {
        "phone": "+919876543211",
        "username": "angel",
        "display_name": "Angel",
        "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
        "about": "Building modern fullstack applications 🚀"
    },
    {
        "phone": "+919876543212",
        "username": "rio",
        "display_name": "Rio",
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
        "about": "Signal UI & Encrypted Chat Advocate ✨"
    }
]

def seed_demo_accounts():
    db = SessionLocal()
    try:
        user_map = {}
        for acc in DEMO_ACCOUNTS:
            u = db.query(User).filter(User.phone == acc["phone"]).first()
            if not u:
                u = User(
                    phone=acc["phone"],
                    username=acc["username"],
                    display_name=acc["display_name"],
                    avatar_url=acc["avatar_url"],
                    about=acc["about"],
                    password_hash=get_password_hash("signal123"),
                    status="online"
                )
                db.add(u)
                db.commit()
                db.refresh(u)
            else:
                u.display_name = acc["display_name"]
                u.avatar_url = acc["avatar_url"]
                u.username = acc["username"]
                db.commit()
            user_map[acc["username"]] = u
        
        # Delete any corrupted direct conversations that have != 2 members
        corrupted_convs = db.query(Conversation).filter(Conversation.type == "direct").all()
        for c in corrupted_convs:
            if len(c.members) != 2:
                db.query(Message).filter(Message.conversation_id == c.id).delete(synchronize_session=False)
                db.query(ConversationMember).filter(ConversationMember.conversation_id == c.id).delete(synchronize_session=False)
                db.query(Conversation).filter(Conversation.id == c.id).delete(synchronize_session=False)
        db.commit()

        # Pre-create 1-on-1 direct conversations between all accounts
        users_list = list(user_map.values())
        for i in range(len(users_list)):
            for j in range(i + 1, len(users_list)):
                u1 = users_list[i]
                u2 = users_list[j]
                
                m1_ids = [cm.conversation_id for cm in db.query(ConversationMember).filter(ConversationMember.user_id == u1.id).all()]
                direct_m1_ids = [c.id for c in db.query(Conversation.id).filter(Conversation.type == "direct", Conversation.id.in_(m1_ids)).all()]
                m2_exist = db.query(ConversationMember.conversation_id).filter(
                    ConversationMember.conversation_id.in_(direct_m1_ids),
                    ConversationMember.user_id == u2.id
                ).first()

                if not m2_exist:
                    conv = Conversation(type="direct")
                    db.add(conv)
                    db.commit()
                    db.refresh(conv)

                    cm1 = ConversationMember(conversation_id=conv.id, user_id=u1.id, role="admin")
                    cm2 = ConversationMember(conversation_id=conv.id, user_id=u2.id, role="member")
                    db.add_all([cm1, cm2])
                    db.commit()
    except Exception as e:
        logger.error(f"Seeding error: {e}")
    finally:
        db.close()

app = FastAPI(
    title="Signal Messenger Clone API",
    description="Backend API for Signal Clone featuring WebSockets, SQLite, and Auth",
    version="1.0.0"
)

@app.on_event("startup")
def on_startup():
    try:
        seed_demo_accounts()
    except Exception as e:
        logger.error(f"Startup seeding error: {e}")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for media uploads
os.makedirs("./static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

from fastapi.responses import FileResponse

# Include Routers
app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(conversations_router.router)
app.include_router(messages_router.router)
app.include_router(stories_router.router)

# Mount Next.js frontend static build if available
frontend_out_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "out"))
if os.path.exists(frontend_out_dir):
    _next_dir = os.path.join(frontend_out_dir, "_next")
    if os.path.exists(_next_dir):
        app.mount("/_next", StaticFiles(directory=_next_dir), name="frontend_next")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str = ""):
        if full_path.startswith("api/") or full_path == "ws" or full_path.startswith("static/"):
            raise HTTPException(status_code=404, detail="Not Found")
        
        target_path = os.path.join(frontend_out_dir, full_path)
        if os.path.isfile(target_path):
            return FileResponse(target_path)
        
        index_path = os.path.join(frontend_out_dir, "index.html")
        if os.path.isfile(index_path):
            return FileResponse(index_path)
        
        return {"status": "online", "app": "Signal Messenger Clone Backend API"}
else:
    @app.get("/")
    def root():
        return {
            "status": "online",
            "app": "Signal Messenger Clone Backend API",
            "version": "1.0.0",
            "docs": "/docs"
        }

# WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...), db: Session = Depends(get_db)):
    # Authenticate via JWT token parameter
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(websocket, user_id)

    # Broadcast presence online
    member_convs = db.query(ConversationMember.conversation_id).filter(ConversationMember.user_id == user_id).all()
    conv_ids = [c[0] for c in member_convs]
    peer_members = db.query(ConversationMember.user_id).filter(
        ConversationMember.conversation_id.in_(conv_ids),
        ConversationMember.user_id != user_id
    ).distinct().all()
    peer_ids = [p[0] for p in peer_members]

    await manager.broadcast_to_users(
        {"type": "user_status_changed", "user_id": user_id, "status": "online"},
        peer_ids
    )

    try:
        while True:
            data = await websocket.receive_text()
            try:
                event = json.loads(data)
                event_type = event.get("type")

                if event_type == "typing":
                    conversation_id = event.get("conversation_id")
                    is_typing = event.get("is_typing", True)
                    
                    # Find all other members in conversation
                    members = db.query(ConversationMember.user_id).filter(
                        ConversationMember.conversation_id == conversation_id,
                        ConversationMember.user_id != user_id
                    ).all()
                    recipient_ids = [m[0] for m in members]

                    await manager.broadcast_to_users({
                        "type": "user_typing",
                        "conversation_id": conversation_id,
                        "user_id": user_id,
                        "user_name": user.display_name,
                        "is_typing": is_typing
                    }, recipient_ids)

                elif event_type == "ping":
                    await websocket.send_json({"type": "pong"})

            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        # Broadcast offline status
        await manager.broadcast_to_users(
            {"type": "user_status_changed", "user_id": user_id, "status": "offline"},
            peer_ids
        )
