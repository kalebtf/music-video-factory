"""
Iteration 16 - Testing new features for Music Video Factory:
1. GET /api/effects/list returns 20 effects, 3 transitions, 6 presets
2. POST /api/projects/{id}/media/still-to-clip works with new effects (slide_left, vignette, vintage, glow, film_grain, zoom_rotate)
3. AssembleVideoRequest model includes textSize, textColor, textPosition, textStyle optional fields
4. Hooks distribution uses even spacing when fewer hooks than clips
5. FFmpeg auto-install check on startup
6. Login works with test@example.com / test123456
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # Response has user data at root level with email field
        assert "email" in data
        assert data["email"] == "test@example.com"
        print("✓ Login works with test@example.com / test123456")


class TestEffectsEndpoint:
    """Test /api/effects/list endpoint returns 20 effects, 3 transitions, 6 presets"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200, "Login failed"
    
    def test_effects_list_returns_200(self):
        """Test /api/effects/list returns 200"""
        response = self.session.get(f"{BASE_URL}/api/effects/list")
        assert response.status_code == 200, f"Effects list failed: {response.text}"
        print("✓ GET /api/effects/list returns 200")
    
    def test_effects_list_has_20_effects(self):
        """Test /api/effects/list has 20 effects"""
        response = self.session.get(f"{BASE_URL}/api/effects/list")
        data = response.json()
        effects = data.get("effects", [])
        assert len(effects) == 20, f"Expected 20 effects, got {len(effects)}"
        
        # Verify all expected effects are present
        effect_ids = [e["id"] for e in effects]
        expected_effects = [
            "ken_burns_in", "ken_burns_out", "pan_left", "pan_right", "pan_up", "pan_down",
            "slide_left", "slide_right", "slide_up", "slide_down", "zoom_rotate",
            "fade_in", "fade_out", "blur_in", "blur_out",
            "vignette", "vintage", "glow", "film_grain", "static"
        ]
        for eff in expected_effects:
            assert eff in effect_ids, f"Missing effect: {eff}"
        print(f"✓ /api/effects/list has 20 effects: {effect_ids}")
    
    def test_effects_list_has_3_transitions(self):
        """Test /api/effects/list has 3 transitions"""
        response = self.session.get(f"{BASE_URL}/api/effects/list")
        data = response.json()
        transitions = data.get("transitions", [])
        assert len(transitions) == 3, f"Expected 3 transitions, got {len(transitions)}"
        
        transition_ids = [t["id"] for t in transitions]
        expected = ["crossfade", "cut", "fade_black"]
        for t in expected:
            assert t in transition_ids, f"Missing transition: {t}"
        print(f"✓ /api/effects/list has 3 transitions: {transition_ids}")
    
    def test_effects_list_has_6_presets(self):
        """Test /api/effects/list has 6 presets"""
        response = self.session.get(f"{BASE_URL}/api/effects/list")
        data = response.json()
        presets = data.get("presets", [])
        assert len(presets) == 6, f"Expected 6 presets, got {len(presets)}"
        
        preset_ids = [p["id"] for p in presets]
        expected = ["cinematic", "dynamic", "smooth", "energetic", "vintage_film", "dreamy"]
        for p in expected:
            assert p in preset_ids, f"Missing preset: {p}"
        print(f"✓ /api/effects/list has 6 presets: {preset_ids}")
    
    def test_effects_have_categories(self):
        """Test effects have proper categories"""
        response = self.session.get(f"{BASE_URL}/api/effects/list")
        data = response.json()
        effects = data.get("effects", [])
        
        categories = set(e["category"] for e in effects)
        expected_categories = {"motion", "slide", "fade", "style", "basic"}
        assert categories == expected_categories, f"Expected categories {expected_categories}, got {categories}"
        print(f"✓ Effects have proper categories: {categories}")


class TestStillToClipNewEffects:
    """Test still-to-clip endpoint with new effects"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200, "Login failed"
        self.project_id = "69d1609e3dbd882c6ec76c2a"
        self.image_path = "/app/projects/69d1609e3dbd882c6ec76c2a/media/65234092.jpg"
    
    def test_still_to_clip_slide_left(self):
        """Test still-to-clip with slide_left effect"""
        response = self.session.post(
            f"{BASE_URL}/api/projects/{self.project_id}/media/still-to-clip",
            json={"imagePath": self.image_path, "duration": 4, "effect": "slide_left"}
        )
        assert response.status_code == 200, f"slide_left failed: {response.text}"
        data = response.json()
        assert data.get("effect") == "slide_left"
        print("✓ still-to-clip with slide_left effect works")
    
    def test_still_to_clip_slide_right(self):
        """Test still-to-clip with slide_right effect"""
        response = self.session.post(
            f"{BASE_URL}/api/projects/{self.project_id}/media/still-to-clip",
            json={"imagePath": self.image_path, "duration": 4, "effect": "slide_right"}
        )
        assert response.status_code == 200, f"slide_right failed: {response.text}"
        data = response.json()
        assert data.get("effect") == "slide_right"
        print("✓ still-to-clip with slide_right effect works")
    
    def test_still_to_clip_slide_up(self):
        """Test still-to-clip with slide_up effect"""
        response = self.session.post(
            f"{BASE_URL}/api/projects/{self.project_id}/media/still-to-clip",
            json={"imagePath": self.image_path, "duration": 4, "effect": "slide_up"}
        )
        assert response.status_code == 200, f"slide_up failed: {response.text}"
        data = response.json()
        assert data.get("effect") == "slide_up"
        print("✓ still-to-clip with slide_up effect works")
    
    def test_still_to_clip_slide_down(self):
        """Test still-to-clip with slide_down effect"""
        response = self.session.post(
            f"{BASE_URL}/api/projects/{self.project_id}/media/still-to-clip",
            json={"imagePath": self.image_path, "duration": 4, "effect": "slide_down"}
        )
        assert response.status_code == 200, f"slide_down failed: {response.text}"
        data = response.json()
        assert data.get("effect") == "slide_down"
        print("✓ still-to-clip with slide_down effect works")
    
    def test_still_to_clip_vignette(self):
        """Test still-to-clip with vignette effect"""
        response = self.session.post(
            f"{BASE_URL}/api/projects/{self.project_id}/media/still-to-clip",
            json={"imagePath": self.image_path, "duration": 4, "effect": "vignette"}
        )
        assert response.status_code == 200, f"vignette failed: {response.text}"
        data = response.json()
        assert data.get("effect") == "vignette"
        print("✓ still-to-clip with vignette effect works")
    
    def test_still_to_clip_vintage(self):
        """Test still-to-clip with vintage effect"""
        response = self.session.post(
            f"{BASE_URL}/api/projects/{self.project_id}/media/still-to-clip",
            json={"imagePath": self.image_path, "duration": 4, "effect": "vintage"}
        )
        assert response.status_code == 200, f"vintage failed: {response.text}"
        data = response.json()
        assert data.get("effect") == "vintage"
        print("✓ still-to-clip with vintage effect works")
    
    def test_still_to_clip_glow(self):
        """Test still-to-clip with glow effect"""
        response = self.session.post(
            f"{BASE_URL}/api/projects/{self.project_id}/media/still-to-clip",
            json={"imagePath": self.image_path, "duration": 4, "effect": "glow"}
        )
        assert response.status_code == 200, f"glow failed: {response.text}"
        data = response.json()
        assert data.get("effect") == "glow"
        print("✓ still-to-clip with glow effect works")
    
    def test_still_to_clip_film_grain(self):
        """Test still-to-clip with film_grain effect"""
        response = self.session.post(
            f"{BASE_URL}/api/projects/{self.project_id}/media/still-to-clip",
            json={"imagePath": self.image_path, "duration": 4, "effect": "film_grain"}
        )
        assert response.status_code == 200, f"film_grain failed: {response.text}"
        data = response.json()
        assert data.get("effect") == "film_grain"
        print("✓ still-to-clip with film_grain effect works")
    
    def test_still_to_clip_zoom_rotate(self):
        """Test still-to-clip with zoom_rotate effect"""
        response = self.session.post(
            f"{BASE_URL}/api/projects/{self.project_id}/media/still-to-clip",
            json={"imagePath": self.image_path, "duration": 4, "effect": "zoom_rotate"}
        )
        assert response.status_code == 200, f"zoom_rotate failed: {response.text}"
        data = response.json()
        assert data.get("effect") == "zoom_rotate"
        print("✓ still-to-clip with zoom_rotate effect works")


class TestAPIRoot:
    """Test API root endpoint"""
    
    def test_api_root_endpoint(self):
        """Test API root endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"API root failed: {response.text}"
        data = response.json()
        assert "message" in data
        print("✓ API root endpoint returns 200")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
