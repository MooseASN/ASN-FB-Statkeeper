"""Event/Tournament management routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone

from ..utils.database import db
from ..utils.auth import get_current_user, User
from ..models.game_models import Event, EventCreate

router = APIRouter(prefix="/events", tags=["events"])


@router.get("")
async def get_events(sport: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get all events for the current user including shared access events"""
    query = {"user_id": user.user_id}
    if sport:
        query["sport"] = sport
    own_events = await db.events.find(query, {"_id": 0}).to_list(100)
    
    shared_access_records = await db.shared_access.find(
        {"shared_with_user_id": user.user_id, "is_active": True},
        {"owner_user_id": 1}
    ).to_list(100)
    
    shared_events = []
    for record in shared_access_records:
        shared_query = {"user_id": record["owner_user_id"]}
        if sport:
            shared_query["sport"] = sport
        owner_events = await db.events.find(shared_query, {"_id": 0}).to_list(100)
        for event in owner_events:
            event["is_shared"] = True
            event["shared_from_user_id"] = record["owner_user_id"]
        shared_events.extend(owner_events)
    
    return own_events + shared_events


@router.get("/{event_id}")
async def get_event(event_id: str, user: User = Depends(get_current_user)):
    """Get a single event with its games"""
    event = await db.events.find_one({"id": event_id, "user_id": user.user_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    game_ids = event.get("game_ids", [])
    games = await db.games.find({"id": {"$in": game_ids}}, {"_id": 0}).to_list(None) if game_ids else []
    games.sort(key=lambda g: (g.get("scheduled_date") or "9999-12-31", g.get("scheduled_time") or "23:59"))
    
    return {**event, "games": games}


@router.get("/{event_id}/public")
async def get_event_public(event_id: str):
    """Get event info and games for public display (ticker)"""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    game_ids = event.get("game_ids", [])
    raw_games = await db.games.find({"id": {"$in": game_ids}}, {"_id": 0}).to_list(None) if game_ids else []
    
    games = []
    for game in raw_games:
        home_score = sum(game.get("quarter_scores", {}).get("home", [0, 0, 0, 0]))
        away_score = sum(game.get("quarter_scores", {}).get("away", [0, 0, 0, 0]))
        
        # Calculate leading scorers
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
        
        # Generate quick recap
        recap = None
        play_by_play = game.get("play_by_play", [])
        if play_by_play and game.get("status") != "scheduled":
            quarter_scores = game.get("quarter_scores", {"home": [0,0,0,0], "away": [0,0,0,0]})
            home_qs = quarter_scores.get("home", [0,0,0,0])
            away_qs = quarter_scores.get("away", [0,0,0,0])
            
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
    
    games.sort(key=lambda g: (g.get("scheduled_date") or "9999-12-31", g.get("scheduled_time") or "23:59"))
    
    return {
        "id": event["id"],
        "name": event["name"],
        "location": event.get("location"),
        "logo_data": event.get("logo_data"),
        "color": event.get("color", "#000000"),
        "games": games
    }


@router.get("/{event_id}/current-game")
async def get_event_current_game(event_id: str):
    """Get the current/most relevant game for an event."""
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    games = []
    for game_id in event.get("game_ids", []):
        game = await db.games.find_one({"id": game_id}, {"_id": 0})
        if game:
            games.append(game)
    
    if not games:
        raise HTTPException(status_code=404, detail="No games in this event")
    
    # 1. Active games first
    active_games = [g for g in games if g.get("status") == "active"]
    if active_games:
        return {"share_code": active_games[0].get("share_code"), "game_id": active_games[0].get("id")}
    
    # 2. Upcoming scheduled games
    scheduled_games = [g for g in games if g.get("status") == "scheduled"]
    if scheduled_games:
        scheduled_games.sort(key=lambda g: (g.get("scheduled_date") or "9999-12-31", g.get("scheduled_time") or "23:59"))
        return {"share_code": scheduled_games[0].get("share_code"), "game_id": scheduled_games[0].get("id")}
    
    # 3. Most recent final game
    final_games = [g for g in games if g.get("status") == "final"]
    if final_games:
        final_games.sort(key=lambda g: (g.get("scheduled_date") or "0000-01-01", g.get("scheduled_time") or "00:00"), reverse=True)
        return {"share_code": final_games[0].get("share_code"), "game_id": final_games[0].get("id")}
    
    return {"share_code": games[0].get("share_code"), "game_id": games[0].get("id")}


@router.post("")
async def create_event(event_data: EventCreate, user: User = Depends(get_current_user)):
    """Create a new event"""
    event = Event(
        name=event_data.name,
        location=event_data.location,
        start_date=event_data.start_date,
        end_date=event_data.end_date or event_data.start_date,
        logo_data=event_data.logo_data,
        color=event_data.color,
        sport=event_data.sport
    )
    event.user_id = user.user_id
    
    doc = event.model_dump()
    await db.events.insert_one(doc)
    return event


@router.put("/{event_id}")
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


@router.delete("/{event_id}")
async def delete_event(event_id: str, user: User = Depends(get_current_user)):
    """Delete an event (does not delete the games)"""
    event = await db.events.find_one({"id": event_id, "user_id": user.user_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    for game_id in event.get("game_ids", []):
        await db.games.update_one(
            {"id": game_id},
            {"$set": {"event_id": None}}
        )
    
    await db.events.delete_one({"id": event_id, "user_id": user.user_id})
    return {"message": "Event deleted"}


@router.post("/{event_id}/games/{game_id}")
async def add_game_to_event(event_id: str, game_id: str, user: User = Depends(get_current_user)):
    """Add a game to an event"""
    event = await db.events.find_one({"id": event_id, "user_id": user.user_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    game = await db.games.find_one({"id": game_id, "user_id": user.user_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game_id not in event.get("game_ids", []):
        await db.events.update_one(
            {"id": event_id, "user_id": user.user_id},
            {"$push": {"game_ids": game_id}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    await db.games.update_one(
        {"id": game_id},
        {"$set": {"event_id": event_id}}
    )
    
    return {"message": "Game added to event"}


@router.delete("/{event_id}/games/{game_id}")
async def remove_game_from_event(event_id: str, game_id: str, user: User = Depends(get_current_user)):
    """Remove a game from an event (does not delete the game)"""
    event = await db.events.find_one({"id": event_id, "user_id": user.user_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    await db.events.update_one(
        {"id": event_id, "user_id": user.user_id},
        {"$pull": {"game_ids": game_id}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await db.games.update_one(
        {"id": game_id},
        {"$set": {"event_id": None}}
    )
    
    return {"message": "Game removed from event"}
