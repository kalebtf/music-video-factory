"""
Iteration 10 Tests: Library Mode & Split-Path Wizard
Tests new endpoints for Pexels stock search, media upload, still-to-clip, trim-video, and media pool persistence.
Also tests that AI mode still works and project mode field is properly handled.
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "test123456"


class TestAuth:
    """Authentication tests - login to get token for subsequent tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get access token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.status_code} - {response.text}")
        data = response.json()
        return data.get("access_token")
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["email"] == TEST_EMAIL
        print(f"✓ Login successful for {TEST_EMAIL}")


class TestProjectModeField:
    """Test that projects accept and return mode field ('ai' or 'library')"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Login failed")
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_ai_mode_project(self, auth_headers):
        """POST /api/projects with mode='ai' should work"""
        response = requests.post(f"{BASE_URL}/api/projects", json={
            "title": "TEST_AI_Mode_Project",
            "genre": "Pop",
            "lyrics": "Test lyrics",
            "mode": "ai"
        }, headers=auth_headers)
        assert response.status_code == 200, f"Create AI project failed: {response.text}"
        data = response.json()
        assert data.get("mode") == "ai", f"Expected mode='ai', got {data.get('mode')}"
        assert "_id" in data
        print(f"✓ Created AI mode project: {data['_id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{data['_id']}", headers=auth_headers)
    
    def test_create_library_mode_project(self, auth_headers):
        """POST /api/projects with mode='library' should work"""
        response = requests.post(f"{BASE_URL}/api/projects", json={
            "title": "TEST_Library_Mode_Project",
            "genre": "Rock",
            "lyrics": "Test lyrics for library",
            "mode": "library"
        }, headers=auth_headers)
        assert response.status_code == 200, f"Create library project failed: {response.text}"
        data = response.json()
        assert data.get("mode") == "library", f"Expected mode='library', got {data.get('mode')}"
        assert "_id" in data
        print(f"✓ Created Library mode project: {data['_id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{data['_id']}", headers=auth_headers)
    
    def test_default_mode_is_ai(self, auth_headers):
        """POST /api/projects without mode should default to 'ai'"""
        response = requests.post(f"{BASE_URL}/api/projects", json={
            "title": "TEST_Default_Mode_Project",
            "genre": "Jazz"
        }, headers=auth_headers)
        assert response.status_code == 200, f"Create project failed: {response.text}"
        data = response.json()
        assert data.get("mode") == "ai", f"Expected default mode='ai', got {data.get('mode')}"
        print(f"✓ Default mode is 'ai'")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{data['_id']}", headers=auth_headers)
    
    def test_projects_list_includes_mode(self, auth_headers):
        """GET /api/projects should include mode field in response"""
        # Create a project first
        create_resp = requests.post(f"{BASE_URL}/api/projects", json={
            "title": "TEST_Mode_List_Project",
            "mode": "library"
        }, headers=auth_headers)
        project_id = create_resp.json().get("_id")
        
        # Get projects list
        response = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        assert response.status_code == 200
        projects = response.json()
        
        # Find our test project
        test_project = next((p for p in projects if p.get("_id") == project_id), None)
        assert test_project is not None, "Test project not found in list"
        assert "mode" in test_project, "mode field missing from project list"
        assert test_project["mode"] == "library"
        print(f"✓ Projects list includes mode field")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)


class TestStockSearch:
    """Test Pexels stock search endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Login failed")
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_stock_photos_search_no_key(self, auth_headers):
        """GET /api/stock/search/photos should return 400 if no Pexels key configured"""
        response = requests.get(f"{BASE_URL}/api/stock/search/photos", 
                               params={"query": "sunset"},
                               headers=auth_headers)
        # Without Pexels key, should return 400 with appropriate message
        if response.status_code == 400:
            data = response.json()
            assert "Pexels" in data.get("detail", "") or "API key" in data.get("detail", "")
            print(f"✓ Stock photos search returns 400 without Pexels key: {data.get('detail')}")
        elif response.status_code == 200:
            # If Pexels key is configured, should return results
            data = response.json()
            assert "photos" in data
            print(f"✓ Stock photos search works (Pexels key configured)")
        else:
            pytest.fail(f"Unexpected status: {response.status_code} - {response.text}")
    
    def test_stock_videos_search_no_key(self, auth_headers):
        """GET /api/stock/search/videos should return 400 if no Pexels key configured"""
        response = requests.get(f"{BASE_URL}/api/stock/search/videos", 
                               params={"query": "rain"},
                               headers=auth_headers)
        if response.status_code == 400:
            data = response.json()
            assert "Pexels" in data.get("detail", "") or "API key" in data.get("detail", "")
            print(f"✓ Stock videos search returns 400 without Pexels key: {data.get('detail')}")
        elif response.status_code == 200:
            data = response.json()
            assert "videos" in data
            print(f"✓ Stock videos search works (Pexels key configured)")
        else:
            pytest.fail(f"Unexpected status: {response.status_code} - {response.text}")
    
    def test_stock_search_requires_auth(self):
        """Stock search endpoints should require authentication"""
        response = requests.get(f"{BASE_URL}/api/stock/search/photos", 
                               params={"query": "test"})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Stock search requires authentication")


class TestMediaUpload:
    """Test media upload endpoint for library mode"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Login failed")
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_project(self, auth_headers):
        """Create a test project for media upload tests"""
        response = requests.post(f"{BASE_URL}/api/projects", json={
            "title": "TEST_Media_Upload_Project",
            "mode": "library"
        }, headers=auth_headers)
        if response.status_code != 200:
            pytest.skip("Failed to create test project")
        project_id = response.json().get("_id")
        yield project_id
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)
    
    def test_media_upload_endpoint_exists(self, auth_headers, test_project):
        """POST /api/projects/{id}/media/upload endpoint should exist"""
        # Create a simple test image (1x1 PNG)
        import base64
        # Minimal valid PNG
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {"file": ("test.png", png_data, "image/png")}
        response = requests.post(
            f"{BASE_URL}/api/projects/{test_project}/media/upload",
            files=files,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Media upload failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert "type" in data
        assert data["type"] == "upload-image"
        assert "mediaUrl" in data
        print(f"✓ Media upload works: {data}")
    
    def test_media_upload_requires_auth(self, test_project):
        """Media upload should require authentication"""
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        files = {"file": ("test.png", png_data, "image/png")}
        response = requests.post(
            f"{BASE_URL}/api/projects/{test_project}/media/upload",
            files=files
        )
        assert response.status_code == 401
        print(f"✓ Media upload requires authentication")


class TestMediaPoolPersistence:
    """Test PUT /api/projects/{id}/media for saving media pool"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Login failed")
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_project(self, auth_headers):
        """Create a test project"""
        response = requests.post(f"{BASE_URL}/api/projects", json={
            "title": "TEST_Media_Pool_Project",
            "mode": "library"
        }, headers=auth_headers)
        if response.status_code != 200:
            pytest.skip("Failed to create test project")
        project_id = response.json().get("_id")
        yield project_id
        requests.delete(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)
    
    def test_save_media_pool(self, auth_headers, test_project):
        """PUT /api/projects/{id}/media should save media pool"""
        media_pool = [
            {
                "id": "test-media-1",
                "type": "stock-photo",
                "thumbnailUrl": "https://example.com/thumb1.jpg",
                "sourceUrl": "https://example.com/full1.jpg",
                "status": "approved"
            },
            {
                "id": "test-media-2",
                "type": "upload-video",
                "thumbnailUrl": "https://example.com/thumb2.jpg",
                "duration": 10,
                "status": "pending"
            }
        ]
        
        response = requests.put(
            f"{BASE_URL}/api/projects/{test_project}/media",
            json={"media": media_pool},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Save media pool failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Media pool saved successfully")
        
        # Verify by fetching project
        get_response = requests.get(
            f"{BASE_URL}/api/projects/{test_project}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        project_data = get_response.json()
        assert "media" in project_data
        assert len(project_data["media"]) == 2
        assert project_data["media"][0]["id"] == "test-media-1"
        print(f"✓ Media pool persisted and retrieved correctly")


class TestStillToClip:
    """Test POST /api/projects/{id}/media/still-to-clip endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Login failed")
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_still_to_clip_requires_valid_image(self, auth_headers):
        """still-to-clip should return 400 for non-existent image"""
        # Create a project first
        create_resp = requests.post(f"{BASE_URL}/api/projects", json={
            "title": "TEST_Still_To_Clip_Project",
            "mode": "library"
        }, headers=auth_headers)
        project_id = create_resp.json().get("_id")
        
        response = requests.post(
            f"{BASE_URL}/api/projects/{project_id}/media/still-to-clip",
            json={"imagePath": "/nonexistent/path.jpg", "duration": 4},
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ still-to-clip returns 400 for non-existent image")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)


class TestTrimVideo:
    """Test POST /api/projects/{id}/media/trim-video endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Login failed")
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_trim_video_requires_valid_video(self, auth_headers):
        """trim-video should return 400 for non-existent video"""
        # Create a project first
        create_resp = requests.post(f"{BASE_URL}/api/projects", json={
            "title": "TEST_Trim_Video_Project",
            "mode": "library"
        }, headers=auth_headers)
        project_id = create_resp.json().get("_id")
        
        response = requests.post(
            f"{BASE_URL}/api/projects/{project_id}/media/trim-video",
            json={"videoPath": "/nonexistent/video.mp4", "maxDuration": 10},
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ trim-video returns 400 for non-existent video")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)


class TestAssemblyWithLibraryClipPaths:
    """Test that assembly endpoint accepts libraryClipPaths for library mode"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Login failed")
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_assembly_accepts_library_clip_paths(self, auth_headers):
        """POST /api/video/assemble should accept libraryClipPaths field"""
        # Create a project
        create_resp = requests.post(f"{BASE_URL}/api/projects", json={
            "title": "TEST_Assembly_Library_Project",
            "mode": "library"
        }, headers=auth_headers)
        project_id = create_resp.json().get("_id")
        
        # Try to assemble with libraryClipPaths (will fail because paths don't exist, but should accept the field)
        response = requests.post(
            f"{BASE_URL}/api/video/assemble",
            json={
                "projectId": project_id,
                "clipOrder": [0],
                "libraryClipPaths": ["/nonexistent/clip1.mp4"],
                "crossfadeDuration": 0.5
            },
            headers=auth_headers
        )
        # Should return 400 because clips don't exist, not 422 for invalid field
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "clip" in data.get("detail", "").lower() or "1" in data.get("detail", "")
        print(f"✓ Assembly endpoint accepts libraryClipPaths field")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)


class TestSettingsPexelsKey:
    """Test that Settings accepts Pexels API key"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Login failed")
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_save_pexels_api_key(self, auth_headers):
        """POST /api/settings/api-key should accept pexels provider"""
        response = requests.post(
            f"{BASE_URL}/api/settings/api-key",
            json={"provider": "pexels", "apiKey": "test-pexels-key-12345"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Save Pexels key failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("provider") == "pexels"
        print(f"✓ Pexels API key can be saved")
    
    def test_get_api_keys_includes_pexels(self, auth_headers):
        """GET /api/settings/api-keys should include pexels field"""
        response = requests.get(
            f"{BASE_URL}/api/settings/api-keys",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "pexels" in data, f"pexels field missing from api-keys response: {data}"
        print(f"✓ API keys response includes pexels field: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
