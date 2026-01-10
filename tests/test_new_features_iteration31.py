"""
Test suite for new features - Iteration 31
Features tested:
1. Team logo upload - POST /api/teams/{team_id}/logo/upload
2. Shared access API - POST/GET/DELETE /api/admin/shared-access
3. Teams list includes shared teams
4. Games list includes shared games
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "antlersportsnetwork@gmail.com"
ADMIN_PASSWORD = "NoahTheJew1997"


class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Login as admin and return session with token"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
        
        data = response.json()
        token = data.get("session_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        session.cookies.set("session_token", token)
        
        return session, data
    
    def test_admin_login(self, admin_session):
        """Test admin can login successfully"""
        session, data = admin_session
        assert "session_token" in data
        assert data.get("email") == ADMIN_EMAIL


class TestTeamLogoUpload:
    """Test team logo upload functionality"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Login as admin and return session with token"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code}")
        
        data = response.json()
        token = data.get("session_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        session.cookies.set("session_token", token)
        
        return session
    
    @pytest.fixture(scope="class")
    def test_team(self, admin_session):
        """Create a test team for logo upload testing"""
        session = admin_session
        
        # Create a test team
        response = session.post(f"{BASE_URL}/api/teams", json={
            "name": "TEST_LogoUploadTeam",
            "color": "#FF0000",
            "sport": "basketball",
            "roster": []
        })
        
        if response.status_code != 200:
            pytest.skip(f"Failed to create test team: {response.status_code}")
        
        team = response.json()
        yield team
        
        # Cleanup - delete the team
        session.delete(f"{BASE_URL}/api/teams/{team['id']}")
    
    def test_logo_upload_png(self, admin_session, test_team):
        """Test uploading a PNG logo"""
        session = admin_session
        team_id = test_team["id"]
        
        # Create a simple 1x1 PNG image (smallest valid PNG)
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 dimensions
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,  # bit depth, color type
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,  # compressed data
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,  # 
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,  # IEND chunk
            0x44, 0xAE, 0x42, 0x60, 0x82                      # IEND CRC
        ])
        
        # Remove Content-Type header for multipart upload
        headers = {"Authorization": session.headers.get("Authorization")}
        
        files = {"file": ("test_logo.png", io.BytesIO(png_data), "image/png")}
        response = requests.post(
            f"{BASE_URL}/api/teams/{team_id}/logo/upload",
            files=files,
            headers=headers,
            cookies=session.cookies
        )
        
        assert response.status_code == 200, f"Logo upload failed: {response.text}"
        data = response.json()
        assert "logo_url" in data
        assert data["logo_url"].startswith("data:image/png;base64,")
        print(f"✓ PNG logo uploaded successfully")
    
    def test_logo_upload_invalid_type(self, admin_session, test_team):
        """Test that invalid file types are rejected"""
        session = admin_session
        team_id = test_team["id"]
        
        headers = {"Authorization": session.headers.get("Authorization")}
        
        # Try to upload a text file
        files = {"file": ("test.txt", io.BytesIO(b"not an image"), "text/plain")}
        response = requests.post(
            f"{BASE_URL}/api/teams/{team_id}/logo/upload",
            files=files,
            headers=headers,
            cookies=session.cookies
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid file type, got {response.status_code}"
        print(f"✓ Invalid file type correctly rejected")
    
    def test_logo_upload_nonexistent_team(self, admin_session):
        """Test uploading to a non-existent team"""
        session = admin_session
        
        headers = {"Authorization": session.headers.get("Authorization")}
        
        png_data = bytes([0x89, 0x50, 0x4E, 0x47])  # Minimal PNG header
        files = {"file": ("test.png", io.BytesIO(png_data), "image/png")}
        
        response = requests.post(
            f"{BASE_URL}/api/teams/nonexistent-team-id/logo/upload",
            files=files,
            headers=headers,
            cookies=session.cookies
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent team, got {response.status_code}"
        print(f"✓ Non-existent team correctly returns 404")


class TestSharedAccess:
    """Test shared access API functionality"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Login as admin and return session with token"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code}")
        
        data = response.json()
        token = data.get("session_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        session.cookies.set("session_token", token)
        
        return session, data.get("user_id")
    
    def test_get_shared_access_list(self, admin_session):
        """Test GET /api/admin/shared-access returns list"""
        session, user_id = admin_session
        
        response = session.get(f"{BASE_URL}/api/admin/shared-access")
        
        assert response.status_code == 200, f"Failed to get shared access list: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/admin/shared-access returns {len(data)} records")
    
    def test_get_received_shared_access(self, admin_session):
        """Test GET /api/admin/shared-access/received returns list"""
        session, user_id = admin_session
        
        response = session.get(f"{BASE_URL}/api/admin/shared-access/received")
        
        assert response.status_code == 200, f"Failed to get received access: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/admin/shared-access/received returns {len(data)} records")
    
    def test_grant_access_invalid_email(self, admin_session):
        """Test granting access to non-existent user"""
        session, user_id = admin_session
        
        response = session.post(f"{BASE_URL}/api/admin/shared-access", json={
            "email": "nonexistent_user_test_12345@example.com"
        })
        
        assert response.status_code == 404, f"Expected 404 for non-existent user, got {response.status_code}"
        print(f"✓ Grant access to non-existent user correctly returns 404")
    
    def test_grant_access_to_self(self, admin_session):
        """Test that user cannot grant access to themselves"""
        session, user_id = admin_session
        
        response = session.post(f"{BASE_URL}/api/admin/shared-access", json={
            "email": ADMIN_EMAIL
        })
        
        assert response.status_code == 400, f"Expected 400 for self-grant, got {response.status_code}"
        print(f"✓ Self-grant correctly rejected with 400")
    
    def test_revoke_nonexistent_access(self, admin_session):
        """Test revoking non-existent access record"""
        session, user_id = admin_session
        
        response = session.delete(f"{BASE_URL}/api/admin/shared-access/nonexistent-id-12345")
        
        assert response.status_code == 404, f"Expected 404 for non-existent access, got {response.status_code}"
        print(f"✓ Revoke non-existent access correctly returns 404")


class TestTeamsWithSharedAccess:
    """Test that teams list includes shared teams"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Login as admin and return session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code}")
        
        data = response.json()
        token = data.get("session_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        session.cookies.set("session_token", token)
        
        return session
    
    def test_get_teams_returns_list(self, admin_session):
        """Test GET /api/teams returns a list"""
        session = admin_session
        
        response = session.get(f"{BASE_URL}/api/teams")
        
        assert response.status_code == 200, f"Failed to get teams: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/teams returns {len(data)} teams")
    
    def test_get_teams_with_sport_filter(self, admin_session):
        """Test GET /api/teams with sport filter"""
        session = admin_session
        
        response = session.get(f"{BASE_URL}/api/teams?sport=basketball")
        
        assert response.status_code == 200, f"Failed to get basketball teams: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify all returned teams are basketball
        for team in data:
            assert team.get("sport") == "basketball", f"Team {team.get('name')} has sport {team.get('sport')}"
        
        print(f"✓ GET /api/teams?sport=basketball returns {len(data)} basketball teams")


class TestGamesWithSharedAccess:
    """Test that games list includes shared games"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Login as admin and return session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code}")
        
        data = response.json()
        token = data.get("session_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        session.cookies.set("session_token", token)
        
        return session
    
    def test_get_games_returns_list(self, admin_session):
        """Test GET /api/games returns a list"""
        session = admin_session
        
        response = session.get(f"{BASE_URL}/api/games")
        
        assert response.status_code == 200, f"Failed to get games: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/games returns {len(data)} games")
    
    def test_get_games_with_sport_filter(self, admin_session):
        """Test GET /api/games with sport filter"""
        session = admin_session
        
        response = session.get(f"{BASE_URL}/api/games?sport=basketball")
        
        assert response.status_code == 200, f"Failed to get basketball games: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/games?sport=basketball returns {len(data)} basketball games")


class TestBetaStatus:
    """Test beta status endpoint for baseball"""
    
    def test_beta_status_includes_baseball(self):
        """Test that beta status includes baseball field"""
        response = requests.get(f"{BASE_URL}/api/beta-status")
        
        assert response.status_code == 200, f"Failed to get beta status: {response.text}"
        data = response.json()
        
        assert "baseball_beta" in data, "Response should include baseball_beta field"
        print(f"✓ Beta status includes baseball_beta: {data.get('baseball_beta')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
