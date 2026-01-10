#!/usr/bin/env python3
"""
Quick test for remaining backend tasks that need retesting
"""

import requests
import json
import io
import csv
from datetime import datetime

BACKEND_URL = "https://baseball-tracker-2.preview.emergentagent.com/api"
ADMIN_EMAIL = "antlersportsnetwork@gmail.com"
ADMIN_PASSWORD = "test123"

def test_remaining_backend_tasks():
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
    
    # Test 1: CSV Roster Upload
    print("\n=== Testing CSV Roster Upload ===")
    
    # First, get a team to test with
    teams_response = session.get(f"{BACKEND_URL}/teams")
    if teams_response.status_code == 200:
        teams = teams_response.json()
        if teams:
            test_team_id = teams[0]["id"]
            print(f"Using team: {teams[0]['name']} (ID: {test_team_id})")
            
            # Create a test CSV
            csv_content = "number,name\n1,Test Player One\n2,Test Player Two\n3,Test Player Three"
            csv_file = io.BytesIO(csv_content.encode('utf-8'))
            
            # Test CSV upload
            files = {'file': ('test_roster.csv', csv_file, 'text/csv')}
            upload_response = session.post(f"{BACKEND_URL}/teams/{test_team_id}/roster/csv", files=files)
            
            if upload_response.status_code == 200:
                upload_data = upload_response.json()
                print(f"✅ CSV Roster Upload: {upload_data.get('message', 'Success')}")
            else:
                print(f"❌ CSV Roster Upload failed: {upload_response.status_code}")
                print(upload_response.text)
        else:
            print("❌ No teams found for CSV upload test")
    else:
        print(f"❌ Failed to get teams: {teams_response.status_code}")
    
    # Test 2: Game Delete API
    print("\n=== Testing Game Delete API ===")
    
    # Get games to find one to delete (or create a test game)
    games_response = session.get(f"{BACKEND_URL}/games")
    if games_response.status_code == 200:
        games = games_response.json()
        
        # Create a test game for deletion
        if teams:
            test_game_data = {
                "home_team_id": teams[0]["id"],
                "away_team_id": teams[0]["id"] if len(teams) == 1 else teams[1]["id"] if len(teams) > 1 else teams[0]["id"],
                "start_immediately": True,
                "sport": "basketball"
            }
            
            create_response = session.post(f"{BACKEND_URL}/games", json=test_game_data)
            if create_response.status_code == 200:
                test_game = create_response.json()
                test_game_id = test_game["id"]
                print(f"Created test game: {test_game_id}")
                
                # Now delete it
                delete_response = session.delete(f"{BACKEND_URL}/games/{test_game_id}")
                if delete_response.status_code == 200:
                    delete_data = delete_response.json()
                    print(f"✅ Game Delete API: {delete_data.get('message', 'Success')}")
                else:
                    print(f"❌ Game Delete API failed: {delete_response.status_code}")
                    print(delete_response.text)
            else:
                print(f"❌ Failed to create test game: {create_response.status_code}")
        else:
            print("❌ No teams available for game delete test")
    else:
        print(f"❌ Failed to get games: {games_response.status_code}")
    
    print("\n=== Backend Task Testing Complete ===")
    return True

if __name__ == "__main__":
    test_remaining_backend_tasks()