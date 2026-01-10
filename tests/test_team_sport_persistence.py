"""
Test Team Sport Persistence - Verifies that baseball teams maintain their sport field
when edited via TeamDetail.jsx

Key bug being tested:
- Creating a baseball team, adding roster, saving, navigating back should show team in baseball list
- The sport field should NOT be overwritten to 'basketball' when saving team details
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "antlersportsnetwork@gmail.com"
TEST_PASSWORD = "NoahTheJew1997"


class TestTeamSportPersistence:
    """Test that team sport field is preserved during updates"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get session
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
        
        # Extract session token from cookies
        self.cookies = login_response.cookies
        self.session.cookies.update(self.cookies)
        
        yield
        
        # Cleanup - delete test teams
        self._cleanup_test_teams()
    
    def _cleanup_test_teams(self):
        """Delete any test teams created during testing"""
        try:
            # Get all teams
            for sport in ['baseball', 'basketball', 'football']:
                response = self.session.get(f"{BASE_URL}/api/teams", params={"sport": sport})
                if response.status_code == 200:
                    teams = response.json()
                    for team in teams:
                        if team.get('name', '').startswith('TEST_'):
                            self.session.delete(f"{BASE_URL}/api/teams/{team['id']}")
        except Exception as e:
            print(f"Cleanup error: {e}")
    
    def test_create_baseball_team(self):
        """Test creating a baseball team with sport='baseball'"""
        team_name = f"TEST_Baseball_Team_{uuid.uuid4().hex[:8]}"
        
        # Create baseball team
        create_response = self.session.post(f"{BASE_URL}/api/teams", json={
            "name": team_name,
            "color": "#dc2626",
            "sport": "baseball",
            "roster": []
        })
        
        assert create_response.status_code == 200, f"Failed to create team: {create_response.text}"
        
        created_team = create_response.json()
        assert created_team["name"] == team_name
        assert created_team["sport"] == "baseball", f"Expected sport='baseball', got '{created_team.get('sport')}'"
        
        team_id = created_team["id"]
        
        # Verify team appears in baseball teams list
        list_response = self.session.get(f"{BASE_URL}/api/teams", params={"sport": "baseball"})
        assert list_response.status_code == 200
        
        teams = list_response.json()
        team_ids = [t["id"] for t in teams]
        assert team_id in team_ids, "Created baseball team not found in baseball teams list"
        
        print(f"✓ Created baseball team: {team_name} (ID: {team_id})")
        return team_id
    
    def test_update_baseball_team_preserves_sport(self):
        """Test that updating a baseball team preserves the sport field"""
        team_name = f"TEST_Baseball_Update_{uuid.uuid4().hex[:8]}"
        
        # Create baseball team
        create_response = self.session.post(f"{BASE_URL}/api/teams", json={
            "name": team_name,
            "color": "#dc2626",
            "sport": "baseball",
            "roster": []
        })
        
        assert create_response.status_code == 200
        team_id = create_response.json()["id"]
        
        # Update team WITH sport field (simulating TeamDetail.jsx fix)
        update_response = self.session.put(f"{BASE_URL}/api/teams/{team_id}", json={
            "name": team_name + "_Updated",
            "color": "#2563eb",
            "sport": "baseball",  # Explicitly include sport
            "roster": [{"number": "1", "name": "Test Player"}]
        })
        
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        updated_team = update_response.json()
        assert updated_team["sport"] == "baseball", f"Sport changed to '{updated_team.get('sport')}' after update"
        
        # Verify team still appears in baseball list
        list_response = self.session.get(f"{BASE_URL}/api/teams", params={"sport": "baseball"})
        teams = list_response.json()
        team_ids = [t["id"] for t in teams]
        assert team_id in team_ids, "Team disappeared from baseball list after update"
        
        print(f"✓ Updated baseball team preserves sport field")
    
    def test_update_without_sport_preserves_existing(self):
        """Test backend preserves sport when update doesn't include it (or defaults to basketball)"""
        team_name = f"TEST_Baseball_NoSport_{uuid.uuid4().hex[:8]}"
        
        # Create baseball team
        create_response = self.session.post(f"{BASE_URL}/api/teams", json={
            "name": team_name,
            "color": "#dc2626",
            "sport": "baseball",
            "roster": []
        })
        
        assert create_response.status_code == 200
        team_id = create_response.json()["id"]
        
        # Update team with sport defaulting to basketball (simulating old frontend behavior)
        # Backend should preserve existing sport if incoming is default 'basketball' but existing is different
        update_response = self.session.put(f"{BASE_URL}/api/teams/{team_id}", json={
            "name": team_name + "_Updated",
            "color": "#2563eb",
            "sport": "basketball",  # Default value - backend should preserve 'baseball'
            "roster": [{"number": "1", "name": "Test Player"}]
        })
        
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        updated_team = update_response.json()
        # Backend logic: if incoming sport is 'basketball' (default) but existing is different, preserve existing
        assert updated_team["sport"] == "baseball", f"Backend didn't preserve sport, got '{updated_team.get('sport')}'"
        
        print(f"✓ Backend preserves baseball sport when update sends default 'basketball'")
    
    def test_add_roster_to_baseball_team(self):
        """Test adding roster players to a baseball team preserves sport"""
        team_name = f"TEST_Baseball_Roster_{uuid.uuid4().hex[:8]}"
        
        # Create baseball team
        create_response = self.session.post(f"{BASE_URL}/api/teams", json={
            "name": team_name,
            "color": "#dc2626",
            "sport": "baseball",
            "roster": []
        })
        
        assert create_response.status_code == 200
        team_id = create_response.json()["id"]
        
        # Add multiple roster players (simulating TeamDetail.jsx auto-save)
        roster = [
            {"number": "1", "name": "Pitcher One"},
            {"number": "2", "name": "Catcher Two"},
            {"number": "3", "name": "First Base"},
            {"number": "4", "name": "Second Base"},
            {"number": "5", "name": "Third Base"},
            {"number": "6", "name": "Shortstop"},
            {"number": "7", "name": "Left Field"},
            {"number": "8", "name": "Center Field"},
            {"number": "9", "name": "Right Field"},
        ]
        
        update_response = self.session.put(f"{BASE_URL}/api/teams/{team_id}", json={
            "name": team_name,
            "color": "#dc2626",
            "sport": "baseball",
            "roster": roster
        })
        
        assert update_response.status_code == 200
        
        updated_team = update_response.json()
        assert updated_team["sport"] == "baseball"
        assert len(updated_team["roster"]) == 9
        
        # Verify team still in baseball list
        list_response = self.session.get(f"{BASE_URL}/api/teams", params={"sport": "baseball"})
        teams = list_response.json()
        team_ids = [t["id"] for t in teams]
        assert team_id in team_ids, "Team with roster not in baseball list"
        
        print(f"✓ Added 9 players to baseball team, sport preserved")
    
    def test_full_workflow_create_edit_navigate_back(self):
        """
        Full workflow test:
        1. Create baseball team
        2. Add roster players
        3. Save changes
        4. Verify team shows in baseball teams list
        """
        team_name = f"TEST_Baseball_Workflow_{uuid.uuid4().hex[:8]}"
        
        # Step 1: Create baseball team
        create_response = self.session.post(f"{BASE_URL}/api/teams", json={
            "name": team_name,
            "color": "#dc2626",
            "sport": "baseball",
            "roster": []
        })
        
        assert create_response.status_code == 200
        team_id = create_response.json()["id"]
        print(f"  Step 1: Created team {team_id}")
        
        # Step 2: Get team details (simulating navigation to TeamDetail)
        get_response = self.session.get(f"{BASE_URL}/api/teams/{team_id}")
        assert get_response.status_code == 200
        team_data = get_response.json()
        assert team_data["sport"] == "baseball"
        print(f"  Step 2: Fetched team, sport={team_data['sport']}")
        
        # Step 3: Add roster and save (simulating TeamDetail.jsx save)
        roster = [
            {"number": "10", "name": "Star Player"},
            {"number": "11", "name": "Backup Player"},
        ]
        
        update_response = self.session.put(f"{BASE_URL}/api/teams/{team_id}", json={
            "name": team_name,
            "color": "#dc2626",
            "sport": "baseball",  # Frontend now includes this
            "roster": roster
        })
        
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["sport"] == "baseball"
        print(f"  Step 3: Updated team with roster, sport={updated['sport']}")
        
        # Step 4: Navigate back - verify team in baseball list
        list_response = self.session.get(f"{BASE_URL}/api/teams", params={"sport": "baseball"})
        assert list_response.status_code == 200
        
        teams = list_response.json()
        found_team = next((t for t in teams if t["id"] == team_id), None)
        
        assert found_team is not None, f"Team {team_id} not found in baseball teams list!"
        assert found_team["sport"] == "baseball"
        assert len(found_team["roster"]) == 2
        
        print(f"  Step 4: Team found in baseball list with {len(found_team['roster'])} players")
        print(f"✓ Full workflow test passed!")


class TestTeamsAPI:
    """General Teams API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        self.session.cookies.update(login_response.cookies)
        yield
    
    def test_get_teams_by_sport_filter(self):
        """Test that sport filter works correctly"""
        # Get basketball teams
        basketball_response = self.session.get(f"{BASE_URL}/api/teams", params={"sport": "basketball"})
        assert basketball_response.status_code == 200
        basketball_teams = basketball_response.json()
        
        # Get baseball teams
        baseball_response = self.session.get(f"{BASE_URL}/api/teams", params={"sport": "baseball"})
        assert baseball_response.status_code == 200
        baseball_teams = baseball_response.json()
        
        # Verify all returned teams have correct sport
        for team in basketball_teams:
            assert team.get("sport") == "basketball", f"Basketball list contains non-basketball team: {team}"
        
        for team in baseball_teams:
            assert team.get("sport") == "baseball", f"Baseball list contains non-baseball team: {team}"
        
        print(f"✓ Sport filter works: {len(basketball_teams)} basketball, {len(baseball_teams)} baseball teams")
    
    def test_team_crud_operations(self):
        """Test basic CRUD operations on teams"""
        team_name = f"TEST_CRUD_{uuid.uuid4().hex[:8]}"
        
        # CREATE
        create_response = self.session.post(f"{BASE_URL}/api/teams", json={
            "name": team_name,
            "color": "#000000",
            "sport": "baseball"
        })
        assert create_response.status_code == 200
        team_id = create_response.json()["id"]
        
        # READ
        get_response = self.session.get(f"{BASE_URL}/api/teams/{team_id}")
        assert get_response.status_code == 200
        assert get_response.json()["name"] == team_name
        
        # UPDATE
        update_response = self.session.put(f"{BASE_URL}/api/teams/{team_id}", json={
            "name": team_name + "_Updated",
            "color": "#ffffff",
            "sport": "baseball"
        })
        assert update_response.status_code == 200
        assert update_response.json()["name"] == team_name + "_Updated"
        
        # DELETE
        delete_response = self.session.delete(f"{BASE_URL}/api/teams/{team_id}")
        assert delete_response.status_code == 200
        
        # Verify deleted
        get_deleted = self.session.get(f"{BASE_URL}/api/teams/{team_id}")
        assert get_deleted.status_code == 404
        
        print(f"✓ CRUD operations work correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
