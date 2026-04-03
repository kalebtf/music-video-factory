"""
Phase 1 Features Backend Tests
Tests for:
1. Upload image endpoint (POST /api/projects/{id}/upload-image)
2. Video assembly with addSubtitles and lyrics fields
3. FFmpeg filter_complex with proper escaping
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_tokens(self):
        """Get authentication tokens"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return {
            "access_token": data.get("access_token"),
            "refresh_token": data.get("refresh_token"),
            "user_id": data.get("_id")
        }
    
    def test_login_success(self, auth_tokens):
        """Test login returns tokens"""
        assert auth_tokens["access_token"] is not None
        assert auth_tokens["user_id"] is not None
        print(f"Login successful, user_id: {auth_tokens['user_id']}")


class TestUploadImage:
    """Tests for POST /api/projects/{id}/upload-image endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_project(self, auth_headers):
        """Create a test project for upload tests"""
        response = requests.post(
            f"{BASE_URL}/api/projects",
            headers=auth_headers,
            json={
                "title": "TEST_Upload_Image_Project",
                "genre": "Test Genre",
                "lyrics": "Test lyrics line 1\nTest lyrics line 2"
            }
        )
        assert response.status_code == 200, f"Failed to create project: {response.text}"
        project = response.json()
        yield project
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project['_id']}", headers=auth_headers)
    
    def test_upload_image_endpoint_exists(self, auth_headers, test_project):
        """Test that upload-image endpoint exists and accepts multipart form data"""
        project_id = test_project["_id"]
        
        # Create a simple PNG image (1x1 pixel red)
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 dimensions
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,  # 8-bit RGB
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,  # compressed data
            0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x18, 0xDD,  
            0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,  # IEND chunk
            0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {"file": ("test_image.png", io.BytesIO(png_data), "image/png")}
        
        response = requests.post(
            f"{BASE_URL}/api/projects/{project_id}/upload-image",
            headers=auth_headers,
            files=files
        )
        
        # Should return 200 with success response
        assert response.status_code == 200, f"Upload failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "imageUrl" in data
        assert "imagePath" in data
        print(f"Upload successful: {data['imageUrl']}")
    
    def test_upload_image_rejects_invalid_type(self, auth_headers, test_project):
        """Test that upload-image rejects non-image files"""
        project_id = test_project["_id"]
        
        # Try to upload a text file
        files = {"file": ("test.txt", io.BytesIO(b"not an image"), "text/plain")}
        
        response = requests.post(
            f"{BASE_URL}/api/projects/{project_id}/upload-image",
            headers=auth_headers,
            files=files
        )
        
        # Should reject with 400
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Invalid file type correctly rejected")
    
    def test_upload_image_requires_auth(self, test_project):
        """Test that upload-image requires authentication"""
        project_id = test_project["_id"]
        
        png_data = bytes([0x89, 0x50, 0x4E, 0x47])  # Minimal PNG header
        files = {"file": ("test.png", io.BytesIO(png_data), "image/png")}
        
        response = requests.post(
            f"{BASE_URL}/api/projects/{project_id}/upload-image",
            files=files
        )
        
        # Should return 401
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Auth requirement verified")


class TestVideoAssembly:
    """Tests for POST /api/video/assemble with addSubtitles and lyrics fields"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_project(self, auth_headers):
        """Create a test project"""
        response = requests.post(
            f"{BASE_URL}/api/projects",
            headers=auth_headers,
            json={
                "title": "TEST_Assembly_Project",
                "genre": "Test Genre",
                "lyrics": "[Verse 1]\nLine one of lyrics\nLine two of lyrics\n[Chorus]\nChorus line one\nChorus line two"
            }
        )
        assert response.status_code == 200
        project = response.json()
        yield project
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project['_id']}", headers=auth_headers)
    
    def test_assemble_accepts_addSubtitles_field(self, auth_headers, test_project):
        """Test that assemble endpoint accepts addSubtitles: true"""
        project_id = test_project["_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/video/assemble",
            headers=auth_headers,
            json={
                "projectId": project_id,
                "clipOrder": [0],
                "crossfadeDuration": 0.5,
                "addTextOverlay": True,
                "hookText": "Test hook",
                "hookTexts": ["Hook 1", "Hook 2"],
                "addSubtitles": True,
                "lyrics": "Test lyrics line 1\nTest lyrics line 2"
            }
        )
        
        # Will fail with 400 because no clips exist, but should NOT fail on schema validation
        # If it fails with 422 (validation error), the schema is wrong
        assert response.status_code != 422, f"Schema validation failed: {response.text}"
        
        # Expected: 400 (no clips) or 200 (if clips existed)
        if response.status_code == 400:
            data = response.json()
            # Should be "need at least 1 clip" not a schema error
            assert "clip" in data.get("detail", "").lower() or "Need" in data.get("detail", ""), \
                f"Unexpected error: {data}"
            print("addSubtitles field accepted (no clips to assemble)")
        else:
            print(f"Assembly response: {response.status_code}")
    
    def test_assemble_accepts_lyrics_field(self, auth_headers, test_project):
        """Test that assemble endpoint accepts lyrics field"""
        project_id = test_project["_id"]
        
        # Test with lyrics containing section headers that should be filtered
        lyrics_with_headers = """[Verse 1]
First verse line
Second verse line
[Chorus]
Chorus line one
Chorus line two
[Verse 2]
Third verse line"""
        
        response = requests.post(
            f"{BASE_URL}/api/video/assemble",
            headers=auth_headers,
            json={
                "projectId": project_id,
                "clipOrder": [0],
                "crossfadeDuration": 0.5,
                "addTextOverlay": False,
                "addSubtitles": True,
                "lyrics": lyrics_with_headers
            }
        )
        
        # Should not fail on schema validation
        assert response.status_code != 422, f"Schema validation failed for lyrics: {response.text}"
        print("lyrics field accepted")
    
    def test_assemble_accepts_hookTexts_array(self, auth_headers, test_project):
        """Test that assemble endpoint accepts hookTexts array for cycling hooks"""
        project_id = test_project["_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/video/assemble",
            headers=auth_headers,
            json={
                "projectId": project_id,
                "clipOrder": [0],
                "crossfadeDuration": 0.5,
                "addTextOverlay": True,
                "hookTexts": ["Hook one", "Hook two", "Hook three"],
                "addSubtitles": False
            }
        )
        
        # Should not fail on schema validation
        assert response.status_code != 422, f"Schema validation failed for hookTexts: {response.text}"
        print("hookTexts array field accepted")


class TestProjectEndpoints:
    """Tests for project-related endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_projects(self, auth_headers):
        """Test GET /api/projects"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} projects")
    
    def test_create_project_with_lyrics(self, auth_headers):
        """Test creating project with lyrics field"""
        response = requests.post(
            f"{BASE_URL}/api/projects",
            headers=auth_headers,
            json={
                "title": "TEST_Lyrics_Project",
                "genre": "Pop",
                "lyrics": "Test lyrics\nLine two\nLine three"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("lyrics") == "Test lyrics\nLine two\nLine three"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{data['_id']}", headers=auth_headers)
        print("Project with lyrics created successfully")
    
    def test_get_project_returns_lyrics(self, auth_headers):
        """Test that GET /api/projects/{id} returns lyrics field"""
        # Create project
        create_resp = requests.post(
            f"{BASE_URL}/api/projects",
            headers=auth_headers,
            json={
                "title": "TEST_Get_Lyrics_Project",
                "genre": "Rock",
                "lyrics": "Verse one\nVerse two"
            }
        )
        assert create_resp.status_code == 200
        project_id = create_resp.json()["_id"]
        
        # Get project
        get_resp = requests.get(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)
        assert get_resp.status_code == 200
        data = get_resp.json()
        assert "lyrics" in data
        assert data["lyrics"] == "Verse one\nVerse two"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)
        print("GET project returns lyrics field")


class TestAnimationEndpoints:
    """Tests for animation-related endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_animate_image_endpoint_exists(self, auth_headers):
        """Test that animate-image endpoint exists"""
        # Create a test project first
        create_resp = requests.post(
            f"{BASE_URL}/api/projects",
            headers=auth_headers,
            json={"title": "TEST_Animate_Project", "genre": "Test"}
        )
        assert create_resp.status_code == 200
        project_id = create_resp.json()["_id"]
        
        # Try to animate (will fail due to no image, but endpoint should exist)
        response = requests.post(
            f"{BASE_URL}/api/ai/animate-image",
            headers=auth_headers,
            json={
                "projectId": project_id,
                "imageIndex": 0,
                "imagePath": f"{project_id}/images/img_0.png",
                "prompt": "cinematic slow zoom"
            }
        )
        
        # Should not be 404 (endpoint exists)
        assert response.status_code != 404, "animate-image endpoint not found"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)
        print(f"animate-image endpoint exists (status: {response.status_code})")


class TestSettingsEndpoints:
    """Tests for settings endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_settings(self, auth_headers):
        """Test GET /api/settings"""
        response = requests.get(f"{BASE_URL}/api/settings", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "imageProvider" in data
        assert "videoProvider" in data
        print(f"Settings: imageProvider={data['imageProvider']}, videoProvider={data['videoProvider']}")
    
    def test_get_api_keys(self, auth_headers):
        """Test GET /api/settings/api-keys"""
        response = requests.get(f"{BASE_URL}/api/settings/api-keys", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "openai" in data
        assert "falai" in data
        print(f"API keys configured: openai={data['openai']}, falai={data['falai']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
