"""Team management routes"""
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from typing import List, Optional
import csv
import io
import base64
import uuid
import re
import httpx
from bs4 import BeautifulSoup

from ..utils.database import db
from ..utils.auth import get_current_user, User
from ..models.game_models import Team, TeamCreate, Player

router = APIRouter(prefix="/teams", tags=["teams"])


@router.post("", response_model=Team)
async def create_team(team_data: TeamCreate, user: User = Depends(get_current_user)):
    """Create a new team"""
    team = Team(**team_data.model_dump())
    team.user_id = user.user_id
    doc = team.model_dump()
    await db.teams.insert_one(doc)
    return team


@router.get("", response_model=List[Team])
async def get_teams(sport: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get all teams for the current user including shared teams"""
    query = {"user_id": user.user_id}
    if sport:
        query["sport"] = sport
    own_teams = await db.teams.find(query, {"_id": 0}).to_list(100)
    
    # Get teams from accounts user has shared access to
    shared_access_records = await db.shared_access.find(
        {"shared_with_user_id": user.user_id, "is_active": True},
        {"owner_user_id": 1}
    ).to_list(100)
    
    shared_teams = []
    for record in shared_access_records:
        shared_query = {"user_id": record["owner_user_id"]}
        if sport:
            shared_query["sport"] = sport
        owner_teams = await db.teams.find(shared_query, {"_id": 0}).to_list(100)
        for team in owner_teams:
            team["is_shared"] = True
            team["shared_from_user_id"] = record["owner_user_id"]
        shared_teams.extend(owner_teams)
    
    return own_teams + shared_teams


@router.get("/{team_id}", response_model=Team)
async def get_team(team_id: str, user: User = Depends(get_current_user)):
    """Get a specific team by ID"""
    team = await db.teams.find_one({"id": team_id, "user_id": user.user_id}, {"_id": 0})
    if team:
        return team
    
    # Check if user has shared access
    team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if team:
        shared_access = await db.shared_access.find_one({
            "owner_user_id": team.get("user_id"),
            "shared_with_user_id": user.user_id,
            "is_active": True
        })
        if shared_access:
            team["is_shared"] = True
            return team
    
    raise HTTPException(status_code=404, detail="Team not found")


@router.put("/{team_id}", response_model=Team)
async def update_team(team_id: str, team_data: TeamCreate, user: User = Depends(get_current_user)):
    """Update a team"""
    existing = await db.teams.find_one({"id": team_id, "user_id": user.user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Team not found")
    
    update_data = team_data.model_dump()
    # Preserve sport if not explicitly changed
    if update_data.get("sport") == "basketball" and existing.get("sport") and existing.get("sport") != "basketball":
        update_data["sport"] = existing.get("sport")
    
    await db.teams.update_one({"id": team_id, "user_id": user.user_id}, {"$set": update_data})
    updated = await db.teams.find_one({"id": team_id}, {"_id": 0})
    return updated


@router.delete("/{team_id}")
async def delete_team(team_id: str, user: User = Depends(get_current_user)):
    """Delete a team"""
    result = await db.teams.delete_one({"id": team_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"message": "Team deleted"}


@router.post("/{team_id}/logo/upload")
async def upload_team_logo(team_id: str, file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Upload a team logo image. Supports PNG, JPG, JPEG, GIF, WEBP. Max 5MB."""
    team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check ownership or shared access
    if team.get("user_id") != user.user_id:
        shared_access = await db.shared_access.find_one({
            "owner_user_id": team.get("user_id"),
            "shared_with_user_id": user.user_id,
            "is_active": True
        })
        if not shared_access:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: PNG, JPG, GIF, WEBP")
    
    content = await file.read()
    
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB")
    
    base64_content = base64.b64encode(content).decode('utf-8')
    logo_url = f"data:{file.content_type};base64,{base64_content}"
    
    await db.teams.update_one(
        {"id": team_id},
        {"$set": {"logo_url": logo_url, "logo_filename": file.filename}}
    )
    
    return {"message": "Logo uploaded successfully", "logo_url": logo_url}


@router.post("/{team_id}/roster/csv")
async def upload_roster_csv(team_id: str, file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Upload roster from CSV file"""
    team = await db.teams.find_one({"id": team_id, "user_id": user.user_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    roster = []
    for row in reader:
        number = row.get('number') or row.get('Number') or row.get('#') or ''
        name = row.get('name') or row.get('Name') or row.get('player') or row.get('Player') or ''
        if number and name:
            roster.append({"number": str(number).strip(), "name": name.strip()})
    
    await db.teams.update_one({"id": team_id, "user_id": user.user_id}, {"$set": {"roster": roster}})
    return {"message": f"Uploaded {len(roster)} players", "roster": roster}
