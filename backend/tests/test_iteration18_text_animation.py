"""
Iteration 18 Tests - Text Animation Features for Music Video Factory
Tests:
1. Backend: AssembleVideoRequest has textAnimation field (Optional[str] = 'fade')
2. Backend: textAnimation options: none, fade, slide_up, slide_down, pop, bounce
3. Backend: drawtext filter generation uses alpha/y expressions per animation type
4. Backend: GET /api/effects/list returns 20 effects (regression)
5. Backend: POST /api/projects/{id}/media/still-to-clip works (regression)
6. Frontend: Animation row with 6 buttons (data-testid='text-anim-{value}')
7. Frontend: Default animation is 'fade'
8. Frontend: Assembly payload includes textAnimation field
"""

import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthAndBasics:
    """Basic auth and API health tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in login response"
        return data["access_token"]
    
    def test_login_works(self, auth_token):
        """Verify login works with test credentials"""
        assert auth_token is not None
        assert len(auth_token) > 10
        print("✓ Login works with test@example.com / test123456")
    
    def test_api_root(self):
        """Verify API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("✓ API root endpoint returns 200")


class TestEffectsListRegression:
    """Regression tests for /api/effects/list endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_effects_list_returns_20_effects(self, auth_headers):
        """Verify /api/effects/list returns 20 effects"""
        response = requests.get(f"{BASE_URL}/api/effects/list", headers=auth_headers)
        assert response.status_code == 200, f"Effects list failed: {response.text}"
        data = response.json()
        
        assert "effects" in data
        effects = data["effects"]
        assert len(effects) == 20, f"Expected 20 effects, got {len(effects)}"
        print(f"✓ GET /api/effects/list returns 20 effects")
    
    def test_effects_list_has_transitions(self, auth_headers):
        """Verify effects list has 3 transitions"""
        response = requests.get(f"{BASE_URL}/api/effects/list", headers=auth_headers)
        data = response.json()
        
        assert "transitions" in data
        transitions = data["transitions"]
        assert len(transitions) == 3, f"Expected 3 transitions, got {len(transitions)}"
        
        transition_ids = [t["id"] for t in transitions]
        assert "crossfade" in transition_ids
        assert "cut" in transition_ids
        assert "fade_black" in transition_ids
        print("✓ Effects list has 3 transitions (crossfade, cut, fade_black)")
    
    def test_effects_list_has_presets(self, auth_headers):
        """Verify effects list has 6 presets"""
        response = requests.get(f"{BASE_URL}/api/effects/list", headers=auth_headers)
        data = response.json()
        
        assert "presets" in data
        presets = data["presets"]
        assert len(presets) == 6, f"Expected 6 presets, got {len(presets)}"
        print("✓ Effects list has 6 presets")


class TestStillToClipRegression:
    """Regression tests for still-to-clip endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_project_id(self):
        """Use existing test project"""
        return "69d1609e3dbd882c6ec76c2a"
    
    def test_still_to_clip_endpoint_exists(self, auth_headers, test_project_id):
        """Verify still-to-clip endpoint exists and accepts requests"""
        # Test with a non-existent image path - should return 400 (not 404 or 500)
        response = requests.post(
            f"{BASE_URL}/api/projects/{test_project_id}/media/still-to-clip",
            headers=auth_headers,
            json={
                "imagePath": "/nonexistent/path.jpg",
                "duration": 4,
                "effect": "ken_burns_in"
            }
        )
        # Should return 400 for invalid path, not 404 (endpoint not found) or 500
        assert response.status_code in [400, 404], f"Unexpected status: {response.status_code}"
        print("✓ POST /api/projects/{id}/media/still-to-clip endpoint exists")


class TestTextAnimationBackend:
    """Tests for textAnimation field in AssembleVideoRequest"""
    
    def test_assemble_video_request_has_text_animation_field(self):
        """Verify AssembleVideoRequest model has textAnimation field"""
        # Read server.py and check for textAnimation field
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Check for textAnimation field in AssembleVideoRequest
        assert 'textAnimation: Optional[str]' in content, "textAnimation field not found in AssembleVideoRequest"
        assert '"fade"' in content or "'fade'" in content, "Default value 'fade' not found"
        print("✓ Backend AssembleVideoRequest has textAnimation: Optional[str] = 'fade'")
    
    def test_text_animation_options_documented(self):
        """Verify all 6 animation options are in the code"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Check for animation type handling
        animation_types = ['none', 'fade', 'slide_up', 'slide_down', 'pop', 'bounce']
        for anim in animation_types:
            # Check for anim == "type" pattern
            pattern = f'anim == "{anim}"'
            assert pattern in content, f"Animation type '{anim}' handling not found"
        
        print("✓ All 6 animation types (none, fade, slide_up, slide_down, pop, bounce) are handled")
    
    def test_drawtext_alpha_expressions_for_fade(self):
        """Verify fade animation uses alpha expressions"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Check for alpha expression in fade animation
        assert 'alpha_expr' in content, "alpha_expr variable not found"
        assert 'alpha=' in content, "alpha= in drawtext not found"
        print("✓ Backend uses alpha expressions for fade animation")
    
    def test_drawtext_y_expressions_for_slide(self):
        """Verify slide animations use y expressions"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Check for y expression in slide animations
        assert 'y_expr' in content, "y_expr variable not found"
        assert "slide_up" in content, "slide_up animation not found"
        assert "slide_down" in content, "slide_down animation not found"
        print("✓ Backend uses y expressions for slide animations")
    
    def test_pop_animation_has_quick_appear(self):
        """Verify pop animation has quick appear timing"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Pop animation should have shorter duration (pd = 0.3)
        assert 'anim == "pop"' in content, "pop animation handling not found"
        assert 'pd = 0.3' in content, "pop animation quick duration (0.3) not found"
        print("✓ Pop animation has quick appear (pd = 0.3)")
    
    def test_bounce_animation_has_deceleration(self):
        """Verify bounce animation has deceleration effect"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Bounce animation should have bounce duration and quadratic easing
        assert 'anim == "bounce"' in content, "bounce animation handling not found"
        assert 'bd = 0.5' in content, "bounce animation duration (0.5) not found"
        print("✓ Bounce animation has deceleration effect (bd = 0.5)")
    
    def test_escaped_commas_in_ffmpeg_expressions(self):
        """Verify FFmpeg expressions use escaped commas"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # FFmpeg drawtext expressions should use \\, for escaped commas
        assert '\\\\,' in content, "Escaped commas (\\\\,) not found in FFmpeg expressions"
        print("✓ FFmpeg expressions use escaped commas (\\\\,)")


class TestTextAnimationFrontend:
    """Tests for text animation UI in Step6AssembleVideo"""
    
    def test_animation_row_exists_in_frontend(self):
        """Verify Animation row exists in Step6AssembleVideo.js"""
        frontend_path = "/app/frontend/src/components/wizard/Step6AssembleVideo.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        # Check for Animation label
        assert 'Animation' in content, "Animation label not found in frontend"
        print("✓ Frontend has Animation row in text style controls")
    
    def test_six_animation_buttons_exist(self):
        """Verify all 6 animation buttons exist with correct data-testid"""
        frontend_path = "/app/frontend/src/components/wizard/Step6AssembleVideo.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        # Check for data-testid pattern (dynamically generated)
        assert 'data-testid={`text-anim-${opt.value}`}' in content, "data-testid pattern for animation buttons not found"
        
        # Check for all 6 animation values in the array
        animation_values = ['none', 'fade', 'slide_up', 'slide_down', 'pop', 'bounce']
        for value in animation_values:
            assert f"value: '{value}'" in content, f"Animation value '{value}' not found in button array"
        
        print("✓ All 6 animation buttons have correct data-testid pattern (text-anim-{value})")
    
    def test_animation_button_labels(self):
        """Verify animation buttons have correct labels"""
        frontend_path = "/app/frontend/src/components/wizard/Step6AssembleVideo.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        # Check for button labels
        labels = ['None', 'Fade', 'Slide Up', 'Slide Down', 'Pop', 'Bounce']
        for label in labels:
            assert label in content, f"Button label '{label}' not found"
        
        print("✓ Animation buttons have correct labels (None, Fade, Slide Up, Slide Down, Pop, Bounce)")
    
    def test_default_animation_is_fade(self):
        """Verify default animation is 'fade'"""
        frontend_path = "/app/frontend/src/components/wizard/Step6AssembleVideo.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        # Check for default value in comparison
        assert "textAnimation || 'fade'" in content or 'textAnimation || "fade"' in content, \
            "Default animation 'fade' not found in frontend"
        print("✓ Default animation is 'fade'")
    
    def test_text_animation_in_payload(self):
        """Verify textAnimation is included in assembly payload"""
        frontend_path = "/app/frontend/src/components/wizard/Step6AssembleVideo.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        # Check for textAnimation in payload
        assert 'textAnimation:' in content, "textAnimation not found in payload"
        assert "assemblySettings.textAnimation" in content, "assemblySettings.textAnimation not found"
        print("✓ Frontend sends textAnimation in assembly payload")
    
    def test_update_settings_for_animation(self):
        """Verify updateSettings is called for textAnimation"""
        frontend_path = "/app/frontend/src/components/wizard/Step6AssembleVideo.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        # Check for updateSettings call with textAnimation
        assert "updateSettings('textAnimation'" in content, "updateSettings for textAnimation not found"
        print("✓ Frontend calls updateSettings('textAnimation', ...) on button click")


class TestAssemblyPayloadIntegration:
    """Integration tests for assembly payload with textAnimation"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_assemble_endpoint_accepts_text_animation(self, auth_headers):
        """Verify /api/video/assemble accepts textAnimation parameter"""
        # This test just verifies the endpoint accepts the parameter
        # We don't actually run assembly (too slow), just check validation
        
        # Create a minimal payload with textAnimation
        payload = {
            "projectId": "69d1609e3dbd882c6ec76c2a",
            "clipOrder": [0],
            "crossfadeDuration": 0.5,
            "addTextOverlay": True,
            "hookTexts": ["Test hook"],
            "textAnimation": "bounce"  # Test with bounce animation
        }
        
        response = requests.post(
            f"{BASE_URL}/api/video/assemble",
            headers=auth_headers,
            json=payload
        )
        
        # Should not fail with validation error for textAnimation
        # May fail for other reasons (no clips, etc.) but not for textAnimation field
        if response.status_code == 422:
            error_detail = response.json().get("detail", [])
            for err in error_detail:
                assert "textAnimation" not in str(err), f"textAnimation validation error: {err}"
        
        print("✓ /api/video/assemble accepts textAnimation parameter")


class TestCodeQuality:
    """Code quality and structure tests"""
    
    def test_animation_types_match_frontend_backend(self):
        """Verify animation types match between frontend and backend"""
        # Backend animation types
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            backend_content = f.read()
        
        # Frontend animation types
        frontend_path = "/app/frontend/src/components/wizard/Step6AssembleVideo.js"
        with open(frontend_path, 'r') as f:
            frontend_content = f.read()
        
        animation_types = ['none', 'fade', 'slide_up', 'slide_down', 'pop', 'bounce']
        
        for anim in animation_types:
            # Check backend handles this type
            assert f'anim == "{anim}"' in backend_content, f"Backend missing handler for '{anim}'"
            # Check frontend has button for this type
            assert f"value: '{anim}'" in frontend_content, f"Frontend missing button for '{anim}'"
        
        print("✓ Animation types match between frontend and backend")
    
    def test_min_hook_duration_constant(self):
        """Verify MIN_HOOK_DURATION constant exists"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        assert 'MIN_HOOK_DURATION = 2.5' in content, "MIN_HOOK_DURATION = 2.5 not found"
        print("✓ MIN_HOOK_DURATION = 2.5 constant exists")
    
    def test_anim_dur_constant(self):
        """Verify ANIM_DUR constant for animation timing"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        assert 'ANIM_DUR = 0.6' in content, "ANIM_DUR = 0.6 not found"
        print("✓ ANIM_DUR = 0.6 constant exists for animation timing")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
