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
- [x] Song Input, Climax (WaveSurfer v7 + large handles), Visual Concept, Generate Images, Animate Clips, Assemble (async), Export

### Library Mode (Done)
- [x] Song Input, Climax, Media Library (Pexels search + uploads + AI prompts), Hooks & Text, Assemble, Export

### Phase 2: Metadata Generation (Done)
- [x] "Generate for All Platforms" button in Step 7 Export
- [x] GPT-4o-mini generates: title (Spanish + emojis), description (Spanish), hashtags (15-20 mix), best posting time
- [x] 4 platform tabs: TikTok, YouTube Shorts, Instagram Reels, Facebook Reels
- [x] All fields are editable after generation
- [x] Copy All button per platform (copies title + description + hashtags)
- [x] Generate Thumbnail per platform using GPT Image ($0.005 each)
  - TikTok: 1024x1536 vertical, bold text
  - YouTube: 1536x1024 horizontal, clickbait
  - Instagram: 1024x1024 square, aesthetic
  - Facebook: 1536x1024 horizontal, emotional
- [x] Download button per thumbnail
- [x] All metadata + thumbnails saved to MongoDB

### Backend Endpoints (Metadata)
- POST /api/ai/generate-metadata — GPT-4o-mini, ~$0.01
- POST /api/ai/generate-thumbnail — GPT Image, ~$0.005/thumbnail
- GET /api/projects/{id}/thumbnails/{filename} — serve thumbnail files

## Test Credentials
- Email: test@example.com | Password: test123456

## Next Tasks / Backlog
- [ ] Exact subtitle sync via Whisper (word-level timestamps)
- [ ] Manual video trim in/out selection for stock clips
- [ ] Refactor server.py into route modules (deferred)
- [ ] Direct publishing to TikTok, YouTube, Instagram (future)
- [ ] Kling API integration (future)
