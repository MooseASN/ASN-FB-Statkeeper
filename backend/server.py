from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Request, Response, Depends, Cookie, Body
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
import httpx
from bs4 import BeautifulSoup
import re
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from passlib.context import CryptContext
import bcrypt as bcrypt_lib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection with logging
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'statmoose')
logging.info(f"Connecting to MongoDB: {mongo_url[:30]}... DB: {db_name}")
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Password hashing - use bcrypt directly for better compatibility
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Helper function to verify password - use passlib for robust compatibility
def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        # Use passlib's verify which handles multiple bcrypt variations
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logging.error(f"Password verification exception: {e}")
        # Fallback to direct bcrypt check
        try:
            return bcrypt_lib.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception:
            return False

# Helper function to hash password - use passlib for consistency
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

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
    email: str  # Can be email OR username
    password: str

class UpdateUsernameRequest(BaseModel):
    new_username: str
    security_answer: str

class UpdateEmailRequest(BaseModel):
    new_email: str
    security_answer: str

class UpdatePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    security_answer: str

class VerifySecurityRequest(BaseModel):
    answer: str

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
    # Check for reserved emails (admin accounts)
    if user_data.email.lower() in RESERVED_EMAILS:
        raise HTTPException(status_code=400, detail="This email is reserved and cannot be used for registration")
    
    # Check for reserved usernames (admin accounts)
    if user_data.username.lower() in RESERVED_USERNAMES:
        raise HTTPException(status_code=400, detail="This username is reserved and cannot be used for registration")
    
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
    
    # Create session - no device/IP restrictions
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=30),  # Extended to 30 days
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie with cross-device compatible settings
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=30 * 24 * 60 * 60  # 30 days
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
    """Login with email OR username and password - works from any device/IP"""
    # Try to find user by email first, then by username
    login_identifier = credentials.email.lower().strip()
    logging.info(f"Login attempt for: {login_identifier}")
    
    user = await db.users.find_one({"email": login_identifier}, {"_id": 0})
    
    if not user:
        # Try username
        user = await db.users.find_one({"username": login_identifier}, {"_id": 0})
        logging.info(f"Tried username lookup, found: {user is not None}")
    
    if not user:
        logging.warning(f"User not found: {login_identifier}")
        # More specific error for debugging
        raise HTTPException(status_code=401, detail="User not found. Please check your email/username.")
    
    logging.info(f"User found: {user.get('email')}, auth_provider: {user.get('auth_provider')}")
    
    if user.get("auth_provider") == "google":
        raise HTTPException(status_code=400, detail="This account uses Google login. Please sign in with Google.")
    
    # Verify password
    stored_hash = user.get("password_hash", "")
    logging.info(f"Verifying password, hash exists: {bool(stored_hash)}, hash length: {len(stored_hash)}")
    
    if not stored_hash:
        logging.error(f"No password hash for user: {login_identifier}")
        raise HTTPException(status_code=401, detail="Account has no password set. Please use 'Forgot Password' to set one.")
    
    try:
        password_valid = verify_password(credentials.password, stored_hash)
        logging.info(f"Password verification result: {password_valid}")
    except Exception as e:
        logging.error(f"Password verification error: {e}")
        raise HTTPException(status_code=401, detail="Password verification error. Please try again.")
    
    if not password_valid:
        logging.warning(f"Password mismatch for user: {login_identifier}")
        raise HTTPException(status_code=401, detail="Incorrect password. Please try again.")
    
    # Create session - no IP/device restrictions, just user credentials
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=30),  # Extended to 30 days
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_doc)
    
    logging.info(f"Login successful for: {login_identifier}")
    
    # Set cookie with settings that work across devices
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=30 * 24 * 60 * 60  # 30 days
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
    
    # Build reset URL - use origin header or environment variable
    origin = request.headers.get("origin")
    if not origin:
        # Fallback to environment-based URL
        origin = os.environ.get("FRONTEND_URL", "http://localhost:3000")
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

# ============ ACCOUNT SETTINGS ENDPOINTS ============

@api_router.get("/account/security-question")
async def get_my_security_question(user: User = Depends(get_current_user)):
    """Get a random security question for the current user (for account changes)"""
    import random
    
    user_data = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    security_questions = user_data.get("security_questions", [])
    if not security_questions:
        return {"question": None, "has_questions": False, "message": "No security questions set for this account"}
    
    # Return a random question
    selected = random.choice(security_questions)
    return {"question": selected["question"], "has_questions": True}

@api_router.post("/account/verify-security")
async def verify_my_security_question(data: VerifySecurityRequest, user: User = Depends(get_current_user)):
    """Verify security question answer for account changes"""
    user_data = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    security_questions = user_data.get("security_questions", [])
    
    # Check answer against all questions (we don't know which one was asked)
    answer_verified = False
    for sq in security_questions:
        if pwd_context.verify(data.answer.lower().strip(), sq["answer_hash"]):
            answer_verified = True
            break
    
    if not answer_verified:
        raise HTTPException(status_code=400, detail="Invalid security answer")
    
    return {"verified": True, "message": "Security question verified"}

@api_router.get("/account/profile")
async def get_account_profile(user: User = Depends(get_current_user)):
    """Get full account profile including security question info"""
    user_data = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    security_questions = user_data.get("security_questions", [])
    
    return {
        "user_id": user_data["user_id"],
        "email": user_data["email"],
        "username": user_data.get("username", ""),
        "name": user_data.get("name", ""),
        "picture": user_data.get("picture"),
        "auth_provider": user_data.get("auth_provider", "local"),
        "has_security_questions": len(security_questions) > 0,
        "security_question_count": len(security_questions),
        "created_at": user_data.get("created_at", "")
    }

@api_router.put("/account/username")
async def update_username(data: UpdateUsernameRequest, user: User = Depends(get_current_user)):
    """Update username with security verification"""
    user_data = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_data.get("auth_provider") == "google":
        raise HTTPException(status_code=400, detail="Google accounts cannot change username")
    
    # Verify security answer
    security_questions = user_data.get("security_questions", [])
    answer_verified = False
    for sq in security_questions:
        if pwd_context.verify(data.security_answer.lower().strip(), sq["answer_hash"]):
            answer_verified = True
            break
    
    if not answer_verified:
        raise HTTPException(status_code=400, detail="Invalid security answer")
    
    # Check if username is already taken
    new_username = data.new_username.lower().strip()
    if len(new_username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    
    existing = await db.users.find_one({"username": new_username, "user_id": {"$ne": user.user_id}}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Update username
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"username": new_username}}
    )
    
    return {"message": "Username updated successfully", "username": new_username}

@api_router.put("/account/email")
async def update_email(data: UpdateEmailRequest, user: User = Depends(get_current_user)):
    """Update email with security verification"""
    user_data = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_data.get("auth_provider") == "google":
        raise HTTPException(status_code=400, detail="Google accounts cannot change email")
    
    # Verify security answer
    security_questions = user_data.get("security_questions", [])
    answer_verified = False
    for sq in security_questions:
        if pwd_context.verify(data.security_answer.lower().strip(), sq["answer_hash"]):
            answer_verified = True
            break
    
    if not answer_verified:
        raise HTTPException(status_code=400, detail="Invalid security answer")
    
    # Validate email format
    new_email = data.new_email.lower().strip()
    if "@" not in new_email or "." not in new_email:
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    # Check if email is already taken
    existing = await db.users.find_one({"email": new_email, "user_id": {"$ne": user.user_id}}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Update email
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"email": new_email}}
    )
    
    return {"message": "Email updated successfully", "email": new_email}

@api_router.put("/account/password")
async def update_password(data: UpdatePasswordRequest, user: User = Depends(get_current_user)):
    """Update password with current password and security verification"""
    user_data = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_data.get("auth_provider") == "google":
        raise HTTPException(status_code=400, detail="Google accounts cannot change password")
    
    # Verify current password
    if not verify_password(data.current_password, user_data.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Verify security answer
    security_questions = user_data.get("security_questions", [])
    answer_verified = False
    for sq in security_questions:
        if pwd_context.verify(data.security_answer.lower().strip(), sq["answer_hash"]):
            answer_verified = True
            break
    
    if not answer_verified:
        raise HTTPException(status_code=400, detail="Invalid security answer")
    
    # Validate new password
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Update password
    hashed_password = hash_password(data.new_password)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"password_hash": hashed_password}}
    )
    
    # Invalidate all other sessions for security
    await db.user_sessions.delete_many({"user_id": user.user_id})
    
    return {"message": "Password updated successfully. Please log in again."}

@api_router.put("/account/name")
async def update_display_name(data: dict, user: User = Depends(get_current_user)):
    """Update display name (no security verification needed)"""
    new_name = data.get("name", "").strip()
    
    if not new_name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"name": new_name}}
    )
    
    return {"message": "Name updated successfully", "name": new_name}

# ============ ADMIN ENDPOINTS ============

ADMIN_EMAILS = ["antlersportsnetwork@gmail.com", "jared@antlersn.com"]
ADMIN_USERNAMES = ["admin"]
RESERVED_EMAILS = ["antlersportsnetwork@gmail.com", "jared@antlersn.com"]
RESERVED_USERNAMES = ["admin"]

def is_admin_user(user: User) -> bool:
    """Check if user has admin privileges"""
    return (user.email.lower() in ADMIN_EMAILS or 
            (user.username and user.username.lower() in ADMIN_USERNAMES))

async def get_admin_user(user: User = Depends(get_current_user)) -> User:
    """Verify user is an admin"""
    if not is_admin_user(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

@api_router.get("/admin/users")
async def get_all_users(admin: User = Depends(get_admin_user)):
    """Get all users (admin only) - excludes password hashes"""
    users = await db.users.find({}, {"_id": 0, "password_hash": 0, "security_questions": 0}).to_list(10000)
    
    # Get all user IDs
    user_ids = [user.get("user_id") for user in users]
    
    # Batch count queries using aggregation (avoids N+1)
    team_counts = {}
    game_counts = {}
    event_counts = {}
    
    # Count teams per user in single query
    team_agg = await db.teams.aggregate([
        {"$match": {"user_id": {"$in": user_ids}}},
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}}}
    ]).to_list(10000)
    for item in team_agg:
        team_counts[item["_id"]] = item["count"]
    
    # Count games per user in single query
    game_agg = await db.games.aggregate([
        {"$match": {"user_id": {"$in": user_ids}}},
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}}}
    ]).to_list(10000)
    for item in game_agg:
        game_counts[item["_id"]] = item["count"]
    
    # Count events per user in single query
    event_agg = await db.events.aggregate([
        {"$match": {"user_id": {"$in": user_ids}}},
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}}}
    ]).to_list(10000)
    for item in event_agg:
        event_counts[item["_id"]] = item["count"]
    
    # Enrich users with counts
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

@api_router.get("/admin/users/export")
async def export_users_csv(admin: User = Depends(get_admin_user)):
    """Export all users as CSV (admin only)"""
    users = await db.users.find({}, {"_id": 0, "password_hash": 0, "security_questions": 0}).to_list(10000)
    
    # Get all user IDs
    user_ids = [user.get("user_id") for user in users]
    
    # Batch count queries using aggregation (avoids N+1)
    team_counts = {}
    game_counts = {}
    event_counts = {}
    
    # Count teams per user in single query
    team_agg = await db.teams.aggregate([
        {"$match": {"user_id": {"$in": user_ids}}},
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}}}
    ]).to_list(10000)
    for item in team_agg:
        team_counts[item["_id"]] = item["count"]
    
    # Count games per user in single query
    game_agg = await db.games.aggregate([
        {"$match": {"user_id": {"$in": user_ids}}},
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}}}
    ]).to_list(10000)
    for item in game_agg:
        game_counts[item["_id"]] = item["count"]
    
    # Count events per user in single query
    event_agg = await db.events.aggregate([
        {"$match": {"user_id": {"$in": user_ids}}},
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}}}
    ]).to_list(10000)
    for item in event_agg:
        event_counts[item["_id"]] = item["count"]
    
    # Create CSV
    output = io.StringIO()
    fieldnames = ["user_id", "email", "username", "name", "auth_provider", "created_at", "team_count", "game_count", "event_count"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    
    for user in users:
        user_id = user.get("user_id")
        writer.writerow({
            "user_id": user.get("user_id", ""),
            "email": user.get("email", ""),
            "username": user.get("username", ""),
            "name": user.get("name", ""),
            "auth_provider": user.get("auth_provider", "local"),
            "created_at": user.get("created_at", ""),
            "team_count": team_counts.get(user_id, 0),
            "game_count": game_counts.get(user_id, 0),
            "event_count": event_counts.get(user_id, 0)
        })
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=statmoose_users_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"}
    )

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: User = Depends(get_admin_user)):
    """Delete a user account (admin only)"""
    # Get the user to be deleted
    user_to_delete = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deletion of admin user
    if user_to_delete.get("email") == "antlersportsnetwork@gmail.com":
        raise HTTPException(status_code=403, detail="Cannot delete the main admin account")
    
    # Delete the user
    await db.users.delete_one({"user_id": user_id})
    
    # Delete user sessions
    await db.user_sessions.delete_many({"user_id": user_id})
    
    return {
        "message": "User deleted successfully",
        "user_id": user_id,
        "email": user_to_delete.get("email")
    }

@api_router.get("/admin/stats")
async def get_admin_stats(admin: User = Depends(get_admin_user)):
    """Get overall platform stats (admin only)"""
    total_users = await db.users.count_documents({})
    total_teams = await db.teams.count_documents({})
    total_games = await db.games.count_documents({})
    total_events = await db.events.count_documents({})
    
    # Get counts by sport
    basketball_teams = await db.teams.count_documents({"sport": "basketball"})
    football_teams = await db.teams.count_documents({"sport": "football"})
    basketball_games = await db.games.count_documents({"sport": "basketball"})
    football_games = await db.games.count_documents({"sport": "football"})
    
    # Get recent signups (last 7 days)
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_users = await db.users.count_documents({"created_at": {"$gte": week_ago}})
    
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

@api_router.get("/admin/check")
async def check_admin_status(user: User = Depends(get_current_user)):
    """Check if current user is an admin"""
    return {"is_admin": is_admin_user(user)}

# ============ BETA MODE SETTINGS ============

class BetaModeSettings(BaseModel):
    basketball_beta: bool = False
    basketball_password: str = ""
    football_beta: bool = False
    football_password: str = ""
    baseball_beta: bool = False
    baseball_password: str = ""
    school_creation_beta: bool = False
    school_creation_password: str = ""

@api_router.get("/admin/beta-settings")
async def get_beta_settings(admin: User = Depends(get_admin_user)):
    """Get beta mode settings (admin only)"""
    settings = await db.settings.find_one({"type": "beta_mode"}, {"_id": 0})
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

@api_router.put("/admin/beta-settings")
async def update_beta_settings(settings: BetaModeSettings, admin: User = Depends(get_admin_user)):
    """Update beta mode settings (admin only)"""
    await db.settings.update_one(
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

@api_router.get("/beta-status")
async def get_beta_status():
    """Get public beta status (no auth required) - returns which sports are in beta mode"""
    settings = await db.settings.find_one({"type": "beta_mode"}, {"_id": 0})
    if not settings:
        return {
            "basketball_beta": False,
            "football_beta": False,
            "baseball_beta": False,
            "school_creation_beta": False
        }
    return {
        "basketball_beta": settings.get("basketball_beta", False),
        "football_beta": settings.get("football_beta", False),
        "baseball_beta": settings.get("baseball_beta", False),
        "school_creation_beta": settings.get("school_creation_beta", False)
    }

@api_router.post("/beta-verify")
async def verify_beta_password(sport: str = Body(...), password: str = Body(...)):
    """Verify beta password for a sport (no auth required)"""
    settings = await db.settings.find_one({"type": "beta_mode"}, {"_id": 0})
    if not settings:
        return {"valid": True}
    
    if sport == "basketball":
        if not settings.get("basketball_beta", False):
            return {"valid": True}
        return {"valid": password == settings.get("basketball_password", "")}
    elif sport == "football":
        if not settings.get("football_beta", False):
            return {"valid": True}
        return {"valid": password == settings.get("football_password", "")}
    elif sport == "baseball":
        if not settings.get("baseball_beta", False):
            return {"valid": True}
        return {"valid": password == settings.get("baseball_password", "")}
    elif sport == "school_creation":
        if not settings.get("school_creation_beta", False):
            return {"valid": True}
        return {"valid": password == settings.get("school_creation_password", "")}
    
    return {"valid": False, "error": "Invalid type"}

@api_router.post("/admin/migrate-teams-sport")
async def migrate_teams_to_basketball(admin: User = Depends(get_admin_user)):
    """Migrate all teams without a sport field to basketball (admin only)"""
    # Find teams without sport field or with null/empty sport
    result = await db.teams.update_many(
        {"$or": [
            {"sport": {"$exists": False}},
            {"sport": None},
            {"sport": ""}
        ]},
        {"$set": {"sport": "basketball"}}
    )
    
    # Also migrate games
    games_result = await db.games.update_many(
        {"$or": [
            {"sport": {"$exists": False}},
            {"sport": None},
            {"sport": ""}
        ]},
        {"$set": {"sport": "basketball"}}
    )
    
    # Also migrate events
    events_result = await db.events.update_many(
        {"$or": [
            {"sport": {"$exists": False}},
            {"sport": None},
            {"sport": ""}
        ]},
        {"$set": {"sport": "basketball"}}
    )
    
    return {
        "message": "Migration complete",
        "teams_migrated": result.modified_count,
        "games_migrated": games_result.modified_count,
        "events_migrated": events_result.modified_count
    }

@api_router.get("/admin/schools")
async def get_all_schools(admin: User = Depends(get_admin_user)):
    """Get all schools for admin view (sorted alphabetically)"""
    schools = await db.schools.find(
        {},
        {"_id": 0, "school_id": 1, "school_code": 1, "name": 1, "state": 1, 
         "logo_url": 1, "primary_color": 1, "created_at": 1, 
         "classification": 1, "classification_display": 1}
    ).sort("name", 1).to_list(500)
    
    # Get member counts and season counts for each school
    for school in schools:
        member_count = await db.users.count_documents({"school_id": school["school_id"]})
        season_count = await db.seasons.count_documents({"school_id": school["school_id"]})
        school["member_count"] = member_count
        school["season_count"] = season_count
    
    return {"schools": schools, "total": len(schools)}

@api_router.get("/admin/schools/{school_id}")
async def get_school_details(school_id: str, admin: User = Depends(get_admin_user)):
    """Get detailed info for a specific school (admin only)"""
    school = await db.schools.find_one(
        {"school_id": school_id},
        {"_id": 0}
    )
    
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Get all members with their details
    members = await db.users.find(
        {"school_id": school_id},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1, "username": 1, 
         "school_role": 1, "created_at": 1}
    ).to_list(100)
    
    # Get all seasons with sport info
    seasons = await db.seasons.find(
        {"school_id": school_id},
        {"_id": 0, "season_id": 1, "name": 1, "sport": 1, "gender": 1, 
         "level": 1, "created_at": 1}
    ).to_list(50)
    
    # Count games per season
    for season in seasons:
        game_count = await db.games.count_documents({"season_id": season["season_id"]})
        season["game_count"] = game_count
    
    # Get unique sports being used
    sports_used = list(set(s.get("sport", "unknown") for s in seasons))
    
    return {
        "school": school,
        "members": members,
        "seasons": seasons,
        "sports_used": sports_used
    }

# ============ DATA MODELS ============

class Player(BaseModel):
    number: str
    name: str

class TeamCreate(BaseModel):
    name: str
    logo_url: Optional[str] = None
    color: str = "#000000"  # Default team color
    roster: List[Player] = []
    sport: str = "basketball"  # "basketball" or "football"

class Team(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""  # Owner of this team
    name: str
    logo_url: Optional[str] = None
    color: str = "#000000"
    roster: List[Player] = []
    sport: str = "basketball"  # "basketball" or "football"
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
    timeout_preset: str = "college"  # "high_school", "college", or "custom"
    custom_timeouts: int = 4  # Used when timeout_preset is "custom"
    primetime_enabled: bool = False  # Enable primetime mode with video
    video_url: Optional[str] = None  # YouTube or m3u8 video URL
    simple_mode: bool = False  # Simple mode: only track makes, rebounds, assists, fouls
    advanced_mode: bool = False  # Advanced mode: PrestoSports-style interface
    note: Optional[str] = None  # Game note/description
    sport: str = "basketball"  # "basketball", "football", or "baseball"
    # Baseball-specific fields
    total_innings: int = 9  # Number of innings (default 9, can be 7 for high school/doubleheaders)

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
    note: Optional[str] = None  # Game note/description
    # Clock fields
    clock_enabled: bool = False
    period_duration: int = 720  # Duration in seconds (default 12:00)
    period_label: str = "Quarter"  # "Quarter" or "Period"
    clock_time: int = 720  # Current clock time in seconds
    clock_running: bool = False
    clock_last_started: Optional[str] = None  # ISO timestamp when clock was last started
    is_halftime: bool = False
    # Timeout fields
    total_timeouts: int = 4  # Total timeouts per team
    home_timeouts_used: int = 0  # Timeouts used by home team
    away_timeouts_used: int = 0  # Timeouts used by away team
    # Primetime fields
    primetime_enabled: bool = False  # Enable primetime mode with video
    video_url: Optional[str] = None  # YouTube or m3u8 video URL
    # Event/Tournament association
    event_id: Optional[str] = None  # ID of event this game belongs to
    # Bonus status
    home_bonus: Optional[str] = None  # null, "bonus", or "double_bonus"
    away_bonus: Optional[str] = None  # null, "bonus", or "double_bonus"
    # Simple mode - only track makes, rebounds, assists, fouls
    simple_mode: bool = False
    # Advanced mode - PrestoSports-style interface
    advanced_mode: bool = False
    # Current possession - "home" or "away"
    possession: Optional[str] = None
    # On-floor players (player_ids)
    home_on_floor: List[str] = []
    away_on_floor: List[str] = []
    # Starters (player_ids) - marked with * on box score
    home_starters: List[str] = []
    away_starters: List[str] = []
    starters_selected: bool = False
    # Sport type
    sport: str = "basketball"  # "basketball", "football", or "baseball"
    # Baseball-specific fields
    total_innings: int = 9  # Number of innings (7 for high school/doubleheaders, 9 for standard)
    current_inning: int = 1  # Current inning number
    inning_half: str = "top"  # "top" (away bats) or "bottom" (home bats)
    outs: int = 0  # Current outs (0-2, 3 = end of half inning)
    balls: int = 0  # Current balls count (0-3, 4 = walk)
    strikes: int = 0  # Current strikes count (0-2, 3 = strikeout)
    bases: dict = Field(default_factory=lambda: {"first": None, "second": None, "third": None})  # Runner IDs on bases
    inning_scores: dict = Field(default_factory=lambda: {"home": [], "away": []})  # Runs per inning
    current_batter_id: Optional[str] = None  # Current batter's player ID
    current_pitcher_id: Optional[str] = None  # Current pitcher's player ID
    # General timestamps
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PlayerStats(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    game_id: str
    team_id: str
    player_number: str
    player_name: str
    # Basketball stats
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
    # Baseball batting stats
    at_bats: int = 0  # AB
    hits: int = 0  # H (singles + doubles + triples + home runs)
    singles: int = 0
    doubles: int = 0  # 2B
    triples: int = 0  # 3B
    home_runs: int = 0  # HR
    runs: int = 0  # R
    rbis: int = 0  # RBI
    walks: int = 0  # BB
    strikeouts_batting: int = 0  # K (as batter)
    hit_by_pitch: int = 0  # HBP
    sacrifice_flies: int = 0  # SF
    sacrifice_bunts: int = 0  # SAC
    stolen_bases: int = 0  # SB
    caught_stealing: int = 0  # CS
    # Baseball pitching stats
    innings_pitched: float = 0.0  # IP (e.g., 6.2 = 6 and 2/3 innings)
    hits_allowed: int = 0  # H
    runs_allowed: int = 0  # R
    earned_runs: int = 0  # ER
    walks_allowed: int = 0  # BB
    strikeouts_pitching: int = 0  # K (as pitcher)
    home_runs_allowed: int = 0  # HR
    pitches_thrown: int = 0
    strikes_thrown: int = 0
    balls_thrown: int = 0
    # Baseball fielding stats
    putouts: int = 0  # PO
    fielding_assists: int = 0  # A
    errors: int = 0  # E

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
    home_on_floor: Optional[List[str]] = None
    away_on_floor: Optional[List[str]] = None
    clock_time: Optional[int] = None
    home_bonus: Optional[str] = None
    away_bonus: Optional[str] = None
    play_by_play: Optional[List[dict]] = None
    home_starters: Optional[List[str]] = None
    away_starters: Optional[List[str]] = None
    starters_selected: Optional[bool] = None
    # Scheduling fields
    home_team_id: Optional[str] = None
    away_team_id: Optional[str] = None
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    # Game settings
    simple_mode: Optional[bool] = None
    advanced_mode: Optional[bool] = None
    clock_enabled: Optional[bool] = None
    period_duration: Optional[int] = None
    period_label: Optional[str] = None
    timeout_preset: Optional[str] = None
    custom_timeouts: Optional[int] = None
    primetime_enabled: Optional[bool] = None
    video_url: Optional[str] = None
    note: Optional[str] = None  # Game note/description
    # Football-specific state
    football_state: Optional[dict] = None
    # Football scores (for public stats)
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    possession: Optional[str] = None
    home_time_of_possession: Optional[int] = None
    away_time_of_possession: Optional[int] = None

# Sponsor Banner Model
class SponsorBanner(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""
    image_data: str = ""  # Base64 encoded image
    filename: str = ""
    link_url: Optional[str] = None  # Optional clickable link URL
    order: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Event/Tournament Model
class EventCreate(BaseModel):
    name: str
    location: Optional[str] = None
    start_date: str  # YYYY-MM-DD
    end_date: Optional[str] = None  # YYYY-MM-DD, same as start_date if single day
    logo_data: Optional[str] = None  # Base64 encoded logo image
    color: str = "#000000"  # Ticker background color
    sport: str = "basketball"  # "basketball" or "football"

class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""
    name: str
    location: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    logo_data: Optional[str] = None
    color: str = "#000000"  # Ticker background color
    game_ids: List[str] = []  # List of game IDs in this event
    sport: str = "basketball"  # "basketball" or "football"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============ TEAM ENDPOINTS ============

@api_router.post("/teams", response_model=Team)
async def create_team(team_data: TeamCreate, user: User = Depends(get_current_user)):
    team = Team(**team_data.model_dump())
    team.user_id = user.user_id
    doc = team.model_dump()
    await db.teams.insert_one(doc)
    return team

@api_router.get("/teams", response_model=List[Team])
async def get_teams(sport: Optional[str] = None, user: User = Depends(get_current_user)):
    query = {"user_id": user.user_id}
    if sport:
        query["sport"] = sport
    teams = await db.teams.find(query, {"_id": 0}).to_list(100)
    return teams

@api_router.get("/teams/{team_id}", response_model=Team)
async def get_team(team_id: str, user: User = Depends(get_current_user)):
    team = await db.teams.find_one({"id": team_id, "user_id": user.user_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team

@api_router.put("/teams/{team_id}", response_model=Team)
async def update_team(team_id: str, team_data: TeamCreate, user: User = Depends(get_current_user)):
    existing = await db.teams.find_one({"id": team_id, "user_id": user.user_id}, {"_id": 0})
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


class MaxPrepsImportRequest(BaseModel):
    url: str


@api_router.post("/teams/{team_id}/roster/maxpreps")
async def import_maxpreps_roster(team_id: str, request: MaxPrepsImportRequest, user: User = Depends(get_current_user)):
    """Import roster from any athletic website roster URL (MaxPreps, PrestoSports, Sidearm, etc.). Only extracts player number and name."""
    team = await db.teams.find_one({"id": team_id, "user_id": user.user_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    url = request.url.strip()
    
    if not url:
        raise HTTPException(status_code=400, detail="Please provide a roster URL")
    
    # Ensure URL has protocol
    if not url.startswith('http'):
        url = 'https://' + url
    
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            }
            response = await client.get(url, headers=headers)
            response.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch page: HTTP {e.response.status_code}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch page: {str(e)}")
    
    soup = BeautifulSoup(response.text, 'lxml')
    
    roster = []
    
    # Helper function to clean player names
    def clean_name(name_text):
        if not name_text:
            return ""
        # Remove extra whitespace, newlines, tabs and normalize
        cleaned = ' '.join(name_text.split())
        cleaned = cleaned.strip()
        # Remove leading jersey numbers that got included in name (e.g., "0 Cade Orness" -> "Cade Orness")
        import re as re_inner
        cleaned = re_inner.sub(r'^\d{1,3}\s+', '', cleaned)
        return cleaned
    
    # Helper function to extract position and class/year
    def extract_position_class(row, headers=None, cells=None):
        position = ""
        player_class = ""
        
        # Common position patterns
        position_patterns = ['pos', 'position', 'pos.']
        class_patterns = ['class', 'yr', 'year', 'cl', 'el', 'elig', 'academic']
        
        # Try from headers/cells in table
        if headers and cells:
            for i, h in enumerate(headers):
                h_lower = h.lower()
                if any(p in h_lower for p in position_patterns) and i < len(cells):
                    position = cells[i].get_text(strip=True)
                if any(p in h_lower for p in class_patterns) and i < len(cells):
                    player_class = cells[i].get_text(strip=True)
                    # Normalize class abbreviations
                    class_map = {
                        'fr': 'FR', 'freshman': 'FR', 'fr.': 'FR', '1': 'FR',
                        'so': 'SO', 'sophomore': 'SO', 'so.': 'SO', '2': 'SO',
                        'jr': 'JR', 'junior': 'JR', 'jr.': 'JR', '3': 'JR',
                        'sr': 'SR', 'senior': 'SR', 'sr.': 'SR', '4': 'SR',
                        'gr': 'GR', 'graduate': 'GR', 'grad': 'GR', 'rs': 'GR', '5': 'GR'
                    }
                    player_class = class_map.get(player_class.lower().strip(), player_class.upper()[:2])
        
        # Try from element selectors (for card layouts)
        if not position:
            pos_elem = row.select_one('[class*="position"], [class*="pos"], .sidearm-roster-player-position, .roster-player-position')
            if pos_elem:
                position = pos_elem.get_text(strip=True)
        
        if not player_class:
            class_elem = row.select_one('[class*="class"], [class*="year"], .sidearm-roster-player-class, .roster-player-class, [class*="academic"]')
            if class_elem:
                raw_class = class_elem.get_text(strip=True)
                class_map = {
                    'fr': 'FR', 'freshman': 'FR', 'fr.': 'FR',
                    'so': 'SO', 'sophomore': 'SO', 'so.': 'SO',
                    'jr': 'JR', 'junior': 'JR', 'jr.': 'JR',
                    'sr': 'SR', 'senior': 'SR', 'sr.': 'SR',
                    'gr': 'GR', 'graduate': 'GR', 'grad': 'GR', 'rs': 'GR'
                }
                player_class = class_map.get(raw_class.lower().strip(), raw_class.upper()[:2] if raw_class else "")
        
        return position, player_class
    
    # PrestoSports/Sidearm specific selectors (common on college athletic sites)
    # These platforms use specific class patterns
    
    # Method 1: PrestoSports roster table (common structure)
    # Look for roster tables with specific PrestoSports/Sidearm patterns
    presto_rows = soup.select('.sidearm-roster-player, .roster-player, [class*="roster"] tr, .s-person-card, .s-person, [class*="RosterCard"], [class*="roster-card"], .team-roster-item')
    
    for row in presto_rows:
        number = ""
        name = ""
        
        # Try PrestoSports/Sidearm specific selectors
        num_elem = row.select_one('.sidearm-roster-player-jersey-number, .roster-player-jersey, [class*="jersey"], [class*="number"]:not([class*="phone"]), .s-stamp, [class*="Jersey"], .player-no')
        name_elem = row.select_one('.sidearm-roster-player-name a, .roster-player-name a, [class*="player-name"], .s-person-details__personal-single-line a, [class*="PlayerName"], .roster-name a, .player-info a')
        
        if num_elem:
            number = num_elem.get_text(strip=True).replace('#', '')
        if name_elem:
            name = clean_name(name_elem.get_text())
        
        # If name not found, try broader selectors
        if not name:
            name_elem = row.select_one('a[href*="bio"], a[href*="player"], a[href*="roster"], h3, h4, .name')
            if name_elem:
                name = clean_name(name_elem.get_text())
        
        # Extract position and class
        position, player_class = extract_position_class(row)
        
        # Validate and add
        if number and name and re.match(r'^\d{1,3}$', number):
            roster.append({"number": number, "name": name, "position": position, "playerClass": player_class})
    
    # Method 2: Standard roster table parsing
    if not roster:
        tables = soup.find_all('table')
        for table in tables:
            # Get headers
            header_row = table.find('tr')
            if not header_row:
                continue
            headers = [th.get_text(strip=True).lower() for th in header_row.find_all(['th', 'td'])]
            
            # Look for number/jersey and name columns
            num_idx = -1
            name_idx = -1
            
            for i, h in enumerate(headers):
                h_clean = h.lower()
                if num_idx < 0 and ('#' in h_clean or 'no' == h_clean or 'no.' == h_clean or 'jersey' in h_clean or h_clean == 'number'):
                    num_idx = i
                if name_idx < 0 and ('name' in h_clean or 'player' in h_clean or 'athlete' in h_clean):
                    name_idx = i
            
            if num_idx >= 0 and name_idx >= 0:
                rows = table.find_all('tr')[1:]  # Skip header
                for row in rows:
                    cells = row.find_all(['td', 'th'])
                    if len(cells) > max(num_idx, name_idx):
                        # Extract number and clean it (remove "No.:", "#", etc.)
                        raw_number = cells[num_idx].get_text(strip=True)
                        number = re.sub(r'^(No\.?:?\s*|#)', '', raw_number, flags=re.IGNORECASE).strip()
                        
                        name_cell = cells[name_idx]
                        # Try to get name from link first, then text
                        name_link = name_cell.find('a')
                        name = clean_name(name_link.get_text() if name_link else name_cell.get_text())
                        
                        # Extract position and class from table cells
                        position, player_class = extract_position_class(row, headers, cells)
                        
                        if number and name and re.match(r'^\d{1,3}$', number):
                            roster.append({"number": number, "name": name, "position": position, "playerClass": player_class})
                
                if roster:
                    break
    
    # Method 3: Look for any table with player-like data
    if not roster:
        for table in soup.find_all('table'):
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 2:
                    # Try to find a number in first few cells
                    number = ""
                    name = ""
                    
                    for i, cell in enumerate(cells[:5]):  # Check first 5 cells
                        text = clean_name(cell.get_text()).replace('#', '')
                        # Check if it looks like a jersey number
                        if not number and re.match(r'^\d{1,3}$', text):
                            number = text
                        # Check if it looks like a name (has letters, spaces)
                        elif not name and re.match(r'^[A-Za-z][A-Za-z\s\.\'\-]+$', text) and len(text) > 3:
                            # Prefer names from links
                            link = cell.find('a')
                            if link:
                                name = clean_name(link.get_text())
                            else:
                                name = text
                    
                    if number and name:
                        position, player_class = extract_position_class(row)
                        roster.append({"number": number, "name": name, "position": position, "playerClass": player_class})
    
    # Method 4: Look for player cards/list items
    if not roster:
        player_cards = soup.select('[class*="player"], [class*="roster-item"], [class*="athlete"], li[class*="person"]')
        for card in player_cards:
            number = ""
            name = ""
            
            # Look for number
            for selector in ['[class*="number"]', '[class*="jersey"]', '.num', 'span:first-child']:
                elem = card.select_one(selector)
                if elem:
                    text = elem.get_text(strip=True).replace('#', '')
                    if re.match(r'^\d{1,3}$', text):
                        number = text
                        break
            
            # Look for name
            for selector in ['[class*="name"] a', '[class*="name"]', 'a[href*="bio"], a[href*="player"], h3, h4']:
                elem = card.select_one(selector)
                if elem:
                    text = clean_name(elem.get_text())
                    if len(text) > 2 and re.match(r'^[A-Za-z]', text):
                        name = text
                        break
            
            if number and name:
                position, player_class = extract_position_class(card)
                roster.append({"number": number, "name": name, "position": position, "playerClass": player_class})
    
    if not roster:
        raise HTTPException(status_code=400, detail="Could not find roster data. Please ensure you're using a direct roster page URL.")
    
    # Remove duplicates
    seen = set()
    unique_roster = []
    for player in roster:
        key = (player["number"], player["name"])
        if key not in seen:
            seen.add(key)
            unique_roster.append(player)
    
    # Update team roster
    existing_roster = team.get("roster", [])
    existing_numbers = {p["number"] for p in existing_roster}
    
    # Add new players that don't conflict
    added = 0
    for player in unique_roster:
        if player["number"] not in existing_numbers:
            existing_roster.append(player)
            existing_numbers.add(player["number"])
            added += 1
    
    await db.teams.update_one({"id": team_id, "user_id": user.user_id}, {"$set": {"roster": existing_roster}})
    
    return {
        "message": f"Imported {added} new players ({len(unique_roster)} found, {len(unique_roster) - added} duplicates skipped)",
        "roster": existing_roster,
        "imported_count": added,
        "found_count": len(unique_roster)
    }


class ScrapeRosterRequest(BaseModel):
    url: str


@api_router.post("/team/scrape-roster")
async def scrape_roster_only(request: ScrapeRosterRequest, user: User = Depends(get_current_user)):
    """Scrape roster from any athletic website URL. Returns roster data without saving to a team."""
    url = request.url.strip()
    
    if not url:
        raise HTTPException(status_code=400, detail="Please provide a roster URL")
    
    # Ensure URL has protocol
    if not url.startswith('http'):
        url = 'https://' + url
    
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            }
            response = await client.get(url, headers=headers)
            response.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch page: HTTP {e.response.status_code}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch page: {str(e)}")
    
    soup = BeautifulSoup(response.text, 'lxml')
    roster = []
    
    # Helper function to clean player names
    def clean_name(name_text):
        if not name_text:
            return ""
        cleaned = ' '.join(name_text.split())
        cleaned = cleaned.strip()
        import re as re_inner
        cleaned = re_inner.sub(r'^\d{1,3}\s+', '', cleaned)
        return cleaned
    
    # Helper function to extract position and class/year
    def extract_position_class(row, headers=None, cells=None):
        position = ""
        player_class = ""
        
        position_patterns = ['pos', 'position', 'pos.']
        class_patterns = ['class', 'yr', 'year', 'cl', 'el', 'elig', 'academic', 'grade', 'gr.', 'yr.']
        
        # Normalize class/grade to standard abbreviation
        def normalize_class(raw_class):
            if not raw_class:
                return ""
            raw = raw_class.lower().strip()
            
            # Handle redshirt prefix
            is_redshirt = any(rs in raw for rs in ['rs ', 'r-', 'redshirt', 'red-shirt', 'r. '])
            
            # Remove redshirt prefix for matching
            clean = raw
            for prefix in ['redshirt ', 'red-shirt ', 'r- ', 'rs ', 'r. ']:
                clean = clean.replace(prefix, '')
            clean = clean.strip()
            
            # Class mapping with many variations
            class_map = {
                # Freshman variations
                'fr': 'FR', 'freshman': 'FR', 'fr.': 'FR', 'fresh': 'FR', 'frosh': 'FR',
                '1': 'FR', '1st': 'FR', 'first year': 'FR', 'first-year': 'FR', 'fy': 'FR',
                '9': 'FR', '9th': 'FR', 'ninth': 'FR', 'grade 9': 'FR',
                # Sophomore variations
                'so': 'SO', 'sophomore': 'SO', 'so.': 'SO', 'soph': 'SO',
                '2': 'SO', '2nd': 'SO', 'second year': 'SO', 'second-year': 'SO',
                '10': 'SO', '10th': 'SO', 'tenth': 'SO', 'grade 10': 'SO',
                # Junior variations
                'jr': 'JR', 'junior': 'JR', 'jr.': 'JR', 'jun': 'JR',
                '3': 'JR', '3rd': 'JR', 'third year': 'JR', 'third-year': 'JR',
                '11': 'JR', '11th': 'JR', 'eleventh': 'JR', 'grade 11': 'JR',
                # Senior variations
                'sr': 'SR', 'senior': 'SR', 'sr.': 'SR', 'sen': 'SR',
                '4': 'SR', '4th': 'SR', 'fourth year': 'SR', 'fourth-year': 'SR',
                '12': 'SR', '12th': 'SR', 'twelfth': 'SR', 'grade 12': 'SR',
                # Graduate/5th year
                'gr': 'GR', 'graduate': 'GR', 'grad': 'GR', 'gr.': 'GR',
                '5': 'GR', '5th': 'GR', 'fifth year': 'GR', 'fifth-year': 'GR',
                '6': 'GR', '6th': 'GR',
                # Middle school grades (for prep/youth)
                '7': '7', '7th': '7', 'seventh': '7', 'grade 7': '7',
                '8': '8', '8th': '8', 'eighth': '8', 'grade 8': '8',
            }
            
            # Try exact match first
            result = class_map.get(clean, '')
            
            # If no exact match, try to extract the first word that might be a class
            if not result:
                # Look for class word at beginning or as standalone
                import re as re_norm
                class_match = re_norm.match(r'^(freshman|sophomore|junior|senior|graduate|grad|fr|so|jr|sr|gr)\b', clean, re_norm.IGNORECASE)
                if class_match:
                    result = class_map.get(class_match.group(1).lower(), '')
            
            # If still no match, try to extract just numbers for grades
            if not result and clean:
                import re as re_class
                # Check for grade number pattern (e.g., "Grade 10", "10th Grade")
                grade_match = re_class.search(r'\b(\d{1,2})(?:th|st|nd|rd)?\b', clean)
                if grade_match:
                    grade_num = grade_match.group(1)
                    # Only use if it's a valid grade number (7-12 for HS, 1-6 for college)
                    if grade_num in class_map:
                        result = class_map.get(grade_num, '')
            
            # Add RS prefix if redshirt
            if is_redshirt and result:
                return f"RS {result}"
            
            return result
        
        # First try to extract from headers/cells in table format
        if headers and cells:
            for i, h in enumerate(headers):
                h_lower = h.lower()
                if any(p in h_lower for p in position_patterns) and i < len(cells):
                    pos_text = cells[i].get_text(strip=True)
                    # Clean position - remove height/weight patterns
                    import re as re_pos
                    pos_text = re_pos.sub(r'\d+[\'\"]\d*[\'\"]*', '', pos_text)  # Remove heights like 6'3"
                    pos_text = re_pos.sub(r'\d+\s*lbs?', '', pos_text, flags=re_pos.IGNORECASE)  # Remove weights
                    position = pos_text.strip()
                if any(p in h_lower for p in class_patterns) and i < len(cells):
                    raw_class = cells[i].get_text(strip=True)
                    player_class = normalize_class(raw_class)
        
        # Try CSS selectors for position
        if not position:
            pos_elem = row.select_one('[class*="position"], [class*="pos"], .sidearm-roster-player-position, [data-label*="Pos"], [data-label*="Position"]')
            if pos_elem:
                pos_text = pos_elem.get_text(strip=True)
                # Clean position - remove height/weight patterns
                import re as re_pos2
                pos_text = re_pos2.sub(r'\d+[\'\"]\d*[\'\"]*', '', pos_text)  # Remove heights
                pos_text = re_pos2.sub(r'\d+\s*lbs?', '', pos_text, flags=re_pos2.IGNORECASE)  # Remove weights
                position = pos_text.strip()
                # Also remove duplicate position words (e.g., "GuardGuard" -> "Guard")
                if position and len(position) > 10:
                    words = position.split()
                    if len(words) >= 2 and words[0].lower() == words[1].lower():
                        position = words[0]
        
        # Try CSS selectors for class/grade with expanded patterns
        if not player_class:
            class_selectors = [
                '.sidearm-roster-player-academic-year', '.sidearm-roster-player-year',
                '.sidearm-roster-player-class', '.sidearm-roster-player-eligibility',
                '[class*="academic-year"]', '[class*="class-year"]',
                '[data-label*="Class"]', '[data-label*="Year"]', '[data-label*="Grade"]', '[data-label*="Yr"]',
                '.roster-class', '.roster-year', '.roster-grade',
                '[class*="cl-"]', '[class*="yr-"]'
            ]
            for selector in class_selectors:
                class_elem = row.select_one(selector)
                if class_elem:
                    raw_class = class_elem.get_text(strip=True)
                    if raw_class and len(raw_class) < 20:  # Avoid grabbing too much text
                        player_class = normalize_class(raw_class)
                        if player_class:
                            break
        
        # Look for class in any text content that matches patterns
        if not player_class:
            import re as re_extract
            row_text = row.get_text(' ', strip=True)
            # Look for common class patterns in the text - be more specific to avoid false positives
            class_pattern = re_extract.search(
                r'\b(R-?S[-\s]*)?(Freshman|Sophomore|Junior|Senior|Graduate|Fr\.|So\.|Jr\.|Sr\.|Gr\.)\b',
                row_text, re_extract.IGNORECASE
            )
            if class_pattern:
                player_class = normalize_class(class_pattern.group(0))
            else:
                # Look for standalone class abbreviations (must be word boundaries)
                abbrev_pattern = re_extract.search(r'(?<!\w)(RS\s*)?(FR|SO|JR|SR|GR)(?!\w)', row_text)
                if abbrev_pattern:
                    player_class = normalize_class(abbrev_pattern.group(0))
                else:
                    # Look for high school grade numbers
                    grade_pattern = re_extract.search(r'\b(9th|10th|11th|12th|Grade\s*\d{1,2})\b', row_text, re_extract.IGNORECASE)
                    if grade_pattern:
                        player_class = normalize_class(grade_pattern.group(0))
        
        return position, player_class
    
    # Helper to clean position text
    def clean_position(pos_text):
        if not pos_text:
            return ""
        # Remove height/weight patterns
        import re as re_pos_clean
        cleaned = re_pos_clean.sub(r'\d+[\'\"]\d*[\'\"]*', '', pos_text)  # Remove heights
        cleaned = re_pos_clean.sub(r'\d+\s*lbs?', '', cleaned, flags=re_pos_clean.IGNORECASE)  # Remove weights
        cleaned = cleaned.strip()
        # Fix duplicate words (e.g., "GuardGuard" -> "Guard")
        if cleaned:
            # Check for exact duplicate (word repeated immediately)
            match = re_pos_clean.match(r'^(\w+)\1$', cleaned, re_pos_clean.IGNORECASE)
            if match:
                cleaned = match.group(1).title()
            # Also check for common positions with issues
            elif len(cleaned) > 12:
                # Try to extract first position word
                pos_match = re_pos_clean.match(r'^(Guard|Forward|Center|Point Guard|Shooting Guard|Small Forward|Power Forward|PG|SG|SF|PF|C|G|F|QB|RB|WR|TE|OL|DL|LB|CB|S|K|P)', cleaned, re_pos_clean.IGNORECASE)
                if pos_match:
                    cleaned = pos_match.group(1)
        return cleaned
    
    # Try PrestoSports/Sidearm roster patterns
    presto_rows = soup.select('.sidearm-roster-player, .roster-player, [class*="roster"] tr, .s-person-card')
    for row in presto_rows:
        number = ""
        name = ""
        
        num_elem = row.select_one('.sidearm-roster-player-jersey-number, [class*="jersey"], [class*="number"]:not([class*="phone"])')
        name_elem = row.select_one('.sidearm-roster-player-name a, [class*="player-name"], .s-person-details__personal-single-line a')
        
        if num_elem:
            number = num_elem.get_text(strip=True).replace('#', '')
        if name_elem:
            name = clean_name(name_elem.get_text())
        
        if not name:
            name_elem = row.select_one('a[href*="bio"], a[href*="player"], h3, h4, .name')
            if name_elem:
                name = clean_name(name_elem.get_text())
        
        position, player_class = extract_position_class(row)
        position = clean_position(position)
        
        if name:
            roster.append({
                "number": number,
                "name": name,
                "position": position,
                "playerClass": player_class
            })
    
    # Try generic table rows if no PrestoSports results
    if not roster:
        tables = soup.find_all('table')
        for table in tables:
            headers = []
            header_row = table.find('tr')
            if header_row:
                header_cells = header_row.find_all(['th', 'td'])
                headers = [h.get_text(strip=True).lower() for h in header_cells]
            
            for tr in table.find_all('tr')[1:]:
                cells = tr.find_all('td')
                if len(cells) >= 2:
                    number = ""
                    name = ""
                    
                    for i, h in enumerate(headers):
                        if any(x in h for x in ['#', 'no', 'number', 'jersey']) and i < len(cells):
                            number = cells[i].get_text(strip=True).replace('#', '')
                        if any(x in h for x in ['name', 'player', 'athlete']) and i < len(cells):
                            name = clean_name(cells[i].get_text())
                    
                    if not name and len(cells) >= 2:
                        potential_name = cells[1].get_text(strip=True) if len(cells) > 1 else cells[0].get_text(strip=True)
                        if potential_name and not potential_name.isdigit() and len(potential_name) > 2:
                            name = clean_name(potential_name)
                        if not number and cells[0].get_text(strip=True).isdigit():
                            number = cells[0].get_text(strip=True)
                    
                    position, player_class = extract_position_class(tr, headers, cells)
                    position = clean_position(position)
                    
                    if name:
                        roster.append({
                            "number": number,
                            "name": name,
                            "position": position,
                            "playerClass": player_class
                        })
    
    # Remove duplicates
    seen = set()
    unique_roster = []
    for player in roster:
        key = (player["number"], player["name"])
        if key not in seen and player["name"]:
            seen.add(key)
            unique_roster.append(player)
    
    return {
        "roster": unique_roster,
        "count": len(unique_roster),
        "message": f"Found {len(unique_roster)} players"
    }

# ============ GAME ENDPOINTS ============

@api_router.post("/games", response_model=Game)
async def create_game(game_data: GameCreate, user: User = Depends(get_current_user)):
    # Handle TBD teams
    home_team = None
    away_team = None
    
    if game_data.home_team_id != "TBD":
        home_team = await db.teams.find_one({"id": game_data.home_team_id, "user_id": user.user_id}, {"_id": 0})
        if not home_team:
            raise HTTPException(status_code=404, detail="Home team not found")
    
    if game_data.away_team_id != "TBD":
        away_team = await db.teams.find_one({"id": game_data.away_team_id, "user_id": user.user_id}, {"_id": 0})
        if not away_team:
            raise HTTPException(status_code=404, detail="Away team not found")
    
    # Determine initial status
    initial_status = "active" if game_data.start_immediately else "scheduled"
    
    # Determine total timeouts based on preset
    if game_data.timeout_preset == "high_school":
        total_timeouts = 5
    elif game_data.timeout_preset == "college":
        total_timeouts = 4
    else:  # custom
        total_timeouts = game_data.custom_timeouts
    
    game = Game(
        home_team_id=game_data.home_team_id,
        away_team_id=game_data.away_team_id,
        home_team_name=home_team["name"] if home_team else "TBD",
        away_team_name=away_team["name"] if away_team else "TBD",
        home_team_logo=home_team.get("logo_url") if home_team else None,
        away_team_logo=away_team.get("logo_url") if away_team else None,
        home_team_color=home_team.get("color", "#dc2626") if home_team else "#666666",
        away_team_color=away_team.get("color", "#7c3aed") if away_team else "#666666",
        status=initial_status,
        scheduled_date=game_data.scheduled_date,
        scheduled_time=game_data.scheduled_time,
        clock_enabled=game_data.clock_enabled,
        period_duration=game_data.period_duration,
        period_label=game_data.period_label,
        clock_time=game_data.period_duration,  # Start at full period time
        total_timeouts=total_timeouts,
        home_timeouts_used=0,
        away_timeouts_used=0,
        primetime_enabled=game_data.primetime_enabled,
        video_url=game_data.video_url,
        simple_mode=game_data.simple_mode,
        advanced_mode=game_data.advanced_mode,
        possession="home",  # Default possession to home team
        note=game_data.note,  # Game note/description
        sport=game_data.sport  # Pass the sport from the request!
    )
    game.user_id = user.user_id
    
    doc = game.model_dump()
    await db.games.insert_one(doc)
    
    # Create player stats for roster players (only if teams are not TBD)
    if home_team:
        for player in home_team.get("roster", []):
            stats = PlayerStats(
                game_id=game.id,
                team_id=game_data.home_team_id,
                player_number=player["number"],
                player_name=player["name"]
            )
            await db.player_stats.insert_one(stats.model_dump())
    
    if away_team:
        for player in away_team.get("roster", []):
            stats = PlayerStats(
                game_id=game.id,
                team_id=game_data.away_team_id,
                player_number=player["number"],
                player_name=player["name"]
            )
            await db.player_stats.insert_one(stats.model_dump())
    
    return game

class StartGameRequest(BaseModel):
    simple_mode: bool = False
    advanced_mode: bool = False
    clock_enabled: bool = False

@api_router.post("/games/{game_id}/start")
async def start_game(game_id: str, request: StartGameRequest = None, user: User = Depends(get_current_user)):
    """Start a scheduled game with optional mode selection"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game["status"] != "scheduled":
        raise HTTPException(status_code=400, detail="Game is not in scheduled status")
    
    # Build update with mode settings if provided
    update_data = {
        "status": "active", 
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if request:
        update_data["simple_mode"] = request.simple_mode
        update_data["advanced_mode"] = request.advanced_mode
        if request.clock_enabled:
            update_data["clock_enabled"] = True
    
    await db.games.update_one(
        {"id": game_id, "user_id": user.user_id},
        {"$set": update_data}
    )
    
    updated = await db.games.find_one({"id": game_id}, {"_id": 0})
    return updated

@api_router.get("/games", response_model=List[Game])
async def get_games(sport: Optional[str] = None, user: User = Depends(get_current_user)):
    query = {"user_id": user.user_id}
    # Only add sport filter if a valid sport is provided
    if sport and sport.strip():
        query["sport"] = sport.strip()
    games = await db.games.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return games

@api_router.get("/games/public/{game_id}")
async def get_game_public(game_id: str):
    """Public endpoint to view game stats - no authentication required"""
    game = await db.games.find_one({"id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    player_stats = await db.player_stats.find({"game_id": game_id}, {"_id": 0}).to_list(100)
    
    home_stats = [s for s in player_stats if s["team_id"] == game.get("home_team_id")]
    away_stats = [s for s in player_stats if s["team_id"] == game.get("away_team_id")]
    
    # Get events/play log for this game
    events = await db.events.find({"game_id": game_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    return {
        **game,
        "home_player_stats": home_stats,
        "away_player_stats": away_stats,
        "events": events
    }

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
    # Handle demo share codes
    if share_code.startswith("demo-"):
        mode = share_code.replace("demo-", "")
        if mode in ["classic", "advanced", "simple"]:
            # Return basketball demo data
            home_on_floor = ["demo-bh1", "demo-bh2", "demo-bh3", "demo-bh4", "demo-bh5"]
            away_on_floor = ["demo-ba1", "demo-ba2", "demo-ba3", "demo-ba4", "demo-ba5"]
            demo_game = {
                "id": f"demo-basketball-{mode}",
                "sport": "basketball",
                "status": "active",
                "is_demo": True,
                "simple_mode": mode == "simple",
                "advanced_mode": mode == "advanced",
                "home_team_id": "demo-home-team",
                "away_team_id": "demo-away-team",
                "home_team_name": "Northside Tigers",
                "away_team_name": "Eastwood Eagles",
                "home_team_color": "#f97316",
                "away_team_color": "#3b82f6",
                "home_score": 0,
                "away_score": 0,
                "period": 1,
                "current_quarter": 1,
                "period_label": "1st",
                "clock_enabled": True,
                "clock_time": 720,
                "clock_running": False,
                "home_timeouts": 5,
                "away_timeouts": 5,
                "home_fouls": 0,
                "away_fouls": 0,
                "home_bonus": False,
                "away_bonus": False,
                "possession": "home",
                "home_player_stats": create_demo_player_stats(BASKETBALL_DEMO_HOME_PLAYERS, home_on_floor),
                "away_player_stats": create_demo_player_stats(BASKETBALL_DEMO_AWAY_PLAYERS, away_on_floor),
                "home_on_floor": home_on_floor,
                "away_on_floor": away_on_floor,
                "play_by_play": [],
                "quarter_scores": {"home": [0, 0, 0, 0], "away": [0, 0, 0, 0]},
                "share_code": share_code
            }
            return demo_game
        elif mode == "football":
            # Return football demo data
            demo_game = {
                "id": "demo-football",
                "sport": "football",
                "status": "active",
                "is_demo": True,
                "home_team_id": "demo-home-football",
                "away_team_id": "demo-away-football",
                "home_team_name": "Central Wolves",
                "away_team_name": "Riverside Panthers",
                "home_team_color": "#dc2626",
                "away_team_color": "#7c3aed",
                "home_score": 0,
                "away_score": 0,
                "quarter": 1,
                "home_timeouts": 3,
                "away_timeouts": 3,
                "possession": "home",
                "ball_position": 25,
                "down": 1,
                "distance": 10,
                "clock_time": 900,
                "clock_running": False,
                "home_roster": FOOTBALL_DEMO_HOME_ROSTER,
                "away_roster": FOOTBALL_DEMO_AWAY_ROSTER,
                "share_code": share_code
            }
            return demo_game
        else:
            raise HTTPException(status_code=404, detail="Demo game not found")
    
    game = await db.games.find_one({"share_code": share_code}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Fetch player stats from player_stats collection
    player_stats = await db.player_stats.find({"game_id": game["id"]}, {"_id": 0}).to_list(100)
    
    home_stats = [s for s in player_stats if s["team_id"] == game["home_team_id"]]
    away_stats = [s for s in player_stats if s["team_id"] == game["away_team_id"]]
    
    # If no player stats in collection, use stats from game document (for live tracking)
    if not home_stats and game.get("home_player_stats"):
        home_stats = game.get("home_player_stats", [])
    if not away_stats and game.get("away_player_stats"):
        away_stats = game.get("away_player_stats", [])
    
    # Fetch team data for logos and rosters
    home_team = await db.teams.find_one({"id": game["home_team_id"]}, {"_id": 0})
    away_team = await db.teams.find_one({"id": game["away_team_id"]}, {"_id": 0})
    
    # Add team logos to game data
    if home_team:
        game["home_team_logo"] = home_team.get("logo_url") or home_team.get("logo")
        game["home_team_roster"] = home_team.get("roster", [])
    if away_team:
        game["away_team_logo"] = away_team.get("logo_url") or away_team.get("logo")
        game["away_team_roster"] = away_team.get("roster", [])
    
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
    
    # If no player stats in collection, use stats from game document
    if not home_stats and game.get("home_player_stats"):
        home_stats = game.get("home_player_stats", [])
    if not away_stats and game.get("away_player_stats"):
        away_stats = game.get("away_player_stats", [])
    
    # Fetch team data for logos and rosters
    home_team = await db.teams.find_one({"id": game["home_team_id"]}, {"_id": 0})
    away_team = await db.teams.find_one({"id": game["away_team_id"]}, {"_id": 0})
    
    # Add team logos to game data
    if home_team:
        game["home_team_logo"] = home_team.get("logo_url") or home_team.get("logo")
        game["home_team_roster"] = home_team.get("roster", [])
    if away_team:
        game["away_team_logo"] = away_team.get("logo_url") or away_team.get("logo")
        game["away_team_roster"] = away_team.get("roster", [])
    
    return {
        **game,
        "home_player_stats": home_stats,
        "away_player_stats": away_stats
    }

@api_router.put("/games/{game_id}", response_model=Game)
async def update_game(game_id: str, update: GameUpdate, user: User = Depends(get_current_user)):
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # If team IDs are being updated, also update team names and colors
    if update.home_team_id:
        if update.home_team_id == "TBD":
            update_data["home_team_name"] = "TBD"
            update_data["home_team_color"] = "#666666"
        else:
            home_team = await db.teams.find_one({"id": update.home_team_id}, {"_id": 0})
            if home_team:
                update_data["home_team_name"] = home_team["name"]
                update_data["home_team_color"] = home_team.get("color", "#000000")
    
    if update.away_team_id:
        if update.away_team_id == "TBD":
            update_data["away_team_name"] = "TBD"
            update_data["away_team_color"] = "#666666"
        else:
            away_team = await db.teams.find_one({"id": update.away_team_id}, {"_id": 0})
            if away_team:
                update_data["away_team_name"] = away_team["name"]
                update_data["away_team_color"] = away_team.get("color", "#FF6B00")
    
    await db.games.update_one({"id": game_id, "user_id": user.user_id}, {"$set": update_data})
    updated = await db.games.find_one({"id": game_id}, {"_id": 0})
    return updated

@api_router.delete("/games/{game_id}")
async def delete_game(game_id: str, user: User = Depends(get_current_user)):
    """Delete a game and all its associated player stats"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Delete all player stats for this game
    await db.player_stats.delete_many({"game_id": game_id})
    
    # Delete the game
    result = await db.games.delete_one({"id": game_id, "user_id": user.user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Game not found")
    
    return {"message": "Game deleted successfully"}

@api_router.post("/games/{game_id}/continue")
async def continue_game(game_id: str, user: User = Depends(get_current_user)):
    """Continue a completed game - sets status back to active"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Only completed games can be continued")
    
    await db.games.update_one(
        {"id": game_id, "user_id": user.user_id},
        {"$set": {
            "status": "active",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    updated = await db.games.find_one({"id": game_id}, {"_id": 0})
    return updated

@api_router.post("/games/{game_id}/reset-stats")
async def reset_game_stats(game_id: str, user: User = Depends(get_current_user)):
    """Reset all player stats to 0 for a game"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
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
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
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
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
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
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if clock_data.time is not None:
        await db.games.update_one(
            {"id": game_id, "user_id": user.user_id},
            {"$set": {"clock_time": clock_data.time, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {"message": "Clock time updated", "clock_time": clock_data.time}


@api_router.post("/games/{game_id}/clock/tick")
async def tick_clock(game_id: str, user: User = Depends(get_current_user)):
    """Decrement the game clock by 1 second"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if not game.get("clock_running"):
        return {"message": "Clock not running", "clock_time": game.get("clock_time", 0)}
    
    current_time = game.get("clock_time", 0)
    new_time = max(0, current_time - 1)  # Don't go below 0
    
    await db.games.update_one(
        {"id": game_id, "user_id": user.user_id},
        {"$set": {"clock_time": new_time}}
    )
    
    return {"clock_time": new_time}


@api_router.post("/games/{game_id}/clock/next-period")
async def next_period(game_id: str, reset_fouls: bool = False, user: User = Depends(get_current_user)):
    """Advance to next period and reset clock, optionally reset team fouls"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
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
    
    update_data = {
        "current_quarter": new_quarter,
        "clock_time": period_duration,
        "clock_running": False,
        "is_halftime": False,
        "quarter_scores.home": home_scores,
        "quarter_scores.away": away_scores,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Reset team fouls if requested
    if reset_fouls:
        update_data["home_team_fouls"] = 0
        update_data["away_team_fouls"] = 0
    
    await db.games.update_one(
        {"id": game_id, "user_id": user.user_id},
        {"$set": update_data}
    )
    
    return {"message": f"Advanced to period {new_quarter}", "current_quarter": new_quarter, "fouls_reset": reset_fouls}

@api_router.post("/games/{game_id}/clock/halftime")
async def go_to_halftime(game_id: str, user: User = Depends(get_current_user)):
    """Set game to halftime"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
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

@api_router.post("/games/{game_id}/clock/exit-halftime")
async def exit_halftime(game_id: str, next_quarter: int, user: User = Depends(get_current_user)):
    """Exit halftime and move to specified quarter"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    await db.games.update_one(
        {"id": game_id, "user_id": user.user_id},
        {"$set": {
            "is_halftime": False,
            "current_quarter": next_quarter,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": f"Moved to quarter {next_quarter}"}

# Timeout Endpoint
class TimeoutRequest(BaseModel):
    team: str  # "home" or "away"
    timeout_type: str  # "full" or "partial"

@api_router.post("/games/{game_id}/timeout")
async def use_timeout(game_id: str, timeout_data: TimeoutRequest, user: User = Depends(get_current_user)):
    """Use a timeout for a team"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Determine which team and check if they have timeouts remaining
    if timeout_data.team == "home":
        timeouts_used = game.get("home_timeouts_used", 0)
        timeout_key = "home_timeouts_used"
        team_name = game["home_team_name"]
    else:
        timeouts_used = game.get("away_timeouts_used", 0)
        timeout_key = "away_timeouts_used"
        team_name = game["away_team_name"]
    
    total_timeouts = game.get("total_timeouts", 4)
    
    if timeouts_used >= total_timeouts:
        raise HTTPException(status_code=400, detail="No timeouts remaining")
    
    # Increment timeouts used
    new_timeouts_used = timeouts_used + 1
    
    # Stop clock if running
    if game.get("clock_running"):
        await stop_clock(game_id, user)
    
    # Calculate current scores
    home_score = sum(game.get("quarter_scores", {}).get("home", [0, 0, 0, 0]))
    away_score = sum(game.get("quarter_scores", {}).get("away", [0, 0, 0, 0]))
    
    # Add to play-by-play
    timeout_type_display = "Full" if timeout_data.timeout_type == "full" else "Partial"
    play_entry = {
        "id": str(uuid.uuid4()),
        "quarter": game.get("current_quarter", 1),
        "team": timeout_data.team,
        "player_name": "TIMEOUT",
        "player_number": "",
        "action": f"{team_name} Timeout - {timeout_type_display}",
        "points": 0,
        "home_score": home_score,
        "away_score": away_score
    }
    
    await db.games.update_one(
        {"id": game_id, "user_id": user.user_id},
        {
            "$set": {
                timeout_key: new_timeouts_used,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"play_by_play": play_entry}
        }
    )
    
    return {
        "message": "Timeout used",
        "team": timeout_data.team,
        "timeouts_remaining": total_timeouts - new_timeouts_used
    }

# Player On-Floor (Substitution) Endpoints
@api_router.post("/games/{game_id}/players/{player_id}/check-in")
async def player_check_in(game_id: str, player_id: str, user: User = Depends(get_current_user)):
    """Check a player into the game (put them on the floor)"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    player_stat = await db.player_stats.find_one({"id": player_id, "game_id": game_id}, {"_id": 0})
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
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    player_stat = await db.player_stats.find_one({"id": player_id, "game_id": game_id}, {"_id": 0})
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

# Game Note Endpoint
class GameNoteUpdate(BaseModel):
    note: Optional[str] = None

@api_router.put("/games/{game_id}/note")
async def update_game_note(game_id: str, note_data: GameNoteUpdate, user: User = Depends(get_current_user)):
    """Update the game note"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    await db.games.update_one(
        {"id": game_id, "user_id": user.user_id},
        {"$set": {"note": note_data.note, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Note updated", "note": note_data.note}

# ============ EVENT/TOURNAMENT ENDPOINTS ============

@api_router.get("/events")
async def get_events(sport: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get all events for the current user"""
    query = {"user_id": user.user_id}
    if sport:
        query["sport"] = sport
    events = await db.events.find(query, {"_id": 0}).to_list(100)
    return events

@api_router.get("/events/{event_id}")
async def get_event(event_id: str, user: User = Depends(get_current_user)):
    """Get a single event with its games"""
    event = await db.events.find_one({"id": event_id, "user_id": user.user_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Get all games for this event using batch query (optimized)
    game_ids = event.get("game_ids", [])
    games = await db.games.find({"id": {"$in": game_ids}}, {"_id": 0}).to_list(None) if game_ids else []
    
    # Sort games by date and time (earliest first)
    games.sort(key=lambda g: (g.get("scheduled_date") or "9999-12-31", g.get("scheduled_time") or "23:59"))
    
    return {**event, "games": games}

@api_router.get("/events/{event_id}/public")
async def get_event_public(event_id: str):
    """Get event info and games for public display (ticker)"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Get all games for this event with their scores and recaps (batch query optimized)
    game_ids = event.get("game_ids", [])
    raw_games = await db.games.find({"id": {"$in": game_ids}}, {"_id": 0}).to_list(None) if game_ids else []
    
    games = []
    for game in raw_games:
            # Calculate scores
            home_score = sum(game.get("quarter_scores", {}).get("home", [0, 0, 0, 0]))
            away_score = sum(game.get("quarter_scores", {}).get("away", [0, 0, 0, 0]))
            
            # Calculate leading scorers from player stats
            home_leader = None
            away_leader = None
            home_stats = game.get("home_player_stats", [])
            away_stats = game.get("away_player_stats", [])
            
            if home_stats:
                home_sorted = sorted(home_stats, key=lambda p: p.get("ft_made", 0) + p.get("fg2_made", 0) * 2 + p.get("fg3_made", 0) * 3, reverse=True)
                if home_sorted:
                    p = home_sorted[0]
                    pts = p.get("ft_made", 0) + p.get("fg2_made", 0) * 2 + p.get("fg3_made", 0) * 3
                    if pts > 0:
                        home_leader = {"name": p.get("player_name", ""), "points": pts}
            
            if away_stats:
                away_sorted = sorted(away_stats, key=lambda p: p.get("ft_made", 0) + p.get("fg2_made", 0) * 2 + p.get("fg3_made", 0) * 3, reverse=True)
                if away_sorted:
                    p = away_sorted[0]
                    pts = p.get("ft_made", 0) + p.get("fg2_made", 0) * 2 + p.get("fg3_made", 0) * 3
                    if pts > 0:
                        away_leader = {"name": p.get("player_name", ""), "points": pts}
            
            # Generate quick recap from play-by-play
            recap = None
            play_by_play = game.get("play_by_play", [])
            if play_by_play and game.get("status") != "scheduled":
                # Analyze runs - find largest scoring run
                quarter_scores = game.get("quarter_scores", {"home": [0,0,0,0], "away": [0,0,0,0]})
                home_qs = quarter_scores.get("home", [0,0,0,0])
                away_qs = quarter_scores.get("away", [0,0,0,0])
                
                # Find best quarter differential
                best_q = 0
                best_diff = 0
                best_team = ""
                for q in range(min(len(home_qs), len(away_qs))):
                    diff = home_qs[q] - away_qs[q]
                    if abs(diff) > abs(best_diff):
                        best_diff = diff
                        best_q = q + 1
                        best_team = game["home_team_name"] if diff > 0 else game["away_team_name"]
                
                if abs(best_diff) >= 8:
                    recap = f"{best_team} dominated Q{best_q} by {abs(best_diff)} points"
                elif abs(home_score - away_score) <= 5 and game.get("status") == "active":
                    recap = "Close game! Back and forth action"
                elif home_score > away_score + 15:
                    recap = f"{game['home_team_name']} in control"
                elif away_score > home_score + 15:
                    recap = f"{game['away_team_name']} in control"
            
            games.append({
                "id": game["id"],
                "home_team_name": game["home_team_name"],
                "away_team_name": game["away_team_name"],
                "home_score": home_score,
                "away_score": away_score,
                "status": game["status"],
                "scheduled_date": game.get("scheduled_date"),
                "scheduled_time": game.get("scheduled_time"),
                "share_code": game.get("share_code"),
                "current_quarter": game.get("current_quarter", 1),
                "is_halftime": game.get("is_halftime", False),
                "home_leader": home_leader,
                "away_leader": away_leader,
                "recap": recap
            })
    
    # Sort games by date and time (earliest first)
    games.sort(key=lambda g: (g.get("scheduled_date") or "9999-12-31", g.get("scheduled_time") or "23:59"))
    
    return {
        "id": event["id"],
        "name": event["name"],
        "location": event.get("location"),
        "logo_data": event.get("logo_data"),
        "color": event.get("color", "#000000"),
        "games": games
    }

@api_router.get("/events/{event_id}/current-game")
async def get_event_current_game(event_id: str):
    """Get the current/most relevant game for an event.
    Priority: 1) Active game, 2) Next upcoming scheduled game, 3) Most recent final game
    """
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Get all games for this event
    games = []
    for game_id in event.get("game_ids", []):
        game = await db.games.find_one({"id": game_id}, {"_id": 0})
        if game:
            games.append(game)
    
    if not games:
        raise HTTPException(status_code=404, detail="No games in this event")
    
    # 1. Check for active games first
    active_games = [g for g in games if g.get("status") == "active"]
    if active_games:
        # Return the first active game (could sort by start time if multiple)
        return {"share_code": active_games[0].get("share_code"), "game_id": active_games[0].get("id")}
    
    # 2. Check for upcoming scheduled games (sorted by date/time)
    scheduled_games = [g for g in games if g.get("status") == "scheduled"]
    if scheduled_games:
        # Sort by date and time to get the next upcoming game
        scheduled_games.sort(key=lambda g: (g.get("scheduled_date") or "9999-12-31", g.get("scheduled_time") or "23:59"))
        return {"share_code": scheduled_games[0].get("share_code"), "game_id": scheduled_games[0].get("id")}
    
    # 3. Show the most recent final game (sorted by date/time descending)
    final_games = [g for g in games if g.get("status") == "final"]
    if final_games:
        # Sort by date and time descending to get most recent
        final_games.sort(key=lambda g: (g.get("scheduled_date") or "0000-01-01", g.get("scheduled_time") or "00:00"), reverse=True)
        return {"share_code": final_games[0].get("share_code"), "game_id": final_games[0].get("id")}
    
    # Fallback: return the first game
    return {"share_code": games[0].get("share_code"), "game_id": games[0].get("id")}

@api_router.post("/events")
async def create_event(event_data: EventCreate, user: User = Depends(get_current_user)):
    """Create a new event"""
    event = Event(
        name=event_data.name,
        location=event_data.location,
        start_date=event_data.start_date,
        end_date=event_data.end_date or event_data.start_date,
        logo_data=event_data.logo_data,
        color=event_data.color
    )
    event.user_id = user.user_id
    
    doc = event.model_dump()
    await db.events.insert_one(doc)
    return event

@api_router.put("/events/{event_id}")
async def update_event(event_id: str, event_data: EventCreate, user: User = Depends(get_current_user)):
    """Update an event"""
    event = await db.events.find_one({"id": event_id, "user_id": user.user_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    await db.events.update_one(
        {"id": event_id, "user_id": user.user_id},
        {"$set": {
            "name": event_data.name,
            "location": event_data.location,
            "start_date": event_data.start_date,
            "end_date": event_data.end_date or event_data.start_date,
            "logo_data": event_data.logo_data,
            "color": event_data.color,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Event updated"}

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, user: User = Depends(get_current_user)):
    """Delete an event (does not delete the games, just removes them from event)"""
    event = await db.events.find_one({"id": event_id, "user_id": user.user_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Remove event_id from all games in this event
    for game_id in event.get("game_ids", []):
        await db.games.update_one(
            {"id": game_id},
            {"$set": {"event_id": None}}
        )
    
    await db.events.delete_one({"id": event_id, "user_id": user.user_id})
    return {"message": "Event deleted"}

@api_router.post("/events/{event_id}/games/{game_id}")
async def add_game_to_event(event_id: str, game_id: str, user: User = Depends(get_current_user)):
    """Add a game to an event"""
    event = await db.events.find_one({"id": event_id, "user_id": user.user_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Add game to event if not already there
    if game_id not in event.get("game_ids", []):
        await db.events.update_one(
            {"id": event_id, "user_id": user.user_id},
            {"$push": {"game_ids": game_id}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    # Update game with event_id
    await db.games.update_one(
        {"id": game_id},
        {"$set": {"event_id": event_id}}
    )
    
    return {"message": "Game added to event"}

@api_router.delete("/events/{event_id}/games/{game_id}")
async def remove_game_from_event(event_id: str, game_id: str, user: User = Depends(get_current_user)):
    """Remove a game from an event (does not delete the game)"""
    event = await db.events.find_one({"id": event_id, "user_id": user.user_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Remove game from event
    await db.events.update_one(
        {"id": event_id, "user_id": user.user_id},
        {"$pull": {"game_ids": game_id}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Remove event_id from game
    await db.games.update_one(
        {"id": game_id},
        {"$set": {"event_id": None}}
    )
    
    return {"message": "Game removed from event"}

# Bonus endpoint
class BonusUpdate(BaseModel):
    team: str  # "home" or "away"
    bonus_status: Optional[str] = None  # null, "bonus", or "double_bonus"

@api_router.post("/games/{game_id}/bonus")
async def update_bonus(game_id: str, bonus_data: BonusUpdate, user: User = Depends(get_current_user)):
    """Update bonus status for a team"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    field = "home_bonus" if bonus_data.team == "home" else "away_bonus"
    
    await db.games.update_one(
        {"id": game_id, "user_id": user.user_id},
        {"$set": {field: bonus_data.bonus_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Bonus updated", "team": bonus_data.team, "status": bonus_data.bonus_status}


class PossessionUpdate(BaseModel):
    possession: str  # "home" or "away"


@api_router.post("/games/{game_id}/possession")
async def update_possession(game_id: str, data: PossessionUpdate, user: User = Depends(get_current_user)):
    """Update possession for advanced mode"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if data.possession not in ["home", "away"]:
        raise HTTPException(status_code=400, detail="Possession must be 'home' or 'away'")
    
    await db.games.update_one(
        {"id": game_id, "user_id": user.user_id},
        {"$set": {"possession": data.possession, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Possession updated", "possession": data.possession}


# ============ SPONSOR BANNER ENDPOINTS ============

class SponsorBannerCreate(BaseModel):
    image_data: str  # Base64 encoded image
    filename: str
    link_url: Optional[str] = None  # Optional clickable link URL

@api_router.get("/sponsor-banners")
async def get_sponsor_banners(user: User = Depends(get_current_user)):
    """Get all sponsor banners for the user"""
    banners = await db.sponsor_banners.find({"user_id": user.user_id}, {"_id": 0}).sort("order", 1).to_list(50)
    return banners

@api_router.get("/sponsor-banners/public/{user_id}")
async def get_public_sponsor_banners(user_id: str):
    """Get sponsor banners for public display (no auth required)"""
    banners = await db.sponsor_banners.find({"user_id": user_id}, {"_id": 0}).sort("order", 1).to_list(50)
    return banners

@api_router.post("/sponsor-banners")
async def create_sponsor_banner(banner_data: SponsorBannerCreate, user: User = Depends(get_current_user)):
    """Upload a new sponsor banner"""
    # Get current banner count for ordering
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

class SponsorBannerUpdate(BaseModel):
    link_url: Optional[str] = None

@api_router.put("/sponsor-banners/{banner_id}")
async def update_sponsor_banner(banner_id: str, banner_data: SponsorBannerUpdate, user: User = Depends(get_current_user)):
    """Update a sponsor banner's link URL"""
    result = await db.sponsor_banners.update_one(
        {"id": banner_id, "user_id": user.user_id},
        {"$set": {"link_url": banner_data.link_url}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    return {"message": "Banner updated", "link_url": banner_data.link_url}

@api_router.delete("/sponsor-banners/{banner_id}")
async def delete_sponsor_banner(banner_id: str, user: User = Depends(get_current_user)):
    """Delete a sponsor banner"""
    result = await db.sponsor_banners.delete_one({"id": banner_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    return {"message": "Banner deleted"}

@api_router.put("/sponsor-banners/reorder")
async def reorder_sponsor_banners(banner_ids: List[str], user: User = Depends(get_current_user)):
    """Reorder sponsor banners"""
    for i, banner_id in enumerate(banner_ids):
        await db.sponsor_banners.update_one(
            {"id": banner_id, "user_id": user.user_id},
            {"$set": {"order": i}}
        )
    return {"message": "Banners reordered"}

class PlayerUpdate(BaseModel):
    player_number: Optional[str] = None
    player_name: Optional[str] = None

@api_router.put("/games/{game_id}/players/{player_id}")
async def update_player(game_id: str, player_id: str, update: PlayerUpdate, user: User = Depends(get_current_user)):
    """Update a player's number or name"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    player_stat = await db.player_stats.find_one({"id": player_id, "game_id": game_id}, {"_id": 0})
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
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    player_stat = await db.player_stats.find_one({"id": stat.player_id}, {"_id": 0})
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
            "player_id": stat.player_id,
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
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
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

@api_router.delete("/games/{game_id}/players/{player_id}")
async def remove_player_from_game(game_id: str, player_id: str, user: User = Depends(get_current_user)):
    """Remove a player from a game"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    player = await db.player_stats.find_one({"id": player_id, "game_id": game_id}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Remove player from on-floor lists if present
    home_on_floor = game.get("home_on_floor", [])
    away_on_floor = game.get("away_on_floor", [])
    
    if player_id in home_on_floor:
        home_on_floor.remove(player_id)
        await db.games.update_one({"id": game_id}, {"$set": {"home_on_floor": home_on_floor}})
    if player_id in away_on_floor:
        away_on_floor.remove(player_id)
        await db.games.update_one({"id": game_id}, {"$set": {"away_on_floor": away_on_floor}})
    
    # Delete the player stats
    await db.player_stats.delete_one({"id": player_id, "game_id": game_id})
    
    return {"message": "Player removed"}

# Play-by-play entry management
class PlayByPlayUpdate(BaseModel):
    player_id: str
    player_number: str
    player_name: str
    action: str

@api_router.delete("/games/{game_id}/play-by-play/{play_id}")
async def delete_play_by_play_entry(game_id: str, play_id: str, user: User = Depends(get_current_user)):
    """Delete a play-by-play entry and reverse the stats"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    play_by_play = game.get("play_by_play", [])
    
    # Find the play entry
    play_entry = None
    play_index = -1
    for i, play in enumerate(play_by_play):
        if play.get("id") == play_id:
            play_entry = play
            play_index = i
            break
    
    if not play_entry:
        raise HTTPException(status_code=404, detail="Play not found")
    
    # Reverse the stat if it's a scoring play
    action = play_entry.get("action", "")
    points = play_entry.get("points", 0)
    team = play_entry.get("team", "")
    quarter = play_entry.get("quarter", 1)
    
    # Find the player by number and name to reverse stats
    player_number = play_entry.get("player_number")
    player_name = play_entry.get("player_name")
    
    # Find player stats by matching player_number and player_name
    team_id = game["home_team_id"] if team == "home" else game["away_team_id"]
    player_stat = await db.player_stats.find_one({
        "game_id": game_id,
        "team_id": team_id,
        "player_number": player_number,
        "player_name": player_name
    }, {"_id": 0})
    
    # Reverse the stat on the player (if not a team stat)
    if player_stat and player_number != "TEAM":
        stat_reversal_map = {
            "FT Made": ("ft_made", -1),
            "FT Missed": ("ft_missed", -1),
            "2PT Made": ("fg2_made", -1),
            "2PT Missed": ("fg2_missed", -1),
            "3PT Made": ("fg3_made", -1),
            "3PT Missed": ("fg3_missed", -1),
            "Assist": ("assists", -1),
            "Off. Rebound": ("offensive_rebounds", -1),
            "Def. Rebound": ("defensive_rebounds", -1),
            "Turnover": ("turnovers", -1),
            "Steal": ("steals", -1),
            "Block": ("blocks", -1),
            "Foul": ("fouls", -1)
        }
        
        if action in stat_reversal_map:
            field, increment = stat_reversal_map[action]
            current_value = player_stat.get(field, 0)
            new_value = max(0, current_value + increment)
            await db.player_stats.update_one(
                {"id": player_stat["id"]},
                {"$set": {field: new_value}}
            )
    
    # Reverse quarter score if it was a scoring play
    if points != 0:
        quarter_scores = game.get("quarter_scores", {"home": [0,0,0,0], "away": [0,0,0,0]})
        quarter_idx = quarter - 1
        if quarter_idx < len(quarter_scores[team]):
            quarter_scores[team][quarter_idx] = max(0, quarter_scores[team][quarter_idx] - points)
    else:
        quarter_scores = game.get("quarter_scores", {"home": [0,0,0,0], "away": [0,0,0,0]})
    
    # Remove the play from play-by-play
    play_by_play.pop(play_index)
    
    # Recalculate scores for remaining plays after the deleted one
    for i in range(play_index, len(play_by_play)):
        play_by_play[i]["home_score"] = sum(quarter_scores["home"])
        play_by_play[i]["away_score"] = sum(quarter_scores["away"])
    
    await db.games.update_one(
        {"id": game_id},
        {"$set": {
            "play_by_play": play_by_play,
            "quarter_scores": quarter_scores,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Play deleted"}

@api_router.put("/games/{game_id}/play-by-play/{play_id}")
async def update_play_by_play_entry(game_id: str, play_id: str, update: PlayByPlayUpdate, user: User = Depends(get_current_user)):
    """Update a play-by-play entry (change player or action)"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    play_by_play = game.get("play_by_play", [])
    
    # Find the play entry
    play_entry = None
    play_index = -1
    for i, play in enumerate(play_by_play):
        if play.get("id") == play_id:
            play_entry = play
            play_index = i
            break
    
    if not play_entry:
        raise HTTPException(status_code=404, detail="Play not found")
    
    old_action = play_entry.get("action", "")
    old_points = play_entry.get("points", 0)
    old_player_number = play_entry.get("player_number")
    old_player_name = play_entry.get("player_name")
    team = play_entry.get("team")
    quarter = play_entry.get("quarter", 1)
    team_id = game["home_team_id"] if team == "home" else game["away_team_id"]
    
    # Get old and new player stats
    old_player = await db.player_stats.find_one({
        "game_id": game_id,
        "team_id": team_id,
        "player_number": old_player_number,
        "player_name": old_player_name
    }, {"_id": 0})
    
    new_player = await db.player_stats.find_one({"id": update.player_id, "game_id": game_id}, {"_id": 0})
    
    # Stat field mappings
    action_to_field = {
        "FT Made": "ft_made",
        "FT Missed": "ft_missed",
        "2PT Made": "fg2_made",
        "2PT Missed": "fg2_missed",
        "3PT Made": "fg3_made",
        "3PT Missed": "fg3_missed",
        "Assist": "assists",
        "Off. Rebound": "offensive_rebounds",
        "Def. Rebound": "defensive_rebounds",
        "Turnover": "turnovers",
        "Steal": "steals",
        "Block": "blocks",
        "Foul": "fouls"
    }
    
    action_to_points = {
        "FT Made": 1,
        "2PT Made": 2,
        "3PT Made": 3
    }
    
    # Calculate new points
    new_points = action_to_points.get(update.action, 0)
    
    # Reverse old player stat if not team stat
    if old_player and old_player_number != "TEAM" and old_action in action_to_field:
        field = action_to_field[old_action]
        current_value = old_player.get(field, 0)
        await db.player_stats.update_one(
            {"id": old_player["id"]},
            {"$set": {field: max(0, current_value - 1)}}
        )
    
    # Apply new player stat if not team stat
    if new_player and update.player_number != "TEAM" and update.action in action_to_field:
        field = action_to_field[update.action]
        current_value = new_player.get(field, 0)
        await db.player_stats.update_one(
            {"id": new_player["id"]},
            {"$set": {field: current_value + 1}}
        )
    
    # Update quarter scores if points changed
    quarter_scores = game.get("quarter_scores", {"home": [0,0,0,0], "away": [0,0,0,0]})
    quarter_idx = quarter - 1
    
    if old_points != new_points:
        if quarter_idx < len(quarter_scores[team]):
            quarter_scores[team][quarter_idx] = max(0, quarter_scores[team][quarter_idx] - old_points + new_points)
    
    # Update the play entry
    play_by_play[play_index]["player_id"] = update.player_id
    play_by_play[play_index]["player_number"] = update.player_number
    play_by_play[play_index]["player_name"] = update.player_name
    play_by_play[play_index]["action"] = update.action
    play_by_play[play_index]["points"] = new_points
    
    # Recalculate running scores
    home_score = sum(quarter_scores["home"])
    away_score = sum(quarter_scores["away"])
    play_by_play[play_index]["home_score"] = home_score
    play_by_play[play_index]["away_score"] = away_score
    
    await db.games.update_one(
        {"id": game_id},
        {"$set": {
            "play_by_play": play_by_play,
            "quarter_scores": quarter_scores,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Play updated"}

# Team stats endpoint (for team rebounds/turnovers that don't affect individual players)
class TeamStatUpdate(BaseModel):
    team: str  # "home" or "away"
    stat_type: str  # "oreb", "dreb", "turnover"

@api_router.post("/games/{game_id}/team-stats")
async def record_team_stat(game_id: str, stat: TeamStatUpdate, user: User = Depends(get_current_user)):
    """Record a team stat (rebound or turnover) without affecting individual player stats"""
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Initialize team_stats if not present
    team_stats = game.get("team_stats", {
        "home": {"oreb": 0, "dreb": 0, "turnovers": 0},
        "away": {"oreb": 0, "dreb": 0, "turnovers": 0}
    })
    
    stat_map = {
        "oreb": "oreb",
        "dreb": "dreb",
        "turnover": "turnovers"
    }
    
    field = stat_map.get(stat.stat_type)
    if not field:
        raise HTTPException(status_code=400, detail="Invalid stat type")
    
    team_stats[stat.team][field] = team_stats[stat.team].get(field, 0) + 1
    
    # Add to play-by-play
    action_labels = {
        "oreb": "Team Off. Rebound",
        "dreb": "Team Def. Rebound",
        "turnover": "Team Turnover"
    }
    
    quarter_scores = game.get("quarter_scores", {"home": [0,0,0,0], "away": [0,0,0,0]})
    home_score = sum(quarter_scores["home"])
    away_score = sum(quarter_scores["away"])
    
    play_by_play = game.get("play_by_play", [])
    entry = {
        "id": str(uuid.uuid4()),
        "quarter": game["current_quarter"],
        "team": stat.team,
        "player_name": "TEAM",
        "player_number": "TEAM",
        "action": action_labels.get(stat.stat_type, stat.stat_type),
        "points": 0,
        "home_score": home_score,
        "away_score": away_score
    }
    play_by_play.append(entry)
    
    await db.games.update_one(
        {"id": game_id},
        {"$set": {
            "team_stats": team_stats,
            "play_by_play": play_by_play,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Team stat recorded", "team_stats": team_stats}

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
    """Generate a simple college-style box score PDF - fits on portrait letter paper"""
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
    # Portrait letter: 8.5 x 11 inches, with tight margins to fit content
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.3*inch, bottomMargin=0.3*inch, leftMargin=0.3*inch, rightMargin=0.3*inch)
    elements = []
    
    # Game Title at the top
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('GameTitle', parent=styles['Heading1'], fontSize=12, alignment=1, spaceAfter=8)
    
    game_title = f"{game['home_team_name']} vs {game['away_team_name']}"
    if game.get('note'):
        game_title += f" - {game['note']}"
    
    elements.append(Paragraph(f"<b>{game_title}</b>", title_style))
    
    # Check if clock was enabled for this game
    clock_enabled = game.get("clock_enabled", False)
    
    # Compact column headers - abbreviated for portrait fit
    if clock_enabled:
        headers = ["PLAYER", "MIN", "FG", "FGA", "3P", "3PA", "FT", "FTA", "OR", "DR", "REB", "AST", "PF", "STL", "TO", "BLK", "PTS"]
    else:
        headers = ["PLAYER", "FG", "FGA", "3P", "3PA", "FT", "FTA", "OR", "DR", "REB", "AST", "PF", "STL", "TO", "BLK", "PTS"]
    
    def format_minutes(seconds):
        """Format seconds as MM:SS"""
        mins = seconds // 60
        secs = seconds % 60
        return f"{mins}:{secs:02d}"
    
    def create_team_table(team_name: str, team_label: str, stats_list: list, team_totals: dict):
        """Create a compact team box score table for portrait letter paper"""
        # Sort players by jersey number
        sorted_stats = sorted(stats_list, key=lambda x: int(x.get("player_number", "0")) if x.get("player_number", "0").isdigit() else 0)
        
        # Team header row
        num_cols = 17 if clock_enabled else 16
        data = [[f"{team_label}: {team_name}"] + [""] * (num_cols - 1)]
        # Column headers
        data.append(headers)
        
        # Player rows - compact format: "#Name" (no space to save width)
        total_team_seconds = 0
        for s in sorted_stats:
            totals = calculate_player_totals(s)
            # Truncate long names to fit
            name = s['player_name'][:12] if len(s['player_name']) > 12 else s['player_name']
            player_label = f"{s['player_number']} {name}"
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
                "TOTALS",
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
                "TOTALS",
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
        
        # Shooting percentages row
        if clock_enabled:
            data.append([
                f"FG: {team_totals['fg_pct']}%  3PT: {team_totals['fg3_pct']}%  FT: {team_totals['ft_pct']}%",
                "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""
            ])
            # Compact column widths for portrait - total ~7.9 inches (letter width - margins)
            col_widths = [1.15*inch, 0.32*inch, 0.26*inch, 0.26*inch, 0.26*inch, 0.26*inch, 0.26*inch, 0.26*inch, 0.26*inch, 0.26*inch, 0.28*inch, 0.28*inch, 0.26*inch, 0.26*inch, 0.26*inch, 0.26*inch, 0.30*inch]
        else:
            data.append([
                f"FG: {team_totals['fg_pct']}%  3PT: {team_totals['fg3_pct']}%  FT: {team_totals['ft_pct']}%",
                "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""
            ])
            # Compact column widths for portrait without MIN column
            col_widths = [1.25*inch, 0.28*inch, 0.28*inch, 0.28*inch, 0.28*inch, 0.28*inch, 0.28*inch, 0.28*inch, 0.28*inch, 0.30*inch, 0.30*inch, 0.28*inch, 0.28*inch, 0.28*inch, 0.28*inch, 0.32*inch]
        
        table = Table(data, colWidths=col_widths)
        
        num_rows = len(data)
        
        table.setStyle(TableStyle([
            # Team header row - span all columns
            ('SPAN', (0, 0), (-1, 0)),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
            ('TOPPADDING', (0, 0), (-1, 0), 4),
            ('LINEBELOW', (0, 0), (-1, 0), 1, colors.black),
            ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.9, 0.9, 0.9)),
            
            # Column headers
            ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 1), (-1, 1), 7),
            ('LINEBELOW', (0, 1), (-1, 1), 0.5, colors.black),
            
            # Player rows - smaller font for compactness
            ('FONTNAME', (0, 2), (0, num_rows-3), 'Helvetica'),
            ('FONTSIZE', (0, 2), (-1, num_rows-3), 7),
            ('ALIGN', (1, 1), (-1, -1), 'CENTER'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            
            # Totals row
            ('LINEABOVE', (0, num_rows-2), (-1, num_rows-2), 1, colors.black),
            ('FONTNAME', (0, num_rows-2), (-1, num_rows-2), 'Helvetica-Bold'),
            ('FONTSIZE', (0, num_rows-2), (-1, num_rows-2), 7),
            
            # Percentage row - span all columns
            ('SPAN', (0, num_rows-1), (-1, num_rows-1)),
            ('FONTSIZE', (0, num_rows-1), (-1, num_rows-1), 7),
            ('ALIGN', (0, num_rows-1), (-1, num_rows-1), 'LEFT'),
            
            # Tight padding for compactness
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 2),
            ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ]))
        
        return table
    
    # Calculate final scores
    q_scores = game.get("quarter_scores", {"home": [0,0,0,0], "away": [0,0,0,0]})
    home_scores = q_scores.get("home", [0,0,0,0])
    away_scores = q_scores.get("away", [0,0,0,0])
    total_quarters = max(4, len(home_scores), len(away_scores))
    
    # Pad scores arrays if needed
    while len(home_scores) < total_quarters:
        home_scores.append(0)
    while len(away_scores) < total_quarters:
        away_scores.append(0)
    
    home_total = sum(home_scores)
    away_total = sum(away_scores)
    
    # Quarter-by-Quarter Score Table - compact
    def get_quarter_label(q):
        label = game.get("period_label", "Quarter")
        prefix = "P" if label == "Period" else "Q"
        if q <= 4:
            return f"{prefix}{q}"
        return f"OT{q-4}"
    
    quarter_headers = ["TEAM"] + [get_quarter_label(i+1) for i in range(total_quarters)] + ["T"]
    quarter_data = [
        quarter_headers,
        [game['away_team_name'][:20]] + away_scores + [away_total],
        [game['home_team_name'][:20]] + home_scores + [home_total]
    ]
    
    q_col_widths = [1.4*inch] + [0.35*inch] * total_quarters + [0.4*inch]
    quarter_table = Table(quarter_data, colWidths=q_col_widths)
    quarter_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.black),
        ('LINEBELOW', (0, -1), (-1, -1), 0.5, colors.black),
        ('FONTNAME', (-1, 1), (-1, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    
    elements.append(quarter_table)
    elements.append(Spacer(1, 10))
    
    # Away team (VISITOR) first
    away_table = create_team_table(game['away_team_name'], "VISITOR", away_stats, away_totals)
    elements.append(away_table)
    elements.append(Spacer(1, 12))
    
    # Home team
    home_table = create_team_table(game['home_team_name'], "HOME", home_stats, home_totals)
    elements.append(home_table)
    elements.append(Spacer(1, 10))
    
    # Game Flow Stats - compact single line
    flow_style = ParagraphStyle('Flow', parent=styles['Normal'], fontSize=8, spaceAfter=2)
    elements.append(Paragraph(f"<b>GAME FLOW:</b> Lead Changes: {lead_changes} | Times Tied: {ties} | {game['home_team_name'][:10]} Largest Lead: {home_largest_lead} | {game['away_team_name'][:10]} Largest Lead: {away_largest_lead}", flow_style))
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"boxscore_{game['home_team_name']}_vs_{game['away_team_name']}.pdf".replace(" ", "_")
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# Public basketball PDF endpoint for LiveView (no auth required)
@api_router.get("/games/{game_id}/boxscore/public-pdf")
async def generate_public_boxscore_pdf(game_id: str):
    """Generate a simple college-style box score PDF - PUBLIC endpoint for LiveView"""
    game = await db.games.find_one({"id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    player_stats = await db.player_stats.find({"game_id": game_id}, {"_id": 0}).to_list(100)
    home_stats = [s for s in player_stats if s["team_id"] == game["home_team_id"]]
    away_stats = [s for s in player_stats if s["team_id"] == game["away_team_id"]]
    
    home_totals = calculate_team_totals(home_stats)
    away_totals = calculate_team_totals(away_stats)
    
    # Get game flow stats
    game_flow = game.get("game_flow", {"plays": []})
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, 
                           leftMargin=0.4*inch, rightMargin=0.4*inch,
                           topMargin=0.4*inch, bottomMargin=0.4*inch)
    
    styles = getSampleStyleSheet()
    elements = []
    
    # Title
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=14, alignment=1, spaceAfter=6)
    elements.append(Paragraph(f"{game['away_team_name']} vs {game['home_team_name']}", title_style))
    
    # Game Info
    info_style = ParagraphStyle('Info', parent=styles['Normal'], fontSize=9, alignment=1, spaceAfter=8)
    game_date = game.get('scheduled_date', 'TBD')
    game_time = game.get('scheduled_time', '')
    status = game.get('status', 'Scheduled')
    quarter = game.get('quarter', 1)
    elements.append(Paragraph(f"Date: {game_date} {game_time} | Status: {status} | Quarter: {quarter}", info_style))
    
    # Score
    home_score = sum(game.get('home_quarter_scores', [0, 0, 0, 0]))
    away_score = sum(game.get('away_quarter_scores', [0, 0, 0, 0]))
    score_style = ParagraphStyle('Score', parent=styles['Heading2'], fontSize=12, alignment=1, spaceAfter=10)
    elements.append(Paragraph(f"SCORE: {game['away_team_name']} {away_score} - {game['home_team_name']} {home_score}", score_style))
    
    # Quarter scores table
    quarter_data = [['Team', 'Q1', 'Q2', 'Q3', 'Q4', 'Total']]
    home_qs = game.get('home_quarter_scores', [0, 0, 0, 0])
    away_qs = game.get('away_quarter_scores', [0, 0, 0, 0])
    quarter_data.append([game['away_team_name'][:12]] + [str(q) for q in away_qs] + [str(away_score)])
    quarter_data.append([game['home_team_name'][:12]] + [str(q) for q in home_qs] + [str(home_score)])
    
    quarter_table = Table(quarter_data, colWidths=[1.3*inch, 0.5*inch, 0.5*inch, 0.5*inch, 0.5*inch, 0.6*inch])
    quarter_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#333333')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    elements.append(quarter_table)
    elements.append(Spacer(1, 10))
    
    # Box score headers - compact column widths
    headers = ['#', 'Player', 'MIN', 'FG', '3PT', 'FT', 'OREB', 'DREB', 'REB', 'AST', 'STL', 'BLK', 'TO', 'PF', 'PTS']
    col_widths = [0.25*inch, 1.0*inch, 0.35*inch, 0.45*inch, 0.45*inch, 0.45*inch, 0.35*inch, 0.35*inch, 0.35*inch, 0.3*inch, 0.3*inch, 0.3*inch, 0.3*inch, 0.3*inch, 0.35*inch]
    
    def create_team_table(team_name, stats, totals):
        data = [[team_name.upper()] + [''] * 14]
        data.append(headers)
        
        sorted_stats = sorted(stats, key=lambda x: int(x.get('player_number', '0') or '0'))
        
        for p in sorted_stats:
            fg2_m, fg2_a = p.get('fg2_made', 0), p.get('fg2_made', 0) + p.get('fg2_missed', 0)
            fg3_m, fg3_a = p.get('fg3_made', 0), p.get('fg3_made', 0) + p.get('fg3_missed', 0)
            ft_m, ft_a = p.get('ft_made', 0), p.get('ft_made', 0) + p.get('ft_missed', 0)
            fg_m, fg_a = fg2_m + fg3_m, fg2_a + fg3_a
            oreb, dreb = p.get('oreb', 0), p.get('dreb', 0)
            pts = (fg2_m * 2) + (fg3_m * 3) + ft_m
            
            row = [
                p.get('player_number', ''),
                (p.get('player_name', '')[:10]),
                str(p.get('minutes', 0)),
                f"{fg_m}-{fg_a}",
                f"{fg3_m}-{fg3_a}",
                f"{ft_m}-{ft_a}",
                str(oreb),
                str(dreb),
                str(oreb + dreb),
                str(p.get('assist', 0)),
                str(p.get('steal', 0)),
                str(p.get('block', 0)),
                str(p.get('turnover', 0)),
                str(p.get('foul', 0)),
                str(pts)
            ]
            data.append(row)
        
        # Totals row
        totals_row = [
            '', 'TOTALS', '',
            f"{totals['fg_made']}-{totals['fg_att']}",
            f"{totals['fg3_made']}-{totals['fg3_att']}",
            f"{totals['ft_made']}-{totals['ft_att']}",
            str(totals['oreb']),
            str(totals['dreb']),
            str(totals['reb']),
            str(totals['ast']),
            str(totals['stl']),
            str(totals['blk']),
            str(totals['to']),
            str(totals['pf']),
            str(totals['pts'])
        ]
        data.append(totals_row)
        
        table = Table(data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a1a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('SPAN', (0, 0), (-1, 0)),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#333333')),
            ('TEXTCOLOR', (0, 1), (-1, 1), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (1, 2), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 1), 'Helvetica-Bold'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 7),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('GRID', (0, 1), (-1, -1), 0.5, colors.grey),
            ('LINEBELOW', (0, -1), (-1, -1), 1, colors.black),
        ]))
        return table
    
    # Away team box score
    elements.append(create_team_table(game['away_team_name'], away_stats, away_totals))
    elements.append(Spacer(1, 8))
    
    # Home team box score
    elements.append(create_team_table(game['home_team_name'], home_stats, home_totals))
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"boxscore_{game['home_team_name']}_vs_{game['away_team_name']}.pdf".replace(" ", "_")
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ============ BASKETBALL TEAM COMPARISON CSV ============

@api_router.get("/games/{game_id}/team-comparison/csv")
async def generate_team_comparison_csv(game_id: str):
    """Generate a live CSV of team stats comparison (public endpoint)
    Format: 3 rows - Home Total, Stat Title, Away Total
    """
    game = await db.games.find_one({"id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Fetch player stats
    player_stats = await db.player_stats.find({"game_id": game_id}, {"_id": 0}).to_list(100)
    home_stats = [s for s in player_stats if s["team_id"] == game["home_team_id"]]
    away_stats = [s for s in player_stats if s["team_id"] == game["away_team_id"]]
    
    # Calculate totals
    home_totals = calculate_team_totals(home_stats)
    away_totals = calculate_team_totals(away_stats)
    
    # Get quarter scores for points
    home_pts = sum(game.get('home_quarter_scores', [0, 0, 0, 0]))
    away_pts = sum(game.get('away_quarter_scores', [0, 0, 0, 0]))
    
    # Calculate largest leads (from game state if available)
    home_largest_lead = game.get('home_largest_lead', 0)
    away_largest_lead = game.get('away_largest_lead', 0)
    
    # Build CSV content
    # Row 1: Home team name as header, stats as values
    # Row 2: Stat titles
    # Row 3: Away team name as header, stats as values
    
    csv_buffer = io.StringIO()
    writer = csv.writer(csv_buffer)
    
    # Stat columns
    stat_titles = [
        "FG", "3PT", "FT", "REBOUNDS", "TURNOVERS", "LARGEST LEAD"
    ]
    
    # Home row values
    home_fg = f"{home_totals['fg_made']}/{home_totals['fg_att']}"
    home_3pt = f"{home_totals['fg3_made']}/{home_totals['fg3_att']}"
    home_ft = f"{home_totals['ft_made']}/{home_totals['ft_att']}"
    home_reb = str(home_totals['reb'])
    home_to = str(home_totals['to'])
    home_lead = str(home_largest_lead)
    
    # Away row values
    away_fg = f"{away_totals['fg_made']}/{away_totals['fg_att']}"
    away_3pt = f"{away_totals['fg3_made']}/{away_totals['fg3_att']}"
    away_ft = f"{away_totals['ft_made']}/{away_totals['ft_att']}"
    away_reb = str(away_totals['reb'])
    away_to = str(away_totals['to'])
    away_lead = str(away_largest_lead)
    
    # Write rows
    writer.writerow([game.get('home_team_name', 'Home')] + [home_fg, home_3pt, home_ft, home_reb, home_to, home_lead])
    writer.writerow(['Stat'] + stat_titles)
    writer.writerow([game.get('away_team_name', 'Away')] + [away_fg, away_3pt, away_ft, away_reb, away_to, away_lead])
    
    csv_content = csv_buffer.getvalue()
    csv_buffer.close()
    
    filename = f"team_comparison_{game.get('home_team_name', 'Home')}_vs_{game.get('away_team_name', 'Away')}.csv".replace(" ", "_")
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ============ FOOTBALL BOX SCORE PDF ============

@api_router.get("/games/{game_id}/football-boxscore/pdf")
async def generate_football_boxscore_pdf(game_id: str):
    """Generate a comprehensive football box score PDF (public endpoint)"""
    game = await db.games.find_one({"id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Get events/play log for this game
    events = await db.events.find({"game_id": game_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    
    # Calculate stats from events
    home_stats = {"rushing": {}, "passing": {}, "receiving": {}, "defense": {}, "returns": {}, "kicking": {}}
    away_stats = {"rushing": {}, "passing": {}, "receiving": {}, "defense": {}, "returns": {}, "kicking": {}}
    
    team_stats = {
        "home": {
            "first_downs": 0, "first_downs_rush": 0, "first_downs_pass": 0, "first_downs_penalty": 0,
            "rush_att": 0, "rush_yds": 0, "rush_td": 0,
            "pass_comp": 0, "pass_att": 0, "pass_yds": 0, "pass_td": 0, "pass_int": 0,
            "total_yds": 0, "penalties": 0, "penalty_yds": 0,
            "fumbles": 0, "fumbles_lost": 0,
            "punts": 0, "punt_yds": 0,
            "fg_made": 0, "fg_att": 0,
            "third_down_conv": 0, "third_down_att": 0,
            "fourth_down_conv": 0, "fourth_down_att": 0,
            "possession_time": 0,
            "sacks": 0, "sack_yds": 0,
        },
        "away": {
            "first_downs": 0, "first_downs_rush": 0, "first_downs_pass": 0, "first_downs_penalty": 0,
            "rush_att": 0, "rush_yds": 0, "rush_td": 0,
            "pass_comp": 0, "pass_att": 0, "pass_yds": 0, "pass_td": 0, "pass_int": 0,
            "total_yds": 0, "penalties": 0, "penalty_yds": 0,
            "fumbles": 0, "fumbles_lost": 0,
            "punts": 0, "punt_yds": 0,
            "fg_made": 0, "fg_att": 0,
            "third_down_conv": 0, "third_down_att": 0,
            "fourth_down_conv": 0, "fourth_down_att": 0,
            "possession_time": 0,
            "sacks": 0, "sack_yds": 0,
        }
    }
    
    quarter_scores = {"home": [0, 0, 0, 0], "away": [0, 0, 0, 0]}
    scoring_plays = []
    
    def get_player_key(team, player_num):
        return f"{team}_{player_num}"
    
    def init_player(stats_dict, category, key, default_stats):
        if key not in stats_dict[category]:
            stats_dict[category][key] = default_stats.copy()
    
    # Process events to calculate stats
    for event in events:
        team = event.get("team", "home")
        stats = home_stats if team == "home" else away_stats
        ts = team_stats[team]
        def_team = "away" if team == "home" else "home"
        def_stats = away_stats if team == "home" else home_stats
        
        event_type = event.get("event_type", "")
        result = event.get("result", "")
        yards = event.get("yards", 0) or 0
        quarter = event.get("quarter", 1)
        points = event.get("points", 0) or 0
        
        # Track scoring
        if points > 0 and 1 <= quarter <= 4:
            quarter_scores[team][quarter - 1] += points
            scoring_plays.append({
                "quarter": quarter,
                "time": event.get("timestamp", ""),
                "team": team,
                "description": event.get("description", ""),
                "score": f"{sum(quarter_scores['away'][:quarter])}-{sum(quarter_scores['home'][:quarter])}"
            })
        
        # Rushing stats
        if event_type == "run":
            ts["rush_att"] += 1
            ts["rush_yds"] += yards
            ts["total_yds"] += yards
            if result == "touchdown":
                ts["rush_td"] += 1
            if event.get("first_down"):
                ts["first_downs"] += 1
                ts["first_downs_rush"] += 1
            
            carrier = event.get("carrier")
            if carrier:
                key = get_player_key(team, carrier)
                init_player(stats, "rushing", key, {"num": carrier, "att": 0, "yds": 0, "td": 0, "lg": 0})
                stats["rushing"][key]["att"] += 1
                stats["rushing"][key]["yds"] += yards
                stats["rushing"][key]["lg"] = max(stats["rushing"][key]["lg"], yards)
                if result == "touchdown":
                    stats["rushing"][key]["td"] += 1
            
            # Tackler
            tackler = event.get("tackler")
            if tackler:
                key = get_player_key(def_team, tackler)
                init_player(def_stats, "defense", key, {"num": tackler, "tot": 0, "solo": 0, "ast": 0, "tfl": 0, "sack": 0, "int": 0, "pbu": 0})
                def_stats["defense"][key]["tot"] += 1
                def_stats["defense"][key]["solo"] += 1
        
        # Passing stats
        elif event_type == "pass":
            ts["pass_att"] += 1
            qb = event.get("qb")
            receiver = event.get("receiver")
            
            if result in ["complete", "touchdown"]:
                ts["pass_comp"] += 1
                ts["pass_yds"] += yards
                ts["total_yds"] += yards
                if result == "touchdown":
                    ts["pass_td"] += 1
                if event.get("first_down"):
                    ts["first_downs"] += 1
                    ts["first_downs_pass"] += 1
                
                # QB stats
                if qb:
                    key = get_player_key(team, qb)
                    init_player(stats, "passing", key, {"num": qb, "comp": 0, "att": 0, "yds": 0, "td": 0, "int": 0, "lg": 0})
                    stats["passing"][key]["comp"] += 1
                    stats["passing"][key]["att"] += 1
                    stats["passing"][key]["yds"] += yards
                    stats["passing"][key]["lg"] = max(stats["passing"][key]["lg"], yards)
                    if result == "touchdown":
                        stats["passing"][key]["td"] += 1
                
                # Receiver stats
                if receiver:
                    key = get_player_key(team, receiver)
                    init_player(stats, "receiving", key, {"num": receiver, "rec": 0, "yds": 0, "td": 0, "lg": 0})
                    stats["receiving"][key]["rec"] += 1
                    stats["receiving"][key]["yds"] += yards
                    stats["receiving"][key]["lg"] = max(stats["receiving"][key]["lg"], yards)
                    if result == "touchdown":
                        stats["receiving"][key]["td"] += 1
            
            elif result == "incomplete":
                if qb:
                    key = get_player_key(team, qb)
                    init_player(stats, "passing", key, {"num": qb, "comp": 0, "att": 0, "yds": 0, "td": 0, "int": 0, "lg": 0})
                    stats["passing"][key]["att"] += 1
            
            elif result == "intercepted":
                ts["pass_int"] += 1
                if qb:
                    key = get_player_key(team, qb)
                    init_player(stats, "passing", key, {"num": qb, "comp": 0, "att": 0, "yds": 0, "td": 0, "int": 0, "lg": 0})
                    stats["passing"][key]["att"] += 1
                    stats["passing"][key]["int"] += 1
                
                # Defender interception
                defender = event.get("defender")
                if defender:
                    key = get_player_key(def_team, defender)
                    init_player(def_stats, "defense", key, {"num": defender, "tot": 0, "solo": 0, "ast": 0, "tfl": 0, "sack": 0, "int": 0, "pbu": 0})
                    def_stats["defense"][key]["int"] += 1
            
            elif result == "sack":
                team_stats[def_team]["sacks"] += 1
                team_stats[def_team]["sack_yds"] += abs(yards)
                tackler = event.get("tackler")
                if tackler:
                    key = get_player_key(def_team, tackler)
                    init_player(def_stats, "defense", key, {"num": tackler, "tot": 0, "solo": 0, "ast": 0, "tfl": 0, "sack": 0, "int": 0, "pbu": 0})
                    def_stats["defense"][key]["sack"] += 1
                    def_stats["defense"][key]["tot"] += 1
        
        # Punt stats
        elif event_type == "punt":
            distance = event.get("distance", 0) or 0
            ts["punts"] += 1
            ts["punt_yds"] += distance
            
            # Punt return
            return_yds = event.get("return_yards", 0) or 0
            if return_yds > 0:
                returner = event.get("returner")
                if returner:
                    key = get_player_key(def_team, returner)
                    init_player(def_stats, "returns", key, {"num": returner, "pr_no": 0, "pr_yds": 0, "pr_td": 0, "pr_lg": 0, "kr_no": 0, "kr_yds": 0, "kr_td": 0, "kr_lg": 0})
                    def_stats["returns"][key]["pr_no"] += 1
                    def_stats["returns"][key]["pr_yds"] += return_yds
                    def_stats["returns"][key]["pr_lg"] = max(def_stats["returns"][key]["pr_lg"], return_yds)
        
        # Field goal stats
        elif event_type == "field_goal":
            ts["fg_att"] += 1
            if result == "good":
                ts["fg_made"] += 1
        
        # Penalty stats
        elif event_type == "penalty":
            penalty_team = event.get("against_team", "offense")
            pen_yds = event.get("yards", 0) or 0
            if penalty_team == "offense":
                ts["penalties"] += 1
                ts["penalty_yds"] += pen_yds
            else:
                team_stats[def_team]["penalties"] += 1
                team_stats[def_team]["penalty_yds"] += pen_yds
        
        # Track 3rd/4th down
        down = event.get("down", 0)
        if down == 3:
            ts["third_down_att"] += 1
            if event.get("first_down") or result == "touchdown":
                ts["third_down_conv"] += 1
        elif down == 4 and event_type not in ["punt", "field_goal"]:
            ts["fourth_down_att"] += 1
            if event.get("first_down") or result == "touchdown":
                ts["fourth_down_conv"] += 1
    
    # Build PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.3*inch, bottomMargin=0.3*inch, leftMargin=0.4*inch, rightMargin=0.4*inch)
    elements = []
    styles = getSampleStyleSheet()
    
    # Title style
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=16, alignment=1, spaceAfter=2)
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=10, alignment=1, spaceAfter=8)
    section_style = ParagraphStyle('Section', parent=styles['Heading2'], fontSize=11, spaceBefore=12, spaceAfter=4)
    
    home_name = game.get('home_team_name', 'Home')
    away_name = game.get('away_team_name', 'Away')
    
    # Header
    elements.append(Paragraph(f"<b>{away_name} vs {home_name}</b>", title_style))
    game_date = game.get('date', '')
    elements.append(Paragraph(f"Football Box Score • {game_date}", subtitle_style))
    
    # Score by Quarter
    home_total = sum(quarter_scores['home'])
    away_total = sum(quarter_scores['away'])
    
    score_data = [
        ["", "1st", "2nd", "3rd", "4th", "Total"],
        [away_name, quarter_scores['away'][0], quarter_scores['away'][1], quarter_scores['away'][2], quarter_scores['away'][3], away_total],
        [home_name, quarter_scores['home'][0], quarter_scores['home'][1], quarter_scores['home'][2], quarter_scores['home'][3], home_total],
    ]
    
    score_table = Table(score_data, colWidths=[2.5*inch, 0.6*inch, 0.6*inch, 0.6*inch, 0.6*inch, 0.7*inch])
    score_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (-1, 1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
    ]))
    elements.append(score_table)
    elements.append(Spacer(1, 12))
    
    # Team Statistics Comparison
    elements.append(Paragraph("<b>TEAM STATISTICS</b>", section_style))
    
    def format_downs(conv, att):
        pct = f"({round(conv/att*100)}%)" if att > 0 else "(0%)"
        return f"{conv}-{att} {pct}"
    
    ts_h = team_stats["home"]
    ts_a = team_stats["away"]
    
    team_stat_data = [
        [away_name, "STAT", home_name],
        [ts_a["first_downs"], "First Downs", ts_h["first_downs"]],
        [f"{ts_a['rush_att']}-{ts_a['rush_yds']}", "Rushes-Yards", f"{ts_h['rush_att']}-{ts_h['rush_yds']}"],
        [f"{ts_a['pass_comp']}-{ts_a['pass_att']}-{ts_a['pass_int']}", "Comp-Att-Int", f"{ts_h['pass_comp']}-{ts_h['pass_att']}-{ts_h['pass_int']}"],
        [ts_a["pass_yds"], "Passing Yards", ts_h["pass_yds"]],
        [ts_a["total_yds"], "Total Yards", ts_h["total_yds"]],
        [f"{ts_a['penalties']}-{ts_a['penalty_yds']}", "Penalties-Yards", f"{ts_h['penalties']}-{ts_h['penalty_yds']}"],
        [format_downs(ts_a["third_down_conv"], ts_a["third_down_att"]), "3rd Down Conv", format_downs(ts_h["third_down_conv"], ts_h["third_down_att"])],
        [format_downs(ts_a["fourth_down_conv"], ts_a["fourth_down_att"]), "4th Down Conv", format_downs(ts_h["fourth_down_conv"], ts_h["fourth_down_att"])],
        [f"{ts_a['sacks']}-{ts_a['sack_yds']}", "Sacks-Yards", f"{ts_h['sacks']}-{ts_h['sack_yds']}"],
        [f"{ts_a['punts']}-{round(ts_a['punt_yds']/ts_a['punts'], 1) if ts_a['punts'] > 0 else 0}", "Punts-Avg", f"{ts_h['punts']}-{round(ts_h['punt_yds']/ts_h['punts'], 1) if ts_h['punts'] > 0 else 0}"],
    ]
    
    team_stat_table = Table(team_stat_data, colWidths=[2*inch, 2*inch, 2*inch])
    team_stat_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('BACKGROUND', (1, 1), (1, -1), colors.Color(0.95, 0.95, 0.95)),
    ]))
    elements.append(team_stat_table)
    
    # Scoring Summary
    if scoring_plays:
        elements.append(Paragraph("<b>SCORING SUMMARY</b>", section_style))
        scoring_data = [["Qtr", "Time", "Team", "Play", "Score"]]
        for sp in scoring_plays:
            team_abbrev = home_name[:3].upper() if sp["team"] == "home" else away_name[:3].upper()
            scoring_data.append([sp["quarter"], sp["time"], team_abbrev, sp["description"][:50], sp["score"]])
        
        scoring_table = Table(scoring_data, colWidths=[0.4*inch, 0.6*inch, 0.5*inch, 3.5*inch, 0.7*inch])
        scoring_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (2, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ]))
        elements.append(scoring_table)
    
    def create_individual_table(title, data, headers, col_widths):
        """Create a formatted individual stats table"""
        if not data:
            return None
        elements_list = []
        elements_list.append(Paragraph(f"<b>{title}</b>", section_style))
        table_data = [headers] + data
        table = Table(table_data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ]))
        elements_list.append(table)
        return elements_list
    
    # Rushing Stats
    def format_rushing(stats_dict, team_name):
        rows = []
        for key, s in sorted(stats_dict["rushing"].items(), key=lambda x: x[1]["yds"], reverse=True):
            avg = round(s["yds"] / s["att"], 1) if s["att"] > 0 else 0
            rows.append([f"#{s['num']} ({team_name[:3]})", s["att"], s["yds"], avg, s["td"], s["lg"]])
        return rows
    
    rushing_data = format_rushing(home_stats, home_name) + format_rushing(away_stats, away_name)
    if rushing_data:
        rushing_elements = create_individual_table("RUSHING", rushing_data, ["Player", "Car", "Yds", "Avg", "TD", "Lg"], [1.8*inch, 0.5*inch, 0.6*inch, 0.5*inch, 0.4*inch, 0.5*inch])
        if rushing_elements:
            elements.extend(rushing_elements)
    
    # Passing Stats
    def format_passing(stats_dict, team_name):
        rows = []
        for key, s in sorted(stats_dict["passing"].items(), key=lambda x: x[1]["yds"], reverse=True):
            pct = round(s["comp"] / s["att"] * 100, 1) if s["att"] > 0 else 0
            rows.append([f"#{s['num']} ({team_name[:3]})", f"{s['comp']}-{s['att']}", pct, s["yds"], s["td"], s["int"], s["lg"]])
        return rows
    
    passing_data = format_passing(home_stats, home_name) + format_passing(away_stats, away_name)
    if passing_data:
        passing_elements = create_individual_table("PASSING", passing_data, ["Player", "C-A", "Pct", "Yds", "TD", "Int", "Lg"], [1.5*inch, 0.7*inch, 0.5*inch, 0.6*inch, 0.4*inch, 0.4*inch, 0.5*inch])
        if passing_elements:
            elements.extend(passing_elements)
    
    # Receiving Stats
    def format_receiving(stats_dict, team_name):
        rows = []
        for key, s in sorted(stats_dict["receiving"].items(), key=lambda x: x[1]["yds"], reverse=True):
            avg = round(s["yds"] / s["rec"], 1) if s["rec"] > 0 else 0
            rows.append([f"#{s['num']} ({team_name[:3]})", s["rec"], s["yds"], avg, s["td"], s["lg"]])
        return rows
    
    receiving_data = format_receiving(home_stats, home_name) + format_receiving(away_stats, away_name)
    if receiving_data:
        receiving_elements = create_individual_table("RECEIVING", receiving_data, ["Player", "Rec", "Yds", "Avg", "TD", "Lg"], [1.8*inch, 0.5*inch, 0.6*inch, 0.5*inch, 0.4*inch, 0.5*inch])
        if receiving_elements:
            elements.extend(receiving_elements)
    
    # Defense Stats
    def format_defense(stats_dict, team_name):
        rows = []
        for key, s in sorted(stats_dict["defense"].items(), key=lambda x: x[1]["tot"], reverse=True):
            rows.append([f"#{s['num']} ({team_name[:3]})", s["tot"], s["solo"], s["ast"], s["tfl"], s["sack"], s["int"], s["pbu"]])
        return rows
    
    defense_data = format_defense(home_stats, home_name) + format_defense(away_stats, away_name)
    if defense_data:
        defense_elements = create_individual_table("DEFENSE", defense_data, ["Player", "Tot", "Solo", "Ast", "TFL", "Sack", "Int", "PBU"], [1.5*inch, 0.45*inch, 0.45*inch, 0.45*inch, 0.45*inch, 0.5*inch, 0.4*inch, 0.45*inch])
        if defense_elements:
            elements.extend(defense_elements)
    
    # Returns Stats
    def format_returns(stats_dict, team_name):
        rows = []
        for key, s in stats_dict["returns"].items():
            if s["pr_no"] > 0 or s["kr_no"] > 0:
                pr_avg = round(s["pr_yds"] / s["pr_no"], 1) if s["pr_no"] > 0 else 0
                kr_avg = round(s["kr_yds"] / s["kr_no"], 1) if s["kr_no"] > 0 else 0
                rows.append([f"#{s['num']} ({team_name[:3]})", s["pr_no"], s["pr_yds"], pr_avg, s["kr_no"], s["kr_yds"], kr_avg])
        return rows
    
    returns_data = format_returns(home_stats, home_name) + format_returns(away_stats, away_name)
    if returns_data:
        returns_elements = create_individual_table("RETURNS", returns_data, ["Player", "PR No", "PR Yds", "PR Avg", "KR No", "KR Yds", "KR Avg"], [1.4*inch, 0.55*inch, 0.65*inch, 0.6*inch, 0.55*inch, 0.65*inch, 0.6*inch])
        if returns_elements:
            elements.extend(returns_elements)
    
    # Build and return PDF
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"football_boxscore_{away_name}_vs_{home_name}.pdf".replace(" ", "_")
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ============ UTILITY ENDPOINTS ============

@api_router.get("/")
async def root():
    return {"message": "Basketball Stats API"}

# ============= DEMO MODE ENDPOINTS =============

# Basketball demo players - 10 per team
BASKETBALL_DEMO_HOME_PLAYERS = [
    {"id": "demo-bh1", "name": "Marcus Johnson", "number": "1"},
    {"id": "demo-bh2", "name": "Darius Williams", "number": "3"},
    {"id": "demo-bh3", "name": "Tyler Brown", "number": "5"},
    {"id": "demo-bh4", "name": "Jordan Davis", "number": "10"},
    {"id": "demo-bh5", "name": "Chris Martinez", "number": "12"},
    {"id": "demo-bh6", "name": "Andre Thompson", "number": "15"},
    {"id": "demo-bh7", "name": "Kevin Moore", "number": "21"},
    {"id": "demo-bh8", "name": "Isaiah Jackson", "number": "23"},
    {"id": "demo-bh9", "name": "DeShawn Harris", "number": "32"},
    {"id": "demo-bh10", "name": "Malik Robinson", "number": "45"},
]

BASKETBALL_DEMO_AWAY_PLAYERS = [
    {"id": "demo-ba1", "name": "Jaylen Carter", "number": "0"},
    {"id": "demo-ba2", "name": "Brandon Lee", "number": "2"},
    {"id": "demo-ba3", "name": "Cameron White", "number": "4"},
    {"id": "demo-ba4", "name": "Xavier Green", "number": "11"},
    {"id": "demo-ba5", "name": "Terrence Hall", "number": "13"},
    {"id": "demo-ba6", "name": "Dominic Young", "number": "20"},
    {"id": "demo-ba7", "name": "Aaron King", "number": "22"},
    {"id": "demo-ba8", "name": "Maurice Wright", "number": "24"},
    {"id": "demo-ba9", "name": "Lamar Scott", "number": "33"},
    {"id": "demo-ba10", "name": "Rashad Adams", "number": "44"},
]

def create_demo_player_stats(players, on_floor_ids=None):
    """Create player stats structure for demo - matches real game format"""
    stats = []
    for i, p in enumerate(players):
        is_on_floor = p["id"] in (on_floor_ids or []) if on_floor_ids else i < 5
        stats.append({
            "id": p["id"],
            "player_name": p["name"],
            "player_number": p["number"],
            "team_id": "demo-home-team" if p["id"].startswith("demo-bh") else "demo-away-team",
            "game_id": "demo-basketball",
            # Flat stat fields matching real game format
            "ft_made": 0,
            "ft_missed": 0,
            "fg2_made": 0,
            "fg2_missed": 0,
            "fg3_made": 0,
            "fg3_missed": 0,
            "offensive_rebounds": 0,
            "defensive_rebounds": 0,
            "assists": 0,
            "steals": 0,
            "blocks": 0,
            "turnovers": 0,
            "fouls": 0,
            "on_floor": is_on_floor
        })
    return stats

@app.get("/api/demo/basketball/{mode}")
async def get_basketball_demo_game(mode: str):
    """Get demo basketball game data - mode can be 'simple', 'classic', or 'advanced'"""
    home_on_floor = ["demo-bh1", "demo-bh2", "demo-bh3", "demo-bh4", "demo-bh5"]
    away_on_floor = ["demo-ba1", "demo-ba2", "demo-ba3", "demo-ba4", "demo-ba5"]
    
    demo_game = {
        "id": f"demo-basketball-{mode}",
        "_id": f"demo-basketball-{mode}",
        "sport": "basketball",
        "status": "active",  # Use 'active' to match real game status
        "is_demo": True,
        "simple_mode": mode == "simple",
        "advanced_mode": mode == "advanced",
        "home_team_id": "demo-home-team",
        "away_team_id": "demo-away-team",
        "home_team_name": "Northside Tigers",
        "away_team_name": "Eastwood Eagles",
        "home_team_color": "#f97316",
        "away_team_color": "#3b82f6",
        "home_score": 0,
        "away_score": 0,
        "period": 1,
        "current_quarter": 1,
        "period_label": "1st",
        "clock_enabled": True,
        "clock_time": 720,
        "clock_running": False,
        "home_timeouts": 5,
        "away_timeouts": 5,
        "home_fouls": 0,
        "away_fouls": 0,
        "home_bonus": False,
        "away_bonus": False,
        "possession": "home",
        "home_player_stats": create_demo_player_stats(BASKETBALL_DEMO_HOME_PLAYERS, home_on_floor),
        "away_player_stats": create_demo_player_stats(BASKETBALL_DEMO_AWAY_PLAYERS, away_on_floor),
        "home_on_floor": home_on_floor,
        "away_on_floor": away_on_floor,
        "play_by_play": [],
        "quarter_scores": {"home": [0, 0, 0, 0], "away": [0, 0, 0, 0]},
        "share_code": f"demo-{mode}"
    }
    
    return demo_game

# Football demo roster - 50 players per team
FOOTBALL_DEMO_HOME_ROSTER = [
    {"id": f"demo-fh{i}", "name": name, "number": num, "position": pos}
    for i, (name, num, pos) in enumerate([
        ("Jake Mitchell", "7", "QB"), ("Ryan Cooper", "12", "QB"),
        ("DeAndre Williams", "22", "RB"), ("Marcus Bell", "28", "RB"), ("Tyrone Jackson", "34", "RB"),
        ("Chris Johnson", "1", "WR"), ("Darius Brown", "11", "WR"), ("Kevin Thomas", "14", "WR"), 
        ("Andre Davis", "18", "WR"), ("Malik Harris", "81", "WR"),
        ("Tyler Martinez", "85", "TE"), ("Brandon Moore", "88", "TE"),
        ("James Wilson", "70", "OL"), ("Michael Thompson", "71", "OL"), ("David Garcia", "72", "OL"),
        ("Robert Lee", "73", "OL"), ("Anthony White", "74", "OL"), ("Joshua Clark", "75", "OL"), ("Daniel Lewis", "76", "OL"),
        ("Jamal Robinson", "90", "DL"), ("Terrell Young", "91", "DL"), ("Marcus King", "92", "DL"),
        ("Derek Wright", "93", "DL"), ("Corey Scott", "94", "DL"),
        ("Jordan Adams", "50", "LB"), ("Cameron Hall", "51", "LB"), ("Isaiah Green", "52", "LB"),
        ("Xavier Carter", "54", "LB"), ("Dominic Taylor", "55", "LB"), ("Lamar Mitchell", "56", "LB"),
        ("Aaron Phillips", "20", "DB"), ("Brandon Turner", "21", "DB"), ("Chris Campbell", "23", "DB"),
        ("Deshawn Parker", "24", "DB"), ("Jaylen Edwards", "25", "DB"), ("Kevin Morgan", "26", "DB"),
        ("Maurice Bailey", "27", "DB"), ("Rashad Collins", "29", "DB"),
        ("Tyler Henderson", "3", "K"), ("Ryan Brooks", "8", "P"), ("Alex Rivera", "47", "LS"),
        ("Nick Foster", "15", "WR"), ("Sean Murphy", "33", "RB"), ("Brian Ward", "42", "FB"),
        ("Eric Patterson", "57", "LB"), ("Travis Reed", "77", "OL"), ("Greg Sanders", "95", "DL"),
        ("Tony Price", "30", "DB"), ("Matt Howard", "84", "TE"), ("Steve Rogers", "16", "QB"),
    ], 1)
]

FOOTBALL_DEMO_AWAY_ROSTER = [
    {"id": f"demo-fa{i}", "name": name, "number": num, "position": pos}
    for i, (name, num, pos) in enumerate([
        ("Ethan Brooks", "10", "QB"), ("Noah Williams", "5", "QB"),
        ("Jamal Thompson", "25", "RB"), ("Tyrell Davis", "32", "RB"), ("Donte Harris", "38", "RB"),
        ("Calvin Moore", "2", "WR"), ("Darius Jackson", "9", "WR"), ("Andre Wilson", "13", "WR"),
        ("Marcus Lee", "17", "WR"), ("Terrence Brown", "82", "WR"),
        ("Kyle Martinez", "86", "TE"), ("Jason Taylor", "89", "TE"),
        ("Marcus Garcia", "60", "OL"), ("David Robinson", "61", "OL"), ("Anthony Clark", "62", "OL"),
        ("Brian Lewis", "63", "OL"), ("Chris White", "64", "OL"), ("Derek Young", "65", "OL"), ("Eric King", "66", "OL"),
        ("Jamal Wright", "96", "DL"), ("Corey Scott", "97", "DL"), ("Marcus Adams", "98", "DL"),
        ("Terrell Hall", "99", "DL"), ("Jordan Green", "91", "DL"),
        ("Cameron Carter", "40", "LB"), ("Isaiah Taylor", "41", "LB"), ("Xavier Mitchell", "43", "LB"),
        ("Dominic Phillips", "44", "LB"), ("Lamar Turner", "45", "LB"), ("Aaron Campbell", "46", "LB"),
        ("Brandon Parker", "20", "DB"), ("Chris Edwards", "21", "DB"), ("Deshawn Morgan", "22", "DB"),
        ("Jaylen Bailey", "23", "DB"), ("Kevin Collins", "24", "DB"), ("Maurice Henderson", "26", "DB"),
        ("Rashad Brooks", "27", "DB"), ("Tyler Rivera", "28", "DB"),
        ("Ryan Foster", "4", "K"), ("Alex Murphy", "6", "P"), ("Nick Ward", "48", "LS"),
        ("Sean Patterson", "14", "WR"), ("Brian Reed", "35", "RB"), ("Eric Sanders", "42", "FB"),
        ("Travis Price", "47", "LB"), ("Greg Howard", "67", "OL"), ("Tony Rogers", "92", "DL"),
        ("Matt Foster", "29", "DB"), ("Steve Murphy", "87", "TE"), ("Jack Williams", "8", "QB"),
    ], 1)
]

@app.get("/api/demo/football")
async def get_football_demo_game():
    """Get demo football game data"""
    demo_game = {
        "id": "demo-football",
        "_id": "demo-football",
        "sport": "football",
        "status": "live",
        "is_demo": True,
        "home_team_id": "demo-home-football",
        "away_team_id": "demo-away-football",
        "home_team_name": "Central Wolves",
        "away_team_name": "Riverside Panthers",
        "home_team_color": "#dc2626",
        "away_team_color": "#7c3aed",
        "home_score": 0,
        "away_score": 0,
        "quarter": 1,
        "home_timeouts": 3,
        "away_timeouts": 3,
        "possession": "home",
        "ball_position": 25,
        "down": 1,
        "distance": 10,
        "clock_time": 900,
        "clock_running": False,
        "home_roster": FOOTBALL_DEMO_HOME_ROSTER,
        "away_roster": FOOTBALL_DEMO_AWAY_ROSTER,
        "football_state": {
            "possession": "home",
            "ball_position": 25,
            "down": 1,
            "distance": 10,
            "quarter": 1,
            "home_score": 0,
            "away_score": 0,
            "home_timeouts": 3,
            "away_timeouts": 3,
            "clock_time": 900,
            "play_log": [],
            "home_time_of_possession": 0,
            "away_time_of_possession": 0,
            "current_drive": {
                "team": "home",
                "startPosition": 25,
                "startPeriod": 1,
                "startClock": 900,
                "plays": 0,
                "yards": 0,
                "elapsedTime": 0
            },
            "all_drives": []
        },
        "share_code": "demo-football"
    }
    
    return demo_game

@app.put("/api/demo/{game_type}")
async def update_demo_game(game_type: str, data: dict = Body(...)):
    """Accept demo game updates but don't persist them (demo mode)"""
    # In demo mode, we accept updates but don't save to database
    # This allows the UI to function normally without errors
    return {"success": True, "message": "Demo mode - changes not persisted"}

@app.post("/api/demo/{game_type}/play")
async def add_demo_play(game_type: str, data: dict = Body(...)):
    """Accept demo play additions but don't persist them"""
    return {"success": True, "message": "Demo mode - play recorded locally only"}

# Baseball Demo Data
BASEBALL_DEMO_HOME_ROSTER = [
    {"player_number": "1", "player_name": "Mike Johnson", "position": "C"},
    {"player_number": "5", "player_name": "Chris Davis", "position": "1B"},
    {"player_number": "7", "player_name": "James Wilson", "position": "2B"},
    {"player_number": "12", "player_name": "Tom Anderson", "position": "SS"},
    {"player_number": "15", "player_name": "Alex Rodriguez", "position": "3B"},
    {"player_number": "21", "player_name": "Derek Martinez", "position": "LF"},
    {"player_number": "24", "player_name": "Ken Thompson", "position": "CF"},
    {"player_number": "27", "player_name": "Mike Williams", "position": "RF"},
    {"player_number": "34", "player_name": "David Garcia", "position": "P"},
]

BASEBALL_DEMO_AWAY_ROSTER = [
    {"player_number": "2", "player_name": "Ryan Smith", "position": "C"},
    {"player_number": "4", "player_name": "Kevin Brown", "position": "1B"},
    {"player_number": "8", "player_name": "Matt Taylor", "position": "2B"},
    {"player_number": "11", "player_name": "Josh Lee", "position": "SS"},
    {"player_number": "14", "player_name": "Andrew Harris", "position": "3B"},
    {"player_number": "18", "player_name": "Brandon White", "position": "LF"},
    {"player_number": "22", "player_name": "Tyler Clark", "position": "CF"},
    {"player_number": "25", "player_name": "Jason Lewis", "position": "RF"},
    {"player_number": "31", "player_name": "Eric Walker", "position": "P"},
]

@app.get("/api/demo/baseball")
async def get_baseball_demo_game():
    """Get demo baseball game data"""
    home_stats = [
        {**p, "at_bats": 0, "hits": 0, "runs": 0, "rbi": 0, "strikeouts_batting": 0, "walks": 0, "home_runs": 0}
        for p in BASEBALL_DEMO_HOME_ROSTER
    ]
    away_stats = [
        {**p, "at_bats": 0, "hits": 0, "runs": 0, "rbi": 0, "strikeouts_batting": 0, "walks": 0, "home_runs": 0}
        for p in BASEBALL_DEMO_AWAY_ROSTER
    ]
    
    demo_game = {
        "id": "demo-baseball",
        "_id": "demo-baseball",
        "sport": "baseball",
        "status": "live",
        "is_demo": True,
        "home_team_id": "demo-home-baseball",
        "away_team_id": "demo-away-baseball",
        "home_team_name": "Riverside Sluggers",
        "away_team_name": "Valley Hawks",
        "home_team_color": "#dc2626",
        "away_team_color": "#2563eb",
        "home_score": 0,
        "away_score": 0,
        "current_inning": 1,
        "inning_half": "top",
        "total_innings": 9,
        "balls": 0,
        "strikes": 0,
        "outs": 0,
        "bases": {"first": False, "second": False, "third": False},
        "home_roster": BASEBALL_DEMO_HOME_ROSTER,
        "away_roster": BASEBALL_DEMO_AWAY_ROSTER,
        "home_player_stats": home_stats,
        "away_player_stats": away_stats,
        "inning_scores": {"home": [], "away": []},
        "play_by_play": [],
        "share_code": "demo-baseball"
    }
    
    return demo_game

# ============= CONTACT FORM =============
import resend

# Initialize Resend with API key from environment variable
resend.api_key = os.environ.get("RESEND_API_KEY", "")

class ContactFormRequest(BaseModel):
    name: str
    email: str
    school: str
    state: str
    role: str
    message: str = ""

@app.post("/api/contact")
async def submit_contact_form(form_data: ContactFormRequest):
    """Submit contact form - sends email via Resend"""
    try:
        # Store the contact submission in database for backup
        contact_doc = {
            "name": form_data.name,
            "email": form_data.email,
            "school": form_data.school,
            "state": form_data.state,
            "role": form_data.role,
            "message": form_data.message,
            "submitted_at": datetime.now(timezone.utc).isoformat(),
            "status": "new"
        }
        await db.contact_submissions.insert_one(contact_doc)
        
        # Send email via Resend
        try:
            email_body = f"""
New contact form submission from StatMoose:

Name: {form_data.name}
Email: {form_data.email}
School: {form_data.school}
State: {form_data.state}
Role: {form_data.role}

Message:
{form_data.message if form_data.message else "(No message provided)"}

---
Submitted at: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")}
            """
            
            params = {
                "from": "StatMoose <onboarding@resend.dev>",
                "to": ["jaredmoosejones@gmail.com"],
                "subject": f"StatMoose Contact: {form_data.school} - {form_data.role}",
                "text": email_body,
                "reply_to": form_data.email
            }
            
            email_response = resend.Emails.send(params)
            print(f"Email sent successfully: {email_response}")
            
        except Exception as email_error:
            print(f"Email notification failed (form still saved): {email_error}")
        
        return {"success": True, "message": "Contact form submitted successfully"}
        
    except Exception as e:
        print(f"Contact form error: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit contact form")

# Health check endpoint for Kubernetes
@app.get("/health")
async def health_check():
    """Basic health check with database connectivity test"""
    try:
        # Quick database ping
        await db.command('ping')
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "degraded", "database": "disconnected", "error": str(e)}

@app.get("/api/health")
async def api_health_check():
    """API health check with database connectivity test"""
    try:
        # Quick database ping
        await db.command('ping')
        # Quick query to verify collections are accessible
        user_count = await db.users.count_documents({})
        return {
            "status": "healthy", 
            "service": "statmoose-api",
            "database": "connected",
            "db_name": db_name,
            "mongo_url_prefix": mongo_url[:40] + "..." if len(mongo_url) > 40 else mongo_url,
            "users_count": user_count
        }
    except Exception as e:
        return {
            "status": "degraded", 
            "service": "statmoose-api",
            "database": "error",
            "db_name": db_name,
            "mongo_url_prefix": mongo_url[:40] + "..." if len(mongo_url) > 40 else mongo_url,
            "error": str(e)
        }

@app.get("/api/debug/auth-status")
async def debug_auth_status():
    """Debug endpoint to check authentication system status"""
    try:
        # Check database
        await db.command('ping')
        
        # Count users
        user_count = await db.users.count_documents({})
        local_users = await db.users.count_documents({"auth_provider": "local"})
        google_users = await db.users.count_documents({"auth_provider": "google"})
        
        # Count active sessions (handle both Date and string formats)
        now = datetime.now(timezone.utc)
        total_sessions = await db.user_sessions.count_documents({})
        
        # Get sample user emails (first 5, partially masked)
        sample_users = await db.users.find({}, {"email": 1, "_id": 0}).limit(5).to_list(5)
        masked_emails = []
        for u in sample_users:
            email = u.get("email", "")
            if "@" in email:
                parts = email.split("@")
                masked = parts[0][:3] + "***@" + parts[1]
                masked_emails.append(masked)
        
        return {
            "status": "ok",
            "database": "connected",
            "users": {
                "total": user_count,
                "local_auth": local_users,
                "google_auth": google_users,
                "sample_emails": masked_emails
            },
            "total_sessions": total_sessions,
            "server_time": now.isoformat()
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

@app.get("/api/debug/login-test-page")
async def debug_login_test_page():
    """Returns an HTML page for testing login from any browser"""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>StatMoose Login Debug</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            input, button { padding: 10px; margin: 5px 0; width: 100%; box-sizing: border-box; }
            button { background: #f97316; color: white; border: none; cursor: pointer; }
            pre { background: #f0f0f0; padding: 15px; overflow-x: auto; white-space: pre-wrap; }
            .success { color: green; }
            .error { color: red; }
        </style>
    </head>
    <body>
        <h1>StatMoose Login Debug</h1>
        <p>This page tests login directly without any caching or frontend issues.</p>
        
        <input type="text" id="email" placeholder="Email or Username" value="antlersportsnetwork@gmail.com">
        <input type="password" id="password" placeholder="Password" value="NoahTheJew1997">
        <button onclick="testLogin()">Test Login</button>
        
        <h3>Result:</h3>
        <pre id="result">Click "Test Login" to test...</pre>
        
        <h3>Request Details:</h3>
        <pre id="request">Will show request details...</pre>
        
        <script>
        async function testLogin() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const resultEl = document.getElementById('result');
            const requestEl = document.getElementById('request');
            
            const requestBody = JSON.stringify({ email, password });
            requestEl.textContent = 'URL: ' + window.location.origin + '/api/auth/login\\n';
            requestEl.textContent += 'Method: POST\\n';
            requestEl.textContent += 'Body: ' + requestBody + '\\n';
            requestEl.textContent += 'Password length: ' + password.length + '\\n';
            requestEl.textContent += 'Password chars: ' + password.split('').map(c => c.charCodeAt(0)).join(',');
            
            resultEl.textContent = 'Testing...';
            resultEl.className = '';
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: requestBody,
                    credentials: 'include'
                });
                
                const data = await response.json();
                
                if (response.ok && data.session_token) {
                    resultEl.className = 'success';
                    resultEl.textContent = 'SUCCESS!\\n\\n' + JSON.stringify(data, null, 2);
                } else {
                    resultEl.className = 'error';
                    resultEl.textContent = 'FAILED: ' + response.status + '\\n\\n' + JSON.stringify(data, null, 2);
                }
            } catch (error) {
                resultEl.className = 'error';
                resultEl.textContent = 'NETWORK ERROR:\\n' + error.message;
            }
        }
        </script>
    </body>
    </html>
    """
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html)

@app.post("/api/debug/test-login")
async def debug_test_login(credentials: UserLogin):
    """Debug endpoint to test login and return detailed diagnostics"""
    login_identifier = credentials.email.lower().strip()
    diagnostics = {
        "input_email": login_identifier,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "steps": []
    }
    
    try:
        # Step 1: Database ping
        await db.command('ping')
        diagnostics["steps"].append({"step": "db_ping", "status": "ok"})
        
        # Step 2: Find user
        user = await db.users.find_one({"email": login_identifier}, {"_id": 0})
        if not user:
            user = await db.users.find_one({"username": login_identifier}, {"_id": 0})
        
        if not user:
            diagnostics["steps"].append({"step": "find_user", "status": "not_found"})
            # List all user emails for debugging
            all_users = await db.users.find({}, {"email": 1, "_id": 0}).to_list(100)
            diagnostics["existing_emails"] = [u.get("email", "?") for u in all_users]
            return {"success": False, "diagnostics": diagnostics}
        
        diagnostics["steps"].append({
            "step": "find_user", 
            "status": "found",
            "user_email": user.get("email"),
            "auth_provider": user.get("auth_provider"),
            "has_password_hash": bool(user.get("password_hash")),
            "hash_length": len(user.get("password_hash", "")),
            "hash_prefix": user.get("password_hash", "")[:7] if user.get("password_hash") else None
        })
        
        # Step 3: Check auth provider
        if user.get("auth_provider") == "google":
            diagnostics["steps"].append({"step": "auth_provider", "status": "google_only"})
            return {"success": False, "reason": "google_auth_only", "diagnostics": diagnostics}
        
        diagnostics["steps"].append({"step": "auth_provider", "status": "local"})
        
        # Step 4: Verify password
        stored_hash = user.get("password_hash", "")
        try:
            password_valid = verify_password(credentials.password, stored_hash)
            diagnostics["steps"].append({
                "step": "verify_password", 
                "status": "valid" if password_valid else "invalid",
                "input_password_length": len(credentials.password)
            })
        except Exception as e:
            diagnostics["steps"].append({
                "step": "verify_password", 
                "status": "error",
                "error": str(e)
            })
            return {"success": False, "reason": "password_verification_error", "diagnostics": diagnostics}
        
        if not password_valid:
            return {"success": False, "reason": "wrong_password", "diagnostics": diagnostics}
        
        return {"success": True, "diagnostics": diagnostics}
        
    except Exception as e:
        diagnostics["steps"].append({"step": "exception", "error": str(e)})
        return {"success": False, "reason": "exception", "diagnostics": diagnostics}

# Health check endpoint that also ensures admin exists (for production init)
@app.get("/api/init-admin")
async def init_admin_endpoint():
    """Initialize admin user - call this after deployment"""
    try:
        result = await ensure_admin_user()
        return {"status": "ok", "admin_user": result, "message": "Admin user ready"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

# Dynamic CORS handling for credentials
origins = os.environ.get('CORS_ORIGINS', '*')
if origins == '*':
    # When using wildcards with credentials, we need to handle it dynamically
    from starlette.middleware.base import BaseHTTPMiddleware
    from starlette.responses import Response
    
    # Explicit list of allowed headers (wildcard doesn't always work)
    ALLOWED_HEADERS = "Accept, Accept-Language, Content-Language, Content-Type, Authorization, X-Requested-With, Origin, Cache-Control, Pragma, Expires"
    
    class DynamicCORSMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            origin = request.headers.get("origin", "*")
            
            # Handle preflight OPTIONS requests
            if request.method == "OPTIONS":
                response = Response(status_code=200)
                response.headers["Access-Control-Allow-Origin"] = origin if origin != "*" else "*"
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
                response.headers["Access-Control-Allow-Headers"] = ALLOWED_HEADERS
                response.headers["Access-Control-Max-Age"] = "86400"
                response.headers["Access-Control-Expose-Headers"] = "*"
                # Security headers for restricted networks
                response.headers["X-Content-Type-Options"] = "nosniff"
                response.headers["X-Frame-Options"] = "SAMEORIGIN"
                response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
                return response
            
            response = await call_next(request)
            
            # Set CORS headers dynamically based on origin
            if origin and origin != "*":
                response.headers["Access-Control-Allow-Origin"] = origin
            else:
                response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
            response.headers["Access-Control-Allow-Headers"] = ALLOWED_HEADERS
            response.headers["Access-Control-Expose-Headers"] = "*"
            # Security headers for restricted networks
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "SAMEORIGIN"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            # Cache control for better performance on slow/restricted networks
            if "Cache-Control" not in response.headers:
                response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            
            return response
    
    app.add_middleware(DynamicCORSMiddleware)
else:
    app.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origins=origins.split(','),
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def ensure_admin_user():
    """Ensure admin user exists with correct credentials"""
    # Use environment variables with hardcoded fallbacks for deployment
    admin_password = os.environ.get("ADMIN_PASSWORD") or "NoahTheJew1997"
    admin_email = os.environ.get("ADMIN_EMAIL") or "antlersportsnetwork@gmail.com"
    
    logger.info(f"Ensuring admin user: {admin_email}")
    
    try:
        # Check if admin user exists
        admin_user = await db.users.find_one({"email": admin_email})
        
        # Generate new password hash
        hashed = hash_password(admin_password)
        
        if not admin_user:
            # Create admin user
            admin_doc = {
                "user_id": "user_admin_001",
                "email": admin_email,
                "username": "admin",
                "name": "Admin",
                "password_hash": hashed,
                "auth_provider": "local",
                "security_questions": [],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(admin_doc)
            logger.info(f"Admin user created successfully: {admin_email}")
            return "created"
        else:
            # Always update password to ensure it's correct
            await db.users.update_one(
                {"email": admin_email},
                {"$set": {
                    "password_hash": hashed,
                    "auth_provider": "local",
                    "username": "admin",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            logger.info(f"Admin user password updated: {admin_email}")
            return "updated"
    except Exception as e:
        logger.error(f"Error ensuring admin user: {e}")
        raise e

# ============ US STATES LIST ============
US_STATES = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
    "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
    "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
    "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
    "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
    "Wisconsin", "Wyoming"
]

# ============ SCHOOL/ORGANIZATION MODELS ============

class SchoolRegister(BaseModel):
    school_name: str
    state: str
    classification: str  # "high_school", "college", "prep", or "other"
    classification_other: Optional[str] = None  # Custom text if classification is "other"
    logo_url: Optional[str] = None  # Can be uploaded file path or web URL
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
    name: str  # e.g., "2025-26 Football"
    sport: str  # "basketball" or "football"
    gender: Optional[str] = "men"  # "men" or "women"
    level: Optional[str] = "varsity"  # "varsity" or "subvarsity"

class SchoolTeamCreate(BaseModel):
    name: str
    sport: str  # "basketball" or "football"
    color: Optional[str] = "#000000"
    roster: Optional[List[dict]] = []
    school_code: Optional[str] = None  # If from another school

class SchoolGameCreate(BaseModel):
    season_id: str
    opponent_team_id: str
    scheduled_date: str
    scheduled_time: Optional[str] = None
    location: Optional[str] = None
    is_home_game: bool = True
    note: Optional[str] = None

class UpdateMemberRole(BaseModel):
    role: str  # "admin" or "member"

# ============ SCHOOL/ORGANIZATION ROUTES ============

@api_router.get("/states")
async def get_us_states():
    """Get list of US states for dropdown"""
    return US_STATES

@api_router.get("/security-questions")
async def get_security_questions():
    """Get list of security questions for signup"""
    return SECURITY_QUESTIONS

@api_router.post("/schools/register")
async def register_school(data: SchoolRegister, response: Response):
    """Register a new school/organization with admin user"""
    # Check if school name already exists (case-insensitive)
    existing_school = await db.schools.find_one(
        {"name_lower": data.school_name.lower().strip()},
        {"_id": 0}
    )
    if existing_school:
        raise HTTPException(status_code=400, detail="A school/organization with this name already exists")
    
    # Validate state
    if data.state not in US_STATES:
        raise HTTPException(status_code=400, detail="Invalid state selected")
    
    # Check for existing email
    existing_email = await db.users.find_one({"email": data.user_email.lower()}, {"_id": 0})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate security questions (require at least 2)
    if len(data.security_questions) < 2:
        raise HTTPException(status_code=400, detail="Please answer at least 2 security questions")
    
    # Hash security question answers
    hashed_security_questions = []
    for sq in data.security_questions:
        if sq.question not in SECURITY_QUESTIONS:
            raise HTTPException(status_code=400, detail=f"Invalid security question: {sq.question}")
        hashed_security_questions.append({
            "question": sq.question,
            "answer_hash": pwd_context.hash(sq.answer.lower().strip())
        })
    
    # Generate unique school code from name (3-10 chars)
    base_code = ''.join(c for c in data.school_name.upper() if c.isalnum())[:6]
    if len(base_code) < 3:
        base_code = base_code.ljust(3, 'X')
    
    # Ensure uniqueness by checking existing codes
    school_code = base_code
    counter = 1
    while await db.schools.find_one({"school_code": school_code}):
        school_code = f"{base_code[:5]}{counter}"
        counter += 1
        if counter > 999:
            school_code = f"{base_code[:3]}{secrets.token_hex(2).upper()}"
    
    # Create IDs
    school_id = f"school_{uuid.uuid4().hex[:12]}"
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    invite_code = secrets.token_urlsafe(16)
    
    # Validate and set classification
    valid_classifications = ["high_school", "college", "prep", "other"]
    if data.classification not in valid_classifications:
        raise HTTPException(status_code=400, detail="Invalid classification")
    
    classification_display = data.classification
    if data.classification == "other" and data.classification_other:
        classification_display = data.classification_other.strip()
    
    # Create the school
    school_doc = {
        "school_id": school_id,
        "school_code": school_code,
        "name": data.school_name.strip(),
        "name_lower": data.school_name.lower().strip(),
        "state": data.state,
        "classification": data.classification,
        "classification_display": classification_display,
        "logo_url": data.logo_url,
        "invite_code": invite_code,
        "created_by": user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.schools.insert_one(school_doc)
    
    # Create the admin user
    hashed_password = pwd_context.hash(data.password)
    user_doc = {
        "user_id": user_id,
        "email": data.user_email.lower(),
        "username": data.user_email.lower().split("@")[0],
        "name": data.user_name,
        "password_hash": hashed_password,
        "security_questions": hashed_security_questions,
        "picture": None,
        "auth_provider": "local",
        "school_id": school_id,
        "school_role": "admin",  # First user is admin
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Create a session for the user
    session_token = f"session_{secrets.token_urlsafe(32)}"
    session_doc = {
        "session_token": session_token,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set session cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 30  # 30 days
    )
    
    return {
        "session_token": session_token,
        "user": {
            "user_id": user_id,
            "email": data.user_email.lower(),
            "name": data.user_name,
            "school_id": school_id,
            "school_role": "admin"
        },
        "school": {
            "school_id": school_id,
            "name": data.school_name,
            "state": data.state,
            "logo_url": data.logo_url,
            "invite_code": invite_code
        }
    }

@api_router.get("/schools/check-name/{name}")
async def check_school_name(name: str):
    """Check if a school name is available"""
    existing = await db.schools.find_one(
        {"name_lower": name.lower().strip()},
        {"_id": 0}
    )
    return {"available": existing is None}

@api_router.get("/schools/invite/{invite_code}")
async def get_school_by_invite(invite_code: str):
    """Get school info by invite code (for join page)"""
    school = await db.schools.find_one(
        {"invite_code": invite_code},
        {"_id": 0, "school_id": 1, "name": 1, "state": 1, "logo_url": 1}
    )
    if not school:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    return school

@api_router.post("/schools/join/{invite_code}")
async def join_school(invite_code: str, data: SchoolMemberInvite, response: Response):
    """Join a school using an invite code"""
    # Get school
    school = await db.schools.find_one({"invite_code": invite_code}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    
    # Check for existing email
    existing_email = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate security questions
    if len(data.security_questions) < 2:
        raise HTTPException(status_code=400, detail="Please answer at least 2 security questions")
    
    # Hash security question answers
    hashed_security_questions = []
    for sq in data.security_questions:
        if sq.question not in SECURITY_QUESTIONS:
            raise HTTPException(status_code=400, detail=f"Invalid security question: {sq.question}")
        hashed_security_questions.append({
            "question": sq.question,
            "answer_hash": pwd_context.hash(sq.answer.lower().strip())
        })
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_password = pwd_context.hash(data.password)
    
    user_doc = {
        "user_id": user_id,
        "email": data.email.lower(),
        "username": data.email.lower().split("@")[0],
        "name": data.name,
        "password_hash": hashed_password,
        "security_questions": hashed_security_questions,
        "picture": None,
        "auth_provider": "local",
        "school_id": school["school_id"],
        "school_role": "member",  # New users are members
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Create session
    session_token = f"session_{secrets.token_urlsafe(32)}"
    session_doc = {
        "session_token": session_token,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 24 * 30
    )
    
    return {
        "session_token": session_token,
        "user": {
            "user_id": user_id,
            "email": data.email.lower(),
            "name": data.name,
            "school_id": school["school_id"],
            "school_role": "member"
        },
        "school": {
            "school_id": school["school_id"],
            "name": school["name"]
        }
    }

@api_router.get("/schools/my-school")
async def get_my_school(current_user: User = Depends(get_current_user)):
    """Get the current user's school"""
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not user or not user.get("school_id"):
        raise HTTPException(status_code=404, detail="User is not part of any school")
    
    school = await db.schools.find_one(
        {"school_id": user["school_id"]},
        {"_id": 0}
    )
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    return {
        **school,
        "user_role": user.get("school_role", "member")
    }

@api_router.get("/schools/{school_id}/members")
async def get_school_members(school_id: str, current_user: User = Depends(get_current_user)):
    """Get all members of a school (admin only)"""
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not user or user.get("school_id") != school_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    members = await db.users.find(
        {"school_id": school_id},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1, "school_role": 1, "created_at": 1}
    ).to_list(100)
    
    return members

@api_router.put("/schools/{school_id}/members/{user_id}/role")
async def update_member_role(
    school_id: str, 
    user_id: str, 
    data: UpdateMemberRole,
    current_user: User = Depends(get_current_user)
):
    """Update a member's role (admin only, max 3 admins)"""
    # Check if current user is admin of this school
    admin = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not admin or admin.get("school_id") != school_id or admin.get("school_role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can change member roles")
    
    # Get target user
    target = await db.users.find_one({"user_id": user_id, "school_id": school_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found in this school")
    
    # Validate role
    if data.role not in ["admin", "member"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Check max admins (3)
    if data.role == "admin":
        admin_count = await db.users.count_documents(
            {"school_id": school_id, "school_role": "admin"}
        )
        if target.get("school_role") != "admin" and admin_count >= 3:
            raise HTTPException(status_code=400, detail="Maximum of 3 admins allowed per school")
    
    # Update role
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"school_role": data.role, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "new_role": data.role}

@api_router.put("/schools/{school_id}")
async def update_school(school_id: str, request: Request, current_user: User = Depends(get_current_user)):
    """Update school details (admin only)"""
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not user or user.get("school_id") != school_id or user.get("school_role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update school details")
    
    data = await request.json()
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    # Update allowed fields
    if "name" in data:
        new_name = data["name"].strip()
        if new_name:
            # Check if name is already taken by another school
            existing = await db.schools.find_one({
                "name_lower": new_name.lower(),
                "school_id": {"$ne": school_id}
            })
            if existing:
                raise HTTPException(status_code=400, detail="School name already taken")
            update_data["name"] = new_name
            update_data["name_lower"] = new_name.lower()
    
    if "state" in data:
        update_data["state"] = data["state"]
    
    if "logo_url" in data:
        update_data["logo_url"] = data["logo_url"]
    
    if "primary_color" in data:
        update_data["primary_color"] = data["primary_color"]
    
    await db.schools.update_one(
        {"school_id": school_id},
        {"$set": update_data}
    )
    
    return {"success": True}

@api_router.post("/schools/{school_id}/regenerate-invite")
async def regenerate_invite_code(school_id: str, current_user: User = Depends(get_current_user)):
    """Regenerate the invite code for a school (admin only)"""
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not user or user.get("school_id") != school_id or user.get("school_role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can regenerate invite codes")
    
    new_code = secrets.token_urlsafe(16)
    await db.schools.update_one(
        {"school_id": school_id},
        {"$set": {"invite_code": new_code, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"invite_code": new_code}

# ============ SEASONS ROUTES ============

@api_router.post("/schools/{school_id}/seasons")
async def create_season(school_id: str, data: SeasonCreate, current_user: User = Depends(get_current_user)):
    """Create a new season for a school"""
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not user or user.get("school_id") != school_id or user.get("school_role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create seasons")
    
    if data.sport not in ["basketball", "football"]:
        raise HTTPException(status_code=400, detail="Sport must be 'basketball' or 'football'")
    
    if data.gender not in ["men", "women"]:
        raise HTTPException(status_code=400, detail="Gender must be 'men' or 'women'")
    
    if data.level not in ["varsity", "subvarsity"]:
        raise HTTPException(status_code=400, detail="Level must be 'varsity' or 'subvarsity'")
    
    season_id = f"season_{uuid.uuid4().hex[:12]}"
    
    season_doc = {
        "season_id": season_id,
        "school_id": school_id,
        "name": data.name,
        "sport": data.sport,
        "gender": data.gender or "men",
        "level": data.level or "varsity",
        "team_id": None,  # Will be set when roster is uploaded
        "created_by": current_user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.seasons.insert_one(season_doc)
    
    # Remove MongoDB _id before returning
    season_doc.pop("_id", None)
    return {"season_id": season_id, **season_doc}

@api_router.get("/schools/{school_id}/seasons")
async def get_school_seasons(school_id: str, current_user: User = Depends(get_current_user)):
    """Get all seasons for a school"""
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not user or user.get("school_id") != school_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    seasons = await db.seasons.find(
        {"school_id": school_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return seasons

@api_router.get("/schools/{school_id}/seasons/{season_id}")
async def get_season(school_id: str, season_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific season"""
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not user or user.get("school_id") != school_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    season = await db.seasons.find_one(
        {"season_id": season_id, "school_id": school_id},
        {"_id": 0}
    )
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    
    # Get the team if exists
    team = None
    if season.get("team_id"):
        team = await db.teams.find_one({"id": season["team_id"]}, {"_id": 0})
    
    # Get games for this season
    games = await db.games.find(
        {"season_id": season_id},
        {"_id": 0}
    ).sort("scheduled_date", 1).to_list(100)
    
    return {
        **season,
        "team": team,
        "games": games
    }

@api_router.put("/schools/{school_id}/seasons/{season_id}/team")
async def set_season_team(
    school_id: str, 
    season_id: str, 
    team_id: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user)
):
    """Set the team for a season"""
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not user or user.get("school_id") != school_id or user.get("school_role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update seasons")
    
    # Verify team exists and belongs to this school
    team = await db.teams.find_one({"id": team_id, "school_id": school_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    await db.seasons.update_one(
        {"season_id": season_id, "school_id": school_id},
        {"$set": {"team_id": team_id, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True}

class SeasonUpdate(BaseModel):
    name: Optional[str] = None

class SeasonDelete(BaseModel):
    password: str

@api_router.put("/schools/{school_id}/seasons/{season_id}")
async def update_season(
    school_id: str, 
    season_id: str, 
    data: SeasonUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a season's details"""
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not user or user.get("school_id") != school_id or user.get("school_role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update seasons")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if data.name:
        update_data["name"] = data.name.strip()
    
    await db.seasons.update_one(
        {"season_id": season_id, "school_id": school_id},
        {"$set": update_data}
    )
    
    return {"success": True}

@api_router.delete("/schools/{school_id}/seasons/{season_id}")
async def delete_season(
    school_id: str, 
    season_id: str,
    data: SeasonDelete,
    current_user: User = Depends(get_current_user)
):
    """Delete a season and all associated data (games, stats). Requires password confirmation."""
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not user or user.get("school_id") != school_id or user.get("school_role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete seasons")
    
    # Verify password
    if not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Incorrect password")
    
    # Get the season first
    season = await db.seasons.find_one({"season_id": season_id, "school_id": school_id})
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    
    # Delete all games for this season
    await db.games.delete_many({"season_id": season_id})
    
    # Delete the season
    await db.seasons.delete_one({"season_id": season_id, "school_id": school_id})
    
    return {"success": True, "message": "Season and all associated games deleted"}

@api_router.get("/schools/{school_id}/rosters")
async def get_school_rosters(school_id: str, current_user: User = Depends(get_current_user)):
    """Get all rosters from all seasons for a school (for roster duplication)"""
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not user or user.get("school_id") != school_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get all seasons for this school that have a team_id
    seasons = await db.seasons.find(
        {"school_id": school_id, "team_id": {"$exists": True, "$ne": None}},
        {"_id": 0}
    ).to_list(100)
    
    rosters = []
    for season in seasons:
        team = await db.teams.find_one({"id": season["team_id"]}, {"_id": 0})
        if team and team.get("roster"):
            rosters.append({
                "season_id": season["season_id"],
                "season_name": season["name"],
                "sport": season.get("sport", ""),
                "gender": season.get("gender", ""),
                "level": season.get("level", ""),
                "team_id": season["team_id"],
                "team_name": team.get("name", ""),
                "roster": team.get("roster", []),
                "player_count": len(team.get("roster", []))
            })
    
    return rosters

@api_router.get("/schools/search")
async def search_schools(
    q: str = "",
    sport: Optional[str] = None,
    gender: Optional[str] = None,
    level: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Search for schools by name or school code. Can filter by sport/gender/level to find matching seasons."""
    if not q or len(q) < 2:
        return []
    
    # Search by school code (exact, case-insensitive) or school name (partial, case-insensitive)
    schools = await db.schools.find(
        {
            "$or": [
                {"school_code": q.upper()},
                {"name_lower": {"$regex": q.lower(), "$options": "i"}}
            ]
        },
        {"_id": 0, "school_id": 1, "school_code": 1, "name": 1, "logo_url": 1, "primary_color": 1, "state": 1}
    ).limit(10).to_list(10)
    
    result = []
    for school in schools:
        school_data = {
            "school_id": school["school_id"],
            "school_code": school.get("school_code", ""),
            "name": school["name"],
            "logo_url": school.get("logo_url"),
            "primary_color": school.get("primary_color"),
            "state": school.get("state"),
            "matching_seasons": []
        }
        
        # If sport/gender/level filters provided, find matching seasons
        if sport:
            season_filter = {"school_id": school["school_id"], "sport": sport}
            if gender:
                season_filter["gender"] = gender
            if level:
                season_filter["level"] = level
            
            matching_seasons = await db.seasons.find(
                season_filter,
                {"_id": 0, "season_id": 1, "name": 1, "sport": 1, "gender": 1, "level": 1}
            ).to_list(10)
            school_data["matching_seasons"] = matching_seasons
        
        result.append(school_data)
    
    return result

# ============ SCHOOL TEAMS ROUTES ============

@api_router.post("/schools/{school_id}/teams")
async def create_school_team(school_id: str, data: SchoolTeamCreate, current_user: User = Depends(get_current_user)):
    """Create a team for a school (opponent or own team)"""
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not user or user.get("school_id") != school_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Only admins can create teams
    if user.get("school_role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create teams")
    
    if data.sport not in ["basketball", "football"]:
        raise HTTPException(status_code=400, detail="Sport must be 'basketball' or 'football'")
    
    team_id = f"team_{uuid.uuid4().hex[:12]}"
    
    team_doc = {
        "id": team_id,
        "name": data.name,
        "sport": data.sport,
        "color": data.color,
        "logo": None,
        "roster": data.roster or [],
        "school_id": school_id,
        "user_id": current_user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.teams.insert_one(team_doc)
    
    # Remove MongoDB _id before returning
    team_doc.pop("_id", None)
    return team_doc

@api_router.get("/schools/{school_id}/teams")
async def get_school_teams(
    school_id: str, 
    sport: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all teams for a school, optionally filtered by sport"""
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not user or user.get("school_id") != school_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = {"school_id": school_id}
    if sport:
        query["sport"] = sport
    
    teams = await db.teams.find(query, {"_id": 0}).sort("name", 1).to_list(100)
    return teams

@api_router.put("/schools/{school_id}/teams/{team_id}")
async def update_school_team(
    school_id: str,
    team_id: str,
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Update a school team (admin only)"""
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not user or user.get("school_id") != school_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if user.get("school_role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update teams")
    
    # Verify team belongs to this school
    team = await db.teams.find_one({"id": team_id, "school_id": school_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    data = await request.json()
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if "name" in data:
        update_data["name"] = data["name"]
    if "color" in data:
        update_data["color"] = data["color"]
    if "logo_url" in data:
        update_data["logo_url"] = data["logo_url"]
    if "roster" in data:
        update_data["roster"] = data["roster"]
    
    await db.teams.update_one(
        {"id": team_id, "school_id": school_id},
        {"$set": update_data}
    )
    
    return {"success": True}

@api_router.get("/schools/{school_id}/teams/{team_id}")
async def get_school_team(
    school_id: str,
    team_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific school team"""
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not user or user.get("school_id") != school_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    team = await db.teams.find_one({"id": team_id, "school_id": school_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    return team

# ============ SCHOOL GAMES ROUTES ============

@api_router.get("/schools/{school_id}/seasons/{season_id}/games")
async def get_season_games(school_id: str, season_id: str, current_user: User = Depends(get_current_user)):
    """Get all games for a season"""
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not user or user.get("school_id") != school_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    games = await db.games.find(
        {"season_id": season_id, "school_id": school_id},
        {"_id": 0}
    ).sort("scheduled_date", 1).to_list(500)
    
    return games

@api_router.post("/schools/{school_id}/seasons/{season_id}/games")
async def create_school_game(
    school_id: str, 
    season_id: str, 
    data: SchoolGameCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a game for a season"""
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not user or user.get("school_id") != school_id or user.get("school_role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create games")
    
    # Get season
    season = await db.seasons.find_one({"season_id": season_id, "school_id": school_id}, {"_id": 0})
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    
    if not season.get("team_id"):
        raise HTTPException(status_code=400, detail="Season must have a team set before creating games")
    
    # Get school's team
    school_team = await db.teams.find_one({"id": season["team_id"]}, {"_id": 0})
    if not school_team:
        raise HTTPException(status_code=404, detail="School team not found")
    
    # Get opponent team
    opponent_team = await db.teams.find_one({"id": data.opponent_team_id}, {"_id": 0})
    if not opponent_team:
        raise HTTPException(status_code=404, detail="Opponent team not found")
    
    game_id = f"game_{uuid.uuid4().hex[:12]}"
    share_code = secrets.token_urlsafe(8)
    
    # Determine home/away based on is_home_game
    if data.is_home_game:
        home_team_id = season["team_id"]
        home_team_name = school_team["name"]
        home_team_color = school_team.get("color", "#000000")
        away_team_id = data.opponent_team_id
        away_team_name = opponent_team["name"]
        away_team_color = opponent_team.get("color", "#666666")
    else:
        home_team_id = data.opponent_team_id
        home_team_name = opponent_team["name"]
        home_team_color = opponent_team.get("color", "#666666")
        away_team_id = season["team_id"]
        away_team_name = school_team["name"]
        away_team_color = school_team.get("color", "#000000")
    
    # Initialize player stats from rosters
    home_roster = school_team.get("roster", []) if data.is_home_game else opponent_team.get("roster", [])
    away_roster = opponent_team.get("roster", []) if data.is_home_game else school_team.get("roster", [])
    
    default_player_stats = {
        "fg2_made": 0, "fg2_missed": 0, "fg3_made": 0, "fg3_missed": 0,
        "ft_made": 0, "ft_missed": 0, "offensive_rebounds": 0, "defensive_rebounds": 0,
        "assists": 0, "steals": 0, "blocks": 0, "turnovers": 0, "fouls": 0,
        "is_active": True, "seconds_played": 0
    }
    
    home_player_stats = [
        {"id": p.get("id", f"player_{uuid.uuid4().hex[:8]}"), "player_number": p.get("number", ""), 
         "player_name": p.get("name", ""), **default_player_stats}
        for p in home_roster
    ]
    away_player_stats = [
        {"id": p.get("id", f"player_{uuid.uuid4().hex[:8]}"), "player_number": p.get("number", ""),
         "player_name": p.get("name", ""), **default_player_stats}
        for p in away_roster
    ]
    
    game_doc = {
        "id": game_id,
        "user_id": current_user.user_id,
        "school_id": school_id,
        "season_id": season_id,
        "sport": season["sport"],
        "home_team_id": home_team_id,
        "home_team_name": home_team_name,
        "home_team_color": home_team_color,
        "away_team_id": away_team_id,
        "away_team_name": away_team_name,
        "away_team_color": away_team_color,
        "scheduled_date": data.scheduled_date,
        "scheduled_time": data.scheduled_time,
        "location": data.location,
        "note": data.note,
        "status": "scheduled",
        "share_code": share_code,
        "current_quarter": 1,
        "quarter_scores": {"home": [0, 0, 0, 0], "away": [0, 0, 0, 0]},
        "home_player_stats": home_player_stats,
        "away_player_stats": away_player_stats,
        "play_by_play": [],
        "clock_enabled": True,
        "period_duration": 480 if season["sport"] == "basketball" else 900,
        "period_label": "Quarter" if season["sport"] == "basketball" else "Quarter",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.games.insert_one(game_doc)
    
    # Remove MongoDB _id before returning
    game_doc.pop("_id", None)
    return {"game_id": game_id, **game_doc}

@api_router.get("/schools/{school_id}/games")
async def get_school_games(
    school_id: str, 
    season_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all games for a school, optionally filtered by season"""
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not user or user.get("school_id") != school_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = {"school_id": school_id}
    if season_id:
        query["season_id"] = season_id
    
    games = await db.games.find(query, {"_id": 0}).sort("scheduled_date", 1).to_list(500)
    return games

@api_router.get("/schools/{school_id}/calendar")
async def get_school_calendar(school_id: str, current_user: User = Depends(get_current_user)):
    """Get all games for the school calendar view"""
    user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not user or user.get("school_id") != school_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get all games for this school
    games = await db.games.find(
        {"school_id": school_id},
        {"_id": 0, "id": 1, "sport": 1, "home_team_name": 1, "away_team_name": 1, 
         "scheduled_date": 1, "scheduled_time": 1, "status": 1, "season_id": 1,
         "location": 1, "share_code": 1, "home_score": 1, "away_score": 1, 
         "current_period": 1, "note": 1}
    ).sort("scheduled_date", 1).to_list(500)
    
    # Get all seasons to map names
    seasons = await db.seasons.find(
        {"school_id": school_id},
        {"_id": 0, "season_id": 1, "name": 1, "sport": 1}
    ).to_list(100)
    
    season_map = {s["season_id"]: s for s in seasons}
    
    # Enrich games with season info
    for game in games:
        if game.get("season_id") and game["season_id"] in season_map:
            game["season_name"] = season_map[game["season_id"]]["name"]
    
    return {"games": games, "seasons": seasons}

# Import and include payments router BEFORE including api_router in app
from routers.payments import router as payments_router, set_db as set_payments_db
api_router.include_router(payments_router)
set_payments_db(db)

# Include router after all routes are defined
app.include_router(api_router)

# ============ STRIPE WEBHOOK ENDPOINT ============
@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        
        stripe_api_key = os.environ.get("STRIPE_API_KEY")
        if not stripe_api_key:
            raise HTTPException(status_code=500, detail="Stripe API key not configured")
        
        host_url = str(request.base_url).rstrip("/")
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        
        # Get request body
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        # Handle webhook
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        logger.info(f"Stripe webhook received: {webhook_response.event_type}")
        
        # Process webhook event
        if webhook_response.event_type == "checkout.session.completed":
            session_id = webhook_response.session_id
            if session_id:
                # Update transaction status
                transaction = await db.payment_transactions.find_one(
                    {"session_id": session_id},
                    {"_id": 0}
                )
                if transaction and transaction.get("payment_status") != "paid":
                    await db.payment_transactions.update_one(
                        {"session_id": session_id},
                        {"$set": {
                            "status": "complete",
                            "payment_status": "paid",
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    
                    # Activate subscription for user
                    user_id = transaction.get("user_id")
                    if user_id:
                        interval = transaction.get("interval", "month")
                        subscription_end = datetime.now(timezone.utc)
                        if interval == "year":
                            subscription_end = subscription_end + timedelta(days=365)
                        else:
                            subscription_end = subscription_end + timedelta(days=30)
                        
                        await db.users.update_one(
                            {"user_id": user_id},
                            {"$set": {
                                "subscription_status": "active",
                                "subscription_package": transaction.get("package_id"),
                                "subscription_start": datetime.now(timezone.utc).isoformat(),
                                "subscription_end": subscription_end.isoformat(),
                                "updated_at": datetime.now(timezone.utc).isoformat()
                            }}
                        )
                        logger.info(f"Webhook: Activated subscription for user: {user_id}")
        
        return {"received": True}
        
    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
        return {"received": True, "error": str(e)}

@app.on_event("startup")
async def startup_init():
    """Initialize on startup - verify database and create admin user"""
    try:
        # Test database connection first
        await db.command('ping')
        logger.info("Database connection verified")
        
        # Initialize admin user
        result = await ensure_admin_user()
        logger.info(f"Admin user initialization: {result}")
        
        # Log startup complete
        user_count = await db.users.count_documents({})
        logger.info(f"Startup complete. Users in database: {user_count}")
    except Exception as e:
        logger.error(f"Startup initialization failed: {e}")
        # Don't raise - let the server start anyway so health checks can report status

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
