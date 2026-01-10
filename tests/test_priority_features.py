"""
Priority Features Tests - Iteration 23
Tests for:
1. School Creation Beta Mode - admin can toggle beta mode requiring password for new school signups
2. Admin Account Deletion - admin can delete user accounts
3. Roster Duplication - copy roster from previous season to new season
4. GET /api/schools/{school_id}/rosters endpoint

Endpoints tested:
- GET /api/beta-status (public) - includes school_creation_beta
- POST /api/beta-verify (public) - sport="school_creation"
- GET /api/admin/beta-settings (admin only) - includes school_creation_beta/password
- PUT /api/admin/beta-settings (admin only) - includes school_creation_beta/password
- DELETE /api/admin/users/{user_id} (admin only)
- GET /api/schools/{school_id}/rosters (authenticated)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://baseballtracker-1.preview.emergentagent.com')

# Admin credentials
ADMIN_EMAIL = "antlersportsnetwork@gmail.com"
ADMIN_PASSWORD = "NoahTheJew1997"

# School Admin credentials
SCHOOL_ADMIN_EMAIL = "antlermedia2003@gmail.com"
SCHOOL_ADMIN_PASSWORD = "NoahTheJew1997"


class TestSchoolCreationBetaMode:
    """Tests for School Creation Beta Mode feature"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Login as main admin and return session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            # Try with username "admin"
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": "admin", "password": ADMIN_PASSWORD}
            )
        
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
        
        data = response.json()
        token = data.get("session_token")
        if not token:
            pytest.skip("No session token returned from login")
        
        print(f"✓ Admin logged in successfully: {data.get('email')}")
        return token
    
    def test_beta_status_includes_school_creation(self):
        """GET /api/beta-status should include school_creation_beta field"""
        response = requests.get(f"{BASE_URL}/api/beta-status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "school_creation_beta" in data, "Response should contain school_creation_beta"
        assert isinstance(data["school_creation_beta"], bool), "school_creation_beta should be boolean"
        print(f"✓ Beta status includes school_creation_beta: {data['school_creation_beta']}")
    
    def test_admin_beta_settings_includes_school_creation(self, admin_session):
        """GET /api/admin/beta-settings should include school_creation fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/beta-settings",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "school_creation_beta" in data, "Response should contain school_creation_beta"
        assert "school_creation_password" in data, "Response should contain school_creation_password"
        print(f"✓ Admin beta settings includes school_creation fields")
    
    def test_enable_school_creation_beta_mode(self, admin_session):
        """PUT /api/admin/beta-settings to enable school creation beta mode"""
        test_password = "TEST_school_creation_beta_789"
        
        # Get current settings first
        get_response = requests.get(
            f"{BASE_URL}/api/admin/beta-settings",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        current_settings = get_response.json()
        
        # Enable school creation beta mode
        response = requests.put(
            f"{BASE_URL}/api/admin/beta-settings",
            headers={"Authorization": f"Bearer {admin_session}"},
            json={
                "basketball_beta": current_settings.get("basketball_beta", False),
                "basketball_password": current_settings.get("basketball_password", ""),
                "football_beta": current_settings.get("football_beta", False),
                "football_password": current_settings.get("football_password", ""),
                "school_creation_beta": True,
                "school_creation_password": test_password
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ School creation beta mode enabled")
        
        # Verify via GET
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/beta-settings",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        assert verify_response.status_code == 200
        data = verify_response.json()
        assert data["school_creation_beta"] == True, "School creation beta should be enabled"
        assert data["school_creation_password"] == test_password, "School creation password should match"
        print("✓ School creation beta settings persisted correctly")
        
        # Verify public status reflects the change
        status_response = requests.get(f"{BASE_URL}/api/beta-status")
        status = status_response.json()
        assert status["school_creation_beta"] == True, "Public status should show school creation in beta"
        print("✓ Public beta status reflects school creation in beta")
    
    def test_beta_verify_school_creation_correct_password(self, admin_session):
        """POST /api/beta-verify with correct school_creation password should return valid=True"""
        test_password = "TEST_school_creation_beta_789"
        
        # Ensure school creation is in beta mode
        get_response = requests.get(
            f"{BASE_URL}/api/admin/beta-settings",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        current_settings = get_response.json()
        
        requests.put(
            f"{BASE_URL}/api/admin/beta-settings",
            headers={"Authorization": f"Bearer {admin_session}"},
            json={
                "basketball_beta": current_settings.get("basketball_beta", False),
                "basketball_password": current_settings.get("basketball_password", ""),
                "football_beta": current_settings.get("football_beta", False),
                "football_password": current_settings.get("football_password", ""),
                "school_creation_beta": True,
                "school_creation_password": test_password
            }
        )
        
        # Verify with correct password
        response = requests.post(
            f"{BASE_URL}/api/beta-verify",
            json={"sport": "school_creation", "password": test_password}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("valid") == True, "Correct password should return valid=True"
        print("✓ Correct school creation beta password returns valid=True")
    
    def test_beta_verify_school_creation_incorrect_password(self, admin_session):
        """POST /api/beta-verify with incorrect school_creation password should return valid=False"""
        test_password = "TEST_school_creation_beta_789"
        
        # Ensure school creation is in beta mode
        get_response = requests.get(
            f"{BASE_URL}/api/admin/beta-settings",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        current_settings = get_response.json()
        
        requests.put(
            f"{BASE_URL}/api/admin/beta-settings",
            headers={"Authorization": f"Bearer {admin_session}"},
            json={
                "basketball_beta": current_settings.get("basketball_beta", False),
                "basketball_password": current_settings.get("basketball_password", ""),
                "football_beta": current_settings.get("football_beta", False),
                "football_password": current_settings.get("football_password", ""),
                "school_creation_beta": True,
                "school_creation_password": test_password
            }
        )
        
        # Verify with incorrect password
        response = requests.post(
            f"{BASE_URL}/api/beta-verify",
            json={"sport": "school_creation", "password": "wrong_password"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("valid") == False, "Incorrect password should return valid=False"
        print("✓ Incorrect school creation beta password returns valid=False")
    
    def test_disable_school_creation_beta_mode(self, admin_session):
        """PUT /api/admin/beta-settings to disable school creation beta mode"""
        # Get current settings first
        get_response = requests.get(
            f"{BASE_URL}/api/admin/beta-settings",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        current_settings = get_response.json()
        
        response = requests.put(
            f"{BASE_URL}/api/admin/beta-settings",
            headers={"Authorization": f"Bearer {admin_session}"},
            json={
                "basketball_beta": current_settings.get("basketball_beta", False),
                "basketball_password": current_settings.get("basketball_password", ""),
                "football_beta": current_settings.get("football_beta", False),
                "football_password": current_settings.get("football_password", ""),
                "school_creation_beta": False,
                "school_creation_password": ""
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ School creation beta mode disabled")
        
        # Verify via public status
        status_response = requests.get(f"{BASE_URL}/api/beta-status")
        status = status_response.json()
        assert status["school_creation_beta"] == False, "School creation should not be in beta"
        print("✓ Public beta status shows school creation not in beta")


class TestAdminDeleteUser:
    """Tests for Admin Delete User feature"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Login as main admin and return session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            # Try with username "admin"
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": "admin", "password": ADMIN_PASSWORD}
            )
        
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
        
        data = response.json()
        token = data.get("session_token")
        if not token:
            pytest.skip("No session token returned from login")
        
        print(f"✓ Admin logged in successfully: {data.get('email')}")
        return token
    
    def test_delete_user_requires_auth(self):
        """DELETE /api/admin/users/{user_id} without auth should return 401"""
        response = requests.delete(f"{BASE_URL}/api/admin/users/test_user_id")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ DELETE /api/admin/users requires authentication")
    
    def test_delete_nonexistent_user(self, admin_session):
        """DELETE /api/admin/users/{user_id} for nonexistent user should return 404"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/users/nonexistent_user_id_12345",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ DELETE nonexistent user returns 404")
    
    def test_cannot_delete_main_admin(self, admin_session):
        """DELETE /api/admin/users/{user_id} for main admin should return 403"""
        # First get the admin user_id
        users_response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        assert users_response.status_code == 200
        
        users = users_response.json().get("users", [])
        admin_user = next((u for u in users if u.get("email") == "antlersportsnetwork@gmail.com"), None)
        
        if not admin_user:
            pytest.skip("Main admin user not found in users list")
        
        # Try to delete main admin
        response = requests.delete(
            f"{BASE_URL}/api/admin/users/{admin_user['user_id']}",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Cannot delete main admin account (403)")
    
    def test_admin_users_list_endpoint(self, admin_session):
        """GET /api/admin/users should return list of users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "users" in data, "Response should contain users array"
        assert "total" in data, "Response should contain total count"
        assert isinstance(data["users"], list), "users should be a list"
        print(f"✓ Admin users list returned {data['total']} users")


class TestRosterDuplication:
    """Tests for Roster Duplication feature - GET /api/schools/{school_id}/rosters"""
    
    @pytest.fixture(scope="class")
    def school_admin_session(self):
        """Login as school admin and return session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SCHOOL_ADMIN_EMAIL, "password": SCHOOL_ADMIN_PASSWORD}
        )
        
        if response.status_code != 200:
            pytest.skip(f"School admin login failed: {response.status_code} - {response.text}")
        
        data = response.json()
        token = data.get("session_token")
        if not token:
            pytest.skip("No session token returned from login")
        
        print(f"✓ School admin logged in successfully: {data.get('email')}")
        return token
    
    @pytest.fixture(scope="class")
    def school_info(self, school_admin_session):
        """Get school info for the logged in school admin"""
        response = requests.get(
            f"{BASE_URL}/api/schools/my-school",
            headers={"Authorization": f"Bearer {school_admin_session}"}
        )
        
        if response.status_code != 200:
            pytest.skip(f"Failed to get school info: {response.status_code} - {response.text}")
        
        data = response.json()
        print(f"✓ Got school info: {data.get('name')} (ID: {data.get('school_id')})")
        return data
    
    def test_rosters_endpoint_requires_auth(self):
        """GET /api/schools/{school_id}/rosters without auth should return 401"""
        response = requests.get(f"{BASE_URL}/api/schools/test_school_id/rosters")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/schools/{school_id}/rosters requires authentication")
    
    def test_rosters_endpoint_returns_list(self, school_admin_session, school_info):
        """GET /api/schools/{school_id}/rosters should return list of rosters"""
        school_id = school_info.get("school_id")
        
        response = requests.get(
            f"{BASE_URL}/api/schools/{school_id}/rosters",
            headers={"Authorization": f"Bearer {school_admin_session}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Rosters endpoint returned {len(data)} rosters")
        
        # If there are rosters, verify structure
        if len(data) > 0:
            roster = data[0]
            assert "season_id" in roster, "Roster should have season_id"
            assert "season_name" in roster, "Roster should have season_name"
            assert "roster" in roster, "Roster should have roster array"
            assert "player_count" in roster, "Roster should have player_count"
            print(f"✓ First roster: {roster.get('season_name')} with {roster.get('player_count')} players")
    
    def test_rosters_endpoint_unauthorized_school(self, school_admin_session):
        """GET /api/schools/{school_id}/rosters for unauthorized school should return 403"""
        # Try to access a different school's rosters
        response = requests.get(
            f"{BASE_URL}/api/schools/unauthorized_school_id/rosters",
            headers={"Authorization": f"Bearer {school_admin_session}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Cannot access rosters for unauthorized school (403)")


class TestIntegration:
    """Integration tests combining multiple features"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Login as main admin and return session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": "admin", "password": ADMIN_PASSWORD}
            )
        
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
        
        return response.json().get("session_token")
    
    def test_admin_dashboard_data_flow(self, admin_session):
        """Test the data flow for admin dashboard - stats, users, beta settings"""
        # Get admin stats
        stats_response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        assert stats_response.status_code == 200
        stats = stats_response.json()
        assert "total_users" in stats
        print(f"✓ Admin stats: {stats.get('total_users')} users, {stats.get('total_games')} games")
        
        # Get users list
        users_response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        assert users_response.status_code == 200
        users_data = users_response.json()
        assert len(users_data.get("users", [])) == stats.get("total_users")
        print(f"✓ Users list matches stats count")
        
        # Get beta settings
        beta_response = requests.get(
            f"{BASE_URL}/api/admin/beta-settings",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        assert beta_response.status_code == 200
        beta = beta_response.json()
        assert "school_creation_beta" in beta
        print(f"✓ Beta settings retrieved successfully")
        
        # Get schools list
        schools_response = requests.get(
            f"{BASE_URL}/api/admin/schools",
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        assert schools_response.status_code == 200
        schools = schools_response.json()
        assert "schools" in schools
        print(f"✓ Schools list: {len(schools.get('schools', []))} schools")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
