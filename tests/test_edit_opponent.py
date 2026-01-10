"""
Test Edit Opponent Feature - Backend API Tests
Tests the PUT /api/schools/{school_id}/teams/{team_id} endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://stat-tracker-13.preview.emergentagent.com')

class TestEditOpponentAPI:
    """Tests for Edit Opponent feature backend API"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Login and get authenticated session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login with school admin credentials
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "antlermedia2003@gmail.com",
            "password": "NoahTheJew1997"
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
        
        login_data = login_response.json()
        session_token = login_data.get("session_token")
        session.headers.update({"Authorization": f"Bearer {session_token}"})
        
        return session
    
    @pytest.fixture(scope="class")
    def school_info(self, auth_session):
        """Get school info for the logged in user"""
        response = auth_session.get(f"{BASE_URL}/api/schools/my-school")
        assert response.status_code == 200, f"Failed to get school info: {response.text}"
        return response.json()
    
    @pytest.fixture(scope="class")
    def opponent_team(self, auth_session, school_info):
        """Get an opponent team to test with"""
        school_id = school_info["school_id"]
        sport = "basketball"
        
        # Get teams for the school
        response = auth_session.get(f"{BASE_URL}/api/schools/{school_id}/teams?sport={sport}")
        assert response.status_code == 200, f"Failed to get teams: {response.text}"
        
        teams = response.json()
        if not teams:
            pytest.skip("No teams found for testing")
        
        # Return the first team
        return teams[0]
    
    def test_login_success(self, auth_session):
        """Test that login works with school admin credentials"""
        # If we got here, auth_session fixture succeeded
        assert auth_session is not None
        print("✓ Login successful with school admin credentials")
    
    def test_get_school_info(self, school_info):
        """Test getting school info"""
        assert "school_id" in school_info
        assert "name" in school_info
        print(f"✓ School info retrieved: {school_info['name']}")
    
    def test_get_school_teams(self, auth_session, school_info):
        """Test getting teams for a school"""
        school_id = school_info["school_id"]
        
        response = auth_session.get(f"{BASE_URL}/api/schools/{school_id}/teams")
        assert response.status_code == 200, f"Failed to get teams: {response.text}"
        
        teams = response.json()
        assert isinstance(teams, list)
        print(f"✓ Retrieved {len(teams)} teams for school")
    
    def test_update_opponent_name(self, auth_session, school_info, opponent_team):
        """Test updating opponent team name"""
        school_id = school_info["school_id"]
        team_id = opponent_team["id"]
        original_name = opponent_team["name"]
        
        # Update the name
        new_name = f"TEST_Updated_{original_name}"
        response = auth_session.put(
            f"{BASE_URL}/api/schools/{school_id}/teams/{team_id}",
            json={"name": new_name}
        )
        
        assert response.status_code == 200, f"Failed to update team name: {response.text}"
        print(f"✓ Updated team name to: {new_name}")
        
        # Verify the update by getting the team
        get_response = auth_session.get(f"{BASE_URL}/api/schools/{school_id}/teams/{team_id}")
        assert get_response.status_code == 200
        updated_team = get_response.json()
        assert updated_team["name"] == new_name
        print(f"✓ Verified team name update")
        
        # Restore original name
        restore_response = auth_session.put(
            f"{BASE_URL}/api/schools/{school_id}/teams/{team_id}",
            json={"name": original_name}
        )
        assert restore_response.status_code == 200
        print(f"✓ Restored original team name: {original_name}")
    
    def test_update_opponent_color(self, auth_session, school_info, opponent_team):
        """Test updating opponent team color"""
        school_id = school_info["school_id"]
        team_id = opponent_team["id"]
        original_color = opponent_team.get("color", "#666666")
        
        # Update the color
        new_color = "#FF5500"
        response = auth_session.put(
            f"{BASE_URL}/api/schools/{school_id}/teams/{team_id}",
            json={"color": new_color}
        )
        
        assert response.status_code == 200, f"Failed to update team color: {response.text}"
        print(f"✓ Updated team color to: {new_color}")
        
        # Verify the update
        get_response = auth_session.get(f"{BASE_URL}/api/schools/{school_id}/teams/{team_id}")
        assert get_response.status_code == 200
        updated_team = get_response.json()
        assert updated_team["color"] == new_color
        print(f"✓ Verified team color update")
        
        # Restore original color
        restore_response = auth_session.put(
            f"{BASE_URL}/api/schools/{school_id}/teams/{team_id}",
            json={"color": original_color}
        )
        assert restore_response.status_code == 200
        print(f"✓ Restored original team color: {original_color}")
    
    def test_update_opponent_logo(self, auth_session, school_info, opponent_team):
        """Test updating opponent team logo URL"""
        school_id = school_info["school_id"]
        team_id = opponent_team["id"]
        original_logo = opponent_team.get("logo_url")
        
        # Update the logo URL
        new_logo = "https://example.com/test-logo.png"
        response = auth_session.put(
            f"{BASE_URL}/api/schools/{school_id}/teams/{team_id}",
            json={"logo_url": new_logo}
        )
        
        assert response.status_code == 200, f"Failed to update team logo: {response.text}"
        print(f"✓ Updated team logo URL to: {new_logo}")
        
        # Verify the update
        get_response = auth_session.get(f"{BASE_URL}/api/schools/{school_id}/teams/{team_id}")
        assert get_response.status_code == 200
        updated_team = get_response.json()
        assert updated_team.get("logo_url") == new_logo
        print(f"✓ Verified team logo URL update")
        
        # Restore original logo (or null)
        restore_response = auth_session.put(
            f"{BASE_URL}/api/schools/{school_id}/teams/{team_id}",
            json={"logo_url": original_logo}
        )
        assert restore_response.status_code == 200
        print(f"✓ Restored original team logo URL")
    
    def test_update_opponent_roster(self, auth_session, school_info, opponent_team):
        """Test updating opponent team roster"""
        school_id = school_info["school_id"]
        team_id = opponent_team["id"]
        original_roster = opponent_team.get("roster", [])
        
        # Create a test roster
        test_roster = [
            {"id": "test_player_1", "number": "1", "name": "Test Player One", "position": "PG", "playerClass": "SR"},
            {"id": "test_player_2", "number": "2", "name": "Test Player Two", "position": "SG", "playerClass": "JR"}
        ]
        
        response = auth_session.put(
            f"{BASE_URL}/api/schools/{school_id}/teams/{team_id}",
            json={"roster": test_roster}
        )
        
        assert response.status_code == 200, f"Failed to update team roster: {response.text}"
        print(f"✓ Updated team roster with {len(test_roster)} players")
        
        # Verify the update
        get_response = auth_session.get(f"{BASE_URL}/api/schools/{school_id}/teams/{team_id}")
        assert get_response.status_code == 200
        updated_team = get_response.json()
        assert len(updated_team.get("roster", [])) == len(test_roster)
        print(f"✓ Verified team roster update")
        
        # Restore original roster
        restore_response = auth_session.put(
            f"{BASE_URL}/api/schools/{school_id}/teams/{team_id}",
            json={"roster": original_roster}
        )
        assert restore_response.status_code == 200
        print(f"✓ Restored original team roster")
    
    def test_update_multiple_fields(self, auth_session, school_info, opponent_team):
        """Test updating multiple opponent fields at once"""
        school_id = school_info["school_id"]
        team_id = opponent_team["id"]
        
        # Store original values
        original_name = opponent_team["name"]
        original_color = opponent_team.get("color", "#666666")
        
        # Update multiple fields
        response = auth_session.put(
            f"{BASE_URL}/api/schools/{school_id}/teams/{team_id}",
            json={
                "name": "TEST_Multi_Update_Team",
                "color": "#00FF00"
            }
        )
        
        assert response.status_code == 200, f"Failed to update multiple fields: {response.text}"
        print(f"✓ Updated multiple fields at once")
        
        # Verify the updates
        get_response = auth_session.get(f"{BASE_URL}/api/schools/{school_id}/teams/{team_id}")
        assert get_response.status_code == 200
        updated_team = get_response.json()
        assert updated_team["name"] == "TEST_Multi_Update_Team"
        assert updated_team["color"] == "#00FF00"
        print(f"✓ Verified multiple field updates")
        
        # Restore original values
        restore_response = auth_session.put(
            f"{BASE_URL}/api/schools/{school_id}/teams/{team_id}",
            json={
                "name": original_name,
                "color": original_color
            }
        )
        assert restore_response.status_code == 200
        print(f"✓ Restored original values")


class TestSeasonStatsAPI:
    """Tests for Season Stats feature backend API"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Login and get authenticated session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login with school admin credentials
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "antlermedia2003@gmail.com",
            "password": "NoahTheJew1997"
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        login_data = login_response.json()
        session_token = login_data.get("session_token")
        session.headers.update({"Authorization": f"Bearer {session_token}"})
        
        return session
    
    @pytest.fixture(scope="class")
    def school_info(self, auth_session):
        """Get school info for the logged in user"""
        response = auth_session.get(f"{BASE_URL}/api/schools/my-school")
        assert response.status_code == 200
        return response.json()
    
    def test_get_seasons(self, auth_session, school_info):
        """Test getting seasons for a school"""
        school_id = school_info["school_id"]
        
        response = auth_session.get(f"{BASE_URL}/api/schools/{school_id}/seasons")
        assert response.status_code == 200, f"Failed to get seasons: {response.text}"
        
        seasons = response.json()
        assert isinstance(seasons, list)
        print(f"✓ Retrieved {len(seasons)} seasons for school")
        
        # Verify season structure
        if seasons:
            season = seasons[0]
            assert "season_id" in season
            assert "name" in season
            assert "sport" in season
            print(f"✓ Season structure verified: {season['name']}")
    
    def test_get_season_details(self, auth_session, school_info):
        """Test getting season details"""
        school_id = school_info["school_id"]
        
        # First get seasons
        seasons_response = auth_session.get(f"{BASE_URL}/api/schools/{school_id}/seasons")
        assert seasons_response.status_code == 200
        seasons = seasons_response.json()
        
        if not seasons:
            pytest.skip("No seasons found for testing")
        
        season_id = seasons[0]["season_id"]
        
        # Get season details
        response = auth_session.get(f"{BASE_URL}/api/schools/{school_id}/seasons/{season_id}")
        assert response.status_code == 200, f"Failed to get season details: {response.text}"
        
        season = response.json()
        assert "season_id" in season or "id" in season
        assert "name" in season
        print(f"✓ Season details retrieved: {season['name']}")
    
    def test_get_season_games(self, auth_session, school_info):
        """Test getting games for a season"""
        school_id = school_info["school_id"]
        
        # First get seasons
        seasons_response = auth_session.get(f"{BASE_URL}/api/schools/{school_id}/seasons")
        assert seasons_response.status_code == 200
        seasons = seasons_response.json()
        
        if not seasons:
            pytest.skip("No seasons found for testing")
        
        season_id = seasons[0]["season_id"]
        
        # Get season games
        response = auth_session.get(f"{BASE_URL}/api/schools/{school_id}/seasons/{season_id}/games")
        assert response.status_code == 200, f"Failed to get season games: {response.text}"
        
        games = response.json()
        assert isinstance(games, list)
        print(f"✓ Retrieved {len(games)} games for season")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
