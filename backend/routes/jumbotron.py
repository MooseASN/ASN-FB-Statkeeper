"""Jumbotron mode routes - venue scoreboard displays"""
from fastapi import APIRouter, HTTPException, Depends, Body
from datetime import datetime, timezone
import uuid
import secrets
import httpx
from bs4 import BeautifulSoup

from ..utils.database import db
from ..utils.auth import get_current_user, User
from ..models.game_models import (
    JumbotronConfigCreate, 
    JumbotronConfigUpdate,
    JumbotronDisplay,
    JumbotronScheduleItem
)

router = APIRouter(prefix="/jumbotron", tags=["jumbotron"])


@router.post("/configs")
async def create_jumbotron_config(data: JumbotronConfigCreate, user: User = Depends(get_current_user)):
    """Create a new jumbotron configuration with multiple display outputs"""
    config_id = f"jmb_{uuid.uuid4().hex[:12]}"
    embed_code = f"jmb_{secrets.token_urlsafe(8)}"
    
    displays = []
    for disp in data.displays:
        displays.append({
            "id": disp.id or f"disp_{uuid.uuid4().hex[:8]}",
            "name": disp.name,
            "width": disp.width,
            "height": disp.height,
            "layout": disp.layout
        })
    
    if not displays:
        displays = [{
            "id": f"disp_{uuid.uuid4().hex[:8]}",
            "name": "Main Display",
            "width": data.width,
            "height": data.height,
            "layout": "full"
        }]
    
    schedule = []
    for item in data.schedule:
        schedule.append({
            "id": item.id or f"slot_{uuid.uuid4().hex[:8]}",
            "source_type": item.source_type,
            "source_url": item.source_url,
            "start_time": item.start_time,
            "end_time": item.end_time,
            "label": item.label
        })
    
    config = {
        "id": config_id,
        "user_id": user.user_id,
        "name": data.name,
        "width": data.width,
        "height": data.height,
        "displays": displays,
        "embed_code": embed_code,
        "schedule": schedule,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.jumbotron_configs.insert_one(config)
    config.pop("_id", None)
    
    return config


@router.get("/configs")
async def list_jumbotron_configs(user: User = Depends(get_current_user)):
    """List all jumbotron configurations for the user"""
    configs = await db.jumbotron_configs.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"configs": configs}


@router.get("/configs/{config_id}")
async def get_jumbotron_config(config_id: str, user: User = Depends(get_current_user)):
    """Get a specific jumbotron configuration"""
    config = await db.jumbotron_configs.find_one(
        {"id": config_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    return config


@router.put("/configs/{config_id}")
async def update_jumbotron_config(config_id: str, data: JumbotronConfigUpdate, user: User = Depends(get_current_user)):
    """Update a jumbotron configuration"""
    config = await db.jumbotron_configs.find_one({"id": config_id, "user_id": user.user_id})
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if data.name is not None:
        update_data["name"] = data.name
    if data.width is not None:
        update_data["width"] = data.width
    if data.height is not None:
        update_data["height"] = data.height
    if data.displays is not None:
        displays = []
        for disp in data.displays:
            displays.append({
                "id": disp.id or f"disp_{uuid.uuid4().hex[:8]}",
                "name": disp.name,
                "width": disp.width,
                "height": disp.height,
                "layout": disp.layout
            })
        update_data["displays"] = displays
    if data.schedule is not None:
        schedule = []
        for item in data.schedule:
            schedule.append({
                "id": item.id or f"slot_{uuid.uuid4().hex[:8]}",
                "source_type": item.source_type,
                "source_url": item.source_url,
                "start_time": item.start_time,
                "end_time": item.end_time,
                "label": item.label
            })
        update_data["schedule"] = schedule
    
    await db.jumbotron_configs.update_one(
        {"id": config_id},
        {"$set": update_data}
    )
    
    updated_config = await db.jumbotron_configs.find_one({"id": config_id}, {"_id": 0})
    return updated_config


@router.delete("/configs/{config_id}")
async def delete_jumbotron_config(config_id: str, user: User = Depends(get_current_user)):
    """Delete a jumbotron configuration"""
    result = await db.jumbotron_configs.delete_one({
        "id": config_id,
        "user_id": user.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    return {"success": True, "message": "Configuration deleted"}


@router.get("/embed/{embed_code}")
async def get_jumbotron_embed_data(embed_code: str):
    """Public endpoint to get jumbotron data for embedding (no auth required)"""
    config = await db.jumbotron_configs.find_one(
        {"embed_code": embed_code},
        {"_id": 0}
    )
    
    if not config:
        raise HTTPException(status_code=404, detail="Jumbotron not found")
    
    now = datetime.now(timezone.utc)
    current_source = None
    
    for item in config.get("schedule", []):
        start_time = datetime.fromisoformat(item["start_time"].replace("Z", "+00:00"))
        end_time = None
        if item.get("end_time"):
            end_time = datetime.fromisoformat(item["end_time"].replace("Z", "+00:00"))
        
        if start_time <= now:
            if end_time is None or now <= end_time:
                current_source = item
                break
    
    if not current_source and config.get("schedule"):
        current_source = config["schedule"][0]
    
    return {
        "config": {
            "id": config["id"],
            "name": config["name"],
            "width": config["width"],
            "height": config["height"],
            "embed_code": config["embed_code"]
        },
        "current_source": current_source,
        "schedule": config.get("schedule", [])
    }


@router.post("/parse-prestosports")
async def parse_prestosports_xml(url: str = Body(..., embed=True)):
    """Parse a PrestoSports XML box score URL and return structured game data"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/xml, text/xml, */*",
            }
            response = await client.get(url, headers=headers, follow_redirects=True)
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Failed to fetch XML: HTTP {response.status_code}")
            
            content = response.text
            soup = BeautifulSoup(content, "xml")
            
            game_data = {
                "source_type": "prestosports",
                "source_url": url,
                "sport": "basketball",
                "home_team_name": "",
                "away_team_name": "",
                "home_score": 0,
                "away_score": 0,
                "period": "",
                "home_player_stats": [],
                "away_player_stats": []
            }
            
            # Detect sport from URL
            if "/wbkb/" in url or "/mbkb/" in url or "/bkb/" in url:
                game_data["sport"] = "basketball"
            elif "/fball/" in url or "/fb/" in url:
                game_data["sport"] = "football"
            elif "/base/" in url or "/sball/" in url or "/bsb/" in url:
                game_data["sport"] = "baseball"
            
            teams = soup.find_all("team")
            if teams and len(teams) >= 2:
                for i, team in enumerate(teams[:2]):
                    name = team.get("name") or team.get("id") or f"Team {i+1}"
                    score = 0
                    score_elem = team.find("score") or team.find("linescore")
                    if score_elem:
                        score = int(score_elem.get("score") or score_elem.text or 0)
                    
                    if i == 0:
                        game_data["away_team_name"] = name
                        game_data["away_score"] = score
                    else:
                        game_data["home_team_name"] = name
                        game_data["home_score"] = score
                    
                    players = team.find_all("player")
                    player_stats = []
                    for player in players:
                        stat = {
                            "player_name": player.get("name") or player.get("checkname") or "Unknown",
                            "player_number": player.get("uni") or player.get("number") or "0",
                            "ft_made": int(player.get("ftm") or 0),
                            "ft_missed": int(player.get("fta") or 0) - int(player.get("ftm") or 0),
                            "fg2_made": int(player.get("fgm") or 0) - int(player.get("fgm3") or 0),
                            "fg2_missed": (int(player.get("fga") or 0) - int(player.get("fgm") or 0)) - (int(player.get("fga3") or 0) - int(player.get("fgm3") or 0)),
                            "fg3_made": int(player.get("fgm3") or 0),
                            "fg3_missed": int(player.get("fga3") or 0) - int(player.get("fgm3") or 0),
                            "offensive_rebounds": int(player.get("oreb") or 0),
                            "defensive_rebounds": int(player.get("dreb") or 0),
                            "assists": int(player.get("ast") or 0),
                            "steals": int(player.get("stl") or 0),
                            "blocks": int(player.get("blk") or 0),
                            "turnovers": int(player.get("to") or player.get("turnover") or 0),
                            "fouls": int(player.get("pf") or player.get("foul") or 0)
                        }
                        player_stats.append(stat)
                    
                    if i == 0:
                        game_data["away_player_stats"] = player_stats
                    else:
                        game_data["home_player_stats"] = player_stats
            
            status = soup.find("status")
            if status:
                game_data["period"] = status.get("period") or status.text or ""
            
            return game_data
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Network error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse XML: {str(e)}")


@router.get("/user-games")
async def get_user_games_for_jumbotron(user: User = Depends(get_current_user)):
    """Get user's scheduled and live games for jumbotron selection"""
    games = await db.games.find(
        {
            "user_id": user.user_id,
            "status": {"$in": ["scheduled", "active", "in_progress"]}
        },
        {
            "_id": 0,
            "id": 1,
            "sport": 1,
            "status": 1,
            "home_team_name": 1,
            "away_team_name": 1,
            "share_code": 1,
            "scheduled_date": 1,
            "scheduled_time": 1
        }
    ).sort("scheduled_date", -1).to_list(50)
    
    return {"games": games}
