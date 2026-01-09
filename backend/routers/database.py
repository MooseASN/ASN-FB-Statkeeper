"""
Database and shared utilities for StatMoose API
"""
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import bcrypt as bcrypt_lib
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing - use bcrypt directly for better compatibility
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Helper function to verify password using bcrypt directly
def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt_lib.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

# Helper function to hash password
def hash_password(password: str) -> str:
    return bcrypt_lib.hashpw(password.encode('utf-8'), bcrypt_lib.gensalt()).decode('utf-8')

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

# US States list
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
