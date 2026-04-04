# Music Video Factory - Product Requirements Document

## Original Problem Statement
Build a full-stack web app called "Music Video Factory" for creating short music videos for TikTok/Shorts.
- Tech: React + FastAPI (Python) + MongoDB
- Design: Dark theme (#0c0c0f bg, #141418 cards, #e94560 accent for AI mode, #00b4d8 for Library mode)

## What's Been Implemented

### Phase 0 - Foundation (Done)
- [x] JWT Auth (localStorage + Bearer token)
- [x] Dashboard with stats, project grid, hover actions, delete modal, mode badges (AI/LIB)
- [x] Settings: 6 API key providers (OpenAI, Together, Gemini, FAL.AI, Kling, Pexels)
- [x] Centralized axios with interceptors

### Phase 1 - Split-Path Wizard (Done)
- [x] Mode Selection Screen at /new
- [x] Dynamic wizard steps based on mode (AI: 7 steps, Library: 6 steps)

### AI Mode Steps (Done):
- [x] Step 1: Song Input (drag-drop, Smart Import, AI parsing, lyrics cleaning)
- [x] Step 2: Select Climax (WaveSurfer v7 regions, 24px handles, time labels, Play Selection)
- [x] Step 3: Visual Concept (AI analysis, character presence, Spanish hooks / English prompts)
- [x] Step 4: Generate Images (AI gen, upload, style reference, Approve/Reject All)
- [x] Step 5: Animate Clips (Animate All, Approve/Reject All)
- [x] Step 6: Assemble (async background job, polling, subtitle cap)
- [x] Step 7: Export (platform downloads, ZIP)

### Library Mode Steps (Done):
- [x] Step 1: Song Input (shared)
- [x] Step 2: Select Climax (shared, improved UX)
- [x] Step 3: Media Library
  - AI Image Prompts section (7 prompts via GPT-4o-mini, copy buttons, persisted to DB)
  - Stock Search tab (Pexels photos + videos)
  - My Uploads tab (drag-drop images + videos)
  - Media Pool with drag-and-drop reorder, animate toggle, duration slider
- [x] Step 4: Hooks & Text (AI + manual hooks, optional)
- [x] Step 5: Assemble (same engine, mixed media)
- [x] Step 6: Export

### Bug Fixes (Done):
- [x] Lyrics cleaning: removes [brackets] and (parentheses) from imported .txt files
- [x] Extract climax: fixed stale projectId state in handleNext
- [x] Stock search / media upload: added ensureProject safety net and error display

## Test Credentials
- Email: test@example.com | Password: test123456

## Next Tasks / Backlog
- [ ] Phase 2: Metadata generation (platform-specific titles, descriptions, hashtags)
- [ ] Editable output per platform (TikTok, YouTube, Instagram, Facebook)
- [ ] Exact subtitle sync via Whisper (word-level timestamps)
- [ ] Manual video trim in/out selection
- [ ] Refactor server.py into route modules (deferred)
