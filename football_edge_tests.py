#!/usr/bin/env python3
"""
Additional Football Backend Tests - Edge Cases and Data Validation
"""

import requests
import json
from datetime import datetime

BACKEND_URL = "https://sportspro-dash.preview.emergentagent.com/api"
ADMIN_EMAIL = "antlersportsnetwork@gmail.com"
ADMIN_PASSWORD = "test123"
FOOTBALL_GAME_ID = "a640f656-1ea6-4929-8589-82f58a1069d9"

def test_football_edge_cases():
    """Test edge cases for football state handling"""
    session = requests.Session()
    
    # Authenticate
    auth_response = session.post(f"{BACKEND_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if auth_response.status_code != 200:
        print("❌ Authentication failed")
        return False
    
    session_token = auth_response.json().get("session_token")
    session.headers.update({"Authorization": f"Bearer {session_token}"})
    
    print("🏈 Testing Football Edge Cases")
    print("=" * 40)
    
    # Test 1: Empty football state
    print("Test 1: Empty football state...")
    response = session.put(f"{BACKEND_URL}/games/{FOOTBALL_GAME_ID}", json={
        "football_state": {}
    })
    
    if response.status_code == 200:
        # Verify empty state was saved
        verify_response = session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
        if verify_response.status_code == 200:
            game_data = verify_response.json()
            football_state = game_data.get("football_state", {})
            print(f"✅ Empty state saved: {len(football_state)} fields")
        else:
            print("❌ Failed to verify empty state")
    else:
        print(f"❌ Failed to save empty state: {response.status_code}")
    
    # Test 2: Large play log (simulate full game)
    print("\nTest 2: Large play log simulation...")
    large_play_log = []
    for i in range(50):  # Simulate 50 plays
        play = {
            "id": f"play_{i:03d}",
            "quarter": (i // 12) + 1,
            "down": (i % 4) + 1,
            "distance": 10 if (i % 4) == 0 else max(1, 10 - (i % 10)),
            "yard_line": 25 + (i % 50),
            "play_type": "RUN" if i % 2 == 0 else "PASS",
            "carrier": str(20 + (i % 10)) if i % 2 == 0 else None,
            "passer": str(10 + (i % 5)) if i % 2 == 1 else None,
            "receiver": str(80 + (i % 10)) if i % 2 == 1 else None,
            "result": "GAIN" if i % 3 != 0 else "LOSS",
            "yards": max(-5, min(20, (i % 15) - 2)),
            "description": f"Play {i+1} description",
            "timestamp": datetime.now().isoformat()
        }
        large_play_log.append(play)
    
    large_state = {
        "play_log": large_play_log,
        "scores": {"home": 21, "away": 14},
        "ball_position": {"yard_line": 35, "side": "home"},
        "down": 2,
        "distance": 7,
        "quarter": 4,
        "clock": "05:23",
        "team_stats": {
            "home": {
                "rushing_yards": 150,
                "passing_yards": 200,
                "total_yards": 350,
                "first_downs": 18,
                "turnovers": 1
            },
            "away": {
                "rushing_yards": 120,
                "passing_yards": 180,
                "total_yards": 300,
                "first_downs": 15,
                "turnovers": 2
            }
        }
    }
    
    response = session.put(f"{BACKEND_URL}/games/{FOOTBALL_GAME_ID}", json={
        "football_state": large_state
    })
    
    if response.status_code == 200:
        # Verify large state was saved
        verify_response = session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
        if verify_response.status_code == 200:
            game_data = verify_response.json()
            saved_state = game_data.get("football_state", {})
            saved_plays = saved_state.get("play_log", [])
            saved_stats = saved_state.get("team_stats", {})
            
            if len(saved_plays) == 50 and saved_stats.get("home", {}).get("total_yards") == 350:
                print(f"✅ Large state saved: {len(saved_plays)} plays, complete stats")
            else:
                print(f"❌ Large state incomplete: {len(saved_plays)} plays saved")
        else:
            print("❌ Failed to verify large state")
    else:
        print(f"❌ Failed to save large state: {response.status_code}")
    
    # Test 3: Invalid data handling
    print("\nTest 3: Invalid data handling...")
    invalid_state = {
        "play_log": "invalid_string_instead_of_array",
        "scores": {"home": "not_a_number", "away": 7},
        "invalid_field": "should_be_ignored"
    }
    
    response = session.put(f"{BACKEND_URL}/games/{FOOTBALL_GAME_ID}", json={
        "football_state": invalid_state
    })
    
    # The API should still accept this (MongoDB is flexible with schemas)
    if response.status_code == 200:
        print("✅ API accepts flexible data structure")
    else:
        print(f"❌ API rejected flexible data: {response.status_code}")
    
    # Test 4: Null football state
    print("\nTest 4: Null football state...")
    response = session.put(f"{BACKEND_URL}/games/{FOOTBALL_GAME_ID}", json={
        "football_state": None
    })
    
    if response.status_code == 200:
        print("✅ Null state accepted")
    else:
        print(f"❌ Null state rejected: {response.status_code}")
    
    print("\n🏈 Edge case testing complete!")
    return True

def test_football_data_structure():
    """Test the expected football data structure"""
    print("\n🏈 Testing Football Data Structure")
    print("=" * 40)
    
    # Get current football state
    response = requests.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
    
    if response.status_code == 200:
        game_data = response.json()
        football_state = game_data.get("football_state")
        
        if football_state:
            print("✅ Football state structure:")
            
            # Check expected fields
            expected_fields = [
                "play_log", "scores", "ball_position", "down", 
                "distance", "quarter", "clock", "team_stats"
            ]
            
            for field in expected_fields:
                if field in football_state:
                    value = football_state[field]
                    if field == "play_log":
                        print(f"  ✅ {field}: {len(value)} plays")
                    elif field == "team_stats":
                        home_stats = value.get("home", {})
                        away_stats = value.get("away", {})
                        print(f"  ✅ {field}: home={len(home_stats)} stats, away={len(away_stats)} stats")
                    else:
                        print(f"  ✅ {field}: {value}")
                else:
                    print(f"  ⚠️  {field}: missing")
            
            # Check play log structure
            play_log = football_state.get("play_log", [])
            if play_log:
                sample_play = play_log[0]
                print(f"\n  Sample play structure:")
                for key, value in sample_play.items():
                    print(f"    {key}: {value}")
            
            return True
        else:
            print("❌ No football state found")
            return False
    else:
        print(f"❌ Failed to get game data: {response.status_code}")
        return False

if __name__ == "__main__":
    test_football_edge_cases()
    test_football_data_structure()