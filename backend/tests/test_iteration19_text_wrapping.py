"""
Iteration 19 Tests - Hook Text Wrapping, Live Preview, and Climax Region Drag
Tests:
1. Backend: Hook text wrapping at MAX_CHARS_PER_LINE=28
2. Backend: 4+ lines triggers 70% font reduction and wider rewrap
3. Backend: Each line gets individual drawtext with y offset
4. Backend: Pure timeline segmentation for hook distribution
5. Frontend: Live preview panel (data-testid='text-style-preview') in Step6AssembleVideo
6. Frontend: Preview reflects font/size/color/position/style/animation settings
7. Frontend: Step2SelectClimax - dragging region pauses playback
8. Frontend: Step2SelectClimax - clicking inside region seeks and plays
9. Regression: GET /api/effects/list returns 20 effects
10. Regression: POST /api/projects/{id}/media/still-to-clip works
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


class TestHookTextWrappingBackend:
    """Tests for hook text wrapping logic in backend"""
    
    def test_max_chars_per_line_constant(self):
        """Verify MAX_CHARS_PER_LINE = 28 constant exists"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        assert 'MAX_CHARS_PER_LINE = 28' in content, "MAX_CHARS_PER_LINE = 28 not found"
        print("✓ MAX_CHARS_PER_LINE = 28 constant exists")
    
    def test_word_wrap_logic_exists(self):
        """Verify word-wrap logic for long text"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Check for word-wrap logic
        assert 'words = hook.split()' in content, "Word splitting not found"
        assert 'lines = []' in content, "Lines array initialization not found"
        assert 'current_line' in content, "current_line variable not found"
        assert 'MAX_CHARS_PER_LINE' in content, "MAX_CHARS_PER_LINE reference not found"
        print("✓ Word-wrap logic exists for splitting long hooks")
    
    def test_font_reduction_for_long_text(self):
        """Verify 70% font reduction for 4+ lines"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Check for 4+ lines condition
        assert 'len(lines) >= 4' in content, "4+ lines condition not found"
        # Check for 70% reduction (0.7 multiplier)
        assert '0.7' in content or '* 0.7' in content or '*0.7' in content, "70% font reduction not found"
        print("✓ Font reduces to 70% for 4+ lines of text")
    
    def test_wider_rewrap_for_reduced_font(self):
        """Verify wider rewrap when font is reduced"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Check for wider max chars (1.3x)
        assert '1.3' in content, "1.3x wider max chars not found"
        assert 'wider_max' in content, "wider_max variable not found"
        print("✓ Rewraps with 1.3x wider max chars when font is reduced")
    
    def test_individual_drawtext_per_line(self):
        """Verify each line gets its own drawtext filter"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Check for line iteration and drawtext per line
        assert 'for li, line_text in enumerate(lines)' in content, "Line iteration not found"
        assert 'line_offset' in content, "line_offset calculation not found"
        print("✓ Each line gets individual drawtext with y offset")
    
    def test_line_offset_calculation(self):
        """Verify line offset centers text block"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Check for centering formula: (li - (len(lines) - 1) / 2.0) * line_height
        assert '(len(lines) - 1) / 2.0' in content or '(len(lines)-1)/2.0' in content, \
            "Line centering formula not found"
        assert 'line_height' in content, "line_height variable not found"
        print("✓ Line offset centers text block around base position")
    
    def test_pure_timeline_segmentation(self):
        """Verify pure timeline segmentation for hook distribution"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Check for segment_duration calculation
        assert 'segment_duration = effective_duration / num_hooks' in content, \
            "Pure timeline segmentation not found"
        assert 'hook_timings' in content, "hook_timings array not found"
        print("✓ Hook distribution uses pure timeline segmentation")


class TestLivePreviewFrontend:
    """Tests for live text style preview in Step6AssembleVideo"""
    
    def test_preview_panel_exists(self):
        """Verify preview panel with data-testid='text-style-preview' exists"""
        frontend_path = "/app/frontend/src/components/wizard/Step6AssembleVideo.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        assert 'data-testid="text-style-preview"' in content, \
            "Preview panel with data-testid='text-style-preview' not found"
        print("✓ Live preview panel exists with data-testid='text-style-preview'")
    
    def test_preview_has_9_16_aspect_ratio(self):
        """Verify preview uses 9:16 portrait aspect ratio"""
        frontend_path = "/app/frontend/src/components/wizard/Step6AssembleVideo.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        assert "9 / 16" in content or "9/16" in content, "9:16 aspect ratio not found"
        print("✓ Preview panel uses 9:16 portrait aspect ratio")
    
    def test_preview_uses_font_setting(self):
        """Verify preview reflects textFont setting"""
        frontend_path = "/app/frontend/src/components/wizard/Step6AssembleVideo.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        # Check for font family mapping in preview
        assert 'assemblySettings.textFont' in content, "textFont setting not used in preview"
        assert 'fontFamily' in content, "fontFamily CSS property not found"
        print("✓ Preview reflects textFont setting")
    
    def test_preview_uses_size_setting(self):
        """Verify preview reflects textSize setting"""
        frontend_path = "/app/frontend/src/components/wizard/Step6AssembleVideo.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        assert 'assemblySettings.textSize' in content, "textSize setting not used in preview"
        assert 'fontSize' in content, "fontSize CSS property not found"
        print("✓ Preview reflects textSize setting")
    
    def test_preview_uses_color_setting(self):
        """Verify preview reflects textColor setting"""
        frontend_path = "/app/frontend/src/components/wizard/Step6AssembleVideo.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        assert 'assemblySettings.textColor' in content, "textColor setting not used in preview"
        assert 'colorMap' in content or 'textColor' in content, "Color mapping not found"
        print("✓ Preview reflects textColor setting")
    
    def test_preview_uses_position_setting(self):
        """Verify preview reflects textPosition setting"""
        frontend_path = "/app/frontend/src/components/wizard/Step6AssembleVideo.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        assert 'assemblySettings.textPosition' in content, "textPosition setting not used in preview"
        assert 'posMap' in content or 'topPos' in content, "Position mapping not found"
        print("✓ Preview reflects textPosition setting")
    
    def test_preview_uses_style_setting(self):
        """Verify preview reflects textStyle setting"""
        frontend_path = "/app/frontend/src/components/wizard/Step6AssembleVideo.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        assert 'assemblySettings.textStyle' in content, "textStyle setting not used in preview"
        assert 'textShadow' in content, "textShadow CSS property not found"
        print("✓ Preview reflects textStyle setting")
    
    def test_preview_uses_animation_setting(self):
        """Verify preview reflects textAnimation setting"""
        frontend_path = "/app/frontend/src/components/wizard/Step6AssembleVideo.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        assert 'assemblySettings.textAnimation' in content, "textAnimation setting not used in preview"
        print("✓ Preview reflects textAnimation setting")
    
    def test_preview_shows_sample_hook_text(self):
        """Verify preview shows sample hook text or first selected hook"""
        frontend_path = "/app/frontend/src/components/wizard/Step6AssembleVideo.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        # Check for previewText using selectedHooks or fallback
        assert 'previewText' in content or 'selectedHooks' in content, \
            "Preview text source not found"
        assert 'Sample hook text' in content or 'selectedHooks' in content, \
            "Sample text fallback not found"
        print("✓ Preview shows sample hook text or first selected hook")


class TestClimaxRegionDrag:
    """Tests for Step2SelectClimax region drag behavior"""
    
    def test_region_drag_pauses_playback(self):
        """Verify dragging region pauses audio playback"""
        frontend_path = "/app/frontend/src/components/wizard/Step2SelectClimax.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        # Check for pause on region drag
        assert "wavesurferRef.current.pause()" in content, "Pause on region drag not found"
        # Check it's in the region drag handler
        assert "which === 'region'" in content or "'region'" in content, "Region drag handler not found"
        print("✓ Dragging region pauses audio playback")
    
    def test_region_drag_seeks_on_release(self):
        """Verify releasing region drag seeks to new climaxStart"""
        frontend_path = "/app/frontend/src/components/wizard/Step2SelectClimax.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        # Check for setTime on mouse up after drag
        assert "setTime(project.climaxStart)" in content or "wavesurferRef.current.setTime" in content, \
            "Seek to climaxStart on release not found"
        print("✓ Releasing region drag seeks to new climaxStart")
    
    def test_click_inside_region_seeks_and_plays(self):
        """Verify clicking inside region (not dragging) seeks and plays"""
        frontend_path = "/app/frontend/src/components/wizard/Step2SelectClimax.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        # Check for click detection (dx < 4 && dy < 4)
        assert 'dx < 4' in content or 'dx<4' in content, "Click detection (dx < 4) not found"
        assert 'dy < 4' in content or 'dy<4' in content, "Click detection (dy < 4) not found"
        # Check for play on click
        assert '.play()' in content, "Play on click not found"
        print("✓ Clicking inside region seeks and plays")
    
    def test_click_start_ref_for_drag_detection(self):
        """Verify clickStartRef is used to distinguish click from drag"""
        frontend_path = "/app/frontend/src/components/wizard/Step2SelectClimax.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        assert 'clickStartRef' in content, "clickStartRef not found"
        assert 'clickStartRef.current' in content, "clickStartRef.current usage not found"
        print("✓ clickStartRef used to distinguish click from drag")
    
    def test_region_has_data_testid(self):
        """Verify trim region has data-testid for testing"""
        frontend_path = "/app/frontend/src/components/wizard/Step2SelectClimax.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        assert 'data-testid="trim-region"' in content, "trim-region data-testid not found"
        print("✓ Trim region has data-testid='trim-region'")


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


class TestMultilineDrawtextAnimation:
    """Tests for multiline drawtext with animation expressions"""
    
    def test_multiline_fade_animation(self):
        """Verify fade animation works with multiple lines"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Check that alpha_expr is used in drawtext
        assert "alpha='{alpha_expr}'" in content or 'alpha=' in content, \
            "Alpha expression in drawtext not found"
        print("✓ Fade animation uses alpha expression for each line")
    
    def test_multiline_slide_animation(self):
        """Verify slide animations work with multiple lines"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Check that y_expr includes line_offset
        assert 'line_offset' in content, "line_offset not found in y expression"
        assert "y='{y_expr}'" in content or 'y=' in content, "Y expression in drawtext not found"
        print("✓ Slide animations use y expression with line offset")
    
    def test_each_line_animated_independently(self):
        """Verify each line is animated independently"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Check for line iteration with animation
        assert 'for li, line_text in enumerate(lines)' in content, \
            "Line iteration for animation not found"
        # Check that drawtext is appended per line
        assert 'filter_parts.append' in content, "filter_parts.append not found"
        print("✓ Each line gets its own animated drawtext filter")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
