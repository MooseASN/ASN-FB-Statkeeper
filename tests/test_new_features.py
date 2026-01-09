"""
Test new features for StatMoose:
1. Season creation with gender and level fields
2. Edit Season (update name, delete with password)
3. School ID code system with search
4. Link roster import endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "antlermedia2003@gmail.com"
TEST_PASSWORD = "NoahTheJew1997"


class TestAuthentication:
    """Test login and get session token"""
    
    @pytest.fixture(scope="class")
    def session_token(self):
        """Login and get session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, "No session token in response"
        return data["session_token"]
    
    def test_login_success(self, session_token):
        """Verify login works"""
        assert session_token is not None
        print(f"✓ Login successful, got session token")


class TestSchoolDashboard:
    """Test school dashboard and school code"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["session_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_my_school(self, auth_headers):
        """Test getting school info including school_code"""
        response = requests.get(f"{BASE_URL}/api/schools/my-school", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get school: {response.text}"
        data = response.json()
        
        # Verify school_code is present
        assert "school_code" in data, "school_code not in response"
        assert data["school_code"] is not None, "school_code is None"
        print(f"✓ School code: {data['school_code']}")
        print(f"✓ School name: {data.get('name')}")
        return data
    
    def test_school_code_format(self, auth_headers):
        """Verify school code format (3-10 alphanumeric chars)"""
        response = requests.get(f"{BASE_URL}/api/schools/my-school", headers=auth_headers)
        data = response.json()
        school_code = data.get("school_code", "")
        
        assert len(school_code) >= 3, f"School code too short: {school_code}"
        assert len(school_code) <= 10, f"School code too long: {school_code}"
        assert school_code.isalnum(), f"School code not alphanumeric: {school_code}"
        print(f"✓ School code format valid: {school_code}")


class TestSchoolSearch:
    """Test school search functionality"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["session_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_search_by_name(self, auth_headers):
        """Test searching schools by name"""
        response = requests.get(
            f"{BASE_URL}/api/schools/search?q=Moose",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Found {len(data)} schools matching 'Moose'")
        
        if len(data) > 0:
            school = data[0]
            assert "school_id" in school
            assert "school_code" in school
            assert "name" in school
            print(f"✓ First result: {school['name']} (code: {school['school_code']})")
    
    def test_search_by_code(self, auth_headers):
        """Test searching schools by school code"""
        # First get our school code
        school_res = requests.get(f"{BASE_URL}/api/schools/my-school", headers=auth_headers)
        school_code = school_res.json().get("school_code", "MOOSEA")
        
        response = requests.get(
            f"{BASE_URL}/api/schools/search?q={school_code}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Search by code failed: {response.text}"
        data = response.json()
        
        assert len(data) > 0, f"No results for code {school_code}"
        print(f"✓ Found school by code {school_code}: {data[0]['name']}")
    
    def test_search_with_sport_filter(self, auth_headers):
        """Test searching with sport/gender/level filters"""
        response = requests.get(
            f"{BASE_URL}/api/schools/search?q=Moose&sport=basketball&gender=men&level=varsity",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Filtered search failed: {response.text}"
        data = response.json()
        
        if len(data) > 0:
            school = data[0]
            assert "matching_seasons" in school, "matching_seasons not in response"
            print(f"✓ Search with filters returned {len(data)} schools")
            print(f"✓ First school has {len(school.get('matching_seasons', []))} matching seasons")


class TestSeasonCreation:
    """Test season creation with gender and level fields"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["session_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def school_id(self, auth_headers):
        """Get school ID"""
        response = requests.get(f"{BASE_URL}/api/schools/my-school", headers=auth_headers)
        return response.json()["school_id"]
    
    def test_create_season_with_gender_level(self, auth_headers, school_id):
        """Test creating a season with gender and level fields"""
        import uuid
        season_name = f"TEST_Season_{uuid.uuid4().hex[:6]}"
        
        response = requests.post(
            f"{BASE_URL}/api/schools/{school_id}/seasons",
            headers=auth_headers,
            json={
                "name": season_name,
                "sport": "basketball",
                "gender": "women",
                "level": "subvarsity"
            }
        )
        assert response.status_code == 200, f"Create season failed: {response.text}"
        data = response.json()
        
        assert "season_id" in data, "No season_id in response"
        assert data["gender"] == "women", f"Gender mismatch: {data.get('gender')}"
        assert data["level"] == "subvarsity", f"Level mismatch: {data.get('level')}"
        print(f"✓ Created season with gender={data['gender']}, level={data['level']}")
        
        # Store for cleanup
        return data["season_id"]
    
    def test_create_season_men_varsity(self, auth_headers, school_id):
        """Test creating a men's varsity season"""
        import uuid
        season_name = f"TEST_MenVarsity_{uuid.uuid4().hex[:6]}"
        
        response = requests.post(
            f"{BASE_URL}/api/schools/{school_id}/seasons",
            headers=auth_headers,
            json={
                "name": season_name,
                "sport": "football",
                "gender": "men",
                "level": "varsity"
            }
        )
        assert response.status_code == 200, f"Create season failed: {response.text}"
        data = response.json()
        
        assert data["gender"] == "men"
        assert data["level"] == "varsity"
        print(f"✓ Created men's varsity football season")
        return data["season_id"]
    
    def test_invalid_gender_rejected(self, auth_headers, school_id):
        """Test that invalid gender is rejected"""
        response = requests.post(
            f"{BASE_URL}/api/schools/{school_id}/seasons",
            headers=auth_headers,
            json={
                "name": "Invalid Gender Test",
                "sport": "basketball",
                "gender": "invalid",
                "level": "varsity"
            }
        )
        assert response.status_code == 400, f"Should reject invalid gender: {response.status_code}"
        print(f"✓ Invalid gender correctly rejected")
    
    def test_invalid_level_rejected(self, auth_headers, school_id):
        """Test that invalid level is rejected"""
        response = requests.post(
            f"{BASE_URL}/api/schools/{school_id}/seasons",
            headers=auth_headers,
            json={
                "name": "Invalid Level Test",
                "sport": "basketball",
                "gender": "men",
                "level": "invalid"
            }
        )
        assert response.status_code == 400, f"Should reject invalid level: {response.status_code}"
        print(f"✓ Invalid level correctly rejected")


class TestSeasonUpdate:
    """Test season update (edit name)"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["session_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def school_id(self, auth_headers):
        """Get school ID"""
        response = requests.get(f"{BASE_URL}/api/schools/my-school", headers=auth_headers)
        return response.json()["school_id"]
    
    @pytest.fixture(scope="class")
    def test_season(self, auth_headers, school_id):
        """Create a test season for update tests"""
        import uuid
        season_name = f"TEST_UpdateSeason_{uuid.uuid4().hex[:6]}"
        
        response = requests.post(
            f"{BASE_URL}/api/schools/{school_id}/seasons",
            headers=auth_headers,
            json={
                "name": season_name,
                "sport": "basketball",
                "gender": "men",
                "level": "varsity"
            }
        )
        return response.json()
    
    def test_update_season_name(self, auth_headers, school_id, test_season):
        """Test updating season name"""
        season_id = test_season["season_id"]
        new_name = f"UPDATED_{test_season['name']}"
        
        response = requests.put(
            f"{BASE_URL}/api/schools/{school_id}/seasons/{season_id}",
            headers=auth_headers,
            json={"name": new_name}
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        # Verify update
        get_response = requests.get(
            f"{BASE_URL}/api/schools/{school_id}/seasons/{season_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["name"] == new_name, f"Name not updated: {data['name']}"
        print(f"✓ Season name updated to: {new_name}")


class TestSeasonDelete:
    """Test season deletion with password confirmation"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["session_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def school_id(self, auth_headers):
        """Get school ID"""
        response = requests.get(f"{BASE_URL}/api/schools/my-school", headers=auth_headers)
        return response.json()["school_id"]
    
    def test_delete_season_wrong_password(self, auth_headers, school_id):
        """Test that wrong password is rejected"""
        import uuid
        # Create a season to delete
        season_name = f"TEST_DeleteWrongPwd_{uuid.uuid4().hex[:6]}"
        create_response = requests.post(
            f"{BASE_URL}/api/schools/{school_id}/seasons",
            headers=auth_headers,
            json={
                "name": season_name,
                "sport": "basketball",
                "gender": "men",
                "level": "varsity"
            }
        )
        season_id = create_response.json()["season_id"]
        
        # Try to delete with wrong password
        response = requests.delete(
            f"{BASE_URL}/api/schools/{school_id}/seasons/{season_id}",
            headers=auth_headers,
            json={"password": "wrongpassword123"}
        )
        assert response.status_code == 401, f"Should reject wrong password: {response.status_code}"
        print(f"✓ Wrong password correctly rejected for delete")
    
    def test_delete_season_correct_password(self, auth_headers, school_id):
        """Test deleting season with correct password"""
        import uuid
        # Create a season to delete
        season_name = f"TEST_DeleteCorrect_{uuid.uuid4().hex[:6]}"
        create_response = requests.post(
            f"{BASE_URL}/api/schools/{school_id}/seasons",
            headers=auth_headers,
            json={
                "name": season_name,
                "sport": "basketball",
                "gender": "men",
                "level": "varsity"
            }
        )
        season_id = create_response.json()["season_id"]
        
        # Delete with correct password
        response = requests.delete(
            f"{BASE_URL}/api/schools/{school_id}/seasons/{season_id}",
            headers=auth_headers,
            json={"password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Delete failed: {response.text}"
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/schools/{school_id}/seasons/{season_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 404, "Season should be deleted"
        print(f"✓ Season deleted successfully with correct password")


class TestLinkRosterImport:
    """Test link roster import endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["session_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_scrape_roster_endpoint_exists(self, auth_headers):
        """Test if scrape-roster endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/team/scrape-roster",
            headers=auth_headers,
            json={"url": "https://example.com/roster"}
        )
        # Should not be 404 (endpoint exists)
        # May be 400 or 500 if scraping fails, but endpoint should exist
        if response.status_code == 404:
            print(f"✗ /api/team/scrape-roster endpoint NOT FOUND (404)")
            pytest.fail("scrape-roster endpoint does not exist")
        else:
            print(f"✓ /api/team/scrape-roster endpoint exists (status: {response.status_code})")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["session_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def school_id(self, auth_headers):
        """Get school ID"""
        response = requests.get(f"{BASE_URL}/api/schools/my-school", headers=auth_headers)
        return response.json()["school_id"]
    
    def test_cleanup_test_seasons(self, auth_headers, school_id):
        """Clean up TEST_ prefixed seasons"""
        # Get all seasons
        response = requests.get(
            f"{BASE_URL}/api/schools/{school_id}/seasons",
            headers=auth_headers
        )
        seasons = response.json()
        
        deleted_count = 0
        for season in seasons:
            if season.get("name", "").startswith("TEST_"):
                delete_response = requests.delete(
                    f"{BASE_URL}/api/schools/{school_id}/seasons/{season['season_id']}",
                    headers=auth_headers,
                    json={"password": TEST_PASSWORD}
                )
                if delete_response.status_code == 200:
                    deleted_count += 1
        
        print(f"✓ Cleaned up {deleted_count} test seasons")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
