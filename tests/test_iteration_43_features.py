"""
Test file for iteration 43 features:
1. StatMoose logo navigation to home page '/'
2. Pricing page Gold tier - no 'Most Popular' badge
3. Basketball LiveGame has EmbedSnippetGenerator
4. Football FootballLiveGame has Redo button
5. Football FootballLiveGame has Embed button
6. SimpleFootballLiveGame has Share, Embed, Undo, Redo buttons
7. Backend GET /api/payments/user-tier endpoint
8. useSubscriptionFeatures hook with canAccess and hasFeature
9. BaseballLiveGame has Embed button
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://stat-tracker-14.preview.emergentagent.com')

class TestPaymentsAPI:
    """Test payment-related API endpoints"""
    
    def test_user_tier_endpoint_returns_tier(self):
        """GET /api/payments/user-tier should return user's subscription tier"""
        response = requests.get(f"{BASE_URL}/api/payments/user-tier")
        assert response.status_code == 200
        
        data = response.json()
        assert "tier" in data
        assert data["tier"] in ["bronze", "silver", "gold"]
        assert "subscription_status" in data
        assert "subscription_end" in data
        assert "is_trial" in data
    
    def test_user_tier_default_bronze(self):
        """Unauthenticated users should get bronze tier"""
        response = requests.get(f"{BASE_URL}/api/payments/user-tier")
        assert response.status_code == 200
        
        data = response.json()
        assert data["tier"] == "bronze"
    
    def test_packages_endpoint(self):
        """GET /api/payments/packages should return all subscription packages"""
        response = requests.get(f"{BASE_URL}/api/payments/packages")
        assert response.status_code == 200
        
        data = response.json()
        assert "packages" in data
        packages = data["packages"]
        
        # Verify all expected packages exist
        assert "monthly_bronze" in packages
        assert "monthly_silver" in packages
        assert "monthly_gold" in packages
        
        # Verify trial days
        assert packages["monthly_bronze"]["trial_days"] == 0
        assert packages["monthly_silver"]["trial_days"] == 14
        assert packages["monthly_gold"]["trial_days"] == 14
    
    def test_tier_features_bronze(self):
        """GET /api/payments/tier-features/bronze should return bronze features"""
        response = requests.get(f"{BASE_URL}/api/payments/tier-features/bronze")
        assert response.status_code == 200
        
        data = response.json()
        assert data["tier"] == "bronze"
        assert "features" in data
        # Bronze should NOT have embed_widgets
        assert data["features"]["embed_widgets"] == False
    
    def test_tier_features_silver(self):
        """GET /api/payments/tier-features/silver should return silver features"""
        response = requests.get(f"{BASE_URL}/api/payments/tier-features/silver")
        assert response.status_code == 200
        
        data = response.json()
        assert data["tier"] == "silver"
        assert "features" in data
        # Silver SHOULD have embed_widgets
        assert data["features"]["embed_widgets"] == True
    
    def test_tier_features_gold(self):
        """GET /api/payments/tier-features/gold should return gold features"""
        response = requests.get(f"{BASE_URL}/api/payments/tier-features/gold")
        assert response.status_code == 200
        
        data = response.json()
        assert data["tier"] == "gold"
        assert "features" in data
        # Gold SHOULD have all premium features
        assert data["features"]["embed_widgets"] == True
        assert data["features"]["white_label_embeds"] == True
        assert data["features"]["shared_access"] == True


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """API should be accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
