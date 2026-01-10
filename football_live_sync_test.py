#!/usr/bin/env python3
"""
Football Live Sync Testing - Specific test for the review request
Tests the live sync between Football stat tracker and public stats page
"""

import requests
import json
import os
from datetime import datetime
import time

# Get backend URL from environment
BACKEND_URL = "https://baseballtracker-1.preview.emergentagent.com/api"

# Test credentials and data from review request
ADMIN_EMAIL = "antlersportsnetwork@gmail.com"
ADMIN_PASSWORD = "test123"
FOOTBALL_GAME_ID = "a640f656-1ea6-4929-8589-82f58a1069d9"

class FootballLiveSyncTester:
    def __init__(self):
        self.session = requests.Session()
        self.session_token = None
        self.test_results = []
        
    def log_test(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "details": details
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def authenticate(self):
        """Authenticate with admin credentials"""
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.session_token = data.get("session_token")
                # Set session token in headers for future requests
                self.session.headers.update({"Authorization": f"Bearer {self.session_token}"})
                self.log_test("Admin Authentication", True, f"Successfully authenticated as {ADMIN_EMAIL}")
                return True
            else:
                self.log_test("Admin Authentication", False, f"Failed to authenticate: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Admin Authentication", False, f"Authentication error: {str(e)}")
            return False
    
    def test_1_backend_api_state_verification(self):
        """Test 1: Backend API State Verification - GET /api/games/public/{game_id} should return football_state with play_log"""
        try:
            response = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
            
            if response.status_code == 200:
                game_data = response.json()
                
                # Verify required fields exist
                required_fields = ["id", "status", "sport", "home_team_name", "away_team_name"]
                missing_fields = [field for field in required_fields if field not in game_data]
                
                if missing_fields:
                    self.log_test("Backend API State Verification", False, 
                                 f"Missing required fields: {missing_fields}")
                    return None
                
                # Check football_state exists
                football_state = game_data.get("football_state")
                if not football_state:
                    self.log_test("Backend API State Verification", False, 
                                 "No football_state found in game data")
                    return None
                
                # Verify play_log exists and has 3+ plays
                play_log = football_state.get("play_log", [])
                if len(play_log) < 3:
                    self.log_test("Backend API State Verification", False, 
                                 f"play_log has {len(play_log)} plays, expected 3+")
                    return None
                
                # Verify time of possession fields exist
                home_top = football_state.get("home_time_of_possession")
                away_top = football_state.get("away_time_of_possession")
                
                if home_top is None or away_top is None:
                    self.log_test("Backend API State Verification", False, 
                                 "Missing time_of_possession fields")
                    return None
                
                self.log_test("Backend API State Verification", True, 
                             f"Game state verified - {len(play_log)} plays, TOP fields present")
                return game_data
                
            else:
                self.log_test("Backend API State Verification", False, 
                             f"Failed to get public game: {response.status_code}", response.text)
                return None
                
        except Exception as e:
            self.log_test("Backend API State Verification", False, f"Error: {str(e)}")
            return None
    
    def test_2_record_new_play_via_api(self):
        """Test 2: Record a New Play via API - Login and use PUT /api/games/{game_id} to add a test play"""
        try:
            # First get current state
            response = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
            if response.status_code != 200:
                self.log_test("Record New Play via API", False, "Failed to get current game state")
                return None
            
            current_game = response.json()
            current_football_state = current_game.get("football_state", {})
            current_play_log = current_football_state.get("play_log", [])
            current_home_score = current_football_state.get("home_score", 0)
            current_away_score = current_football_state.get("away_score", 0)
            
            # Create a new test play
            new_play = {
                "id": f"test_play_{int(time.time())}",
                "quarter": 2,
                "down": 1,
                "distance": 10,
                "yard_line": 20,
                "play_type": "RUN",
                "carrier": "25",
                "result": "TOUCHDOWN",
                "yards": 20,
                "description": "RUN by #25 for 20 yards TOUCHDOWN",
                "timestamp": datetime.now().isoformat()
            }
            
            # Add the new play to existing play log
            updated_play_log = current_play_log + [new_play]
            
            # Update scores if it's a touchdown
            updated_home_score = current_home_score + 7  # Assuming home team scored
            
            # Create updated football state
            updated_football_state = {
                **current_football_state,
                "play_log": updated_play_log,
                "home_score": updated_home_score,
                "away_score": current_away_score,
                "ball_position": {
                    "yard_line": 50,  # Reset to midfield after touchdown
                    "side": "away"
                },
                "down": 1,
                "distance": 10,
                "quarter": 2
            }
            
            # Update the game
            update_response = self.session.put(f"{BACKEND_URL}/games/{FOOTBALL_GAME_ID}", json={
                "football_state": updated_football_state
            })
            
            if update_response.status_code == 200:
                # Verify the changes were persisted
                verify_response = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
                
                if verify_response.status_code == 200:
                    updated_game = verify_response.json()
                    updated_state = updated_game.get("football_state", {})
                    updated_plays = updated_state.get("play_log", [])
                    
                    # Check if our new play was added
                    new_play_found = any(play.get("id") == new_play["id"] for play in updated_plays)
                    score_updated = updated_state.get("home_score") == updated_home_score
                    
                    if new_play_found and score_updated:
                        self.log_test("Record New Play via API", True, 
                                     f"Successfully added new play and updated score to {updated_home_score}")
                        return updated_state
                    else:
                        self.log_test("Record New Play via API", False, 
                                     f"Play added: {new_play_found}, Score updated: {score_updated}")
                        return None
                else:
                    self.log_test("Record New Play via API", False, 
                                 "Failed to verify changes after update")
                    return None
            else:
                self.log_test("Record New Play via API", False, 
                             f"Failed to update game: {update_response.status_code}", update_response.text)
                return None
                
        except Exception as e:
            self.log_test("Record New Play via API", False, f"Error: {str(e)}")
            return None
    
    def test_3_verify_public_api_returns_updated_data(self):
        """Test 3: Verify Public API Returns Updated Data - GET /api/games/public/{game_id}"""
        try:
            response = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
            
            if response.status_code == 200:
                game_data = response.json()
                football_state = game_data.get("football_state", {})
                play_log = football_state.get("play_log", [])
                
                # Look for our test play
                test_play_found = any(
                    play.get("play_type") == "RUN" and 
                    play.get("result") == "TOUCHDOWN" and
                    play.get("carrier") == "25"
                    for play in play_log
                )
                
                # Check if scores are updated
                home_score = football_state.get("home_score", 0)
                away_score = football_state.get("away_score", 0)
                
                if test_play_found and home_score > 0:
                    self.log_test("Verify Public API Returns Updated Data", True, 
                                 f"Public API shows updated data - Test play found, Scores: {home_score}-{away_score}")
                    return True
                else:
                    self.log_test("Verify Public API Returns Updated Data", False, 
                                 f"Updated data not found - Test play: {test_play_found}, Scores: {home_score}-{away_score}")
                    return False
            else:
                self.log_test("Verify Public API Returns Updated Data", False, 
                             f"Failed to get public game: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Verify Public API Returns Updated Data", False, f"Error: {str(e)}")
            return False
    
    def test_4_verify_game_status(self):
        """Test 4: Verify Game Status - Confirm game.status === "active" and appears in active games list"""
        try:
            # Test 4a: Check game status via public endpoint
            public_response = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
            
            if public_response.status_code != 200:
                self.log_test("Verify Game Status", False, "Failed to get public game data")
                return False
            
            public_game = public_response.json()
            game_status = public_game.get("status")
            
            if game_status != "active":
                self.log_test("Verify Game Status", False, f"Game status is '{game_status}', expected 'active'")
                return False
            
            # Test 4b: Check game appears in active games list (authenticated endpoint)
            games_response = self.session.get(f"{BACKEND_URL}/games")
            
            if games_response.status_code != 200:
                self.log_test("Verify Game Status", False, f"Failed to get games list: {games_response.status_code}")
                return False
            
            games_list = games_response.json()
            
            # Find our game in the list
            target_game = None
            for game in games_list:
                if game.get("id") == FOOTBALL_GAME_ID:
                    target_game = game
                    break
            
            if not target_game:
                self.log_test("Verify Game Status", False, "Game not found in authenticated games list")
                return False
            
            if target_game.get("status") != "active":
                self.log_test("Verify Game Status", False, 
                             f"Game status in list is '{target_game.get('status')}', expected 'active'")
                return False
            
            self.log_test("Verify Game Status", True, 
                         "Game status is 'active' and appears in active games list")
            return True
            
        except Exception as e:
            self.log_test("Verify Game Status", False, f"Error: {str(e)}")
            return False
    
    def test_key_football_state_fields(self):
        """Additional test: Verify key fields in football_state"""
        try:
            response = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
            
            if response.status_code != 200:
                self.log_test("Key Football State Fields", False, "Failed to get game data")
                return False
            
            game_data = response.json()
            football_state = game_data.get("football_state", {})
            
            # Check required fields from review request
            required_fields = [
                "play_log",
                "home_score", "away_score",
                "home_timeouts", "away_timeouts", 
                "home_time_of_possession", "away_time_of_possession",
                "clock_time", "quarter", "possession", "down", "distance", "ball_position"
            ]
            
            missing_fields = []
            present_fields = []
            
            for field in required_fields:
                if field in football_state:
                    present_fields.append(field)
                else:
                    missing_fields.append(field)
            
            if missing_fields:
                self.log_test("Key Football State Fields", False, 
                             f"Missing fields: {missing_fields}. Present: {present_fields}")
                return False
            else:
                # Verify play_log is an array
                play_log = football_state.get("play_log", [])
                if not isinstance(play_log, list):
                    self.log_test("Key Football State Fields", False, "play_log is not an array")
                    return False
                
                self.log_test("Key Football State Fields", True, 
                             f"All required fields present. Play log has {len(play_log)} plays")
                return True
                
        except Exception as e:
            self.log_test("Key Football State Fields", False, f"Error: {str(e)}")
            return False
    
    def run_live_sync_tests(self):
        """Run all live sync tests as specified in the review request"""
        print("🏈 Starting Football Live Sync Tests")
        print("=" * 60)
        print(f"Testing Game ID: {FOOTBALL_GAME_ID}")
        print(f"Admin Email: {ADMIN_EMAIL}")
        print("=" * 60)
        
        # Authentication
        if not self.authenticate():
            print("❌ Authentication failed - cannot continue with tests")
            return False
        
        # Test 1: Backend API State Verification
        initial_state = self.test_1_backend_api_state_verification()
        if not initial_state:
            print("❌ Initial state verification failed - cannot continue")
            return False
        
        # Test 2: Record a New Play via API
        updated_state = self.test_2_record_new_play_via_api()
        if not updated_state:
            print("❌ Failed to record new play - continuing with other tests")
        
        # Test 3: Verify Public API Returns Updated Data
        self.test_3_verify_public_api_returns_updated_data()
        
        # Test 4: Verify Game Status
        self.test_4_verify_game_status()
        
        # Additional test: Key football state fields
        self.test_key_football_state_fields()
        
        # Summary
        print("\n" + "=" * 60)
        print("🏈 Football Live Sync Test Summary")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['message']}")
        
        print(f"\nResults: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All football live sync tests PASSED!")
            return True
        else:
            print(f"⚠️  {total - passed} test(s) FAILED")
            return False

def main():
    """Main test runner"""
    tester = FootballLiveSyncTester()
    success = tester.run_live_sync_tests()
    
    # Save detailed results
    with open("/app/football_live_sync_results.json", "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "overall_success": success,
            "test_results": tester.test_results
        }, f, indent=2)
    
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)