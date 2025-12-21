from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Request, Response, Depends, Cookie
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
import secrets
from datetime import datetime, timezone, timedelta
import csv
import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from passlib.context import CryptContext
import httpx
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Resend email config
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============ AUTH MODELS ============

class UserRegister(BaseModel):
    email: str
    username: str
    password: str
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    username: str
    name: Optional[str] = None
    picture: Optional[str] = None
    auth_provider: str = "local"  # "local" or "google"

# ============ AUTH HELPERS ============

async def get_current_user(request: Request, session_token: Optional[str] = Cookie(default=None)) -> User:
    """Get current authenticated user from session token (cookie or header)"""
    token = session_token
    
    # Fallback to Authorization header
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user)

async def get_optional_user(request: Request, session_token: Optional[str] = Cookie(default=None)) -> Optional[User]:
    """Get current user if authenticated, otherwise return None"""
    try:
        return await get_current_user(request, session_token)
    except HTTPException:
        return None

# ============ AUTH ROUTES ============

@api_router.post("/auth/register")
async def register(user_data: UserRegister, response: Response):
    """Register a new user with email/username/password"""
    # Check for existing email
    existing_email = await db.users.find_one({"email": user_data.email.lower()}, {"_id": 0})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check for existing username
    existing_username = await db.users.find_one({"username": user_data.username.lower()}, {"_id": 0})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_password = pwd_context.hash(user_data.password)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email.lower(),
        "username": user_data.username.lower(),
        "name": user_data.name or user_data.username,
        "password_hash": hashed_password,
        "picture": None,
        "auth_provider": "local",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    return {
        "user_id": user_id,
        "email": user_data.email.lower(),
        "username": user_data.username.lower(),
        "name": user_data.name or user_data.username,
        "session_token": session_token
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response):
    """Login with email and password"""
    user = await db.users.find_one({"email": credentials.email.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if user.get("auth_provider") == "google":
        raise HTTPException(status_code=400, detail="This account uses Google login. Please sign in with Google.")
    
    if not pwd_context.verify(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "username": user.get("username", ""),
        "name": user.get("name", ""),
        "session_token": session_token
    }

@api_router.post("/auth/google/session")
async def google_session(request: Request, response: Response):
    """Exchange Google session_id for local session"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Exchange session_id with Emergent Auth
    async with httpx.AsyncClient() as client:
        auth_response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    
    if auth_response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    
    google_data = auth_response.json()
    email = google_data["email"].lower()
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info from Google
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": google_data.get("name", existing_user.get("name")),
                "picture": google_data.get("picture"),
                "auth_provider": "google"
            }}
        )
    else:
        # Create new user from Google
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        # Generate unique username from email
        base_username = email.split("@")[0].lower()
        username = base_username
        counter = 1
        while await db.users.find_one({"username": username}, {"_id": 0}):
            username = f"{base_username}{counter}"
            counter += 1
        
        user_doc = {
            "user_id": user_id,
            "email": email,
            "username": username,
            "name": google_data.get("name", ""),
            "picture": google_data.get("picture"),
            "password_hash": None,
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    
    # Create local session
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {
        "user_id": user_id,
        "email": user["email"],
        "username": user.get("username", ""),
        "name": user.get("name", ""),
        "picture": user.get("picture"),
        "session_token": session_token
    }

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    return {
        "user_id": user.user_id,
        "email": user.email,
        "username": user.username,
        "name": user.name,
        "picture": user.picture
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response, session_token: Optional[str] = Cookie(default=None)):
    """Logout and clear session"""
    token = session_token
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    password: str

@api_router.post("/auth/forgot-password")
async def forgot_password(request: Request, data: ForgotPasswordRequest):
    """Request password reset email"""
    email = data.email.lower()
    
    # Find user
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If an account with that email exists, a password reset link has been sent."}
    
    # Check if user uses Google login
    if user.get("auth_provider") == "google":
        return {"message": "This account uses Google login. Please sign in with Google."}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store reset token
    await db.password_resets.delete_many({"user_id": user["user_id"]})  # Remove old tokens
    await db.password_resets.insert_one({
        "user_id": user["user_id"],
        "token": reset_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Build reset URL
    origin = request.headers.get("origin", "http://localhost:3000")
    reset_url = f"{origin}/reset-password?token={reset_token}"
    
    # Send email
    if resend.api_key:
        try:
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #000; margin: 0;">StatMoose</h1>
                    <p style="color: #666;">Basketball Stats Tracker</p>
                </div>
                <h2 style="color: #333;">Reset Your Password</h2>
                <p style="color: #555; line-height: 1.6;">
                    Hi {user.get('name', user.get('username', 'there'))},
                </p>
                <p style="color: #555; line-height: 1.6;">
                    You requested to reset your password. Click the button below to create a new password:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" style="background-color: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p style="color: #555; line-height: 1.6;">
                    This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #999; font-size: 12px;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="{reset_url}" style="color: #666;">{reset_url}</a>
                </p>
            </div>
            """
            
            params = {
                "from": SENDER_EMAIL,
                "to": [email],
                "subject": "Reset your StatMoose password",
                "html": html_content
            }
            
            await asyncio.to_thread(resend.Emails.send, params)
        except Exception as e:
            logging.error(f"Failed to send password reset email: {e}")
            # Still return success to prevent enumeration
    
    return {"message": "If an account with that email exists, a password reset link has been sent."}

@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest):
    """Reset password with token"""
    # Find reset token
    reset_record = await db.password_resets.find_one({"token": data.token}, {"_id": 0})
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check expiry
    expires_at = reset_record["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        await db.password_resets.delete_one({"token": data.token})
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Validate password
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Update password
    hashed_password = pwd_context.hash(data.password)
    await db.users.update_one(
        {"user_id": reset_record["user_id"]},
        {"$set": {"password_hash": hashed_password}}
    )
    
    # Delete reset token
    await db.password_resets.delete_one({"token": data.token})
    
    # Invalidate all existing sessions for security
    await db.user_sessions.delete_many({"user_id": reset_record["user_id"]})
    
    return {"message": "Password has been reset successfully. Please log in with your new password."}

@api_router.get("/auth/verify-reset-token/{token}")
async def verify_reset_token(token: str):
    """Verify if a reset token is valid"""
    reset_record = await db.password_resets.find_one({"token": token}, {"_id": 0})
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid reset token")
    
    expires_at = reset_record["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    return {"valid": True}

# ============ DATA MODELS ============

class Player(BaseModel):
    number: str
    name: str

class TeamCreate(BaseModel):
    name: str
    logo_url: Optional[str] = None
    color: str = "#000000"  # Default team color
    roster: List[Player] = []

class Team(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""  # Owner of this team
    name: str
    logo_url: Optional[str] = None
    color: str = "#000000"
    roster: List[Player] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class GameCreate(BaseModel):
    home_team_id: str
    away_team_id: str

class QuarterScores(BaseModel):
    home: List[int] = [0, 0, 0, 0]
    away: List[int] = [0, 0, 0, 0]

class PlayByPlayEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quarter: int
    team: str  # "home" or "away"
    player_name: str
    player_number: str
    action: str  # "FT Made", "FT Missed", "2PT Made", etc.
    points: int = 0
    home_score: int = 0
    away_score: int = 0

class Game(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""  # Owner of this game
    home_team_id: str
    away_team_id: str
    home_team_name: str = ""
    away_team_name: str = ""
    home_team_logo: Optional[str] = None
    away_team_logo: Optional[str] = None
    home_team_color: str = "#dc2626"
    away_team_color: str = "#7c3aed"
    status: str = "active"  # active, completed
    current_quarter: int = 1
    quarter_scores: QuarterScores = Field(default_factory=QuarterScores)
    play_by_play: List[PlayByPlayEntry] = []
    share_code: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PlayerStats(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    game_id: str
    team_id: str
    player_number: str
    player_name: str
    ft_made: int = 0
    ft_missed: int = 0
    fg2_made: int = 0
    fg2_missed: int = 0
    fg3_made: int = 0
    fg3_missed: int = 0
    assists: int = 0
    offensive_rebounds: int = 0
    defensive_rebounds: int = 0
    turnovers: int = 0
    steals: int = 0
    blocks: int = 0
    fouls: int = 0
    is_active: bool = True

class StatUpdate(BaseModel):
    player_id: str
    stat_type: str  # ft_made, ft_missed, fg2_made, fg2_missed, fg3_made, fg3_missed, assist, oreb, dreb, turnover, steal, block, foul
    increment: int = 1  # can be -1 to undo

class AddPlayerRequest(BaseModel):
    team_id: str
    player_number: str
    player_name: str

class GameUpdate(BaseModel):
    current_quarter: Optional[int] = None
    status: Optional[str] = None

# ============ TEAM ENDPOINTS ============

@api_router.post("/teams", response_model=Team)
async def create_team(team_data: TeamCreate, user: User = Depends(get_current_user)):
    team = Team(**team_data.model_dump())
    team.user_id = user.user_id
    doc = team.model_dump()
    await db.teams.insert_one(doc)
    return team

@api_router.get("/teams", response_model=List[Team])
async def get_teams(user: User = Depends(get_current_user)):
    teams = await db.teams.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    return teams

@api_router.get("/teams/{team_id}", response_model=Team)
async def get_team(team_id: str, user: User = Depends(get_current_user)):
    team = await db.teams.find_one({"id": team_id, "user_id": user.user_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team

@api_router.put("/teams/{team_id}", response_model=Team)
async def update_team(team_id: str, team_data: TeamCreate, user: User = Depends(get_current_user)):
    existing = await db.teams.find_one({"id": team_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Team not found")
    
    update_data = team_data.model_dump()
    await db.teams.update_one({"id": team_id, "user_id": user.user_id}, {"$set": update_data})
    
    updated = await db.teams.find_one({"id": team_id}, {"_id": 0})
    return updated

@api_router.delete("/teams/{team_id}")
async def delete_team(team_id: str, user: User = Depends(get_current_user)):
    result = await db.teams.delete_one({"id": team_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"message": "Team deleted"}

@api_router.post("/teams/{team_id}/roster/csv")
async def upload_roster_csv(team_id: str, file: UploadFile = File(...), user: User = Depends(get_current_user)):
    team = await db.teams.find_one({"id": team_id, "user_id": user.user_id})
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

# ============ GAME ENDPOINTS ============

@api_router.post("/games", response_model=Game)
async def create_game(game_data: GameCreate, user: User = Depends(get_current_user)):
    home_team = await db.teams.find_one({"id": game_data.home_team_id, "user_id": user.user_id}, {"_id": 0})
    away_team = await db.teams.find_one({"id": game_data.away_team_id, "user_id": user.user_id}, {"_id": 0})
    
    if not home_team or not away_team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    game = Game(
        home_team_id=game_data.home_team_id,
        away_team_id=game_data.away_team_id,
        home_team_name=home_team["name"],
        away_team_name=away_team["name"],
        home_team_logo=home_team.get("logo_url"),
        away_team_logo=away_team.get("logo_url"),
        home_team_color=home_team.get("color", "#dc2626"),
        away_team_color=away_team.get("color", "#7c3aed")
    )
    game.user_id = user.user_id
    
    doc = game.model_dump()
    await db.games.insert_one(doc)
    
    # Create player stats for all roster players
    for player in home_team.get("roster", []):
        stats = PlayerStats(
            game_id=game.id,
            team_id=game_data.home_team_id,
            player_number=player["number"],
            player_name=player["name"]
        )
        await db.player_stats.insert_one(stats.model_dump())
    
    for player in away_team.get("roster", []):
        stats = PlayerStats(
            game_id=game.id,
            team_id=game_data.away_team_id,
            player_number=player["number"],
            player_name=player["name"]
        )
        await db.player_stats.insert_one(stats.model_dump())
    
    return game

@api_router.get("/games", response_model=List[Game])
async def get_games(user: User = Depends(get_current_user)):
    games = await db.games.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return games

@api_router.get("/games/{game_id}")
async def get_game(game_id: str, user: User = Depends(get_current_user)):
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    player_stats = await db.player_stats.find({"game_id": game_id}, {"_id": 0}).to_list(100)
    
    home_stats = [s for s in player_stats if s["team_id"] == game["home_team_id"]]
    away_stats = [s for s in player_stats if s["team_id"] == game["away_team_id"]]
    
    return {
        **game,
        "home_player_stats": home_stats,
        "away_player_stats": away_stats
    }

@api_router.get("/games/share/{share_code}")
async def get_game_by_share_code(share_code: str):
    game = await db.games.find_one({"share_code": share_code}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    player_stats = await db.player_stats.find({"game_id": game["id"]}, {"_id": 0}).to_list(100)
    
    home_stats = [s for s in player_stats if s["team_id"] == game["home_team_id"]]
    away_stats = [s for s in player_stats if s["team_id"] == game["away_team_id"]]
    
    return {
        **game,
        "home_player_stats": home_stats,
        "away_player_stats": away_stats
    }

@api_router.put("/games/{game_id}", response_model=Game)
async def update_game(game_id: str, update: GameUpdate, user: User = Depends(get_current_user)):
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.games.update_one({"id": game_id, "user_id": user.user_id}, {"$set": update_data})
    updated = await db.games.find_one({"id": game_id}, {"_id": 0})
    return updated

@api_router.delete("/games/{game_id}")
async def delete_game(game_id: str, user: User = Depends(get_current_user)):
    """Delete a game and all its associated player stats"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Delete all player stats for this game
    await db.player_stats.delete_many({"game_id": game_id})
    
    # Delete the game
    result = await db.games.delete_one({"id": game_id, "user_id": user.user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Game not found")
    
    return {"message": "Game deleted successfully"}

@api_router.post("/games/{game_id}/stats")
async def record_stat(game_id: str, stat: StatUpdate, user: User = Depends(get_current_user)):
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    player_stat = await db.player_stats.find_one({"id": stat.player_id})
    if not player_stat:
        raise HTTPException(status_code=404, detail="Player stats not found")
    
    stat_map = {
        "ft_made": "ft_made",
        "ft_missed": "ft_missed",
        "fg2_made": "fg2_made",
        "fg2_missed": "fg2_missed",
        "fg3_made": "fg3_made",
        "fg3_missed": "fg3_missed",
        "assist": "assists",
        "oreb": "offensive_rebounds",
        "dreb": "defensive_rebounds",
        "turnover": "turnovers",
        "steal": "steals",
        "block": "blocks",
        "foul": "fouls"
    }
    
    field = stat_map.get(stat.stat_type)
    if not field:
        raise HTTPException(status_code=400, detail="Invalid stat type")
    
    # Calculate new value, don't go below 0
    new_value = max(0, player_stat.get(field, 0) + stat.increment)
    await db.player_stats.update_one(
        {"id": stat.player_id},
        {"$set": {field: new_value}}
    )
    
    # Action labels for play-by-play
    action_labels = {
        "ft_made": "FT Made",
        "ft_missed": "FT Missed",
        "fg2_made": "2PT Made",
        "fg2_missed": "2PT Missed",
        "fg3_made": "3PT Made",
        "fg3_missed": "3PT Missed",
        "assist": "Assist",
        "oreb": "Off. Rebound",
        "dreb": "Def. Rebound",
        "turnover": "Turnover",
        "steal": "Steal",
        "block": "Block",
        "foul": "Foul"
    }
    
    # Update quarter scores if it's a scoring stat
    points = 0
    if stat.stat_type == "ft_made":
        points = 1 * stat.increment
    elif stat.stat_type == "fg2_made":
        points = 2 * stat.increment
    elif stat.stat_type == "fg3_made":
        points = 3 * stat.increment
    
    team_key = "home" if player_stat["team_id"] == game["home_team_id"] else "away"
    quarter_idx = game["current_quarter"] - 1
    quarter_scores = game.get("quarter_scores", {"home": [0,0,0,0], "away": [0,0,0,0]})
    
    # Extend quarter_scores arrays for overtime if needed
    while len(quarter_scores["home"]) <= quarter_idx:
        quarter_scores["home"].append(0)
        quarter_scores["away"].append(0)
    
    if points != 0:
        quarter_scores[team_key][quarter_idx] = max(0, quarter_scores[team_key][quarter_idx] + points)
    
    # Calculate current scores for play-by-play
    home_score = sum(quarter_scores["home"])
    away_score = sum(quarter_scores["away"])
    
    # Track game flow stats (lead changes, ties, largest leads)
    game_stats = game.get("game_stats", {
        "home_largest_lead": 0,
        "away_largest_lead": 0,
        "lead_changes": 0,
        "ties": 0,
        "last_leader": None  # "home", "away", or None (tie)
    })
    
    if points != 0:
        # Calculate lead
        lead = home_score - away_score
        
        # Update largest leads
        if lead > 0 and lead > game_stats.get("home_largest_lead", 0):
            game_stats["home_largest_lead"] = lead
        elif lead < 0 and abs(lead) > game_stats.get("away_largest_lead", 0):
            game_stats["away_largest_lead"] = abs(lead)
        
        # Determine current leader
        if lead > 0:
            current_leader = "home"
        elif lead < 0:
            current_leader = "away"
        else:
            current_leader = None  # tie
        
        # Check for lead change or tie
        last_leader = game_stats.get("last_leader")
        if current_leader is None and last_leader is not None:
            # It's now a tie
            game_stats["ties"] = game_stats.get("ties", 0) + 1
        elif current_leader is not None and last_leader is not None and current_leader != last_leader:
            # Lead changed
            game_stats["lead_changes"] = game_stats.get("lead_changes", 0) + 1
        
        game_stats["last_leader"] = current_leader
    
    # Add play-by-play entry (only for positive increments)
    play_by_play = game.get("play_by_play", [])
    if stat.increment > 0:
        entry = {
            "id": str(uuid.uuid4()),
            "quarter": game["current_quarter"],
            "team": team_key,
            "player_name": player_stat["player_name"],
            "player_number": player_stat["player_number"],
            "action": action_labels.get(stat.stat_type, stat.stat_type),
            "points": max(0, points),
            "home_score": home_score,
            "away_score": away_score
        }
        play_by_play.append(entry)
    elif stat.increment < 0 and play_by_play:
        # Remove last matching entry on undo
        for i in range(len(play_by_play) - 1, -1, -1):
            if play_by_play[i]["action"] == action_labels.get(stat.stat_type):
                play_by_play.pop(i)
                break
    
    await db.games.update_one(
        {"id": game_id},
        {"$set": {
            "quarter_scores": quarter_scores,
            "play_by_play": play_by_play,
            "game_stats": game_stats,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    updated_stat = await db.player_stats.find_one({"id": stat.player_id}, {"_id": 0})
    return updated_stat

@api_router.post("/games/{game_id}/players")
async def add_player_to_game(game_id: str, request: AddPlayerRequest, user: User = Depends(get_current_user)):
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if request.team_id not in [game["home_team_id"], game["away_team_id"]]:
        raise HTTPException(status_code=400, detail="Team not in this game")
    
    stats = PlayerStats(
        game_id=game_id,
        team_id=request.team_id,
        player_number=request.player_number,
        player_name=request.player_name
    )
    await db.player_stats.insert_one(stats.model_dump())
    
    return stats

# ============ PDF GENERATION ============

def calculate_player_totals(stats: dict):
    """Calculate derived stats for a player"""
    pts = stats["ft_made"] + (stats["fg2_made"] * 2) + (stats["fg3_made"] * 3)
    total_reb = stats["offensive_rebounds"] + stats["defensive_rebounds"]
    
    fg_made = stats["fg2_made"] + stats["fg3_made"]
    fg_att = fg_made + stats["fg2_missed"] + stats["fg3_missed"]
    fg_pct = round((fg_made / fg_att * 100), 1) if fg_att > 0 else 0
    
    fg3_att = stats["fg3_made"] + stats["fg3_missed"]
    fg3_pct = round((stats["fg3_made"] / fg3_att * 100), 1) if fg3_att > 0 else 0
    
    ft_att = stats["ft_made"] + stats["ft_missed"]
    ft_pct = round((stats["ft_made"] / ft_att * 100), 1) if ft_att > 0 else 0
    
    return {
        "pts": pts,
        "total_reb": total_reb,
        "fg_made": fg_made,
        "fg_att": fg_att,
        "fg_pct": fg_pct,
        "fg3_att": fg3_att,
        "fg3_pct": fg3_pct,
        "ft_att": ft_att,
        "ft_pct": ft_pct
    }

def calculate_team_totals(stats_list: list):
    """Calculate team totals from player stats"""
    team_totals = {
        "fg_made": 0, "fg_att": 0, "fg3_made": 0, "fg3_att": 0, 
        "ft_made": 0, "ft_att": 0, "oreb": 0, "dreb": 0, "reb": 0, 
        "ast": 0, "stl": 0, "blk": 0, "to": 0, "pf": 0, "pts": 0
    }
    
    for s in stats_list:
        totals = calculate_player_totals(s)
        team_totals["fg_made"] += totals["fg_made"]
        team_totals["fg_att"] += totals["fg_att"]
        team_totals["fg3_made"] += s["fg3_made"]
        team_totals["fg3_att"] += totals["fg3_att"]
        team_totals["ft_made"] += s["ft_made"]
        team_totals["ft_att"] += totals["ft_att"]
        team_totals["oreb"] += s["offensive_rebounds"]
        team_totals["dreb"] += s["defensive_rebounds"]
        team_totals["reb"] += totals["total_reb"]
        team_totals["ast"] += s["assists"]
        team_totals["stl"] += s["steals"]
        team_totals["blk"] += s["blocks"]
        team_totals["to"] += s["turnovers"]
        team_totals["pf"] += s["fouls"]
        team_totals["pts"] += totals["pts"]
    
    # Calculate percentages
    team_totals["fg_pct"] = round((team_totals["fg_made"] / team_totals["fg_att"] * 100), 1) if team_totals["fg_att"] > 0 else 0
    team_totals["fg3_pct"] = round((team_totals["fg3_made"] / team_totals["fg3_att"] * 100), 1) if team_totals["fg3_att"] > 0 else 0
    team_totals["ft_pct"] = round((team_totals["ft_made"] / team_totals["ft_att"] * 100), 1) if team_totals["ft_att"] > 0 else 0
    
    return team_totals

@api_router.get("/games/{game_id}/boxscore/pdf")
async def generate_boxscore_pdf(game_id: str, user: User = Depends(get_current_user)):
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    player_stats = await db.player_stats.find({"game_id": game_id}, {"_id": 0}).to_list(100)
    home_stats = [s for s in player_stats if s["team_id"] == game["home_team_id"]]
    away_stats = [s for s in player_stats if s["team_id"] == game["away_team_id"]]
    
    # Calculate team totals
    home_totals = calculate_team_totals(home_stats)
    away_totals = calculate_team_totals(away_stats)
    
    # Get team colors
    home_color = game.get("home_team_color", "#dc2626")
    away_color = game.get("away_team_color", "#7c3aed")
    
    # Get game flow stats
    game_stats = game.get("game_stats", {})
    home_largest_lead = game_stats.get("home_largest_lead", 0)
    away_largest_lead = game_stats.get("away_largest_lead", 0)
    lead_changes = game_stats.get("lead_changes", 0)
    ties = game_stats.get("ties", 0)
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter), topMargin=0.25*inch, bottomMargin=0.25*inch, leftMargin=0.3*inch, rightMargin=0.3*inch)
    elements = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=14, alignment=1, spaceAfter=2)
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=10, alignment=1, spaceAfter=6)
    team_style = ParagraphStyle('Team', parent=styles['Heading2'], fontSize=9, spaceAfter=2, spaceBefore=4)
    
    # Get quarter scores with overtime support
    q_scores = game.get("quarter_scores", {"home": [0,0,0,0], "away": [0,0,0,0]})
    home_scores = q_scores.get("home", [0,0,0,0])
    away_scores = q_scores.get("away", [0,0,0,0])
    total_quarters = max(4, len(home_scores))
    
    while len(home_scores) < total_quarters:
        home_scores.append(0)
    while len(away_scores) < total_quarters:
        away_scores.append(0)
    
    home_total = sum(home_scores)
    away_total = sum(away_scores)
    
    # Title
    elements.append(Paragraph(f"<b>{game['home_team_name']} vs {game['away_team_name']}</b>", title_style))
    elements.append(Paragraph(f"Final: {home_total} - {away_total}", subtitle_style))
    
    def get_quarter_label(q):
        return f"Q{q}" if q <= 4 else f"OT{q-4}"
    
    # LEFT SIDE: Quarter scores stacked vertically
    quarter_headers = [""] + [get_quarter_label(i+1) for i in range(total_quarters)] + ["T"]
    quarter_data = [
        quarter_headers,
        [game['home_team_name'][:10]] + home_scores + [home_total],
        [game['away_team_name'][:10]] + away_scores + [away_total]
    ]
    q_col_widths = [0.8*inch] + [0.3*inch] * total_quarters + [0.35*inch]
    quarter_table = Table(quarter_data, colWidths=q_col_widths)
    quarter_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    
    # Game flow stats table (below quarter scores)
    flow_data = [
        ["GAME FLOW", ""],
        ["Lead Changes", str(lead_changes)],
        ["Times Tied", str(ties)],
        [f"{game['home_team_name'][:8]} Lead", str(home_largest_lead)],
        [f"{game['away_team_name'][:8]} Lead", str(away_largest_lead)],
    ]
    flow_table = Table(flow_data, colWidths=[1.2*inch, 0.6*inch])
    flow_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('SPAN', (0, 0), (1, 0)),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    
    # Stack quarter scores and game flow vertically
    left_table = Table([[quarter_table], [Spacer(1, 4)], [flow_table]])
    left_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    
    # RIGHT SIDE: Team stats comparison
    comp_data = [
        [game['home_team_name'][:8], "STAT", game['away_team_name'][:8]],
        [f"{home_totals['fg_made']}-{home_totals['fg_att']}", "FGM-A", f"{away_totals['fg_made']}-{away_totals['fg_att']}"],
        [f"{home_totals['fg_pct']}%", "FG%", f"{away_totals['fg_pct']}%"],
        [f"{home_totals['fg3_made']}-{home_totals['fg3_att']}", "3PM-A", f"{away_totals['fg3_made']}-{away_totals['fg3_att']}"],
        [f"{home_totals['fg3_pct']}%", "3P%", f"{away_totals['fg3_pct']}%"],
        [f"{home_totals['ft_made']}-{home_totals['ft_att']}", "FTM-A", f"{away_totals['ft_made']}-{away_totals['ft_att']}"],
        [f"{home_totals['ft_pct']}%", "FT%", f"{away_totals['ft_pct']}%"],
        [str(home_totals['oreb']), "OREB", str(away_totals['oreb'])],
        [str(home_totals['dreb']), "DREB", str(away_totals['dreb'])],
        [str(home_totals['reb']), "REB", str(away_totals['reb'])],
        [str(home_totals['ast']), "AST", str(away_totals['ast'])],
        [str(home_totals['stl']), "STL", str(away_totals['stl'])],
        [str(home_totals['blk']), "BLK", str(away_totals['blk'])],
        [str(home_totals['to']), "TO", str(away_totals['to'])],
        [str(home_totals['pf']), "PF", str(away_totals['pf'])],
    ]
    comp_table = Table(comp_data, colWidths=[0.7*inch, 0.5*inch, 0.7*inch])
    comp_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (1, 1), (1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BACKGROUND', (1, 1), (1, -1), colors.HexColor('#f0f0f0')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    
    # Combine left (quarter scores + game flow) and right (team stats) side by side
    top_table = Table([[left_table, comp_table]], colWidths=[3.5*inch, 2.2*inch])
    top_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(top_table)
    elements.append(Spacer(1, 8))
    
    # Player stats tables - NBA style columns
    headers = ["#", "PLAYER", "PTS", "FGM-A", "3PM-A", "FTM-A", "OREB", "DREB", "REB", "AST", "STL", "BLK", "TO", "PF"]
    
    def create_team_table(team_name: str, stats_list: list, team_totals: dict, team_color: str):
        elements.append(Paragraph(f"<b>{team_name}</b>", team_style))
        
        # Sort players by jersey number
        sorted_stats = sorted(stats_list, key=lambda x: int(x.get("player_number", "0")) if x.get("player_number", "0").isdigit() else 0)
        
        data = [headers]
        
        for s in sorted_stats:
            totals = calculate_player_totals(s)
            row = [
                s["player_number"],
                s["player_name"][:12],
                totals["pts"],
                f"{totals['fg_made']}-{totals['fg_att']}",
                f"{s['fg3_made']}-{totals['fg3_att']}",
                f"{s['ft_made']}-{totals['ft_att']}",
                s["offensive_rebounds"],
                s["defensive_rebounds"],
                totals["total_reb"],
                s["assists"],
                s["steals"],
                s["blocks"],
                s["turnovers"],
                s["fouls"]
            ]
            data.append(row)
        
        # Totals row
        data.append([
            "", "TOTALS",
            team_totals["pts"],
            f"{team_totals['fg_made']}-{team_totals['fg_att']}",
            f"{team_totals['fg3_made']}-{team_totals['fg3_att']}",
            f"{team_totals['ft_made']}-{team_totals['ft_att']}",
            team_totals["oreb"],
            team_totals["dreb"],
            team_totals["reb"],
            team_totals["ast"],
            team_totals["stl"],
            team_totals["blk"],
            team_totals["to"],
            team_totals["pf"]
        ])
        
        col_widths = [0.25*inch, 0.9*inch, 0.3*inch, 0.4*inch, 0.4*inch, 0.4*inch, 0.35*inch, 0.35*inch, 0.3*inch, 0.3*inch, 0.3*inch, 0.3*inch, 0.25*inch, 0.25*inch]
        table = Table(data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(team_color)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f0f0f0')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 6))
    
    create_team_table(game['home_team_name'], home_stats, home_totals, home_color)
    create_team_table(game['away_team_name'], away_stats, away_totals, away_color)
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"boxscore_{game['home_team_name']}_vs_{game['away_team_name']}.pdf".replace(" ", "_")
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ============ UTILITY ENDPOINTS ============

@api_router.get("/")
async def root():
    return {"message": "Basketball Stats API"}

app.include_router(api_router)

# Dynamic CORS handling for credentials
origins = os.environ.get('CORS_ORIGINS', '*')
if origins == '*':
    # When using wildcards with credentials, we need to handle it dynamically
    from starlette.middleware.base import BaseHTTPMiddleware
    from starlette.responses import Response
    
    class DynamicCORSMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            origin = request.headers.get("origin", "")
            
            # Handle preflight OPTIONS requests
            if request.method == "OPTIONS":
                response = Response(status_code=200)
            else:
                response = await call_next(request)
            
            # Set CORS headers dynamically based on origin
            if origin:
                response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
            
            return response
    
    app.add_middleware(DynamicCORSMiddleware)
else:
    app.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origins=origins.split(','),
        allow_methods=["*"],
        allow_headers=["*"],
    )

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
