# 🎬 Music Video Factory

Automated AI pipeline to create short music videos (30-60s) for TikTok, YouTube Shorts, and Instagram Reels from AI-generated or original songs.

**Flow:** Upload song → Select climax → AI analyzes mood/lyrics → Generate images → Animate to video → Assemble with audio → Export with titles/tags.

---

## 🎯 What It Does

1. **Upload your song** (MP3/WAV) or import a full song package (folder with audio + lyrics + images)
2. **Select the climax** — choose the 30-50 second highlight of your song
3. **AI generates visual concept** — theme, mood, color palette, and image prompts based on your lyrics
4. **Generate images** — AI creates cinematic images matching your song's mood
5. **Animate images to video** — each image becomes a 5-second animated video clip
6. **Assemble final video** — clips are looped to match song duration, with audio overlay
7. **Export** — download MP4 ready for TikTok/YouTube/Reels

---

## 💰 Cost Per Video

| Step | Provider | Cost |
|------|----------|------|
| Song analysis | OpenAI GPT-4o-mini | ~$0.01 |
| Images (3x) | Together AI FLUX (free) | **$0.00** |
| Animation (3 clips) | FAL.AI Wan i2v | ~$0.60 |
| Assembly | FFmpeg (local) | $0.00 |
| **Total** | | **~$0.61** |

For 50 videos/month: **~$30/month**

---

## 🛠️ Tech Stack

### Backend
- **Python 3.10+** with FastAPI
- **MongoDB** — stores projects, users, settings, cost logs
- **FFmpeg** — audio extraction, video assembly, text overlays
- **JWT** — authentication with access + refresh tokens
- **AES encryption** — API keys stored encrypted in database

### Frontend
- **React 18** with Create React App + CRACO
- **Tailwind CSS** — dark theme UI
- **WaveSurfer.js** — audio waveform with region selection
- **Axios** — API client with JWT interceptor

### AI Providers

#### Images (choose one in Settings)
| Provider | Model | Cost/image | API Key Source |
|----------|-------|------------|----------------|
| Together AI | FLUX.1 Schnell Free | **$0.00** | [api.together.xyz](https://api.together.xyz) |
| Together AI | FLUX.1 Schnell | $0.003 | [api.together.xyz](https://api.together.xyz) |
| OpenAI | GPT Image 1 Mini | $0.005 | [platform.openai.com](https://platform.openai.com) |
| Google | Imagen 4 Fast | $0.02 | [aistudio.google.com](https://aistudio.google.com) |
| Google | Gemini Flash (Nano Banana) | $0.039 | [aistudio.google.com](https://aistudio.google.com) |
| OpenAI | GPT Image 1.5 | $0.04 | [platform.openai.com](https://platform.openai.com) |

#### Video Animation
| Provider | Model | Cost/clip | API Key Source |
|----------|-------|-----------|----------------|
| FAL.AI | Wan 2.1 i2v | ~$0.20 | [fal.ai](https://fal.ai) |

#### Song Analysis
| Provider | Model | Cost | Used For |
|----------|-------|------|----------|
| OpenAI | GPT-4o-mini | ~$0.01 | Lyrics analysis, visual concept, prompt generation |

---

## 📋 Prerequisites

### Required Software
- **Node.js** v18+ ([nodejs.org](https://nodejs.org))
- **Python** 3.10+ ([python.org](https://python.org))
- **MongoDB** 6+ ([mongodb.com/try/download/community](https://mongodb.com/try/download/community))
- **FFmpeg** ([github.com/BtbN/FFmpeg-Builds/releases](https://github.com/BtbN/FFmpeg-Builds/releases))
- **Git** ([git-scm.com](https://git-scm.com))

### Required API Keys (at minimum)
- **OpenAI** — for song analysis (required)
- **FAL.AI** — for video animation (required)
- **Together AI** — for free image generation (recommended)

### Optional API Keys
- **Google Gemini** — alternative image generation

---

## 🚀 Local Setup (Windows)

### 1. Install Prerequisites

**MongoDB:**
1. Download from [mongodb.com/try/download/community](https://mongodb.com/try/download/community)
2. Select: Windows x64, MSI package
3. Install with "Install MongoD as a Service" checked
4. MongoDB runs automatically on `localhost:27017`

**FFmpeg:**
1. Download `ffmpeg-master-latest-win64-gpl-shared.zip` from [GitHub releases](https://github.com/BtbN/FFmpeg-Builds/releases)
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to your PATH (System Environment Variables → Path → New)
4. Verify: open new terminal → `ffmpeg -version`

### 2. Clone & Setup Backend

```bash
git clone https://github.com/kalebtf/music-video-factory.git
cd music-video-factory/backend

# Install Python dependencies
pip install fastapi uvicorn motor pymongo bcrypt pyjwt cryptography httpx aiofiles python-dotenv python-multipart pydub email-validator

# Create environment file
echo MONGO_URL=mongodb://localhost:27017 > .env
echo DB_NAME=musicvideofactory >> .env
echo JWT_SECRET=your-jwt-secret-at-least-32-characters-long >> .env
echo ENCRYPTION_SECRET=your-encryption-key-at-least-32-chars >> .env

# Start backend
python -m uvicorn server:app --host 0.0.0.0 --port 8001
```

### 3. Setup Frontend (new terminal)

```bash
cd music-video-factory/frontend

# Install dependencies
npm install --legacy-peer-deps
npm install ajv@8 --legacy-peer-deps

# Create environment file
echo REACT_APP_BACKEND_URL=http://localhost:8001 > .env

# Start frontend
npm start
```

### 4. Open App
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:8001/docs](http://localhost:8001/docs)

### 5. First Time Setup
1. Register a new account
2. Go to **Settings**
3. Add your API keys:
   - OpenAI key (required for song analysis)
   - FAL.AI key (required for video animation)
   - Together AI key (recommended for free images)
4. Select your preferred **Image Provider** (FLUX Schnell Free recommended)
5. Create your first video!

---

## 🚀 Server Setup (Linux / Emergent)

### Environment Variables
```bash
export MONGO_URL=mongodb://localhost:27017
export DB_NAME=musicvideofactory
export JWT_SECRET=your-production-jwt-secret-minimum-32-chars
export ENCRYPTION_SECRET=your-production-encryption-key-32-chars
```

### Install & Run
```bash
# Install system deps
apt-get update && apt-get install -y ffmpeg

# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001

# Frontend (separate terminal)
cd frontend
npm install --legacy-peer-deps
npm install ajv@8 --legacy-peer-deps
REACT_APP_BACKEND_URL=http://your-server:8001 npm start
```

The `PROJECTS_DIR` automatically detects the OS:
- **Windows:** `music-video-factory/projects/`
- **Linux:** `/app/projects/`

---

## 📁 Project Structure

```
music-video-factory/
├── backend/
│   ├── server.py          # FastAPI backend (all endpoints)
│   ├── requirements.txt   # Python dependencies
│   └── .env               # Environment variables (local)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── wizard/
│   │   │   │   ├── Step1SongInput.js      # Song import + folder import
│   │   │   │   ├── Step2SelectClimax.js   # Audio waveform + region select
│   │   │   │   ├── Step3VisualConcept.js  # AI visual concept generation
│   │   │   │   ├── Step4GenerateImages.js # Image generation + approve/reject
│   │   │   │   ├── Step5AnimateClips.js   # Video animation with FAL.AI
│   │   │   │   ├── Step6AssembleVideo.js  # FFmpeg assembly
│   │   │   │   └── Step7ExportPublish.js  # Download + publishing info
│   │   │   ├── AuthImage.js   # Authenticated image/video loader
│   │   │   └── ui/            # shadcn/ui components
│   │   ├── pages/
│   │   │   ├── Dashboard.js   # Project list with thumbnails
│   │   │   ├── Settings.js    # API keys + provider selection
│   │   │   ├── NewVideo.js    # 7-step wizard controller
│   │   │   ├── Login.js
│   │   │   └── Register.js
│   │   ├── lib/
│   │   │   └── api.js         # Axios instance with JWT interceptor
│   │   └── contexts/
│   │       └── AuthContext.js  # Auth state management
│   └── .env                   # Frontend env (REACT_APP_BACKEND_URL)
└── projects/                  # Generated files (images, clips, videos)
    └── {project_id}/
        ├── audio/             # original.mp3, climax.mp3
        ├── images/            # img_0.png, img_1.png, ...
        ├── clips/             # clip_0.mp4, clip_1.mp4, ...
        └── final/             # video.mp4
```

---

## 🔑 Getting API Keys

### OpenAI (Required)
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up / Log in
3. Go to **API Keys** → Create new secret key
4. Add $5+ credit balance in **Billing**
5. Cost: ~$0.01 per song analysis, $0.005 per image

### Together AI (Recommended — free images)
1. Go to [api.together.xyz](https://api.together.xyz)
2. Sign up (free, $5 credits included)
3. Go to **Settings → API Keys** → Create key
4. Cost: $0.003/image, or FREE with FLUX Schnell Free model

### FAL.AI (Required for video)
1. Go to [fal.ai](https://fal.ai)
2. Sign up and add $10 credit
3. Go to **Settings → API Keys** → Create key
4. Cost: ~$0.20 per 5-second video clip

### Google Gemini (Optional)
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with Google account
3. Click **"Get API Key"** → Create key (no credit card needed)
4. Cost: $0.039/image via API, free in AI Studio web UI

---

## 🎨 Features

- **Smart Import** — import a folder with audio + lyrics.txt + images, AI auto-fills everything
- **AI Options** — toggle which fields AI fills (title, genre, lyrics, image analysis)
- **6 Emotional Templates** — Heartbreak, Urban Nostalgia, Corrido Emocional, Lost Love, Hope, Night Solitude
- **Multi-provider Images** — choose between OpenAI, Together AI, or Gemini
- **Video Animation** — FAL.AI Wan image-to-video with polling
- **Auto-loop Clips** — clips automatically repeat to match full song duration
- **Cost Tracker** — see exactly how much each API call costs
- **Encrypted API Keys** — keys stored with AES encryption in MongoDB
- **JWT Auth** — access + refresh token pattern

---

## 🐛 Known Issues

- WaveSurfer may show AbortError on Step 2 (non-blocking, dismiss and continue)
- Projects created with old PROJECTS_DIR paths may show 404 for images (delete and recreate)
- Subtitles from lyrics not yet implemented in video assembly

---

## 📝 License

MIT

---

## 🙏 Credits

Built with Claude (Anthropic) + Emergent.sh. Powered by OpenAI, FAL.AI, Together AI, and Google Gemini.
