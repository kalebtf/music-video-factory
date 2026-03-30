#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class MusicVideoAudioAITester:
    def __init__(self, base_url="https://music-video-hub-17.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = None
        self.project_id = None
        self.test_email = "test@example.com"
        self.test_password = "test123456"

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        return success

    def login(self):
        """Login with test credentials"""
        try:
            data = {"email": self.test_email, "password": self.test_password}
            response = self.session.post(f"{self.base_url}/auth/login", json=data)
            if response.status_code == 200:
                self.user_id = response.json().get("_id")
                return self.log_test("Login", True)
            else:
                return self.log_test("Login", False, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Login", False, str(e))

    def create_test_project(self):
        """Create a test project"""
        try:
            data = {
                "title": "Audio AI Test Project",
                "genre": "Pop",
                "lyrics": "This is a test song with emotional lyrics about love and heartbreak. The melody builds up to a powerful climax that captures the essence of human emotion and longing."
            }
            response = self.session.post(f"{self.base_url}/projects", json=data)
            if response.status_code == 200:
                self.project_id = response.json().get("_id")
                return self.log_test("Create Test Project", True, f"Project ID: {self.project_id}")
            else:
                return self.log_test("Create Test Project", False, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Create Test Project", False, str(e))

    def test_audio_upload_endpoint(self):
        """Test audio upload endpoint without actual file"""
        if not self.project_id:
            return self.log_test("Audio Upload Endpoint", False, "No project ID")
        
        try:
            # Test with no file (should return 422 for missing file)
            response = self.session.post(f"{self.base_url}/audio/upload/{self.project_id}")
            expected_status = 422  # FastAPI returns 422 for missing required fields
            success = response.status_code == expected_status
            return self.log_test("Audio Upload Endpoint (No File)", success, 
                               f"Expected {expected_status}, got {response.status_code}")
        except Exception as e:
            return self.log_test("Audio Upload Endpoint", False, str(e))

    def test_detect_climax_no_audio(self):
        """Test climax detection without uploaded audio"""
        if not self.project_id:
            return self.log_test("Detect Climax (No Audio)", False, "No project ID")
        
        try:
            response = self.session.post(f"{self.base_url}/audio/detect-climax/{self.project_id}")
            # Should return 400 for no audio file
            success = response.status_code == 400
            error_msg = response.json().get("detail", "") if response.status_code == 400 else ""
            return self.log_test("Detect Climax (No Audio)", success, 
                               f"Status: {response.status_code}, Error: {error_msg}")
        except Exception as e:
            return self.log_test("Detect Climax (No Audio)", False, str(e))

    def test_extract_climax_no_audio(self):
        """Test climax extraction without uploaded audio"""
        if not self.project_id:
            return self.log_test("Extract Climax (No Audio)", False, "No project ID")
        
        try:
            data = {
                "projectId": self.project_id,
                "start": 10.0,
                "end": 40.0
            }
            response = self.session.post(f"{self.base_url}/audio/extract-climax/{self.project_id}", json=data)
            # Should return 400 for no audio file
            success = response.status_code == 400
            error_msg = response.json().get("detail", "") if response.status_code == 400 else ""
            return self.log_test("Extract Climax (No Audio)", success, 
                               f"Status: {response.status_code}, Error: {error_msg}")
        except Exception as e:
            return self.log_test("Extract Climax (No Audio)", False, str(e))

    def test_ai_analyze_no_key(self):
        """Test AI song analysis without OpenAI key"""
        if not self.project_id:
            return self.log_test("AI Analyze (No Key)", False, "No project ID")
        
        try:
            data = {"projectId": self.project_id}
            response = self.session.post(f"{self.base_url}/ai/analyze-song", json=data)
            
            if response.status_code == 400:
                error_detail = response.json().get("detail", "")
                success = "OpenAI API key not configured" in error_detail
                return self.log_test("AI Analyze Error Handling", success, 
                                   f"Error: {error_detail}")
            else:
                return self.log_test("AI Analyze Error Handling", False, 
                                   f"Expected 400, got {response.status_code}")
        except Exception as e:
            return self.log_test("AI Analyze (No Key)", False, str(e))

    def test_image_generation_no_key(self):
        """Test image generation without OpenAI key"""
        if not self.project_id:
            return self.log_test("Image Generation (No Key)", False, "No project ID")
        
        try:
            data = {
                "projectId": self.project_id,
                "prompt": "A beautiful sunset over the ocean, cinematic lighting, 9:16 aspect ratio",
                "imageIndex": 0
            }
            response = self.session.post(f"{self.base_url}/ai/generate-image", json=data)
            
            if response.status_code == 400:
                error_detail = response.json().get("detail", "")
                success = "OpenAI API key not configured" in error_detail
                return self.log_test("Image Generation Error Handling", success, 
                                   f"Error: {error_detail}")
            else:
                return self.log_test("Image Generation Error Handling", False, 
                                   f"Expected 400, got {response.status_code}")
        except Exception as e:
            return self.log_test("Image Generation (No Key)", False, str(e))

    def test_project_images_endpoint(self):
        """Test project images serving endpoint"""
        if not self.project_id:
            return self.log_test("Project Images Endpoint", False, "No project ID")
        
        try:
            # Test with non-existent image (should return 404)
            response = self.session.get(f"{self.base_url}/projects/{self.project_id}/images/nonexistent.png")
            success = response.status_code == 404
            return self.log_test("Project Images Endpoint (404)", success, 
                               f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Project Images Endpoint", False, str(e))

    def test_cost_logging_integration(self):
        """Test cost logging functionality"""
        try:
            # Add a test cost log entry
            data = {
                "projectId": self.project_id,
                "action": "test_analysis",
                "provider": "openai",
                "cost": 0.01,
                "details": "Test cost log for audio/AI features"
            }
            response = self.session.post(f"{self.base_url}/cost-logs", json=data)
            
            if response.status_code == 200:
                # Verify it appears in cost logs
                logs_response = self.session.get(f"{self.base_url}/cost-logs")
                if logs_response.status_code == 200:
                    logs_data = logs_response.json()
                    recent_log = logs_data.get("logs", [{}])[0] if logs_data.get("logs") else {}
                    success = recent_log.get("action") == "test_analysis"
                    return self.log_test("Cost Logging Integration", success, 
                                       f"Recent log action: {recent_log.get('action')}")
                else:
                    return self.log_test("Cost Logging Integration", False, "Failed to retrieve logs")
            else:
                return self.log_test("Cost Logging Integration", False, 
                                   f"Failed to add log: {response.status_code}")
        except Exception as e:
            return self.log_test("Cost Logging Integration", False, str(e))

    def test_project_concept_update(self):
        """Test updating project concept"""
        if not self.project_id:
            return self.log_test("Project Concept Update", False, "No project ID")
        
        try:
            concept_data = {
                "concept": {
                    "theme": "Urban nighttime vibes with neon lights",
                    "mood": "Melancholic and contemplative",
                    "animationStyle": "Slow zoom with gentle camera drift",
                    "palette": ["#1a1a2e", "#e94560", "#0f3460", "#f0a500"],
                    "prompts": [
                        "Person walking alone on wet city street at night, neon reflections, cinematic, 9:16",
                        "Close-up of rain drops on window with city lights bokeh, emotional, 9:16",
                        "Silhouette against dramatic sunset, contemplative mood, 9:16"
                    ],
                    "hooks": ["Walking through memories...", "Rain knows my tears...", "City lights fade..."],
                    "numImages": 3
                }
            }
            response = self.session.put(f"{self.base_url}/projects/{self.project_id}/concept", json=concept_data)
            success = response.status_code == 200
            return self.log_test("Project Concept Update", success, 
                               f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Project Concept Update", False, str(e))

    def test_project_images_update(self):
        """Test updating project images array"""
        if not self.project_id:
            return self.log_test("Project Images Update", False, "No project ID")
        
        try:
            images_data = {
                "images": [
                    {
                        "id": "test-img-1",
                        "url": "/api/projects/test/images/img_0.png",
                        "prompt": "Test image prompt",
                        "status": "approved",
                        "cost": 0.005
                    }
                ]
            }
            response = self.session.put(f"{self.base_url}/projects/{self.project_id}/images", json=images_data)
            success = response.status_code == 200
            return self.log_test("Project Images Update", success, 
                               f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Project Images Update", False, str(e))

    def run_all_tests(self):
        """Run all audio and AI related tests"""
        print("🎵 Starting Music Video Factory Audio & AI Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)
        
        # Login first
        if not self.login():
            print("❌ Login failed, stopping tests")
            return False
        
        # Create test project
        if not self.create_test_project():
            print("❌ Project creation failed, stopping tests")
            return False
        
        # Run all tests
        self.test_audio_upload_endpoint()
        self.test_detect_climax_no_audio()
        self.test_extract_climax_no_audio()
        self.test_ai_analyze_no_key()
        self.test_image_generation_no_key()
        self.test_project_images_endpoint()
        self.test_cost_logging_integration()
        self.test_project_concept_update()
        self.test_project_images_update()
        
        print("=" * 60)
        print(f"📊 Tests Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All audio & AI tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = MusicVideoAudioAITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())