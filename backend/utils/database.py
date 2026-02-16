"""Database connection and shared utilities"""
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import logging

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'statmoose')
logging.info(f"Connecting to MongoDB: {mongo_url[:30]}... DB: {db_name}")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Primary admin emails
PRIMARY_ADMIN_EMAILS = ["antlersportsnetwork@gmail.com", "jared@antlersn.com"]
