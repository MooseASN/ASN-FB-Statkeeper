"""Data models for StatMoose"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import uuid


# ============ PLAYER & TEAM MODELS ============

class Player(BaseModel):
    number: str
    name: str


class TeamCreate(BaseModel):
    name: str
    logo_url: Optional[str] = None
    color: str = "#000000"
    roster: List[Player] = []
    sport: str = "basketball"


class Team(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""
    name: str
    logo_url: Optional[str] = None
    color: str = "#000000"
    roster: List[Player] = []
    sport: str = "basketball"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ============ GAME MODELS ============

class GameCreate(BaseModel):
    home_team_id: str
    away_team_id: str
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    start_immediately: bool = True
    clock_enabled: bool = False
    period_duration: int = 720
    period_label: str = "Quarter"
    timeout_preset: str = "college"
    custom_timeouts: int = 4
    primetime_enabled: bool = False
    video_url: Optional[str] = None
    simple_mode: bool = False
    advanced_mode: bool = False
    note: Optional[str] = None
    sport: str = "basketball"
    total_innings: int = 9
    bonus_enabled: bool = True
    double_bonus_enabled: bool = True
    bonus_fouls: Optional[int] = 7
    double_bonus_fouls: Optional[int] = 10


class QuarterScores(BaseModel):
    home: List[int] = [0, 0, 0, 0]
    away: List[int] = [0, 0, 0, 0]


class PlayByPlayEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quarter: Optional[int] = None
    team: Optional[str] = None
    player_name: Optional[str] = None
    player_number: Optional[str] = None
    action: Optional[str] = None
    points: int = 0
    home_score: int = 0
    away_score: int = 0
    inning: Optional[str] = None
    description: Optional[str] = None
    timestamp: Optional[str] = None


class Game(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""
    home_team_id: str
    away_team_id: str
    home_team_name: str = ""
    away_team_name: str = ""
    home_team_logo: Optional[str] = None
    away_team_logo: Optional[str] = None
    home_team_color: str = "#dc2626"
    away_team_color: str = "#7c3aed"
    status: str = "active"
    current_quarter: int = 1
    quarter_scores: QuarterScores = Field(default_factory=QuarterScores)
    play_by_play: List[PlayByPlayEntry] = []
    share_code: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    note: Optional[str] = None
    clock_enabled: bool = False
    period_duration: int = 720
    period_label: str = "Quarter"
    clock_time: int = 720
    clock_running: bool = False
    clock_last_started: Optional[str] = None
    is_halftime: bool = False
    total_timeouts: int = 4
    home_timeouts_used: int = 0
    away_timeouts_used: int = 0
    primetime_enabled: bool = False
    video_url: Optional[str] = None
    event_id: Optional[str] = None
    home_bonus: Optional[str] = None
    away_bonus: Optional[str] = None
    bonus_enabled: bool = True
    double_bonus_enabled: bool = True
    bonus_fouls: Optional[int] = 7
    double_bonus_fouls: Optional[int] = 10
    home_team_fouls: int = 0
    away_team_fouls: int = 0
    simple_mode: bool = False
    advanced_mode: bool = False
    possession: Optional[str] = None
    home_on_floor: List[str] = []
    away_on_floor: List[str] = []
    home_starters: List[str] = []
    away_starters: List[str] = []
    starters_selected: bool = False
    sport: str = "basketball"
    total_innings: int = 9
    current_inning: int = 1
    inning_half: str = "top"
    outs: int = 0
    balls: int = 0
    strikes: int = 0
    bases: dict = Field(default_factory=lambda: {"first": None, "second": None, "third": None})
    inning_scores: dict = Field(default_factory=lambda: {"home": [], "away": []})
    current_batter_id: Optional[str] = None
    current_pitcher_id: Optional[str] = None
    home_player_stats: Optional[List[dict]] = None
    away_player_stats: Optional[List[dict]] = None
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
    # Minutes tracking
    minutes_played: float = 0.0
    check_in_time: Optional[str] = None
    # Simple mode aggregated stats
    makes: int = 0
    # Baseball stats
    at_bats: int = 0
    hits: int = 0
    runs: int = 0
    rbi: int = 0
    home_runs: int = 0
    doubles: int = 0
    triples: int = 0
    walks: int = 0
    strikeouts_batting: int = 0
    stolen_bases: int = 0
    caught_stealing: int = 0
    sacrifice_flies: int = 0
    sacrifice_bunts: int = 0
    # Pitching stats
    innings_pitched: float = 0.0
    hits_allowed: int = 0
    runs_allowed: int = 0
    earned_runs: int = 0
    walks_allowed: int = 0
    strikeouts_pitching: int = 0
    home_runs_allowed: int = 0


# ============ EVENT MODELS ============

class EventCreate(BaseModel):
    name: str
    sport: str = "basketball"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None


class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""
    name: str
    sport: str = "basketball"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    games: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ============ JUMBOTRON MODELS ============

class JumbotronDisplay(BaseModel):
    id: Optional[str] = None
    name: str = "Main Display"
    width: int = 1920
    height: int = 1080
    layout: str = "full"


class JumbotronScheduleItem(BaseModel):
    id: Optional[str] = None
    source_type: str
    source_url: str
    start_time: str
    end_time: Optional[str] = None
    label: Optional[str] = None


class JumbotronConfigCreate(BaseModel):
    name: str
    width: int = 1920
    height: int = 1080
    displays: List[JumbotronDisplay] = []
    schedule: List[JumbotronScheduleItem] = []


class JumbotronConfigUpdate(BaseModel):
    name: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    displays: Optional[List[JumbotronDisplay]] = None
    schedule: Optional[List[JumbotronScheduleItem]] = None


# ============ SPONSOR MODELS ============

class SponsorBannerCreate(BaseModel):
    name: str
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    is_active: bool = True
    display_order: int = 0


class SponsorBanner(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""
    name: str
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    is_active: bool = True
    display_order: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
