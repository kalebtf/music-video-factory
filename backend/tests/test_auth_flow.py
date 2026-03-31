"""
Test Auth Flow - JWT Token Authentication
Tests the critical auth bug fix: JWT token sent correctly across the app
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "test123456"


class TestAuthEndpoints:
    """Test authentication endpoints return tokens in response body"""
    
    def test_login_returns_tokens_in_body(self):
        """POST /api/auth/login should return access_token and refresh_token in response body"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Critical: tokens must be in response body
        assert "access_token" in data, "access_token missing from login response body"
        assert "refresh_token" in data, "refresh_token missing from login response body"
        assert len(data["access_token"]) > 20, "access_token seems too short"
        assert len(data["refresh_token"]) > 20, "refresh_token seems too short"
        
        # Also verify user data is returned
        assert "_id" in data, "User ID missing from login response"
        assert "email" in data, "Email missing from login response"
        print(f"✓ Login returns tokens: access_token={data['access_token'][:20]}..., refresh_token={data['refresh_token'][:20]}...")
    
    def test_register_returns_tokens_in_body(self):
        """POST /api/auth/register should return access_token and refresh_token in response body"""
        import uuid
        unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123"
        })
        
        assert response.status_code == 200, f"Register failed: {response.text}"
        data = response.json()
        
        # Critical: tokens must be in response body
        assert "access_token" in data, "access_token missing from register response body"
        assert "refresh_token" in data, "refresh_token missing from register response body"
        print(f"✓ Register returns tokens for {unique_email}")
    
    def test_refresh_token_endpoint(self):
        """POST /api/auth/refresh with Bearer refresh_token returns new access_token"""
        # First login to get tokens
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        tokens = login_response.json()
        refresh_token = tokens["refresh_token"]
        
        # Now refresh using Authorization header
        refresh_response = requests.post(
            f"{BASE_URL}/api/auth/refresh",
            headers={"Authorization": f"Bearer {refresh_token}"}
        )
        
        assert refresh_response.status_code == 200, f"Refresh failed: {refresh_response.text}"
        data = refresh_response.json()
        assert "access_token" in data, "New access_token missing from refresh response"
        print(f"✓ Token refresh works with Authorization header")


class TestProtectedEndpointsWithBearerToken:
    """Test that all protected endpoints work with Bearer token in Authorization header"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get access token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Setup login failed: {response.text}"
        data = response.json()
        self.access_token = data["access_token"]
        self.headers = {"Authorization": f"Bearer {self.access_token}"}
    
    def test_auth_me_with_bearer_token(self):
        """GET /api/auth/me should work with Bearer token"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=self.headers)
        assert response.status_code == 200, f"auth/me failed: {response.text}"
        data = response.json()
        assert "email" in data
        print(f"✓ /api/auth/me works with Bearer token")
    
    def test_auth_test_keys_with_bearer_token(self):
        """GET /api/auth/test-keys should work with Bearer token"""
        response = requests.get(f"{BASE_URL}/api/auth/test-keys", headers=self.headers)
        assert response.status_code == 200, f"test-keys failed: {response.text}"
        data = response.json()
        assert "openai" in data
        assert "falai" in data
        print(f"✓ /api/auth/test-keys works with Bearer token")
    
    def test_stats_with_bearer_token(self):
        """GET /api/stats should work with Bearer token"""
        response = requests.get(f"{BASE_URL}/api/stats", headers=self.headers)
        assert response.status_code == 200, f"stats failed: {response.text}"
        data = response.json()
        assert "totalVideos" in data
        assert "monthCost" in data
        assert "weekVideos" in data
        print(f"✓ /api/stats works with Bearer token")
    
    def test_projects_with_bearer_token(self):
        """GET /api/projects should work with Bearer token"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        assert response.status_code == 200, f"projects failed: {response.text}"
        assert isinstance(response.json(), list)
        print(f"✓ /api/projects works with Bearer token")
    
    def test_templates_with_bearer_token(self):
        """GET /api/templates should work with Bearer token"""
        response = requests.get(f"{BASE_URL}/api/templates", headers=self.headers)
        assert response.status_code == 200, f"templates failed: {response.text}"
        assert isinstance(response.json(), list)
        print(f"✓ /api/templates works with Bearer token")
    
    def test_settings_with_bearer_token(self):
        """GET /api/settings should work with Bearer token"""
        response = requests.get(f"{BASE_URL}/api/settings", headers=self.headers)
        assert response.status_code == 200, f"settings failed: {response.text}"
        data = response.json()
        assert "imageProvider" in data
        assert "videoProvider" in data
        print(f"✓ /api/settings works with Bearer token")
    
    def test_settings_api_keys_with_bearer_token(self):
        """GET /api/settings/api-keys should work with Bearer token"""
        response = requests.get(f"{BASE_URL}/api/settings/api-keys", headers=self.headers)
        assert response.status_code == 200, f"api-keys failed: {response.text}"
        data = response.json()
        assert "openai" in data
        assert "falai" in data
        assert "kling" in data
        print(f"✓ /api/settings/api-keys works with Bearer token")
    
    def test_cost_logs_with_bearer_token(self):
        """GET /api/cost-logs should work with Bearer token"""
        response = requests.get(f"{BASE_URL}/api/cost-logs", headers=self.headers)
        assert response.status_code == 200, f"cost-logs failed: {response.text}"
        data = response.json()
        assert "logs" in data
        assert "total" in data
        print(f"✓ /api/cost-logs works with Bearer token")
    
    def test_save_api_key_with_bearer_token(self):
        """POST /api/settings/api-key should work with Bearer token"""
        response = requests.post(
            f"{BASE_URL}/api/settings/api-key",
            headers=self.headers,
            json={"provider": "openai", "apiKey": "sk-test-key-12345"}
        )
        assert response.status_code == 200, f"save api-key failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ POST /api/settings/api-key works with Bearer token")


class TestProtectedEndpointsWithoutToken:
    """Test that protected endpoints return 401 without token"""
    
    def test_auth_me_without_token_returns_401(self):
        """GET /api/auth/me without token should return 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ /api/auth/me returns 401 without token")
    
    def test_stats_without_token_returns_401(self):
        """GET /api/stats without token should return 401"""
        response = requests.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ /api/stats returns 401 without token")
    
    def test_projects_without_token_returns_401(self):
        """GET /api/projects without token should return 401"""
        response = requests.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ /api/projects returns 401 without token")


class TestTokenPersistenceFlow:
    """Test the full flow: login -> store token -> use for subsequent requests"""
    
    def test_full_auth_flow(self):
        """Test complete auth flow simulating frontend behavior"""
        # Step 1: Login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        tokens = login_response.json()
        
        # Step 2: Simulate storing in localStorage (we just keep in memory)
        access_token = tokens["access_token"]
        refresh_token = tokens["refresh_token"]
        
        # Step 3: Make authenticated requests (simulating axios interceptor)
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # Dashboard loads stats and projects
        stats_response = requests.get(f"{BASE_URL}/api/stats", headers=headers)
        assert stats_response.status_code == 200, "Dashboard stats failed"
        
        projects_response = requests.get(f"{BASE_URL}/api/projects", headers=headers)
        assert projects_response.status_code == 200, "Dashboard projects failed"
        
        # Settings page loads
        settings_response = requests.get(f"{BASE_URL}/api/settings", headers=headers)
        assert settings_response.status_code == 200, "Settings failed"
        
        api_keys_response = requests.get(f"{BASE_URL}/api/settings/api-keys", headers=headers)
        assert api_keys_response.status_code == 200, "API keys failed"
        
        cost_logs_response = requests.get(f"{BASE_URL}/api/cost-logs", headers=headers)
        assert cost_logs_response.status_code == 200, "Cost logs failed"
        
        # New Video wizard loads templates
        templates_response = requests.get(f"{BASE_URL}/api/templates", headers=headers)
        assert templates_response.status_code == 200, "Templates failed"
        
        # Test keys endpoint
        test_keys_response = requests.get(f"{BASE_URL}/api/auth/test-keys", headers=headers)
        assert test_keys_response.status_code == 200, "Test keys failed"
        
        print(f"✓ Full auth flow works: login -> all protected endpoints accessible")
    
    def test_logout_flow(self):
        """Test logout clears session"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        tokens = login_response.json()
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}
        
        # Logout
        logout_response = requests.post(f"{BASE_URL}/api/auth/logout", headers=headers)
        assert logout_response.status_code == 200
        
        # Note: With JWT, the token is still valid until expiry
        # The frontend should clear localStorage on logout
        print(f"✓ Logout endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
