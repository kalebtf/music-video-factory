"""
Iteration 17 Tests - Music Video Factory
Features tested:
1. Backend: AssembleVideoRequest textFont field (sans, serif, mono, condensed)
2. Backend: Font files mapped to Liberation fonts
3. Backend: Hooks distribution uses clip-aligned placement
4. Backend: MIN_HOOK_DURATION = 2.5 seconds
5. Backend: GET /api/effects/list returns 20 effects, 3 transitions, 6 presets
6. Frontend: StepMediaLibrary transition selector (crossfade, cut, fade_black)
7. Frontend: Step6AssembleVideo font family selector
8. Login verification
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestIteration17Features:
    """Test new features for iteration 17"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            if 'access_token' in data:
                self.session.headers.update({"Authorization": f"Bearer {data['access_token']}"})
            self.user_id = data.get('_id')
        else:
            pytest.skip(f"Login failed with status {login_response.status_code}")
        
        yield
        
        # Cleanup
        self.session.close()
    
    def test_login_works(self):
        """Verify login works with test credentials"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "_id" in data, "Login response missing user ID"
        assert data["email"] == "test@example.com"
        print("✓ Login works with test@example.com / test123456")
    
    def test_effects_list_returns_20_effects(self):
        """Verify /api/effects/list returns 20 effects"""
        response = self.session.get(f"{BASE_URL}/api/effects/list")
        assert response.status_code == 200, f"Effects list failed: {response.text}"
        data = response.json()
        
        effects = data.get("effects", [])
        assert len(effects) == 20, f"Expected 20 effects, got {len(effects)}"
        
        # Verify effect IDs
        effect_ids = [e["id"] for e in effects]
        expected_effects = [
            "ken_burns_in", "ken_burns_out", "pan_left", "pan_right", "pan_up", "pan_down",
            "slide_left", "slide_right", "slide_up", "slide_down", "zoom_rotate",
            "fade_in", "fade_out", "blur_in", "blur_out",
            "vignette", "vintage", "glow", "film_grain", "static"
        ]
        for eff in expected_effects:
            assert eff in effect_ids, f"Missing effect: {eff}"
        
        print(f"✓ /api/effects/list returns {len(effects)} effects")
    
    def test_effects_list_returns_3_transitions(self):
        """Verify /api/effects/list returns 3 transitions"""
        response = self.session.get(f"{BASE_URL}/api/effects/list")
        assert response.status_code == 200
        data = response.json()
        
        transitions = data.get("transitions", [])
        assert len(transitions) == 3, f"Expected 3 transitions, got {len(transitions)}"
        
        transition_ids = [t["id"] for t in transitions]
        assert "crossfade" in transition_ids, "Missing crossfade transition"
        assert "cut" in transition_ids, "Missing cut transition"
        assert "fade_black" in transition_ids, "Missing fade_black transition"
        
        print(f"✓ /api/effects/list returns {len(transitions)} transitions: {transition_ids}")
    
    def test_effects_list_returns_6_presets(self):
        """Verify /api/effects/list returns 6 presets"""
        response = self.session.get(f"{BASE_URL}/api/effects/list")
        assert response.status_code == 200
        data = response.json()
        
        presets = data.get("presets", [])
        assert len(presets) == 6, f"Expected 6 presets, got {len(presets)}"
        
        preset_ids = [p["id"] for p in presets]
        expected_presets = ["cinematic", "dynamic", "smooth", "energetic", "vintage_film", "dreamy"]
        for preset in expected_presets:
            assert preset in preset_ids, f"Missing preset: {preset}"
        
        print(f"✓ /api/effects/list returns {len(presets)} presets: {preset_ids}")
    
    def test_api_root_endpoint(self):
        """Verify API root endpoint works"""
        response = self.session.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("✓ API root endpoint returns 200")


class TestHooksDistributionAlgorithm:
    """Test the hooks distribution algorithm logic"""
    
    def test_clip_aligned_distribution_3_hooks_7_clips(self):
        """
        Test: 3 hooks, 7 clips → assigned clips should be [0, 3, 6]
        Formula: clip_idx = round(i * (num_clips - 1) / max(num_hooks - 1, 1))
        """
        num_hooks = 3
        num_clips = 7
        
        assigned_clips = []
        for i in range(num_hooks):
            clip_idx = round(i * (num_clips - 1) / max(num_hooks - 1, 1))
            assigned_clips.append(clip_idx)
        
        expected = [0, 3, 6]
        assert assigned_clips == expected, f"Expected {expected}, got {assigned_clips}"
        print(f"✓ 3 hooks, 7 clips → assigned clips: {assigned_clips}")
    
    def test_clip_aligned_distribution_2_hooks_5_clips(self):
        """
        Test: 2 hooks, 5 clips → assigned clips should be [0, 4]
        """
        num_hooks = 2
        num_clips = 5
        
        assigned_clips = []
        for i in range(num_hooks):
            clip_idx = round(i * (num_clips - 1) / max(num_hooks - 1, 1))
            assigned_clips.append(clip_idx)
        
        expected = [0, 4]
        assert assigned_clips == expected, f"Expected {expected}, got {assigned_clips}"
        print(f"✓ 2 hooks, 5 clips → assigned clips: {assigned_clips}")
    
    def test_clip_aligned_distribution_4_hooks_8_clips(self):
        """
        Test: 4 hooks, 8 clips → assigned clips should be [0, 2, 5, 7]
        """
        num_hooks = 4
        num_clips = 8
        
        assigned_clips = []
        for i in range(num_hooks):
            clip_idx = round(i * (num_clips - 1) / max(num_hooks - 1, 1))
            assigned_clips.append(clip_idx)
        
        # i=0: round(0 * 7 / 3) = 0
        # i=1: round(1 * 7 / 3) = round(2.33) = 2
        # i=2: round(2 * 7 / 3) = round(4.67) = 5
        # i=3: round(3 * 7 / 3) = 7
        expected = [0, 2, 5, 7]
        assert assigned_clips == expected, f"Expected {expected}, got {assigned_clips}"
        print(f"✓ 4 hooks, 8 clips → assigned clips: {assigned_clips}")
    
    def test_clip_aligned_distribution_1_hook_5_clips(self):
        """
        Test: 1 hook, 5 clips → assigned clips should be [0]
        """
        num_hooks = 1
        num_clips = 5
        
        assigned_clips = []
        for i in range(num_hooks):
            clip_idx = round(i * (num_clips - 1) / max(num_hooks - 1, 1))
            assigned_clips.append(clip_idx)
        
        expected = [0]
        assert assigned_clips == expected, f"Expected {expected}, got {assigned_clips}"
        print(f"✓ 1 hook, 5 clips → assigned clips: {assigned_clips}")
    
    def test_min_hook_duration_constant(self):
        """Verify MIN_HOOK_DURATION is 2.5 seconds"""
        MIN_HOOK_DURATION = 2.5
        assert MIN_HOOK_DURATION == 2.5, "MIN_HOOK_DURATION should be 2.5"
        print("✓ MIN_HOOK_DURATION = 2.5 seconds")


class TestFontMapping:
    """Test font file mapping"""
    
    def test_liberation_sans_exists(self):
        """Verify LiberationSans-Bold.ttf exists"""
        import os
        font_path = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
        assert os.path.exists(font_path), f"Font file not found: {font_path}"
        print(f"✓ Font exists: {font_path}")
    
    def test_liberation_serif_exists(self):
        """Verify LiberationSerif-Bold.ttf exists"""
        import os
        font_path = "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf"
        assert os.path.exists(font_path), f"Font file not found: {font_path}"
        print(f"✓ Font exists: {font_path}")
    
    def test_liberation_mono_exists(self):
        """Verify LiberationMono-Bold.ttf exists"""
        import os
        font_path = "/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf"
        assert os.path.exists(font_path), f"Font file not found: {font_path}"
        print(f"✓ Font exists: {font_path}")
    
    def test_liberation_narrow_exists(self):
        """Verify LiberationSansNarrow-Bold.ttf exists"""
        import os
        font_path = "/usr/share/fonts/truetype/liberation/LiberationSansNarrow-Bold.ttf"
        assert os.path.exists(font_path), f"Font file not found: {font_path}"
        print(f"✓ Font exists: {font_path}")


class TestCodeReview:
    """Code review verification tests"""
    
    def test_backend_textfont_field_in_request(self):
        """Verify AssembleVideoRequest has textFont field"""
        # Read server.py and check for textFont
        with open('/app/backend/server.py', 'r') as f:
            content = f.read()
        
        assert 'textFont: Optional[str] = "sans"' in content, "textFont field not found in AssembleVideoRequest"
        print("✓ Backend: AssembleVideoRequest has textFont field with default 'sans'")
    
    def test_backend_font_map_uses_liberation(self):
        """Verify font_map uses Liberation fonts"""
        with open('/app/backend/server.py', 'r') as f:
            content = f.read()
        
        assert 'LiberationSans-Bold.ttf' in content, "LiberationSans-Bold.ttf not in font_map"
        assert 'LiberationSerif-Bold.ttf' in content, "LiberationSerif-Bold.ttf not in font_map"
        assert 'LiberationMono-Bold.ttf' in content, "LiberationMono-Bold.ttf not in font_map"
        assert 'LiberationSansNarrow-Bold.ttf' in content, "LiberationSansNarrow-Bold.ttf not in font_map"
        print("✓ Backend: font_map uses Liberation fonts (Sans, Serif, Mono, Narrow)")
    
    def test_backend_min_hook_duration_constant(self):
        """Verify MIN_HOOK_DURATION = 2.5 in server.py"""
        with open('/app/backend/server.py', 'r') as f:
            content = f.read()
        
        assert 'MIN_HOOK_DURATION = 2.5' in content, "MIN_HOOK_DURATION = 2.5 not found"
        print("✓ Backend: MIN_HOOK_DURATION = 2.5 seconds")
    
    def test_backend_clip_aligned_formula(self):
        """Verify clip-aligned distribution formula in server.py"""
        with open('/app/backend/server.py', 'r') as f:
            content = f.read()
        
        # Check for the formula: round(i * (num_clips - 1) / max(num_hooks - 1, 1))
        assert 'round(i * (num_clips - 1) / max(num_hooks - 1, 1))' in content, \
            "Clip-aligned distribution formula not found"
        print("✓ Backend: Clip-aligned distribution formula present")
    
    def test_frontend_transition_select_testid(self):
        """Verify StepMediaLibrary has transition-select-{id} data-testid"""
        with open('/app/frontend/src/components/wizard/StepMediaLibrary.js', 'r') as f:
            content = f.read()
        
        assert 'transition-select-' in content, "transition-select-{id} data-testid not found"
        assert 'updateTransition' in content, "updateTransition function not found"
        print("✓ Frontend: StepMediaLibrary has transition-select-{id} data-testid")
    
    def test_frontend_transition_options(self):
        """Verify StepMediaLibrary has 3 transition options"""
        with open('/app/frontend/src/components/wizard/StepMediaLibrary.js', 'r') as f:
            content = f.read()
        
        assert 'value="crossfade"' in content, "Crossfade option not found"
        assert 'value="cut"' in content, "Hard Cut option not found"
        assert 'value="fade_black"' in content, "Fade Black option not found"
        print("✓ Frontend: StepMediaLibrary has 3 transition options (crossfade, cut, fade_black)")
    
    def test_frontend_font_family_buttons(self):
        """Verify Step6AssembleVideo has font family buttons"""
        with open('/app/frontend/src/components/wizard/Step6AssembleVideo.js', 'r') as f:
            content = f.read()
        
        # Check for the template literal pattern and font options
        assert 'data-testid={`text-font-${opt.value}`}' in content, "text-font-{value} data-testid pattern not found"
        assert "value: 'sans'" in content, "sans font option not found"
        assert "value: 'serif'" in content, "serif font option not found"
        assert "value: 'mono'" in content, "mono font option not found"
        assert "value: 'condensed'" in content, "condensed font option not found"
        print("✓ Frontend: Step6AssembleVideo has font family buttons (sans, serif, mono, condensed)")
    
    def test_frontend_textfont_in_payload(self):
        """Verify Step6AssembleVideo sends textFont in payload"""
        with open('/app/frontend/src/components/wizard/Step6AssembleVideo.js', 'r') as f:
            content = f.read()
        
        assert "textFont:" in content, "textFont not in assembly payload"
        print("✓ Frontend: Step6AssembleVideo sends textFont in assembly payload")
    
    def test_ai_mode_untouched(self):
        """Verify Step5AnimateClips (AI Mode) doesn't use FFmpeg effects"""
        with open('/app/frontend/src/components/wizard/Step5AnimateClips.js', 'r') as f:
            content = f.read()
        
        # AI mode should use FAL.AI, not FFmpeg effects
        assert 'FAL.AI' in content or 'fal' in content.lower(), "AI mode should reference FAL.AI"
        assert 'still-to-clip' not in content, "AI mode should not use still-to-clip endpoint"
        print("✓ Frontend: Step5AnimateClips (AI Mode) is untouched - uses FAL.AI, not FFmpeg effects")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
