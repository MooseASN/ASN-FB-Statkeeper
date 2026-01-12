"""
Support Chatbot Router - Marty the StatMoose Support Bot
Uses OpenAI GPT-4o-mini for answering user questions about StatMoose
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import os
import logging
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/support-chat", tags=["support"])

# MongoDB connection - will be set by main app
db = None

def set_db(database):
    """Set the database connection from main app"""
    global db
    db = database

# System prompt for Marty the StatMoose
MARTY_SYSTEM_PROMPT = """You are Marty the StatMoose, the friendly and helpful support mascot for StatMoose - a multi-sport stat tracking application for basketball, football, and baseball.

Your personality:
- Friendly, enthusiastic, and helpful
- Occasionally make moose-related puns (but don't overdo it!)
- Always positive and encouraging
- Keep responses concise but thorough

About StatMoose:
StatMoose is a web application that allows users to track live game statistics for basketball, football, and baseball. Key features include:

SUBSCRIPTION TIERS:
- Bronze (Free): Unlimited teams & games, PDF box scores, simple + advanced stat tracking, play-by-play logging
- Silver ($15/month, 14-day free trial): Everything in Bronze + public live stats pages, embed widgets, 5 sponsor banner slots, CSV export
- Gold ($20/month, 14-day free trial): Everything in Silver + shared access (invite staff), custom branding, unlimited sponsor banners, custom team logos, priority support

CORE FEATURES:
1. Team Management: Create teams, add rosters with player numbers and positions
2. Live Game Tracking: Track stats in real-time for any sport
3. Basketball: Track points, FG, 3PT, FT, rebounds (offensive/defensive), assists, steals, blocks, turnovers, fouls
4. Football Simple Mode: Quick score tracking with touchdowns, field goals, safeties, PAT/2-point conversions
5. Football Advanced Mode: Full play-by-play with down & distance, run/pass plays, penalties, and detailed player stats
6. Baseball: Track at-bats, hits (1B, 2B, 3B, HR), outs, walks, base running, pitching stats
7. Undo/Redo: Undo the last 20 actions and redo if needed
8. PDF Box Scores: Generate professional PDF game summaries
9. Live Sharing: Share live stats links with parents and fans
10. Embed Widgets: Embed live stats on websites (Silver+ tiers)
11. Season/Event Organization: Organize games by seasons and events

ACCOUNT MANAGEMENT:
- Account Settings: Change display name, username, email, and password (requires security question verification)
- Subscription Management: View current plan, cancel subscription (at end of billing period), upgrade plans
- Payment Methods: View saved cards, set default, manage via Stripe Billing Portal
- Shared Access: Grant other users access to your teams and games (Gold tier)

KEYBOARD SHORTCUTS:
- SPACE or \\ (backslash): Start/stop game clock in football modes

TIPS:
- Use a tablet for best sideline stat-keeping experience
- Set up rosters before game day to save time
- Try Demo Mode to practice before your first real game
- Download PDF box scores after each game as a permanent record

TROUBLESHOOTING:
- If stats aren't saving, check your internet connection
- Clear browser cache if pages aren't loading properly
- Supported browsers: Chrome (recommended), Safari, Firefox, Edge
- If payment fails, check card details or contact your bank

If you don't know the answer to something, politely say so and suggest the user contact support through the Contact page for more help.

Keep responses helpful but concise (2-4 short paragraphs max). Always end with asking if there's anything else you can help with."""

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str

@router.post("/message", response_model=ChatResponse)
async def send_chat_message(request: Request, chat_request: ChatRequest):
    """Send a message to Marty the support chatbot"""
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Chat service not configured")
    
    # Get or create session ID
    session_id = chat_request.session_id
    if not session_id:
        # Generate a simple session ID
        import uuid
        session_id = str(uuid.uuid4())
    
    # Get chat history from database if exists
    chat_history = []
    if db is not None:
        history_doc = await db.support_chat_history.find_one(
            {"session_id": session_id},
            {"_id": 0, "messages": 1}
        )
        if history_doc:
            chat_history = history_doc.get("messages", [])
    
    try:
        # Build the conversation history for context
        # Limit to last 10 messages to keep context manageable
        recent_history = chat_history[-10:] if len(chat_history) > 10 else chat_history
        
        # Build context from history
        history_context = ""
        if recent_history:
            history_context = "\n\nPrevious conversation:\n"
            for msg in recent_history:
                role = "User" if msg["role"] == "user" else "Marty"
                history_context += f"{role}: {msg['content']}\n"
        
        # Create full system message with history context
        full_system = MARTY_SYSTEM_PROMPT
        if history_context:
            full_system += history_context
        
        # Initialize the chat
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=full_system
        ).with_model("openai", "gpt-4o-mini")
        
        # Create user message
        user_message = UserMessage(text=chat_request.message)
        
        # Get response
        response = await chat.send_message(user_message)
        
        # Store in database
        if db is not None:
            # Add both user message and response to history
            new_messages = [
                {"role": "user", "content": chat_request.message, "timestamp": datetime.now(timezone.utc).isoformat()},
                {"role": "assistant", "content": response, "timestamp": datetime.now(timezone.utc).isoformat()}
            ]
            
            await db.support_chat_history.update_one(
                {"session_id": session_id},
                {
                    "$push": {"messages": {"$each": new_messages}},
                    "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
                    "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}
                },
                upsert=True
            )
        
        return ChatResponse(response=response, session_id=session_id)
        
    except Exception as e:
        logger.error(f"Error in support chat: {e}")
        raise HTTPException(status_code=500, detail=f"Chat service error: {str(e)}")

@router.delete("/history/{session_id}")
async def clear_chat_history(session_id: str, request: Request):
    """Clear chat history for a session"""
    if db is not None:
        await db.support_chat_history.delete_one({"session_id": session_id})
    return {"success": True, "message": "Chat history cleared"}
