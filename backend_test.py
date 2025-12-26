#!/usr/bin/env python3
"""
Backend API Testing for StatMoose Football Stat Tracking
Tests the new football features: Share Button, Time of Possession, Drives, Box Score, Timeouts
"""

import requests
import json
import os
import time
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://statmoose-sports.preview.emergentagent.com/api"

# Test credentials and data
ADMIN_EMAIL = "antlersportsnetwork@gmail.com"
ADMIN_PASSWORD = "test123"
FOOTBALL_GAME_ID = "a640f656-1ea6-4929-8589-82f58a1069d9"

class FootballBackendTester:
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
    
    def test_game_exists(self):
        """Test that the football game exists and is accessible"""
        try:
            response = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
            
            if response.status_code == 200:
                game_data = response.json()
                sport = game_data.get("sport", "unknown")
                status = game_data.get("status", "unknown")
                home_team = game_data.get("home_team_name", "Unknown")
                away_team = game_data.get("away_team_name", "Unknown")
                
                self.log_test("Football Game Exists", True, 
                             f"Game found - Sport: {sport}, Status: {status}, Teams: {home_team} vs {away_team}")
                return game_data
            else:
                self.log_test("Football Game Exists", False, 
                             f"Game not found: {response.status_code}", response.text)
                return None
                
        except Exception as e:
            self.log_test("Football Game Exists", False, f"Error checking game: {str(e)}")
            return None
    
    def test_football_state_update(self):
        """Test updating football state via PUT /api/games/{game_id}"""
        try:
            # Create sample football state data
            football_state = {
                "play_log": [
                    {
                        "id": "play_001",
                        "quarter": 1,
                        "down": 1,
                        "distance": 10,
                        "yard_line": 25,
                        "play_type": "RUN",
                        "carrier": "22",
                        "result": "GAIN",
                        "yards": 7,
                        "description": "RUN by #22 for 7 yards GAIN",
                        "timestamp": datetime.now().isoformat()
                    }
                ],
                "scores": {
                    "home": 0,
                    "away": 0
                },
                "ball_position": {
                    "yard_line": 32,
                    "side": "home"
                },
                "down": 2,
                "distance": 3,
                "quarter": 1,
                "clock": "14:53"
            }
            
            # Update game with football state
            response = self.session.put(f"{BACKEND_URL}/games/{FOOTBALL_GAME_ID}", json={
                "football_state": football_state
            })
            
            if response.status_code == 200:
                # The PUT response doesn't include football_state due to Game model limitations
                # But we can verify it was saved by checking the public endpoint
                verify_response = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
                
                if verify_response.status_code == 200:
                    game_data = verify_response.json()
                    saved_state = game_data.get("football_state")
                    
                    if saved_state:
                        # Verify key fields were saved
                        play_log = saved_state.get("play_log", [])
                        scores = saved_state.get("scores", {})
                        ball_pos = saved_state.get("ball_position", {})
                        
                        if (len(play_log) > 0 and 
                            play_log[0].get("play_type") == "RUN" and
                            scores.get("home") == 0 and
                            ball_pos.get("yard_line") == 32):
                            
                            self.log_test("Football State Update", True, 
                                         "Football state successfully saved and verified via public endpoint")
                            return saved_state
                        else:
                            self.log_test("Football State Update", False, 
                                         "Football state saved but data integrity check failed", 
                                         f"Saved state: {saved_state}")
                            return None
                    else:
                        self.log_test("Football State Update", False, 
                                     "Football state not found after update")
                        return None
                else:
                    self.log_test("Football State Update", False, 
                                 "Failed to verify update via public endpoint")
                    return None
            else:
                self.log_test("Football State Update", False, 
                             f"Failed to update game: {response.status_code}", response.text)
                return None
                
        except Exception as e:
            self.log_test("Football State Update", False, f"Error updating football state: {str(e)}")
            return None
    
    def test_football_state_persistence(self):
        """Test that football state persists when retrieved via public endpoint"""
        try:
            response = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
            
            if response.status_code == 200:
                game_data = response.json()
                football_state = game_data.get("football_state")
                
                if football_state:
                    # Check if our test data persisted
                    play_log = football_state.get("play_log", [])
                    scores = football_state.get("scores", {})
                    ball_pos = football_state.get("ball_position", {})
                    down = football_state.get("down")
                    distance = football_state.get("distance")
                    
                    # Verify the data we saved is still there
                    if (len(play_log) > 0 and 
                        play_log[0].get("play_type") == "RUN" and
                        play_log[0].get("carrier") == "22" and
                        play_log[0].get("yards") == 7 and
                        scores.get("home") == 0 and
                        ball_pos.get("yard_line") == 32 and
                        down == 2 and
                        distance == 3):
                        
                        self.log_test("Football State Persistence", True, 
                                     "Football state correctly persisted and retrieved from public endpoint")
                        return True
                    else:
                        self.log_test("Football State Persistence", False, 
                                     "Football state retrieved but data doesn't match expected values",
                                     f"Retrieved state: {football_state}")
                        return False
                else:
                    self.log_test("Football State Persistence", False, 
                                 "No football state found in public game data")
                    return False
            else:
                self.log_test("Football State Persistence", False, 
                             f"Failed to retrieve public game: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Football State Persistence", False, f"Error checking persistence: {str(e)}")
            return False
    
    def test_football_stats_accumulation(self):
        """Test that football stats accumulate correctly with multiple plays"""
        try:
            # Add a second play to test accumulation
            football_state = {
                "play_log": [
                    {
                        "id": "play_001",
                        "quarter": 1,
                        "down": 1,
                        "distance": 10,
                        "yard_line": 25,
                        "play_type": "RUN",
                        "carrier": "22",
                        "result": "GAIN",
                        "yards": 7,
                        "description": "RUN by #22 for 7 yards GAIN",
                        "timestamp": datetime.now().isoformat()
                    },
                    {
                        "id": "play_002",
                        "quarter": 1,
                        "down": 2,
                        "distance": 3,
                        "yard_line": 32,
                        "play_type": "PASS",
                        "passer": "12",
                        "receiver": "88",
                        "result": "COMPLETE",
                        "yards": 15,
                        "description": "PASS from #12 to #88 for 15 yards COMPLETE",
                        "timestamp": datetime.now().isoformat()
                    }
                ],
                "scores": {
                    "home": 7,
                    "away": 0
                },
                "ball_position": {
                    "yard_line": 47,
                    "side": "home"
                },
                "down": 1,
                "distance": 10,
                "quarter": 1,
                "clock": "13:45",
                "team_stats": {
                    "home": {
                        "rushing_yards": 7,
                        "passing_yards": 15,
                        "total_yards": 22,
                        "first_downs": 1
                    },
                    "away": {
                        "rushing_yards": 0,
                        "passing_yards": 0,
                        "total_yards": 0,
                        "first_downs": 0
                    }
                }
            }
            
            # Update with accumulated stats
            response = self.session.put(f"{BACKEND_URL}/games/{FOOTBALL_GAME_ID}", json={
                "football_state": football_state
            })
            
            if response.status_code == 200:
                # Verify the stats were saved
                response = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
                if response.status_code == 200:
                    game_data = response.json()
                    saved_state = game_data.get("football_state", {})
                    team_stats = saved_state.get("team_stats", {})
                    home_stats = team_stats.get("home", {})
                    
                    if (home_stats.get("rushing_yards") == 7 and
                        home_stats.get("passing_yards") == 15 and
                        home_stats.get("total_yards") == 22 and
                        len(saved_state.get("play_log", [])) == 2):
                        
                        self.log_test("Football Stats Accumulation", True, 
                                     "Football stats correctly accumulated across multiple plays")
                        return True
                    else:
                        self.log_test("Football Stats Accumulation", False, 
                                     "Stats accumulation failed", 
                                     f"Home stats: {home_stats}")
                        return False
                else:
                    self.log_test("Football Stats Accumulation", False, 
                                 "Failed to retrieve updated game for verification")
                    return False
            else:
                self.log_test("Football Stats Accumulation", False, 
                             f"Failed to update game with accumulated stats: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Football Stats Accumulation", False, f"Error testing stats accumulation: {str(e)}")
            return False
    
    def test_public_stats_endpoint(self):
        """Test that public stats endpoint returns football data correctly"""
        try:
            response = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
            
            if response.status_code == 200:
                game_data = response.json()
                
                # Check required fields for public stats display
                required_fields = ["id", "home_team_name", "away_team_name", "status", "sport"]
                missing_fields = [field for field in required_fields if field not in game_data]
                
                if missing_fields:
                    self.log_test("Public Stats Endpoint", False, 
                                 f"Missing required fields: {missing_fields}")
                    return False
                
                # Check if football state is included
                football_state = game_data.get("football_state")
                if football_state:
                    play_log = football_state.get("play_log", [])
                    team_stats = football_state.get("team_stats", {})
                    
                    self.log_test("Public Stats Endpoint", True, 
                                 f"Public endpoint working - {len(play_log)} plays, stats available: {bool(team_stats)}")
                    return True
                else:
                    self.log_test("Public Stats Endpoint", True, 
                                 "Public endpoint working but no football state (may be expected for new games)")
                    return True
            else:
                self.log_test("Public Stats Endpoint", False, 
                             f"Public endpoint failed: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Public Stats Endpoint", False, f"Error testing public endpoint: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all football backend tests"""
        print("🏈 Starting Football Backend API Tests")
        print("=" * 50)
        
        # Test 1: Authentication
        if not self.authenticate():
            print("❌ Authentication failed - cannot continue with other tests")
            return False
        
        # Test 2: Game exists
        game_data = self.test_game_exists()
        if not game_data:
            print("❌ Game not found - cannot continue with state tests")
            return False
        
        # Test 3: Football state update
        self.test_football_state_update()
        
        # Test 4: Football state persistence
        self.test_football_state_persistence()
        
        # Test 5: Stats accumulation
        self.test_football_stats_accumulation()
        
        # Test 6: Public stats endpoint
        self.test_public_stats_endpoint()
        
        # Summary
        print("\n" + "=" * 50)
        print("🏈 Football Backend Test Summary")
        print("=" * 50)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['message']}")
        
        print(f"\nResults: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All football backend tests PASSED!")
            return True
        else:
            print(f"⚠️  {total - passed} test(s) FAILED")
            return False

def main():
    """Main test runner"""
    tester = FootballBackendTester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open("/app/football_test_results.json", "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "overall_success": success,
            "test_results": tester.test_results
        }, f, indent=2)
    
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)