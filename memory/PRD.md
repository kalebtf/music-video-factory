# Music Video Factory - Product Requirements Document

## Original Problem Statement
Build a full-stack web app called "Music Video Factory" for creating short music videos for TikTok/Shorts.
- Tech: React + FastAPI (Python) + MongoDB
- Design: Dark theme (#0c0c0f bg, #141418 cards, #e94560 accent)

## User Personas
1. **Content Creator**: Wants to quickly create music videos for TikTok/Shorts with AI-generated visuals
2. **Music Artist**: Needs professional-looking music videos without video production skills

## Core Requirements (Static)
1. JWT-based email/password authentication
2. Dashboard with project grid and stats
3. Settings page with API key management (AES encrypted)
4. Image/Video provider selection
5. Cost tracking system
6. Template system with 6 default templates
7. 7-step video creation wizard with real AI integrations

## What's Been Implemented

### Phase 1 - Foundation (March 30, 2026)
- [x] JWT Authentication (register, login, logout, refresh token)
- [x] Dashboard with stats bar
- [x] Settings page with API Keys management
- [x] 6 default templates seeded on registration
- [x] Dark theme UI

### Phase 2 - Wizard UI (March 30, 2026)
- [x] 7-step video creation wizard
- [x] Step 1: Song Input (title, genre, lyrics, audio upload, templates)
- [x] Step 2: Climax Selection (waveform visualization)
- [x] Step 3: Visual Concept (theme, mood, prompts, hooks)
- [x] Step 4: Image Generation (placeholder)
- [x] Step 5: Animate Clips (placeholder)
- [x] Step 6: Assemble Video (placeholder)
- [x] Step 7: Export & Publish (placeholder)

### Phase 3 - Real AI Integrations (March 30, 2026)
- [x] Audio upload to server with duration detection (ffprobe)
- [x] Audio player controls (Play/Pause/Stop) in Step 2
- [x] Manual time input for climax start/end
- [x] Auto-detect climax using librosa RMS energy analysis
- [x] Extract climax segment using ffmpeg
- [x] AI song analysis with GPT-4o-mini (theme, mood, prompts, hooks)
- [x] Real image generation with OpenAI GPT Image 1 (gpt-image-1)
- [x] Cost logging for all AI operations
- [x] Proper error handling when API key not configured

## API Endpoints Added in Phase 3
- POST /api/audio/upload/{project_id} - Upload audio file
- POST /api/audio/detect-climax/{project_id} - Auto-detect climax using librosa
- POST /api/audio/extract-climax/{project_id} - Extract climax segment with ffmpeg
- POST /api/ai/analyze-song - Analyze song with GPT-4o-mini
- POST /api/ai/generate-image - Generate image with GPT Image 1
- GET /api/projects/{project_id}/images/{filename} - Serve generated images
- PUT /api/projects/{project_id}/concept - Update project concept
- PUT /api/projects/{project_id}/images - Update project images

## Dependencies Added
- librosa (audio analysis)
- numpy (numerical computing)
- ffmpeg (system package for audio extraction)
- httpx (async HTTP client for OpenAI API)
- aiofiles (async file operations)

## Cost Structure
- GPT-4o-mini analysis: $0.01 per song
- GPT Image 1 Mini (quality="low"): $0.005 per image
- GPT Image 1.5 (quality="medium"): $0.04 per image

## Prioritized Backlog
### P0 (Phase 4 - Critical)
- [ ] Connect video generation API (FAL.AI Wan 2.6)
- [ ] Video clip animation from images
- [ ] Video assembly with transitions
- [ ] Real video download functionality

### P1 (Phase 4 - High)
- [ ] Video preview playback
- [ ] Subtitles from lyrics
- [ ] Text overlay rendering

### P2 (Future)
- [ ] Kling direct integration
- [ ] Bulk video generation
- [ ] Social media direct posting

## Test Credentials
- Email: test@example.com
- Password: test123456
