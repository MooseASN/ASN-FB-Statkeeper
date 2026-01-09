"""
Schools Router - Handles all school/organization management endpoints
This router can be gradually integrated into the main server.py
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import secrets

# Import shared utilities
# from .database import db, pwd_context, SECURITY_QUESTIONS, US_STATES

# Note: This router is a template for future refactoring.
# To integrate:
# 1. Import this router in server.py: from routers.schools import router as schools_router
# 2. Add to app: app.include_router(schools_router, prefix="/api")
# 3. Move endpoints one by one, testing each migration

router = APIRouter(tags=["schools"])

# ============ PYDANTIC MODELS ============

class SecurityQuestionAnswer(BaseModel):
    question: str
    answer: str

class SchoolRegister(BaseModel):
    school_name: str
    state: str
    logo_url: Optional[str] = None
    user_name: str
    user_email: str
    password: str
    security_questions: List[SecurityQuestionAnswer]

class SchoolMemberInvite(BaseModel):
    email: str
    name: str
    password: str
    security_questions: List[SecurityQuestionAnswer]

class SeasonCreate(BaseModel):
    name: str
    sport: str

class SchoolTeamCreate(BaseModel):
    name: str
    sport: str
    color: Optional[str] = "#000000"
    roster: Optional[List[dict]] = []

class SchoolGameCreate(BaseModel):
    season_id: str
    opponent_team_id: str
    scheduled_date: str
    scheduled_time: Optional[str] = None
    location: Optional[str] = None
    is_home_game: bool = True
    note: Optional[str] = None

class UpdateMemberRole(BaseModel):
    role: str

# ============ ENDPOINTS (TEMPLATE) ============
# The actual implementation remains in server.py until ready to migrate
# This file serves as documentation and preparation for the refactor

"""
Endpoints to migrate from server.py:

1. School Registration & Auth:
   - POST /schools/register
   - GET /schools/my-school
   - GET /schools/check-name/{name}
   - GET /schools/invite/{code}
   - POST /schools/join/{code}
   - POST /schools/{school_id}/regenerate-invite

2. School Management:
   - GET /schools/{school_id}
   - PUT /schools/{school_id}
   - GET /schools/{school_id}/calendar
   - GET /schools/{school_id}/members
   - PUT /schools/{school_id}/members/{user_id}/role

3. Seasons:
   - GET /schools/{school_id}/seasons
   - POST /schools/{school_id}/seasons
   - GET /schools/{school_id}/seasons/{season_id}
   - PUT /schools/{school_id}/seasons/{season_id}/team

4. Teams (School context):
   - GET /schools/{school_id}/teams
   - POST /schools/{school_id}/teams
   - GET /schools/{school_id}/teams/{team_id}
   - PUT /schools/{school_id}/teams/{team_id}

5. Games (School context):
   - GET /schools/{school_id}/seasons/{season_id}/games
   - POST /schools/{school_id}/seasons/{season_id}/games
"""
