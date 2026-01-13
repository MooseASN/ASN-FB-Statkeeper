"""
Test subscription tier change endpoints:
- POST /api/payments/change-tier
- GET /api/payments/pending-changes
- POST /api/payments/cancel-pending-change

These endpoints handle subscription upgrades/downgrades with changes taking effect
at the end of the billing cycle (no proration).
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "antlersportsnetwork@gmail.com"
ADMIN_PASSWORD = "NoahTheJew1997"


class TestSubscriptionTierChange:
    """Test subscription tier change endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get session token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.session_token = data.get("session_token")
            self.session.headers.update({
                "Authorization": f"Bearer {self.session_token}"
            })
            self.user_id = data.get("user_id")
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_change_tier_endpoint_exists(self):
        """Test that POST /api/payments/change-tier endpoint exists and responds"""
        response = self.session.post(
            f"{BASE_URL}/api/payments/change-tier",
            json={"new_tier": "silver", "billing_interval": "month"}
        )
        
        # Should not return 404 (endpoint exists)
        assert response.status_code != 404, "change-tier endpoint should exist"
        print(f"change-tier response status: {response.status_code}")
        print(f"change-tier response: {response.json()}")
    
    def test_change_tier_invalid_tier(self):
        """Test change-tier with invalid tier returns 400"""
        response = self.session.post(
            f"{BASE_URL}/api/payments/change-tier",
            json={"new_tier": "platinum", "billing_interval": "month"}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid tier, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"Invalid tier error: {data['detail']}")
    
    def test_change_tier_invalid_billing_interval(self):
        """Test change-tier with invalid billing interval returns 400"""
        response = self.session.post(
            f"{BASE_URL}/api/payments/change-tier",
            json={"new_tier": "silver", "billing_interval": "weekly"}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid interval, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"Invalid interval error: {data['detail']}")
    
    def test_change_tier_to_bronze_no_subscription(self):
        """Test changing to bronze tier when user has no active subscription"""
        response = self.session.post(
            f"{BASE_URL}/api/payments/change-tier",
            json={"new_tier": "bronze", "billing_interval": "month"}
        )
        
        # Should succeed - bronze is free tier
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("success") == True
        print(f"Bronze tier change response: {data}")
    
    def test_change_tier_requires_checkout_no_subscription(self):
        """Test that changing to paid tier without subscription returns requires_checkout"""
        response = self.session.post(
            f"{BASE_URL}/api/payments/change-tier",
            json={"new_tier": "silver", "billing_interval": "month"}
        )
        
        # User doesn't have Stripe subscription, should return requires_checkout
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should indicate checkout is required
        assert data.get("requires_checkout") == True, f"Expected requires_checkout=True, got {data}"
        print(f"Requires checkout response: {data}")
    
    def test_change_tier_gold_requires_checkout(self):
        """Test that changing to gold tier without subscription returns requires_checkout"""
        response = self.session.post(
            f"{BASE_URL}/api/payments/change-tier",
            json={"new_tier": "gold", "billing_interval": "month"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should indicate checkout is required
        assert data.get("requires_checkout") == True, f"Expected requires_checkout=True, got {data}"
        print(f"Gold tier requires checkout: {data}")
    
    def test_change_tier_annual_billing(self):
        """Test change-tier with annual billing interval"""
        response = self.session.post(
            f"{BASE_URL}/api/payments/change-tier",
            json={"new_tier": "silver", "billing_interval": "year"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should indicate checkout is required for annual plan
        if data.get("requires_checkout"):
            assert data.get("checkout_package") == "annual_silver"
        print(f"Annual billing response: {data}")
    
    def test_pending_changes_endpoint_exists(self):
        """Test that GET /api/payments/pending-changes endpoint exists"""
        response = self.session.get(f"{BASE_URL}/api/payments/pending-changes")
        
        # Should not return 404
        assert response.status_code != 404, "pending-changes endpoint should exist"
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "has_pending_change" in data
        print(f"Pending changes response: {data}")
    
    def test_pending_changes_returns_correct_structure(self):
        """Test pending-changes returns correct response structure"""
        response = self.session.get(f"{BASE_URL}/api/payments/pending-changes")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have has_pending_change field
        assert "has_pending_change" in data
        
        # If there's a pending change, should have additional fields
        if data.get("has_pending_change"):
            assert "current_tier" in data
            assert "pending_tier" in data
            assert "effective_date" in data
        
        print(f"Pending changes structure: {data}")
    
    def test_cancel_pending_change_endpoint_exists(self):
        """Test that POST /api/payments/cancel-pending-change endpoint exists"""
        response = self.session.post(f"{BASE_URL}/api/payments/cancel-pending-change")
        
        # Should not return 404
        assert response.status_code != 404, "cancel-pending-change endpoint should exist"
        
        # If no pending change, should return 400
        if response.status_code == 400:
            data = response.json()
            assert "detail" in data
            print(f"No pending change to cancel: {data['detail']}")
        else:
            print(f"Cancel pending change response: {response.status_code}")
    
    def test_cancel_pending_change_no_pending(self):
        """Test cancel-pending-change when there's no pending change"""
        response = self.session.post(f"{BASE_URL}/api/payments/cancel-pending-change")
        
        # Should return 400 if no pending change
        assert response.status_code == 400, f"Expected 400 when no pending change, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"No pending change error: {data['detail']}")
    
    def test_change_tier_unauthenticated(self):
        """Test change-tier without authentication returns 401"""
        # Create new session without auth
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        response = unauth_session.post(
            f"{BASE_URL}/api/payments/change-tier",
            json={"new_tier": "silver", "billing_interval": "month"}
        )
        
        assert response.status_code == 401, f"Expected 401 for unauthenticated, got {response.status_code}"
        print(f"Unauthenticated response: {response.status_code}")
    
    def test_pending_changes_unauthenticated(self):
        """Test pending-changes without authentication returns 401"""
        unauth_session = requests.Session()
        
        response = unauth_session.get(f"{BASE_URL}/api/payments/pending-changes")
        
        assert response.status_code == 401, f"Expected 401 for unauthenticated, got {response.status_code}"
        print(f"Unauthenticated pending-changes: {response.status_code}")
    
    def test_cancel_pending_change_unauthenticated(self):
        """Test cancel-pending-change without authentication returns 401"""
        unauth_session = requests.Session()
        
        response = unauth_session.post(f"{BASE_URL}/api/payments/cancel-pending-change")
        
        assert response.status_code == 401, f"Expected 401 for unauthenticated, got {response.status_code}"
        print(f"Unauthenticated cancel-pending-change: {response.status_code}")


class TestSubscriptionTierValidation:
    """Test tier validation logic"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.session_token = data.get("session_token")
            self.session.headers.update({
                "Authorization": f"Bearer {self.session_token}"
            })
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_valid_tiers(self):
        """Test all valid tier values"""
        valid_tiers = ["bronze", "silver", "gold"]
        
        for tier in valid_tiers:
            response = self.session.post(
                f"{BASE_URL}/api/payments/change-tier",
                json={"new_tier": tier, "billing_interval": "month"}
            )
            
            # Should not return 400 for invalid tier
            if response.status_code == 400:
                data = response.json()
                assert "Invalid tier" not in data.get("detail", ""), f"Tier {tier} should be valid"
            
            print(f"Tier {tier}: status {response.status_code}")
    
    def test_valid_billing_intervals(self):
        """Test all valid billing interval values"""
        valid_intervals = ["month", "year"]
        
        for interval in valid_intervals:
            response = self.session.post(
                f"{BASE_URL}/api/payments/change-tier",
                json={"new_tier": "silver", "billing_interval": interval}
            )
            
            # Should not return 400 for invalid interval
            if response.status_code == 400:
                data = response.json()
                assert "Invalid billing interval" not in data.get("detail", ""), f"Interval {interval} should be valid"
            
            print(f"Interval {interval}: status {response.status_code}")
    
    def test_case_insensitive_tier(self):
        """Test that tier is case-insensitive"""
        response = self.session.post(
            f"{BASE_URL}/api/payments/change-tier",
            json={"new_tier": "SILVER", "billing_interval": "month"}
        )
        
        # Should not return 400 for invalid tier (case should be normalized)
        if response.status_code == 400:
            data = response.json()
            assert "Invalid tier" not in data.get("detail", ""), "Tier should be case-insensitive"
        
        print(f"Case insensitive tier: status {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
