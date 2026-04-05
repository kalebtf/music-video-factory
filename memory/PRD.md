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

### AI Mode (Done, Untouched)
- [x] Song Input, Climax, Visual Concept, Generate Images, Animate Clips (FAL.AI), Assemble (async), Export

### Library/MyMedia Mode (Done)
- [x] Song Input, Climax, Media Library (Pexels + uploads + AI prompts), Hooks, Assemble, Export
- [x] FFmpeg visual effects system (NO AI animation calls)
- [x] 20 effects in 5 categories: Motion (7), Slide (4), Fade (4), Style (4), Basic (1)
- [x] 3 transitions: Crossfade, Hard Cut, Fade to Black
- [x] 6 presets: Cinematic, Dynamic, Smooth, Energetic, Vintage Film, Dreamy
- [x] Per-item effect selector with categorized optgroups
- [x] Per-item transition selector (Crossfade/Cut/Fade Black)
- [x] Duration slider per image

### Climax Selector (Done)
- [x] Custom React-rendered draggable trim bars (mp3cut.net style)
- [x] Left bar = start, Right bar = end, independently draggable
- [x] Middle region draggable — moves entire selection without resizing
- [x] Click inside region = seek + play from that position

### Hooks System (Done)
- [x] Clip-aligned distribution: hooks mapped to specific clip indices
- [x] Formula: round(i * (numClips-1) / max(numHooks-1, 1))
- [x] MIN_HOOK_DURATION = 2.5s — each hook stays readable
- [x] No repeats; extras dropped if more hooks than clips

### Text Styling Controls (Done)
- [x] Font Family: Sans, Serif, Mono, Narrow (Liberation fonts)
- [x] Size: Small (40px) / Medium (56px) / Large (72px)
- [x] Color: White, Yellow, Red, Cyan, Lime
- [x] Position: Top / Middle / Bottom
- [x] Style: Shadow, Outline, Glow, None
- [x] **Animation: None, Fade, Slide Up, Slide Down, Pop, Bounce**
  - Fade: smooth alpha in/out over 0.6s
  - Slide Up: rises from +60px below with fade
  - Slide Down: drops from -60px above with fade
  - Pop: quick 0.3s appear with slight upward bounce
  - Bounce: drops from 80px above with quadratic deceleration
- [x] All applied via FFmpeg drawtext alpha + y expressions

### Assembly System (Done)
- [x] Async background job with polling (401-resilient)
- [x] FFmpeg auto-install on backend startup
- [x] Crossfade duration slider, subtitle overlays

### Phase 2: Metadata Generation (Done)
- [x] GPT-4o-mini metadata for TikTok, YouTube Shorts, Instagram Reels, Facebook Reels

## Test Credentials
- Email: test@example.com | Password: test123456

## Next Tasks / Backlog
- [ ] Exact subtitle sync via Whisper (word-level timestamps) (P2)
- [ ] Manual video trim in/out selection for stock clips (P2)
- [ ] Auto-suggest effects by song mood (P2)
- [ ] Direct publishing to TikTok, YouTube, Instagram (P3)
- [ ] Kling API integration (P3)
- [ ] Refactor server.py into route modules (Deferred)
