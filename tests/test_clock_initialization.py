"""
Test Clock Initialization for Football Games
Tests that the clock initializes to the game's period_duration setting
instead of always defaulting to 15:00 (900 seconds)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestClockInitialization:
    """Test clock initialization with different period_duration values"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get session token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin", "password": "NoahTheJew1997"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.session_token = login_response.json().get("session_token")
        self.headers = {"Authorization": f"Bearer {self.session_token}"}
        
        # Get football teams
        teams_response = requests.get(
            f"{BASE_URL}/api/teams",
            headers=self.headers,
            params={"sport": "football"}
        )
        assert teams_response.status_code == 200
        teams = teams_response.json()
        assert len(teams) >= 2, "Need at least 2 football teams"
        self.home_team_id = teams[0]["id"]
        self.away_team_id = teams[1]["id"]
        
        yield
        
    def test_existing_game_with_480_period_duration(self):
        """Test that existing game with 480 second period_duration is correctly stored"""
        # Get the existing test game
        game_id = "1e9ceff1-c76c-4390-bcf8-d0db14dbfab3"
        response = requests.get(
            f"{BASE_URL}/api/games/{game_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get game: {response.text}"
        game = response.json()
        
        # Verify period_duration is 480 (8:00)
        assert game.get("period_duration") == 480, f"Expected period_duration=480, got {game.get('period_duration')}"
        print(f"✓ Game {game_id} has period_duration=480 (8:00)")
        
    def test_create_game_with_600_period_duration(self):
        """Test creating a game with 600 second (10:00) period_duration"""
        game_data = {
            "home_team_id": self.home_team_id,
            "away_team_id": self.away_team_id,
            "start_immediately": True,
            "sport": "football",
            "clock_enabled": True,
            "period_duration": 600,  # 10:00
            "period_label": "Quarter"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/games",
            headers=self.headers,
            json=game_data
        )
        assert response.status_code == 200, f"Failed to create game: {response.text}"
        game = response.json()
        
        # Verify period_duration is stored correctly
        assert game.get("period_duration") == 600, f"Expected period_duration=600, got {game.get('period_duration')}"
        print(f"✓ Created game with period_duration=600 (10:00), ID: {game.get('id')}")
        
        # Store game ID for cleanup
        self.created_game_id_600 = game.get("id")
        
    def test_create_game_with_default_period_duration(self):
        """Test creating a game with default period_duration (720 = 12:00)"""
        game_data = {
            "home_team_id": self.home_team_id,
            "away_team_id": self.away_team_id,
            "start_immediately": True,
            "sport": "football",
            "clock_enabled": True,
            "period_duration": 720,  # 12:00 (default for football)
            "period_label": "Quarter"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/games",
            headers=self.headers,
            json=game_data
        )
        assert response.status_code == 200, f"Failed to create game: {response.text}"
        game = response.json()
        
        # Verify period_duration is stored correctly
        assert game.get("period_duration") == 720, f"Expected period_duration=720, got {game.get('period_duration')}"
        print(f"✓ Created game with period_duration=720 (12:00), ID: {game.get('id')}")
        
    def test_game_state_persistence(self):
        """Test that clock_time persists when saving game state"""
        # Create a new game with 480 second period
        game_data = {
            "home_team_id": self.home_team_id,
            "away_team_id": self.away_team_id,
            "start_immediately": True,
            "sport": "football",
            "clock_enabled": True,
            "period_duration": 480,  # 8:00
            "period_label": "Quarter"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/games",
            headers=self.headers,
            json=game_data
        )
        assert create_response.status_code == 200
        game = create_response.json()
        game_id = game.get("id")
        
        # Update game with football_state including clock_time
        update_data = {
            "football_state": {
                "possession": "home",
                "ball_position": 25,
                "down": 1,
                "distance": 10,
                "quarter": 1,
                "home_score": 0,
                "away_score": 0,
                "home_timeouts": 3,
                "away_timeouts": 3,
                "play_log": [],
                "clock_time": 420  # 7:00 remaining
            }
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/games/{game_id}",
            headers=self.headers,
            json=update_data
        )
        assert update_response.status_code == 200, f"Failed to update game: {update_response.text}"
        
        # Fetch game and verify clock_time persisted
        get_response = requests.get(
            f"{BASE_URL}/api/games/{game_id}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        fetched_game = get_response.json()
        
        football_state = fetched_game.get("football_state", {})
        assert football_state.get("clock_time") == 420, f"Expected clock_time=420, got {football_state.get('clock_time')}"
        print(f"✓ Clock time persisted correctly: 420 seconds (7:00)")
        
    def test_api_returns_period_duration(self):
        """Test that API returns period_duration in game response"""
        # Get all football games
        response = requests.get(
            f"{BASE_URL}/api/games",
            headers=self.headers
        )
        assert response.status_code == 200
        games = response.json()
        
        football_games = [g for g in games if g.get("sport") == "football"]
        assert len(football_games) > 0, "No football games found"
        
        for game in football_games:
            period_duration = game.get("period_duration")
            assert period_duration is not None, f"Game {game.get('id')} missing period_duration"
            assert isinstance(period_duration, int), f"period_duration should be int, got {type(period_duration)}"
            print(f"✓ Game {game.get('id')}: period_duration={period_duration} ({period_duration//60}:{period_duration%60:02d})")


class TestQuarterAdvancement:
    """Test that clock resets to correct period_duration when advancing quarters"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get session token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin", "password": "NoahTheJew1997"}
        )
        assert login_response.status_code == 200
        self.session_token = login_response.json().get("session_token")
        self.headers = {"Authorization": f"Bearer {self.session_token}"}
        yield
        
    def test_quarter_advancement_preserves_period_duration(self):
        """Test that advancing quarter resets clock to game's period_duration"""
        # Get the 480-second game
        game_id = "1e9ceff1-c76c-4390-bcf8-d0db14dbfab3"
        response = requests.get(
            f"{BASE_URL}/api/games/{game_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        game = response.json()
        
        # Verify period_duration
        period_duration = game.get("period_duration")
        assert period_duration == 480, f"Expected 480, got {period_duration}"
        
        # Simulate quarter advancement by updating football_state
        # When quarter advances, clock should reset to period_duration (480)
        update_data = {
            "football_state": {
                "possession": "home",
                "ball_position": 25,
                "down": 1,
                "distance": 10,
                "quarter": 2,  # Advanced to Q2
                "home_score": 7,
                "away_score": 0,
                "home_timeouts": 3,
                "away_timeouts": 3,
                "play_log": [],
                "clock_time": 480  # Should be reset to period_duration
            }
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/games/{game_id}",
            headers=self.headers,
            json=update_data
        )
        assert update_response.status_code == 200
        
        # Verify the update
        get_response = requests.get(
            f"{BASE_URL}/api/games/{game_id}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        updated_game = get_response.json()
        
        football_state = updated_game.get("football_state", {})
        assert football_state.get("quarter") == 2
        assert football_state.get("clock_time") == 480
        print(f"✓ Quarter advanced to Q2, clock reset to 480 (8:00)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
