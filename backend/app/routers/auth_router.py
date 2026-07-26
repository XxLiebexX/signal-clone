from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models import User
from app.schemas import PhoneLoginRequest, RegisterRequest, TokenResponse, UserOut, UserUpdate
from app.auth import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/phone-login", response_model=TokenResponse)
def phone_login(req: PhoneLoginRequest, db: Session = Depends(get_db)):
    # Clean phone number
    phone = req.phone.strip()
    
    # Check if user exists by phone
    user = db.query(User).filter(User.phone == phone).first()
    
    if not user:
        # Create a user automatically for fast onboarding demo!
        default_username = f"user_{phone.replace('+', '').replace(' ', '')}"
        default_name = f"Signal User ({phone[-4:] if len(phone)>=4 else phone})"
        user = User(
            phone=phone,
            username=default_username,
            display_name=default_name,
            password_hash=get_password_hash("signal123"),
            status="online",
            about="Available on Signal"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    user.status = "online"
    user.last_seen = datetime.utcnow()
    db.commit()

    token = create_access_token(data={"sub": user.id})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))

@router.post("/firebase-login", response_model=TokenResponse)
def firebase_login(req: FirebaseLoginRequest, db: Session = Depends(get_db)):
    phone = req.phone.strip()
    
    # Locate or create user in SQLite database
    user = db.query(User).filter(User.phone == phone).first()
    
    if not user:
        default_username = f"user_{phone.replace('+', '').replace(' ', '')}"
        display_name = req.display_name or f"Signal User ({phone[-4:] if len(phone)>=4 else phone})"
        user = User(
            phone=phone,
            username=default_username,
            display_name=display_name,
            password_hash=get_password_hash("firebase_auth_sec_123"),
            status="online",
            about="Available on Signal (Verified via Firebase SMS)"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    user.status = "online"
    user.last_seen = datetime.utcnow()
    db.commit()

    token = create_access_token(data={"sub": user.id})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))

@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing_phone = db.query(User).filter(User.phone == req.phone).first()
    if existing_phone:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    existing_user = db.query(User).filter(User.username == req.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        phone=req.phone,
        username=req.username,
        display_name=req.display_name,
        avatar_url=req.avatar_url,
        about=req.about or "Hey there! I am using Signal.",
        password_hash=get_password_hash(req.password),
        status="online"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": user.id})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/users", response_model=List[UserOut])
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return users
