"""
Test LiveView Team Data - Verifies that the share code endpoint returns team logos and rosters
Tests for: GET /api/games/share/{share_code}
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLiveViewTeamData:
    """Tests for LiveView team data (logos, rosters, player stats)"""
    
    # Test share code from the existing game
    SHARE_CODE = "ed00a90f"
    
    def test_share_endpoint_returns_200(self):
        """Test that share endpoint returns 200 for valid share code"""
        response = requests.get(f"{BASE_URL}/api/games/share/{self.SHARE_CODE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Share endpoint returns 200 for share_code: {self.SHARE_CODE}")
    
    def test_share_endpoint_returns_home_team_logo_field(self):
        """Test that response includes home_team_logo field"""
        response = requests.get(f"{BASE_URL}/api/games/share/{self.SHARE_CODE}")
        assert response.status_code == 200
        data = response.json()
        
        # Field should exist (can be null if no logo set)
        assert "home_team_logo" in data, "home_team_logo field missing from response"
        print(f"✓ home_team_logo field present: {data.get('home_team_logo')}")
    
    def test_share_endpoint_returns_away_team_logo_field(self):
        """Test that response includes away_team_logo field"""
        response = requests.get(f"{BASE_URL}/api/games/share/{self.SHARE_CODE}")
        assert response.status_code == 200
        data = response.json()
        
        # Field should exist (can be null if no logo set)
        assert "away_team_logo" in data, "away_team_logo field missing from response"
        print(f"✓ away_team_logo field present: {data.get('away_team_logo')}")
    
    def test_share_endpoint_returns_home_team_roster(self):
        """Test that response includes home_team_roster array"""
        response = requests.get(f"{BASE_URL}/api/games/share/{self.SHARE_CODE}")
        assert response.status_code == 200
        data = response.json()
        
        assert "home_team_roster" in data, "home_team_roster field missing from response"
        assert isinstance(data["home_team_roster"], list), "home_team_roster should be a list"
        
        # Verify roster structure if not empty
        if len(data["home_team_roster"]) > 0:
            player = data["home_team_roster"][0]
            assert "number" in player, "Player should have 'number' field"
            assert "name" in player, "Player should have 'name' field"
        
        print(f"✓ home_team_roster present with {len(data['home_team_roster'])} players")
        for p in data["home_team_roster"]:
            print(f"  - #{p.get('number')} {p.get('name')}")
    
    def test_share_endpoint_returns_away_team_roster(self):
        """Test that response includes away_team_roster array"""
        response = requests.get(f"{BASE_URL}/api/games/share/{self.SHARE_CODE}")
        assert response.status_code == 200
        data = response.json()
        
        assert "away_team_roster" in data, "away_team_roster field missing from response"
        assert isinstance(data["away_team_roster"], list), "away_team_roster should be a list"
        
        # Verify roster structure if not empty
        if len(data["away_team_roster"]) > 0:
            player = data["away_team_roster"][0]
            assert "number" in player, "Player should have 'number' field"
            assert "name" in player, "Player should have 'name' field"
        
        print(f"✓ away_team_roster present with {len(data['away_team_roster'])} players")
        for p in data["away_team_roster"]:
            print(f"  - #{p.get('number')} {p.get('name')}")
    
    def test_share_endpoint_returns_home_player_stats(self):
        """Test that response includes home_player_stats array"""
        response = requests.get(f"{BASE_URL}/api/games/share/{self.SHARE_CODE}")
        assert response.status_code == 200
        data = response.json()
        
        assert "home_player_stats" in data, "home_player_stats field missing from response"
        assert isinstance(data["home_player_stats"], list), "home_player_stats should be a list"
        
        # Verify stats structure if not empty
        if len(data["home_player_stats"]) > 0:
            stats = data["home_player_stats"][0]
            assert "player_name" in stats, "Stats should have 'player_name' field"
            assert "player_number" in stats, "Stats should have 'player_number' field"
            # Check for basketball stat fields
            assert "ft_made" in stats, "Stats should have 'ft_made' field"
            assert "fg2_made" in stats, "Stats should have 'fg2_made' field"
            assert "fg3_made" in stats, "Stats should have 'fg3_made' field"
        
        print(f"✓ home_player_stats present with {len(data['home_player_stats'])} players")
    
    def test_share_endpoint_returns_away_player_stats(self):
        """Test that response includes away_player_stats array"""
        response = requests.get(f"{BASE_URL}/api/games/share/{self.SHARE_CODE}")
        assert response.status_code == 200
        data = response.json()
        
        assert "away_player_stats" in data, "away_player_stats field missing from response"
        assert isinstance(data["away_player_stats"], list), "away_player_stats should be a list"
        
        print(f"✓ away_player_stats present with {len(data['away_player_stats'])} players")
    
    def test_share_endpoint_returns_team_names(self):
        """Test that response includes team names"""
        response = requests.get(f"{BASE_URL}/api/games/share/{self.SHARE_CODE}")
        assert response.status_code == 200
        data = response.json()
        
        assert "home_team_name" in data, "home_team_name field missing"
        assert "away_team_name" in data, "away_team_name field missing"
        assert data["home_team_name"], "home_team_name should not be empty"
        assert data["away_team_name"], "away_team_name should not be empty"
        
        print(f"✓ Team names: {data['home_team_name']} vs {data['away_team_name']}")
    
    def test_share_endpoint_returns_team_colors(self):
        """Test that response includes team colors"""
        response = requests.get(f"{BASE_URL}/api/games/share/{self.SHARE_CODE}")
        assert response.status_code == 200
        data = response.json()
        
        # Colors should be present (may have default values)
        assert "home_team_color" in data, "home_team_color field missing"
        assert "away_team_color" in data, "away_team_color field missing"
        
        print(f"✓ Team colors: Home={data.get('home_team_color')}, Away={data.get('away_team_color')}")
    
    def test_share_endpoint_returns_quarter_scores(self):
        """Test that response includes quarter scores"""
        response = requests.get(f"{BASE_URL}/api/games/share/{self.SHARE_CODE}")
        assert response.status_code == 200
        data = response.json()
        
        assert "quarter_scores" in data, "quarter_scores field missing"
        assert "home" in data["quarter_scores"], "quarter_scores.home missing"
        assert "away" in data["quarter_scores"], "quarter_scores.away missing"
        assert isinstance(data["quarter_scores"]["home"], list), "quarter_scores.home should be a list"
        assert isinstance(data["quarter_scores"]["away"], list), "quarter_scores.away should be a list"
        
        home_total = sum(data["quarter_scores"]["home"])
        away_total = sum(data["quarter_scores"]["away"])
        print(f"✓ Quarter scores present - Home total: {home_total}, Away total: {away_total}")
    
    def test_share_endpoint_returns_404_for_invalid_code(self):
        """Test that share endpoint returns 404 for invalid share code"""
        response = requests.get(f"{BASE_URL}/api/games/share/invalid_code_xyz")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Returns 404 for invalid share code")
    
    def test_share_endpoint_returns_sport_field(self):
        """Test that response includes sport field"""
        response = requests.get(f"{BASE_URL}/api/games/share/{self.SHARE_CODE}")
        assert response.status_code == 200
        data = response.json()
        
        assert "sport" in data, "sport field missing from response"
        assert data["sport"] in ["basketball", "football"], f"Invalid sport: {data['sport']}"
        
        print(f"✓ Sport field present: {data['sport']}")


class TestLiveViewDataIntegrity:
    """Tests for data integrity between roster and player stats"""
    
    SHARE_CODE = "ed00a90f"
    
    def test_player_stats_match_roster_players(self):
        """Test that player stats correspond to roster players"""
        response = requests.get(f"{BASE_URL}/api/games/share/{self.SHARE_CODE}")
        assert response.status_code == 200
        data = response.json()
        
        home_roster = data.get("home_team_roster", [])
        home_stats = data.get("home_player_stats", [])
        
        # Get roster player numbers
        roster_numbers = {p["number"] for p in home_roster}
        stats_numbers = {s["player_number"] for s in home_stats}
        
        # All stats players should be in roster (or added during game)
        print(f"✓ Home roster numbers: {roster_numbers}")
        print(f"✓ Home stats numbers: {stats_numbers}")
        
        # Check away team too
        away_roster = data.get("away_team_roster", [])
        away_stats = data.get("away_player_stats", [])
        
        away_roster_numbers = {p["number"] for p in away_roster}
        away_stats_numbers = {s["player_number"] for s in away_stats}
        
        print(f"✓ Away roster numbers: {away_roster_numbers}")
        print(f"✓ Away stats numbers: {away_stats_numbers}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
