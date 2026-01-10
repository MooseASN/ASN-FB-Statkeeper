"""
Admin Router
Handles admin-only endpoints for user management, stats, and beta settings
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import csv
import io
import logging

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/admin", tags=["admin"])

# Dependencies - set by main app
db = None

def set_db(database):
    """Set database connection from main app"""
    global db
    db = database

# ============ ADMIN MODELS ============

ADMIN_EMAILS = ["antlersportsnetwork@gmail.com", "jared@antlersn.com"]
ADMIN_USERNAMES = ["admin"]

class BetaModeSettings(BaseModel):
    basketball_beta: bool = False
    basketball_password: str = ""
    football_beta: bool = False
    football_password: str = ""
    baseball_beta: bool = False
    baseball_password: str = ""
    school_creation_beta: bool = False
    school_creation_password: str = ""

# ============ HELPER FUNCTIONS ============

def is_admin_user(user) -> bool:
    """Check if user has admin privileges"""
    return (user.email.lower() in ADMIN_EMAILS or 
            (user.username and user.username.lower() in ADMIN_USERNAMES))

# Note: get_admin_user dependency will be set up when integrating with main app

# ============ ADMIN ENDPOINTS ============
# These endpoints would be integrated with the main app's auth system

async def get_all_users_impl(db_ref):
    """Get all users (admin only) - excludes password hashes"""
    users = await db_ref.users.find({}, {"_id": 0, "password_hash": 0, "security_questions": 0}).to_list(10000)
    
    user_ids = [user.get("user_id") for user in users]
    
    team_counts = {}
    game_counts = {}
    event_counts = {}
    
    team_agg = await db_ref.teams.aggregate([
        {"$match": {"user_id": {"$in": user_ids}}},
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}}}
    ]).to_list(10000)
    for item in team_agg:
        team_counts[item["_id"]] = item["count"]
    
    game_agg = await db_ref.games.aggregate([
        {"$match": {"user_id": {"$in": user_ids}}},
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}}}
    ]).to_list(10000)
    for item in game_agg:
        game_counts[item["_id"]] = item["count"]
    
    event_agg = await db_ref.events.aggregate([
        {"$match": {"user_id": {"$in": user_ids}}},
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}}}
    ]).to_list(10000)
    for item in event_agg:
        event_counts[item["_id"]] = item["count"]
    
    enriched_users = []
    for user in users:
        user_id = user.get("user_id")
        enriched_users.append({
            **user,
            "team_count": team_counts.get(user_id, 0),
            "game_count": game_counts.get(user_id, 0),
            "event_count": event_counts.get(user_id, 0)
        })
    
    return {
        "users": enriched_users,
        "total": len(enriched_users),
        "fetched_at": datetime.now(timezone.utc).isoformat()
    }

async def get_admin_stats_impl(db_ref):
    """Get overall platform stats (admin only)"""
    total_users = await db_ref.users.count_documents({})
    total_teams = await db_ref.teams.count_documents({})
    total_games = await db_ref.games.count_documents({})
    total_events = await db_ref.events.count_documents({})
    
    basketball_teams = await db_ref.teams.count_documents({"sport": "basketball"})
    football_teams = await db_ref.teams.count_documents({"sport": "football"})
    basketball_games = await db_ref.games.count_documents({"sport": "basketball"})
    football_games = await db_ref.games.count_documents({"sport": "football"})
    
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_users = await db_ref.users.count_documents({"created_at": {"$gte": week_ago}})
    
    return {
        "total_users": total_users,
        "total_teams": total_teams,
        "total_games": total_games,
        "total_events": total_events,
        "basketball_teams": basketball_teams,
        "football_teams": football_teams,
        "basketball_games": basketball_games,
        "football_games": football_games,
        "recent_signups_7d": recent_users,
        "fetched_at": datetime.now(timezone.utc).isoformat()
    }

async def get_beta_settings_impl(db_ref):
    """Get beta mode settings"""
    settings = await db_ref.settings.find_one({"type": "beta_mode"}, {"_id": 0})
    if not settings:
        return {
            "basketball_beta": False,
            "basketball_password": "",
            "football_beta": False,
            "football_password": "",
            "baseball_beta": False,
            "baseball_password": "",
            "school_creation_beta": False,
            "school_creation_password": ""
        }
    return {
        "basketball_beta": settings.get("basketball_beta", False),
        "basketball_password": settings.get("basketball_password", ""),
        "football_beta": settings.get("football_beta", False),
        "football_password": settings.get("football_password", ""),
        "baseball_beta": settings.get("baseball_beta", False),
        "baseball_password": settings.get("baseball_password", ""),
        "school_creation_beta": settings.get("school_creation_beta", False),
        "school_creation_password": settings.get("school_creation_password", "")
    }

async def update_beta_settings_impl(db_ref, settings: BetaModeSettings):
    """Update beta mode settings"""
    await db_ref.settings.update_one(
        {"type": "beta_mode"},
        {"$set": {
            "type": "beta_mode",
            "basketball_beta": settings.basketball_beta,
            "basketball_password": settings.basketball_password,
            "football_beta": settings.football_beta,
            "football_password": settings.football_password,
            "baseball_beta": settings.baseball_beta,
            "baseball_password": settings.baseball_password,
            "school_creation_beta": settings.school_creation_beta,
            "school_creation_password": settings.school_creation_password,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "Beta settings updated", "settings": settings.model_dump()}
