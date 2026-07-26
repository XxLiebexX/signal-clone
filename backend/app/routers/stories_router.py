from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models import Story, User
from app.schemas import UserOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/stories", tags=["stories"])

class StoryCreate(BaseModel):
    content: Optional[str] = None
    media_url: Optional[str] = None
    bg_color: Optional[str] = "from-purple-600 to-indigo-900"
    expire_hours: Optional[int] = 24

class StoryOut(BaseModel):
    id: str
    user_id: str
    user: UserOut
    content: Optional[str] = None
    media_url: Optional[str] = None
    bg_color: str
    expires_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("", response_model=List[StoryOut])
def get_active_stories(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    now = datetime.utcnow()
    # Delete expired stories
    db.query(Story).filter(Story.expires_at <= now).delete(synchronize_session=False)
    db.commit()

    stories = db.query(Story).filter(Story.expires_at > now).order_by(Story.created_at.desc()).all()
    return stories

@router.post("", response_model=StoryOut)
async def create_story(req: StoryCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not req.content and not req.media_url:
        raise HTTPException(status_code=400, detail="Story must have content or media_url")

    expire_hours = req.expire_hours or 24
    expires_at = datetime.utcnow() + timedelta(hours=expire_hours)

    story = Story(
        user_id=current_user.id,
        content=req.content,
        media_url=req.media_url,
        bg_color=req.bg_color or "from-purple-600 to-indigo-900",
        expires_at=expires_at
    )
    db.add(story)
    db.commit()
    db.refresh(story)

    return story

@router.delete("/{id}")
async def delete_story(id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == id, Story.user_id == current_user.id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found or unauthorized")
    
    db.delete(story)
    db.commit()
    return {"status": "deleted"}
