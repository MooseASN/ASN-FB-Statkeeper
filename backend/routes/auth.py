"""Authentication routes"""
from fastapi import APIRouter, HTTPException, Response, Request, Depends, Cookie
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import logging

from ..utils.database import db, PRIMARY_ADMIN_EMAILS
from ..utils.auth import (
    verify_password, 
    hash_password, 
    get_current_user, 
    User,
    SecurityQuestionAnswer,
    pwd_context
)

router = APIRouter(prefix="/auth", tags=["auth"])

# Reserved emails/usernames that can't be registered
RESERVED_EMAILS = ["admin@statmoose.com", "support@statmoose.com"]
RESERVED_USERNAMES = ["admin", "support", "statmoose", "system"]

# Security questions list
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


class UserRegister(BaseModel):
    email: str
    username: str
    password: str
    name: Optional[str] = None
    security_questions: List[SecurityQuestionAnswer] = []


class UserLogin(BaseModel):
    email: str  # Can be email OR username
    password: str


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
    logging.info(f"Login attempt for: {login_identifier}")
    
    user = await db.users.find_one({"email": login_identifier}, {"_id": 0})
    if not user:
        user = await db.users.find_one({"username": login_identifier}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found. Please check your email/username.")
    
    if user.get("auth_provider") == "google":
        raise HTTPException(status_code=400, detail="This account uses Google login. Please sign in with Google.")
    
    stored_hash = user.get("password_hash", "")
    if not stored_hash:
        raise HTTPException(status_code=401, detail="Account has no password set. Please use 'Forgot Password' to set one.")
    
    try:
        password_valid = verify_password(credentials.password, stored_hash)
    except Exception as e:
        logging.error(f"Password verification error: {e}")
        raise HTTPException(status_code=401, detail="Password verification error. Please try again.")
    
    if not password_valid:
        raise HTTPException(status_code=401, detail="Incorrect password. Please try again.")
    
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user["user_id"],
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
    
    user_email = user["email"].lower()
    is_admin = user_email in PRIMARY_ADMIN_EMAILS or user.get("role") == "admin" or user.get("is_admin", False)
    
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "username": user.get("username", ""),
        "name": user.get("name", ""),
        "session_token": session_token,
        "is_admin": is_admin
    }


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    
    user_email = user.email.lower() if user.email else ""
    is_admin = (
        user_email in PRIMARY_ADMIN_EMAILS or 
        (user_doc and user_doc.get("role") == "admin") or 
        (user_doc and user_doc.get("is_admin", False))
    )
    
    return {
        "user_id": user.user_id,
        "email": user.email,
        "username": user.username,
        "name": user.name,
        "picture": user.picture,
        "is_admin": is_admin
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
