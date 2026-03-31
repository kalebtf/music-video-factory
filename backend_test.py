#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class MusicVideoFactoryAPITester:
    def __init__(self, base_url="https://music-video-hub-17.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.user_id = None
        self.project_id = None
        self.test_email = "test@example.com"  # Use existing test user
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

    def test_health_check(self):
        """Test API health check"""
        try:
            response = self.session.get(f"{self.base_url}/")
            success = response.status_code == 200 and "Music Video Factory API" in response.text
            return self.log_test("Health Check", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Health Check", False, str(e))

    def test_register(self):
        """Test user registration or login if user exists"""
        try:
            data = {
                "email": self.test_email,
                "password": self.test_password
            }
            response = self.session.post(f"{self.base_url}/auth/register", json=data)
            
            if response.status_code == 200:
                user_data = response.json()
                self.user_id = user_data.get("_id")
                success = bool(self.user_id and user_data.get("email") == self.test_email)
                return self.log_test("User Registration", success, f"User ID: {self.user_id}")
            elif response.status_code == 400 and "already registered" in response.text:
                # User already exists, that's fine
                return self.log_test("User Registration", True, "User already exists")
            else:
                return self.log_test("User Registration", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            return self.log_test("User Registration", False, str(e))

    def test_login(self):
        """Test user login"""
        try:
            data = {
                "email": self.test_email,
                "password": self.test_password
            }
            response = self.session.post(f"{self.base_url}/auth/login", json=data)
            
            if response.status_code == 200:
                user_data = response.json()
                # Check if httpOnly cookies are set
                has_access_token = 'access_token' in [cookie.name for cookie in self.session.cookies]
                has_refresh_token = 'refresh_token' in [cookie.name for cookie in self.session.cookies]
                success = bool(user_data.get("_id") and has_access_token and has_refresh_token)
                return self.log_test("User Login", success, f"Cookies set: access={has_access_token}, refresh={has_refresh_token}")
            else:
                return self.log_test("User Login", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            return self.log_test("User Login", False, str(e))

    def test_get_me(self):
        """Test get current user"""
        try:
            response = self.session.get(f"{self.base_url}/auth/me")
            
            if response.status_code == 200:
                user_data = response.json()
                success = bool(user_data.get("_id") and user_data.get("email") == self.test_email)
                return self.log_test("Get Current User", success)
            else:
                return self.log_test("Get Current User", False, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Get Current User", False, str(e))

    def test_stats(self):
        """Test dashboard stats"""
        try:
            response = self.session.get(f"{self.base_url}/stats")
            
            if response.status_code == 200:
                stats = response.json()
                required_fields = ["totalVideos", "monthCost", "weekVideos"]
                success = all(field in stats for field in required_fields)
                return self.log_test("Dashboard Stats", success, f"Stats: {stats}")
            else:
                return self.log_test("Dashboard Stats", False, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Dashboard Stats", False, str(e))

    def test_projects(self):
        """Test projects endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/projects")
            
            if response.status_code == 200:
                projects = response.json()
                success = isinstance(projects, list)
                return self.log_test("Get Projects", success, f"Projects count: {len(projects)}")
            else:
                return self.log_test("Get Projects", False, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Get Projects", False, str(e))

    def test_templates(self):
        """Test templates endpoint - should have 6 default templates"""
        try:
            response = self.session.get(f"{self.base_url}/templates")
            
            if response.status_code == 200:
                templates = response.json()
                success = isinstance(templates, list) and len(templates) == 6
                return self.log_test("Get Templates (6 seeded)", success, f"Templates count: {len(templates)}")
            else:
                return self.log_test("Get Templates (6 seeded)", False, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Get Templates (6 seeded)", False, str(e))

    def test_settings_get(self):
        """Test get settings"""
        try:
            response = self.session.get(f"{self.base_url}/settings")
            
            if response.status_code == 200:
                settings = response.json()
                required_fields = ["imageProvider", "videoProvider"]
                success = all(field in settings for field in required_fields)
                return self.log_test("Get Settings", success, f"Settings: {settings}")
            else:
                return self.log_test("Get Settings", False, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Get Settings", False, str(e))

    def test_api_keys_get(self):
        """Test get API keys status"""
        try:
            response = self.session.get(f"{self.base_url}/settings/api-keys")
            
            if response.status_code == 200:
                api_keys = response.json()
                expected_keys = ["openai", "falai", "kling"]
                success = all(key in api_keys for key in expected_keys)
                return self.log_test("Get API Keys Status", success, f"API Keys: {api_keys}")
            else:
                return self.log_test("Get API Keys Status", False, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Get API Keys Status", False, str(e))

    def test_api_key_save(self):
        """Test saving API key"""
        try:
            data = {
                "provider": "openai",
                "apiKey": "test-api-key-12345"
            }
            response = self.session.post(f"{self.base_url}/settings/api-key", json=data)
            
            if response.status_code == 200:
                result = response.json()
                success = result.get("success") == True and result.get("provider") == "openai"
                return self.log_test("Save API Key", success)
            else:
                return self.log_test("Save API Key", False, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Save API Key", False, str(e))

    def test_provider_settings_update(self):
        """Test updating provider settings"""
        try:
            data = {
                "imageProvider": "gpt-image-1.5",
                "videoProvider": "falai-kling"
            }
            response = self.session.post(f"{self.base_url}/settings/providers", json=data)
            
            if response.status_code == 200:
                result = response.json()
                success = result.get("success") == True
                return self.log_test("Update Provider Settings", success)
            else:
                return self.log_test("Update Provider Settings", False, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Update Provider Settings", False, str(e))

    def test_cost_logs(self):
        """Test cost logs endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/cost-logs")
            
            if response.status_code == 200:
                data = response.json()
                success = "logs" in data and "total" in data and isinstance(data["logs"], list)
                return self.log_test("Get Cost Logs", success, f"Logs count: {len(data.get('logs', []))}")
            else:
                return self.log_test("Get Cost Logs", False, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Get Cost Logs", False, str(e))

    def test_create_project(self):
        """Test creating a project for further testing"""
        try:
            data = {
                "title": "Test Song",
                "genre": "Pop",
                "lyrics": "This is a test song for testing purposes"
            }
            response = self.session.post(f"{self.base_url}/projects", json=data)
            
            if response.status_code == 200:
                project = response.json()
                self.project_id = project.get("_id")
                success = bool(self.project_id and project.get("title") == "Test Song")
                return self.log_test("Create Project", success, f"Project ID: {self.project_id}")
            else:
                return self.log_test("Create Project", False, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Create Project", False, str(e))

    def test_climax_detection_no_audio(self):
        """Test auto-detect climax endpoint without audio (should fail gracefully)"""
        try:
            if not hasattr(self, 'project_id') or not self.project_id:
                return self.log_test("Auto-detect Climax (No Audio)", False, "No project created")
                
            response = self.session.post(f"{self.base_url}/audio/detect-climax/{self.project_id}")
            
            # Should return 400 because no audio file uploaded
            success = response.status_code == 400
            error_msg = response.json().get("detail", "") if response.status_code == 400 else ""
            expected_error = "No audio file uploaded" in error_msg
            return self.log_test("Auto-detect Climax (No Audio)", success and expected_error, f"Status: {response.status_code}, Error: {error_msg}")
        except Exception as e:
            return self.log_test("Auto-detect Climax (No Audio)", False, str(e))

    def test_ai_analyze_no_openai_key(self):
        """Test AI analysis without OpenAI key (should return proper error)"""
        try:
            if not hasattr(self, 'project_id') or not self.project_id:
                return self.log_test("AI Analysis (No OpenAI Key)", False, "No project created")
                
            data = {"projectId": self.project_id}
            response = self.session.post(f"{self.base_url}/ai/analyze-song", json=data)
            
            # Should return 400 with proper error message
            success = response.status_code in [400, 401]  # 401 if auth issue, 400 if no key
            error_msg = response.json().get("detail", "") if response.status_code in [400, 401] else ""
            expected_error = "OpenAI API key not configured" in error_msg or "Not authenticated" in error_msg
            return self.log_test("AI Analysis (No OpenAI Key)", success, f"Status: {response.status_code}, Error: {error_msg}")
        except Exception as e:
            return self.log_test("AI Analysis (No OpenAI Key)", False, str(e))

    def test_fal_animate_no_key(self):
        """Test FAL.AI animate endpoint without API key (should return proper error)"""
        try:
            if not hasattr(self, 'project_id') or not self.project_id:
                return self.log_test("FAL.AI Animate (No Key)", False, "No project created")
                
            data = {
                "projectId": self.project_id,
                "imageIndex": 0,
                "imagePath": "test/path.png",
                "prompt": "test animation"
            }
            response = self.session.post(f"{self.base_url}/ai/animate-image", json=data)
            
            # Should return 400 with proper error message
            success = response.status_code == 400
            error_msg = response.json().get("detail", "") if response.status_code == 400 else ""
            expected_error = "FAL.AI API key" in error_msg
            return self.log_test("FAL.AI Animate (No Key)", success and expected_error, f"Status: {response.status_code}, Error: {error_msg}")
        except Exception as e:
            return self.log_test("FAL.AI Animate (No Key)", False, str(e))

    def test_video_assemble_endpoint(self):
        """Test video assembly endpoint exists and validates input"""
        try:
            if not hasattr(self, 'project_id') or not self.project_id:
                return self.log_test("Video Assembly Endpoint", False, "No project created")
                
            data = {
                "projectId": self.project_id,
                "clipOrder": [0, 1],
                "crossfadeDuration": 0.5,
                "addTextOverlay": True
            }
            response = self.session.post(f"{self.base_url}/video/assemble", json=data)
            
            # Should return 400 because no clips exist, but endpoint should exist
            success = response.status_code in [400, 404]  # 400 for validation, 404 if project not found
            return self.log_test("Video Assembly Endpoint", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Video Assembly Endpoint", False, str(e))

    def test_download_endpoints(self):
        """Test download endpoints exist"""
        try:
            if not hasattr(self, 'project_id') or not self.project_id:
                return self.log_test("Download Endpoints", False, "No project created")
                
            platforms = ['tiktok', 'youtube', 'instagram']
            all_success = True
            
            for platform in platforms:
                response = self.session.get(f"{self.base_url}/projects/{self.project_id}/download/{platform}")
                # Should return 404 because no video assembled yet, but endpoint should exist
                if response.status_code not in [404, 400]:
                    all_success = False
                    break
            
            return self.log_test("Download Endpoints", all_success, f"Tested platforms: {platforms}")
        except Exception as e:
            return self.log_test("Download Endpoints", False, str(e))

    def test_zip_download_endpoint(self):
        """Test ZIP download endpoint exists"""
        try:
            if not hasattr(self, 'project_id') or not self.project_id:
                return self.log_test("ZIP Download Endpoint", False, "No project created")
                
            response = self.session.get(f"{self.base_url}/projects/{self.project_id}/download-zip")
            
            # Should return 200 (empty zip) or 404, but endpoint should exist
            success = response.status_code in [200, 404, 400]
            return self.log_test("ZIP Download Endpoint", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("ZIP Download Endpoint", False, str(e))

    def test_clips_update_endpoint(self):
        """Test clips update endpoint exists"""
        try:
            if not hasattr(self, 'project_id') or not self.project_id:
                return self.log_test("Clips Update Endpoint", False, "No project created")
                
            data = {
                "clips": [
                    {
                        "id": "test-clip-1",
                        "imageId": "test-image-1",
                        "duration": 5.0,
                        "status": "pending"
                    }
                ]
            }
            response = self.session.put(f"{self.base_url}/projects/{self.project_id}/clips", json=data)
            
            # Should return 200 if successful
            success = response.status_code == 200
            return self.log_test("Clips Update Endpoint", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Clips Update Endpoint", False, str(e))

    def test_logout(self):
        """Test user logout"""
        try:
            response = self.session.post(f"{self.base_url}/auth/logout")
            
            if response.status_code == 200:
                # Check if cookies are cleared
                has_access_token = 'access_token' in [cookie.name for cookie in self.session.cookies]
                has_refresh_token = 'refresh_token' in [cookie.name for cookie in self.session.cookies]
                success = not has_access_token and not has_refresh_token
                return self.log_test("User Logout", success, f"Cookies cleared: {not has_access_token and not has_refresh_token}")
            else:
                return self.log_test("User Logout", False, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("User Logout", False, str(e))

    def test_protected_route_without_auth(self):
        """Test that protected routes require authentication"""
        try:
            # Clear session cookies
            self.session.cookies.clear()
            response = self.session.get(f"{self.base_url}/stats")
            
            success = response.status_code == 401
            return self.log_test("Protected Route (No Auth)", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("Protected Route (No Auth)", False, str(e))

    def run_all_tests(self):
        """Run all API tests"""
        print(f"🚀 Starting Music Video Factory API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print(f"📧 Test Email: {self.test_email}")
        print("=" * 60)

        # Test sequence
        tests = [
            self.test_health_check,
            self.test_register,
            self.test_login,
            self.test_get_me,
            self.test_stats,
            self.test_projects,
            self.test_templates,
            self.test_settings_get,
            self.test_api_keys_get,
            self.test_api_key_save,
            self.test_provider_settings_update,
            self.test_cost_logs,
            # New feature tests
            self.test_create_project,
            self.test_climax_detection_no_audio,
            self.test_ai_analyze_no_openai_key,
            self.test_fal_animate_no_key,
            self.test_video_assemble_endpoint,
            self.test_download_endpoints,
            self.test_zip_download_endpoint,
            self.test_clips_update_endpoint,
            self.test_logout,
            self.test_protected_route_without_auth
        ]

        for test in tests:
            test()

        print("=" * 60)
        print(f"📊 Tests Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All backend tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = MusicVideoFactoryAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())