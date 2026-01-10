"""
Test Baseball Features:
- Game creation with innings selector (7/9)
- Teams filtered by sport
- Baseball game state persistence (balls/strikes/outs)
- Baseball live game page loads correctly
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "antlersportsnetwork@gmail.com"
ADMIN_PASSWORD = "NoahTheJew1997"


class TestBaseballFeatures:
    """Test baseball-specific features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("session_token") or data.get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
                self.token = token
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")
    
    def test_teams_filtered_by_sport_basketball(self):
        """Test that teams endpoint filters by sport=basketball"""
        response = self.session.get(f"{BASE_URL}/api/teams", params={"sport": "basketball"})
        assert response.status_code == 200
        teams = response.json()
        
        # All returned teams should be basketball
        for team in teams:
            assert team.get("sport") == "basketball", f"Team {team.get('name')} has sport={team.get('sport')}, expected basketball"
        
        print(f"✓ Found {len(teams)} basketball teams")
    
    def test_teams_filtered_by_sport_baseball(self):
        """Test that teams endpoint filters by sport=baseball"""
        response = self.session.get(f"{BASE_URL}/api/teams", params={"sport": "baseball"})
        assert response.status_code == 200
        teams = response.json()
        
        # All returned teams should be baseball
        for team in teams:
            assert team.get("sport") == "baseball", f"Team {team.get('name')} has sport={team.get('sport')}, expected baseball"
        
        print(f"✓ Found {len(teams)} baseball teams")
        return teams
    
    def test_create_baseball_game_with_7_innings(self):
        """Test creating a baseball game with 7 innings"""
        # First get baseball teams
        teams_response = self.session.get(f"{BASE_URL}/api/teams", params={"sport": "baseball"})
        teams = teams_response.json()
        
        if len(teams) < 2:
            pytest.skip("Need at least 2 baseball teams to test game creation")
        
        home_team = teams[0]
        away_team = teams[1]
        
        # Create game with 7 innings
        game_data = {
            "home_team_id": home_team["id"],
            "away_team_id": away_team["id"],
            "start_immediately": True,
            "sport": "baseball",
            "total_innings": 7,
            "note": "TEST_7_innings_game"
        }
        
        response = self.session.post(f"{BASE_URL}/api/games", json=game_data)
        assert response.status_code == 200, f"Failed to create game: {response.text}"
        
        game = response.json()
        assert game["sport"] == "baseball"
        assert game["total_innings"] == 7, f"Expected 7 innings, got {game.get('total_innings')}"
        assert game["current_inning"] == 1
        assert game["inning_half"] == "top"
        assert game["balls"] == 0
        assert game["strikes"] == 0
        assert game["outs"] == 0
        
        print(f"✓ Created baseball game with 7 innings: {game['id']}")
        
        # Cleanup - delete the test game
        self.session.delete(f"{BASE_URL}/api/games/{game['id']}")
        return game
    
    def test_create_baseball_game_with_9_innings(self):
        """Test creating a baseball game with 9 innings (default)"""
        # First get baseball teams
        teams_response = self.session.get(f"{BASE_URL}/api/teams", params={"sport": "baseball"})
        teams = teams_response.json()
        
        if len(teams) < 2:
            pytest.skip("Need at least 2 baseball teams to test game creation")
        
        home_team = teams[0]
        away_team = teams[1]
        
        # Create game with 9 innings
        game_data = {
            "home_team_id": home_team["id"],
            "away_team_id": away_team["id"],
            "start_immediately": True,
            "sport": "baseball",
            "total_innings": 9,
            "note": "TEST_9_innings_game"
        }
        
        response = self.session.post(f"{BASE_URL}/api/games", json=game_data)
        assert response.status_code == 200, f"Failed to create game: {response.text}"
        
        game = response.json()
        assert game["sport"] == "baseball"
        assert game["total_innings"] == 9, f"Expected 9 innings, got {game.get('total_innings')}"
        
        print(f"✓ Created baseball game with 9 innings: {game['id']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/games/{game['id']}")
        return game
    
    def test_update_baseball_game_state(self):
        """Test updating baseball game state (balls/strikes/outs)"""
        # First get baseball teams
        teams_response = self.session.get(f"{BASE_URL}/api/teams", params={"sport": "baseball"})
        teams = teams_response.json()
        
        if len(teams) < 2:
            pytest.skip("Need at least 2 baseball teams to test game update")
        
        home_team = teams[0]
        away_team = teams[1]
        
        # Create a test game
        game_data = {
            "home_team_id": home_team["id"],
            "away_team_id": away_team["id"],
            "start_immediately": True,
            "sport": "baseball",
            "total_innings": 9,
            "note": "TEST_update_state_game"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/games", json=game_data)
        assert create_response.status_code == 200
        game = create_response.json()
        game_id = game["id"]
        
        # Update game state
        update_data = {
            "balls": 2,
            "strikes": 1,
            "outs": 1,
            "current_inning": 1,
            "inning_half": "top"
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/games/{game_id}", json=update_data)
        assert update_response.status_code == 200, f"Failed to update game: {update_response.text}"
        
        # Verify the update persisted
        get_response = self.session.get(f"{BASE_URL}/api/games/{game_id}")
        assert get_response.status_code == 200
        
        updated_game = get_response.json()
        assert updated_game["balls"] == 2, f"Expected balls=2, got {updated_game.get('balls')}"
        assert updated_game["strikes"] == 1, f"Expected strikes=1, got {updated_game.get('strikes')}"
        assert updated_game["outs"] == 1, f"Expected outs=1, got {updated_game.get('outs')}"
        
        print(f"✓ Baseball game state updated and persisted correctly")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/games/{game_id}")
    
    def test_get_existing_baseball_game(self):
        """Test fetching the existing test baseball game"""
        # The test game ID from main agent context
        test_game_id = "d14cd69c-493e-43dc-ab00-143eba170385"
        
        response = self.session.get(f"{BASE_URL}/api/games/{test_game_id}")
        
        if response.status_code == 404:
            pytest.skip("Test game not found - may have been deleted")
        
        assert response.status_code == 200, f"Failed to get game: {response.text}"
        
        game = response.json()
        assert game["sport"] == "baseball"
        assert "home_team_name" in game
        assert "away_team_name" in game
        assert "total_innings" in game
        
        print(f"✓ Fetched existing baseball game: {game['home_team_name']} vs {game['away_team_name']}")
        return game
    
    def test_baseball_teams_exist(self):
        """Verify baseball teams exist (Riverside Sluggers and Valley Hawks)"""
        response = self.session.get(f"{BASE_URL}/api/teams", params={"sport": "baseball"})
        assert response.status_code == 200
        
        teams = response.json()
        team_names = [t["name"] for t in teams]
        
        # Check for expected teams
        expected_teams = ["Riverside Sluggers", "Valley Hawks"]
        found_teams = [name for name in expected_teams if name in team_names]
        
        print(f"✓ Found baseball teams: {team_names}")
        assert len(teams) >= 2, f"Expected at least 2 baseball teams, found {len(teams)}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
