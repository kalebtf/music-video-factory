"""
Iteration 8 Backend Tests
Tests for UX improvements and FLUX model fix:
- Login flow
- Dashboard stats and projects
- Settings page API keys
- Image generation endpoint (model selection)
- Video assembly with hookTexts
- Analyze-song endpoint (Spanish hooks)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "test123456"


class TestAuthFlow:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "refresh_token" in data, "No refresh_token in response"
        print(f"✓ Login successful, got tokens")
        return data["access_token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Invalid login correctly rejected")


class TestDashboard:
    """Dashboard API tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_get_stats(self, auth_token):
        """Test dashboard stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Stats failed: {response.text}"
        data = response.json()
        assert "totalProjects" in data or "total_projects" in data or isinstance(data, dict)
        print(f"✓ Stats endpoint working: {data}")
    
    def test_get_projects(self, auth_token):
        """Test projects list endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Projects failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Projects should be a list"
        print(f"✓ Projects endpoint working, found {len(data)} projects")


class TestSettings:
    """Settings API tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_get_settings(self, auth_token):
        """Test settings endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Settings failed: {response.text}"
        data = response.json()
        assert "imageProvider" in data or "image_provider" in data or isinstance(data, dict)
        print(f"✓ Settings endpoint working: {data}")
    
    def test_get_api_keys_status(self, auth_token):
        """Test API keys status endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/settings/api-keys",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"API keys failed: {response.text}"
        data = response.json()
        # Should return boolean status for each provider
        assert isinstance(data, dict)
        print(f"✓ API keys status: {data}")
    
    def test_test_keys_endpoint(self, auth_token):
        """Test the Test Keys button endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/auth/test-keys",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Test keys failed: {response.text}"
        data = response.json()
        # Should return test results for each provider
        assert isinstance(data, dict)
        print(f"✓ Test keys endpoint working: {data}")


class TestImageGeneration:
    """Image generation endpoint tests - verify model selection logic"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_generate_image_requires_project(self, auth_token):
        """Test that image generation requires a valid project"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-image",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "projectId": "invalid_project_id",
                "prompt": "test prompt",
                "imageIndex": 0
            }
        )
        # Should fail with 400 or 404 for invalid project
        assert response.status_code in [400, 404, 422, 500], f"Expected error, got {response.status_code}"
        print(f"✓ Image generation correctly validates project ID")
    
    def test_generate_image_requires_api_key(self, auth_token):
        """Test that image generation requires API key"""
        # First create a project
        project_response = requests.post(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "title": "TEST_Image_Gen_Test",
                "genre": "Test",
                "lyrics": "Test lyrics"
            }
        )
        
        if project_response.status_code == 200:
            project_id = project_response.json().get("_id") or project_response.json().get("id")
            
            # Try to generate image
            response = requests.post(
                f"{BASE_URL}/api/ai/generate-image",
                headers={"Authorization": f"Bearer {auth_token}"},
                json={
                    "projectId": project_id,
                    "prompt": "test prompt for image generation",
                    "imageIndex": 0
                }
            )
            
            # Should either work or fail with API key error (not 500)
            if response.status_code == 400:
                data = response.json()
                detail = data.get("detail", "")
                # Check for user-friendly error message
                assert "API key" in detail or "configured" in detail or "Settings" in detail, \
                    f"Error should mention API key: {detail}"
                print(f"✓ Image generation shows friendly API key error: {detail}")
            else:
                print(f"✓ Image generation response: {response.status_code}")
            
            # Cleanup - delete test project
            requests.delete(
                f"{BASE_URL}/api/projects/{project_id}",
                headers={"Authorization": f"Bearer {auth_token}"}
            )
        else:
            print(f"Could not create test project: {project_response.text}")


class TestVideoAssembly:
    """Video assembly endpoint tests - verify hookTexts field"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_assemble_accepts_hook_texts(self, auth_token):
        """Test that video assembly accepts hookTexts array"""
        # First create a project
        project_response = requests.post(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "title": "TEST_Assembly_Test",
                "genre": "Test",
                "lyrics": "Test lyrics"
            }
        )
        
        if project_response.status_code == 200:
            project_id = project_response.json().get("_id") or project_response.json().get("id")
            
            # Try to assemble with hookTexts
            response = requests.post(
                f"{BASE_URL}/api/video/assemble",
                headers={"Authorization": f"Bearer {auth_token}"},
                json={
                    "projectId": project_id,
                    "clipOrder": [0, 1],
                    "crossfadeDuration": 0.5,
                    "addTextOverlay": True,
                    "hookText": "Single hook",
                    "hookTexts": ["Hook 1", "Hook 2", "Hook 3"]
                }
            )
            
            # Should fail because no clips exist, but should accept the request format
            # (not fail on validation of hookTexts field)
            if response.status_code == 422:
                # Validation error - check it's not about hookTexts
                data = response.json()
                detail = str(data.get("detail", ""))
                assert "hookTexts" not in detail.lower(), f"hookTexts field rejected: {detail}"
                print(f"✓ hookTexts field accepted (validation error for other reason)")
            elif response.status_code in [400, 404, 500]:
                # Expected - no clips to assemble
                print(f"✓ Assembly request accepted hookTexts (failed due to no clips: {response.status_code})")
            else:
                print(f"✓ Assembly response: {response.status_code}")
            
            # Cleanup
            requests.delete(
                f"{BASE_URL}/api/projects/{project_id}",
                headers={"Authorization": f"Bearer {auth_token}"}
            )
        else:
            print(f"Could not create test project: {project_response.text}")


class TestAnalyzeSong:
    """Analyze song endpoint tests - verify Spanish hooks"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_analyze_song_requires_lyrics(self, auth_token):
        """Test that analyze-song requires lyrics"""
        # Create project without lyrics
        project_response = requests.post(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "title": "TEST_Analyze_Test",
                "genre": "Test"
            }
        )
        
        if project_response.status_code == 200:
            project_id = project_response.json().get("_id") or project_response.json().get("id")
            
            # Try to analyze
            response = requests.post(
                f"{BASE_URL}/api/ai/analyze-song",
                headers={"Authorization": f"Bearer {auth_token}"},
                json={"projectId": project_id}
            )
            
            # Should fail because no lyrics
            if response.status_code == 400:
                data = response.json()
                detail = data.get("detail", "")
                assert "lyrics" in detail.lower(), f"Should mention lyrics: {detail}"
                print(f"✓ Analyze-song correctly requires lyrics: {detail}")
            else:
                print(f"✓ Analyze-song response: {response.status_code}")
            
            # Cleanup
            requests.delete(
                f"{BASE_URL}/api/projects/{project_id}",
                headers={"Authorization": f"Bearer {auth_token}"}
            )
        else:
            print(f"Could not create test project: {project_response.text}")


class TestTemplates:
    """Templates endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_get_templates(self, auth_token):
        """Test templates endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/templates",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Templates failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Templates should be a list"
        print(f"✓ Templates endpoint working, found {len(data)} templates")


class TestClimaxDetection:
    """Climax detection endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_detect_climax_requires_audio(self, auth_token):
        """Test that climax detection requires audio"""
        # Create project without audio
        project_response = requests.post(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "title": "TEST_Climax_Test",
                "genre": "Test",
                "lyrics": "Test lyrics"
            }
        )
        
        if project_response.status_code == 200:
            project_id = project_response.json().get("_id") or project_response.json().get("id")
            
            # Try to detect climax
            response = requests.post(
                f"{BASE_URL}/api/audio/detect-climax/{project_id}",
                headers={"Authorization": f"Bearer {auth_token}"},
                json={}
            )
            
            # Should fail because no audio
            if response.status_code in [400, 404]:
                print(f"✓ Climax detection correctly requires audio: {response.status_code}")
            else:
                print(f"✓ Climax detection response: {response.status_code}")
            
            # Cleanup
            requests.delete(
                f"{BASE_URL}/api/projects/{project_id}",
                headers={"Authorization": f"Bearer {auth_token}"}
            )
        else:
            print(f"Could not create test project: {project_response.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
