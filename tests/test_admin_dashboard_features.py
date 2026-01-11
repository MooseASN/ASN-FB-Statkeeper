"""
Test Admin Dashboard Features - RBAC, User Management, Pricing Management
Tests for:
- /api/admin/users - returns effective_role, subscription_tier, subscription_status
- /api/admin/users/{user_id}/role - grant/revoke admin access
- /api/admin/pricing - GET/PUT pricing configuration
- Primary admin protection
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "antlersportsnetwork@gmail.com"
ADMIN_PASSWORD = "NoahTheJew1997"

# Primary admin emails that should be protected
PRIMARY_ADMIN_EMAILS = ["antlersportsnetwork@gmail.com", "jared@antlersn.com"]


class TestAdminUsersEndpoint:
    """Test /api/admin/users endpoint returns correct fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.session_token = response.json()["session_token"]
        self.headers = {"Authorization": f"Bearer {self.session_token}"}
    
    def test_admin_users_returns_200(self):
        """Test that /api/admin/users returns 200 for admin"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_admin_users_returns_users_list(self):
        """Test that response contains users list"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        data = response.json()
        
        assert "users" in data, "Response should contain 'users' key"
        assert "total" in data, "Response should contain 'total' key"
        assert isinstance(data["users"], list), "users should be a list"
        
    def test_admin_users_contains_effective_role(self):
        """Test that each user has effective_role field"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        data = response.json()
        
        assert len(data["users"]) > 0, "Should have at least one user"
        
        for user in data["users"]:
            assert "effective_role" in user, f"User {user.get('email')} missing effective_role"
            assert user["effective_role"] in ["primary_admin", "admin", "user"], \
                f"Invalid effective_role: {user['effective_role']}"
                
    def test_admin_users_contains_subscription_tier(self):
        """Test that each user has subscription_tier field"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        data = response.json()
        
        for user in data["users"]:
            assert "subscription_tier" in user, f"User {user.get('email')} missing subscription_tier"
            assert user["subscription_tier"] in ["bronze", "silver", "gold"], \
                f"Invalid subscription_tier: {user['subscription_tier']}"
                
    def test_admin_users_contains_subscription_status(self):
        """Test that each user has subscription_status field"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        data = response.json()
        
        for user in data["users"]:
            assert "subscription_status" in user, f"User {user.get('email')} missing subscription_status"
            
    def test_primary_admin_has_correct_role(self):
        """Test that primary admin email shows as primary_admin role"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        data = response.json()
        
        # Find the primary admin user
        primary_admin = None
        for user in data["users"]:
            if user.get("email", "").lower() == ADMIN_EMAIL.lower():
                primary_admin = user
                break
        
        assert primary_admin is not None, f"Primary admin {ADMIN_EMAIL} not found in users list"
        assert primary_admin["effective_role"] == "primary_admin", \
            f"Primary admin should have effective_role='primary_admin', got: {primary_admin['effective_role']}"
        
        print(f"✓ Primary admin {ADMIN_EMAIL} correctly shows as 'primary_admin'")


class TestAdminPricingEndpoint:
    """Test /api/admin/pricing GET and PUT endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.session_token = response.json()["session_token"]
        self.headers = {"Authorization": f"Bearer {self.session_token}"}
    
    def test_get_pricing_returns_200(self):
        """Test that GET /api/admin/pricing returns 200"""
        response = requests.get(f"{BASE_URL}/api/admin/pricing", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_get_pricing_returns_all_tiers(self):
        """Test that pricing config contains bronze, silver, gold tiers"""
        response = requests.get(f"{BASE_URL}/api/admin/pricing", headers=self.headers)
        data = response.json()
        
        assert "pricing" in data, "Response should contain 'pricing' key"
        pricing = data["pricing"]
        
        assert "bronze" in pricing, "Pricing should contain 'bronze' tier"
        assert "silver" in pricing, "Pricing should contain 'silver' tier"
        assert "gold" in pricing, "Pricing should contain 'gold' tier"
        
    def test_pricing_tiers_have_required_fields(self):
        """Test that each tier has name, monthly_price, annual_price, features"""
        response = requests.get(f"{BASE_URL}/api/admin/pricing", headers=self.headers)
        data = response.json()
        pricing = data["pricing"]
        
        for tier_name in ["bronze", "silver", "gold"]:
            tier = pricing[tier_name]
            assert "name" in tier, f"{tier_name} missing 'name'"
            assert "monthly_price" in tier, f"{tier_name} missing 'monthly_price'"
            assert "annual_price" in tier, f"{tier_name} missing 'annual_price'"
            assert "features" in tier, f"{tier_name} missing 'features'"
            assert isinstance(tier["features"], list), f"{tier_name} features should be a list"
            
    def test_bronze_tier_is_free(self):
        """Test that Bronze tier has $0 pricing"""
        response = requests.get(f"{BASE_URL}/api/admin/pricing", headers=self.headers)
        data = response.json()
        bronze = data["pricing"]["bronze"]
        
        assert bronze["monthly_price"] == 0, f"Bronze monthly should be 0, got: {bronze['monthly_price']}"
        assert bronze["annual_price"] == 0, f"Bronze annual should be 0, got: {bronze['annual_price']}"
        
    def test_silver_tier_pricing(self):
        """Test Silver tier has correct default pricing"""
        response = requests.get(f"{BASE_URL}/api/admin/pricing", headers=self.headers)
        data = response.json()
        silver = data["pricing"]["silver"]
        
        # Default is $15/month, $150/year
        assert silver["monthly_price"] == 15.0, f"Silver monthly should be 15, got: {silver['monthly_price']}"
        assert silver["annual_price"] == 150.0, f"Silver annual should be 150, got: {silver['annual_price']}"
        
    def test_gold_tier_pricing(self):
        """Test Gold tier has correct default pricing"""
        response = requests.get(f"{BASE_URL}/api/admin/pricing", headers=self.headers)
        data = response.json()
        gold = data["pricing"]["gold"]
        
        # Default is $20/month, $200/year
        assert gold["monthly_price"] == 20.0, f"Gold monthly should be 20, got: {gold['monthly_price']}"
        assert gold["annual_price"] == 200.0, f"Gold annual should be 200, got: {gold['annual_price']}"
        
    def test_put_pricing_updates_config(self):
        """Test that PUT /api/admin/pricing updates the configuration"""
        # First get current config
        get_response = requests.get(f"{BASE_URL}/api/admin/pricing", headers=self.headers)
        original_config = get_response.json()["pricing"]
        
        # Update silver tier price
        update_payload = {
            "silver": {
                "monthly_price": 16.99
            }
        }
        
        put_response = requests.put(
            f"{BASE_URL}/api/admin/pricing",
            headers=self.headers,
            json=update_payload
        )
        
        assert put_response.status_code == 200, f"PUT failed: {put_response.text}"
        
        # Verify the update
        verify_response = requests.get(f"{BASE_URL}/api/admin/pricing", headers=self.headers)
        updated_config = verify_response.json()["pricing"]
        
        assert updated_config["silver"]["monthly_price"] == 16.99, \
            f"Silver price not updated: {updated_config['silver']['monthly_price']}"
        
        # Restore original price
        restore_payload = {
            "silver": {
                "monthly_price": original_config["silver"]["monthly_price"]
            }
        }
        requests.put(f"{BASE_URL}/api/admin/pricing", headers=self.headers, json=restore_payload)
        
        print("✓ Pricing update and restore successful")


class TestAdminRoleManagement:
    """Test /api/admin/users/{user_id}/role endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.session_token = response.json()["session_token"]
        self.headers = {"Authorization": f"Bearer {self.session_token}"}
        
    def test_role_endpoint_requires_auth(self):
        """Test that role endpoint requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/admin/users/some-user-id/role",
            json={"role": "admin"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
    def test_role_endpoint_validates_role_value(self):
        """Test that role must be 'admin' or 'user'"""
        # Get a non-admin user to test with
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        users = users_response.json()["users"]
        
        # Find a regular user (not primary admin)
        test_user = None
        for user in users:
            if user["effective_role"] == "user":
                test_user = user
                break
        
        if not test_user:
            pytest.skip("No regular user found to test role update")
            
        # Try invalid role
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{test_user['user_id']}/role",
            headers=self.headers,
            json={"role": "superadmin"}  # Invalid role
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid role, got {response.status_code}"
        
    def test_cannot_modify_primary_admin_role(self):
        """Test that primary admin roles cannot be modified"""
        # Get users to find primary admin
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        users = users_response.json()["users"]
        
        # Find primary admin
        primary_admin = None
        for user in users:
            if user["effective_role"] == "primary_admin":
                primary_admin = user
                break
        
        assert primary_admin is not None, "No primary admin found"
        
        # Try to modify primary admin role
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{primary_admin['user_id']}/role",
            headers=self.headers,
            json={"role": "user"}
        )
        
        assert response.status_code == 403, \
            f"Expected 403 when modifying primary admin, got {response.status_code}: {response.text}"
        
        print("✓ Primary admin role correctly protected from modification")
        
    def test_grant_admin_role_to_user(self):
        """Test granting admin role to a regular user"""
        # Get users to find a regular user
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        users = users_response.json()["users"]
        
        # Find a regular user (not primary admin)
        test_user = None
        for user in users:
            if user["effective_role"] == "user":
                test_user = user
                break
        
        if not test_user:
            pytest.skip("No regular user found to test role update")
        
        # Grant admin role
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{test_user['user_id']}/role",
            headers=self.headers,
            json={"role": "admin"}
        )
        
        assert response.status_code == 200, f"Failed to grant admin: {response.text}"
        
        # Verify the change
        verify_response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        updated_users = verify_response.json()["users"]
        
        updated_user = None
        for user in updated_users:
            if user["user_id"] == test_user["user_id"]:
                updated_user = user
                break
        
        assert updated_user is not None, "User not found after update"
        assert updated_user["effective_role"] == "admin", \
            f"User role not updated to admin: {updated_user['effective_role']}"
        
        # Revoke admin role (cleanup)
        requests.put(
            f"{BASE_URL}/api/admin/users/{test_user['user_id']}/role",
            headers=self.headers,
            json={"role": "user"}
        )
        
        print(f"✓ Successfully granted and revoked admin role for user {test_user['email']}")


class TestAdminAccessControl:
    """Test that admin endpoints require admin access"""
    
    def test_admin_users_requires_admin(self):
        """Test that /api/admin/users requires admin access"""
        # Try without auth
        response = requests.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        
    def test_admin_pricing_requires_admin(self):
        """Test that /api/admin/pricing requires admin access"""
        # Try without auth
        response = requests.get(f"{BASE_URL}/api/admin/pricing")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        
    def test_admin_stats_requires_admin(self):
        """Test that /api/admin/stats requires admin access"""
        # Try without auth
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"


class TestPrimaryAdminProtection:
    """Test that primary admin accounts are protected"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.session_token = response.json()["session_token"]
        self.headers = {"Authorization": f"Bearer {self.session_token}"}
        
    def test_cannot_delete_primary_admin(self):
        """Test that primary admin accounts cannot be deleted"""
        # Get users to find primary admin
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        users = users_response.json()["users"]
        
        # Find primary admin
        primary_admin = None
        for user in users:
            if user["effective_role"] == "primary_admin":
                primary_admin = user
                break
        
        assert primary_admin is not None, "No primary admin found"
        
        # Try to delete primary admin
        response = requests.delete(
            f"{BASE_URL}/api/admin/users/{primary_admin['user_id']}",
            headers=self.headers
        )
        
        assert response.status_code == 403, \
            f"Expected 403 when deleting primary admin, got {response.status_code}: {response.text}"
        
        print("✓ Primary admin correctly protected from deletion")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
