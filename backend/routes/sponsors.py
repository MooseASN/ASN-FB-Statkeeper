"""Sponsor banner management routes"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from ..utils.database import db
from ..utils.auth import get_current_user, User

router = APIRouter(prefix="/sponsor-banners", tags=["sponsors"])


class SponsorBanner(BaseModel):
    id: str = None
    user_id: str = ""
    image_data: str
    filename: str
    link_url: Optional[str] = None
    order: int = 0
    created_at: str = None
    
    def __init__(self, **data):
        super().__init__(**data)
        if not self.id:
            self.id = str(uuid.uuid4())
        if not self.created_at:
            self.created_at = datetime.now(timezone.utc).isoformat()


class SponsorBannerCreate(BaseModel):
    image_data: str
    filename: str
    link_url: Optional[str] = None


class SponsorBannerUpdate(BaseModel):
    link_url: Optional[str] = None


@router.get("")
async def get_sponsor_banners(user: User = Depends(get_current_user)):
    """Get all sponsor banners for the user"""
    banners = await db.sponsor_banners.find(
        {"user_id": user.user_id}, 
        {"_id": 0}
    ).sort("order", 1).to_list(50)
    return banners


@router.get("/public/{user_id}")
async def get_public_sponsor_banners(user_id: str):
    """Get sponsor banners for public display (no auth required)"""
    banners = await db.sponsor_banners.find(
        {"user_id": user_id}, 
        {"_id": 0}
    ).sort("order", 1).to_list(50)
    return banners


@router.post("")
async def create_sponsor_banner(banner_data: SponsorBannerCreate, user: User = Depends(get_current_user)):
    """Upload a new sponsor banner"""
    count = await db.sponsor_banners.count_documents({"user_id": user.user_id})
    
    banner = SponsorBanner(
        user_id=user.user_id,
        image_data=banner_data.image_data,
        filename=banner_data.filename,
        link_url=banner_data.link_url,
        order=count
    )
    
    await db.sponsor_banners.insert_one(banner.model_dump())
    return {"id": banner.id, "filename": banner.filename, "link_url": banner.link_url, "order": banner.order}


@router.put("/{banner_id}")
async def update_sponsor_banner(banner_id: str, banner_data: SponsorBannerUpdate, user: User = Depends(get_current_user)):
    """Update a sponsor banner's link URL"""
    result = await db.sponsor_banners.update_one(
        {"id": banner_id, "user_id": user.user_id},
        {"$set": {"link_url": banner_data.link_url}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    return {"message": "Banner updated", "link_url": banner_data.link_url}


@router.delete("/{banner_id}")
async def delete_sponsor_banner(banner_id: str, user: User = Depends(get_current_user)):
    """Delete a sponsor banner"""
    result = await db.sponsor_banners.delete_one({"id": banner_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    return {"message": "Banner deleted"}


@router.put("/reorder")
async def reorder_sponsor_banners(banner_ids: List[str], user: User = Depends(get_current_user)):
    """Reorder sponsor banners"""
    for i, banner_id in enumerate(banner_ids):
        await db.sponsor_banners.update_one(
            {"id": banner_id, "user_id": user.user_id},
            {"$set": {"order": i}}
        )
    return {"message": "Banners reordered"}
