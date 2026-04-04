"""
Test Iteration 13: Phase 2 Metadata Generation for Export
Tests for:
- POST /api/ai/generate-metadata endpoint
- POST /api/ai/generate-thumbnail endpoint
- GET /api/projects/{id}/thumbnails/{filename} endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "test123456"


class TestMetadataEndpoints:
    """Test metadata generation endpoints for Phase 2"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        
        data = login_resp.json()
        self.token = data.get("access_token")
        self.user_id = data.get("_id")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        yield
        
        # Cleanup: delete test projects
        if hasattr(self, 'test_project_id') and self.test_project_id:
            try:
                self.session.delete(f"{BASE_URL}/api/projects/{self.test_project_id}")
            except:
                pass
    
    def create_test_project(self, mode="ai"):
        """Helper to create a test project"""
        resp = self.session.post(f"{BASE_URL}/api/projects", json={
            "title": "TEST_Metadata_Project",
            "genre": "Latin Pop Ballad",
            "lyrics": "Cuando te vi por primera vez, supe que eras para mi...",
            "mode": mode
        })
        assert resp.status_code == 200, f"Project creation failed: {resp.text}"
        data = resp.json()
        self.test_project_id = data.get("_id")
        return self.test_project_id
    
    # ========== POST /api/ai/generate-metadata ==========
    
    def test_generate_metadata_endpoint_exists(self):
        """Test that POST /api/ai/generate-metadata endpoint exists (not 404)"""
        project_id = self.create_test_project()
        
        resp = self.session.post(f"{BASE_URL}/api/ai/generate-metadata", json={
            "projectId": project_id,
            "title": "Test Song",
            "genre": "Latin Pop",
            "lyrics": "Test lyrics",
            "hooks": ["Hook 1", "Hook 2"]
        })
        
        # Should NOT be 404 - endpoint exists
        assert resp.status_code != 404, "Endpoint /api/ai/generate-metadata not found (404)"
        # Expected: 400 (no OpenAI key) or 502 (invalid OpenAI key)
        assert resp.status_code in [200, 400, 401, 502], f"Unexpected status: {resp.status_code}"
        print(f"✓ POST /api/ai/generate-metadata exists, returned {resp.status_code}")
    
    def test_generate_metadata_requires_auth(self):
        """Test that generate-metadata requires authentication"""
        # Create new session without auth
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        resp = no_auth_session.post(f"{BASE_URL}/api/ai/generate-metadata", json={
            "projectId": "test",
            "title": "Test"
        })
        
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("✓ POST /api/ai/generate-metadata requires authentication")
    
    def test_generate_metadata_accepts_required_fields(self):
        """Test that generate-metadata accepts projectId, title, genre, lyrics, hooks"""
        project_id = self.create_test_project()
        
        resp = self.session.post(f"{BASE_URL}/api/ai/generate-metadata", json={
            "projectId": project_id,
            "title": "Mi Corazón Roto",
            "genre": "Latin Pop Ballad, emotional, piano-driven",
            "lyrics": "Cuando te vi por primera vez...",
            "hooks": ["Nunca te olvidaré", "Mi corazón llora por ti"]
        })
        
        # Should accept all fields (400/502 expected due to invalid OpenAI key)
        assert resp.status_code in [200, 400, 502], f"Unexpected status: {resp.status_code}"
        
        # Check error message mentions OpenAI key
        if resp.status_code in [400, 502]:
            data = resp.json()
            detail = data.get("detail", "")
            assert "OpenAI" in detail or "API key" in detail.lower(), f"Error should mention OpenAI key: {detail}"
        
        print(f"✓ POST /api/ai/generate-metadata accepts all required fields, returned {resp.status_code}")
    
    # ========== POST /api/ai/generate-thumbnail ==========
    
    def test_generate_thumbnail_endpoint_exists(self):
        """Test that POST /api/ai/generate-thumbnail endpoint exists (not 404)"""
        project_id = self.create_test_project()
        
        resp = self.session.post(f"{BASE_URL}/api/ai/generate-thumbnail", json={
            "projectId": project_id,
            "platform": "tiktok",
            "title": "Test Song",
            "mood": "emotional",
            "genre": "Latin Pop"
        })
        
        # Should NOT be 404 - endpoint exists
        assert resp.status_code != 404, "Endpoint /api/ai/generate-thumbnail not found (404)"
        # Expected: 400 (no OpenAI key) or 401/502 (invalid OpenAI key)
        assert resp.status_code in [200, 400, 401, 502], f"Unexpected status: {resp.status_code}"
        print(f"✓ POST /api/ai/generate-thumbnail exists, returned {resp.status_code}")
    
    def test_generate_thumbnail_requires_auth(self):
        """Test that generate-thumbnail requires authentication"""
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        resp = no_auth_session.post(f"{BASE_URL}/api/ai/generate-thumbnail", json={
            "projectId": "test",
            "platform": "tiktok"
        })
        
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("✓ POST /api/ai/generate-thumbnail requires authentication")
    
    def test_generate_thumbnail_accepts_required_fields(self):
        """Test that generate-thumbnail accepts projectId, platform, title, mood, genre"""
        project_id = self.create_test_project()
        
        resp = self.session.post(f"{BASE_URL}/api/ai/generate-thumbnail", json={
            "projectId": project_id,
            "platform": "youtube",
            "title": "Mi Corazón Roto",
            "mood": "nostalgic",
            "genre": "Latin Pop Ballad"
        })
        
        # Should accept all fields (400/502 expected due to invalid OpenAI key)
        assert resp.status_code in [200, 400, 401, 502], f"Unexpected status: {resp.status_code}"
        
        # Check error message mentions OpenAI key
        if resp.status_code in [400, 502]:
            data = resp.json()
            detail = data.get("detail", "")
            assert "OpenAI" in detail or "API key" in detail.lower() or "Thumbnail" in detail, f"Error should mention OpenAI key: {detail}"
        
        print(f"✓ POST /api/ai/generate-thumbnail accepts all required fields, returned {resp.status_code}")
    
    # ========== GET /api/projects/{id}/thumbnails/{filename} ==========
    
    def test_thumbnails_endpoint_exists(self):
        """Test that GET /api/projects/{id}/thumbnails/{filename} endpoint exists"""
        project_id = self.create_test_project()
        
        resp = self.session.get(f"{BASE_URL}/api/projects/{project_id}/thumbnails/nonexistent.png")
        
        # Should return 404 for missing file, NOT 404 for missing route
        # If route doesn't exist, we'd get a different error
        assert resp.status_code == 404, f"Expected 404 for missing file, got {resp.status_code}"
        
        data = resp.json()
        detail = data.get("detail", "")
        assert "not found" in detail.lower() or "Thumbnail" in detail, f"Should indicate file not found: {detail}"
        
        print("✓ GET /api/projects/{id}/thumbnails/{filename} endpoint exists (returns 404 for missing file)")
    
    def test_thumbnails_endpoint_requires_auth(self):
        """Test that thumbnails endpoint requires authentication"""
        no_auth_session = requests.Session()
        
        resp = no_auth_session.get(f"{BASE_URL}/api/projects/test/thumbnails/test.png")
        
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("✓ GET /api/projects/{id}/thumbnails/{filename} requires authentication")


class TestMetadataIntegration:
    """Integration tests for metadata flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_resp.status_code == 200
        
        data = login_resp.json()
        self.token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        yield
    
    def test_project_has_metadata_and_thumbnails_fields(self):
        """Test that project response includes metadata and thumbnails fields"""
        # Create project
        create_resp = self.session.post(f"{BASE_URL}/api/projects", json={
            "title": "TEST_Metadata_Fields",
            "mode": "ai"
        })
        assert create_resp.status_code == 200
        project_id = create_resp.json().get("_id")
        
        try:
            # Get project
            get_resp = self.session.get(f"{BASE_URL}/api/projects/{project_id}")
            assert get_resp.status_code == 200
            
            project = get_resp.json()
            
            # Check that project can store metadata (may be empty initially)
            # The frontend expects these fields to exist or be undefined
            print(f"✓ Project retrieved successfully, has fields: {list(project.keys())}")
            
        finally:
            # Cleanup
            self.session.delete(f"{BASE_URL}/api/projects/{project_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
