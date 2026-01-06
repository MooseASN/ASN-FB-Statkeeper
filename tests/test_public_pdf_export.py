"""
Test Public PDF Export on LiveView Page
Tests the /api/games/{id}/boxscore/public-pdf endpoint which allows
viewers to download PDF box scores without authentication.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test game IDs from the database
TEST_GAME_ID = "02b2d8c1-9cff-4ce2-bf4e-6897ce1598e3"  # Lakers vs Celtics
TEST_SHARE_CODE = "ed00a90f"


class TestPublicPdfEndpoint:
    """Tests for the public PDF export endpoint (no auth required)"""
    
    def test_public_pdf_returns_200_without_auth(self):
        """Public PDF endpoint should work without authentication"""
        response = requests.get(f"{BASE_URL}/api/games/{TEST_GAME_ID}/boxscore/public-pdf")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_public_pdf_returns_pdf_content_type(self):
        """Public PDF endpoint should return application/pdf content type"""
        response = requests.get(f"{BASE_URL}/api/games/{TEST_GAME_ID}/boxscore/public-pdf")
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("Content-Type", ""), \
            f"Expected application/pdf, got {response.headers.get('Content-Type')}"
    
    def test_public_pdf_has_valid_pdf_header(self):
        """PDF content should start with %PDF header"""
        response = requests.get(f"{BASE_URL}/api/games/{TEST_GAME_ID}/boxscore/public-pdf")
        assert response.status_code == 200
        assert response.content[:4] == b'%PDF', \
            f"PDF should start with %PDF, got {response.content[:10]}"
    
    def test_public_pdf_has_content_disposition_header(self):
        """PDF response should have Content-Disposition header with filename"""
        response = requests.get(f"{BASE_URL}/api/games/{TEST_GAME_ID}/boxscore/public-pdf")
        assert response.status_code == 200
        content_disp = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disp, "Should have attachment disposition"
        assert ".pdf" in content_disp, "Filename should have .pdf extension"
    
    def test_public_pdf_contains_team_names_in_filename(self):
        """PDF filename should contain team names"""
        response = requests.get(f"{BASE_URL}/api/games/{TEST_GAME_ID}/boxscore/public-pdf")
        assert response.status_code == 200
        content_disp = response.headers.get("Content-Disposition", "")
        # The game is Lakers vs Celtics
        assert "Lakers" in content_disp or "Celtics" in content_disp, \
            f"Filename should contain team names, got: {content_disp}"
    
    def test_public_pdf_has_reasonable_size(self):
        """PDF should have reasonable file size (not empty, not too large)"""
        response = requests.get(f"{BASE_URL}/api/games/{TEST_GAME_ID}/boxscore/public-pdf")
        assert response.status_code == 200
        content_length = len(response.content)
        assert content_length > 1000, f"PDF too small ({content_length} bytes), might be empty"
        assert content_length < 1000000, f"PDF too large ({content_length} bytes)"
    
    def test_public_pdf_returns_404_for_invalid_game(self):
        """Public PDF endpoint should return 404 for non-existent game"""
        response = requests.get(f"{BASE_URL}/api/games/invalid-game-id-12345/boxscore/public-pdf")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestShareCodeEndpoint:
    """Tests for the share code endpoint used by LiveView"""
    
    def test_share_code_returns_game_data(self):
        """Share code endpoint should return game data"""
        response = requests.get(f"{BASE_URL}/api/games/share/{TEST_SHARE_CODE}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "id" in data, "Response should contain game id"
        assert "home_team_name" in data, "Response should contain home_team_name"
        assert "away_team_name" in data, "Response should contain away_team_name"
    
    def test_share_code_returns_player_stats(self):
        """Share code endpoint should include player stats"""
        response = requests.get(f"{BASE_URL}/api/games/share/{TEST_SHARE_CODE}")
        assert response.status_code == 200
        
        data = response.json()
        # Check for player stats arrays
        assert "home_player_stats" in data, "Response should contain home_player_stats"
        assert "away_player_stats" in data, "Response should contain away_player_stats"
    
    def test_share_code_returns_404_for_invalid_code(self):
        """Share code endpoint should return 404 for invalid code"""
        response = requests.get(f"{BASE_URL}/api/games/share/invalid123")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestAuthenticatedVsPublicPdf:
    """Compare authenticated and public PDF endpoints"""
    
    def test_authenticated_pdf_requires_auth(self):
        """Authenticated PDF endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/games/{TEST_GAME_ID}/boxscore/pdf")
        # Should return 401 without auth
        assert response.status_code == 401, \
            f"Authenticated endpoint should require auth, got {response.status_code}"
    
    def test_public_pdf_does_not_require_auth(self):
        """Public PDF endpoint should NOT require authentication"""
        response = requests.get(f"{BASE_URL}/api/games/{TEST_GAME_ID}/boxscore/public-pdf")
        # Should return 200 without auth
        assert response.status_code == 200, \
            f"Public endpoint should work without auth, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
