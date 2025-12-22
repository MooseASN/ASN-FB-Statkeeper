from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Request, Response, Depends, Cookie
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============ SECURITY QUESTIONS ============

SECURITY_QUESTIONS = [
    "What was the name of your first pet?",
    "What city were you born in?",
    "What is your mother's maiden name?",
    "What was the name of your first school?",
    "What is the name of the street you grew up on?",
    "What was the make and model of your first car?",
    "What is the name of your favorite childhood teacher?",
    "What is your favorite movie?",
    "What is the name of the company where you had your first job?",
    "What is your favorite sports team?"
]

# ============ AUTH MODELS ============

class SecurityQuestionAnswer(BaseModel):
    question: str
    answer: str

class UserRegister(BaseModel):
    email: str
    username: str
    password: str
    name: Optional[str] = None
    security_questions: List[SecurityQuestionAnswer] = []

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
    """Register a new user with email/username/password and security questions"""
    # Check for existing email
    existing_email = await db.users.find_one({"email": user_data.email.lower()}, {"_id": 0})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check for existing username
    existing_username = await db.users.find_one({"username": user_data.username.lower()}, {"_id": 0})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Validate security questions (require at least 2)
    if len(user_data.security_questions) < 2:
        raise HTTPException(status_code=400, detail="Please answer at least 2 security questions")
    
    # Hash security question answers (case-insensitive)
    hashed_security_questions = []
    for sq in user_data.security_questions:
        if sq.question not in SECURITY_QUESTIONS:
            raise HTTPException(status_code=400, detail=f"Invalid security question: {sq.question}")
        hashed_security_questions.append({
            "question": sq.question,
            "answer_hash": pwd_context.hash(sq.answer.lower().strip())
        })
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_password = pwd_context.hash(user_data.password)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email.lower(),
        "username": user_data.username.lower(),
        "name": user_data.name or user_data.username,
        "password_hash": hashed_password,
        "security_questions": hashed_security_questions,
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

# ============ SECURITY QUESTIONS ENDPOINTS ============

@api_router.get("/auth/security-questions")
async def get_security_questions():
    """Get list of available security questions"""
    return {"questions": SECURITY_QUESTIONS}

class SecurityQuestionCheckRequest(BaseModel):
    email: str

class SecurityQuestionVerifyRequest(BaseModel):
    email: str
    question: str
    answer: str

@api_router.post("/auth/security-question/get")
async def get_user_security_question(data: SecurityQuestionCheckRequest):
    """Get a random security question for a user (for password reset)"""
    import random
    
    email = data.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if not user:
        # Return a fake question to prevent email enumeration
        return {"question": random.choice(SECURITY_QUESTIONS), "has_questions": False}
    
    security_questions = user.get("security_questions", [])
    if not security_questions:
        return {"question": None, "has_questions": False, "message": "No security questions set for this account"}
    
    # Return a random question
    selected = random.choice(security_questions)
    return {"question": selected["question"], "has_questions": True}

@api_router.post("/auth/security-question/verify")
async def verify_security_question(request: Request, data: SecurityQuestionVerifyRequest):
    """Verify security question answer and generate reset link"""
    email = data.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid answer")
    
    security_questions = user.get("security_questions", [])
    
    # Find the matching question
    matched_question = None
    for sq in security_questions:
        if sq["question"] == data.question:
            matched_question = sq
            break
    
    if not matched_question:
        raise HTTPException(status_code=400, detail="Invalid answer")
    
    # Verify the answer (case-insensitive)
    if not pwd_context.verify(data.answer.lower().strip(), matched_question["answer_hash"]):
        raise HTTPException(status_code=400, detail="Invalid answer")
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store reset token
    await db.password_resets.delete_many({"user_id": user["user_id"]})
    await db.password_resets.insert_one({
        "user_id": user["user_id"],
        "token": reset_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Build reset URL
    origin = request.headers.get("origin", "http://localhost:3000")
    reset_url = f"{origin}/reset-password?token={reset_token}"
    
    return {
        "message": "Security question verified successfully.",
        "reset_link": reset_url
    }

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    password: str

@api_router.post("/auth/forgot-password")
async def forgot_password(request: Request, data: ForgotPasswordRequest):
    """Check if user exists and has security questions"""
    email = data.email.lower()
    
    # Find user
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if not user:
        return {"exists": False, "has_security_questions": False}
    
    security_questions = user.get("security_questions", [])
    has_security_questions = len(security_questions) > 0
    
    return {
        "exists": True,
        "has_security_questions": has_security_questions
    }

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
    scheduled_date: Optional[str] = None  # YYYY-MM-DD
    scheduled_time: Optional[str] = None  # HH:MM
    start_immediately: bool = True  # If False, creates as "scheduled"
    clock_enabled: bool = False  # Enable game clock
    period_duration: int = 720  # Duration in seconds (default 12:00)
    period_label: str = "Quarter"  # "Quarter" or "Period"

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
    status: str = "active"  # scheduled, active, completed
    current_quarter: int = 1
    quarter_scores: QuarterScores = Field(default_factory=QuarterScores)
    play_by_play: List[PlayByPlayEntry] = []
    share_code: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    scheduled_date: Optional[str] = None  # ISO date string YYYY-MM-DD
    scheduled_time: Optional[str] = None  # Time string HH:MM
    # Clock fields
    clock_enabled: bool = False
    period_duration: int = 720  # Duration in seconds (default 12:00)
    period_label: str = "Quarter"  # "Quarter" or "Period"
    clock_time: int = 720  # Current clock time in seconds
    clock_running: bool = False
    clock_last_started: Optional[str] = None  # ISO timestamp when clock was last started
    is_halftime: bool = False
    # On-floor players (player_ids)
    home_on_floor: List[str] = []
    away_on_floor: List[str] = []
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
    # Minutes tracking
    seconds_played: int = 0  # Total seconds played
    last_check_in: Optional[str] = None  # ISO timestamp when player last checked in

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
    
    # Determine initial status
    initial_status = "active" if game_data.start_immediately else "scheduled"
    
    game = Game(
        home_team_id=game_data.home_team_id,
        away_team_id=game_data.away_team_id,
        home_team_name=home_team["name"],
        away_team_name=away_team["name"],
        home_team_logo=home_team.get("logo_url"),
        away_team_logo=away_team.get("logo_url"),
        home_team_color=home_team.get("color", "#dc2626"),
        away_team_color=away_team.get("color", "#7c3aed"),
        status=initial_status,
        scheduled_date=game_data.scheduled_date,
        scheduled_time=game_data.scheduled_time,
        clock_enabled=game_data.clock_enabled,
        period_duration=game_data.period_duration,
        period_label=game_data.period_label,
        clock_time=game_data.period_duration  # Start at full period time
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

@api_router.post("/games/{game_id}/start")
async def start_game(game_id: str, user: User = Depends(get_current_user)):
    """Start a scheduled game"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game["status"] != "scheduled":
        raise HTTPException(status_code=400, detail="Game is not in scheduled status")
    
    await db.games.update_one(
        {"id": game_id, "user_id": user.user_id},
        {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    updated = await db.games.find_one({"id": game_id}, {"_id": 0})
    return updated

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

@api_router.get("/games/latest/active/{user_id}")
async def get_latest_active_game(user_id: str):
    """Get the latest active game for a user (public endpoint for embed)"""
    # Find the most recent active game for this user
    game = await db.games.find_one(
        {"user_id": user_id, "status": "active"},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    if not game:
        return None
    
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

@api_router.post("/games/{game_id}/reset-stats")
async def reset_game_stats(game_id: str, user: User = Depends(get_current_user)):
    """Reset all player stats to 0 for a game"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Reset all player stats to 0
    reset_stats = {
        "ft_made": 0,
        "ft_missed": 0,
        "fg2_made": 0,
        "fg2_missed": 0,
        "fg3_made": 0,
        "fg3_missed": 0,
        "assists": 0,
        "offensive_rebounds": 0,
        "defensive_rebounds": 0,
        "turnovers": 0,
        "steals": 0,
        "blocks": 0,
        "fouls": 0
    }
    
    await db.player_stats.update_many(
        {"game_id": game_id},
        {"$set": reset_stats}
    )
    
    # Reset quarter scores
    num_quarters = len(game.get("quarter_scores", {}).get("home", [0, 0, 0, 0]))
    reset_quarters = {
        "quarter_scores": {
            "home": [0] * num_quarters,
            "away": [0] * num_quarters
        },
        "game_stats": {
            "lead_changes": 0,
            "ties": 1,
            "home_largest_lead": 0,
            "away_largest_lead": 0
        },
        "play_by_play": []
    }
    
    await db.games.update_one(
        {"id": game_id, "user_id": user.user_id},
        {"$set": reset_quarters}
    )
    
    return {"message": "All stats reset successfully"}

# Clock Control Endpoints
class ClockUpdate(BaseModel):
    time: Optional[int] = None  # Time in seconds
    
@api_router.post("/games/{game_id}/clock/start")
async def start_clock(game_id: str, user: User = Depends(get_current_user)):
    """Start the game clock"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if not game.get("clock_enabled"):
        raise HTTPException(status_code=400, detail="Clock is not enabled for this game")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.games.update_one(
        {"id": game_id, "user_id": user.user_id},
        {"$set": {"clock_running": True, "clock_last_started": now, "updated_at": now}}
    )
    
    # Update last_check_in for all players on floor
    home_on_floor = game.get("home_on_floor", [])
    away_on_floor = game.get("away_on_floor", [])
    all_on_floor = home_on_floor + away_on_floor
    
    if all_on_floor:
        await db.player_stats.update_many(
            {"id": {"$in": all_on_floor}, "game_id": game_id},
            {"$set": {"last_check_in": now}}
        )
    
    return {"message": "Clock started", "clock_last_started": now}

@api_router.post("/games/{game_id}/clock/stop")
async def stop_clock(game_id: str, user: User = Depends(get_current_user)):
    """Stop the game clock and calculate elapsed minutes for players on floor"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if not game.get("clock_enabled"):
        raise HTTPException(status_code=400, detail="Clock is not enabled for this game")
    
    now = datetime.now(timezone.utc)
    clock_last_started = game.get("clock_last_started")
    
    # Calculate time played for players on floor
    if clock_last_started and game.get("clock_running"):
        started_time = datetime.fromisoformat(clock_last_started.replace('Z', '+00:00'))
        elapsed_seconds = int((now - started_time).total_seconds())
        
        # Update seconds_played for all players on floor
        home_on_floor = game.get("home_on_floor", [])
        away_on_floor = game.get("away_on_floor", [])
        all_on_floor = home_on_floor + away_on_floor
        
        if all_on_floor:
            await db.player_stats.update_many(
                {"id": {"$in": all_on_floor}, "game_id": game_id},
                {"$inc": {"seconds_played": elapsed_seconds}, "$set": {"last_check_in": None}}
            )
    
    await db.games.update_one(
        {"id": game_id, "user_id": user.user_id},
        {"$set": {"clock_running": False, "clock_last_started": None, "updated_at": now.isoformat()}}
    )
    
    return {"message": "Clock stopped"}

@api_router.post("/games/{game_id}/clock/set")
async def set_clock(game_id: str, clock_data: ClockUpdate, user: User = Depends(get_current_user)):
    """Set the game clock time"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if clock_data.time is not None:
        await db.games.update_one(
            {"id": game_id, "user_id": user.user_id},
            {"$set": {"clock_time": clock_data.time, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {"message": "Clock time updated", "clock_time": clock_data.time}

@api_router.post("/games/{game_id}/clock/next-period")
async def next_period(game_id: str, user: User = Depends(get_current_user)):
    """Advance to next period and reset clock"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Stop clock first if running
    if game.get("clock_running"):
        await stop_clock(game_id, user)
    
    new_quarter = game.get("current_quarter", 1) + 1
    period_duration = game.get("period_duration", 720)
    
    # Add new quarter to scores if needed
    home_scores = game.get("quarter_scores", {}).get("home", [0, 0, 0, 0])
    away_scores = game.get("quarter_scores", {}).get("away", [0, 0, 0, 0])
    
    while len(home_scores) < new_quarter:
        home_scores.append(0)
    while len(away_scores) < new_quarter:
        away_scores.append(0)
    
    await db.games.update_one(
        {"id": game_id, "user_id": user.user_id},
        {"$set": {
            "current_quarter": new_quarter,
            "clock_time": period_duration,
            "clock_running": False,
            "is_halftime": False,
            "quarter_scores.home": home_scores,
            "quarter_scores.away": away_scores,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": f"Advanced to period {new_quarter}", "current_quarter": new_quarter}

@api_router.post("/games/{game_id}/clock/halftime")
async def go_to_halftime(game_id: str, user: User = Depends(get_current_user)):
    """Set game to halftime"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Stop clock first if running
    if game.get("clock_running"):
        await stop_clock(game_id, user)
    
    await db.games.update_one(
        {"id": game_id, "user_id": user.user_id},
        {"$set": {
            "is_halftime": True,
            "clock_running": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Halftime"}

# Player On-Floor (Substitution) Endpoints
@api_router.post("/games/{game_id}/players/{player_id}/check-in")
async def player_check_in(game_id: str, player_id: str, user: User = Depends(get_current_user)):
    """Check a player into the game (put them on the floor)"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    player_stat = await db.player_stats.find_one({"id": player_id, "game_id": game_id})
    if not player_stat:
        raise HTTPException(status_code=404, detail="Player not found")
    
    team_id = player_stat["team_id"]
    is_home = team_id == game["home_team_id"]
    floor_key = "home_on_floor" if is_home else "away_on_floor"
    current_on_floor = game.get(floor_key, [])
    
    # Check if already on floor
    if player_id in current_on_floor:
        return {"message": "Player already on floor"}
    
    # Check if team already has 5 players on floor
    if len(current_on_floor) >= 5:
        raise HTTPException(status_code=400, detail="Team already has 5 players on floor")
    
    # Add player to floor
    current_on_floor.append(player_id)
    
    now = datetime.now(timezone.utc).isoformat()
    update_data = {floor_key: current_on_floor, "updated_at": now}
    
    await db.games.update_one(
        {"id": game_id, "user_id": user.user_id},
        {"$set": update_data}
    )
    
    # If clock is running, set last_check_in for the player
    if game.get("clock_running"):
        await db.player_stats.update_one(
            {"id": player_id, "game_id": game_id},
            {"$set": {"last_check_in": now}}
        )
    
    return {"message": "Player checked in", floor_key: current_on_floor}

@api_router.post("/games/{game_id}/players/{player_id}/check-out")
async def player_check_out(game_id: str, player_id: str, user: User = Depends(get_current_user)):
    """Check a player out of the game (take them off the floor)"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    player_stat = await db.player_stats.find_one({"id": player_id, "game_id": game_id})
    if not player_stat:
        raise HTTPException(status_code=404, detail="Player not found")
    
    team_id = player_stat["team_id"]
    is_home = team_id == game["home_team_id"]
    floor_key = "home_on_floor" if is_home else "away_on_floor"
    current_on_floor = game.get(floor_key, [])
    
    # Check if player is on floor
    if player_id not in current_on_floor:
        return {"message": "Player not on floor"}
    
    # Calculate time played if clock was running
    if game.get("clock_running") and player_stat.get("last_check_in"):
        now = datetime.now(timezone.utc)
        check_in_time = datetime.fromisoformat(player_stat["last_check_in"].replace('Z', '+00:00'))
        elapsed_seconds = int((now - check_in_time).total_seconds())
        
        await db.player_stats.update_one(
            {"id": player_id, "game_id": game_id},
            {"$inc": {"seconds_played": elapsed_seconds}, "$set": {"last_check_in": None}}
        )
    
    # Remove player from floor
    current_on_floor.remove(player_id)
    
    await db.games.update_one(
        {"id": game_id, "user_id": user.user_id},
        {"$set": {floor_key: current_on_floor, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Player checked out", floor_key: current_on_floor}

class PlayerUpdate(BaseModel):
    player_number: Optional[str] = None
    player_name: Optional[str] = None

@api_router.put("/games/{game_id}/players/{player_id}")
async def update_player(game_id: str, player_id: str, update: PlayerUpdate, user: User = Depends(get_current_user)):
    """Update a player's number or name"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    player_stat = await db.player_stats.find_one({"id": player_id, "game_id": game_id})
    if not player_stat:
        raise HTTPException(status_code=404, detail="Player not found")
    
    update_data = {}
    if update.player_number is not None:
        update_data["player_number"] = update.player_number
    if update.player_name is not None:
        update_data["player_name"] = update.player_name
    
    if update_data:
        await db.player_stats.update_one(
            {"id": player_id},
            {"$set": update_data}
        )
    
    updated = await db.player_stats.find_one({"id": player_id}, {"_id": 0})
    return updated

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
    """Generate a simple college-style box score PDF"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    player_stats = await db.player_stats.find({"game_id": game_id}, {"_id": 0}).to_list(100)
    home_stats = [s for s in player_stats if s["team_id"] == game["home_team_id"]]
    away_stats = [s for s in player_stats if s["team_id"] == game["away_team_id"]]
    
    home_totals = calculate_team_totals(home_stats)
    away_totals = calculate_team_totals(away_stats)
    
    # Get game flow stats
    game_stats = game.get("game_stats", {})
    home_largest_lead = game_stats.get("home_largest_lead", 0)
    away_largest_lead = game_stats.get("away_largest_lead", 0)
    lead_changes = game_stats.get("lead_changes", 0)
    ties = game_stats.get("ties", 0)
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.4*inch, bottomMargin=0.4*inch, leftMargin=0.4*inch, rightMargin=0.4*inch)
    elements = []
    
    # Check if clock was enabled for this game
    clock_enabled = game.get("clock_enabled", False)
    
    # Column headers matching the college box score style
    if clock_enabled:
        headers = ["", "MIN", "FG", "FGA", "3P", "3PA", "FT", "FTA", "OR", "DR", "TOT", "A", "PF", "ST", "TO", "BLKS", "PTS"]
    else:
        headers = ["", "FG", "FGA", "3P", "3PA", "FT", "FTA", "OR", "DR", "TOT", "A", "PF", "ST", "TO", "BLKS", "PTS"]
    
    def format_minutes(seconds):
        """Format seconds as MM:SS"""
        mins = seconds // 60
        secs = seconds % 60
        return f"{mins}:{secs:02d}"
    
    def create_team_table(team_name: str, team_label: str, stats_list: list, team_totals: dict):
        """Create a team's box score table in college style"""
        # Sort players by jersey number
        sorted_stats = sorted(stats_list, key=lambda x: int(x.get("player_number", "0")) if x.get("player_number", "0").isdigit() else 0)
        
        # Team header row - adjust column count based on clock
        num_cols = 17 if clock_enabled else 16
        data = [[f"{team_label}: {team_name}"] + [""] * (num_cols - 1)]
        # Column headers
        data.append(headers)
        
        # Player rows - format: "# Name"
        total_team_seconds = 0
        for s in sorted_stats:
            totals = calculate_player_totals(s)
            player_label = f"{s['player_number']} {s['player_name']}"
            seconds_played = s.get("seconds_played", 0)
            total_team_seconds += seconds_played
            
            if clock_enabled:
                row = [
                    player_label,
                    format_minutes(seconds_played),
                    totals['fg_made'],
                    totals['fg_att'],
                    s['fg3_made'],
                    totals['fg3_att'],
                    s['ft_made'],
                    totals['ft_att'],
                    s['offensive_rebounds'],
                    s['defensive_rebounds'],
                    totals['total_reb'],
                    s['assists'],
                    s['fouls'],
                    s['steals'],
                    s['turnovers'],
                    s['blocks'],
                    totals['pts']
                ]
            else:
                row = [
                    player_label,
                    totals['fg_made'],
                    totals['fg_att'],
                    s['fg3_made'],
                    totals['fg3_att'],
                    s['ft_made'],
                    totals['ft_att'],
                    s['offensive_rebounds'],
                    s['defensive_rebounds'],
                    totals['total_reb'],
                    s['assists'],
                    s['fouls'],
                    s['steals'],
                    s['turnovers'],
                    s['blocks'],
                    totals['pts']
                ]
            data.append(row)
        
        # Totals row
        if clock_enabled:
            data.append([
                "",
                format_minutes(total_team_seconds),
                team_totals['fg_made'],
                team_totals['fg_att'],
                team_totals['fg3_made'],
                team_totals['fg3_att'],
                team_totals['ft_made'],
                team_totals['ft_att'],
                team_totals['oreb'],
                team_totals['dreb'],
                team_totals['reb'],
                team_totals['ast'],
                team_totals['pf'],
                team_totals['stl'],
                team_totals['to'],
                team_totals['blk'],
                team_totals['pts']
            ])
        else:
            data.append([
                "",
                team_totals['fg_made'],
                team_totals['fg_att'],
                team_totals['fg3_made'],
                team_totals['fg3_att'],
                team_totals['ft_made'],
                team_totals['ft_att'],
                team_totals['oreb'],
                team_totals['dreb'],
                team_totals['reb'],
                team_totals['ast'],
                team_totals['pf'],
                team_totals['stl'],
                team_totals['to'],
                team_totals['blk'],
                team_totals['pts']
            ])
        
        # Percentage row - aligned under the correct columns
        if clock_enabled:
            data.append([
                f"{team_totals['fg_pct']}%",
                "",
                "",
                f"{team_totals['fg3_pct']}%",
                "",
                f"{team_totals['ft_pct']}%",
                "",
                f"TM REB: {team_totals['reb']}",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                ""
            ])
            col_widths = [1.4*inch, 0.38*inch, 0.28*inch, 0.32*inch, 0.28*inch, 0.32*inch, 0.28*inch, 0.32*inch, 0.28*inch, 0.28*inch, 0.32*inch, 0.28*inch, 0.28*inch, 0.28*inch, 0.28*inch, 0.35*inch, 0.35*inch]
        else:
            data.append([
                f"{team_totals['fg_pct']}%",
                "",
                f"{team_totals['fg3_pct']}%",
                "",
                f"{team_totals['ft_pct']}%",
                "",
                f"TM REB: {team_totals['reb']}",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                ""
            ])
            col_widths = [1.6*inch, 0.28*inch, 0.32*inch, 0.28*inch, 0.32*inch, 0.28*inch, 0.32*inch, 0.28*inch, 0.28*inch, 0.32*inch, 0.28*inch, 0.28*inch, 0.28*inch, 0.28*inch, 0.35*inch, 0.35*inch]
        
        table = Table(data, colWidths=col_widths)
        
        num_rows = len(data)
        
        # Adjust span indices based on clock_enabled
        if clock_enabled:
            pct_spans = [
                ('SPAN', (0, num_rows-1), (2, num_rows-1)),  # FG% spans first 3 cols
                ('SPAN', (3, num_rows-1), (4, num_rows-1)),  # 3P% spans next 2 cols
                ('SPAN', (5, num_rows-1), (6, num_rows-1)),  # FT% spans next 2 cols
                ('SPAN', (7, num_rows-1), (10, num_rows-1)), # TM REB spans OR/DR/TOT/A
            ]
        else:
            pct_spans = [
                ('SPAN', (0, num_rows-1), (1, num_rows-1)),  # FG% spans first 2 cols
                ('SPAN', (2, num_rows-1), (3, num_rows-1)),  # 3P% spans next 2 cols
                ('SPAN', (4, num_rows-1), (5, num_rows-1)),  # FT% spans next 2 cols
                ('SPAN', (6, num_rows-1), (9, num_rows-1)),  # TM REB spans OR/DR/TOT/A
            ]
        
        table.setStyle(TableStyle([
            # Team header row
            ('SPAN', (0, 0), (-1, 0)),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
            ('TOPPADDING', (0, 0), (-1, 0), 6),
            ('LINEBELOW', (0, 0), (-1, 0), 1, colors.black),
            
            # Column headers
            ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 1), (-1, 1), 8),
            ('LINEBELOW', (0, 1), (-1, 1), 1, colors.black),
            
            # Player rows
            ('FONTNAME', (0, 2), (0, num_rows-3), 'Helvetica'),
            ('FONTSIZE', (0, 2), (-1, num_rows-3), 8),
            ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            
            # Totals row
            ('LINEABOVE', (0, num_rows-2), (-1, num_rows-2), 1, colors.black),
            ('FONTNAME', (0, num_rows-2), (-1, num_rows-2), 'Helvetica-Bold'),
            
            # Percentage row spans
            *pct_spans,
            ('FONTSIZE', (0, num_rows-1), (-1, num_rows-1), 8),
            ('ALIGN', (0, num_rows-1), (6 if clock_enabled else 5, num_rows-1), 'CENTER'),
            
            # Padding
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 2),
            ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ]))
        
        return table
    
    # Calculate final scores
    q_scores = game.get("quarter_scores", {"home": [0,0,0,0], "away": [0,0,0,0]})
    home_total = sum(q_scores.get("home", [0,0,0,0]))
    away_total = sum(q_scores.get("away", [0,0,0,0]))
    
    # Away team (VISITOR) first
    away_table = create_team_table(game['away_team_name'], "VISITOR", away_stats, away_totals)
    elements.append(away_table)
    elements.append(Spacer(1, 20))
    
    # Home team
    home_table = create_team_table(game['home_team_name'], "HOME", home_stats, home_totals)
    elements.append(home_table)
    elements.append(Spacer(1, 20))
    
    # Game Flow Stats
    styles = getSampleStyleSheet()
    flow_style = ParagraphStyle('Flow', parent=styles['Normal'], fontSize=9, spaceAfter=4)
    elements.append(Paragraph("<b>GAME FLOW</b>", flow_style))
    elements.append(Paragraph(f"Lead Changes: {lead_changes}  |  Times Tied: {ties}  |  {game['home_team_name']} Largest Lead: {home_largest_lead}  |  {game['away_team_name']} Largest Lead: {away_largest_lead}", flow_style))
    
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
