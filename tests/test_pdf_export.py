"""
Test PDF Export functionality for StatMoose Basketball
Tests both Classic and Advanced mode PDF box score generation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://stat-tracker-13.preview.emergentagent.com')

# Test credentials
TEST_USERNAME = "admin"
TEST_PASSWORD = "NoahTheJew1997"

# Test game IDs
CLASSIC_GAME_ID = "2d43db80-dc75-4b8c-a1c6-b1cc4115c97e"
ADVANCED_GAME_ID = "test-advanced-game-001"


@pytest.fixture(scope="module")
def session_token():
    """Get authentication session token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_USERNAME, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "session_token" in data, "No session token in response"
    return data["session_token"]


@pytest.fixture
def auth_headers(session_token):
    """Get authorization headers"""
    return {"Authorization": f"Bearer {session_token}"}


class TestPDFExport:
    """Test PDF Box Score export functionality"""
    
    def test_classic_mode_pdf_endpoint_returns_200(self, auth_headers):
        """Test that Classic mode PDF endpoint returns 200 status"""
        response = requests.get(
            f"{BASE_URL}/api/games/{CLASSIC_GAME_ID}/boxscore/pdf",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_classic_mode_pdf_content_type(self, auth_headers):
        """Test that Classic mode PDF has correct content type"""
        response = requests.get(
            f"{BASE_URL}/api/games/{CLASSIC_GAME_ID}/boxscore/pdf",
            headers=auth_headers
        )
        assert response.status_code == 200
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF content type, got: {content_type}"
    
    def test_classic_mode_pdf_is_valid(self, auth_headers):
        """Test that Classic mode PDF content is valid PDF"""
        response = requests.get(
            f"{BASE_URL}/api/games/{CLASSIC_GAME_ID}/boxscore/pdf",
            headers=auth_headers
        )
        assert response.status_code == 200
        # PDF files start with %PDF
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF file"
    
    def test_classic_mode_pdf_has_content_disposition(self, auth_headers):
        """Test that Classic mode PDF has download filename"""
        response = requests.get(
            f"{BASE_URL}/api/games/{CLASSIC_GAME_ID}/boxscore/pdf",
            headers=auth_headers
        )
        assert response.status_code == 200
        content_disposition = response.headers.get("content-disposition", "")
        assert "attachment" in content_disposition, "Missing attachment header"
        assert "filename" in content_disposition, "Missing filename in header"
        assert ".pdf" in content_disposition, "Filename should have .pdf extension"
    
    def test_advanced_mode_pdf_endpoint_returns_200(self, auth_headers):
        """Test that Advanced mode PDF endpoint returns 200 status"""
        response = requests.get(
            f"{BASE_URL}/api/games/{ADVANCED_GAME_ID}/boxscore/pdf",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_advanced_mode_pdf_content_type(self, auth_headers):
        """Test that Advanced mode PDF has correct content type"""
        response = requests.get(
            f"{BASE_URL}/api/games/{ADVANCED_GAME_ID}/boxscore/pdf",
            headers=auth_headers
        )
        assert response.status_code == 200
        content_type = response.headers.get("content-type", "")
        assert "application/pdf" in content_type, f"Expected PDF content type, got: {content_type}"
    
    def test_advanced_mode_pdf_is_valid(self, auth_headers):
        """Test that Advanced mode PDF content is valid PDF"""
        response = requests.get(
            f"{BASE_URL}/api/games/{ADVANCED_GAME_ID}/boxscore/pdf",
            headers=auth_headers
        )
        assert response.status_code == 200
        # PDF files start with %PDF
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF file"
    
    def test_advanced_mode_pdf_has_content_disposition(self, auth_headers):
        """Test that Advanced mode PDF has download filename"""
        response = requests.get(
            f"{BASE_URL}/api/games/{ADVANCED_GAME_ID}/boxscore/pdf",
            headers=auth_headers
        )
        assert response.status_code == 200
        content_disposition = response.headers.get("content-disposition", "")
        assert "attachment" in content_disposition, "Missing attachment header"
        assert "filename" in content_disposition, "Missing filename in header"
        assert ".pdf" in content_disposition, "Filename should have .pdf extension"
    
    def test_pdf_requires_authentication(self):
        """Test that PDF endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/games/{CLASSIC_GAME_ID}/boxscore/pdf"
        )
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
    
    def test_pdf_returns_404_for_invalid_game(self, auth_headers):
        """Test that PDF endpoint returns 404 for non-existent game"""
        response = requests.get(
            f"{BASE_URL}/api/games/invalid-game-id-12345/boxscore/pdf",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404 for invalid game, got {response.status_code}"


class TestGameEndpoints:
    """Test game data endpoints used by PDF export"""
    
    def test_classic_game_exists(self, auth_headers):
        """Test that Classic mode test game exists"""
        response = requests.get(
            f"{BASE_URL}/api/games/{CLASSIC_GAME_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Classic game not found: {response.text}"
        data = response.json()
        assert "home_team_name" in data
        assert "away_team_name" in data
    
    def test_advanced_game_exists(self, auth_headers):
        """Test that Advanced mode test game exists"""
        response = requests.get(
            f"{BASE_URL}/api/games/{ADVANCED_GAME_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Advanced game not found: {response.text}"
        data = response.json()
        assert "home_team_name" in data
        assert "away_team_name" in data
        assert data.get("advanced_mode") == True, "Game should be in advanced mode"
