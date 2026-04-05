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
- [x] **Zero AI credits** -- Pexels (free) + FFmpeg (local)
- [x] **Smart video duration matching**: videos < audio -> repeat; videos > audio -> trim proportionally

### Climax Selector (Done)
- [x] Left/Right trim bars + middle region drag + click-to-seek
- [x] Region drag stops playback, seeks to new start on release

### Hooks System (Done)
- [x] Pure timeline segmentation: D/N per hook, sequential, full coverage, no gaps
- [x] Multiline word wrapping (28 chars/line), auto font reduction for 4+ lines
- [x] Each line = separate drawtext with centered y-offset

### Text Styling (Done)
- [x] Font (Sans/Serif/Mono/Narrow), Size (S/M/L), Color (5), Position (Top/Mid/Bot)
- [x] Style (Shadow/Outline/Glow/None), Animation (None/Fade/Slide Up/Down/Pop/Bounce)
- [x] Live 9:16 preview panel

### Visual Identity Layer (Done - Apr 5, 2026)
- [x] 5 cinematic styles: Cinematic Warm, Dreamy, Vintage, Moody, Raw
- [x] FFmpeg filters: eq, colorbalance, vignette, noise, gblur per style
- [x] Applied AFTER fades but BEFORE text (text stays crisp)
- [x] Library mode only -- AI Mode untouched
- [x] Frontend selector grid with preview tints

### Hook Readability (Done - Apr 5, 2026)
- [x] Semi-transparent drawbox background pill (black@0.5) behind hook text
- [x] 900px width, 16px vertical padding, centered
- [x] Synced to hook timing via enable='between(t,start,end)'
- [x] Live preview shows pill effect

### Pexels API Caching (Done - Apr 5, 2026)
- [x] MongoDB pexels_cache collection with 24h TTL
- [x] Cache key: type:query:page:per_page
- [x] TTL index on expires_at, unique index on cache_key
- [x] Both photos and videos endpoints cached

### Assembly (Done)
- [x] Async background job, 401-resilient polling, FFmpeg auto-install

### Metadata Generation (Done)
- [x] GPT-4o-mini for TikTok, YouTube, Instagram, Facebook

## Bug Fixes Log
- [x] base_y not defined (P0)
- [x] FFmpeg not installed -- auto-install on startup
- [x] AnimateImageRequest 422 -- prompt field made Optional
- [x] Hooks response parsing -- data.hooks not data.concept.hooks
- [x] Polling 401 -- silent retry with counter
- [x] Animation status case mismatch

## Test Credentials
- Email: test@example.com | Password: test123456

## Next Tasks / Backlog
- [ ] Whisper subtitle sync (P2)
- [ ] Manual video trim in/out for stock clips (P2)
- [ ] Auto-suggest effects by song mood (P2)
- [ ] Direct publishing to socials (P3)
- [ ] Kling API integration (P3)
- [ ] Refactor server.py (Deferred)
