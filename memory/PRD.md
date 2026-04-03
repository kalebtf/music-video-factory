# Music Video Factory - Product Requirements Document

## Original Problem Statement
Build a full-stack web app called "Music Video Factory" for creating short music videos for TikTok/Shorts.
- Tech: React + FastAPI (Python) + MongoDB
- Design: Dark theme (#0c0c0f bg, #141418 cards, #e94560 accent)

## What's Been Implemented

### Phase 1 - Foundation (Done)
- [x] JWT Auth (localStorage + Bearer token)
- [x] Dashboard with stats, project grid, hover actions, delete modal
- [x] Settings: 5 API key providers, Test Keys, image/video provider selection
- [x] Centralized axios with interceptors

### Phase 2 - Wizard UI (Done)
- [x] 7-step wizard with progress bar
- [x] Step 1: Drag-drop import, Smart Import, AI parsing
- [x] Step 2: Waveform, play from start/stop at end, editable time inputs, auto-detect
- [x] Step 3: AI concept, unlimited hook selection, custom hooks, Spanish default, Character Presence selector (6 modes)
- [x] Step 4: Image gen + upload + style reference toggle + Approve All / Reject All bulk actions + Auto-import from Step 1
- [x] Step 5: Animate All + Approve All + Reject All + individual workflow
- [x] Step 6: Async assembly with background job + polling UI + subtitle cap (15 lines)
- [x] Step 7: Platform downloads + ZIP

### Phase 3 - AI Integrations (Done)
- [x] OpenAI GPT-4o-mini (Spanish hooks, English visual prompts — language split enforced)
- [x] Together AI FLUX.1-dev (recommended cinematic default, $0.025/img, 28 steps) + FLUX.1-schnell fallback
- [x] FAL.AI Wan 2.6 animation
- [x] FFmpeg assembly: async background job with polling, filter_complex with proper escaping, subtitle cap at 15 lines

### Phase 4 - Bug Fixes (Done)
- [x] Auth: cookie → localStorage + Bearer
- [x] FLUX: -Free → -schnell (serverless) + fallback
- [x] AuthImage/AuthVideo: fetch() for blob requests
- [x] updateProject: supports function args
- [x] FFmpeg drawtext: fixed enable escaping
- [x] Friendly error messages
- [x] **502 assembly timeout: converted to async background task with polling (P0 fix)**
- [x] **Step 1 image persistence to Step 4: auto-upload on Step 4 mount**
- [x] **Prompt language split: Spanish hooks, English everything else**
- [x] **Character presence modes: 6 options in Step 3 affecting image prompts**
- [x] **Approve All/Reject All in Step 4 images**
- [x] **Approve All/Reject All in Step 5 clips**
- [x] **FLUX Dev as recommended cinematic default, model list improved**

## API Endpoints
- Auth: /register, /login, /logout, /me, /refresh, /test-keys
- Settings: /settings, /api-key, /api-keys, /providers
- Projects: CRUD, /concept, /images, /clips
- Audio: /upload, /detect-climax, /extract-climax
- AI: /analyze-song, /generate-image, /animate-image, /animation-status, /parse-song-info
- Video: /assemble (async, returns jobId), /assemble/{jobId}/status (polling), /final, /download, /download-zip
- Images: /upload-image (POST, multipart)

## Test Credentials
- Email: test@example.com | Password: test123456

## Next Tasks / Backlog
- [ ] Phase 2: Metadata generation — export step with platform-specific titles, descriptions, hashtags (OpenAI)
- [ ] Exact subtitle sync (upgrade from equal segmentation to real word-level timing)
- [ ] Kling Direct video integration (deferred)
- [ ] Batch processing (deferred)
- [ ] Refactor server.py into route modules (deferred)
- [ ] Direct publishing to TikTok, YouTube, Instagram (future)
