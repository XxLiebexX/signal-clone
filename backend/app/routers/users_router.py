from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List

from app.database import get_db
from app.models import User, Contact
from app.schemas import UserOut, ContactOut, ContactCreate, UserUpdate
from app.auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("/search", response_model=List[UserOut])
def search_users(q: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not q or len(q.strip()) == 0:
        return []
    
    query_str = f"%{q.strip()}%"
    users = db.query(User).filter(
        User.id != current_user.id,
        or_(
            User.display_name.ilike(query_str),
            User.username.ilike(query_str),
            User.phone.ilike(query_str)
        )
    ).limit(20).all()
    
    return users

@router.get("/all", response_model=List[UserOut])
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return users

@router.get("/contacts", response_model=List[ContactOut])
def get_contacts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contacts = db.query(Contact).filter(Contact.user_id == current_user.id).all()
    return contacts

@router.post("/contacts", response_model=ContactOut)
def add_contact(req: ContactCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    target = db.query(User).filter(
        or_(User.phone == req.phone_or_username, User.username == req.phone_or_username)
    ).first()

    if not target:
        raise HTTPException(status_code=444, detail="User not found")
    
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself as contact")

    existing = db.query(Contact).filter(
        Contact.user_id == current_user.id,
        Contact.contact_id == target.id
    ).first()

    if existing:
        return existing

    new_contact = Contact(
        user_id=current_user.id,
        contact_id=target.id,
        nickname=req.nickname
    )
    db.add(new_contact)
    db.commit()
    db.refresh(new_contact)

    return new_contact

@router.put("/profile", response_model=UserOut)
def update_profile(req: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if req.display_name is not None:
        current_user.display_name = req.display_name
    if req.avatar_url is not None:
        current_user.avatar_url = req.avatar_url
    if req.about is not None:
        current_user.about = req.about
    if req.status is not None:
        current_user.status = req.status

    db.commit()
    db.refresh(current_user)
    return current_user
