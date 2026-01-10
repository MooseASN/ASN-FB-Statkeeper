"""
Authentication Router
Handles user authentication, registration, password reset, and session management
"""
from fastapi import APIRouter, HTTPException, Request, Response, Depends, Cookie
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import bcrypt as bcrypt_lib
import uuid
import secrets
import logging

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/auth", tags=["authentication"])

# MongoDB connection - will be set by main app
db = None
pwd_context = None

def set_dependencies(database, password_context):
    """Set dependencies from main app"""
    global db, pwd_context
    db = database
    pwd_context = password_context

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

# Reserved emails and usernames (admin accounts)
RESERVED_EMAILS = ["antlersportsnetwork@gmail.com", "jared@antlersn.com"]
RESERVED_USERNAMES = ["admin"]

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
    auth_provider: str = "local"

class SecurityQuestionCheckRequest(BaseModel):
    email: str

class SecurityQuestionVerifyRequest(BaseModel):
    email: str
    question: str
    answer: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    password: str

# ============ HELPER FUNCTIONS ============

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password using passlib for robust compatibility"""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Password verification exception: {e}")
        try:
            return bcrypt_lib.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception:
            return False

def hash_password(password: str) -> str:
    """Hash password using passlib for consistency"""
    return pwd_context.hash(password)

async def get_current_user(request: Request, session_token: Optional[str] = Cookie(default=None)) -> User:
    """Get current authenticated user from session token (cookie or header)"""
    token = session_token
    
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
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

@router.post("/register")
async def register(user_data: UserRegister, response: Response):
    """Register a new user with email/username/password and security questions"""
    if user_data.email.lower() in RESERVED_EMAILS:
        raise HTTPException(status_code=400, detail="This email is reserved")
    
    if user_data.username.lower() in RESERVED_USERNAMES:
        raise HTTPException(status_code=400, detail="This username is reserved")
    
    existing_email = await db.users.find_one({"email": user_data.email.lower()}, {"_id": 0})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    existing_username = await db.users.find_one({"username": user_data.username.lower()}, {"_id": 0})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    if len(user_data.security_questions) < 2:
        raise HTTPException(status_code=400, detail="Please answer at least 2 security questions")
    
    hashed_security_questions = []
    for sq in user_data.security_questions:
        if sq.question not in SECURITY_QUESTIONS:
            raise HTTPException(status_code=400, detail=f"Invalid security question: {sq.question}")
        hashed_security_questions.append({
            "question": sq.question,
            "answer_hash": pwd_context.hash(sq.answer.lower().strip())
        })
    
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
    
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=30),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=30 * 24 * 60 * 60
    )
    
    return {
        "user_id": user_id,
        "email": user_data.email.lower(),
        "username": user_data.username.lower(),
        "name": user_data.name or user_data.username,
        "session_token": session_token
    }

@router.post("/login")
async def login(credentials: UserLogin, response: Response):
    """Login with email OR username and password"""
    login_identifier = credentials.email.lower().strip()
    logger.info(f"Login attempt for: {login_identifier}")
    
    user = await db.users.find_one({"email": login_identifier}, {"_id": 0})
    
    if not user:
        user = await db.users.find_one({"username": login_identifier}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found. Please check your email/username.")
    
    if user.get("auth_provider") == "google":
        raise HTTPException(status_code=400, detail="This account uses Google login. Please sign in with Google.")
    
    stored_hash = user.get("password_hash", "")
    
    if not stored_hash:
        raise HTTPException(status_code=401, detail="Account has no password set. Please use 'Forgot Password'.")
    
    if not verify_password(credentials.password, stored_hash):
        raise HTTPException(status_code=401, detail="Incorrect password. Please try again.")
    
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=30),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_doc)
    
    logger.info(f"Login successful for: {login_identifier}")
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=30 * 24 * 60 * 60
    )
    
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "username": user.get("username", ""),
        "name": user.get("name", ""),
        "session_token": session_token
    }

@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    return {
        "user_id": user.user_id,
        "email": user.email,
        "username": user.username,
        "name": user.name,
        "picture": user.picture
    }

@router.post("/logout")
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

@router.get("/security-questions")
async def get_security_questions():
    """Get list of available security questions"""
    return {"questions": SECURITY_QUESTIONS}

@router.post("/security-question/get")
async def get_user_security_question(data: SecurityQuestionCheckRequest):
    """Get a random security question for a user (for password reset)"""
    import random
    
    email = data.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if not user:
        return {"question": random.choice(SECURITY_QUESTIONS), "has_questions": False}
    
    security_questions = user.get("security_questions", [])
    if not security_questions:
        return {"question": None, "has_questions": False, "message": "No security questions set"}
    
    selected = random.choice(security_questions)
    return {"question": selected["question"], "has_questions": True}

@router.post("/security-question/verify")
async def verify_security_question(request: Request, data: SecurityQuestionVerifyRequest):
    """Verify security question answer and generate reset link"""
    email = data.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid answer")
    
    security_questions = user.get("security_questions", [])
    
    matched_question = None
    for sq in security_questions:
        if sq["question"] == data.question:
            matched_question = sq
            break
    
    if not matched_question:
        raise HTTPException(status_code=400, detail="Invalid answer")
    
    if not pwd_context.verify(data.answer.lower().strip(), matched_question["answer_hash"]):
        raise HTTPException(status_code=400, detail="Invalid answer")
    
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await db.password_resets.delete_many({"user_id": user["user_id"]})
    await db.password_resets.insert_one({
        "user_id": user["user_id"],
        "token": reset_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    origin = request.headers.get("origin")
    if not origin:
        import os
        origin = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    reset_url = f"{origin}/reset-password?token={reset_token}"
    
    return {
        "message": "Security question verified successfully.",
        "reset_link": reset_url
    }

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """Check if user exists and has security questions"""
    email = data.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if not user:
        return {"exists": False, "has_security_questions": False}
    
    security_questions = user.get("security_questions", [])
    return {
        "exists": True,
        "has_security_questions": len(security_questions) > 0
    }

@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    """Reset password with token"""
    reset_record = await db.password_resets.find_one({"token": data.token}, {"_id": 0})
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    expires_at = reset_record["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        await db.password_resets.delete_one({"token": data.token})
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    hashed_password = pwd_context.hash(data.password)
    await db.users.update_one(
        {"user_id": reset_record["user_id"]},
        {"$set": {"password_hash": hashed_password}}
    )
    
    await db.password_resets.delete_one({"token": data.token})
    await db.user_sessions.delete_many({"user_id": reset_record["user_id"]})
    
    return {"message": "Password has been reset successfully. Please log in with your new password."}

@router.get("/verify-reset-token/{token}")
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
