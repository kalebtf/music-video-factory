# Music Video Factory - Product Requirements Document

## Original Problem Statement
Build a full-stack web app called "Music Video Factory" for creating short music videos for TikTok/Shorts.
- Tech: React + FastAPI (Python) + MongoDB
- Design: Dark theme (#0c0c0f bg, #141418 cards, #e94560 accent)

## What's Been Implemented

### Phase 1 - Foundation (Done)
- [x] JWT Auth (localStorage + Bearer token)
- [x] Dashboard with stats, project grid, hover actions, delete modal
- [x] Settings: 4 API key providers, Test Keys, image/video provider selection
- [x] Centralized axios with interceptors

### Phase 2 - Wizard UI (Done)
- [x] 7-step wizard with progress bar
- [x] Step 1: Drag-drop import, Smart Import, AI parsing
- [x] Step 2: Waveform, play from start/stop at end, editable time inputs, auto-detect
- [x] Step 3: AI concept, unlimited hook selection, custom hooks, Spanish default
- [x] Step 4: Image gen + upload + style reference toggle
- [x] Step 5: Animate All + Approve All + individual workflow
- [x] Step 6: Assembly with multi-hook cycling overlay + subtitle MVP
- [x] Step 7: Platform downloads + ZIP

### Phase 3 - AI Integrations (Done)
- [x] OpenAI GPT-4o-mini (Spanish hooks, ≥7)
- [x] Together AI FLUX.1-schnell ($0.003/img) with OpenAI fallback
- [x] FAL.AI Wan 2.6 animation
- [x] FFmpeg assembly: filter_complex with proper escaping, clip looping, subtitle segmentation

### Phase 4 - Bug Fixes (Done)
- [x] Auth: cookie → localStorage + Bearer
- [x] FLUX: -Free → -schnell (serverless) + fallback
- [x] AuthImage/AuthVideo: fetch() for blob requests
- [x] updateProject: supports function args
- [x] FFmpeg drawtext: fixed enable escaping (between(t\\,X\\,Y))
- [x] Friendly error messages (no raw 400/axios)

## API Endpoints
- Auth: /register, /login, /logout, /me, /refresh, /test-keys
- Settings: /settings, /api-key, /api-keys, /providers
- Projects: CRUD, /concept, /images, /clips
- Audio: /upload, /detect-climax, /extract-climax
- AI: /analyze-song, /generate-image, /animate-image, /animation-status, /parse-song-info
- Video: /assemble (addSubtitles + lyrics + hookTexts), /final, /download, /download-zip
- Images: /upload-image (POST, multipart)

## Test Credentials
- Email: test@example.com | Password: test123456

## Next Tasks / Backlog
- [ ] Phase 2 evaluation: export metadata generation (OpenAI), direct publishing feasibility
- [ ] Exact subtitle sync (upgrade from equal segmentation to real timing)
- [ ] Kling Direct video integration (deferred)
- [ ] Batch processing (deferred)
- [ ] Refactor server.py (deferred)
