"""
Test Iteration 9 Features:
1. Async video assembly with polling (POST /api/video/assemble returns jobId, GET /api/video/assemble/{jobId}/status)
2. Backend analyze-song prompt enforces Spanish hooks + English visual prompts
3. Settings page image provider list (FLUX Dev as recommended default)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAsyncVideoAssembly:
    """Test async video assembly endpoints with polling pattern"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    def test_assemble_endpoint_returns_job_id(self):
        """POST /api/video/assemble should return jobId + status:processing (202 pattern)"""
        # First create a project
        project_response = requests.post(
            f"{BASE_URL}/api/projects",
            headers=self.headers,
            json={"title": "TEST_Assembly_Project", "genre": "Pop"}
        )
        assert project_response.status_code in [200, 201], f"Failed to create project: {project_response.text}"
        project_data = project_response.json()
        project_id = project_data.get("id") or project_data.get("_id")
        
        # Try to assemble (will fail due to no clips, but should return proper error format)
        assemble_response = requests.post(
            f"{BASE_URL}/api/video/assemble",
            headers=self.headers,
            json={
                "projectId": project_id,
                "clipOrder": [0, 1],
                "crossfadeDuration": 0.5,
                "addTextOverlay": True,
                "hookText": "Test hook",
                "hookTexts": ["Hook 1", "Hook 2"],
                "addSubtitles": False,
                "lyrics": ""
            }
        )
        
        # Should return 400 because no clips exist, but the endpoint structure is correct
        assert assemble_response.status_code in [200, 202, 400], f"Unexpected status: {assemble_response.status_code}"
        
        if assemble_response.status_code in [200, 202]:
            data = assemble_response.json()
            assert "jobId" in data, "Response should contain jobId"
            assert "status" in data, "Response should contain status"
            assert data["status"] == "processing", f"Status should be 'processing', got {data['status']}"
        elif assemble_response.status_code == 400:
            # Expected - no clips to assemble
            data = assemble_response.json()
            assert "detail" in data, "Error response should contain detail"
            print(f"Expected error (no clips): {data['detail']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project_id}", headers=self.headers)
    
    def test_assembly_status_endpoint_404_for_nonexistent_job(self):
        """GET /api/video/assemble/{jobId}/status should return 404 for non-existent job"""
        fake_job_id = "nonexistent-job-id-12345"
        
        status_response = requests.get(
            f"{BASE_URL}/api/video/assemble/{fake_job_id}/status",
            headers=self.headers
        )
        
        assert status_response.status_code == 404, f"Expected 404, got {status_response.status_code}"
        data = status_response.json()
        assert "detail" in data, "Error response should contain detail"
        print(f"Correct 404 response: {data['detail']}")
    
    def test_assembly_status_endpoint_requires_auth(self):
        """GET /api/video/assemble/{jobId}/status should require authentication"""
        fake_job_id = "test-job-id"
        
        # Request without auth header
        status_response = requests.get(
            f"{BASE_URL}/api/video/assemble/{fake_job_id}/status"
        )
        
        assert status_response.status_code == 401, f"Expected 401, got {status_response.status_code}"


class TestAnalyzeSongPrompt:
    """Test that analyze-song endpoint exists and accepts requests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    def test_analyze_song_endpoint_exists(self):
        """POST /api/ai/analyze-song endpoint should exist"""
        # Create a project with lyrics
        project_response = requests.post(
            f"{BASE_URL}/api/projects",
            headers=self.headers,
            json={
                "title": "TEST_Analyze_Song",
                "genre": "Latin Pop",
                "lyrics": "Corazón partido, lágrimas de amor\nBajo la luna llena, siento tu calor"
            }
        )
        assert project_response.status_code in [200, 201]
        project_data = project_response.json()
        project_id = project_data.get("id") or project_data.get("_id")
        
        # Try to analyze (will fail without API key, but endpoint should exist)
        analyze_response = requests.post(
            f"{BASE_URL}/api/ai/analyze-song",
            headers=self.headers,
            json={"projectId": project_id}
        )
        
        # Should return 400 (no API key) or 200 (success) - not 404
        assert analyze_response.status_code != 404, "Endpoint should exist"
        print(f"Analyze song response status: {analyze_response.status_code}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project_id}", headers=self.headers)


class TestSettingsImageProvider:
    """Test settings endpoint returns correct image provider options"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    def test_settings_returns_image_provider(self):
        """GET /api/settings should return imageProvider field"""
        settings_response = requests.get(
            f"{BASE_URL}/api/settings",
            headers=self.headers
        )
        
        assert settings_response.status_code == 200, f"Failed to get settings: {settings_response.text}"
        data = settings_response.json()
        
        assert "imageProvider" in data, "Settings should contain imageProvider"
        assert "videoProvider" in data, "Settings should contain videoProvider"
        
        print(f"Current image provider: {data['imageProvider']}")
        print(f"Current video provider: {data['videoProvider']}")
    
    def test_update_image_provider_to_flux_dev(self):
        """POST /api/settings/providers should accept together-flux-dev"""
        update_response = requests.post(
            f"{BASE_URL}/api/settings/providers",
            headers=self.headers,
            json={
                "imageProvider": "together-flux-dev",
                "videoProvider": "falai-wan"
            }
        )
        
        assert update_response.status_code == 200, f"Failed to update providers: {update_response.text}"
        
        # Verify the change
        settings_response = requests.get(
            f"{BASE_URL}/api/settings",
            headers=self.headers
        )
        data = settings_response.json()
        assert data["imageProvider"] == "together-flux-dev", f"Expected together-flux-dev, got {data['imageProvider']}"


class TestAssemblyRequestFields:
    """Test that assembly request accepts all required fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    def test_assembly_accepts_all_fields(self):
        """POST /api/video/assemble should accept hookTexts, addSubtitles, lyrics fields"""
        # Create a project
        project_response = requests.post(
            f"{BASE_URL}/api/projects",
            headers=self.headers,
            json={"title": "TEST_Assembly_Fields", "genre": "Pop"}
        )
        assert project_response.status_code in [200, 201]
        project_data = project_response.json()
        project_id = project_data.get("id") or project_data.get("_id")
        
        # Test with all fields
        assemble_response = requests.post(
            f"{BASE_URL}/api/video/assemble",
            headers=self.headers,
            json={
                "projectId": project_id,
                "clipOrder": [0, 1, 2],
                "crossfadeDuration": 0.7,
                "addTextOverlay": True,
                "hookText": "Single hook",
                "hookTexts": ["Hook 1", "Hook 2", "Hook 3"],
                "addSubtitles": True,
                "lyrics": "Line 1\nLine 2\nLine 3\n[Chorus]\nChorus line"
            }
        )
        
        # Should not return 422 (validation error) - fields should be accepted
        assert assemble_response.status_code != 422, f"Request validation failed: {assemble_response.text}"
        print(f"Assembly request accepted, status: {assemble_response.status_code}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{project_id}", headers=self.headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
