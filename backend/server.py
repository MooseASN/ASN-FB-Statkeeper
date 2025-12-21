from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
import csv
import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============ MODELS ============

class Player(BaseModel):
    number: str
    name: str

class TeamCreate(BaseModel):
    name: str
    logo_url: Optional[str] = None
    color: str = "#1e3a5f"  # Default team color
    roster: List[Player] = []

class Team(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    logo_url: Optional[str] = None
    color: str = "#1e3a5f"
    roster: List[Player] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class GameCreate(BaseModel):
    home_team_id: str
    away_team_id: str

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
    home_team_id: str
    away_team_id: str
    home_team_name: str = ""
    away_team_name: str = ""
    home_team_logo: Optional[str] = None
    away_team_logo: Optional[str] = None
    home_team_color: str = "#dc2626"
    away_team_color: str = "#7c3aed"
    status: str = "active"  # active, completed
    current_quarter: int = 1
    quarter_scores: QuarterScores = Field(default_factory=QuarterScores)
    play_by_play: List[PlayByPlayEntry] = []
    share_code: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
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
async def create_team(team_data: TeamCreate):
    team = Team(**team_data.model_dump())
    doc = team.model_dump()
    await db.teams.insert_one(doc)
    return team

@api_router.get("/teams", response_model=List[Team])
async def get_teams():
    teams = await db.teams.find({}, {"_id": 0}).to_list(100)
    return teams

@api_router.get("/teams/{team_id}", response_model=Team)
async def get_team(team_id: str):
    team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team

@api_router.put("/teams/{team_id}", response_model=Team)
async def update_team(team_id: str, team_data: TeamCreate):
    existing = await db.teams.find_one({"id": team_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Team not found")
    
    update_data = team_data.model_dump()
    await db.teams.update_one({"id": team_id}, {"$set": update_data})
    
    updated = await db.teams.find_one({"id": team_id}, {"_id": 0})
    return updated

@api_router.delete("/teams/{team_id}")
async def delete_team(team_id: str):
    result = await db.teams.delete_one({"id": team_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"message": "Team deleted"}

@api_router.post("/teams/{team_id}/roster/csv")
async def upload_roster_csv(team_id: str, file: UploadFile = File(...)):
    team = await db.teams.find_one({"id": team_id})
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
    
    await db.teams.update_one({"id": team_id}, {"$set": {"roster": roster}})
    return {"message": f"Uploaded {len(roster)} players", "roster": roster}

# ============ GAME ENDPOINTS ============

@api_router.post("/games", response_model=Game)
async def create_game(game_data: GameCreate):
    home_team = await db.teams.find_one({"id": game_data.home_team_id}, {"_id": 0})
    away_team = await db.teams.find_one({"id": game_data.away_team_id}, {"_id": 0})
    
    if not home_team or not away_team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    game = Game(
        home_team_id=game_data.home_team_id,
        away_team_id=game_data.away_team_id,
        home_team_name=home_team["name"],
        away_team_name=away_team["name"],
        home_team_logo=home_team.get("logo_url"),
        away_team_logo=away_team.get("logo_url"),
        home_team_color=home_team.get("color", "#dc2626"),
        away_team_color=away_team.get("color", "#7c3aed")
    )
    
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

@api_router.get("/games", response_model=List[Game])
async def get_games():
    games = await db.games.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return games

@api_router.get("/games/{game_id}")
async def get_game(game_id: str):
    game = await db.games.find_one({"id": game_id}, {"_id": 0})
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

@api_router.put("/games/{game_id}", response_model=Game)
async def update_game(game_id: str, update: GameUpdate):
    game = await db.games.find_one({"id": game_id})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.games.update_one({"id": game_id}, {"$set": update_data})
    updated = await db.games.find_one({"id": game_id}, {"_id": 0})
    return updated

@api_router.post("/games/{game_id}/stats")
async def record_stat(game_id: str, stat: StatUpdate):
    game = await db.games.find_one({"id": game_id})
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
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    updated_stat = await db.player_stats.find_one({"id": stat.player_id}, {"_id": 0})
    return updated_stat

@api_router.post("/games/{game_id}/players")
async def add_player_to_game(game_id: str, request: AddPlayerRequest):
    game = await db.games.find_one({"id": game_id})
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
async def generate_boxscore_pdf(game_id: str):
    game = await db.games.find_one({"id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    player_stats = await db.player_stats.find({"game_id": game_id}, {"_id": 0}).to_list(100)
    home_stats = [s for s in player_stats if s["team_id"] == game["home_team_id"]]
    away_stats = [s for s in player_stats if s["team_id"] == game["away_team_id"]]
    
    # Calculate team totals
    home_totals = calculate_team_totals(home_stats)
    away_totals = calculate_team_totals(away_stats)
    
    # Get team colors
    home_color = game.get("home_team_color", "#dc2626")
    away_color = game.get("away_team_color", "#7c3aed")
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter), topMargin=0.25*inch, bottomMargin=0.25*inch, leftMargin=0.3*inch, rightMargin=0.3*inch)
    elements = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=14, alignment=1, spaceAfter=2)
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=10, alignment=1, spaceAfter=4)
    team_style = ParagraphStyle('Team', parent=styles['Heading2'], fontSize=9, spaceAfter=2, spaceBefore=4)
    
    # Get quarter scores with overtime support
    q_scores = game.get("quarter_scores", {"home": [0,0,0,0], "away": [0,0,0,0]})
    home_scores = q_scores.get("home", [0,0,0,0])
    away_scores = q_scores.get("away", [0,0,0,0])
    total_quarters = max(4, len(home_scores))
    
    while len(home_scores) < total_quarters:
        home_scores.append(0)
    while len(away_scores) < total_quarters:
        away_scores.append(0)
    
    home_total = sum(home_scores)
    away_total = sum(away_scores)
    
    # Title
    elements.append(Paragraph(f"<b>{game['home_team_name']} vs {game['away_team_name']}</b>", title_style))
    elements.append(Paragraph(f"Final: {home_total} - {away_total}", subtitle_style))
    
    # Quarter scores and Team Stats side by side
    def get_quarter_label(q):
        return f"Q{q}" if q <= 4 else f"OT{q-4}"
    
    quarter_headers = [""] + [get_quarter_label(i+1) for i in range(total_quarters)] + ["T"]
    quarter_data = [
        quarter_headers,
        [game['home_team_name'][:12]] + home_scores + [home_total],
        [game['away_team_name'][:12]] + away_scores + [away_total]
    ]
    q_col_widths = [1*inch] + [0.35*inch] * total_quarters + [0.4*inch]
    quarter_table = Table(quarter_data, colWidths=q_col_widths)
    quarter_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    
    # Compact team comparison
    comp_data = [
        [game['home_team_name'][:10], "TEAM STATS", game['away_team_name'][:10]],
        [f"{home_totals['fg_made']}/{home_totals['fg_att']} ({home_totals['fg_pct']}%)", "FG", f"{away_totals['fg_made']}/{away_totals['fg_att']} ({away_totals['fg_pct']}%)"],
        [f"{home_totals['fg3_made']}/{home_totals['fg3_att']} ({home_totals['fg3_pct']}%)", "3PT", f"{away_totals['fg3_made']}/{away_totals['fg3_att']} ({away_totals['fg3_pct']}%)"],
        [f"{home_totals['ft_made']}/{home_totals['ft_att']} ({home_totals['ft_pct']}%)", "FT", f"{away_totals['ft_made']}/{away_totals['ft_att']} ({away_totals['ft_pct']}%)"],
        [f"{home_totals['oreb']}/{home_totals['dreb']}/{home_totals['reb']}", "REB (O/D/T)", f"{away_totals['oreb']}/{away_totals['dreb']}/{away_totals['reb']}"],
        [f"{home_totals['ast']}", "AST", f"{away_totals['ast']}"],
        [f"{home_totals['stl']}", "STL", f"{away_totals['stl']}"],
        [f"{home_totals['blk']}", "BLK", f"{away_totals['blk']}"],
        [f"{home_totals['to']}", "TO", f"{away_totals['to']}"],
        [f"{home_totals['pf']}", "PF", f"{away_totals['pf']}"],
    ]
    comp_table = Table(comp_data, colWidths=[1.3*inch, 0.8*inch, 1.3*inch])
    comp_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (1, 1), (1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BACKGROUND', (1, 1), (1, -1), colors.HexColor('#f0f0f0')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    
    # Put quarter scores and team stats side by side
    top_table = Table([[quarter_table, comp_table]], colWidths=[4.5*inch, 3.6*inch])
    top_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(top_table)
    elements.append(Spacer(1, 8))
    
    # Condensed player stats - combine FG with %, reduce columns
    headers = ["#", "Player", "PTS", "FG", "3PT", "FT", "REB", "AST", "STL", "BLK", "TO", "PF"]
    
    def create_team_table(team_name: str, stats_list: list, team_totals: dict, team_color: str):
        elements.append(Paragraph(f"<b>{team_name}</b>", team_style))
        
        data = [headers]
        
        for s in stats_list:
            totals = calculate_player_totals(s)
            # Combine made-att (pct%)
            fg_str = f"{totals['fg_made']}-{totals['fg_att']}" if totals['fg_att'] > 0 else "0-0"
            fg3_str = f"{s['fg3_made']}-{totals['fg3_att']}" if totals['fg3_att'] > 0 else "0-0"
            ft_str = f"{s['ft_made']}-{totals['ft_att']}" if totals['ft_att'] > 0 else "0-0"
            
            row = [
                s["player_number"],
                s["player_name"][:14],
                totals["pts"],
                fg_str,
                fg3_str,
                ft_str,
                totals["total_reb"],
                s["assists"],
                s["steals"],
                s["blocks"],
                s["turnovers"],
                s["fouls"]
            ]
            data.append(row)
        
        # Totals row
        data.append([
            "", "TOTALS",
            team_totals["pts"],
            f"{team_totals['fg_made']}-{team_totals['fg_att']}",
            f"{team_totals['fg3_made']}-{team_totals['fg3_att']}",
            f"{team_totals['ft_made']}-{team_totals['ft_att']}",
            team_totals["reb"],
            team_totals["ast"],
            team_totals["stl"],
            team_totals["blk"],
            team_totals["to"],
            team_totals["pf"]
        ])
        
        col_widths = [0.3*inch, 1.1*inch, 0.35*inch, 0.5*inch, 0.45*inch, 0.45*inch, 0.35*inch, 0.35*inch, 0.35*inch, 0.35*inch, 0.35*inch, 0.3*inch]
        table = Table(data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(team_color)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 7),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f0f0f0')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 6))
    
    create_team_table(game['home_team_name'], home_stats, home_totals, home_color)
    create_team_table(game['away_team_name'], away_stats, away_totals, away_color)
    
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

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
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
