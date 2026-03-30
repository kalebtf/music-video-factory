# Music Video Factory - Product Requirements Document

## Original Problem Statement
Build a full-stack web app called "Music Video Factory" for creating short music videos for TikTok/Shorts.
- Tech: React + FastAPI (Python) + MongoDB
- Design: Dark theme (#0c0c0f bg, #141418 cards, #e94560 accent)
- Phase 1: Auth, Dashboard, Settings, Database schemas, Templates seeding

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

## What's Been Implemented (March 30, 2026)
- [x] JWT Authentication (register, login, logout, refresh token, protected routes)
- [x] Password hashing with bcrypt
- [x] API key encryption with AES (Fernet)
- [x] Dashboard with stats bar (Videos, Month Cost, Week Videos)
- [x] Project grid with empty state
- [x] Settings page with API Keys section (OpenAI, FAL.AI, Kling)
- [x] Cost Tracker table with total
- [x] Image Provider radio buttons (GPT Image Mini, GPT Image 1.5, Imagen 4)
- [x] Video Provider radio buttons (FAL.AI Wan 2.6, FAL.AI Kling, Kling Direct)
- [x] 6 default templates seeded on user registration
- [x] Brute force protection on login
- [x] Dark theme with specified colors
- [x] Mobile-friendly responsive design

## Database Schemas Implemented
- **User**: email, password_hash, apiKeys (encrypted), settings, createdAt
- **Project**: userId, title, genre, lyrics, templateId, status, audio paths, concept, images, clips, finalVideoPath, totalCost, createdAt
- **CostLog**: userId, projectId, date, action, provider, cost, details
- **Template**: userId, name, emoji, visualStyle, imagePrompts[], animationStyle, textHooks[], colorPalette[], isDefault

## Prioritized Backlog
### P0 (Phase 2 - Critical)
- [ ] Video creation wizard (/new page)
- [ ] Music upload and processing
- [ ] Template selection UI
- [ ] Image generation integration (GPT Image)
- [ ] Video generation integration (FAL.AI)

### P1 (Phase 2 - High)
- [ ] Project detail/edit page
- [ ] Video preview and export
- [ ] Audio climax detection

### P2 (Future)
- [ ] Bulk video generation
- [ ] Custom templates
- [ ] Social media direct posting
- [ ] Analytics dashboard

## Next Tasks
1. Implement video creation wizard with step-by-step flow
2. Add music upload functionality with audio processing
3. Integrate image generation APIs
4. Integrate video generation APIs
5. Add project preview and download features
