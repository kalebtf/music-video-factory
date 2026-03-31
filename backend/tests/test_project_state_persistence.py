"""
Test project state persistence endpoints:
- PUT /api/projects/{id}/concept
- PUT /api/projects/{id}/images
- PUT /api/projects/{id}/clips

These endpoints are used by the wizard to save state to MongoDB after each step.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "test123456"


class TestProjectStatePersistence:
    """Test project state persistence via PUT endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        data = login_response.json()
        self.access_token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.access_token}"})
        
        # Create a test project
        project_response = self.session.post(f"{BASE_URL}/api/projects", json={
            "title": "TEST_State_Persistence_Project",
            "genre": "Test Genre",
            "lyrics": "Test lyrics for state persistence"
        })
        
        if project_response.status_code not in [200, 201]:
            pytest.skip(f"Project creation failed: {project_response.status_code}")
        
        self.project_id = project_response.json().get("_id")
        yield
        
        # Cleanup - delete test project
        if hasattr(self, 'project_id') and self.project_id:
            self.session.delete(f"{BASE_URL}/api/projects/{self.project_id}")
    
    def test_put_concept_saves_to_db(self):
        """Test PUT /api/projects/{id}/concept saves concept data"""
        concept_data = {
            "concept": {
                "theme": "Urban nostalgia",
                "mood": "Melancholic",
                "animationStyle": "slow zoom, cinematic",
                "palette": ["#1a1a2e", "#e94560", "#0f3460", "#f0a500"],
                "prompts": [
                    "silhouette in rain, city lights",
                    "hands on window, longing",
                    "empty street at night"
                ],
                "hooks": ["I was never enough...", "You left without saying..."],
                "selectedHooks": ["I was never enough..."],
                "customInstructions": "emotional, cinematic",
                "numImages": 3
            }
        }
        
        # PUT concept
        response = self.session.put(
            f"{BASE_URL}/api/projects/{self.project_id}/concept",
            json=concept_data
        )
        
        assert response.status_code == 200, f"PUT concept failed: {response.text}"
        assert response.json().get("success") == True
        
        # GET project to verify persistence
        get_response = self.session.get(f"{BASE_URL}/api/projects/{self.project_id}")
        assert get_response.status_code == 200
        
        project = get_response.json()
        saved_concept = project.get("concept", {})
        
        # Verify concept data was saved
        assert saved_concept.get("theme") == "Urban nostalgia"
        assert saved_concept.get("mood") == "Melancholic"
        assert len(saved_concept.get("prompts", [])) == 3
        assert saved_concept.get("prompts", [])[0] == "silhouette in rain, city lights"
        print("✓ PUT /api/projects/{id}/concept saves and persists concept data")
    
    def test_put_images_saves_to_db(self):
        """Test PUT /api/projects/{id}/images saves images array"""
        images_data = {
            "images": [
                {
                    "id": "gen-test-1",
                    "url": f"{BASE_URL}/api/projects/{self.project_id}/images/img_0.png",
                    "prompt": "silhouette in rain",
                    "status": "approved",
                    "cost": 0.005,
                    "isUploaded": False,
                    "imagePath": f"/app/projects/{self.project_id}/images/img_0.png"
                },
                {
                    "id": "gen-test-2",
                    "url": f"{BASE_URL}/api/projects/{self.project_id}/images/img_1.png",
                    "prompt": "hands on window",
                    "status": "pending",
                    "cost": 0.005,
                    "isUploaded": False,
                    "imagePath": f"/app/projects/{self.project_id}/images/img_1.png"
                }
            ]
        }
        
        # PUT images
        response = self.session.put(
            f"{BASE_URL}/api/projects/{self.project_id}/images",
            json=images_data
        )
        
        assert response.status_code == 200, f"PUT images failed: {response.text}"
        assert response.json().get("success") == True
        
        # GET project to verify persistence
        get_response = self.session.get(f"{BASE_URL}/api/projects/{self.project_id}")
        assert get_response.status_code == 200
        
        project = get_response.json()
        saved_images = project.get("images", [])
        
        # Verify images data was saved
        assert len(saved_images) == 2
        assert saved_images[0].get("id") == "gen-test-1"
        assert saved_images[0].get("status") == "approved"
        assert saved_images[1].get("status") == "pending"
        print("✓ PUT /api/projects/{id}/images saves and persists images array")
    
    def test_put_clips_saves_to_db(self):
        """Test PUT /api/projects/{id}/clips saves clips array"""
        clips_data = {
            "clips": [
                {
                    "id": "clip-test-1",
                    "imageId": "gen-test-1",
                    "clipUrl": f"/api/projects/{self.project_id}/clips/clip_0.mp4",
                    "clipPath": f"/app/projects/{self.project_id}/clips/clip_0.mp4",
                    "duration": 5.0,
                    "status": "approved",
                    "cost": 0.25
                },
                {
                    "id": "clip-test-2",
                    "imageId": "gen-test-2",
                    "clipUrl": f"/api/projects/{self.project_id}/clips/clip_1.mp4",
                    "clipPath": f"/app/projects/{self.project_id}/clips/clip_1.mp4",
                    "duration": 5.0,
                    "status": "pending",
                    "cost": 0.25
                }
            ]
        }
        
        # PUT clips
        response = self.session.put(
            f"{BASE_URL}/api/projects/{self.project_id}/clips",
            json=clips_data
        )
        
        assert response.status_code == 200, f"PUT clips failed: {response.text}"
        assert response.json().get("success") == True
        
        # GET project to verify persistence
        get_response = self.session.get(f"{BASE_URL}/api/projects/{self.project_id}")
        assert get_response.status_code == 200
        
        project = get_response.json()
        saved_clips = project.get("clips", [])
        
        # Verify clips data was saved
        assert len(saved_clips) == 2
        assert saved_clips[0].get("id") == "clip-test-1"
        assert saved_clips[0].get("status") == "approved"
        assert saved_clips[0].get("duration") == 5.0
        print("✓ PUT /api/projects/{id}/clips saves and persists clips array")
    
    def test_project_load_restores_state(self):
        """Test that loading a project restores all saved state"""
        # First save concept, images, and clips
        concept_data = {
            "concept": {
                "theme": "Test theme",
                "mood": "Test mood",
                "prompts": ["prompt1", "prompt2"],
                "numImages": 2
            }
        }
        self.session.put(f"{BASE_URL}/api/projects/{self.project_id}/concept", json=concept_data)
        
        images_data = {
            "images": [
                {"id": "img-1", "url": "test-url-1", "prompt": "prompt1", "status": "approved", "cost": 0.005},
                {"id": "img-2", "url": "test-url-2", "prompt": "prompt2", "status": "approved", "cost": 0.005}
            ]
        }
        self.session.put(f"{BASE_URL}/api/projects/{self.project_id}/images", json=images_data)
        
        clips_data = {
            "clips": [
                {"id": "clip-1", "imageId": "img-1", "clipUrl": "clip-url-1", "duration": 5.0, "status": "approved", "cost": 0.25}
            ]
        }
        self.session.put(f"{BASE_URL}/api/projects/{self.project_id}/clips", json=clips_data)
        
        # Now load the project and verify all state is restored
        get_response = self.session.get(f"{BASE_URL}/api/projects/{self.project_id}")
        assert get_response.status_code == 200
        
        project = get_response.json()
        
        # Verify concept
        assert project.get("concept", {}).get("theme") == "Test theme"
        assert project.get("concept", {}).get("mood") == "Test mood"
        
        # Verify images
        assert len(project.get("images", [])) == 2
        assert project.get("images", [])[0].get("status") == "approved"
        
        # Verify clips
        assert len(project.get("clips", [])) == 1
        assert project.get("clips", [])[0].get("status") == "approved"
        
        print("✓ Project load restores all saved state (concept, images, clips)")
    
    def test_put_endpoints_require_auth(self):
        """Test that PUT endpoints require authentication"""
        # Create a new session without auth
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        # Test PUT concept without auth
        response = unauth_session.put(
            f"{BASE_URL}/api/projects/{self.project_id}/concept",
            json={"concept": {"theme": "test"}}
        )
        assert response.status_code == 401, "PUT concept should require auth"
        
        # Test PUT images without auth
        response = unauth_session.put(
            f"{BASE_URL}/api/projects/{self.project_id}/images",
            json={"images": []}
        )
        assert response.status_code == 401, "PUT images should require auth"
        
        # Test PUT clips without auth
        response = unauth_session.put(
            f"{BASE_URL}/api/projects/{self.project_id}/clips",
            json={"clips": []}
        )
        assert response.status_code == 401, "PUT clips should require auth"
        
        print("✓ PUT endpoints require authentication")
    
    def test_put_endpoints_verify_project_ownership(self):
        """Test that PUT endpoints verify project ownership"""
        # This test would require a second user, so we just verify 404 for non-existent project
        fake_project_id = "000000000000000000000000"
        
        response = self.session.put(
            f"{BASE_URL}/api/projects/{fake_project_id}/concept",
            json={"concept": {"theme": "test"}}
        )
        assert response.status_code == 404, "Should return 404 for non-existent project"
        
        print("✓ PUT endpoints verify project ownership (404 for non-existent)")


class TestAuthImageEndpoints:
    """Test authenticated image/video serving endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        data = login_response.json()
        self.access_token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.access_token}"})
    
    def test_image_endpoint_requires_auth(self):
        """Test that /api/projects/{id}/images/{filename} requires auth"""
        # Create unauth session
        unauth_session = requests.Session()
        
        # Try to access an image without auth (use a fake project ID)
        response = unauth_session.get(f"{BASE_URL}/api/projects/000000000000000000000000/images/img_0.png")
        assert response.status_code == 401, "Image endpoint should require auth"
        print("✓ Image endpoint requires authentication")
    
    def test_clip_endpoint_requires_auth(self):
        """Test that /api/projects/{id}/clips/{filename} requires auth"""
        unauth_session = requests.Session()
        
        response = unauth_session.get(f"{BASE_URL}/api/projects/000000000000000000000000/clips/clip_0.mp4")
        assert response.status_code == 401, "Clip endpoint should require auth"
        print("✓ Clip endpoint requires authentication")
    
    def test_final_video_endpoint_requires_auth(self):
        """Test that /api/projects/{id}/final/{filename} requires auth"""
        unauth_session = requests.Session()
        
        response = unauth_session.get(f"{BASE_URL}/api/projects/000000000000000000000000/final/video.mp4")
        assert response.status_code == 401, "Final video endpoint should require auth"
        print("✓ Final video endpoint requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
