# Music Video Factory - Product Requirements Document

## Original Problem Statement
Build a full-stack web app called "Music Video Factory" for creating short music videos for TikTok/Shorts.
- Tech: React + FastAPI (Python) + MongoDB
- Two modes: AI Mode (AI prompts/images/animation) and Library/MyMedia Mode (uploaded + Pexels + FFmpeg effects)

## What's Been Implemented

### Foundation (Done)
- [x] JWT Auth, Dashboard, Settings (6 API keys incl Pexels)

### AI Mode (Done, Untouched)
- [x] Song Input, Climax, Visual Concept, Generate Images, Animate Clips (FAL.AI), Assemble, Export

### Library/MyMedia Mode (Done)
- [x] Song Input, Climax, Media Library, Hooks, Assemble, Export
- [x] 20 FFmpeg effects (Motion/Slide/Fade/Style/Basic), 3 transitions, 6 presets
- [x] Per-item effect + transition selectors
- [x] **Zero AI credits** — Pexels (free) + FFmpeg (local)

### Climax Selector (Done)
- [x] Left/Right trim bars + middle region drag (preserves duration)
- [x] Click inside region = seek + play
- [x] **Region drag stops playback**, seeks to new start on release

### Hooks System (Done)
- [x] **Pure timeline segmentation**: D/N per hook, sequential, full coverage, no gaps
- [x] **Multiline word wrapping**: MAX_CHARS_PER_LINE=28, auto font reduction for 4+ lines
- [x] Each line = separate drawtext with centered y-offset

### Text Styling (Done)
- [x] Font: Sans/Serif/Mono/Narrow | Size: S/M/L | Color: 5 options | Position: Top/Mid/Bot
- [x] Style: Shadow/Outline/Glow/None
- [x] **Animation: None/Fade/Slide Up/Slide Down/Pop/Bounce** (FFmpeg alpha+y expressions)
- [x] **Live 9:16 preview panel** — shows text with current settings in real-time

### Assembly System (Done)
- [x] Async background job, 401-resilient polling, FFmpeg auto-install

### Metadata Generation (Done)
- [x] GPT-4o-mini metadata for TikTok, YouTube, Instagram, Facebook

## Credits / Cost Model
- **Library/MyMedia mode**: Zero AI credits (Pexels free, FFmpeg local)
- **AI Mode**: Together AI (images), FAL.AI (animation), OpenAI (prompts/metadata/thumbnails)

## Test Credentials
- Email: test@example.com | Password: test123456

## Next Tasks / Backlog
- [ ] Whisper subtitle sync (P2)
- [ ] Manual video trim in/out for stock clips (P2)
- [ ] Auto-suggest effects by song mood (P2)
- [ ] Direct publishing to socials (P3)
- [ ] Kling API integration (P3)
- [ ] Refactor server.py (Deferred)
