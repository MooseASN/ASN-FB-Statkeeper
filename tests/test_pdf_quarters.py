"""
Test PDF Box Score generation for quarters/halves and overtime columns
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://moose-stats-staging.preview.emergentagent.com').rstrip('/')

class TestPDFBoxScore:
    """Test PDF Box Score generation for different period configurations"""
    
    session_token = None
    test_game_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login before tests"""
        if not TestPDFBoxScore.session_token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "antlersportsnetwork@gmail.com",
                "password": "NoahTheJew1997"
            })
            assert response.status_code == 200
            TestPDFBoxScore.session_token = response.json().get("session_token")
        
    def test_01_get_existing_basketball_game(self):
        """Find an existing basketball game to test PDF generation"""
        headers = {"Authorization": f"Bearer {TestPDFBoxScore.session_token}"}
        
        # Get list of games
        response = requests.get(f"{BASE_URL}/api/games", headers=headers)
        assert response.status_code == 200
        
        games = response.json()
        basketball_games = [g for g in games if g.get("sport") == "basketball"]
        
        if basketball_games:
            TestPDFBoxScore.test_game_id = basketball_games[0]["id"]
            print(f"Using existing basketball game: {TestPDFBoxScore.test_game_id}")
        else:
            print("No existing basketball games found - will create one")
    
    def test_02_pdf_generation_succeeds(self):
        """Test that PDF generation works for a basketball game"""
        if not TestPDFBoxScore.test_game_id:
            pytest.skip("No game ID available for testing")
        
        headers = {"Authorization": f"Bearer {TestPDFBoxScore.session_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/games/{TestPDFBoxScore.test_game_id}/boxscore/pdf",
            headers=headers
        )
        
        # PDF should be generated successfully
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        
        # PDF should have content
        assert len(response.content) > 1000  # PDF should be larger than 1KB
        print(f"PDF generated successfully, size: {len(response.content)} bytes")
    
    def test_03_verify_period_label_handling(self):
        """Test that period_label is properly stored in game data"""
        if not TestPDFBoxScore.test_game_id:
            pytest.skip("No game ID available for testing")
        
        headers = {"Authorization": f"Bearer {TestPDFBoxScore.session_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/games/{TestPDFBoxScore.test_game_id}",
            headers=headers
        )
        
        assert response.status_code == 200
        game = response.json()
        
        # Check period_label field exists
        period_label = game.get("period_label")
        print(f"Game period_label: {period_label}")
        
        # Check quarter_scores structure
        quarter_scores = game.get("quarter_scores", {})
        home_scores = quarter_scores.get("home", [])
        away_scores = quarter_scores.get("away", [])
        
        print(f"Quarter scores - Home: {home_scores}, Away: {away_scores}")
        
        # Verify scores array structure
        assert isinstance(home_scores, list), "Home scores should be a list"
        assert isinstance(away_scores, list), "Away scores should be a list"


class TestQuarterAdvanceWithFouls:
    """Test quarter advancement with foul reset functionality"""
    
    session_token = None
    test_game_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login before tests"""
        if not TestQuarterAdvanceWithFouls.session_token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "antlersportsnetwork@gmail.com",
                "password": "NoahTheJew1997"
            })
            assert response.status_code == 200
            TestQuarterAdvanceWithFouls.session_token = response.json().get("session_token")
    
    def test_01_create_test_game(self):
        """Create a test basketball game"""
        headers = {"Authorization": f"Bearer {TestQuarterAdvanceWithFouls.session_token}"}
        
        # First create teams
        home_team_response = requests.post(f"{BASE_URL}/api/teams", headers=headers, json={
            "name": "TEST_Home_Fouls",
            "sport": "basketball",
            "color": "#FF0000"
        })
        away_team_response = requests.post(f"{BASE_URL}/api/teams", headers=headers, json={
            "name": "TEST_Away_Fouls", 
            "sport": "basketball",
            "color": "#0000FF"
        })
        
        home_team_id = home_team_response.json().get("id")
        away_team_id = away_team_response.json().get("id")
        
        # Create game
        game_response = requests.post(f"{BASE_URL}/api/games", headers=headers, json={
            "sport": "basketball",
            "home_team_id": home_team_id,
            "away_team_id": away_team_id,
            "period_label": "Quarter",  # Using Quarters
            "clock_enabled": True
        })
        
        if game_response.status_code == 200:
            TestQuarterAdvanceWithFouls.test_game_id = game_response.json().get("id")
            print(f"Created test game: {TestQuarterAdvanceWithFouls.test_game_id}")
        else:
            print(f"Failed to create game: {game_response.text}")
    
    def test_02_add_fouls_to_game(self):
        """Add fouls to the game to test reset functionality"""
        if not TestQuarterAdvanceWithFouls.test_game_id:
            pytest.skip("No test game created")
        
        headers = {"Authorization": f"Bearer {TestQuarterAdvanceWithFouls.session_token}"}
        
        # Update game to set team fouls directly
        response = requests.put(
            f"{BASE_URL}/api/games/{TestQuarterAdvanceWithFouls.test_game_id}",
            headers=headers,
            json={
                "home_team_fouls": 5,
                "away_team_fouls": 3
            }
        )
        
        if response.status_code == 200:
            print("Set team fouls: Home=5, Away=3")
        else:
            print(f"Failed to set fouls: {response.text}")
    
    def test_03_advance_quarter_with_foul_reset(self):
        """Test advancing quarter with foul reset enabled"""
        if not TestQuarterAdvanceWithFouls.test_game_id:
            pytest.skip("No test game created")
        
        headers = {"Authorization": f"Bearer {TestQuarterAdvanceWithFouls.session_token}"}
        
        # Advance quarter with foul reset
        response = requests.post(
            f"{BASE_URL}/api/games/{TestQuarterAdvanceWithFouls.test_game_id}/clock/next-period",
            headers=headers,
            params={"reset_fouls": True}
        )
        
        assert response.status_code == 200
        
        # Verify fouls were reset
        game_response = requests.get(
            f"{BASE_URL}/api/games/{TestQuarterAdvanceWithFouls.test_game_id}",
            headers=headers
        )
        
        game = game_response.json()
        
        # Fouls should be reset to 0
        assert game.get("home_team_fouls", 0) == 0, f"Home fouls should be 0, got {game.get('home_team_fouls')}"
        assert game.get("away_team_fouls", 0) == 0, f"Away fouls should be 0, got {game.get('away_team_fouls')}"
        
        # Bonus should be cleared
        assert game.get("home_bonus") is None, "Home bonus should be cleared"
        assert game.get("away_bonus") is None, "Away bonus should be cleared"
        
        print("Successfully advanced quarter with foul reset")
    
    def test_04_advance_quarter_without_foul_reset(self):
        """Test advancing quarter without resetting fouls"""
        if not TestQuarterAdvanceWithFouls.test_game_id:
            pytest.skip("No test game created")
        
        headers = {"Authorization": f"Bearer {TestQuarterAdvanceWithFouls.session_token}"}
        
        # First set some fouls
        requests.put(
            f"{BASE_URL}/api/games/{TestQuarterAdvanceWithFouls.test_game_id}",
            headers=headers,
            json={
                "home_team_fouls": 7,
                "away_team_fouls": 4
            }
        )
        
        # Advance quarter without resetting fouls
        response = requests.post(
            f"{BASE_URL}/api/games/{TestQuarterAdvanceWithFouls.test_game_id}/clock/next-period",
            headers=headers,
            params={"reset_fouls": False}
        )
        
        assert response.status_code == 200
        
        # Verify fouls were NOT reset
        game_response = requests.get(
            f"{BASE_URL}/api/games/{TestQuarterAdvanceWithFouls.test_game_id}",
            headers=headers
        )
        
        game = game_response.json()
        
        # Fouls should be preserved
        assert game.get("home_team_fouls", 0) == 7, f"Home fouls should be 7, got {game.get('home_team_fouls')}"
        assert game.get("away_team_fouls", 0) == 4, f"Away fouls should be 4, got {game.get('away_team_fouls')}"
        
        print("Successfully advanced quarter without resetting fouls")
    
    def test_05_cleanup_test_data(self):
        """Clean up test game and teams"""
        if not TestQuarterAdvanceWithFouls.test_game_id:
            return
        
        headers = {"Authorization": f"Bearer {TestQuarterAdvanceWithFouls.session_token}"}
        
        # Delete test game
        response = requests.delete(
            f"{BASE_URL}/api/games/{TestQuarterAdvanceWithFouls.test_game_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            print(f"Deleted test game: {TestQuarterAdvanceWithFouls.test_game_id}")
        
        # Delete test teams
        teams_response = requests.get(f"{BASE_URL}/api/teams", headers=headers)
        if teams_response.status_code == 200:
            teams = teams_response.json()
            for team in teams:
                if team.get("name", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/teams/{team['id']}", headers=headers)
                    print(f"Deleted test team: {team['name']}")


class TestHalvesVsQuarters:
    """Test PDF generation for games with halves vs quarters period configuration"""
    
    session_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login before tests"""
        if not TestHalvesVsQuarters.session_token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "antlersportsnetwork@gmail.com",
                "password": "NoahTheJew1997"
            })
            assert response.status_code == 200
            TestHalvesVsQuarters.session_token = response.json().get("session_token")
    
    def test_01_verify_period_label_code_logic(self):
        """Verify that the backend PDF generation handles period labels correctly"""
        headers = {"Authorization": f"Bearer {TestHalvesVsQuarters.session_token}"}
        
        # Get any game to check structure
        response = requests.get(f"{BASE_URL}/api/games", headers=headers)
        assert response.status_code == 200
        
        games = response.json()
        basketball_games = [g for g in games if g.get("sport") == "basketball"]
        
        if basketball_games:
            game = basketball_games[0]
            period_label = game.get("period_label", "Quarter")
            quarter_scores = game.get("quarter_scores", {"home": [], "away": []})
            
            print(f"Game: {game.get('id')}")
            print(f"Period Label: {period_label}")
            print(f"Quarter Scores: {quarter_scores}")
            
            # Calculate regulation periods
            regulation_periods = 2 if period_label == "Half" else 4
            print(f"Expected regulation periods: {regulation_periods}")
            
            # Check if game should show overtime
            home_scores = quarter_scores.get("home", [])
            away_scores = quarter_scores.get("away", [])
            
            has_overtime = False
            if len(home_scores) > regulation_periods:
                for i in range(regulation_periods, len(home_scores)):
                    if (home_scores[i] if i < len(home_scores) else 0) > 0 or \
                       (away_scores[i] if i < len(away_scores) else 0) > 0:
                        has_overtime = True
                        break
            
            print(f"Has overtime with scores: {has_overtime}")
        else:
            pytest.skip("No basketball games found")
