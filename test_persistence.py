#!/usr/bin/env python3
"""
Simple test to verify football_state persistence
"""

import requests
import json
from datetime import datetime

BACKEND_URL = "https://statmoose-school.preview.emergentagent.com/api"
ADMIN_EMAIL = "antlersportsnetwork@gmail.com"
ADMIN_PASSWORD = "test123"
FOOTBALL_GAME_ID = "a640f656-1ea6-4929-8589-82f58a1069d9"

def test_football_state_persistence():
    session = requests.Session()
    
    # Authenticate
    auth_response = session.post(f"{BACKEND_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if auth_response.status_code != 200:
        print(f"❌ Authentication failed: {auth_response.status_code}")
        return False
    
    session_token = auth_response.json().get("session_token")
    session.headers.update({"Authorization": f"Bearer {session_token}"})
    
    print("✅ Authenticated successfully")
    
    # Create test football state with drive data
    test_state = {
        "play_log": [
            {
                "id": "persistence_test_play",
                "quarter": 1,
                "play_type": "RUN",
                "carrier": "22",
                "carrier_name": "Test Player",
                "result": "GAIN",
                "yards": 5,
                "description": "Test play for persistence"
            }
        ],
        "current_drive": {
            "id": "persistence_test_drive",
            "team": "home",
            "start_yard": 25,
            "current_yard": 30,
            "playCount": 1,
            "netYards": 5,
            "result": "ongoing"
        },
        "all_drives": [
            {
                "id": "persistence_test_drive",
                "team": "home",
                "start_yard": 25,
                "current_yard": 30,
                "playCount": 1,
                "netYards": 5,
                "result": "ongoing"
            }
        ],
        "scores": {
            "home": 0,
            "away": 0
        }
    }
    
    # Submit the state
    update_response = session.put(f"{BACKEND_URL}/games/{FOOTBALL_GAME_ID}", json={
        "football_state": test_state
    })
    
    if update_response.status_code != 200:
        print(f"❌ Failed to update game: {update_response.status_code}")
        print(update_response.text)
        return False
    
    print("✅ Game updated successfully")
    
    # Verify the state was saved
    verify_response = session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
    
    if verify_response.status_code != 200:
        print(f"❌ Failed to get game: {verify_response.status_code}")
        return False
    
    game_data = verify_response.json()
    saved_state = game_data.get("football_state", {})
    
    print("=== SAVED FOOTBALL STATE ===")
    print(json.dumps(saved_state, indent=2))
    
    # Check if our test data is there
    play_log = saved_state.get("play_log", [])
    current_drive = saved_state.get("current_drive", {})
    all_drives = saved_state.get("all_drives", [])
    
    test_play_found = any(play.get("id") == "persistence_test_play" for play in play_log)
    current_drive_correct = current_drive.get("id") == "persistence_test_drive"
    all_drives_correct = any(drive.get("id") == "persistence_test_drive" for drive in all_drives)
    
    print(f"\n=== VERIFICATION ===")
    print(f"Test play found: {test_play_found}")
    print(f"Current drive correct: {current_drive_correct}")
    print(f"All drives correct: {all_drives_correct}")
    print(f"Play log count: {len(play_log)}")
    print(f"All drives count: {len(all_drives)}")
    
    if test_play_found and current_drive_correct and all_drives_correct:
        print("✅ Football state persistence working correctly")
        return True
    else:
        print("❌ Football state not persisted correctly")
        return False

if __name__ == "__main__":
    test_football_state_persistence()