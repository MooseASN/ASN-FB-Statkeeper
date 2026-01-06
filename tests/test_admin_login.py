"""
Test Admin Login Functionality
Tests login with both username and email for admin user
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminLogin:
    """Admin login endpoint tests"""
    
    def test_login_with_email_success(self):
        """Test login with admin email and password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "antlersportsnetwork@gmail.com",
            "password": "NoahTheJew1997"
        })
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "session_token" in data, "Response should contain session_token"
        assert "user_id" in data, "Response should contain user_id"
        assert "email" in data, "Response should contain email"
        assert data["email"] == "antlersportsnetwork@gmail.com", f"Email mismatch: {data['email']}"
        assert isinstance(data["session_token"], str), "session_token should be a string"
        assert len(data["session_token"]) > 0, "session_token should not be empty"
        
        print(f"✓ Login with email successful - user_id: {data['user_id']}")
        return data["session_token"]
    
    def test_login_with_username_success(self):
        """Test login with admin username and password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin",  # Using username in email field
            "password": "NoahTheJew1997"
        })
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "session_token" in data, "Response should contain session_token"
        assert "user_id" in data, "Response should contain user_id"
        assert "username" in data, "Response should contain username"
        assert data["username"] == "admin", f"Username mismatch: {data['username']}"
        assert isinstance(data["session_token"], str), "session_token should be a string"
        assert len(data["session_token"]) > 0, "session_token should not be empty"
        
        print(f"✓ Login with username successful - user_id: {data['user_id']}")
        return data["session_token"]
    
    def test_login_wrong_password(self):
        """Test login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "antlersportsnetwork@gmail.com",
            "password": "wrongpassword123"
        })
        
        # Status code assertion
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        
        # Data assertion - validate error response
        data = response.json()
        assert "detail" in data, "Response should contain error detail"
        
        print(f"✓ Wrong password correctly returns 401 with message: {data['detail']}")
    
    def test_login_nonexistent_user(self):
        """Test login with non-existent user returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "anypassword"
        })
        
        # Status code assertion
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        
        print("✓ Non-existent user correctly returns 401")
    
    def test_session_token_works_for_auth_me(self):
        """Test that session token from login works for /auth/me endpoint"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin",
            "password": "NoahTheJew1997"
        })
        
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        session_token = login_response.json()["session_token"]
        
        # Use session token to get user info
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {session_token}"}
        )
        
        assert me_response.status_code == 200, f"Expected 200, got {me_response.status_code}: {me_response.text}"
        
        data = me_response.json()
        assert "user_id" in data, "Response should contain user_id"
        assert "email" in data, "Response should contain email"
        
        print(f"✓ Session token works for /auth/me - email: {data['email']}")
    
    def test_logout_clears_session(self):
        """Test that logout invalidates the session"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin",
            "password": "NoahTheJew1997"
        })
        
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        session_token = login_response.json()["session_token"]
        
        # Logout
        logout_response = requests.post(
            f"{BASE_URL}/api/auth/logout",
            headers={"Authorization": f"Bearer {session_token}"}
        )
        
        assert logout_response.status_code == 200, f"Logout failed: {logout_response.text}"
        
        # Try to use the old session token - should fail
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {session_token}"}
        )
        
        assert me_response.status_code == 401, f"Expected 401 after logout, got {me_response.status_code}"
        
        print("✓ Logout correctly invalidates session")
    
    def test_admin_check_endpoint(self):
        """Test that admin user is recognized as admin"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin",
            "password": "NoahTheJew1997"
        })
        
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        session_token = login_response.json()["session_token"]
        
        # Check admin status
        admin_response = requests.get(
            f"{BASE_URL}/api/admin/check",
            headers={"Authorization": f"Bearer {session_token}"}
        )
        
        assert admin_response.status_code == 200, f"Admin check failed: {admin_response.text}"
        
        data = admin_response.json()
        assert "is_admin" in data, "Response should contain is_admin"
        assert data["is_admin"] == True, f"Admin user should be recognized as admin, got: {data['is_admin']}"
        
        print("✓ Admin user correctly recognized as admin")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
