# Music Video Factory - Product Requirements Document

## Original Problem Statement
Build a full-stack web app called "Music Video Factory" for creating short music videos for TikTok/Shorts.
- Tech: React + FastAPI (Python) + MongoDB
- Design: Dark theme (#0c0c0f bg, #141418 cards, #e94560 AI accent, #00b4d8 Library accent)

## What's Been Implemented

### Foundation (Done)
- [x] JWT Auth, Dashboard, Settings (6 API keys incl Pexels), Centralized axios

### Split-Path Wizard (Done)
- [x] Mode Selection Screen (AI Mode / Library Mode)
- [x] Dynamic wizard steps (AI: 7 steps, Library: 6 steps)

### AI Mode (Done)
- [x] Song Input, Climax (custom trim bars), Visual Concept, Generate Images, Animate Clips, Assemble (async), Export

### Library Mode (Done)
- [x] Song Input, Climax, Media Library (Pexels search + uploads + AI prompts), Hooks & Text, Assemble, Export

### Phase 2: Metadata Generation (Done)
- [x] "Generate for All Platforms" button in Step 7 Export
- [x] GPT-4o-mini generates: title (Spanish + emojis), description (Spanish), hashtags (15-20 mix), best posting time
- [x] 4 platform tabs: TikTok, YouTube Shorts, Instagram Reels, Facebook Reels
- [x] All fields editable, Copy All button, Generate Thumbnail per platform
- [x] All metadata + thumbnails saved to MongoDB

### Bug Fixes (Feb 2026)
- [x] Fix 1 (P0): AnimateImageRequest `prompt` field now Optional — no more 422 when frontend omits it
- [x] Fix 2 (P0): StepHooksText reads `data.hooks` from analyze-song response (was incorrectly reading `data.concept.hooks`)
- [x] Fix 3 (P1): StepMediaLibrary checks Pexels key via /auth/test-keys on mount — shows banner + disables search if missing
- [x] Fix 4 (P1): Step2SelectClimax rebuilt with custom React draggable trim bars (mp3cut.net style) — two independent vertical bars for start/end
- [x] Fix 5: Animation status polling uses correct param names (project_id, image_index) and uppercase status matching (COMPLETED/ERROR)

### Backend Endpoints (Key)
- POST /api/ai/animate-image — prompt now Optional[str] with default
- POST /api/ai/analyze-song — returns concept directly (hooks, prompts, theme, mood, etc.)
- GET /api/auth/test-keys — now returns {openai, falai, gemini, together, pexels}
- POST /api/video/assemble — async background job
- GET /api/video/assemble/{job_id}/status — polling endpoint

## Test Credentials
- Email: test@example.com | Password: test123456

## Next Tasks / Backlog
- [ ] Exact subtitle sync via Whisper (word-level timestamps) (P2)
- [ ] Manual video trim in/out selection for stock clips (P2)
- [ ] Direct publishing to TikTok, YouTube, Instagram (P3)
- [ ] Kling API integration (P3)
- [ ] Refactor server.py into route modules (Deferred)
