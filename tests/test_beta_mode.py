"""
Test Site-Wide Beta Mode Feature
Tests the beta mode endpoints and access control
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sportspro-dash.preview.emergentagent.com').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "antlersportsnetwork@gmail.com"
ADMIN_PASSWORD = "NoahTheJew1997"


class TestBetaModeEndpoints:
    """Test beta mode API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Login as admin and get session token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        token = data.get("session_token")
        assert token, "No session token returned"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        return token
    
    def test_site_beta_status_public(self):
        """Test GET /site-beta-status - public endpoint, no auth required"""
        response = self.session.get(f"{BASE_URL}/api/site-beta-status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Should return site_beta_enabled and site_beta_message
        assert "site_beta_enabled" in data, "Missing site_beta_enabled field"
        assert "site_beta_message" in data, "Missing site_beta_message field"
        print(f"Site beta status: enabled={data['site_beta_enabled']}, message={data['site_beta_message'][:50]}...")
    
    def test_check_beta_access_requires_auth(self):
        """Test GET /check-beta-access - requires authentication"""
        # Without auth, should return 401
        response = requests.get(f"{BASE_URL}/api/check-beta-access")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
    
    def test_check_beta_access_admin(self):
        """Test GET /check-beta-access - admin always has access"""
        self.get_admin_token()
        response = self.session.get(f"{BASE_URL}/api/check-beta-access")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "has_access" in data, "Missing has_access field"
        # Admin should always have access
        assert data["has_access"] == True, "Admin should always have beta access"
        assert data.get("reason") in ["admin", "beta_not_enabled", "whitelisted"], f"Unexpected reason: {data.get('reason')}"
        print(f"Admin beta access: has_access={data['has_access']}, reason={data.get('reason')}")
    
    def test_get_beta_settings_admin_only(self):
        """Test GET /admin/beta-settings - admin only"""
        # Without auth, should return 401
        response = requests.get(f"{BASE_URL}/api/admin/beta-settings")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        
        # With admin auth
        self.get_admin_token()
        response = self.session.get(f"{BASE_URL}/api/admin/beta-settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify all expected fields
        expected_fields = [
            "site_beta_enabled", "site_beta_message", "allowed_emails",
            "basketball_beta", "basketball_password",
            "football_beta", "football_password",
            "baseball_beta", "baseball_password",
            "school_creation_beta", "school_creation_password"
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"Beta settings: site_beta_enabled={data['site_beta_enabled']}, allowed_emails count={len(data.get('allowed_emails', []))}")
    
    def test_update_beta_settings_admin_only(self):
        """Test PUT /admin/beta-settings - admin only"""
        # Without auth, should return 401
        response = requests.put(f"{BASE_URL}/api/admin/beta-settings", json={
            "site_beta_enabled": False
        })
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        
        # With admin auth - get current settings first
        self.get_admin_token()
        current_response = self.session.get(f"{BASE_URL}/api/admin/beta-settings")
        current_settings = current_response.json()
        
        # Update with same settings (to not break anything)
        response = self.session.put(f"{BASE_URL}/api/admin/beta-settings", json=current_settings)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "message" in data, "Missing message in response"
        assert data["message"] == "Beta settings updated", f"Unexpected message: {data['message']}"
        print(f"Beta settings update: {data['message']}")
    
    def test_enable_site_beta_and_add_email(self):
        """Test enabling site beta and adding an email to whitelist"""
        self.get_admin_token()
        
        # Get current settings
        current_response = self.session.get(f"{BASE_URL}/api/admin/beta-settings")
        current_settings = current_response.json()
        
        # Enable site beta and add a test email
        test_email = "test_beta_user@example.com"
        new_settings = {
            **current_settings,
            "site_beta_enabled": True,
            "site_beta_message": "Test beta message for testing",
            "allowed_emails": list(set(current_settings.get("allowed_emails", []) + [test_email]))
        }
        
        response = self.session.put(f"{BASE_URL}/api/admin/beta-settings", json=new_settings)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify the settings were saved
        verify_response = self.session.get(f"{BASE_URL}/api/admin/beta-settings")
        verify_data = verify_response.json()
        assert verify_data["site_beta_enabled"] == True, "Site beta should be enabled"
        assert test_email in verify_data["allowed_emails"], "Test email should be in allowed list"
        print(f"Site beta enabled with {len(verify_data['allowed_emails'])} allowed emails")
        
        # Clean up - remove test email
        cleanup_settings = {
            **verify_data,
            "allowed_emails": [e for e in verify_data["allowed_emails"] if e != test_email]
        }
        self.session.put(f"{BASE_URL}/api/admin/beta-settings", json=cleanup_settings)
    
    def test_remove_email_from_whitelist(self):
        """Test removing an email from the whitelist"""
        self.get_admin_token()
        
        # Get current settings
        current_response = self.session.get(f"{BASE_URL}/api/admin/beta-settings")
        current_settings = current_response.json()
        
        # Add a test email first
        test_email = "remove_test@example.com"
        add_settings = {
            **current_settings,
            "allowed_emails": list(set(current_settings.get("allowed_emails", []) + [test_email]))
        }
        self.session.put(f"{BASE_URL}/api/admin/beta-settings", json=add_settings)
        
        # Verify it was added
        verify_add = self.session.get(f"{BASE_URL}/api/admin/beta-settings")
        assert test_email in verify_add.json()["allowed_emails"], "Test email should be added"
        
        # Now remove it
        remove_settings = {
            **verify_add.json(),
            "allowed_emails": [e for e in verify_add.json()["allowed_emails"] if e != test_email]
        }
        response = self.session.put(f"{BASE_URL}/api/admin/beta-settings", json=remove_settings)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify it was removed
        verify_remove = self.session.get(f"{BASE_URL}/api/admin/beta-settings")
        assert test_email not in verify_remove.json()["allowed_emails"], "Test email should be removed"
        print("Email successfully added and removed from whitelist")
    
    def test_beta_status_public_endpoint(self):
        """Test GET /beta-status - public endpoint for sport-specific beta"""
        response = self.session.get(f"{BASE_URL}/api/beta-status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should return sport-specific beta flags
        expected_fields = ["basketball_beta", "football_beta", "baseball_beta", "school_creation_beta"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        print(f"Sport beta status: basketball={data['basketball_beta']}, football={data['football_beta']}, baseball={data['baseball_beta']}")


class TestBetaModeIntegration:
    """Integration tests for beta mode flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_admin_token(self):
        """Login as admin and get session token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        token = data.get("session_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        return token
    
    def test_full_beta_mode_flow(self):
        """Test complete beta mode enable/disable flow"""
        self.get_admin_token()
        
        # 1. Get initial settings
        initial_response = self.session.get(f"{BASE_URL}/api/admin/beta-settings")
        initial_settings = initial_response.json()
        initial_beta_enabled = initial_settings.get("site_beta_enabled", False)
        print(f"Initial site_beta_enabled: {initial_beta_enabled}")
        
        # 2. Enable beta mode
        enable_settings = {
            **initial_settings,
            "site_beta_enabled": True,
            "site_beta_message": "Integration test - beta mode enabled"
        }
        enable_response = self.session.put(f"{BASE_URL}/api/admin/beta-settings", json=enable_settings)
        assert enable_response.status_code == 200
        
        # 3. Verify public endpoint shows beta enabled
        public_response = self.session.get(f"{BASE_URL}/api/site-beta-status")
        public_data = public_response.json()
        assert public_data["site_beta_enabled"] == True, "Public endpoint should show beta enabled"
        
        # 4. Admin should still have access
        access_response = self.session.get(f"{BASE_URL}/api/check-beta-access")
        access_data = access_response.json()
        assert access_data["has_access"] == True, "Admin should have access even with beta enabled"
        
        # 5. Restore original settings
        restore_settings = {
            **initial_settings,
            "site_beta_enabled": initial_beta_enabled
        }
        self.session.put(f"{BASE_URL}/api/admin/beta-settings", json=restore_settings)
        print("Full beta mode flow test completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
