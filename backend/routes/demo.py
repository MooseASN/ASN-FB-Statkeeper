"""Demo mode endpoints - read-only demo data for all sports"""
from fastapi import APIRouter, Body

router = APIRouter(prefix="/demo", tags=["demo"])

# ============= BASKETBALL DEMO DATA =============
BASKETBALL_DEMO_HOME_PLAYERS = [
    {"id": "demo-bh1", "name": "Marcus Johnson", "number": "1"},
    {"id": "demo-bh2", "name": "Darius Williams", "number": "3"},
    {"id": "demo-bh3", "name": "Tyler Brown", "number": "5"},
    {"id": "demo-bh4", "name": "Jordan Davis", "number": "10"},
    {"id": "demo-bh5", "name": "Chris Martinez", "number": "12"},
    {"id": "demo-bh6", "name": "Andre Thompson", "number": "15"},
    {"id": "demo-bh7", "name": "Kevin Moore", "number": "21"},
    {"id": "demo-bh8", "name": "Isaiah Jackson", "number": "23"},
    {"id": "demo-bh9", "name": "DeShawn Harris", "number": "32"},
    {"id": "demo-bh10", "name": "Malik Robinson", "number": "45"},
]

BASKETBALL_DEMO_AWAY_PLAYERS = [
    {"id": "demo-ba1", "name": "Jaylen Carter", "number": "0"},
    {"id": "demo-ba2", "name": "Brandon Lee", "number": "2"},
    {"id": "demo-ba3", "name": "Cameron White", "number": "4"},
    {"id": "demo-ba4", "name": "Xavier Green", "number": "11"},
    {"id": "demo-ba5", "name": "Terrence Hall", "number": "13"},
    {"id": "demo-ba6", "name": "Dominic Young", "number": "20"},
    {"id": "demo-ba7", "name": "Aaron King", "number": "22"},
    {"id": "demo-ba8", "name": "Maurice Wright", "number": "24"},
    {"id": "demo-ba9", "name": "Lamar Scott", "number": "33"},
    {"id": "demo-ba10", "name": "Rashad Adams", "number": "44"},
]

def create_demo_player_stats(players, on_floor_ids=None):
    """Create player stats structure for demo - matches real game format"""
    stats = []
    for i, p in enumerate(players):
        is_on_floor = p["id"] in (on_floor_ids or []) if on_floor_ids else i < 5
        stats.append({
            "id": p["id"],
            "player_name": p["name"],
            "player_number": p["number"],
            "team_id": "demo-home-team" if p["id"].startswith("demo-bh") else "demo-away-team",
            "game_id": "demo-basketball",
            "ft_made": 0, "ft_missed": 0,
            "fg2_made": 0, "fg2_missed": 0,
            "fg3_made": 0, "fg3_missed": 0,
            "offensive_rebounds": 0, "defensive_rebounds": 0,
            "assists": 0, "steals": 0, "blocks": 0,
            "turnovers": 0, "fouls": 0,
            "on_floor": is_on_floor
        })
    return stats


@router.get("/basketball/{mode}")
async def get_basketball_demo_game(mode: str):
    """Get demo basketball game data - mode can be 'simple', 'classic', or 'advanced'"""
    home_on_floor = ["demo-bh1", "demo-bh2", "demo-bh3", "demo-bh4", "demo-bh5"]
    away_on_floor = ["demo-ba1", "demo-ba2", "demo-ba3", "demo-ba4", "demo-ba5"]
    
    return {
        "id": f"demo-basketball-{mode}",
        "_id": f"demo-basketball-{mode}",
        "sport": "basketball",
        "status": "active",
        "is_demo": True,
        "simple_mode": mode == "simple",
        "advanced_mode": mode == "advanced",
        "home_team_id": "demo-home-team",
        "away_team_id": "demo-away-team",
        "home_team_name": "Northside Tigers",
        "away_team_name": "Eastwood Eagles",
        "home_team_color": "#f97316",
        "away_team_color": "#3b82f6",
        "home_score": 0, "away_score": 0,
        "period": 1, "current_quarter": 1,
        "period_label": "1st",
        "clock_enabled": True,
        "clock_time": 720,
        "clock_running": False,
        "home_timeouts": 5, "away_timeouts": 5,
        "home_fouls": 0, "away_fouls": 0,
        "home_bonus": False, "away_bonus": False,
        "possession": "home",
        "home_player_stats": create_demo_player_stats(BASKETBALL_DEMO_HOME_PLAYERS, home_on_floor),
        "away_player_stats": create_demo_player_stats(BASKETBALL_DEMO_AWAY_PLAYERS, away_on_floor),
        "home_on_floor": home_on_floor,
        "away_on_floor": away_on_floor,
        "play_by_play": [],
        "quarter_scores": {"home": [0, 0, 0, 0], "away": [0, 0, 0, 0]},
        "share_code": f"demo-{mode}"
    }


# ============= FOOTBALL DEMO DATA =============
FOOTBALL_DEMO_HOME_ROSTER = [
    {"id": f"demo-fh{i}", "name": name, "number": num, "position": pos}
    for i, (name, num, pos) in enumerate([
        ("Jake Mitchell", "7", "QB"), ("Ryan Cooper", "12", "QB"),
        ("DeAndre Williams", "22", "RB"), ("Marcus Bell", "28", "RB"), ("Tyrone Jackson", "34", "RB"),
        ("Chris Johnson", "1", "WR"), ("Darius Brown", "11", "WR"), ("Kevin Thomas", "14", "WR"),
        ("Andre Davis", "18", "WR"), ("Malik Harris", "81", "WR"),
        ("Tyler Martinez", "85", "TE"), ("Brandon Moore", "88", "TE"),
        ("James Wilson", "70", "OL"), ("Michael Thompson", "71", "OL"), ("David Garcia", "72", "OL"),
        ("Robert Lee", "73", "OL"), ("Anthony White", "74", "OL"), ("Joshua Clark", "75", "OL"), ("Daniel Lewis", "76", "OL"),
        ("Jamal Robinson", "90", "DL"), ("Terrell Young", "91", "DL"), ("Marcus King", "92", "DL"),
        ("Derek Wright", "93", "DL"), ("Corey Scott", "94", "DL"),
        ("Jordan Adams", "50", "LB"), ("Cameron Hall", "51", "LB"), ("Isaiah Green", "52", "LB"),
        ("Xavier Carter", "54", "LB"), ("Dominic Taylor", "55", "LB"), ("Lamar Mitchell", "56", "LB"),
        ("Aaron Phillips", "20", "DB"), ("Brandon Turner", "21", "DB"), ("Chris Campbell", "23", "DB"),
        ("Deshawn Parker", "24", "DB"), ("Jaylen Edwards", "25", "DB"), ("Kevin Morgan", "26", "DB"),
        ("Maurice Bailey", "27", "DB"), ("Rashad Collins", "29", "DB"),
        ("Tyler Henderson", "3", "K"), ("Ryan Brooks", "8", "P"), ("Alex Rivera", "47", "LS"),
        ("Nick Foster", "15", "WR"), ("Sean Murphy", "33", "RB"), ("Brian Ward", "42", "FB"),
        ("Eric Patterson", "57", "LB"), ("Travis Reed", "77", "OL"), ("Greg Sanders", "95", "DL"),
        ("Tony Price", "30", "DB"), ("Matt Howard", "84", "TE"), ("Steve Rogers", "16", "QB"),
    ], 1)
]

FOOTBALL_DEMO_AWAY_ROSTER = [
    {"id": f"demo-fa{i}", "name": name, "number": num, "position": pos}
    for i, (name, num, pos) in enumerate([
        ("Ethan Brooks", "10", "QB"), ("Noah Williams", "5", "QB"),
        ("Jamal Thompson", "25", "RB"), ("Tyrell Davis", "32", "RB"), ("Donte Harris", "38", "RB"),
        ("Calvin Moore", "2", "WR"), ("Darius Jackson", "9", "WR"), ("Andre Wilson", "13", "WR"),
        ("Marcus Lee", "17", "WR"), ("Terrence Brown", "82", "WR"),
        ("Kyle Martinez", "86", "TE"), ("Jason Taylor", "89", "TE"),
        ("Marcus Garcia", "60", "OL"), ("David Robinson", "61", "OL"), ("Anthony Clark", "62", "OL"),
        ("Brian Lewis", "63", "OL"), ("Chris White", "64", "OL"), ("Derek Young", "65", "OL"), ("Eric King", "66", "OL"),
        ("Jamal Wright", "96", "DL"), ("Corey Scott", "97", "DL"), ("Marcus Adams", "98", "DL"),
        ("Terrell Hall", "99", "DL"), ("Jordan Green", "91", "DL"),
        ("Cameron Carter", "40", "LB"), ("Isaiah Taylor", "41", "LB"), ("Xavier Mitchell", "43", "LB"),
        ("Dominic Phillips", "44", "LB"), ("Lamar Turner", "45", "LB"), ("Aaron Campbell", "46", "LB"),
        ("Brandon Parker", "20", "DB"), ("Chris Edwards", "21", "DB"), ("Deshawn Morgan", "22", "DB"),
        ("Jaylen Bailey", "23", "DB"), ("Kevin Collins", "24", "DB"), ("Maurice Henderson", "26", "DB"),
        ("Rashad Brooks", "27", "DB"), ("Tyler Rivera", "28", "DB"),
        ("Ryan Foster", "4", "K"), ("Alex Murphy", "6", "P"), ("Nick Ward", "48", "LS"),
        ("Sean Patterson", "14", "WR"), ("Brian Reed", "35", "RB"), ("Eric Sanders", "42", "FB"),
        ("Travis Price", "47", "LB"), ("Greg Howard", "67", "OL"), ("Tony Rogers", "92", "DL"),
        ("Matt Foster", "29", "DB"), ("Steve Murphy", "87", "TE"), ("Jack Williams", "8", "QB"),
    ], 1)
]


@router.get("/football")
async def get_football_demo_game():
    """Get demo football game data"""
    return {
        "id": "demo-football",
        "_id": "demo-football",
        "sport": "football",
        "status": "live",
        "is_demo": True,
        "home_team_id": "demo-home-football",
        "away_team_id": "demo-away-football",
        "home_team_name": "Central Wolves",
        "away_team_name": "Riverside Panthers",
        "home_team_color": "#dc2626",
        "away_team_color": "#7c3aed",
        "home_score": 0, "away_score": 0,
        "quarter": 1,
        "home_timeouts": 3, "away_timeouts": 3,
        "possession": "home",
        "ball_position": 25,
        "down": 1, "distance": 10,
        "clock_time": 900,
        "clock_running": False,
        "home_roster": FOOTBALL_DEMO_HOME_ROSTER,
        "away_roster": FOOTBALL_DEMO_AWAY_ROSTER,
        "football_state": {
            "possession": "home",
            "ball_position": 25,
            "down": 1, "distance": 10,
            "quarter": 1,
            "home_score": 0, "away_score": 0,
            "home_timeouts": 3, "away_timeouts": 3,
            "clock_time": 900,
            "play_log": [],
            "home_time_of_possession": 0,
            "away_time_of_possession": 0,
            "current_drive": {
                "team": "home", "startPosition": 25,
                "startPeriod": 1, "startClock": 900,
                "plays": 0, "yards": 0, "elapsedTime": 0
            },
            "all_drives": []
        },
        "share_code": "demo-football"
    }


# ============= BASEBALL DEMO DATA =============
BASEBALL_DEMO_HOME_ROSTER = [
    {"player_number": "1", "player_name": "Mike Johnson", "position": "C"},
    {"player_number": "5", "player_name": "Chris Davis", "position": "1B"},
    {"player_number": "7", "player_name": "James Wilson", "position": "2B"},
    {"player_number": "12", "player_name": "Tom Anderson", "position": "SS"},
    {"player_number": "15", "player_name": "Alex Rodriguez", "position": "3B"},
    {"player_number": "21", "player_name": "Derek Martinez", "position": "LF"},
    {"player_number": "24", "player_name": "Ken Thompson", "position": "CF"},
    {"player_number": "27", "player_name": "Mike Williams", "position": "RF"},
    {"player_number": "34", "player_name": "David Garcia", "position": "P"},
]

BASEBALL_DEMO_AWAY_ROSTER = [
    {"player_number": "2", "player_name": "Ryan Smith", "position": "C"},
    {"player_number": "4", "player_name": "Kevin Brown", "position": "1B"},
    {"player_number": "8", "player_name": "Matt Taylor", "position": "2B"},
    {"player_number": "11", "player_name": "Josh Lee", "position": "SS"},
    {"player_number": "14", "player_name": "Andrew Harris", "position": "3B"},
    {"player_number": "18", "player_name": "Brandon White", "position": "LF"},
    {"player_number": "22", "player_name": "Tyler Clark", "position": "CF"},
    {"player_number": "25", "player_name": "Jason Lewis", "position": "RF"},
    {"player_number": "31", "player_name": "Eric Walker", "position": "P"},
]


@router.get("/baseball")
async def get_baseball_demo_game():
    """Get demo baseball game data"""
    home_stats = [
        {**p, "at_bats": 0, "hits": 0, "runs": 0, "rbi": 0, "strikeouts_batting": 0, "walks": 0, "home_runs": 0}
        for p in BASEBALL_DEMO_HOME_ROSTER
    ]
    away_stats = [
        {**p, "at_bats": 0, "hits": 0, "runs": 0, "rbi": 0, "strikeouts_batting": 0, "walks": 0, "home_runs": 0}
        for p in BASEBALL_DEMO_AWAY_ROSTER
    ]
    
    return {
        "id": "demo-baseball",
        "_id": "demo-baseball",
        "sport": "baseball",
        "status": "live",
        "is_demo": True,
        "home_team_id": "demo-home-baseball",
        "away_team_id": "demo-away-baseball",
        "home_team_name": "Riverside Sluggers",
        "away_team_name": "Valley Hawks",
        "home_team_color": "#dc2626",
        "away_team_color": "#2563eb",
        "home_score": 0, "away_score": 0,
        "current_inning": 1,
        "inning_half": "top",
        "total_innings": 9,
        "balls": 0, "strikes": 0, "outs": 0,
        "bases": {"first": False, "second": False, "third": False},
        "home_roster": BASEBALL_DEMO_HOME_ROSTER,
        "away_roster": BASEBALL_DEMO_AWAY_ROSTER,
        "home_player_stats": home_stats,
        "away_player_stats": away_stats,
        "inning_scores": {"home": [], "away": []},
        "play_by_play": [],
        "share_code": "demo-baseball"
    }


# ============= GENERIC DEMO ENDPOINTS =============
@router.put("/{game_type}")
async def update_demo_game(game_type: str, data: dict = Body(...)):
    """Accept demo game updates but don't persist them (demo mode)"""
    return {"success": True, "message": "Demo mode - changes not persisted"}


@router.post("/{game_type}/play")
async def add_demo_play(game_type: str, data: dict = Body(...)):
    """Accept demo play additions but don't persist them"""
    return {"success": True, "message": "Demo mode - play recorded locally only"}
