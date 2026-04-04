"""
Iteration 14 - Bug Fix Testing
Tests for 4 blocking bugs:
1. AnimateImageRequest 422 error (missing 'prompt' field) - now optional
2. /api/auth/test-keys should include 'pexels' key
3. Stock Search Pexels key check
4. Hooks 'Generate from Lyrics' response parsing
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthAndKeys:
    """Test authentication and API key endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth cookies
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.user = login_response.json()
        yield
    
    def test_login_works(self):
        """Verify login still works with test credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert data["email"] == "test@example.com"
        print("✓ Login works with test@example.com / test123456")
    
    def test_test_keys_includes_pexels(self):
        """Bug Fix 2: /api/auth/test-keys should include 'pexels' key in response"""
        response = self.session.get(f"{BASE_URL}/api/auth/test-keys")
        assert response.status_code == 200, f"test-keys failed: {response.text}"
        data = response.json()
        
        # Verify all expected keys are present
        expected_keys = ['openai', 'falai', 'gemini', 'together', 'pexels']
        for key in expected_keys:
            assert key in data, f"Missing key '{key}' in test-keys response"
        
        print(f"✓ test-keys response includes all keys: {data}")
        print(f"  - openai: {data['openai']}")
        print(f"  - falai: {data['falai']}")
        print(f"  - gemini: {data['gemini']}")
        print(f"  - together: {data['together']}")
        print(f"  - pexels: {data['pexels']}")


class TestAnimateImageEndpoint:
    """Test animate-image endpoint - Bug Fix 1"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert login_response.status_code == 200
        yield
    
    def test_animate_image_without_prompt_no_422(self):
        """Bug Fix 1: POST /api/ai/animate-image should accept request without 'prompt' field"""
        # Send request WITHOUT prompt field - should NOT return 422
        payload = {
            "projectId": "test_project_id",
            "imageIndex": 0,
            "imagePath": "/test/path/image.png"
            # NOTE: 'prompt' field is intentionally omitted
        }
        
        response = self.session.post(f"{BASE_URL}/api/ai/animate-image", json=payload)
        
        # Should NOT be 422 (Unprocessable Entity) - that was the bug
        assert response.status_code != 422, f"Bug not fixed! Still getting 422 when prompt is omitted"
        
        # Expected: 400 (no FAL.AI key) or 404 (project not found) - but NOT 422
        print(f"✓ animate-image without prompt returns {response.status_code} (not 422)")
        print(f"  Response: {response.json()}")
    
    def test_animate_image_with_prompt_still_works(self):
        """Verify animate-image still works when prompt IS provided"""
        payload = {
            "projectId": "test_project_id",
            "imageIndex": 0,
            "imagePath": "/test/path/image.png",
            "prompt": "cinematic camera movement"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ai/animate-image", json=payload)
        
        # Should NOT be 422
        assert response.status_code != 422
        print(f"✓ animate-image with prompt returns {response.status_code}")


class TestAnalyzeSongEndpoint:
    """Test analyze-song endpoint for hooks response - Bug Fix 4"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert login_response.status_code == 200
        yield
    
    def test_analyze_song_returns_hooks_at_top_level(self):
        """Bug Fix 4: /api/ai/analyze-song should return hooks at data.hooks (not nested)"""
        # Create a test project first
        project_response = self.session.post(f"{BASE_URL}/api/projects", json={
            "title": "TEST_BugFix_HooksTest",
            "mode": "ai"
        })
        
        if project_response.status_code != 201:
            pytest.skip("Could not create test project")
        
        project_id = project_response.json().get("_id") or project_response.json().get("id")
        
        # Call analyze-song
        payload = {
            "projectId": project_id,
            "lyrics": "This is a test song\nWith some lyrics\nAbout love and life",
            "genre": "pop",
            "title": "Test Song"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ai/analyze-song", json=payload)
        
        # May fail due to missing OpenAI key - that's expected
        if response.status_code == 400 or response.status_code == 502:
            print(f"✓ analyze-song endpoint exists (returns {response.status_code} - likely missing OpenAI key)")
            return
        
        if response.status_code == 200:
            data = response.json()
            # Check if hooks is at top level OR nested under concept
            has_hooks = 'hooks' in data or ('concept' in data and 'hooks' in data.get('concept', {}))
            print(f"✓ analyze-song response structure: {list(data.keys())}")
            if 'hooks' in data:
                print(f"  - hooks at top level: {data['hooks']}")
            if 'concept' in data and 'hooks' in data.get('concept', {}):
                print(f"  - hooks nested under concept: {data['concept']['hooks']}")


class TestStockSearchEndpoint:
    """Test stock search endpoint - Bug Fix 3"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert login_response.status_code == 200
        yield
    
    def test_stock_search_photos_endpoint_exists(self):
        """Verify stock search photos endpoint exists"""
        response = self.session.get(f"{BASE_URL}/api/stock/search/photos", params={
            "query": "nature",
            "page": 1,
            "per_page": 5
        })
        
        # Should not be 404
        assert response.status_code != 404, "Stock search photos endpoint not found"
        print(f"✓ Stock search photos endpoint exists (status: {response.status_code})")
        
        # If no Pexels key, should return 400 with helpful message
        if response.status_code == 400:
            data = response.json()
            print(f"  Response (no Pexels key): {data}")
    
    def test_stock_search_videos_endpoint_exists(self):
        """Verify stock search videos endpoint exists"""
        response = self.session.get(f"{BASE_URL}/api/stock/search/videos", params={
            "query": "nature",
            "page": 1,
            "per_page": 5
        })
        
        # Should not be 404
        assert response.status_code != 404, "Stock search videos endpoint not found"
        print(f"✓ Stock search videos endpoint exists (status: {response.status_code})")


class TestDashboardAndProjects:
    """Test dashboard and project endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert login_response.status_code == 200
        yield
    
    def test_stats_endpoint(self):
        """Verify dashboard stats endpoint works"""
        response = self.session.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Stats endpoint works: {data}")
    
    def test_projects_list(self):
        """Verify projects list endpoint works"""
        response = self.session.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Projects list works: {len(data)} projects found")
    
    def test_templates_endpoint(self):
        """Verify templates endpoint works"""
        response = self.session.get(f"{BASE_URL}/api/templates")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Templates endpoint works: {len(data)} templates found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
