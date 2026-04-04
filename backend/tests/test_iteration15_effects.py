"""
Iteration 15 - Testing new features:
1. Backend: POST /api/projects/{id}/media/still-to-clip with 'effect' parameter
2. Backend: GET /api/effects/list returns effects, transitions, presets
3. Frontend: Step2SelectClimax has draggable middle region (trim-region)
4. Frontend: StepMediaLibrary shows effect dropdown per image item
5. Frontend: StepMediaLibrary shows effect presets section
6. Frontend: Step6AssembleVideo (Library mode) uses still-to-clip with effect param
7. Backend: Assembly hooks are mapped 1:1 to clips
8. Login verification
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "test123456"

# Test project and image from main agent context
TEST_PROJECT_ID = "69d1609e3dbd882c6ec76c2a"
TEST_IMAGE_PATH = "/app/projects/69d1609e3dbd882c6ec76c2a/media/65234092.jpg"


class TestEffectsEndpoint:
    """Test the new /api/effects/list endpoint (no auth required)"""
    
    def test_effects_list_returns_200(self):
        """GET /api/effects/list should return 200"""
        response = requests.get(f"{BASE_URL}/api/effects/list")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /api/effects/list returns 200")
    
    def test_effects_list_has_effects_array(self):
        """Response should contain 'effects' array with 11 items"""
        response = requests.get(f"{BASE_URL}/api/effects/list")
        data = response.json()
        assert "effects" in data, "Response missing 'effects' key"
        assert isinstance(data["effects"], list), "'effects' should be a list"
        assert len(data["effects"]) == 11, f"Expected 11 effects, got {len(data['effects'])}"
        
        # Verify expected effect IDs
        effect_ids = [e["id"] for e in data["effects"]]
        expected_ids = ["ken_burns_in", "ken_burns_out", "pan_left", "pan_right", 
                       "pan_up", "pan_down", "fade_in", "fade_out", 
                       "blur_in", "blur_out", "static"]
        for eid in expected_ids:
            assert eid in effect_ids, f"Missing effect: {eid}"
        print(f"PASS: effects array contains all 11 expected effects")
    
    def test_effects_list_has_transitions_array(self):
        """Response should contain 'transitions' array"""
        response = requests.get(f"{BASE_URL}/api/effects/list")
        data = response.json()
        assert "transitions" in data, "Response missing 'transitions' key"
        assert isinstance(data["transitions"], list), "'transitions' should be a list"
        assert len(data["transitions"]) >= 3, f"Expected at least 3 transitions, got {len(data['transitions'])}"
        
        transition_ids = [t["id"] for t in data["transitions"]]
        assert "crossfade" in transition_ids, "Missing transition: crossfade"
        assert "cut" in transition_ids, "Missing transition: cut"
        print(f"PASS: transitions array contains expected transitions")
    
    def test_effects_list_has_presets_array(self):
        """Response should contain 'presets' array with 4 presets"""
        response = requests.get(f"{BASE_URL}/api/effects/list")
        data = response.json()
        assert "presets" in data, "Response missing 'presets' key"
        assert isinstance(data["presets"], list), "'presets' should be a list"
        assert len(data["presets"]) == 4, f"Expected 4 presets, got {len(data['presets'])}"
        
        preset_ids = [p["id"] for p in data["presets"]]
        expected_presets = ["cinematic", "dynamic", "smooth", "energetic"]
        for pid in expected_presets:
            assert pid in preset_ids, f"Missing preset: {pid}"
        print(f"PASS: presets array contains all 4 expected presets")
    
    def test_preset_structure(self):
        """Each preset should have id, name, effects array, and transition"""
        response = requests.get(f"{BASE_URL}/api/effects/list")
        data = response.json()
        
        for preset in data["presets"]:
            assert "id" in preset, f"Preset missing 'id'"
            assert "name" in preset, f"Preset missing 'name'"
            assert "effects" in preset, f"Preset missing 'effects'"
            assert "transition" in preset, f"Preset missing 'transition'"
            assert isinstance(preset["effects"], list), f"Preset effects should be a list"
            assert len(preset["effects"]) >= 5, f"Preset should have at least 5 effects"
        print("PASS: All presets have correct structure")


class TestAuthentication:
    """Test login still works"""
    
    def test_login_success(self):
        """Login with test credentials should succeed"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "access_token" in data, "Response missing access_token"
        assert data.get("email") == TEST_EMAIL, "Email mismatch in response"
        print(f"PASS: Login successful for {TEST_EMAIL}")
        return data["access_token"]


class TestStillToClipWithEffect:
    """Test the still-to-clip endpoint with effect parameter"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Login failed - skipping authenticated tests")
        return response.json().get("access_token")
    
    def test_still_to_clip_with_ken_burns_in(self, auth_token):
        """Test still-to-clip with ken_burns_in effect"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/media/still-to-clip",
            json={
                "imagePath": TEST_IMAGE_PATH,
                "duration": 4,
                "effect": "ken_burns_in"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "clipId" in data, "Response missing clipId"
        assert "clipUrl" in data, "Response missing clipUrl"
        assert "clipPath" in data, "Response missing clipPath"
        assert data.get("effect") == "ken_burns_in", f"Effect mismatch: {data.get('effect')}"
        print(f"PASS: still-to-clip with ken_burns_in effect works")
    
    def test_still_to_clip_with_pan_left(self, auth_token):
        """Test still-to-clip with pan_left effect"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/media/still-to-clip",
            json={
                "imagePath": TEST_IMAGE_PATH,
                "duration": 4,
                "effect": "pan_left"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("effect") == "pan_left", f"Effect mismatch: {data.get('effect')}"
        print(f"PASS: still-to-clip with pan_left effect works")
    
    def test_still_to_clip_with_fade_in(self, auth_token):
        """Test still-to-clip with fade_in effect"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/media/still-to-clip",
            json={
                "imagePath": TEST_IMAGE_PATH,
                "duration": 4,
                "effect": "fade_in"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("effect") == "fade_in", f"Effect mismatch: {data.get('effect')}"
        print(f"PASS: still-to-clip with fade_in effect works")
    
    def test_still_to_clip_with_static(self, auth_token):
        """Test still-to-clip with static effect"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/media/still-to-clip",
            json={
                "imagePath": TEST_IMAGE_PATH,
                "duration": 4,
                "effect": "static"
            },
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("effect") == "static", f"Effect mismatch: {data.get('effect')}"
        print(f"PASS: still-to-clip with static effect works")
    
    def test_still_to_clip_default_effect(self, auth_token):
        """Test still-to-clip without effect param defaults to ken_burns_in"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/media/still-to-clip",
            json={
                "imagePath": TEST_IMAGE_PATH,
                "duration": 4
            },
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Default should be ken_burns_in
        assert data.get("effect") == "ken_burns_in", f"Default effect should be ken_burns_in, got: {data.get('effect')}"
        print(f"PASS: still-to-clip defaults to ken_burns_in effect")
    
    def test_still_to_clip_invalid_image_path(self, auth_token):
        """Test still-to-clip with invalid image path returns 400"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/media/still-to-clip",
            json={
                "imagePath": "/nonexistent/path/image.jpg",
                "duration": 4,
                "effect": "ken_burns_in"
            },
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400 for invalid path, got {response.status_code}"
        print(f"PASS: still-to-clip returns 400 for invalid image path")


class TestTestKeysEndpoint:
    """Test the /api/auth/test-keys endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Login failed - skipping authenticated tests")
        return response.json().get("access_token")
    
    def test_test_keys_returns_pexels(self, auth_token):
        """test-keys should return pexels status"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/test-keys", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "pexels" in data, "Response missing 'pexels' key"
        print(f"PASS: test-keys returns pexels status: {data.get('pexels')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
