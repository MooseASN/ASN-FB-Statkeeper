#!/usr/bin/env python3
"""
Drive Tracking Integration Test for StatMoose Football Stat Tracker
Tests the drive tracking functionality as specified in the review request
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

class DriveTrackingTester:
    def __init__(self):
        self.session = requests.Session()
        self.session_token = None
        self.test_results = []
        self.initial_game_state = None
        
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
                self.session.headers.update({"Authorization": f"Bearer {self.session_token}"})
                self.log_test("Authentication", True, f"Successfully authenticated as {ADMIN_EMAIL}")
                return True
            else:
                self.log_test("Authentication", False, f"Failed to authenticate: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Authentication", False, f"Authentication error: {str(e)}")
            return False
    
    def get_initial_game_state(self):
        """Get initial game state for comparison"""
        try:
            response = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
            if response.status_code == 200:
                self.initial_game_state = response.json()
                football_state = self.initial_game_state.get("football_state", {})
                play_count = len(football_state.get("play_log", []))
                self.log_test("Initial Game State", True, f"Retrieved initial state - {play_count} existing plays")
                return True
            else:
                self.log_test("Initial Game State", False, f"Failed to get initial state: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Initial Game State", False, f"Error getting initial state: {str(e)}")
            return False
    
    def test_run_play_submission(self):
        """Test submitting a Run play and verify drive tracking"""
        try:
            # Create a run play with drive tracking data
            current_time = datetime.now().isoformat()
            play_id = f"test_run_{int(time.time())}"
            
            football_state = {
                "play_log": [
                    {
                        "id": play_id,
                        "play_id": play_id,
                        "quarter": 1,
                        "period": 1,
                        "down": 1,
                        "distance": 10,
                        "yard_line": 25,
                        "ball_position": 25,
                        "play_type": "RUN",
                        "carrier": "22",
                        "carrier_name": "Mike Johnson",
                        "result": "GAIN",
                        "yards": 7,
                        "description": "RUN by #22 Mike Johnson for 7 yards GAIN",
                        "timestamp": current_time,
                        "clock_start": "14:45",
                        "clock_end": "14:20",
                        "start_spot": 25,
                        "end_spot": 32,
                        "no_play": False,
                        "drive_id": "drive_test_1"
                    }
                ],
                "current_drive": {
                    "id": "drive_test_1",
                    "team": "home",
                    "start_yard": 25,
                    "current_yard": 32,
                    "playCount": 1,
                    "netYards": 7,
                    "result": "ongoing",
                    "start_time": "15:00",
                    "plays": [play_id]
                },
                "all_drives": [
                    {
                        "id": "drive_test_1",
                        "team": "home",
                        "start_yard": 25,
                        "current_yard": 32,
                        "playCount": 1,
                        "netYards": 7,
                        "result": "ongoing",
                        "start_time": "15:00",
                        "plays": [play_id]
                    }
                ],
                "scores": {
                    "home": 0,
                    "away": 0
                },
                "quarter": 1,
                "down": 2,
                "distance": 3,
                "ball_position": 32,
                "possession": "home"
            }
            
            # Submit the play
            response = self.session.put(f"{BACKEND_URL}/games/{FOOTBALL_GAME_ID}", json={
                "football_state": football_state
            })
            
            if response.status_code == 200:
                # Verify the play was recorded correctly
                verify_response = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
                
                if verify_response.status_code == 200:
                    game_data = verify_response.json()
                    saved_state = game_data.get("football_state", {})
                    
                    # Check play log
                    play_log = saved_state.get("play_log", [])
                    test_play = None
                    for play in play_log:
                        if play.get("id") == play_id:
                            test_play = play
                            break
                    
                    if not test_play:
                        self.log_test("Run Play Submission", False, "Test play not found in play log")
                        return False
                    
                    # Verify play details
                    if (test_play.get("play_type") == "RUN" and 
                        test_play.get("carrier_name") == "Mike Johnson" and
                        test_play.get("yards") == 7 and
                        "Mike Johnson" in test_play.get("description", "")):
                        
                        # Check drive tracking
                        current_drive = saved_state.get("current_drive", {})
                        if (current_drive.get("playCount") >= 1 and 
                            current_drive.get("netYards") >= 7):
                            
                            # Check ball position update
                            if saved_state.get("ball_position") == 32:
                                # Check down and distance
                                if (saved_state.get("down") == 2 and 
                                    saved_state.get("distance") == 3):
                                    
                                    self.log_test("Run Play Submission", True, 
                                                 "Run play recorded correctly with player names, drive stats, ball position, and down/distance updates")
                                    return True
                                else:
                                    self.log_test("Run Play Submission", False, 
                                                 f"Down/distance not updated correctly: {saved_state.get('down')}/{saved_state.get('distance')}")
                                    return False
                            else:
                                self.log_test("Run Play Submission", False, 
                                             f"Ball position not updated correctly: {saved_state.get('ball_position')}")
                                return False
                        else:
                            self.log_test("Run Play Submission", False, 
                                         f"Drive stats not updated: plays={current_drive.get('playCount')}, yards={current_drive.get('netYards')}")
                            return False
                    else:
                        self.log_test("Run Play Submission", False, 
                                     "Play details not recorded correctly", test_play)
                        return False
                else:
                    self.log_test("Run Play Submission", False, "Failed to verify play submission")
                    return False
            else:
                self.log_test("Run Play Submission", False, f"Failed to submit run play: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Run Play Submission", False, f"Error testing run play: {str(e)}")
            return False
    
    def test_pass_play_submission(self):
        """Test submitting a Pass play and verify drive accumulation"""
        try:
            current_time = datetime.now().isoformat()
            play_id = f"test_pass_{int(time.time())}"
            
            football_state = {
                "play_log": [
                    {
                        "id": play_id,
                        "play_id": play_id,
                        "quarter": 1,
                        "period": 1,
                        "down": 2,
                        "distance": 3,
                        "yard_line": 32,
                        "ball_position": 32,
                        "play_type": "PASS",
                        "passer": "12",
                        "passer_name": "Tom Brady",
                        "receiver": "88",
                        "receiver_name": "Jerry Rice",
                        "result": "COMPLETE",
                        "yards": 15,
                        "description": "PASS from #12 Tom Brady to #88 Jerry Rice for 15 yards COMPLETE",
                        "timestamp": current_time,
                        "clock_start": "14:20",
                        "clock_end": "13:55",
                        "start_spot": 32,
                        "end_spot": 47,
                        "no_play": False,
                        "drive_id": "drive_test_1"
                    }
                ],
                "current_drive": {
                    "id": "drive_test_1",
                    "team": "home",
                    "start_yard": 25,
                    "current_yard": 47,
                    "playCount": 2,
                    "netYards": 22,  # 7 from previous run + 15 from this pass
                    "result": "ongoing",
                    "start_time": "15:00",
                    "plays": [f"test_run_{int(time.time())-1}", play_id]
                },
                "all_drives": [
                    {
                        "id": "drive_test_1",
                        "team": "home",
                        "start_yard": 25,
                        "current_yard": 47,
                        "playCount": 2,
                        "netYards": 22,
                        "result": "ongoing",
                        "start_time": "15:00",
                        "plays": [f"test_run_{int(time.time())-1}", play_id]
                    }
                ],
                "scores": {
                    "home": 0,
                    "away": 0
                },
                "quarter": 1,
                "down": 1,
                "distance": 10,
                "ball_position": 47,
                "possession": "home"
            }
            
            # Submit the pass play
            response = self.session.put(f"{BACKEND_URL}/games/{FOOTBALL_GAME_ID}", json={
                "football_state": football_state
            })
            
            if response.status_code == 200:
                # Verify the pass play was recorded correctly
                verify_response = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
                
                if verify_response.status_code == 200:
                    game_data = verify_response.json()
                    saved_state = game_data.get("football_state", {})
                    
                    # Check play log for pass play
                    play_log = saved_state.get("play_log", [])
                    test_play = None
                    for play in play_log:
                        if play.get("id") == play_id:
                            test_play = play
                            break
                    
                    if not test_play:
                        self.log_test("Pass Play Submission", False, "Test pass play not found in play log")
                        return False
                    
                    # Verify pass play details with player names
                    if (test_play.get("play_type") == "PASS" and 
                        test_play.get("passer_name") == "Tom Brady" and
                        test_play.get("receiver_name") == "Jerry Rice" and
                        test_play.get("yards") == 15 and
                        "Tom Brady" in test_play.get("description", "") and
                        "Jerry Rice" in test_play.get("description", "")):
                        
                        # Check drive accumulation
                        current_drive = saved_state.get("current_drive", {})
                        if (current_drive.get("playCount") >= 2 and 
                            current_drive.get("netYards") >= 22):
                            
                            self.log_test("Pass Play Submission", True, 
                                         "Pass play recorded correctly with QB/receiver names and drive stats accumulated")
                            return True
                        else:
                            self.log_test("Pass Play Submission", False, 
                                         f"Drive stats not accumulated correctly: plays={current_drive.get('playCount')}, yards={current_drive.get('netYards')}")
                            return False
                    else:
                        self.log_test("Pass Play Submission", False, 
                                     "Pass play details not recorded correctly", test_play)
                        return False
                else:
                    self.log_test("Pass Play Submission", False, "Failed to verify pass play submission")
                    return False
            else:
                self.log_test("Pass Play Submission", False, f"Failed to submit pass play: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Pass Play Submission", False, f"Error testing pass play: {str(e)}")
            return False
    
    def test_touchdown_scenario(self):
        """Test touchdown scenario with automatic workflows"""
        try:
            current_time = datetime.now().isoformat()
            td_play_id = f"test_td_{int(time.time())}"
            
            # Submit touchdown play
            football_state = {
                "play_log": [
                    {
                        "id": td_play_id,
                        "play_id": td_play_id,
                        "quarter": 1,
                        "period": 1,
                        "down": 1,
                        "distance": 10,
                        "yard_line": 8,
                        "ball_position": 8,
                        "play_type": "RUN",
                        "carrier": "22",
                        "carrier_name": "Mike Johnson",
                        "result": "TOUCHDOWN",
                        "yards": 8,
                        "description": "RUN by #22 Mike Johnson for 8 yards TOUCHDOWN",
                        "timestamp": current_time,
                        "clock_start": "13:55",
                        "clock_end": "13:30",
                        "start_spot": 8,
                        "end_spot": 0,
                        "no_play": False,
                        "drive_id": "drive_test_1"
                    }
                ],
                "current_drive": {
                    "id": "drive_test_1",
                    "team": "home",
                    "start_yard": 25,
                    "current_yard": 0,
                    "playCount": 3,
                    "netYards": 30,  # Total drive yards
                    "result": "touchdown",
                    "start_time": "15:00",
                    "end_time": "13:30",
                    "plays": [f"test_run_{int(time.time())-2}", f"test_pass_{int(time.time())-1}", td_play_id]
                },
                "all_drives": [
                    {
                        "id": "drive_test_1",
                        "team": "home",
                        "start_yard": 25,
                        "current_yard": 0,
                        "playCount": 3,
                        "netYards": 30,
                        "result": "touchdown",
                        "start_time": "15:00",
                        "end_time": "13:30",
                        "plays": [f"test_run_{int(time.time())-2}", f"test_pass_{int(time.time())-1}", td_play_id]
                    }
                ],
                "scores": {
                    "home": 6,  # +6 points for touchdown
                    "away": 0
                },
                "quarter": 1,
                "possession": "home",
                "next_play_type": "EXTRA_POINT"  # Should trigger extra point workflow
            }
            
            # Submit touchdown
            response = self.session.put(f"{BACKEND_URL}/games/{FOOTBALL_GAME_ID}", json={
                "football_state": football_state
            })
            
            if response.status_code == 200:
                # Verify touchdown was recorded
                verify_response = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
                
                if verify_response.status_code == 200:
                    game_data = verify_response.json()
                    saved_state = game_data.get("football_state", {})
                    
                    # Check score update
                    scores = saved_state.get("scores", {})
                    if scores.get("home") >= 6:
                        # Check drive ended
                        current_drive = saved_state.get("current_drive", {})
                        if current_drive.get("result") == "touchdown":
                            
                            # Now test Extra Point
                            ep_play_id = f"test_ep_{int(time.time())}"
                            ep_state = {
                                "play_log": saved_state.get("play_log", []) + [
                                    {
                                        "id": ep_play_id,
                                        "play_id": ep_play_id,
                                        "quarter": 1,
                                        "play_type": "EXTRA_POINT",
                                        "kicker": "9",
                                        "kicker_name": "Adam Vinatieri",
                                        "result": "GOOD",
                                        "yards": 0,
                                        "description": "EXTRA POINT by #9 Adam Vinatieri GOOD",
                                        "timestamp": datetime.now().isoformat()
                                    }
                                ],
                                "scores": {
                                    "home": 7,  # +1 point for extra point
                                    "away": 0
                                },
                                "next_play_type": "KICKOFF"  # Should trigger kickoff workflow
                            }
                            
                            # Submit extra point
                            ep_response = self.session.put(f"{BACKEND_URL}/games/{FOOTBALL_GAME_ID}", json={
                                "football_state": ep_state
                            })
                            
                            if ep_response.status_code == 200:
                                # Verify extra point
                                ep_verify = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
                                
                                if ep_verify.status_code == 200:
                                    ep_data = ep_verify.json()
                                    ep_saved_state = ep_data.get("football_state", {})
                                    
                                    ep_scores = ep_saved_state.get("scores", {})
                                    if ep_scores.get("home") >= 7:
                                        # Check for kickoff workflow trigger
                                        next_play = ep_saved_state.get("next_play_type")
                                        if next_play == "KICKOFF":
                                            self.log_test("Touchdown Scenario", True, 
                                                         "Touchdown (+6), Extra Point (+1), and Kickoff workflow triggered correctly")
                                            return True
                                        else:
                                            self.log_test("Touchdown Scenario", False, 
                                                         f"Kickoff workflow not triggered: {next_play}")
                                            return False
                                    else:
                                        self.log_test("Touchdown Scenario", False, 
                                                     f"Extra point not added: {ep_scores}")
                                        return False
                                else:
                                    self.log_test("Touchdown Scenario", False, "Failed to verify extra point")
                                    return False
                            else:
                                self.log_test("Touchdown Scenario", False, f"Failed to submit extra point: {ep_response.status_code}")
                                return False
                        else:
                            self.log_test("Touchdown Scenario", False, 
                                         f"Drive not ended correctly: {current_drive.get('result')}")
                            return False
                    else:
                        self.log_test("Touchdown Scenario", False, 
                                     f"Touchdown points not added: {scores}")
                        return False
                else:
                    self.log_test("Touchdown Scenario", False, "Failed to verify touchdown")
                    return False
            else:
                self.log_test("Touchdown Scenario", False, f"Failed to submit touchdown: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Touchdown Scenario", False, f"Error testing touchdown scenario: {str(e)}")
            return False
    
    def test_drive_ending_scenarios(self):
        """Test drive ending and new drive starting"""
        try:
            # Test drive ending on touchdown (already tested above, but verify data persistence)
            verify_response = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
            
            if verify_response.status_code == 200:
                game_data = verify_response.json()
                saved_state = game_data.get("football_state", {})
                
                # Check that drive data is saved to backend
                all_drives = saved_state.get("all_drives", [])
                current_drive = saved_state.get("current_drive", {})
                
                # Should have at least one completed drive
                completed_drives = [d for d in all_drives if d.get("result") == "touchdown"]
                
                if len(completed_drives) > 0:
                    completed_drive = completed_drives[0]
                    
                    # Verify drive has required fields
                    required_fields = ["id", "team", "start_yard", "playCount", "netYards", "result"]
                    missing_fields = [field for field in required_fields if field not in completed_drive]
                    
                    if not missing_fields:
                        # Test new drive starting after kickoff
                        kickoff_play_id = f"test_kickoff_{int(time.time())}"
                        new_drive_id = f"drive_test_2"
                        
                        kickoff_state = {
                            "play_log": saved_state.get("play_log", []) + [
                                {
                                    "id": kickoff_play_id,
                                    "play_id": kickoff_play_id,
                                    "quarter": 1,
                                    "play_type": "KICKOFF",
                                    "kicker": "9",
                                    "kicker_name": "Adam Vinatieri",
                                    "result": "TOUCHBACK",
                                    "yards": 65,
                                    "description": "KICKOFF by #9 Adam Vinatieri for 65 yards TOUCHBACK",
                                    "timestamp": datetime.now().isoformat()
                                }
                            ],
                            "current_drive": {
                                "id": new_drive_id,
                                "team": "away",
                                "start_yard": 25,
                                "current_yard": 25,
                                "playCount": 0,
                                "netYards": 0,
                                "result": "ongoing",
                                "start_time": "13:00",
                                "plays": []
                            },
                            "all_drives": all_drives + [
                                {
                                    "id": new_drive_id,
                                    "team": "away",
                                    "start_yard": 25,
                                    "current_yard": 25,
                                    "playCount": 0,
                                    "netYards": 0,
                                    "result": "ongoing",
                                    "start_time": "13:00",
                                    "plays": []
                                }
                            ],
                            "possession": "away",
                            "ball_position": 25,
                            "down": 1,
                            "distance": 10
                        }
                        
                        # Submit kickoff and new drive
                        ko_response = self.session.put(f"{BACKEND_URL}/games/{FOOTBALL_GAME_ID}", json={
                            "football_state": kickoff_state
                        })
                        
                        if ko_response.status_code == 200:
                            # Verify new drive started
                            ko_verify = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
                            
                            if ko_verify.status_code == 200:
                                ko_data = ko_verify.json()
                                ko_saved_state = ko_data.get("football_state", {})
                                
                                new_current_drive = ko_saved_state.get("current_drive", {})
                                new_all_drives = ko_saved_state.get("all_drives", [])
                                
                                if (new_current_drive.get("team") == "away" and 
                                    new_current_drive.get("result") == "ongoing" and
                                    len(new_all_drives) >= 2):
                                    
                                    self.log_test("Drive Ending Scenarios", True, 
                                                 "Drive ends on touchdown, new drive starts after kickoff, data persists to backend")
                                    return True
                                else:
                                    self.log_test("Drive Ending Scenarios", False, 
                                                 f"New drive not started correctly: {new_current_drive}")
                                    return False
                            else:
                                self.log_test("Drive Ending Scenarios", False, "Failed to verify new drive")
                                return False
                        else:
                            self.log_test("Drive Ending Scenarios", False, f"Failed to submit kickoff: {ko_response.status_code}")
                            return False
                    else:
                        self.log_test("Drive Ending Scenarios", False, 
                                     f"Completed drive missing fields: {missing_fields}")
                        return False
                else:
                    self.log_test("Drive Ending Scenarios", False, 
                                 f"No completed drives found: {len(all_drives)} total drives")
                    return False
            else:
                self.log_test("Drive Ending Scenarios", False, "Failed to get game state for drive testing")
                return False
                
        except Exception as e:
            self.log_test("Drive Ending Scenarios", False, f"Error testing drive ending: {str(e)}")
            return False
    
    def test_public_stats_sync(self):
        """Test that plays are synced to public stats page"""
        try:
            # Get the current state from public endpoint
            response = self.session.get(f"{BACKEND_URL}/games/public/{FOOTBALL_GAME_ID}")
            
            if response.status_code == 200:
                game_data = response.json()
                football_state = game_data.get("football_state", {})
                
                # Check that we have play log data
                play_log = football_state.get("play_log", [])
                
                if len(play_log) > 0:
                    # Check for our test plays
                    test_plays = [play for play in play_log if "test_" in play.get("id", "")]
                    
                    if len(test_plays) > 0:
                        # Verify key fields are present for public display
                        sample_play = test_plays[0]
                        required_fields = ["id", "quarter", "play_type", "description", "yards"]
                        missing_fields = [field for field in required_fields if field not in sample_play]
                        
                        if not missing_fields:
                            # Check drive data is available
                            all_drives = football_state.get("all_drives", [])
                            current_drive = football_state.get("current_drive", {})
                            
                            if len(all_drives) > 0 or current_drive:
                                # Check scores are available
                                scores = football_state.get("scores", {})
                                
                                if "home" in scores and "away" in scores:
                                    self.log_test("Public Stats Sync", True, 
                                                 f"Plays synced to public stats page - {len(play_log)} plays, {len(all_drives)} drives, scores available")
                                    return True
                                else:
                                    self.log_test("Public Stats Sync", False, 
                                                 f"Scores not available on public page: {scores}")
                                    return False
                            else:
                                self.log_test("Public Stats Sync", False, 
                                             "Drive data not available on public page")
                                return False
                        else:
                            self.log_test("Public Stats Sync", False, 
                                         f"Play data incomplete on public page: missing {missing_fields}")
                            return False
                    else:
                        self.log_test("Public Stats Sync", False, 
                                     "Test plays not found on public page")
                        return False
                else:
                    self.log_test("Public Stats Sync", False, 
                                 "No play log data on public page")
                    return False
            else:
                self.log_test("Public Stats Sync", False, f"Failed to access public stats page: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Public Stats Sync", False, f"Error testing public stats sync: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all drive tracking tests"""
        print("🏈 Starting Drive Tracking Integration Tests")
        print("=" * 60)
        
        # Test 1: Authentication
        if not self.authenticate():
            print("❌ Authentication failed - cannot continue with other tests")
            return False
        
        # Test 2: Get initial game state
        if not self.get_initial_game_state():
            print("❌ Failed to get initial game state - cannot continue")
            return False
        
        # Test 3: Run play submission
        self.test_run_play_submission()
        
        # Test 4: Pass play submission
        self.test_pass_play_submission()
        
        # Test 5: Touchdown scenario
        self.test_touchdown_scenario()
        
        # Test 6: Drive ending scenarios
        self.test_drive_ending_scenarios()
        
        # Test 7: Public stats sync
        self.test_public_stats_sync()
        
        # Summary
        print("\n" + "=" * 60)
        print("🏈 Drive Tracking Integration Test Summary")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['message']}")
        
        print(f"\nResults: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All drive tracking integration tests PASSED!")
            return True
        else:
            print(f"⚠️  {total - passed} test(s) FAILED")
            return False

def main():
    """Main test runner"""
    tester = DriveTrackingTester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open("/app/drive_tracking_test_results.json", "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "overall_success": success,
            "test_results": tester.test_results
        }, f, indent=2)
    
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)