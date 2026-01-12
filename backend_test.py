#!/usr/bin/env python3
"""
Backend API Testing for StatMoose - Bracket System Removal and End Game Features
Tests:
1. Bracket System Removal - verify bracket endpoints return 404
2. End Game Feature for Basketball - verify game status can be set to "final"
3. End Game Feature for Football - verify game status can be set to "final"
"""

import requests
import json
import os
import time
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://frosty-wright-1.preview.emergentagent.com/api"

# Test credentials and data
ADMIN_EMAIL = "antlersportsnetwork@gmail.com"
ADMIN_PASSWORD = "NoahTheJew1997"  # Updated password from review request
FOOTBALL_GAME_ID = "a640f656-1ea6-4929-8589-82f58a1069d9"

class BracketAndEndGameTester:
    def __init__(self):
        self.session = requests.Session()
        self.session_token = None
        self.test_results = []
        self.basketball_game_id = None
        self.football_game_id = FOOTBALL_GAME_ID
        
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
    
    def test_bracket_system_removal(self):
        """Test that bracket API endpoints no longer exist and return 404"""
        try:
            # Test POST /api/brackets - should return 404
            post_response = self.session.post(f"{BACKEND_URL}/brackets", json={
                "name": "Test Bracket",
                "teams": ["Team A", "Team B"]
            })
            
            if post_response.status_code == 404:
                self.log_test("Bracket POST Endpoint Removal", True, 
                             "POST /api/brackets correctly returns 404")
            else:
                self.log_test("Bracket POST Endpoint Removal", False, 
                             f"POST /api/brackets returned {post_response.status_code}, expected 404")
                return False
            
            # Test GET /api/brackets - should return 404 (even with auth)
            get_response = self.session.get(f"{BACKEND_URL}/brackets")
            
            if get_response.status_code == 404:
                self.log_test("Bracket GET Endpoint Removal", True, 
                             "GET /api/brackets correctly returns 404")
                return True
            else:
                self.log_test("Bracket GET Endpoint Removal", False, 
                             f"GET /api/brackets returned {get_response.status_code}, expected 404")
                return False
                
        except Exception as e:
            self.log_test("Bracket System Removal", False, f"Error testing bracket removal: {str(e)}")
            return False
    
    def find_basketball_game(self):
        """Find an existing basketball game for testing"""
        try:
            response = self.session.get(f"{BACKEND_URL}/games?sport=basketball")
            
            if response.status_code == 200:
                games = response.json()
                basketball_games = [game for game in games if game.get("sport") == "basketball"]
                
                if basketball_games:
                    self.basketball_game_id = basketball_games[0]["id"]
                    self.log_test("Find Basketball Game", True, 
                                 f"Found basketball game: {self.basketball_game_id}")
                    return True
                else:
                    self.log_test("Find Basketball Game", False, 
                                 "No basketball games found")
                    return False
            else:
                self.log_test("Find Basketball Game", False, 
                             f"Failed to get games: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Find Basketball Game", False, f"Error finding basketball game: {str(e)}")
            return False
    
    def test_end_game_basketball(self):
        """Test End Game feature for Basketball - set status to 'final'"""
        try:
            if not self.basketball_game_id:
                if not self.find_basketball_game():
                    self.log_test("End Game Basketball", False, 
                                 "No basketball game available for testing")
                    return False
            
            # Get current game status
            get_response = self.session.get(f"{BACKEND_URL}/games/{self.basketball_game_id}")
            
            if get_response.status_code != 200:
                self.log_test("End Game Basketball", False, 
                             f"Failed to get basketball game: {get_response.status_code}")
                return False
            
            current_game = get_response.json()
            original_status = current_game.get("status")
            
            # Update game status to "final"
            update_response = self.session.put(f"{BACKEND_URL}/games/{self.basketball_game_id}", json={
                "status": "final"
            })
            
            if update_response.status_code == 200:
                # Verify the status was updated
                verify_response = self.session.get(f"{BACKEND_URL}/games/{self.basketball_game_id}")
                
                if verify_response.status_code == 200:
                    updated_game = verify_response.json()
                    new_status = updated_game.get("status")
                    
                    if new_status == "final":
                        self.log_test("End Game Basketball", True, 
                                     f"Basketball game status updated from '{original_status}' to 'final'")
                        return True
                    else:
                        self.log_test("End Game Basketball", False, 
                                     f"Status not updated correctly - got '{new_status}', expected 'final'")
                        return False
                else:
                    self.log_test("End Game Basketball", False, 
                                 "Failed to verify basketball game status update")
                    return False
            else:
                self.log_test("End Game Basketball", False, 
                             f"Failed to update basketball game status: {update_response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("End Game Basketball", False, f"Error testing basketball end game: {str(e)}")
            return False
    
    def test_end_game_football(self):
        """Test End Game feature for Football - set status to 'final'"""
        try:
            # Get current football game status
            get_response = self.session.get(f"{BACKEND_URL}/games/{self.football_game_id}")
            
            if get_response.status_code != 200:
                self.log_test("End Game Football", False, 
                             f"Failed to get football game: {get_response.status_code}")
                return False
            
            current_game = get_response.json()
            original_status = current_game.get("status")
            
            # Verify it's a football game
            if current_game.get("sport") != "football":
                self.log_test("End Game Football", False, 
                             f"Game is not football sport: {current_game.get('sport')}")
                return False
            
            # Update game status to "final"
            update_response = self.session.put(f"{BACKEND_URL}/games/{self.football_game_id}", json={
                "status": "final"
            })
            
            if update_response.status_code == 200:
                # Verify the status was updated
                verify_response = self.session.get(f"{BACKEND_URL}/games/{self.football_game_id}")
                
                if verify_response.status_code == 200:
                    updated_game = verify_response.json()
                    new_status = updated_game.get("status")
                    
                    if new_status == "final":
                        self.log_test("End Game Football", True, 
                                     f"Football game status updated from '{original_status}' to 'final'")
                        return True
                    else:
                        self.log_test("End Game Football", False, 
                                     f"Status not updated correctly - got '{new_status}', expected 'final'")
                        return False
                else:
                    self.log_test("End Game Football", False, 
                                 "Failed to verify football game status update")
                    return False
            else:
                self.log_test("End Game Football", False, 
                             f"Failed to update football game status: {update_response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("End Game Football", False, f"Error testing football end game: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all bracket removal and end game feature tests"""
        print("🏀🏈 Starting Bracket Removal and End Game Feature Tests")
        print("=" * 60)
        
        # Test 1: Authentication
        if not self.authenticate():
            print("❌ Authentication failed - cannot continue with other tests")
            return False
        
        # Test 2: Bracket System Removal
        self.test_bracket_system_removal()
        
        # Test 3: End Game Feature - Basketball
        self.test_end_game_basketball()
        
        # Test 4: End Game Feature - Football
        self.test_end_game_football()
        
        # Summary
        print("\n" + "=" * 60)
        print("🏀🏈 Bracket Removal and End Game Feature Test Summary")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}: {result['message']}")
        
        print(f"\nResults: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All bracket removal and end game feature tests PASSED!")
            return True
        else:
            print(f"⚠️  {total - passed} test(s) FAILED")
            return False

def main():
    """Main test runner"""
    tester = BracketAndEndGameTester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open("/app/bracket_endgame_test_results.json", "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "overall_success": success,
            "test_results": tester.test_results
        }, f, indent=2)
    
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)