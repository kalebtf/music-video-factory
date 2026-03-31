# Music Video Factory - Product Requirements Document

## Original Problem Statement
Build a full-stack web app called "Music Video Factory" for creating short music videos for TikTok/Shorts.
- Tech: React + FastAPI (Python) + MongoDB
- Design: Dark theme (#0c0c0f bg, #141418 cards, #e94560 accent)

## User Personas
1. **Content Creator**: Wants to quickly create music videos for TikTok/Shorts with AI-generated visuals
2. **Music Artist**: Needs professional-looking music videos without video production skills

## What's Been Implemented

### Phase 1 - Foundation
- [x] JWT Authentication
- [x] Dashboard with stats
- [x] Settings with encrypted API key storage (AES)
- [x] 6 default templates

### Phase 2 - Wizard UI
- [x] 7-step video creation wizard
- [x] Progress bar with step navigation

### Phase 3 - Real AI Integrations
- [x] Audio upload with duration detection
- [x] GPT-4o-mini song analysis
- [x] GPT Image 1 generation ($0.005/img)

### Phase 4 - Bug Fixes & Video Features (March 31, 2026)
**Bug Fixes:**
- [x] Auto-detect climax: Added pydub fallback when librosa fails
- [x] API key auth: Fixed endpoints to properly read encrypted keys from database
- [x] Single Play/Pause: Replaced 3 buttons with one toggle button

**New Features:**
- [x] FAL.AI video animation (Wan model)
  - Async queue-based API with polling
  - Real video preview in HTML5 player
  - Approve/re-animate workflow
- [x] Real video assembly with FFmpeg
  - Clip concatenation
  - Crossfade transitions
  - Text overlay with drawtext filter
  - Audio sync with climax track
  - Final video preview
- [x] Real file downloads
  - Platform-specific downloads (TikTok, YouTube, Instagram)
  - ZIP download with all project files
  - Proper Content-Disposition headers

## API Endpoints (Phase 4)
- POST /api/ai/animate-image - Submit FAL.AI animation job
- GET /api/ai/animation-status/{request_id} - Poll animation status
- GET /api/projects/{id}/clips/{filename} - Serve video clips
- POST /api/video/assemble - Assemble final video with FFmpeg
- GET /api/projects/{id}/final/{filename} - Serve final video
- GET /api/projects/{id}/download/{platform} - Download for platform
- GET /api/projects/{id}/download-zip - Download all files as ZIP

## Dependencies Added (Phase 4)
- pydub (audio analysis fallback)
- fal-client (FAL.AI SDK)

## Cost Structure
- GPT-4o-mini analysis: $0.01 per song
- GPT Image 1 Mini: $0.005 per image
- FAL.AI Wan animation: $0.25 per clip (estimated)

## Test Credentials
- Email: test@example.com
- Password: test123456

## Next Tasks
- Add Kling Direct integration option
- Add batch processing for multiple videos
- Add social media direct posting
