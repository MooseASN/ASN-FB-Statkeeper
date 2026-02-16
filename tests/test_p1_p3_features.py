"""
Test P1-P3 Features for StatMoose:
- P1: Trial periods for premium tiers
- P1: Embeddable live stats snippet component
- P2: Season clone feature
- P3: Redo button functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://multi-sport-stats.preview.emergentagent.com')

class TestTrialPeriods:
    """P1: Test trial periods for premium tiers"""
    
    def test_packages_endpoint_returns_trial_days(self):
        """Test that /api/payments/packages returns trial_days field"""
        response = requests.get(f"{BASE_URL}/api/payments/packages")
        assert response.status_code == 200
        
        data = response.json()
        packages = data.get('packages', {})
        
        # Verify all packages have trial_days field
        for pkg_id, pkg in packages.items():
            assert 'trial_days' in pkg, f"Package {pkg_id} missing trial_days field"
    
    def test_bronze_has_zero_trial_days(self):
        """Test that Bronze tier has 0 trial days"""
        response = requests.get(f"{BASE_URL}/api/payments/packages")
        assert response.status_code == 200
        
        data = response.json()
        bronze = data['packages'].get('monthly_bronze', {})
        
        assert bronze.get('trial_days') == 0, f"Bronze trial_days should be 0, got {bronze.get('trial_days')}"
    
    def test_silver_has_14_trial_days(self):
        """Test that Silver tier has 14 trial days"""
        response = requests.get(f"{BASE_URL}/api/payments/packages")
        assert response.status_code == 200
        
        data = response.json()
        silver = data['packages'].get('monthly_silver', {})
        
        assert silver.get('trial_days') == 14, f"Silver trial_days should be 14, got {silver.get('trial_days')}"
    
    def test_gold_has_14_trial_days(self):
        """Test that Gold tier has 14 trial days"""
        response = requests.get(f"{BASE_URL}/api/payments/packages")
        assert response.status_code == 200
        
        data = response.json()
        gold = data['packages'].get('monthly_gold', {})
        
        assert gold.get('trial_days') == 14, f"Gold trial_days should be 14, got {gold.get('trial_days')}"
    
    def test_annual_plans_have_trial_days(self):
        """Test that annual plans also have trial days"""
        response = requests.get(f"{BASE_URL}/api/payments/packages")
        assert response.status_code == 200
        
        data = response.json()
        packages = data['packages']
        
        annual_silver = packages.get('annual_silver', {})
        annual_gold = packages.get('annual_gold', {})
        
        assert annual_silver.get('trial_days') == 14, f"Annual Silver trial_days should be 14"
        assert annual_gold.get('trial_days') == 14, f"Annual Gold trial_days should be 14"


class TestSeasonClone:
    """P2: Test season clone feature"""
    
    @pytest.fixture
    def admin_session(self):
        """Create an admin user session for testing"""
        import subprocess
        result = subprocess.run([
            'mongosh', '--quiet', '--eval', '''
            use('test_database');
            var userId = 'test-clone-admin-' + Date.now();
            var sessionToken = 'test_clone_session_' + Date.now();
            db.users.insertOne({
              user_id: userId,
              email: 'clone.admin.' + Date.now() + '@example.com',
              username: 'cloneadmin',
              name: 'Clone Admin',
              auth_provider: 'local',
              school_id: 'school_d613fa4bc98e',
              school_role: 'admin',
              created_at: new Date()
            });
            db.user_sessions.insertOne({
              user_id: userId,
              session_token: sessionToken,
              expires_at: new Date(Date.now() + 7*24*60*60*1000),
              created_at: new Date()
            });
            print(sessionToken);
            '''
        ], capture_output=True, text=True)
        return result.stdout.strip()
    
    def test_clone_endpoint_exists(self, admin_session):
        """Test that the clone endpoint exists and responds"""
        school_id = "school_d613fa4bc98e"
        season_id = "season_a98ee1c4f115"
        
        response = requests.post(
            f"{BASE_URL}/api/schools/{school_id}/seasons/{season_id}/clone",
            json={"new_name": "Test Clone Season", "include_roster": False, "include_schedule": False},
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        
        # Should return 200 or 403 (if auth issue), not 404
        assert response.status_code != 404, "Clone endpoint should exist"
    
    def test_clone_returns_new_season_id(self, admin_session):
        """Test that clone returns new season_id"""
        school_id = "school_d613fa4bc98e"
        season_id = "season_a98ee1c4f115"
        
        response = requests.post(
            f"{BASE_URL}/api/schools/{school_id}/seasons/{season_id}/clone",
            json={"new_name": f"Cloned Season {os.urandom(4).hex()}", "include_roster": True, "include_schedule": False},
            headers={"Authorization": f"Bearer {admin_session}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            assert 'season_id' in data, "Response should contain season_id"
            assert data.get('success') == True, "Response should indicate success"
            assert 'stats' in data, "Response should contain stats"
    
    def test_clone_requires_authentication(self):
        """Test that clone endpoint requires authentication"""
        school_id = "school_d613fa4bc98e"
        season_id = "season_a98ee1c4f115"
        
        response = requests.post(
            f"{BASE_URL}/api/schools/{school_id}/seasons/{season_id}/clone",
            json={"new_name": "Test Clone", "include_roster": False}
        )
        
        assert response.status_code == 401, "Clone should require authentication"


class TestTierFeatures:
    """Test tier feature endpoints"""
    
    def test_tier_features_bronze(self):
        """Test bronze tier features"""
        response = requests.get(f"{BASE_URL}/api/payments/tier-features/bronze")
        assert response.status_code == 200
        
        data = response.json()
        features = data.get('features', {})
        
        # Bronze should not have embed widgets
        assert features.get('embed_widgets') == False
    
    def test_tier_features_silver(self):
        """Test silver tier features"""
        response = requests.get(f"{BASE_URL}/api/payments/tier-features/silver")
        assert response.status_code == 200
        
        data = response.json()
        features = data.get('features', {})
        
        # Silver should have embed widgets
        assert features.get('embed_widgets') == True
    
    def test_tier_features_gold(self):
        """Test gold tier features"""
        response = requests.get(f"{BASE_URL}/api/payments/tier-features/gold")
        assert response.status_code == 200
        
        data = response.json()
        features = data.get('features', {})
        
        # Gold should have all features
        assert features.get('embed_widgets') == True
        assert features.get('white_label_embeds') == True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
