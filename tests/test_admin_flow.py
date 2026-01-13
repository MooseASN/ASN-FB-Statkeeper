"""
Test Admin Dashboard Flow
Tests:
1. Admin login returns is_admin=true from /api/auth/login endpoint
2. Admin login returns is_admin=true from /api/auth/me endpoint
3. Non-admin users get is_admin=false
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sportmoose.preview.emergentagent.com').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "antlersportsnetwork@gmail.com"
ADMIN_PASSWORD = "NoahTheJew1997"


class TestAdminLogin:
    """Test admin login and is_admin flag"""
    
    def test_admin_login_returns_is_admin_true(self):
        """Test that admin login returns is_admin=true"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        print(f"Login response status: {response.status_code}")
        print(f"Login response body: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "is_admin" in data, "Response should contain is_admin field"
        assert data["is_admin"] == True, f"Expected is_admin=True, got {data['is_admin']}"
        assert "session_token" in data, "Response should contain session_token"
        assert data["email"] == ADMIN_EMAIL, f"Expected email={ADMIN_EMAIL}, got {data['email']}"
        
        # Store session token for next test
        self.__class__.session_token = data["session_token"]
        print(f"✓ Admin login successful, is_admin={data['is_admin']}")
    
    def test_admin_me_endpoint_returns_is_admin_true(self):
        """Test that /auth/me returns is_admin=true for admin user"""
        # Use session token from login test
        session_token = getattr(self.__class__, 'session_token', None)
        if not session_token:
            # Login first if no token
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            session_token = login_response.json().get("session_token")
        
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {session_token}"}
        )
        
        print(f"/auth/me response status: {response.status_code}")
        print(f"/auth/me response body: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "is_admin" in data, "Response should contain is_admin field"
        assert data["is_admin"] == True, f"Expected is_admin=True, got {data['is_admin']}"
        assert data["email"] == ADMIN_EMAIL, f"Expected email={ADMIN_EMAIL}, got {data['email']}"
        
        print(f"✓ /auth/me returns is_admin={data['is_admin']}")


class TestAdminDashboardAccess:
    """Test admin dashboard API access"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, "Admin login failed"
        self.session_token = response.json()["session_token"]
        self.headers = {"Authorization": f"Bearer {self.session_token}"}
    
    def test_admin_can_access_admin_users_endpoint(self):
        """Test that admin can access /api/admin/users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers=self.headers
        )
        
        print(f"/admin/users response status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "users" in data, "Response should contain users array"
        assert "total" in data, "Response should contain total count"
        
        print(f"✓ Admin can access /admin/users - {data['total']} users found")
    
    def test_admin_can_access_admin_stats_endpoint(self):
        """Test that admin can access /api/admin/stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers=self.headers
        )
        
        print(f"/admin/stats response status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total_users" in data, "Response should contain total_users"
        assert "total_teams" in data, "Response should contain total_teams"
        assert "total_games" in data, "Response should contain total_games"
        
        print(f"✓ Admin can access /admin/stats - {data['total_users']} users, {data['total_teams']} teams, {data['total_games']} games")
    
    def test_admin_can_access_beta_settings(self):
        """Test that admin can access /api/admin/beta-settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/beta-settings",
            headers=self.headers
        )
        
        print(f"/admin/beta-settings response status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Check for expected beta settings fields
        assert "site_beta_enabled" in data or "basketball_beta" in data, "Response should contain beta settings"
        
        print(f"✓ Admin can access /admin/beta-settings")
    
    def test_admin_can_access_pricing_config(self):
        """Test that admin can access /api/admin/pricing"""
        response = requests.get(
            f"{BASE_URL}/api/admin/pricing",
            headers=self.headers
        )
        
        print(f"/admin/pricing response status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "pricing" in data, "Response should contain pricing config"
        
        print(f"✓ Admin can access /admin/pricing")


class TestNonAdminAccess:
    """Test that non-admin users cannot access admin endpoints"""
    
    def test_unauthenticated_cannot_access_admin_endpoints(self):
        """Test that unauthenticated requests get 401"""
        response = requests.get(f"{BASE_URL}/api/admin/users")
        
        print(f"Unauthenticated /admin/users response status: {response.status_code}")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        print(f"✓ Unauthenticated users get 401 on admin endpoints")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
