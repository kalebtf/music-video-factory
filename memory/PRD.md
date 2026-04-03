# Music Video Factory - Product Requirements Document

## Original Problem Statement
Build a full-stack web app called "Music Video Factory" for creating short music videos for TikTok/Shorts.
- Tech: React + FastAPI (Python) + MongoDB
- Design: Dark theme (#0c0c0f bg, #141418 cards, #e94560 accent)

## Core Requirements
- 7-step wizard: Song Input → Climax → Concept → Images → Animate → Assemble → Export
- Multi-provider image generation (OpenAI, Together AI FLUX, Gemini)
- FAL.AI Wan 2.6 video animation
- FFmpeg video assembly with text overlay and clip looping
- JWT auth + AES-encrypted API key storage
- User-provided API keys (OpenAI, Together AI, Gemini, FAL.AI)

## What's Been Implemented

### Phase 1 - Foundation (Done)
- [x] JWT Auth (localStorage + Bearer token)
- [x] Dashboard with stats, project grid, hover actions (Edit/Delete), video preview modal
- [x] Settings: 4 API key providers, Test Keys button, image/video provider selection
- [x] 6 default templates
- [x] Centralized axios instance with interceptors (`/app/frontend/src/lib/api.js`)

### Phase 2 - Wizard UI (Done)
- [x] 7-step wizard with progress bar
- [x] Step 1: Drag-drop import zone (replaces browser popup), Smart Import with AI parsing
- [x] Step 2: Waveform, play from start/stop at end, editable time inputs, auto-detect
- [x] Step 3: AI concept analysis, unlimited hook selection, custom hook input, Spanish hooks
- [x] Step 4: Image generation with AuthImage display, approve/reject, regenerate, friendly errors
- [x] Step 5: FAL.AI animation with polling, AuthVideo display
- [x] Step 6: Drag-to-reorder, assembly with all selected hooks as cycling text overlay
- [x] Step 7: Platform downloads (TikTok/Shorts/Reels) + ZIP

### Phase 3 - Real AI Integrations (Done)
- [x] OpenAI GPT-4o-mini song analysis (Spanish hooks, ≥7 hooks)
- [x] Multi-provider image gen: Together AI FLUX.1-schnell, OpenAI GPT Image 1, Gemini Imagen
- [x] Auto-fallback: Together AI → OpenAI if FLUX fails
- [x] FAL.AI Wan 2.6 image-to-video animation
- [x] FFmpeg video assembly with clip looping and multi-hook text overlay

### Phase 4 - Bug Fixes (Done)
- [x] Auth: cookie-based → localStorage + Bearer token (all files)
- [x] FLUX model: -Free → -schnell (serverless), with OpenAI fallback
- [x] AuthImage/AuthVideo: fetch() instead of axios for blob requests (no XHR error)
- [x] Step4: updateProject supports function args (images display correctly)
- [x] Video assembly: clips loop sequentially until audio is covered
- [x] Friendly error messages (no raw 400/axios text)

## Architecture
```
/app/
├── backend/
│   ├── .env (MONGO_URL, DB_NAME, JWT_SECRET, AES_KEY)
│   └── server.py (~2200 lines, monolithic)
├── frontend/
│   ├── .env (REACT_APP_BACKEND_URL)
│   └── src/
│       ├── lib/api.js (centralized axios + Bearer token)
│       ├── contexts/AuthContext.js (localStorage tokens)
│       ├── components/
│       │   ├── AuthImage.js (AuthImage + AuthVideo using fetch())
│       │   └── wizard/Step1-Step7
│       └── pages/Login, Register, Dashboard, Settings, NewVideo
```

## API Endpoints
- Auth: /api/auth/register, /login, /logout, /me, /refresh, /test-keys
- Settings: /api/settings, /settings/api-key, /settings/api-keys, /settings/providers
- Projects: /api/projects (CRUD), /projects/{id}/concept, /images, /clips
- Audio: /api/audio/upload/{id}, /detect-climax/{id}, /extract-climax/{id}
- AI: /api/ai/analyze-song, /generate-image, /animate-image, /animation-status/{id}, /parse-song-info
- Video: /api/video/assemble, /projects/{id}/final/{file}, /download/{platform}, /download-zip

## Cost Structure
- GPT-4o-mini analysis: $0.01/song
- Together AI FLUX Schnell: $0.003/image
- OpenAI GPT Image 1 Mini: $0.005/image (fallback)
- FAL.AI Wan animation: ~$0.25/clip

## Test Credentials
- Email: test@example.com | Password: test123456

## Next Tasks / Backlog
- [ ] User end-to-end verification of full flow with real API keys
- [ ] Kling Direct video integration (P1, deferred)
- [ ] Batch processing (P2, deferred)
- [ ] Refactor server.py into modular routers (P3, deferred)
