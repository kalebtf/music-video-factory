# Music Video Factory - Product Requirements Document

## Original Problem Statement
Build a full-stack web app called "Music Video Factory" for creating short music videos for TikTok/Shorts.
- Tech: React + FastAPI (Python) + MongoDB
- Two modes: AI Mode and Library/MyMedia Mode

## What's Been Implemented

### Foundation (Done)
- [x] JWT Auth, Dashboard, Settings (6 API keys incl Pexels)

### AI Mode (Done, Untouched)
- [x] Full pipeline: Song Input -> Climax -> Visual Concept -> Generate Images -> Animate (FAL.AI) -> Assemble -> Export

### Library/MyMedia Mode (Done)
- [x] Full pipeline: Song Input -> Climax -> Media Library -> Hooks -> Assemble -> Export
- [x] 20 FFmpeg effects, 3 transitions, 6 presets, per-item controls
- [x] Zero AI credits -- Pexels (free) + FFmpeg (local)
- [x] Smart video duration matching: videos < audio -> repeat; videos > audio -> trim proportionally

### Climax Selector (Done)
- [x] Left/Right trim bars + middle region drag + click-to-seek

### Hooks System (Done)
- [x] Pure timeline segmentation: D/N per hook, sequential, full coverage, no gaps
- [x] Multiline word wrapping (28 chars/line), auto font reduction for 4+ lines

### Text Styling (Done)
- [x] Font (Sans/Serif/Mono/Narrow), Size (S/M/L), Color (5), Position (Top/Mid/Bot)
- [x] Style (Shadow/Outline/Glow/None), Animation (None/Fade/Slide Up/Down/Pop/Bounce)
- [x] Live 9:16 preview panel

### Visual Identity Layer (Done - Apr 5, 2026)
- [x] 5 cinematic styles: Cinematic Warm, Dreamy, Vintage, Moody, Raw
- [x] FFmpeg filters: eq, colorbalance, vignette, noise, gblur per style
- [x] Applied AFTER fades but BEFORE text (text stays crisp)

### Hook Readability (Done - Apr 5, 2026)
- [x] Semi-transparent drawbox background pill (black@0.5) behind hook text

### Pexels API Caching (Done - Apr 5, 2026)
- [x] MongoDB pexels_cache with 24h TTL, unique cache_key index
- [x] Fixed timezone-naive/aware datetime comparison crash (Apr 5)

### Assembly Pipeline Stability (Done - Apr 5, 2026)
- [x] Moved assembly_jobs from in-memory dict to MongoDB (survives restarts)
- [x] Jobs NOT deleted on first read (1hr TTL auto-cleanup)
- [x] Frontend: adaptive polling (2s -> 4s -> 6s), 404/502 tolerance
- [x] Frontend: retryApiCall for still-to-clip/trim-video (3 retries)
- [x] FFmpeg preset 'veryfast' (2-3x faster encoding)

### Auth Media Fix for Export (Done - Apr 5, 2026)
- [x] fetchAuthMedia auto-refreshes expired tokens on 401 via tryRefreshToken()
- [x] Step7 handleDownload + handleDownloadZip also refresh on 401

### Settings / Test Keys (Done - Apr 5, 2026)
- [x] Pexels now shown in Test Keys validation results

### Assembly (Done)
- [x] Async background job, 401-resilient polling, FFmpeg auto-install

### Metadata Generation (Done)
- [x] GPT-4o-mini for TikTok, YouTube, Instagram, Facebook

## Bug Fixes Log
- [x] base_y not defined (P0)
- [x] FFmpeg not installed -- auto-install on startup
- [x] AnimateImageRequest 422 -- prompt field made Optional
- [x] Hooks response parsing
- [x] Polling 401 -- silent retry with counter
- [x] Animation status case mismatch
- [x] Assembly 404s from in-memory job store (P0 - Fixed Apr 5)
- [x] Assembly 404s from job deletion on first read (P0 - Fixed Apr 5)
- [x] trim-video 401 from no retry in prepare phase (P0 - Fixed Apr 5)
- [x] Export 401 from expired token in fetchAuthMedia (P0 - Fixed Apr 5)
- [x] Download 401 from expired token in handleDownload/Zip (P0 - Fixed Apr 5)
- [x] Pexels search 500 TypeError: naive vs aware datetime comparison (P0 - Fixed Apr 5)
- [x] Pexels missing from Test Keys UI display (P1 - Fixed Apr 5)

## Test Credentials
- Email: test@example.com | Password: test123456

## Next Tasks / Backlog
- [ ] Whisper subtitle sync (P2)
- [ ] Manual video trim in/out for stock clips (P2)
- [ ] Auto-suggest effects by song mood (P2)
- [ ] Direct publishing to socials (P3)
- [ ] Kling API integration (P3)
- [ ] Refactor server.py (Deferred)
