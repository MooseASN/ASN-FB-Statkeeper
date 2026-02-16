"""Authentication utilities and helpers"""
from fastapi import HTTPException, Request, Cookie
from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from passlib.context import CryptContext
import bcrypt as bcrypt_lib
import warnings
import logging
from datetime import datetime, timezone

from .database import db, PRIMARY_ADMIN_EMAILS

# Suppress passlib bcrypt version warning
warnings.filterwarnings("ignore", message=".*error reading bcrypt version.*")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password using bcrypt directly for reliability"""
    try:
        return bcrypt_lib.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception as e:
        logging.error(f"Password verification exception: {e}")
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception:
            return False


def hash_password(password: str) -> str:
    """Hash password using bcrypt directly"""
    try:
        salt = bcrypt_lib.gensalt()
        return bcrypt_lib.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    except Exception:
        return pwd_context.hash(password)


# Auth Models
class SecurityQuestionAnswer(BaseModel):
    question: str
    answer: str


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    username: str
    name: Optional[str] = None
    picture: Optional[str] = None
    auth_provider: str = "local"


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
    if session.get("expires_at") and datetime.fromisoformat(session["expires_at"].replace("Z", "+00:00")) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    return User(**session)


async def get_optional_user(request: Request, session_token: Optional[str] = Cookie(default=None)) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    try:
        return await get_current_user(request, session_token)
    except HTTPException:
        return None


async def require_admin(user: User) -> User:
    """Require user to be an admin"""
    if user.email not in PRIMARY_ADMIN_EMAILS:
        admin_record = await db.admins.find_one({"email": user.email})
        if not admin_record:
            raise HTTPException(status_code=403, detail="Admin access required")
    return user
