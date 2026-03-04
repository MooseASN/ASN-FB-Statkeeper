#!/usr/bin/env python3
"""
Setup script to ensure the football game has 3+ plays for testing
"""

import requests
import json
from datetime import datetime

BACKEND_URL = "https://moose-stats-staging.preview.emergentagent.com/api"
ADMIN_EMAIL = "antlersportsnetwork@gmail.com"
ADMIN_PASSWORD = "test123"
FOOTBALL_GAME_ID = "a640f656-1ea6-4929-8589-82f58a1069d9"

def setup_game_for_testing():
    session = requests.Session()
    
    # Authenticate
    auth_response = session.post(f"{BACKEND_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if auth_response.status_code != 200:
        print("❌ Failed to authenticate")
        return False
    
    session_token = auth_response.json().get("session_token")
    session.headers.update({"Authorization": f"Bearer {session_token}"})
    
    # Get current game state
    game_response = session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
    if game_response.status_code != 200:
        print("❌ Failed to get game data")
        return False
    
    game_data = game_response.json()
    current_football_state = game_data.get("football_state", {})
    current_play_log = current_football_state.get("play_log", [])
    
    print(f"Current play log has {len(current_play_log)} plays")
    
    # If we need more plays, add them
    if len(current_play_log) < 3:
        needed_plays = 3 - len(current_play_log)
        print(f"Adding {needed_plays} more plays to meet requirement...")
        
        # Add additional plays
        additional_plays = []
        for i in range(needed_plays):
            play = {
                "id": f"setup_play_{i+1}_{int(datetime.now().timestamp())}",
                "quarter": 1,
                "down": 1 + i,
                "distance": 10 - (i * 2),
                "yard_line": 30 + (i * 5),
                "play_type": "PASS" if i % 2 == 0 else "RUN",
                "passer": "12" if i % 2 == 0 else None,
                "receiver": "88" if i % 2 == 0 else None,
                "carrier": "22" if i % 2 == 1 else None,
                "result": "COMPLETE" if i % 2 == 0 else "GAIN",
                "yards": 5 + i,
                "description": f"{'PASS from #12 to #88' if i % 2 == 0 else 'RUN by #22'} for {5 + i} yards {'COMPLETE' if i % 2 == 0 else 'GAIN'}",
                "timestamp": datetime.now().isoformat()
            }
            additional_plays.append(play)
        
        # Update the football state
        updated_football_state = {
            **current_football_state,
            "play_log": current_play_log + additional_plays,
            "home_time_of_possession": current_football_state.get("home_time_of_possession", 900),  # 15 minutes
            "away_time_of_possession": current_football_state.get("away_time_of_possession", 900),  # 15 minutes
            "home_score": current_football_state.get("home_score", 7),
            "away_score": current_football_state.get("away_score", 3),
            "home_timeouts": current_football_state.get("home_timeouts", 3),
            "away_timeouts": current_football_state.get("away_timeouts", 3),
            "clock_time": current_football_state.get("clock_time", "12:00"),
            "quarter": current_football_state.get("quarter", 2),
            "possession": current_football_state.get("possession", "home"),
            "down": current_football_state.get("down", 1),
            "distance": current_football_state.get("distance", 10),
            "ball_position": current_football_state.get("ball_position", {"yard_line": 35, "side": "home"})
        }
        
        # Update the game
        update_response = session.put(f"{BACKEND_URL}/games/{FOOTBALL_GAME_ID}", json={
            "football_state": updated_football_state
        })
        
        if update_response.status_code == 200:
            print(f"✅ Successfully added {needed_plays} plays")
            
            # Verify the update
            verify_response = session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
            if verify_response.status_code == 200:
                updated_game = verify_response.json()
                updated_state = updated_game.get("football_state", {})
                updated_plays = updated_state.get("play_log", [])
                print(f"✅ Verified: Game now has {len(updated_plays)} plays")
                return True
            else:
                print("❌ Failed to verify update")
                return False
        else:
            print(f"❌ Failed to update game: {update_response.status_code}")
            return False
    else:
        print("✅ Game already has sufficient plays")
        return True

if __name__ == "__main__":
    success = setup_game_for_testing()
    exit(0 if success else 1)