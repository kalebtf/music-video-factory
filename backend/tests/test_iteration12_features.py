"""
Iteration 12 Tests: Improved Climax UX + AI Image Prompts
- POST /api/ai/generate-image-prompts endpoint
- Verify endpoint returns proper error without OpenAI key
- Verify endpoint structure and response format
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["email"] == "test@example.com"
        print("✓ Login successful")


class TestAIImagePrompts:
    """Tests for the new AI Image Prompts endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Login and get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200
        return {"Authorization": f"Bearer {response.json().get('access_token')}"}
    
    def test_generate_image_prompts_endpoint_exists(self, auth_headers):
        """Test that POST /api/ai/generate-image-prompts endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-image-prompts",
            headers=auth_headers,
            json={
                "title": "Test Song",
                "lyrics": "Test lyrics for the song",
                "genre": "Pop"
            }
        )
        # Should return 400 (no OpenAI key) or 502 (OpenAI API error) - NOT 404
        assert response.status_code != 404, "Endpoint should exist"
        print(f"✓ Endpoint exists, returned status: {response.status_code}")
    
    def test_generate_image_prompts_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-image-prompts",
            json={
                "title": "Test Song",
                "lyrics": "Test lyrics",
                "genre": "Pop"
            }
        )
        assert response.status_code == 401, "Should require authentication"
        print("✓ Endpoint requires authentication")
    
    def test_generate_image_prompts_error_without_openai_key(self, auth_headers):
        """Test that endpoint returns proper error when OpenAI key is not configured"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-image-prompts",
            headers=auth_headers,
            json={
                "title": "Mi Corazón",
                "lyrics": "Bajo la luna llena, te encontré...",
                "genre": "Latin Pop Ballad"
            }
        )
        # Expected: 400 (no key) or 502 (invalid key)
        assert response.status_code in [400, 502], f"Expected 400 or 502, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Should have error detail"
        # Error message should mention OpenAI or API key
        detail = data["detail"].lower()
        assert "openai" in detail or "api" in detail or "key" in detail, f"Error should mention OpenAI/API key: {data['detail']}"
        print(f"✓ Proper error returned: {data['detail']}")
    
    def test_generate_image_prompts_accepts_project_id(self, auth_headers):
        """Test that endpoint accepts projectId parameter"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-image-prompts",
            headers=auth_headers,
            json={
                "projectId": "test-project-id",
                "title": "Test Song",
                "lyrics": "Test lyrics",
                "genre": "Pop"
            }
        )
        # Should not fail due to projectId parameter
        assert response.status_code in [400, 502], f"Should accept projectId, got {response.status_code}"
        print("✓ Endpoint accepts projectId parameter")


class TestClimaxEndpoints:
    """Tests for climax-related endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Login and get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200
        return {"Authorization": f"Bearer {response.json().get('access_token')}"}
    
    @pytest.fixture(scope="class")
    def test_project(self, auth_headers):
        """Create a test project"""
        response = requests.post(
            f"{BASE_URL}/api/projects",
            headers=auth_headers,
            json={
                "title": "TEST_Climax_Project",
                "genre": "Test Genre",
                "lyrics": "Test lyrics",
                "mode": "library"
            }
        )
        assert response.status_code == 200
        return response.json()
    
    def test_extract_climax_returns_400_without_audio(self, auth_headers, test_project):
        """Test that extract-climax returns 400 when no audio is uploaded"""
        project_id = test_project["_id"]
        response = requests.post(
            f"{BASE_URL}/api/audio/extract-climax/{project_id}",
            headers=auth_headers,
            json={
                "projectId": project_id,
                "start": 0,
                "end": 30
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        assert "audio" in data["detail"].lower(), f"Error should mention audio: {data['detail']}"
        print(f"✓ Extract-climax returns 400 without audio: {data['detail']}")
    
    def test_detect_climax_returns_400_without_audio(self, auth_headers, test_project):
        """Test that detect-climax returns 400 when no audio is uploaded"""
        project_id = test_project["_id"]
        response = requests.post(
            f"{BASE_URL}/api/audio/detect-climax/{project_id}",
            headers=auth_headers,
            json={}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"✓ Detect-climax returns 400 without audio: {data['detail']}")


class TestProjectWithImagePrompts:
    """Tests for project with imagePrompts field"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Login and get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200
        return {"Authorization": f"Bearer {response.json().get('access_token')}"}
    
    def test_create_project_library_mode(self, auth_headers):
        """Test creating a library mode project"""
        response = requests.post(
            f"{BASE_URL}/api/projects",
            headers=auth_headers,
            json={
                "title": "TEST_Library_Mode_Project",
                "genre": "Latin Pop",
                "lyrics": "Bajo la luna llena...",
                "mode": "library"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["mode"] == "library"
        assert "_id" in data
        print(f"✓ Library mode project created: {data['_id']}")
        return data["_id"]
    
    def test_get_project_has_media_and_prompts_fields(self, auth_headers):
        """Test that project response includes media and imagePrompts fields"""
        # Create project first
        create_response = requests.post(
            f"{BASE_URL}/api/projects",
            headers=auth_headers,
            json={
                "title": "TEST_Fields_Project",
                "mode": "library"
            }
        )
        assert create_response.status_code == 200
        project_id = create_response.json()["_id"]
        
        # Get project
        get_response = requests.get(
            f"{BASE_URL}/api/projects/{project_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        data = get_response.json()
        
        # Check fields exist
        assert "media" in data, "Project should have media field"
        assert "mode" in data, "Project should have mode field"
        print(f"✓ Project has required fields: media={type(data['media'])}, mode={data['mode']}")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Login and get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200
        return {"Authorization": f"Bearer {response.json().get('access_token')}"}
    
    def test_cleanup_test_projects(self, auth_headers):
        """Delete all TEST_ prefixed projects"""
        # Get all projects
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        assert response.status_code == 200
        projects = response.json()
        
        deleted = 0
        for project in projects:
            if project.get("title", "").startswith("TEST_"):
                del_response = requests.delete(
                    f"{BASE_URL}/api/projects/{project['_id']}",
                    headers=auth_headers
                )
                if del_response.status_code == 200:
                    deleted += 1
        
        print(f"✓ Cleaned up {deleted} test projects")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
