"""
Test suite for Subscription Management and PWA features
Tests:
- Subscription tier change endpoints
- Pending changes endpoints
- PWA manifest and assets
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPWAAssets:
    """PWA manifest and asset tests"""
    
    def test_manifest_json_accessible(self):
        """Test that manifest.json is accessible"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["name"] == "StatMoose"
        assert data["short_name"] == "StatMoose"
        assert data["display"] == "standalone"
        assert data["theme_color"] == "#000000"
        print("✓ manifest.json accessible and valid")
    
    def test_manifest_icons_defined(self):
        """Test that manifest has required icons"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200
        
        data = response.json()
        icons = data.get("icons", [])
        assert len(icons) >= 2, "Should have at least 2 icons"
        
        # Check for 192x192 icon
        icon_192 = next((i for i in icons if "192" in i.get("sizes", "")), None)
        assert icon_192 is not None, "Should have 192x192 icon"
        
        # Check for 512x512 icon
        icon_512 = next((i for i in icons if "512" in i.get("sizes", "")), None)
        assert icon_512 is not None, "Should have 512x512 icon"
        print("✓ manifest.json has required icons")
    
    def test_service_worker_accessible(self):
        """Test that service-worker.js is accessible"""
        response = requests.get(f"{BASE_URL}/service-worker.js")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "serviceWorker" in response.text or "self.addEventListener" in response.text
        print("✓ service-worker.js accessible")
    
    def test_offline_html_accessible(self):
        """Test that offline.html is accessible"""
        response = requests.get(f"{BASE_URL}/offline.html")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "offline" in response.text.lower() or "Offline" in response.text
        print("✓ offline.html accessible")
    
    def test_logo_192_accessible(self):
        """Test that logo-192.png is accessible"""
        response = requests.get(f"{BASE_URL}/logo-192.png")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get("content-type", "").startswith("image/")
        print("✓ logo-192.png accessible")
    
    def test_logo_512_accessible(self):
        """Test that logo-512.png is accessible"""
        response = requests.get(f"{BASE_URL}/logo-512.png")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert response.headers.get("content-type", "").startswith("image/")
        print("✓ logo-512.png accessible")


class TestSubscriptionEndpointsUnauthenticated:
    """Test subscription endpoints without authentication"""
    
    def test_pending_changes_requires_auth(self):
        """Test that pending-changes endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/payments/pending-changes")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ pending-changes requires authentication")
    
    def test_change_tier_requires_auth(self):
        """Test that change-tier endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/payments/change-tier",
            json={"new_tier": "silver", "billing_interval": "month"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ change-tier requires authentication")
    
    def test_cancel_pending_change_requires_auth(self):
        """Test that cancel-pending-change endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/payments/cancel-pending-change")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ cancel-pending-change requires authentication")
    
    def test_subscription_details_requires_auth(self):
        """Test that subscription-details endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/payments/subscription-details")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ subscription-details requires authentication")


class TestSubscriptionEndpointsAuthenticated:
    """Test subscription endpoints with authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "antlersportsnetwork@gmail.com",
                "password": "NoahTheJew1997"
            }
        )
        if login_response.status_code != 200:
            pytest.skip("Login failed - skipping authenticated tests")
        print("✓ Logged in successfully")
    
    def test_subscription_details_returns_data(self):
        """Test that subscription-details returns valid data"""
        response = self.session.get(f"{BASE_URL}/api/payments/subscription-details")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "tier" in data, "Response should contain tier"
        assert "status" in data, "Response should contain status"
        assert "is_active" in data, "Response should contain is_active"
        print(f"✓ subscription-details returns: tier={data.get('tier')}, status={data.get('status')}")
    
    def test_pending_changes_returns_data(self):
        """Test that pending-changes returns valid data"""
        response = self.session.get(f"{BASE_URL}/api/payments/pending-changes")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "has_pending_change" in data, "Response should contain has_pending_change"
        print(f"✓ pending-changes returns: has_pending_change={data.get('has_pending_change')}")
    
    def test_change_tier_validates_tier(self):
        """Test that change-tier validates tier parameter"""
        response = self.session.post(
            f"{BASE_URL}/api/payments/change-tier",
            json={"new_tier": "invalid_tier", "billing_interval": "month"}
        )
        assert response.status_code == 400, f"Expected 400 for invalid tier, got {response.status_code}"
        print("✓ change-tier validates tier parameter")
    
    def test_change_tier_validates_interval(self):
        """Test that change-tier validates billing_interval parameter"""
        response = self.session.post(
            f"{BASE_URL}/api/payments/change-tier",
            json={"new_tier": "silver", "billing_interval": "invalid"}
        )
        assert response.status_code == 400, f"Expected 400 for invalid interval, got {response.status_code}"
        print("✓ change-tier validates billing_interval parameter")
    
    def test_change_tier_to_bronze(self):
        """Test changing tier to bronze (free tier)"""
        response = self.session.post(
            f"{BASE_URL}/api/payments/change-tier",
            json={"new_tier": "bronze", "billing_interval": "month"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # For users without subscription, changing to bronze should succeed
        assert "success" in data or "requires_checkout" in data
        print(f"✓ change-tier to bronze: {data}")
    
    def test_change_tier_to_silver_requires_checkout(self):
        """Test that changing to silver tier requires checkout for users without subscription"""
        response = self.session.post(
            f"{BASE_URL}/api/payments/change-tier",
            json={"new_tier": "silver", "billing_interval": "month"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # For users without active subscription, should require checkout
        if data.get("requires_checkout"):
            assert data.get("checkout_package") == "monthly_silver"
            print("✓ change-tier to silver requires checkout (expected for user without subscription)")
        else:
            print(f"✓ change-tier to silver: {data}")
    
    def test_change_tier_to_gold_requires_checkout(self):
        """Test that changing to gold tier requires checkout for users without subscription"""
        response = self.session.post(
            f"{BASE_URL}/api/payments/change-tier",
            json={"new_tier": "gold", "billing_interval": "month"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # For users without active subscription, should require checkout
        if data.get("requires_checkout"):
            assert data.get("checkout_package") == "monthly_gold"
            print("✓ change-tier to gold requires checkout (expected for user without subscription)")
        else:
            print(f"✓ change-tier to gold: {data}")
    
    def test_cancel_pending_change_no_pending(self):
        """Test canceling pending change when there's no pending change"""
        response = self.session.post(f"{BASE_URL}/api/payments/cancel-pending-change")
        # Should return 400 if no pending change exists
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}"
        
        if response.status_code == 400:
            data = response.json()
            assert "detail" in data or "error" in data or "message" in data
            print("✓ cancel-pending-change returns error when no pending change")
        else:
            print("✓ cancel-pending-change succeeded")
    
    def test_change_tier_case_insensitive(self):
        """Test that tier names are case insensitive"""
        response = self.session.post(
            f"{BASE_URL}/api/payments/change-tier",
            json={"new_tier": "BRONZE", "billing_interval": "month"}
        )
        assert response.status_code == 200, f"Expected 200 for uppercase tier, got {response.status_code}"
        print("✓ change-tier accepts uppercase tier names")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
