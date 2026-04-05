"""
Iteration 23 - P0 Bug Fix: Auth Token Refresh for Step 7 Export & Publish

Tests:
1. POST /api/auth/refresh endpoint returns new access_token
2. GET /api/projects/{id}/final/{filename} requires valid auth token
3. GET /api/projects/{id}/download/{platform} requires valid auth token
4. GET /api/projects/{id}/download-zip requires valid auth token
5. Login still works (regression)
6. Projects endpoint still works (regression)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "test123456"


class TestAuthRefresh:
    """Test auth refresh endpoint and token handling"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_login_returns_tokens(self):
        """Test that login returns both access_token and refresh_token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Login should return access_token"
        assert "refresh_token" in data, "Login should return refresh_token"
        assert len(data["access_token"]) > 20, "access_token should be a valid JWT"
        assert len(data["refresh_token"]) > 20, "refresh_token should be a valid JWT"
        print(f"✓ Login returns both access_token and refresh_token")
    
    def test_refresh_endpoint_with_bearer_token(self):
        """Test POST /api/auth/refresh with Bearer token in header"""
        # First login to get refresh_token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        tokens = login_response.json()
        refresh_token = tokens["refresh_token"]
        original_access_token = tokens["access_token"]
        
        # Call refresh endpoint with Bearer token
        refresh_response = self.session.post(
            f"{BASE_URL}/api/auth/refresh",
            headers={"Authorization": f"Bearer {refresh_token}"}
        )
        assert refresh_response.status_code == 200, f"Refresh failed: {refresh_response.text}"
        
        data = refresh_response.json()
        assert "access_token" in data, "Refresh should return new access_token"
        assert len(data["access_token"]) > 20, "New access_token should be valid JWT"
        # New token should be different (different exp time)
        print(f"✓ POST /api/auth/refresh returns new access_token")
    
    def test_refresh_endpoint_without_token_returns_401(self):
        """Test that refresh endpoint returns 401 without token"""
        response = self.session.post(f"{BASE_URL}/api/auth/refresh")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Refresh endpoint returns 401 without token")
    
    def test_refresh_endpoint_with_invalid_token_returns_401(self):
        """Test that refresh endpoint returns 401 with invalid token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/refresh",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Refresh endpoint returns 401 with invalid token")
    
    def test_refresh_endpoint_with_access_token_returns_401(self):
        """Test that refresh endpoint rejects access_token (wrong type)"""
        # Use a fresh session to avoid cookie interference
        fresh_session = requests.Session()
        fresh_session.headers.update({"Content-Type": "application/json"})
        
        # Login to get access_token
        login_response = fresh_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        access_token = login_response.json()["access_token"]
        
        # Use another fresh session for the refresh call (no cookies)
        refresh_session = requests.Session()
        # Try to use access_token for refresh (should fail - wrong type)
        refresh_response = refresh_session.post(
            f"{BASE_URL}/api/auth/refresh",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        assert refresh_response.status_code == 401, f"Expected 401 for wrong token type, got {refresh_response.status_code}: {refresh_response.text}"
        print(f"✓ Refresh endpoint rejects access_token (validates token type)")


class TestProtectedEndpoints:
    """Test that download endpoints require authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session and get auth token"""
        # Use a separate session for auth tests
        self.auth_session = requests.Session()
        self.auth_session.headers.update({"Content-Type": "application/json"})
        
        # Login to get tokens
        login_response = self.auth_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_response.status_code == 200:
            tokens = login_response.json()
            self.access_token = tokens.get("access_token")
            self.refresh_token = tokens.get("refresh_token")
        else:
            self.access_token = None
            self.refresh_token = None
    
    def test_final_video_endpoint_requires_auth(self):
        """Test GET /api/projects/{id}/final/{filename} returns 401 without auth"""
        # Use a FRESH session without any cookies
        fresh_session = requests.Session()
        # Use valid ObjectId format
        response = fresh_session.get(f"{BASE_URL}/api/projects/000000000000000000000000/final/video.mp4")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}: {response.text}"
        print(f"✓ GET /api/projects/{{id}}/final/{{filename}} requires auth (returns 401)")
    
    def test_download_platform_endpoint_requires_auth(self):
        """Test GET /api/projects/{id}/download/{platform} returns 401 without auth"""
        # Use a FRESH session without any cookies
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/projects/000000000000000000000000/download/tiktok")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}: {response.text}"
        print(f"✓ GET /api/projects/{{id}}/download/{{platform}} requires auth (returns 401)")
    
    def test_download_zip_endpoint_requires_auth(self):
        """Test GET /api/projects/{id}/download-zip returns 401 without auth"""
        # Use a FRESH session without any cookies
        fresh_session = requests.Session()
        response = fresh_session.get(f"{BASE_URL}/api/projects/000000000000000000000000/download-zip")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}: {response.text}"
        print(f"✓ GET /api/projects/{{id}}/download-zip requires auth (returns 401)")
    
    def test_final_video_with_auth_returns_404_for_nonexistent(self):
        """Test that with valid auth, nonexistent project returns 404 (not 401)"""
        if not self.access_token:
            pytest.skip("No access token available")
        
        # Use a fresh session with only the Bearer token (no cookies)
        fresh_session = requests.Session()
        response = fresh_session.get(
            f"{BASE_URL}/api/projects/000000000000000000000000/final/video.mp4",
            headers={"Authorization": f"Bearer {self.access_token}"}
        )
        # Should be 404 (project not found) not 401 (unauthorized)
        assert response.status_code == 404, f"Expected 404 with valid auth, got {response.status_code}"
        print(f"✓ With valid auth, nonexistent project returns 404")
    
    def test_download_platform_with_auth_returns_404_for_nonexistent(self):
        """Test that with valid auth, nonexistent project returns 404"""
        if not self.access_token:
            pytest.skip("No access token available")
        
        fresh_session = requests.Session()
        response = fresh_session.get(
            f"{BASE_URL}/api/projects/000000000000000000000000/download/tiktok",
            headers={"Authorization": f"Bearer {self.access_token}"}
        )
        assert response.status_code == 404, f"Expected 404 with valid auth, got {response.status_code}"
        print(f"✓ Download platform with valid auth returns 404 for nonexistent project")
    
    def test_download_zip_with_auth_returns_404_for_nonexistent(self):
        """Test that with valid auth, nonexistent project returns 404"""
        if not self.access_token:
            pytest.skip("No access token available")
        
        fresh_session = requests.Session()
        response = fresh_session.get(
            f"{BASE_URL}/api/projects/000000000000000000000000/download-zip",
            headers={"Authorization": f"Bearer {self.access_token}"}
        )
        assert response.status_code == 404, f"Expected 404 with valid auth, got {response.status_code}"
        print(f"✓ Download ZIP with valid auth returns 404 for nonexistent project")


class TestRegressionAuth:
    """Regression tests for auth and core endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_api_root_returns_200(self):
        """Test API root endpoint"""
        response = self.session.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print(f"✓ API root returns 200")
    
    def test_login_works(self):
        """Test login with test credentials"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "_id" in data
        assert data["email"] == TEST_EMAIL
        print(f"✓ Login works with test credentials")
    
    def test_auth_me_with_token(self):
        """Test /auth/me endpoint with valid token"""
        # Login first
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        access_token = login_response.json()["access_token"]
        
        # Call /auth/me
        me_response = self.session.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        assert me_response.status_code == 200, f"Auth/me failed: {me_response.text}"
        data = me_response.json()
        assert data["email"] == TEST_EMAIL
        print(f"✓ /auth/me works with valid token")
    
    def test_projects_list_with_auth(self):
        """Test projects list endpoint with auth"""
        # Login first
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        access_token = login_response.json()["access_token"]
        
        # Get projects
        projects_response = self.session.get(
            f"{BASE_URL}/api/projects",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        assert projects_response.status_code == 200, f"Projects list failed: {projects_response.text}"
        data = projects_response.json()
        assert isinstance(data, list)
        print(f"✓ Projects list works with auth (found {len(data)} projects)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
