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
- [x] JWT Authentication (localStorage + Bearer token)
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
- [x] Real video assembly with FFmpeg
- [x] Real file downloads (platform-specific + ZIP)

### Phase 5 - Auth Architecture Fix (Feb 2026)
- [x] Moved from cookie-based auth to localStorage + Authorization Bearer header
- [x] Created centralized axios instance (`/app/frontend/src/lib/api.js`) with request/response interceptors
- [x] All frontend files use centralized api instance (no raw axios)
- [x] Backend returns access_token and refresh_token in login/register response body
- [x] Token refresh supports Authorization header (not just cookies)
- [x] Added GET /api/auth/test-keys endpoint for key validation
- [x] Added "Test Keys" button in Settings page
- [x] Added debug logging on all authenticated endpoints
- [x] 401 response interceptor redirects to login page

## API Endpoints
### Auth
- POST /api/auth/register - Register (returns tokens)
- POST /api/auth/login - Login (returns tokens)
- POST /api/auth/logout - Logout
- GET /api/auth/me - Get current user
- POST /api/auth/refresh - Refresh token (supports Bearer header)
- GET /api/auth/test-keys - Test which API keys are configured

### Settings
- GET /api/settings - Get user settings
- POST /api/settings/api-key - Save API key
- GET /api/settings/api-keys - Get key status
- POST /api/settings/providers - Update providers

### Projects
- GET /api/projects - List projects
- POST /api/projects - Create project
- GET /api/projects/{id} - Get project
- PUT /api/projects/{id} - Update project
- DELETE /api/projects/{id} - Delete project

### Audio
- POST /api/audio/upload/{id} - Upload audio
- POST /api/audio/detect-climax/{id} - Auto-detect climax
- POST /api/audio/extract-climax/{id} - Extract climax segment

### AI
- POST /api/ai/analyze-song - GPT-4o-mini analysis
- POST /api/ai/generate-image - GPT Image 1 generation
- POST /api/ai/animate-image - FAL.AI Wan animation
- GET /api/ai/animation-status/{id} - Poll animation

### Video
- POST /api/video/assemble - FFmpeg assembly
- GET /api/projects/{id}/final/{file} - Serve final video
- GET /api/projects/{id}/download/{platform} - Platform download
- GET /api/projects/{id}/download-zip - ZIP download

## Architecture
- Frontend: `/app/frontend/src/lib/api.js` - centralized axios with Bearer token interceptors
- Frontend: `/app/frontend/src/contexts/AuthContext.js` - stores tokens in localStorage
- Backend: `/app/backend/server.py` - monolithic FastAPI with all routes (~1660 lines)
- Auth: JWT access tokens (15min) + refresh tokens (7 days) via localStorage

## Cost Structure
- GPT-4o-mini analysis: $0.01 per song
- GPT Image 1 Mini: $0.005 per image
- FAL.AI Wan animation: $0.25 per clip (estimated)

## Test Credentials
- Email: test@example.com
- Password: test123456

## Next Tasks
- [ ] User end-to-end verification of full flow
- [ ] Kling Direct integration option (P1, deferred)
- [ ] Batch processing for multiple videos (P2, deferred)
- [ ] Refactor server.py into modular routers (P3, deferred)
