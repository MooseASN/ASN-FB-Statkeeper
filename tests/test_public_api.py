"""
Test Public API endpoints with API Key authentication
Tests:
1. API Key Management (create, list, delete)
2. GET /api/games/public - list games with filters
3. GET /api/games/{game_id}/rosters - get rosters with player stats
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "antlersportsnetwork@gmail.com"
ADMIN_PASSWORD = "NoahTheJew1997"
TEST_API_KEY = "pk_LAo5A4KEC_6uZi3BPCtIQ-npUDKZx4mIGwZvkzwItvs"


class TestPublicAPIKeyManagement:
    """Test API Key CRUD operations"""
    
    session_token = None
    created_key_id = None
    created_key_value = None
    
    @classmethod
    def setup_class(cls):
        """Login to get session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        cls.session_token = response.json().get("session_token")
        assert cls.session_token, "No session token returned"
    
    def get_headers(self):
        return {
            "Authorization": f"Bearer {self.session_token}",
            "Content-Type": "application/json"
        }
    
    def test_01_list_api_keys(self):
        """Test listing API keys"""
        response = requests.get(
            f"{BASE_URL}/api/public-api-keys",
            headers=self.get_headers()
        )
        assert response.status_code == 200, f"List API keys failed: {response.text}"
        data = response.json()
        assert "api_keys" in data
        assert isinstance(data["api_keys"], list)
        print(f"Found {len(data['api_keys'])} existing API keys")
    
    def test_02_create_api_key(self):
        """Test creating a new API key"""
        response = requests.post(
            f"{BASE_URL}/api/public-api-keys",
            headers=self.get_headers(),
            json={"name": "TEST_Integration_Key"}
        )
        assert response.status_code == 200, f"Create API key failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert "key" in data  # Full key only returned on creation
        assert "key_prefix" in data
        assert "name" in data
        assert data["name"] == "TEST_Integration_Key"
        assert data["key"].startswith("pk_")
        
        # Store for later tests
        TestPublicAPIKeyManagement.created_key_id = data["id"]
        TestPublicAPIKeyManagement.created_key_value = data["key"]
        print(f"Created API key: {data['key_prefix']}...")
    
    def test_03_verify_key_in_list(self):
        """Verify newly created key appears in list"""
        response = requests.get(
            f"{BASE_URL}/api/public-api-keys",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find our created key
        found = False
        for key in data["api_keys"]:
            if key["id"] == self.created_key_id:
                found = True
                assert key["name"] == "TEST_Integration_Key"
                # Full key should NOT be in list response
                assert "key" not in key or key.get("key") is None
                break
        
        assert found, "Created key not found in list"
        print("Created key verified in list")
    
    def test_04_delete_api_key(self):
        """Test deleting an API key"""
        if not self.created_key_id:
            pytest.skip("No key to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/public-api-keys/{self.created_key_id}",
            headers=self.get_headers()
        )
        assert response.status_code == 200, f"Delete API key failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"Deleted API key: {self.created_key_id}")
    
    def test_05_verify_key_deleted(self):
        """Verify deleted key no longer in list"""
        response = requests.get(
            f"{BASE_URL}/api/public-api-keys",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        
        # Ensure deleted key is not in list
        for key in data["api_keys"]:
            assert key["id"] != self.created_key_id, "Deleted key still in list"
        
        print("Verified key was deleted")


class TestPublicGamesEndpoint:
    """Test GET /api/games/public endpoint"""
    
    def test_01_no_api_key_returns_401(self):
        """Test that missing API key returns 401"""
        response = requests.get(f"{BASE_URL}/api/games/public")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        data = response.json()
        assert "API key required" in data.get("detail", "")
        print("Correctly returns 401 without API key")
    
    def test_02_invalid_api_key_returns_401(self):
        """Test that invalid API key returns 401"""
        response = requests.get(
            f"{BASE_URL}/api/games/public",
            headers={"X-API-Key": "pk_invalid_key_12345"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        data = response.json()
        assert "Invalid" in data.get("detail", "")
        print("Correctly returns 401 with invalid API key")
    
    def test_03_valid_api_key_returns_games(self):
        """Test that valid API key returns games list"""
        response = requests.get(
            f"{BASE_URL}/api/games/public",
            headers={"X-API-Key": TEST_API_KEY}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "games" in data
        assert "total" in data
        assert "limit" in data
        assert "offset" in data
        assert "has_more" in data
        assert isinstance(data["games"], list)
        
        print(f"Retrieved {len(data['games'])} games, total: {data['total']}")
    
    def test_04_filter_by_sport(self):
        """Test filtering games by sport"""
        for sport in ["basketball", "football", "baseball"]:
            response = requests.get(
                f"{BASE_URL}/api/games/public?sport={sport}",
                headers={"X-API-Key": TEST_API_KEY}
            )
            assert response.status_code == 200, f"Filter by {sport} failed: {response.text}"
            data = response.json()
            
            # Verify all returned games match the sport filter
            for game in data["games"]:
                assert game.get("sport") == sport, f"Game sport mismatch: expected {sport}, got {game.get('sport')}"
            
            print(f"Filter by sport={sport}: {len(data['games'])} games")
    
    def test_05_filter_by_status(self):
        """Test filtering games by status"""
        for status in ["active", "scheduled", "completed"]:
            response = requests.get(
                f"{BASE_URL}/api/games/public?status={status}",
                headers={"X-API-Key": TEST_API_KEY}
            )
            assert response.status_code == 200, f"Filter by {status} failed: {response.text}"
            data = response.json()
            print(f"Filter by status={status}: {len(data['games'])} games")
    
    def test_06_pagination(self):
        """Test pagination parameters"""
        # Test with limit
        response = requests.get(
            f"{BASE_URL}/api/games/public?limit=5",
            headers={"X-API-Key": TEST_API_KEY}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["games"]) <= 5
        
        # Test with offset
        response = requests.get(
            f"{BASE_URL}/api/games/public?limit=5&offset=5",
            headers={"X-API-Key": TEST_API_KEY}
        )
        assert response.status_code == 200
        print("Pagination working correctly")


class TestGameRostersEndpoint:
    """Test GET /api/games/{game_id}/rosters endpoint"""
    
    game_id = None
    
    @classmethod
    def setup_class(cls):
        """Get a game ID to test with"""
        response = requests.get(
            f"{BASE_URL}/api/games/public?limit=1",
            headers={"X-API-Key": TEST_API_KEY}
        )
        if response.status_code == 200:
            data = response.json()
            if data["games"]:
                cls.game_id = data["games"][0]["id"]
    
    def test_01_no_api_key_returns_401(self):
        """Test that missing API key returns 401"""
        if not self.game_id:
            pytest.skip("No game available for testing")
        
        response = requests.get(f"{BASE_URL}/api/games/{self.game_id}/rosters")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Correctly returns 401 without API key")
    
    def test_02_invalid_game_id_returns_404(self):
        """Test that invalid game ID returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/games/invalid_game_id_12345/rosters",
            headers={"X-API-Key": TEST_API_KEY}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returns 404 for invalid game ID")
    
    def test_03_valid_request_returns_rosters(self):
        """Test that valid request returns rosters with player stats"""
        if not self.game_id:
            pytest.skip("No game available for testing")
        
        response = requests.get(
            f"{BASE_URL}/api/games/{self.game_id}/rosters",
            headers={"X-API-Key": TEST_API_KEY}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "game_id" in data
        assert "sport" in data
        assert "status" in data
        assert "home_team" in data
        assert "away_team" in data
        
        # Verify team structure
        for team_key in ["home_team", "away_team"]:
            team = data[team_key]
            assert "team_id" in team
            assert "team_name" in team
            assert "roster" in team
            assert "player_stats" in team
        
        print(f"Retrieved rosters for game {self.game_id}")
        print(f"Home team: {data['home_team']['team_name']}, roster size: {len(data['home_team']['roster'])}")
        print(f"Away team: {data['away_team']['team_name']}, roster size: {len(data['away_team']['roster'])}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
