# Music Video Factory - Product Requirements Document

## Original Problem Statement
Build a full-stack web app called "Music Video Factory" for creating short music videos for TikTok/Shorts.
- Tech: React + FastAPI (Python) + MongoDB
- Design: Dark theme (#0c0c0f bg, #141418 cards, #e94560 AI accent, #00b4d8 Library accent)
- Two modes: AI Mode (generates AI prompts/images) and Library/MyMedia Mode (uploaded + Pexels stock media)

## What's Been Implemented

### Foundation (Done)
- [x] JWT Auth, Dashboard, Settings (6 API keys incl Pexels), Centralized axios

### Split-Path Wizard (Done)
- [x] Mode Selection Screen (AI Mode / Library Mode)
- [x] Dynamic wizard steps (AI: 7 steps, Library: 6 steps)

### AI Mode (Done)
- [x] Song Input, Climax, Visual Concept, Generate Images, Animate Clips, Assemble (async), Export

### Library Mode (Done)
- [x] Song Input, Climax, Media Library (Pexels search + uploads + AI prompts), Hooks & Text, Assemble, Export
- [x] FFmpeg visual effects system replaces AI animation (Ken Burns, Pan, Fade, Blur, Static)
- [x] 11 effects, 3 transitions, 4 presets (Cinematic/Dynamic/Smooth/Energetic)
- [x] Per-item effect selector dropdown + duration slider
- [x] Effect presets apply patterns across all media items

### Phase 2: Metadata Generation (Done)
- [x] GPT-4o-mini metadata for TikTok, YouTube Shorts, Instagram Reels, Facebook Reels

### Climax Selector (Done)
- [x] Custom React-rendered draggable trim bars (mp3cut.net style)
- [x] Left bar = start, Right bar = end, independently draggable
- [x] Middle region draggable — moves entire selection without resizing
- [x] Time labels, highlighted range, touch support

### Hooks System (Done)
- [x] 1 hook per clip — no repeats
- [x] Each hook maps to its corresponding clip's duration
- [x] AI generates hooks via /ai/analyze-song

### Bug Fixes (Feb 2026)
- [x] FFmpeg installed (was missing — root cause of all still-to-clip 500 errors)
- [x] AnimateImageRequest prompt field now Optional
- [x] StepHooksText reads data.hooks from response
- [x] StepMediaLibrary gates stock search behind Pexels key check
- [x] Animation status polling param names + status case fixed

### Backend Endpoints (Key)
- POST /api/projects/{id}/media/still-to-clip — accepts `effect` param (11 options)
- GET /api/effects/list — returns effects/transitions/presets
- POST /api/ai/analyze-song — returns concept directly
- GET /api/auth/test-keys — returns {openai, falai, gemini, together, pexels}
- POST /api/video/assemble — async background job

## Test Credentials
- Email: test@example.com | Password: test123456

## Next Tasks / Backlog
- [ ] Exact subtitle sync via Whisper (word-level timestamps) (P2)
- [ ] Manual video trim in/out selection for stock clips (P2)
- [ ] Direct publishing to TikTok, YouTube, Instagram (P3)
- [ ] Kling API integration (P3)
- [ ] Refactor server.py into route modules (Deferred)
