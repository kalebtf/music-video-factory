# Music Video Factory - Product Requirements Document

## Original Problem Statement
Build a full-stack web app called "Music Video Factory" for creating short music videos for TikTok/Shorts.
- Tech: React + FastAPI (Python) + MongoDB
- Design: Dark theme (#0c0c0f bg, #141418 cards, #e94560 accent for AI mode, #00b4d8 for Library mode)

## What's Been Implemented

### Phase 0 - Foundation (Done)
- [x] JWT Auth (localStorage + Bearer token)
- [x] Dashboard with stats, project grid, hover actions, delete modal, mode badges (AI/LIB)
- [x] Settings: 6 API key providers (OpenAI, Together, Gemini, FAL.AI, Kling, Pexels), image/video provider selection
- [x] Centralized axios with interceptors

### Phase 1 - Split-Path Wizard (Done)
- [x] **Mode Selection Screen** — choose AI Mode or Library/My Media Mode at /new
- [x] Dynamic wizard steps based on selected mode

### AI Mode (7 steps - existing, unchanged):
- [x] Step 1: Song Input (drag-drop, Smart Import, AI parsing)
- [x] Step 2: Select Climax (waveform, editable times, auto-detect)
- [x] Step 3: Visual Concept (AI analysis, character presence, hooks in Spanish, prompts in English)
- [x] Step 4: Generate Images (AI gen, upload, style reference, Approve/Reject All)
- [x] Step 5: Animate Clips (Animate All, Approve/Reject All)
- [x] Step 6: Assemble (async background job, polling, subtitle cap at 15 lines)
- [x] Step 7: Export (platform downloads, ZIP)

### Library / My Media Mode (6 steps - NEW):
- [x] Step 1: Song Input (shared with AI mode)
- [x] Step 2: Select Climax (shared with AI mode)
- [x] Step 3: Media Library
  - Stock Search tab (Pexels photos + videos, portrait orientation)
  - My Uploads tab (drag-drop images + videos)
  - Media Pool with drag-and-drop reorder
  - Animate toggle for still images
  - Per-image duration slider (2-8s, default 4s)
  - Approve/Reject All bulk actions
- [x] Step 4: Hooks & Text
  - AI hook generation from lyrics (OpenAI)
  - Manual custom hook entry
  - Hook toggle selection
  - No hooks = no text overlay
- [x] Step 5: Assemble (same engine, handles mixed media)
- [x] Step 6: Export (same as AI mode)

### Backend Endpoints (NEW):
- [x] GET /api/stock/search/photos — Pexels photo proxy
- [x] GET /api/stock/search/videos — Pexels video proxy
- [x] POST /api/projects/{id}/media/upload — media file upload
- [x] GET /api/projects/{id}/media/{filename} — serve media files
- [x] POST /api/projects/{id}/media/download-stock — download stock to server
- [x] POST /api/projects/{id}/media/still-to-clip — Ken Burns still→video
- [x] POST /api/projects/{id}/media/trim-video — auto-trim to duration
- [x] PUT /api/projects/{id}/media — save media pool state

### Previous Fixes (Done):
- [x] 502 Assembly timeout → async background job with polling
- [x] Step 1 image persistence to Step 4
- [x] Prompt language split (Spanish hooks / English prompts)
- [x] Character presence modes (6 options)
- [x] Approve/Reject All in Step 4 & Step 5
- [x] FLUX Dev as recommended cinematic default
- [x] Subtitle capping at 15 lines
- [x] Climax-only subtitle slicing

## Test Credentials
- Email: test@example.com | Password: test123456

## API Keys Required
- OpenAI — for song analysis & image generation
- Together AI — for FLUX image generation  
- FAL.AI — for video animation
- Pexels — for stock search (optional, app-wide default + user override)

## Next Tasks / Backlog
- [ ] Phase 2: Metadata generation — export step with platform-specific titles, descriptions, hashtags
- [ ] Editable metadata output per platform (TikTok, YouTube, Instagram, Facebook)
- [ ] Exact subtitle sync (word-level timing via Whisper)
- [ ] Manual in/out video trim selection (currently auto-trim)
- [ ] Kling API integration (deferred)
- [ ] Refactor server.py into route modules (deferred)
- [ ] Direct publishing to TikTok, YouTube, Instagram (future)
