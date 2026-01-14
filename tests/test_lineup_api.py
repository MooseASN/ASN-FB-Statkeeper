"""
Test backend API for baseball lineup persistence fields
Tests: home_batting_order, away_batting_order, home_defense, away_defense
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBaseballLineupAPI:
    """Test baseball lineup persistence in GameUpdate model"""
    
    def test_health_check(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✓ Health check passed")
    
    def test_create_baseball_game(self):
        """Create a baseball game for testing"""
        payload = {
            "sport": "baseball",
            "home_team": "Test Home Team",
            "away_team": "Test Away Team",
            "home_roster": [
                {"player_number": "1", "player_name": "Player One"},
                {"player_number": "2", "player_name": "Player Two"},
                {"player_number": "3", "player_name": "Player Three"},
            ],
            "away_roster": [
                {"player_number": "10", "player_name": "Away Player One"},
                {"player_number": "11", "player_name": "Away Player Two"},
                {"player_number": "12", "player_name": "Away Player Three"},
            ]
        }
        response = requests.post(f"{BASE_URL}/api/games", json=payload)
        assert response.status_code == 200, f"Failed to create game: {response.text}"
        data = response.json()
        assert "id" in data or "_id" in data
        game_id = data.get("id") or data.get("_id")
        print(f"✓ Created baseball game with ID: {game_id}")
        return game_id
    
    def test_update_game_with_lineup_fields(self):
        """Test that GameUpdate accepts lineup fields"""
        # First create a game
        game_id = self.test_create_baseball_game()
        
        # Now update with lineup fields
        lineup_payload = {
            "home_batting_order": [
                {"player_number": "1", "player_name": "Player One", "position": "P"},
                {"player_number": "2", "player_name": "Player Two", "position": "C"},
                {"player_number": "3", "player_name": "Player Three", "position": "1B"},
            ],
            "away_batting_order": [
                {"player_number": "10", "player_name": "Away Player One", "position": "P"},
                {"player_number": "11", "player_name": "Away Player Two", "position": "C"},
                {"player_number": "12", "player_name": "Away Player Three", "position": "1B"},
            ],
            "home_defense": {
                "P": "1",
                "C": "2",
                "1B": "3"
            },
            "away_defense": {
                "P": "10",
                "C": "11",
                "1B": "12"
            }
        }
        
        response = requests.put(f"{BASE_URL}/api/games/{game_id}", json=lineup_payload)
        assert response.status_code == 200, f"Failed to update game with lineup: {response.text}"
        print("✓ Successfully updated game with lineup fields")
        
        # Verify the data was saved by fetching the game
        get_response = requests.get(f"{BASE_URL}/api/games/{game_id}")
        assert get_response.status_code == 200
        game_data = get_response.json()
        
        # Check lineup fields are present
        assert "home_batting_order" in game_data, "home_batting_order not saved"
        assert "away_batting_order" in game_data, "away_batting_order not saved"
        assert "home_defense" in game_data, "home_defense not saved"
        assert "away_defense" in game_data, "away_defense not saved"
        
        # Verify data integrity
        assert len(game_data["home_batting_order"]) == 3, "home_batting_order count mismatch"
        assert len(game_data["away_batting_order"]) == 3, "away_batting_order count mismatch"
        print("✓ Lineup fields persisted correctly")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/games/{game_id}")
        print(f"✓ Cleaned up test game {game_id}")
        
        return True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
