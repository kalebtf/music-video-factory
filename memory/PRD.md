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
6. Template system with 6 default templates seeded on registration
7. 7-step video creation wizard

## What's Been Implemented

### Phase 1 (March 30, 2026)
- [x] JWT Authentication (register, login, logout, refresh token, protected routes)
- [x] Password hashing with bcrypt
- [x] Dashboard with stats bar (Videos, Month Cost, Week Videos)
- [x] Project grid with empty state
- [x] Settings page with API Keys section (OpenAI, FAL.AI, Kling)
- [x] Cost Tracker table with total
- [x] Image/Video Provider radio buttons
- [x] 6 default templates seeded on user registration
- [x] Dark theme with specified colors

### Phase 2 (March 30, 2026)
- [x] Fixed API key save functionality (now persists with green checkmark)
- [x] 7-step video creation wizard:
  - Step 1: Song Input (title, genre, lyrics, audio upload, image upload, template selection, txt import)
  - Step 2: Select Climax (wavesurfer.js waveform with draggable region)
  - Step 3: Visual Concept (theme, mood, color palette, prompts, hooks)
  - Step 4: Generate & Approve Images (placeholder with colored cards)
  - Step 5: Animate Clips (placeholder with 3s delay simulation)
  - Step 6: Assemble Video (clip reorder, crossfade, text overlay settings)
  - Step 7: Export & Publish (download buttons, publishing info copy)
- [x] Dashboard project cards link to /project/:id
- [x] Progress bar showing all 7 steps
- [x] Cost counter always visible at bottom

## Database Schemas
- **User**: email, password_hash, apiKeys (encrypted), settings, createdAt
- **Project**: userId, title, genre, lyrics, templateId, status, audio paths, concept, images, clips, finalVideoPath, totalCost, createdAt
- **CostLog**: userId, projectId, date, action, provider, cost, details
- **Template**: userId, name, emoji, visualStyle, imagePrompts[], animationStyle, textHooks[], colorPalette[], isDefault

## Mocked APIs (Placeholders)
- Image generation: Creates colored placeholder cards after 2s delay
- Video clip generation: Simulates with 3s delay
- Video assembly: Simulates with 3s delay
- Auto-detect climax: Sets region to middle portion of audio

## Prioritized Backlog
### P0 (Phase 3 - Critical)
- [ ] Connect real image generation API (OpenAI GPT Image)
- [ ] Connect real video generation API (FAL.AI)
- [ ] Audio file upload to server storage
- [ ] Real climax detection algorithm

### P1 (Phase 3 - High)
- [ ] Video preview playback
- [ ] Real download functionality
- [ ] Project status updates in database

### P2 (Future)
- [ ] Bulk video generation
- [ ] Custom templates
- [ ] Social media direct posting
- [ ] Analytics dashboard

## Test Credentials
- Email: test@example.com
- Password: test123456
