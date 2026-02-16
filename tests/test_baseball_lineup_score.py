"""
Test Baseball Game PUT endpoint for:
1. home_score, away_score persistence
2. home_batting_order, away_batting_order persistence
3. home_defense, away_defense persistence
"""
import pytest
import requests
import os
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://multi-sport-stats.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "antlersportsnetwork@gmail.com"
TEST_PASSWORD = "NoahTheJew1997"


class TestBaseballLineupAndScore:
    """Test baseball game lineup and score persistence"""
    
    session_token = None
    user_id = None
    test_game_id = None
    home_team_id = None
    away_team_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client):
        """Setup test by logging in and creating test data"""
        # Login
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        login_data = login_response.json()
        TestBaseballLineupAndScore.session_token = login_data.get("session_token")
        TestBaseballLineupAndScore.user_id = login_data.get("user_id")
        
        # Update client headers
        api_client.headers.update({"Authorization": f"Bearer {TestBaseballLineupAndScore.session_token}"})
        
        yield
    
    def test_01_create_baseball_teams(self, api_client):
        """Create test baseball teams"""
        api_client.headers.update({"Authorization": f"Bearer {TestBaseballLineupAndScore.session_token}"})
        
        # Create home team
        home_team_data = {
            "name": f"TEST_Home_Baseball_{datetime.now().timestamp()}",
            "color": "#FF0000",
            "sport": "baseball",
            "roster": [
                {"number": "1", "name": "Player One"},
                {"number": "2", "name": "Player Two"},
                {"number": "3", "name": "Player Three"},
                {"number": "4", "name": "Player Four"},
                {"number": "5", "name": "Player Five"},
                {"number": "6", "name": "Player Six"},
                {"number": "7", "name": "Player Seven"},
                {"number": "8", "name": "Player Eight"},
                {"number": "9", "name": "Player Nine"},
            ]
        }
        home_response = api_client.post(f"{BASE_URL}/api/teams", json=home_team_data)
        assert home_response.status_code == 200, f"Failed to create home team: {home_response.text}"
        TestBaseballLineupAndScore.home_team_id = home_response.json().get("id")
        
        # Create away team
        away_team_data = {
            "name": f"TEST_Away_Baseball_{datetime.now().timestamp()}",
            "color": "#0000FF",
            "sport": "baseball",
            "roster": [
                {"number": "10", "name": "Away Player One"},
                {"number": "11", "name": "Away Player Two"},
                {"number": "12", "name": "Away Player Three"},
                {"number": "13", "name": "Away Player Four"},
                {"number": "14", "name": "Away Player Five"},
                {"number": "15", "name": "Away Player Six"},
                {"number": "16", "name": "Away Player Seven"},
                {"number": "17", "name": "Away Player Eight"},
                {"number": "18", "name": "Away Player Nine"},
            ]
        }
        away_response = api_client.post(f"{BASE_URL}/api/teams", json=away_team_data)
        assert away_response.status_code == 200, f"Failed to create away team: {away_response.text}"
        TestBaseballLineupAndScore.away_team_id = away_response.json().get("id")
        
        print(f"Created home team: {TestBaseballLineupAndScore.home_team_id}")
        print(f"Created away team: {TestBaseballLineupAndScore.away_team_id}")
    
    def test_02_create_baseball_game(self, api_client):
        """Create a baseball game"""
        api_client.headers.update({"Authorization": f"Bearer {TestBaseballLineupAndScore.session_token}"})
        
        game_data = {
            "home_team_id": TestBaseballLineupAndScore.home_team_id,
            "away_team_id": TestBaseballLineupAndScore.away_team_id,
            "sport": "baseball",
            "start_immediately": True,
            "total_innings": 9
        }
        response = api_client.post(f"{BASE_URL}/api/games", json=game_data)
        assert response.status_code == 200, f"Failed to create game: {response.text}"
        
        game = response.json()
        TestBaseballLineupAndScore.test_game_id = game.get("id")
        
        assert game.get("sport") == "baseball"
        print(f"Created baseball game: {TestBaseballLineupAndScore.test_game_id}")
    
    def test_03_update_game_score(self, api_client):
        """Test updating home_score and away_score"""
        api_client.headers.update({"Authorization": f"Bearer {TestBaseballLineupAndScore.session_token}"})
        
        # Update scores
        update_data = {
            "home_score": 5,
            "away_score": 3
        }
        response = api_client.put(
            f"{BASE_URL}/api/games/{TestBaseballLineupAndScore.test_game_id}",
            json=update_data
        )
        assert response.status_code == 200, f"Failed to update scores: {response.text}"
        
        # Verify scores were saved
        get_response = api_client.get(f"{BASE_URL}/api/games/{TestBaseballLineupAndScore.test_game_id}")
        assert get_response.status_code == 200
        game = get_response.json()
        
        assert game.get("home_score") == 5, f"Expected home_score=5, got {game.get('home_score')}"
        assert game.get("away_score") == 3, f"Expected away_score=3, got {game.get('away_score')}"
        print(f"Score update verified: Home {game.get('home_score')} - Away {game.get('away_score')}")
    
    def test_04_update_batting_order(self, api_client):
        """Test updating home_batting_order and away_batting_order"""
        api_client.headers.update({"Authorization": f"Bearer {TestBaseballLineupAndScore.session_token}"})
        
        # Create batting orders
        home_batting_order = [
            {"player_number": "1", "player_name": "Player One"},
            {"player_number": "2", "player_name": "Player Two"},
            {"player_number": "3", "player_name": "Player Three"},
            {"player_number": "4", "player_name": "Player Four"},
            {"player_number": "5", "player_name": "Player Five"},
            {"player_number": "6", "player_name": "Player Six"},
            {"player_number": "7", "player_name": "Player Seven"},
            {"player_number": "8", "player_name": "Player Eight"},
            {"player_number": "9", "player_name": "Player Nine"},
        ]
        
        away_batting_order = [
            {"player_number": "10", "player_name": "Away Player One"},
            {"player_number": "11", "player_name": "Away Player Two"},
            {"player_number": "12", "player_name": "Away Player Three"},
            {"player_number": "13", "player_name": "Away Player Four"},
            {"player_number": "14", "player_name": "Away Player Five"},
            {"player_number": "15", "player_name": "Away Player Six"},
            {"player_number": "16", "player_name": "Away Player Seven"},
            {"player_number": "17", "player_name": "Away Player Eight"},
            {"player_number": "18", "player_name": "Away Player Nine"},
        ]
        
        update_data = {
            "home_batting_order": home_batting_order,
            "away_batting_order": away_batting_order
        }
        response = api_client.put(
            f"{BASE_URL}/api/games/{TestBaseballLineupAndScore.test_game_id}",
            json=update_data
        )
        assert response.status_code == 200, f"Failed to update batting orders: {response.text}"
        
        # Verify batting orders were saved
        get_response = api_client.get(f"{BASE_URL}/api/games/{TestBaseballLineupAndScore.test_game_id}")
        assert get_response.status_code == 200
        game = get_response.json()
        
        saved_home_order = game.get("home_batting_order", [])
        saved_away_order = game.get("away_batting_order", [])
        
        assert len(saved_home_order) == 9, f"Expected 9 home batters, got {len(saved_home_order)}"
        assert len(saved_away_order) == 9, f"Expected 9 away batters, got {len(saved_away_order)}"
        assert saved_home_order[0].get("player_number") == "1", "First home batter should be #1"
        assert saved_away_order[0].get("player_number") == "10", "First away batter should be #10"
        
        print(f"Batting order update verified: Home {len(saved_home_order)} batters, Away {len(saved_away_order)} batters")
    
    def test_05_update_defense(self, api_client):
        """Test updating home_defense and away_defense"""
        api_client.headers.update({"Authorization": f"Bearer {TestBaseballLineupAndScore.session_token}"})
        
        # Create defensive positions
        home_defense = {
            "pitcher": {"number": "1", "name": "Player One"},
            "catcher": {"number": "2", "name": "Player Two"},
            "first": {"number": "3", "name": "Player Three"},
            "second": {"number": "4", "name": "Player Four"},
            "third": {"number": "5", "name": "Player Five"},
            "shortstop": {"number": "6", "name": "Player Six"},
            "left": {"number": "7", "name": "Player Seven"},
            "center": {"number": "8", "name": "Player Eight"},
            "right": {"number": "9", "name": "Player Nine"},
        }
        
        away_defense = {
            "pitcher": {"number": "10", "name": "Away Player One"},
            "catcher": {"number": "11", "name": "Away Player Two"},
            "first": {"number": "12", "name": "Away Player Three"},
            "second": {"number": "13", "name": "Away Player Four"},
            "third": {"number": "14", "name": "Away Player Five"},
            "shortstop": {"number": "15", "name": "Away Player Six"},
            "left": {"number": "16", "name": "Away Player Seven"},
            "center": {"number": "17", "name": "Away Player Eight"},
            "right": {"number": "18", "name": "Away Player Nine"},
        }
        
        update_data = {
            "home_defense": home_defense,
            "away_defense": away_defense
        }
        response = api_client.put(
            f"{BASE_URL}/api/games/{TestBaseballLineupAndScore.test_game_id}",
            json=update_data
        )
        assert response.status_code == 200, f"Failed to update defense: {response.text}"
        
        # Verify defense was saved
        get_response = api_client.get(f"{BASE_URL}/api/games/{TestBaseballLineupAndScore.test_game_id}")
        assert get_response.status_code == 200
        game = get_response.json()
        
        saved_home_defense = game.get("home_defense", {})
        saved_away_defense = game.get("away_defense", {})
        
        assert "pitcher" in saved_home_defense, "Home defense should have pitcher"
        assert "catcher" in saved_home_defense, "Home defense should have catcher"
        assert saved_home_defense.get("pitcher", {}).get("number") == "1", "Home pitcher should be #1"
        assert saved_away_defense.get("pitcher", {}).get("number") == "10", "Away pitcher should be #10"
        
        print(f"Defense update verified: Home has {len(saved_home_defense)} positions, Away has {len(saved_away_defense)} positions")
    
    def test_06_verify_all_fields_persist(self, api_client):
        """Verify all fields persist together"""
        api_client.headers.update({"Authorization": f"Bearer {TestBaseballLineupAndScore.session_token}"})
        
        # Get the game and verify all fields
        get_response = api_client.get(f"{BASE_URL}/api/games/{TestBaseballLineupAndScore.test_game_id}")
        assert get_response.status_code == 200
        game = get_response.json()
        
        # Verify scores
        assert game.get("home_score") == 5, "home_score should persist"
        assert game.get("away_score") == 3, "away_score should persist"
        
        # Verify batting orders
        assert len(game.get("home_batting_order", [])) == 9, "home_batting_order should persist"
        assert len(game.get("away_batting_order", [])) == 9, "away_batting_order should persist"
        
        # Verify defense
        assert len(game.get("home_defense", {})) == 9, "home_defense should persist"
        assert len(game.get("away_defense", {})) == 9, "away_defense should persist"
        
        print("All fields verified to persist correctly!")
    
    def test_07_cleanup(self, api_client):
        """Cleanup test data"""
        api_client.headers.update({"Authorization": f"Bearer {TestBaseballLineupAndScore.session_token}"})
        
        # Delete game
        if TestBaseballLineupAndScore.test_game_id:
            api_client.delete(f"{BASE_URL}/api/games/{TestBaseballLineupAndScore.test_game_id}")
        
        # Delete teams
        if TestBaseballLineupAndScore.home_team_id:
            api_client.delete(f"{BASE_URL}/api/teams/{TestBaseballLineupAndScore.home_team_id}")
        if TestBaseballLineupAndScore.away_team_id:
            api_client.delete(f"{BASE_URL}/api/teams/{TestBaseballLineupAndScore.away_team_id}")
        
        print("Cleanup completed")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
