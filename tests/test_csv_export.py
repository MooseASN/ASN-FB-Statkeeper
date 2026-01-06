"""
Test CSV Export for Team Stats Comparison
Tests the /api/games/{game_id}/team-comparison/csv endpoint
"""
import pytest
import requests
import os
import csv
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test game ID provided in the task
TEST_GAME_ID = "2d43db80-dc75-4b8c-a1c6-b1cc4115c97e"


class TestTeamComparisonCSV:
    """Tests for the team comparison CSV endpoint"""
    
    def test_csv_endpoint_returns_200(self):
        """Test that CSV endpoint returns 200 status code"""
        response = requests.get(f"{BASE_URL}/api/games/{TEST_GAME_ID}/team-comparison/csv")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ CSV endpoint returns 200 status code")
    
    def test_csv_content_type(self):
        """Test that response has correct content type"""
        response = requests.get(f"{BASE_URL}/api/games/{TEST_GAME_ID}/team-comparison/csv")
        assert response.status_code == 200
        content_type = response.headers.get('content-type', '')
        assert 'text/csv' in content_type, f"Expected text/csv, got {content_type}"
        print(f"✓ Content-Type is text/csv")
    
    def test_csv_has_three_rows(self):
        """Test that CSV has exactly 3 rows"""
        response = requests.get(f"{BASE_URL}/api/games/{TEST_GAME_ID}/team-comparison/csv")
        assert response.status_code == 200
        
        csv_content = response.text
        reader = csv.reader(io.StringIO(csv_content))
        rows = list(reader)
        
        assert len(rows) == 3, f"Expected 3 rows, got {len(rows)}"
        print(f"✓ CSV has exactly 3 rows")
    
    def test_csv_row1_home_team_stats(self):
        """Test Row 1: Home team name and stats"""
        response = requests.get(f"{BASE_URL}/api/games/{TEST_GAME_ID}/team-comparison/csv")
        assert response.status_code == 200
        
        csv_content = response.text
        reader = csv.reader(io.StringIO(csv_content))
        rows = list(reader)
        
        row1 = rows[0]
        # Row 1 should have 7 columns: Team Name, FG, 3PT, FT, REBOUNDS, TURNOVERS, LARGEST LEAD
        assert len(row1) == 7, f"Row 1 should have 7 columns, got {len(row1)}"
        
        # First column should be home team name (non-empty)
        assert row1[0], "Home team name should not be empty"
        
        # Stats should be in format "X/Y" for FG, 3PT, FT
        assert '/' in row1[1], f"FG should be in X/Y format, got {row1[1]}"
        assert '/' in row1[2], f"3PT should be in X/Y format, got {row1[2]}"
        assert '/' in row1[3], f"FT should be in X/Y format, got {row1[3]}"
        
        print(f"✓ Row 1 (Home): {row1}")
    
    def test_csv_row2_stat_titles(self):
        """Test Row 2: Stat titles"""
        response = requests.get(f"{BASE_URL}/api/games/{TEST_GAME_ID}/team-comparison/csv")
        assert response.status_code == 200
        
        csv_content = response.text
        reader = csv.reader(io.StringIO(csv_content))
        rows = list(reader)
        
        row2 = rows[1]
        # Row 2 should have 7 columns: Stat, FG, 3PT, FT, REBOUNDS, TURNOVERS, LARGEST LEAD
        assert len(row2) == 7, f"Row 2 should have 7 columns, got {len(row2)}"
        
        # First column should be "Stat"
        assert row2[0] == "Stat", f"First column should be 'Stat', got {row2[0]}"
        
        # Check stat titles
        expected_titles = ["FG", "3PT", "FT", "REBOUNDS", "TURNOVERS", "LARGEST LEAD"]
        for i, title in enumerate(expected_titles):
            assert row2[i+1] == title, f"Expected '{title}' at position {i+1}, got '{row2[i+1]}'"
        
        print(f"✓ Row 2 (Titles): {row2}")
    
    def test_csv_row3_away_team_stats(self):
        """Test Row 3: Away team name and stats"""
        response = requests.get(f"{BASE_URL}/api/games/{TEST_GAME_ID}/team-comparison/csv")
        assert response.status_code == 200
        
        csv_content = response.text
        reader = csv.reader(io.StringIO(csv_content))
        rows = list(reader)
        
        row3 = rows[2]
        # Row 3 should have 7 columns: Team Name, FG, 3PT, FT, REBOUNDS, TURNOVERS, LARGEST LEAD
        assert len(row3) == 7, f"Row 3 should have 7 columns, got {len(row3)}"
        
        # First column should be away team name (non-empty)
        assert row3[0], "Away team name should not be empty"
        
        # Stats should be in format "X/Y" for FG, 3PT, FT
        assert '/' in row3[1], f"FG should be in X/Y format, got {row3[1]}"
        assert '/' in row3[2], f"3PT should be in X/Y format, got {row3[2]}"
        assert '/' in row3[3], f"FT should be in X/Y format, got {row3[3]}"
        
        print(f"✓ Row 3 (Away): {row3}")
    
    def test_csv_nonexistent_game_returns_404(self):
        """Test that nonexistent game returns 404"""
        response = requests.get(f"{BASE_URL}/api/games/nonexistent-game-id/team-comparison/csv")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Nonexistent game returns 404")
    
    def test_csv_content_disposition_header(self):
        """Test that response has Content-Disposition header for download"""
        response = requests.get(f"{BASE_URL}/api/games/{TEST_GAME_ID}/team-comparison/csv")
        assert response.status_code == 200
        
        content_disposition = response.headers.get('content-disposition', '')
        assert 'attachment' in content_disposition, f"Expected attachment in Content-Disposition, got {content_disposition}"
        assert '.csv' in content_disposition, f"Expected .csv in filename, got {content_disposition}"
        print(f"✓ Content-Disposition header is correct: {content_disposition}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
