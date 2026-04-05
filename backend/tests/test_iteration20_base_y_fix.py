"""
Iteration 20 Tests - base_y Fix and Video Duration Matching
Tests:
1. Backend P0 Fix: base_y is now explicitly set before hook_timings loop
2. Backend: Hook drawtext generation with multiline + animations works
3. Backend: POST /api/projects/{id}/media/trim-video works with maxDuration param
4. Backend: POST /api/projects/{id}/media/still-to-clip works (regression)
5. Backend: GET /api/effects/list returns 20 effects (regression)
6. Auth: Login works with test@example.com / test123456
"""

import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "_id" in data
        assert data["email"] == "test@example.com"
        print("✓ Login works with test@example.com / test123456")


class TestBaseYFix:
    """Tests for the base_y fix in server.py"""
    
    def test_base_y_variable_exists_before_loop(self):
        """Verify base_y = txt_y is set before the hook_timings loop"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Find the line with base_y = txt_y
        base_y_match = re.search(r'base_y\s*=\s*txt_y', content)
        assert base_y_match, "base_y = txt_y assignment not found in server.py"
        
        # Find the hook_timings loop
        hook_loop_match = re.search(r'for\s+start_t,\s*end_t,\s*hook\s+in\s+hook_timings:', content)
        assert hook_loop_match, "hook_timings loop not found in server.py"
        
        # Verify base_y is set BEFORE the loop
        assert base_y_match.start() < hook_loop_match.start(), \
            "base_y must be set BEFORE the hook_timings loop"
        
        print("✓ base_y = txt_y is correctly set before hook_timings loop")
    
    def test_base_y_used_in_drawtext_y_expressions(self):
        """Verify base_y is used in y_expr calculations"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Check that base_y is used in y_expr calculations
        # Pattern: y_expr = f"{base_y}+({line_offset:.0f})"
        assert 'y_expr = f"{base_y}' in content, "y_expr using base_y not found"
        assert '{base_y}+({line_offset' in content, "base_y+line_offset pattern not found"
        
        print("✓ base_y is correctly used in drawtext y expressions")
    
    def test_multiline_text_wrapping_exists(self):
        """Verify multiline text wrapping logic exists"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Check for MAX_CHARS_PER_LINE constant
        assert "MAX_CHARS_PER_LINE" in content, "MAX_CHARS_PER_LINE constant not found"
        
        # Check for word-wrap logic
        assert "words = hook.split()" in content, "Word splitting logic not found"
        assert "lines.append" in content, "Lines append logic not found"
        
        print("✓ Multiline text wrapping logic exists")
    
    def test_font_reduction_for_long_text(self):
        """Verify font reduction for 4+ lines"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Check for font reduction logic
        assert "len(lines) >= 4" in content, "Font reduction condition not found"
        assert "txt_fontsize * 0.7" in content, "70% font reduction not found"
        
        print("✓ Font reduction for 4+ lines exists")


class TestRegressionEndpoints:
    """Regression tests for existing endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("✓ API root endpoint returns 200")
    
    def test_effects_list_returns_20_effects(self, auth_headers):
        """Test GET /api/effects/list returns 20 effects"""
        response = requests.get(f"{BASE_URL}/api/effects/list", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "effects" in data
        assert len(data["effects"]) == 20, f"Expected 20 effects, got {len(data['effects'])}"
        
        # Verify effect structure
        effect = data["effects"][0]
        assert "id" in effect
        assert "name" in effect
        assert "category" in effect
        
        print(f"✓ GET /api/effects/list returns {len(data['effects'])} effects")
    
    def test_still_to_clip_endpoint_exists(self, auth_headers):
        """Test POST /api/projects/{id}/media/still-to-clip endpoint exists"""
        # Use a test project ID - endpoint should return 404 for non-existent project
        # but not 405 (method not allowed) or 500
        response = requests.post(
            f"{BASE_URL}/api/projects/000000000000000000000000/media/still-to-clip",
            headers=auth_headers,
            json={"imagePath": "/test/path.jpg", "duration": 4, "effect": "ken_burns_in"}
        )
        # Should be 404 (project not found) not 405 or 500
        assert response.status_code in [400, 404], f"Unexpected status: {response.status_code}"
        print("✓ POST /api/projects/{id}/media/still-to-clip endpoint exists")
    
    def test_trim_video_endpoint_exists(self, auth_headers):
        """Test POST /api/projects/{id}/media/trim-video endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/projects/000000000000000000000000/media/trim-video",
            headers=auth_headers,
            json={"videoPath": "/test/path.mp4", "maxDuration": 10}
        )
        # Should be 404 (project not found) not 405 or 500
        assert response.status_code in [400, 404], f"Unexpected status: {response.status_code}"
        print("✓ POST /api/projects/{id}/media/trim-video endpoint exists")


class TestFrontendVideoDurationLogic:
    """Tests for frontend video duration matching logic in Step6AssembleVideo.js"""
    
    def test_prepare_library_clips_separates_images_videos(self):
        """Verify prepareLibraryClips separates images and videos"""
        frontend_path = "/app/frontend/src/components/wizard/Step6AssembleVideo.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        # Check for image/video separation
        assert "const imageItems = []" in content, "imageItems array not found"
        assert "const videoItems = []" in content, "videoItems array not found"
        assert "stock-photo" in content, "stock-photo type check not found"
        assert "upload-image" in content, "upload-image type check not found"
        
        print("✓ prepareLibraryClips separates images and videos")
    
    def test_video_repeat_plan_exists(self):
        """Verify videoRepeatPlan logic exists"""
        frontend_path = "/app/frontend/src/components/wizard/Step6AssembleVideo.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        assert "videoRepeatPlan" in content, "videoRepeatPlan not found"
        assert "audioDurForVideos" in content, "audioDurForVideos calculation not found"
        
        print("✓ videoRepeatPlan logic exists")
    
    def test_video_trim_proportionally_logic(self):
        """Verify videos are trimmed proportionally when total > audio"""
        frontend_path = "/app/frontend/src/components/wizard/Step6AssembleVideo.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        # Check for proportional trim logic
        assert "totalVideoDuration >= audioDurForVideos" in content, \
            "Condition for trimming when videos > audio not found"
        assert "audioDurForVideos / totalVideoDuration" in content, \
            "Ratio calculation for proportional trim not found"
        
        print("✓ Video trim proportionally logic exists (when total video > audio)")
    
    def test_video_repeat_to_fill_logic(self):
        """Verify videos are repeated when total < audio"""
        frontend_path = "/app/frontend/src/components/wizard/Step6AssembleVideo.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        # Check for repeat logic
        assert "while (filled < audioDurForVideos)" in content, \
            "While loop for filling audio duration not found"
        assert "repeatIdx % videoItems.length" in content, \
            "Video repeat cycling logic not found"
        
        print("✓ Video repeat to fill logic exists (when total video < audio)")
    
    def test_trim_video_api_call(self):
        """Verify trim-video API is called for video items"""
        frontend_path = "/app/frontend/src/components/wizard/Step6AssembleVideo.js"
        with open(frontend_path, 'r') as f:
            content = f.read()
        
        assert "/media/trim-video" in content, "trim-video API call not found"
        assert "maxDuration: vp.duration" in content, "maxDuration parameter not found"
        
        print("✓ trim-video API is called with maxDuration parameter")


class TestAnimationSupport:
    """Tests for animation support in hook text rendering"""
    
    def test_animation_types_supported(self):
        """Verify all animation types are supported"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        animations = ["none", "fade", "slide_up", "slide_down", "pop", "bounce"]
        for anim in animations:
            assert f'anim == "{anim}"' in content or f"anim == '{anim}'" in content, \
                f"Animation type '{anim}' not found in server.py"
        
        print(f"✓ All animation types supported: {animations}")
    
    def test_per_line_drawtext_generation(self):
        """Verify each line gets its own drawtext filter"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Check for per-line drawtext generation
        assert "for li, line_text in enumerate(lines):" in content, \
            "Per-line enumeration not found"
        assert "line_offset = (li - (len(lines) - 1) / 2.0) * line_height" in content, \
            "Line offset calculation not found"
        
        print("✓ Each line gets individual drawtext with y offset")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
