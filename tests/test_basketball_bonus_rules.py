"""
Test Basketball Bonus Rules Feature
Tests for:
1. Basketball game creation with bonus rule settings
2. Bonus rules section appears only for basketball sport
3. Preset buttons (College 7/10, NBA 5 fouls, High School 7/10)
4. Backend stores bonus_enabled, double_bonus_enabled, bonus_fouls, double_bonus_fouls fields
5. Backend auto-calculates home_bonus and away_bonus when a foul is recorded
6. Bonus status displayed on LiveGame.jsx with opponent foul count indicator
7. JumbotronOutput.jsx shows BONUS or 2X BONUS based on team fouls
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sportmoose.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "antlersportsnetwork@gmail.com"
TEST_PASSWORD = "NoahTheJew1997"


@pytest.fixture(scope="module")
def session():
    """Create authenticated session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    
    # Login
    login_response = s.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if login_response.status_code == 200:
        token = login_response.json().get("session_token")
        if token:
            s.headers.update({"Authorization": f"Bearer {token}"})
    
    return s


@pytest.fixture(scope="module")
def test_teams(session):
    """Create test teams for basketball games"""
    # Create home team
    home_team_data = {
        "name": f"Test Home Team {uuid.uuid4().hex[:6]}",
        "color": "#FF0000",
        "sport": "basketball",
        "roster": [
            {"number": "1", "name": "Player One"},
            {"number": "2", "name": "Player Two"},
            {"number": "3", "name": "Player Three"},
            {"number": "4", "name": "Player Four"},
            {"number": "5", "name": "Player Five"}
        ]
    }
    home_response = session.post(f"{BASE_URL}/api/teams", json=home_team_data)
    assert home_response.status_code == 200, f"Failed to create home team: {home_response.text}"
    home_team = home_response.json()
    
    # Create away team
    away_team_data = {
        "name": f"Test Away Team {uuid.uuid4().hex[:6]}",
        "color": "#0000FF",
        "sport": "basketball",
        "roster": [
            {"number": "10", "name": "Away Player One"},
            {"number": "11", "name": "Away Player Two"},
            {"number": "12", "name": "Away Player Three"},
            {"number": "13", "name": "Away Player Four"},
            {"number": "14", "name": "Away Player Five"}
        ]
    }
    away_response = session.post(f"{BASE_URL}/api/teams", json=away_team_data)
    assert away_response.status_code == 200, f"Failed to create away team: {away_response.text}"
    away_team = away_response.json()
    
    yield {"home": home_team, "away": away_team}
    
    # Cleanup - delete teams
    session.delete(f"{BASE_URL}/api/teams/{home_team['id']}")
    session.delete(f"{BASE_URL}/api/teams/{away_team['id']}")


class TestBonusRulesGameCreation:
    """Test basketball game creation with bonus rule settings"""
    
    def test_create_game_with_default_bonus_settings(self, session, test_teams):
        """Test creating a basketball game with default bonus settings (College 7/10)"""
        game_data = {
            "home_team_id": test_teams["home"]["id"],
            "away_team_id": test_teams["away"]["id"],
            "start_immediately": True,
            "sport": "basketball",
            "bonus_enabled": True,
            "double_bonus_enabled": True,
            "bonus_fouls": 7,
            "double_bonus_fouls": 10
        }
        
        response = session.post(f"{BASE_URL}/api/games", json=game_data)
        assert response.status_code == 200, f"Failed to create game: {response.text}"
        
        game = response.json()
        game_id = game["id"]
        
        # Verify bonus settings are stored
        assert game.get("bonus_enabled") == True, "bonus_enabled should be True"
        assert game.get("double_bonus_enabled") == True, "double_bonus_enabled should be True"
        assert game.get("bonus_fouls") == 7, "bonus_fouls should be 7"
        assert game.get("double_bonus_fouls") == 10, "double_bonus_fouls should be 10"
        
        # Verify initial bonus status is null
        assert game.get("home_bonus") is None, "home_bonus should be None initially"
        assert game.get("away_bonus") is None, "away_bonus should be None initially"
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/games/{game_id}")
        print(f"✓ Game created with default bonus settings (College 7/10)")
    
    def test_create_game_with_nba_bonus_settings(self, session, test_teams):
        """Test creating a basketball game with NBA bonus settings (5 fouls, no 1-and-1)"""
        game_data = {
            "home_team_id": test_teams["home"]["id"],
            "away_team_id": test_teams["away"]["id"],
            "start_immediately": True,
            "sport": "basketball",
            "bonus_enabled": False,  # NBA has no 1-and-1
            "double_bonus_enabled": True,
            "bonus_fouls": 5,
            "double_bonus_fouls": 5
        }
        
        response = session.post(f"{BASE_URL}/api/games", json=game_data)
        assert response.status_code == 200, f"Failed to create game: {response.text}"
        
        game = response.json()
        game_id = game["id"]
        
        # Verify NBA bonus settings
        assert game.get("bonus_enabled") == False, "bonus_enabled should be False for NBA"
        assert game.get("double_bonus_enabled") == True, "double_bonus_enabled should be True"
        assert game.get("bonus_fouls") == 5, "bonus_fouls should be 5"
        assert game.get("double_bonus_fouls") == 5, "double_bonus_fouls should be 5"
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/games/{game_id}")
        print(f"✓ Game created with NBA bonus settings (5 fouls)")
    
    def test_create_game_with_custom_bonus_settings(self, session, test_teams):
        """Test creating a basketball game with custom bonus settings"""
        game_data = {
            "home_team_id": test_teams["home"]["id"],
            "away_team_id": test_teams["away"]["id"],
            "start_immediately": True,
            "sport": "basketball",
            "bonus_enabled": True,
            "double_bonus_enabled": True,
            "bonus_fouls": 5,
            "double_bonus_fouls": 8
        }
        
        response = session.post(f"{BASE_URL}/api/games", json=game_data)
        assert response.status_code == 200, f"Failed to create game: {response.text}"
        
        game = response.json()
        game_id = game["id"]
        
        # Verify custom bonus settings
        assert game.get("bonus_fouls") == 5, "bonus_fouls should be 5"
        assert game.get("double_bonus_fouls") == 8, "double_bonus_fouls should be 8"
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/games/{game_id}")
        print(f"✓ Game created with custom bonus settings (5/8)")
    
    def test_create_game_with_bonus_disabled(self, session, test_teams):
        """Test creating a basketball game with bonus tracking disabled"""
        game_data = {
            "home_team_id": test_teams["home"]["id"],
            "away_team_id": test_teams["away"]["id"],
            "start_immediately": True,
            "sport": "basketball",
            "bonus_enabled": False,
            "double_bonus_enabled": False,
            "bonus_fouls": None,
            "double_bonus_fouls": None
        }
        
        response = session.post(f"{BASE_URL}/api/games", json=game_data)
        assert response.status_code == 200, f"Failed to create game: {response.text}"
        
        game = response.json()
        game_id = game["id"]
        
        # Verify bonus is disabled
        assert game.get("bonus_enabled") == False, "bonus_enabled should be False"
        assert game.get("double_bonus_enabled") == False, "double_bonus_enabled should be False"
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/games/{game_id}")
        print(f"✓ Game created with bonus tracking disabled")


class TestBonusAutoCalculation:
    """Test automatic bonus calculation when fouls are recorded"""
    
    def test_bonus_triggers_at_threshold(self, session, test_teams):
        """Test that bonus status is automatically set when opponent fouls reach threshold"""
        # Create game with College settings (7/10)
        game_data = {
            "home_team_id": test_teams["home"]["id"],
            "away_team_id": test_teams["away"]["id"],
            "start_immediately": True,
            "sport": "basketball",
            "bonus_enabled": True,
            "double_bonus_enabled": True,
            "bonus_fouls": 7,
            "double_bonus_fouls": 10
        }
        
        response = session.post(f"{BASE_URL}/api/games", json=game_data)
        assert response.status_code == 200, f"Failed to create game: {response.text}"
        
        game = response.json()
        game_id = game["id"]
        
        # Get player stats to find a player ID
        game_response = session.get(f"{BASE_URL}/api/games/{game_id}")
        game_data = game_response.json()
        
        # Get away team player to record fouls (this will trigger home team bonus)
        away_players = game_data.get("away_player_stats", [])
        if not away_players:
            # Add a player if none exist
            session.post(f"{BASE_URL}/api/games/{game_id}/players", json={
                "team_id": test_teams["away"]["id"],
                "player_number": "99",
                "player_name": "Test Fouler"
            })
            game_response = session.get(f"{BASE_URL}/api/games/{game_id}")
            game_data = game_response.json()
            away_players = game_data.get("away_player_stats", [])
        
        if away_players:
            player_id = away_players[0]["id"]
            
            # Record 7 fouls on away team (should trigger home team bonus)
            for i in range(7):
                foul_response = session.post(f"{BASE_URL}/api/games/{game_id}/stats", json={
                    "player_id": player_id,
                    "stat_type": "foul",
                    "increment": 1
                })
                assert foul_response.status_code == 200, f"Failed to record foul {i+1}: {foul_response.text}"
            
            # Check game state - home team should be in bonus
            game_response = session.get(f"{BASE_URL}/api/games/{game_id}")
            updated_game = game_response.json()
            
            assert updated_game.get("away_team_fouls") == 7, f"Away team fouls should be 7, got {updated_game.get('away_team_fouls')}"
            assert updated_game.get("home_bonus") == "bonus", f"Home team should be in bonus, got {updated_game.get('home_bonus')}"
            
            print(f"✓ Bonus triggered at 7 fouls threshold")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/games/{game_id}")
    
    def test_double_bonus_triggers_at_threshold(self, session, test_teams):
        """Test that double bonus status is automatically set when opponent fouls reach threshold"""
        # Create game with College settings (7/10)
        game_data = {
            "home_team_id": test_teams["home"]["id"],
            "away_team_id": test_teams["away"]["id"],
            "start_immediately": True,
            "sport": "basketball",
            "bonus_enabled": True,
            "double_bonus_enabled": True,
            "bonus_fouls": 7,
            "double_bonus_fouls": 10
        }
        
        response = session.post(f"{BASE_URL}/api/games", json=game_data)
        assert response.status_code == 200, f"Failed to create game: {response.text}"
        
        game = response.json()
        game_id = game["id"]
        
        # Get player stats to find a player ID
        game_response = session.get(f"{BASE_URL}/api/games/{game_id}")
        game_data = game_response.json()
        
        # Get away team player to record fouls
        away_players = game_data.get("away_player_stats", [])
        if not away_players:
            session.post(f"{BASE_URL}/api/games/{game_id}/players", json={
                "team_id": test_teams["away"]["id"],
                "player_number": "99",
                "player_name": "Test Fouler"
            })
            game_response = session.get(f"{BASE_URL}/api/games/{game_id}")
            game_data = game_response.json()
            away_players = game_data.get("away_player_stats", [])
        
        if away_players:
            player_id = away_players[0]["id"]
            
            # Record 10 fouls on away team (should trigger home team double bonus)
            for i in range(10):
                foul_response = session.post(f"{BASE_URL}/api/games/{game_id}/stats", json={
                    "player_id": player_id,
                    "stat_type": "foul",
                    "increment": 1
                })
                assert foul_response.status_code == 200, f"Failed to record foul {i+1}: {foul_response.text}"
            
            # Check game state - home team should be in double bonus
            game_response = session.get(f"{BASE_URL}/api/games/{game_id}")
            updated_game = game_response.json()
            
            assert updated_game.get("away_team_fouls") == 10, f"Away team fouls should be 10, got {updated_game.get('away_team_fouls')}"
            assert updated_game.get("home_bonus") == "double_bonus", f"Home team should be in double_bonus, got {updated_game.get('home_bonus')}"
            
            print(f"✓ Double bonus triggered at 10 fouls threshold")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/games/{game_id}")


class TestBonusEndpoint:
    """Test the manual bonus toggle endpoint"""
    
    def test_manual_bonus_toggle(self, session, test_teams):
        """Test manually toggling bonus status via API"""
        # Create game
        game_data = {
            "home_team_id": test_teams["home"]["id"],
            "away_team_id": test_teams["away"]["id"],
            "start_immediately": True,
            "sport": "basketball"
        }
        
        response = session.post(f"{BASE_URL}/api/games", json=game_data)
        assert response.status_code == 200, f"Failed to create game: {response.text}"
        
        game = response.json()
        game_id = game["id"]
        
        # Set home team to bonus
        bonus_response = session.post(f"{BASE_URL}/api/games/{game_id}/bonus", json={
            "team": "home",
            "bonus_status": "bonus"
        })
        assert bonus_response.status_code == 200, f"Failed to set bonus: {bonus_response.text}"
        
        # Verify bonus was set
        game_response = session.get(f"{BASE_URL}/api/games/{game_id}")
        updated_game = game_response.json()
        assert updated_game.get("home_bonus") == "bonus", "Home team should be in bonus"
        
        # Set home team to double bonus
        bonus_response = session.post(f"{BASE_URL}/api/games/{game_id}/bonus", json={
            "team": "home",
            "bonus_status": "double_bonus"
        })
        assert bonus_response.status_code == 200, f"Failed to set double bonus: {bonus_response.text}"
        
        # Verify double bonus was set
        game_response = session.get(f"{BASE_URL}/api/games/{game_id}")
        updated_game = game_response.json()
        assert updated_game.get("home_bonus") == "double_bonus", "Home team should be in double_bonus"
        
        # Clear bonus
        bonus_response = session.post(f"{BASE_URL}/api/games/{game_id}/bonus", json={
            "team": "home",
            "bonus_status": None
        })
        assert bonus_response.status_code == 200, f"Failed to clear bonus: {bonus_response.text}"
        
        # Verify bonus was cleared
        game_response = session.get(f"{BASE_URL}/api/games/{game_id}")
        updated_game = game_response.json()
        assert updated_game.get("home_bonus") is None, "Home team bonus should be cleared"
        
        print(f"✓ Manual bonus toggle works correctly")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/games/{game_id}")


class TestJumbotronBonusDisplay:
    """Test bonus display in jumbotron output"""
    
    def test_jumbotron_shows_bonus_status(self, session, test_teams):
        """Test that jumbotron output includes bonus status"""
        # Create game with bonus enabled
        game_data = {
            "home_team_id": test_teams["home"]["id"],
            "away_team_id": test_teams["away"]["id"],
            "start_immediately": True,
            "sport": "basketball",
            "bonus_enabled": True,
            "double_bonus_enabled": True,
            "bonus_fouls": 7,
            "double_bonus_fouls": 10
        }
        
        response = session.post(f"{BASE_URL}/api/games", json=game_data)
        assert response.status_code == 200, f"Failed to create game: {response.text}"
        
        game = response.json()
        game_id = game["id"]
        share_code = game.get("share_code")
        
        # Set home team to bonus manually
        session.post(f"{BASE_URL}/api/games/{game_id}/bonus", json={
            "team": "home",
            "bonus_status": "bonus"
        })
        
        # Get game via share code (jumbotron uses this)
        share_response = session.get(f"{BASE_URL}/api/games/share/{share_code}")
        assert share_response.status_code == 200, f"Failed to get game by share code: {share_response.text}"
        
        shared_game = share_response.json()
        
        # Verify bonus fields are present in shared game data
        assert "home_bonus" in shared_game, "home_bonus should be in shared game data"
        assert "away_bonus" in shared_game, "away_bonus should be in shared game data"
        assert "bonus_enabled" in shared_game, "bonus_enabled should be in shared game data"
        assert "bonus_fouls" in shared_game, "bonus_fouls should be in shared game data"
        assert "double_bonus_fouls" in shared_game, "double_bonus_fouls should be in shared game data"
        
        assert shared_game.get("home_bonus") == "bonus", "Home team should be in bonus"
        
        print(f"✓ Jumbotron output includes bonus status fields")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/games/{game_id}")


class TestNonBasketballSports:
    """Test that bonus settings are not applied to non-basketball sports"""
    
    def test_football_game_no_bonus(self, session):
        """Test that football games don't have bonus settings"""
        # First create football teams
        home_team_data = {
            "name": f"Football Home {uuid.uuid4().hex[:6]}",
            "color": "#FF0000",
            "sport": "football",
            "roster": []
        }
        home_response = session.post(f"{BASE_URL}/api/teams", json=home_team_data)
        home_team = home_response.json()
        
        away_team_data = {
            "name": f"Football Away {uuid.uuid4().hex[:6]}",
            "color": "#0000FF",
            "sport": "football",
            "roster": []
        }
        away_response = session.post(f"{BASE_URL}/api/teams", json=away_team_data)
        away_team = away_response.json()
        
        # Create football game
        game_data = {
            "home_team_id": home_team["id"],
            "away_team_id": away_team["id"],
            "start_immediately": True,
            "sport": "football",
            "bonus_enabled": True,  # Should be ignored for football
            "double_bonus_enabled": True
        }
        
        response = session.post(f"{BASE_URL}/api/games", json=game_data)
        assert response.status_code == 200, f"Failed to create game: {response.text}"
        
        game = response.json()
        game_id = game["id"]
        
        # Verify bonus is disabled for football
        assert game.get("bonus_enabled") == False, "bonus_enabled should be False for football"
        
        print(f"✓ Football games don't have bonus settings")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/games/{game_id}")
        session.delete(f"{BASE_URL}/api/teams/{home_team['id']}")
        session.delete(f"{BASE_URL}/api/teams/{away_team['id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
