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
        self.test_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
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
        """Test user registration"""
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
                expected_defaults = {
                    "imageProvider": "gpt-image-mini",
                    "videoProvider": "falai-wan"
                }
                success = all(settings.get(k) == v for k, v in expected_defaults.items())
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
                success = all(key in api_keys and api_keys[key] == False for key in expected_keys)
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