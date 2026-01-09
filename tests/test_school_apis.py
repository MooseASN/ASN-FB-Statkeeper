"""
Test School/Organization Management APIs
Tests: School signup, dashboard, seasons, roster, opponents, game scheduling
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from existing data
TEST_SESSION_TOKEN = "test_school_session_1767919884135"
TEST_SCHOOL_ID = "school_d613fa4bc98e"
TEST_USER_ID = "user_bd29166ac393"

class TestSchoolAPIs:
    """Test School Management APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.headers = {
            "Authorization": f"Bearer {TEST_SESSION_TOKEN}",
            "Content-Type": "application/json"
        }
    
    # ============ SCHOOL SIGNUP & NAME CHECK ============
    
    def test_check_school_name_available(self):
        """Test checking if a school name is available"""
        unique_name = f"Test School {uuid.uuid4().hex[:8]}"
        response = requests.get(f"{BASE_URL}/api/schools/check-name/{unique_name}")
        assert response.status_code == 200
        data = response.json()
        assert "available" in data
        assert data["available"] == True
        print(f"✓ School name '{unique_name}' is available")
    
    def test_check_school_name_taken(self):
        """Test checking if existing school name is taken"""
        response = requests.get(f"{BASE_URL}/api/schools/check-name/Moose Academy")
        assert response.status_code == 200
        data = response.json()
        assert "available" in data
        assert data["available"] == False
        print("✓ School name 'Moose Academy' is correctly shown as taken")
    
    def test_get_states_list(self):
        """Test getting US states list for signup form"""
        response = requests.get(f"{BASE_URL}/api/states")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert "Texas" in data
        print(f"✓ States list returned {len(data)} states")
    
    def test_get_security_questions(self):
        """Test getting security questions for signup form"""
        response = requests.get(f"{BASE_URL}/api/security-questions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2
        print(f"✓ Security questions returned {len(data)} questions")
    
    # ============ SCHOOL DASHBOARD ============
    
    def test_get_my_school(self):
        """Test getting current user's school"""
        response = requests.get(f"{BASE_URL}/api/schools/my-school", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["school_id"] == TEST_SCHOOL_ID
        assert data["name"] == "Moose Academy"
        assert data["state"] == "Texas"
        assert "user_role" in data
        assert data["user_role"] == "admin"
        assert "invite_code" in data
        print(f"✓ My school returned: {data['name']} ({data['state']})")
    
    def test_get_school_members(self):
        """Test getting school members list"""
        response = requests.get(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/members", 
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        # Verify member structure
        member = data[0]
        assert "user_id" in member
        assert "email" in member
        assert "name" in member
        assert "school_role" in member
        print(f"✓ School members returned {len(data)} members")
    
    def test_get_school_calendar(self):
        """Test getting school calendar data"""
        response = requests.get(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/calendar",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "games" in data
        assert "seasons" in data
        assert isinstance(data["games"], list)
        assert isinstance(data["seasons"], list)
        print(f"✓ Calendar returned {len(data['games'])} games, {len(data['seasons'])} seasons")
    
    # ============ SEASONS MANAGEMENT ============
    
    def test_get_school_seasons(self):
        """Test getting school seasons list"""
        response = requests.get(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/seasons",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Seasons list returned {len(data)} seasons")
    
    def test_create_season(self):
        """Test creating a new season"""
        season_name = f"Test Season {uuid.uuid4().hex[:6]}"
        response = requests.post(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/seasons",
            headers=self.headers,
            json={
                "name": season_name,
                "sport": "basketball"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "season_id" in data
        assert data["name"] == season_name
        assert data["sport"] == "basketball"
        assert data["school_id"] == TEST_SCHOOL_ID
        print(f"✓ Season created: {data['season_id']}")
        # Store for later tests
        pytest.season_id = data["season_id"]
    
    def test_get_season_details(self):
        """Test getting season details"""
        # Use the season created in previous test
        season_id = getattr(pytest, 'season_id', None)
        if not season_id:
            pytest.skip("No season created in previous test")
        
        response = requests.get(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/seasons/{season_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["season_id"] == season_id
        assert "team" in data
        assert "games" in data
        print(f"✓ Season details returned for {data['name']}")
    
    # ============ TEAMS/ROSTER MANAGEMENT ============
    
    def test_get_school_teams(self):
        """Test getting school teams list"""
        response = requests.get(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/teams",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Teams list returned {len(data)} teams")
    
    def test_create_team_with_roster(self):
        """Test creating a team with roster (manual entry)"""
        team_name = f"Test Team {uuid.uuid4().hex[:6]}"
        roster = [
            {"id": "p1", "number": "1", "name": "Player One", "position": "PG"},
            {"id": "p2", "number": "2", "name": "Player Two", "position": "SG"},
            {"id": "p3", "number": "3", "name": "Player Three", "position": "SF"}
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/teams",
            headers=self.headers,
            json={
                "name": team_name,
                "sport": "basketball",
                "color": "#FF6B00",
                "roster": roster
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["name"] == team_name
        assert data["sport"] == "basketball"
        assert len(data["roster"]) == 3
        print(f"✓ Team created with {len(data['roster'])} players: {data['id']}")
        pytest.team_id = data["id"]
    
    def test_create_opponent_team(self):
        """Test creating an opponent team"""
        opponent_name = f"Opponent {uuid.uuid4().hex[:6]}"
        
        response = requests.post(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/teams",
            headers=self.headers,
            json={
                "name": opponent_name,
                "sport": "basketball",
                "color": "#666666",
                "roster": []
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["name"] == opponent_name
        print(f"✓ Opponent team created: {data['id']}")
        pytest.opponent_id = data["id"]
    
    def test_set_season_team(self):
        """Test linking a team to a season"""
        season_id = getattr(pytest, 'season_id', None)
        team_id = getattr(pytest, 'team_id', None)
        
        if not season_id or not team_id:
            pytest.skip("No season or team created in previous tests")
        
        response = requests.put(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/seasons/{season_id}/team",
            headers=self.headers,
            json={"team_id": team_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Team {team_id} linked to season {season_id}")
    
    # ============ GAME SCHEDULING ============
    
    def test_create_game(self):
        """Test scheduling a game"""
        season_id = getattr(pytest, 'season_id', None)
        opponent_id = getattr(pytest, 'opponent_id', None)
        
        if not season_id or not opponent_id:
            pytest.skip("No season or opponent created in previous tests")
        
        response = requests.post(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/seasons/{season_id}/games",
            headers=self.headers,
            json={
                "season_id": season_id,  # Required in body as well
                "opponent_team_id": opponent_id,
                "scheduled_date": "2026-02-15",
                "scheduled_time": "19:00",
                "location": "Home Gym",
                "is_home_game": True,
                "note": "Test game"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "game_id" in data
        assert data["scheduled_date"] == "2026-02-15"
        assert data["status"] == "scheduled"
        print(f"✓ Game scheduled: {data['game_id']}")
        pytest.game_id = data["game_id"]
    
    def test_get_school_games(self):
        """Test getting school games list"""
        response = requests.get(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/games",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Games list returned {len(data)} games")
    
    # ============ INVITE LINK ============
    
    def test_regenerate_invite_code(self):
        """Test regenerating invite code"""
        response = requests.post(
            f"{BASE_URL}/api/schools/{TEST_SCHOOL_ID}/regenerate-invite",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "invite_code" in data
        assert len(data["invite_code"]) > 0
        print(f"✓ New invite code generated: {data['invite_code'][:10]}...")
        pytest.invite_code = data["invite_code"]
    
    def test_get_school_by_invite(self):
        """Test getting school info by invite code"""
        invite_code = getattr(pytest, 'invite_code', None)
        if not invite_code:
            pytest.skip("No invite code from previous test")
        
        response = requests.get(f"{BASE_URL}/api/schools/invite/{invite_code}")
        assert response.status_code == 200
        data = response.json()
        assert data["school_id"] == TEST_SCHOOL_ID
        assert data["name"] == "Moose Academy"
        print(f"✓ School info retrieved by invite code")
    
    # ============ AUTHORIZATION TESTS ============
    
    def test_unauthorized_access_my_school(self):
        """Test that unauthenticated requests are rejected"""
        response = requests.get(f"{BASE_URL}/api/schools/my-school")
        assert response.status_code == 401
        print("✓ Unauthorized access correctly rejected")
    
    def test_invalid_token_rejected(self):
        """Test that invalid tokens are rejected"""
        response = requests.get(
            f"{BASE_URL}/api/schools/my-school",
            headers={"Authorization": "Bearer invalid_token_123"}
        )
        assert response.status_code == 401
        print("✓ Invalid token correctly rejected")


class TestSchoolSignupValidation:
    """Test School Signup Validation"""
    
    def test_register_school_missing_fields(self):
        """Test registration with missing required fields"""
        response = requests.post(
            f"{BASE_URL}/api/schools/register",
            json={
                "school_name": "Test School",
                # Missing other required fields
            }
        )
        assert response.status_code == 422  # Validation error
        print("✓ Missing fields validation works")
    
    def test_register_school_duplicate_name(self):
        """Test registration with duplicate school name"""
        response = requests.post(
            f"{BASE_URL}/api/schools/register",
            json={
                "school_name": "Moose Academy",  # Already exists
                "state": "Texas",
                "user_name": "Test User",
                "user_email": f"test_{uuid.uuid4().hex[:8]}@example.com",
                "password": "testpass123",
                "security_questions": [
                    {"question": "What city were you born in?", "answer": "Test City"},
                    {"question": "What is your favorite movie?", "answer": "Test Movie"}
                ]
            }
        )
        assert response.status_code == 400
        assert "already exists" in response.json().get("detail", "").lower()
        print("✓ Duplicate school name validation works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
