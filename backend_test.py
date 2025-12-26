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
BACKEND_URL = "https://gamestats-grid.preview.emergentagent.com/api"

# Test credentials and data
ADMIN_EMAIL = "antlersportsnetwork@gmail.com"
ADMIN_PASSWORD = "test123"
FOOTBALL_GAME_ID = "a640f656-1ea6-4929-8589-82f58a1069d9"

class FootballFeatureTester:
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
    
    def test_share_button_api(self):
        """Test Share Button functionality - verify game is accessible via public endpoint"""
        try:
            # Test the public endpoint that the share button would link to
            response = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
            
            if response.status_code == 200:
                game_data = response.json()
                
                # Verify required fields for share functionality
                required_fields = ["id", "home_team_name", "away_team_name", "status", "sport"]
                missing_fields = [field for field in required_fields if field not in game_data]
                
                if missing_fields:
                    self.log_test("Share Button API", False, 
                                 f"Missing required fields for share: {missing_fields}")
                    return False
                
                # Verify it's a football game
                if game_data.get("sport") != "football":
                    self.log_test("Share Button API", False, 
                                 f"Game sport is {game_data.get('sport')}, expected 'football'")
                    return False
                
                self.log_test("Share Button API", True, 
                             f"Share link endpoint working - Game: {game_data.get('home_team_name')} vs {game_data.get('away_team_name')}")
                return True
            else:
                self.log_test("Share Button API", False, 
                             f"Share link endpoint failed: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Share Button API", False, f"Error testing share functionality: {str(e)}")
            return False
    
    def test_time_of_possession_backend(self):
        """Test Time of Possession - verify TOP is saved and retrieved correctly"""
        try:
            # Create football state with time of possession data
            football_state = {
                "play_log": [
                    {
                        "id": "play_top_001",
                        "quarter": 1,
                        "down": 1,
                        "distance": 10,
                        "yard_line": 25,
                        "play_type": "RUN",
                        "carrier": "22",
                        "result": "GAIN",
                        "yards": 5,
                        "description": "RUN by #22 for 5 yards GAIN",
                        "timestamp": datetime.now().isoformat(),
                        "possession_time": 45  # 45 seconds for this play
                    }
                ],
                "scores": {
                    "home": 0,
                    "away": 0
                },
                "home_time_of_possession": 300,  # 5 minutes
                "away_time_of_possession": 420,  # 7 minutes
                "quarter": 1,
                "clock": "12:15",
                "possession": "home"
            }
            
            # Update game with TOP data
            response = self.session.put(f"{BACKEND_URL}/games/{FOOTBALL_GAME_ID}", json={
                "football_state": football_state,
                "home_time_of_possession": 300,
                "away_time_of_possession": 420
            })
            
            if response.status_code == 200:
                # Verify TOP was saved by checking public endpoint
                verify_response = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
                
                if verify_response.status_code == 200:
                    game_data = verify_response.json()
                    saved_state = game_data.get("football_state", {})
                    
                    home_top = saved_state.get("home_time_of_possession")
                    away_top = saved_state.get("away_time_of_possession")
                    
                    if home_top == 300 and away_top == 420:
                        self.log_test("Time of Possession Backend", True, 
                                     f"TOP correctly saved - Home: {home_top}s, Away: {away_top}s")
                        return True
                    else:
                        self.log_test("Time of Possession Backend", False, 
                                     f"TOP not saved correctly - Home: {home_top}, Away: {away_top}")
                        return False
                else:
                    self.log_test("Time of Possession Backend", False, 
                                 "Failed to verify TOP via public endpoint")
                    return False
            else:
                self.log_test("Time of Possession Backend", False, 
                             f"Failed to update game with TOP: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Time of Possession Backend", False, f"Error testing TOP: {str(e)}")
            return False
    
    def test_drives_section_data(self):
        """Test Drives Section - verify drive data is available in API response"""
        try:
            # Create football state with drive data
            football_state = {
                "play_log": [
                    {
                        "id": "drive1_play1",
                        "quarter": 1,
                        "down": 1,
                        "distance": 10,
                        "yard_line": 25,
                        "play_type": "RUN",
                        "carrier": "22",
                        "result": "GAIN",
                        "yards": 7,
                        "description": "RUN by #22 for 7 yards GAIN",
                        "drive_id": "drive_1"
                    },
                    {
                        "id": "drive1_play2",
                        "quarter": 1,
                        "down": 2,
                        "distance": 3,
                        "yard_line": 32,
                        "play_type": "PASS",
                        "passer": "12",
                        "receiver": "88",
                        "result": "TOUCHDOWN",
                        "yards": 25,
                        "description": "PASS from #12 to #88 for 25 yards TOUCHDOWN",
                        "drive_id": "drive_1"
                    }
                ],
                "drives": [
                    {
                        "id": "drive_1",
                        "team": "home",
                        "start_yard": 25,
                        "end_yard": 0,  # Touchdown
                        "plays": 2,
                        "yards": 32,
                        "result": "touchdown",
                        "time_elapsed": 120
                    }
                ],
                "scores": {
                    "home": 7,
                    "away": 0
                }
            }
            
            # Update game with drive data
            response = self.session.put(f"{BACKEND_URL}/games/{FOOTBALL_GAME_ID}", json={
                "football_state": football_state
            })
            
            if response.status_code == 200:
                # Verify drive data is available
                verify_response = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
                
                if verify_response.status_code == 200:
                    game_data = verify_response.json()
                    saved_state = game_data.get("football_state", {})
                    
                    drives = saved_state.get("drives", [])
                    play_log = saved_state.get("play_log", [])
                    
                    if len(drives) > 0 and len(play_log) >= 2:
                        drive = drives[0]
                        if (drive.get("plays") == 2 and 
                            drive.get("yards") == 32 and 
                            drive.get("result") == "touchdown"):
                            
                            self.log_test("Drives Section Data", True, 
                                         f"Drive data available - {len(drives)} drives, {len(play_log)} plays")
                            return True
                        else:
                            self.log_test("Drives Section Data", False, 
                                         "Drive data incomplete", f"Drive: {drive}")
                            return False
                    else:
                        self.log_test("Drives Section Data", False, 
                                     f"Insufficient drive data - {len(drives)} drives, {len(play_log)} plays")
                        return False
                else:
                    self.log_test("Drives Section Data", False, 
                                 "Failed to retrieve drive data")
                    return False
            else:
                self.log_test("Drives Section Data", False, 
                             f"Failed to save drive data: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Drives Section Data", False, f"Error testing drives: {str(e)}")
            return False
    
    def test_box_score_data(self):
        """Test Box Score Section - verify offense/defense stats are available"""
        try:
            # Create football state with detailed player stats for box score
            football_state = {
                "play_log": [
                    {
                        "id": "box_play1",
                        "quarter": 1,
                        "play_type": "PASS",
                        "passer": "12",
                        "receiver": "88",
                        "result": "COMPLETE",
                        "yards": 15,
                        "description": "PASS from #12 to #88 for 15 yards COMPLETE"
                    },
                    {
                        "id": "box_play2",
                        "quarter": 1,
                        "play_type": "RUN",
                        "carrier": "22",
                        "result": "GAIN",
                        "yards": 8,
                        "description": "RUN by #22 for 8 yards GAIN"
                    }
                ],
                "player_stats": {
                    "home": {
                        "passing": {
                            "12": {
                                "name": "John Quarterback",
                                "completions": 1,
                                "attempts": 1,
                                "yards": 15,
                                "touchdowns": 0,
                                "interceptions": 0
                            }
                        },
                        "rushing": {
                            "22": {
                                "name": "Mike Runner",
                                "carries": 1,
                                "yards": 8,
                                "touchdowns": 0
                            }
                        },
                        "receiving": {
                            "88": {
                                "name": "Tom Receiver",
                                "receptions": 1,
                                "yards": 15,
                                "touchdowns": 0
                            }
                        }
                    },
                    "away": {
                        "passing": {},
                        "rushing": {},
                        "receiving": {}
                    }
                },
                "team_stats": {
                    "home": {
                        "passing_yards": 15,
                        "rushing_yards": 8,
                        "total_yards": 23,
                        "first_downs": 2
                    },
                    "away": {
                        "passing_yards": 0,
                        "rushing_yards": 0,
                        "total_yards": 0,
                        "first_downs": 0
                    }
                }
            }
            
            # Update game with box score data
            response = self.session.put(f"{BACKEND_URL}/games/{FOOTBALL_GAME_ID}", json={
                "football_state": football_state
            })
            
            if response.status_code == 200:
                # Verify box score data is available
                verify_response = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
                
                if verify_response.status_code == 200:
                    game_data = verify_response.json()
                    saved_state = game_data.get("football_state", {})
                    
                    player_stats = saved_state.get("player_stats", {})
                    team_stats = saved_state.get("team_stats", {})
                    
                    home_passing = player_stats.get("home", {}).get("passing", {})
                    home_team_stats = team_stats.get("home", {})
                    
                    if (len(home_passing) > 0 and 
                        home_team_stats.get("passing_yards") == 15 and
                        home_team_stats.get("rushing_yards") == 8):
                        
                        self.log_test("Box Score Data", True, 
                                     "Box score data available - player stats and team stats present")
                        return True
                    else:
                        self.log_test("Box Score Data", False, 
                                     "Box score data incomplete", 
                                     f"Player stats: {len(home_passing)}, Team stats: {home_team_stats}")
                        return False
                else:
                    self.log_test("Box Score Data", False, 
                                 "Failed to retrieve box score data")
                    return False
            else:
                self.log_test("Box Score Data", False, 
                             f"Failed to save box score data: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Box Score Data", False, f"Error testing box score: {str(e)}")
            return False
    
    def test_timeouts_display_data(self):
        """Test Timeouts Display - verify timeout data is saved and retrieved"""
        try:
            # Create football state with timeout data
            football_state = {
                "home_timeouts": 2,  # Used 2 timeouts
                "away_timeouts": 1,  # Used 1 timeout
                "quarter": 2,
                "clock": "8:45"
            }
            
            # Update game with timeout data
            response = self.session.put(f"{BACKEND_URL}/games/{FOOTBALL_GAME_ID}", json={
                "football_state": football_state
            })
            
            if response.status_code == 200:
                # Verify timeout data is available
                verify_response = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
                
                if verify_response.status_code == 200:
                    game_data = verify_response.json()
                    saved_state = game_data.get("football_state", {})
                    
                    home_timeouts = saved_state.get("home_timeouts")
                    away_timeouts = saved_state.get("away_timeouts")
                    
                    if home_timeouts == 2 and away_timeouts == 1:
                        self.log_test("Timeouts Display Data", True, 
                                     f"Timeout data saved correctly - Home: {home_timeouts}, Away: {away_timeouts}")
                        return True
                    else:
                        self.log_test("Timeouts Display Data", False, 
                                     f"Timeout data incorrect - Home: {home_timeouts}, Away: {away_timeouts}")
                        return False
                else:
                    self.log_test("Timeouts Display Data", False, 
                                 "Failed to retrieve timeout data")
                    return False
            else:
                self.log_test("Timeouts Display Data", False, 
                             f"Failed to save timeout data: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Timeouts Display Data", False, f"Error testing timeouts: {str(e)}")
            return False
    
    def test_api_endpoints_comprehensive(self):
        """Test API endpoints comprehensively - GET public and PUT authenticated"""
        try:
            # Test 1: GET /api/games/public/{game_id} - should return football_state
            public_response = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
            
            if public_response.status_code != 200:
                self.log_test("API Endpoints Comprehensive", False, 
                             f"Public GET failed: {public_response.status_code}")
                return False
            
            public_data = public_response.json()
            football_state = public_data.get("football_state", {})
            
            # Check if basic football state exists (may not have play_log yet)
            if not football_state:
                self.log_test("API Endpoints Comprehensive", False, 
                             "Public endpoint missing football_state")
                return False
            
            # Test 2: PUT /api/games/{game_id} - should save football_state with time_of_possession
            test_state = {
                "play_log": [
                    {
                        "id": "api_test_play",
                        "quarter": 1,
                        "play_type": "RUN",
                        "carrier": "25",
                        "result": "GAIN",
                        "yards": 4,
                        "description": "API test play"
                    }
                ],
                "home_time_of_possession": 600,  # 10 minutes
                "away_time_of_possession": 300   # 5 minutes
            }
            
            put_response = self.session.put(f"{BACKEND_URL}/games/{FOOTBALL_GAME_ID}", json={
                "football_state": test_state
            })
            
            if put_response.status_code != 200:
                self.log_test("API Endpoints Comprehensive", False, 
                             f"PUT request failed: {put_response.status_code}")
                return False
            
            # Verify the PUT worked by checking public endpoint again
            verify_response = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
            
            if verify_response.status_code == 200:
                verify_data = verify_response.json()
                verify_state = verify_data.get("football_state", {})
                verify_play_log = verify_state.get("play_log", [])
                home_top = verify_state.get("home_time_of_possession")
                away_top = verify_state.get("away_time_of_possession")
                
                # Check if our test play was saved
                test_play_found = any(play.get("id") == "api_test_play" for play in verify_play_log)
                
                if test_play_found and home_top == 600 and away_top == 300:
                    self.log_test("API Endpoints Comprehensive", True, 
                                 "Both GET public and PUT authenticated endpoints working correctly")
                    return True
                else:
                    self.log_test("API Endpoints Comprehensive", False, 
                                 f"Data not saved correctly - Play found: {test_play_found}, TOP: {home_top}/{away_top}")
                    return False
            else:
                self.log_test("API Endpoints Comprehensive", False, 
                             "Failed to verify PUT via public endpoint")
                return False
                
        except Exception as e:
            self.log_test("API Endpoints Comprehensive", False, f"Error testing API endpoints: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all football feature tests"""
        print("🏈 Starting Football Feature Backend API Tests")
        print("=" * 60)
        
        # Test 1: Authentication
        if not self.authenticate():
            print("❌ Authentication failed - cannot continue with other tests")
            return False
        
        # Test 2: Share Button API
        self.test_share_button_api()
        
        # Test 3: Time of Possession Backend
        self.test_time_of_possession_backend()
        
        # Test 4: Drives Section Data
        self.test_drives_section_data()
        
        # Test 5: Box Score Data
        self.test_box_score_data()
        
        # Test 6: Timeouts Display Data
        self.test_timeouts_display_data()
        
        # Test 7: API Endpoints Comprehensive
        self.test_api_endpoints_comprehensive()
        
        # Summary
        print("\n" + "=" * 60)
        print("🏈 Football Feature Backend Test Summary")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['message']}")
        
        print(f"\nResults: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All football feature backend tests PASSED!")
            return True
        else:
            print(f"⚠️  {total - passed} test(s) FAILED")
            return False

def main():
    """Main test runner"""
    tester = FootballFeatureTester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open("/app/football_feature_test_results.json", "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "overall_success": success,
            "test_results": tester.test_results
        }, f, indent=2)
    
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)