"""
Test Pricing Page APIs
Tests for /api/payments/packages and /api/payments/tier-features endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPricingPackagesAPI:
    """Test /api/payments/packages endpoint"""
    
    def test_packages_endpoint_returns_200(self):
        """Test that packages endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/payments/packages")
        assert response.status_code == 200
        
    def test_packages_contains_all_tiers(self):
        """Test that packages contains bronze, silver, gold tiers"""
        response = requests.get(f"{BASE_URL}/api/payments/packages")
        data = response.json()
        
        assert "packages" in data
        packages = data["packages"]
        
        # Check monthly packages exist
        assert "monthly_bronze" in packages
        assert "monthly_silver" in packages
        assert "monthly_gold" in packages
        
    def test_bronze_tier_is_free(self):
        """Test that Bronze tier is free ($0)"""
        response = requests.get(f"{BASE_URL}/api/payments/packages")
        data = response.json()
        
        bronze = data["packages"]["monthly_bronze"]
        assert bronze["amount"] == 0
        assert bronze["name"] == "Bronze"
        assert bronze["tier"] == "bronze"
        
    def test_silver_tier_price(self):
        """Test that Silver tier is $15/month"""
        response = requests.get(f"{BASE_URL}/api/payments/packages")
        data = response.json()
        
        silver = data["packages"]["monthly_silver"]
        assert silver["amount"] == 15.0
        assert silver["name"] == "Silver"
        assert silver["tier"] == "silver"
        assert silver["interval"] == "month"
        assert silver["currency"] == "usd"
        
    def test_gold_tier_price(self):
        """Test that Gold tier is $20/month"""
        response = requests.get(f"{BASE_URL}/api/payments/packages")
        data = response.json()
        
        gold = data["packages"]["monthly_gold"]
        assert gold["amount"] == 20.0
        assert gold["name"] == "Gold"
        assert gold["tier"] == "gold"
        assert gold["interval"] == "month"
        assert gold["currency"] == "usd"
        
    def test_packages_have_features_list(self):
        """Test that each package has a features list"""
        response = requests.get(f"{BASE_URL}/api/payments/packages")
        data = response.json()
        
        for package_id, package in data["packages"].items():
            assert "features" in package
            assert isinstance(package["features"], list)
            assert len(package["features"]) > 0


class TestTierFeaturesAPI:
    """Test /api/payments/tier-features/{tier} endpoint"""
    
    def test_bronze_tier_features(self):
        """Test Bronze tier features - most features disabled"""
        response = requests.get(f"{BASE_URL}/api/payments/tier-features/bronze")
        assert response.status_code == 200
        
        data = response.json()
        assert data["tier"] == "bronze"
        
        features = data["features"]
        # Bronze should have most features disabled
        assert features["public_live_stats"] == False
        assert features["embed_widgets"] == False
        assert features["sponsor_banners"] == 0
        assert features["season_stats"] == False
        assert features["csv_export"] == False
        assert features["shared_access"] == False
        assert features["custom_branding"] == False
        assert features["white_label_embeds"] == False
        assert features["custom_team_logos"] == False
        assert features["priority_support"] == False
        
    def test_silver_tier_features(self):
        """Test Silver tier features - mid-tier features enabled"""
        response = requests.get(f"{BASE_URL}/api/payments/tier-features/silver")
        assert response.status_code == 200
        
        data = response.json()
        assert data["tier"] == "silver"
        
        features = data["features"]
        # Silver should have mid-tier features
        assert features["public_live_stats"] == True
        assert features["embed_widgets"] == True
        assert features["sponsor_banners"] == 5  # 5 slots
        assert features["season_stats"] == True
        assert features["csv_export"] == True
        # But not premium features
        assert features["shared_access"] == False
        assert features["custom_branding"] == False
        assert features["white_label_embeds"] == False
        assert features["custom_team_logos"] == False
        assert features["priority_support"] == False
        
    def test_gold_tier_features(self):
        """Test Gold tier features - all features enabled"""
        response = requests.get(f"{BASE_URL}/api/payments/tier-features/gold")
        assert response.status_code == 200
        
        data = response.json()
        assert data["tier"] == "gold"
        
        features = data["features"]
        # Gold should have all features
        assert features["public_live_stats"] == True
        assert features["embed_widgets"] == True
        assert features["sponsor_banners"] == -1  # Unlimited
        assert features["season_stats"] == True
        assert features["csv_export"] == True
        assert features["shared_access"] == True
        assert features["custom_branding"] == True
        assert features["white_label_embeds"] == True
        assert features["custom_team_logos"] == True
        assert features["priority_support"] == True
        
    def test_invalid_tier_returns_400(self):
        """Test that invalid tier returns 400 error"""
        response = requests.get(f"{BASE_URL}/api/payments/tier-features/invalid_tier")
        assert response.status_code == 400
        
        data = response.json()
        assert "detail" in data
        assert "Invalid tier" in data["detail"]


class TestCheckoutEndpoint:
    """Test /api/payments/checkout endpoint"""
    
    def test_checkout_requires_valid_package(self):
        """Test that checkout requires a valid package_id"""
        response = requests.post(
            f"{BASE_URL}/api/payments/checkout",
            json={
                "package_id": "invalid_package",
                "origin_url": "https://example.com"
            }
        )
        assert response.status_code == 400
        
        data = response.json()
        assert "detail" in data
        assert "Invalid package" in data["detail"]
        
    def test_checkout_bronze_returns_redirect(self):
        """Test that Bronze checkout returns redirect URL (free tier)"""
        response = requests.post(
            f"{BASE_URL}/api/payments/checkout",
            json={
                "package_id": "monthly_bronze",
                "origin_url": "https://example.com"
            }
        )
        # Bronze is free, should return success with redirect
        assert response.status_code == 200
        
        data = response.json()
        assert "url" in data
        assert "session_id" in data
        assert data["session_id"] == "free_tier_no_checkout"
        assert "/select-sport" in data["url"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
