from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import secrets
from cryptography.fernet import Fernet
import base64
import hashlib
import httpx
import aiofiles
import json
import subprocess
import asyncio
import zipfile
import io

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# JWT Configuration
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

# AES Encryption for API keys
def get_encryption_key():
    secret = os.environ.get("ENCRYPTION_SECRET", "default-encryption-key-32bytes!")
    key = hashlib.sha256(secret.encode()).digest()
    return base64.urlsafe_b64encode(key)

fernet = Fernet(get_encryption_key())

def encrypt_api_key(key: str) -> str:
    if not key:
        return ""
    return fernet.encrypt(key.encode()).decode()

def decrypt_api_key(encrypted_key: str) -> str:
    if not encrypted_key:
        return ""
    try:
        return fernet.decrypt(encrypted_key.encode()).decode()
    except Exception:
        return ""

# Password hashing
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# JWT functions
def get_jwt_secret() -> str:
    return os.environ.get("JWT_SECRET", "default-jwt-secret-key-change-in-production")

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        # Decrypt API keys for response
        if "apiKeys" in user:
            user["apiKeys"] = {
                "openai": bool(user["apiKeys"].get("openai")),
                "falai": bool(user["apiKeys"].get("falai")),
                "kling": bool(user["apiKeys"].get("kling")),
                "gemini": bool(user["apiKeys"].get("gemini")),
                "together": bool(user["apiKeys"].get("together"))
            }
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Default templates to seed
DEFAULT_TEMPLATES = [
    {
        "name": "Heartbreak",
        "emoji": "💔",
        "visualStyle": "rain, city lights, lonely silhouette, blue and warm tones",
        "imagePrompts": [
            "silhouette looking through rainy window at night, city lights blurred, cinematic, 9:16",
            "hands holding old photograph with rain drops, bokeh lights, emotional, 9:16",
            "person walking alone on wet city street at night, neon reflections, 9:16"
        ],
        "animationStyle": "slow zoom in, rain particles, soft camera drift",
        "textHooks": ["I was never enough for you...", "You left without saying anything...", "I did love you right..."],
        "colorPalette": ["#1a1a2e", "#e94560", "#0f3460", "#f0a500"],
        "isDefault": True
    },
    {
        "name": "Urban Nostalgia",
        "emoji": "🌆",
        "visualStyle": "city streets, sunset, golden light, vintage",
        "imagePrompts": [
            "empty city street at golden hour, long shadows, warm tones, 9:16",
            "person alone on park bench at dusk, city skyline, contemplative, 9:16",
            "streetlight turning on at twilight, bokeh city, nostalgic, 9:16"
        ],
        "animationStyle": "slow dolly forward, golden particles, gentle lens flare",
        "textHooks": ["These streets remember what you forgot...", "Everything is the same here, except you...", "I walk where we used to walk..."],
        "colorPalette": ["#2d1b00", "#f0a500", "#e94560", "#1a1a2e"],
        "isDefault": True
    },
    {
        "name": "Corrido Emocional",
        "emoji": "🎶",
        "visualStyle": "silhouette, guitar, sunset, desert, powerful",
        "imagePrompts": [
            "silhouette with guitar against dramatic sunset, desert, 9:16",
            "close-up guitar strings with warm sunset light, shallow DOF, 9:16",
            "lone figure walking on dusty road toward horizon, dramatic sky, 9:16"
        ],
        "animationStyle": "very slow zoom out, dust particles, wind movement",
        "textHooks": ["Soul broken but still standing...", "My land knows what I suffered...", "I didn't give up, but I did cry..."],
        "colorPalette": ["#1a0a00", "#ff6b35", "#8b0000", "#f0a500"],
        "isDefault": True
    },
    {
        "name": "Lost Love",
        "emoji": "💫",
        "visualStyle": "empty rooms, photographs, soft light, intimate",
        "imagePrompts": [
            "empty bedroom with sunlight through curtains, unmade bed, nostalgic, 9:16",
            "close-up of two coffee cups one untouched, morning light, lonely, 9:16",
            "hand touching fogged mirror with finger writing, soft light, 9:16"
        ],
        "animationStyle": "gentle breathing movement, dust particles in light, slow pan",
        "textHooks": ["Your side of the bed is still cold...", "Two cups, but only one heart...", "I still write your name..."],
        "colorPalette": ["#1a1520", "#d4a0a0", "#8b6914", "#2a1a30"],
        "isDefault": True
    },
    {
        "name": "Hope",
        "emoji": "🌅",
        "visualStyle": "sunrise, nature, light breaking through, rebirth",
        "imagePrompts": [
            "person facing sunrise on mountain top, golden light, inspiring, 9:16",
            "single flower growing through cracked concrete, morning dew, 9:16",
            "hands reaching toward sky with sun rays between fingers, 9:16"
        ],
        "animationStyle": "slow tilt up, light rays intensifying, warm glow",
        "textHooks": ["After the storm comes the light...", "I chose myself this time...", "This is my new beginning..."],
        "colorPalette": ["#0a1628", "#f0a500", "#ff6b35", "#53d769"],
        "isDefault": True
    },
    {
        "name": "Night Solitude",
        "emoji": "🌙",
        "visualStyle": "city at night, neon, alone, contemplative",
        "imagePrompts": [
            "person sitting on rooftop edge overlooking city at night, neon glow, 9:16",
            "empty bar stool with single drink, moody lighting, late night, 9:16",
            "reflection in puddle of neon signs on empty street, midnight, 9:16"
        ],
        "animationStyle": "very slow orbit, flickering neon, ambient movement",
        "textHooks": ["The city sleeps but I can't...", "Another night talking to the silence...", "Loneliness has its own sound..."],
        "colorPalette": ["#0a0a14", "#e94560", "#00b4d8", "#1a1a2e"],
        "isDefault": True
    }
]

# Pydantic Models
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str = Field(alias="_id")
    email: str
    apiKeys: dict = {}
    settings: dict = {}
    createdAt: str

class ApiKeyUpdate(BaseModel):
    provider: str  # openai, falai, kling, gemini, together
    apiKey: str

class ProviderSettings(BaseModel):
    imageProvider: str
    videoProvider: str

class ProjectCreate(BaseModel):
    title: str
    genre: Optional[str] = ""
    lyrics: Optional[str] = ""
    templateId: Optional[str] = None
    mode: Optional[str] = "ai"  # "ai" or "library"

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None

# Auth Endpoints
@api_router.post("/auth/register")
async def register(request: RegisterRequest, response: Response):
    email = request.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hash_password(request.password)
    user_doc = {
        "email": email,
        "password_hash": hashed,
        "apiKeys": {"openai": "", "falai": "", "kling": "", "gemini": "", "together": "", "pexels": ""},
        "settings": {"imageProvider": "together-flux-dev", "videoProvider": "falai-wan"},
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Seed default templates for new user
    templates_to_insert = []
    for template in DEFAULT_TEMPLATES:
        template_doc = {**template, "userId": user_id}
        templates_to_insert.append(template_doc)
    if templates_to_insert:
        await db.templates.insert_many(templates_to_insert)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    logger.info(f"[AUTH] Register success: {email}")
    
    return {
        "_id": user_id,
        "email": email,
        "apiKeys": {"openai": False, "falai": False, "kling": False},
        "settings": user_doc["settings"],
        "createdAt": user_doc["createdAt"],
        "access_token": access_token,
        "refresh_token": refresh_token
    }

@api_router.post("/auth/login")
async def login(request: LoginRequest, response: Response, req: Request):
    email = request.email.lower()
    
    # Brute force check
    ip = req.client.host if req.client else "unknown"
    identifier = f"{ip}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        lockout_until = attempt.get("lockout_until")
        if lockout_until and datetime.now(timezone.utc) < lockout_until:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")
    
    user = await db.users.find_one({"email": email})
    if not user:
        await increment_login_attempts(identifier)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(request.password, user["password_hash"]):
        await increment_login_attempts(identifier)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Clear failed attempts on success
    await db.login_attempts.delete_one({"identifier": identifier})
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    logger.info(f"[AUTH] Login success: {email}")
    
    return {
        "_id": user_id,
        "email": user["email"],
        "apiKeys": {
            "openai": bool(user.get("apiKeys", {}).get("openai")),
            "falai": bool(user.get("apiKeys", {}).get("falai")),
            "kling": bool(user.get("apiKeys", {}).get("kling"))
        },
        "settings": user.get("settings", {}),
        "createdAt": user.get("createdAt", ""),
        "access_token": access_token,
        "refresh_token": refresh_token
    }

async def increment_login_attempts(identifier: str):
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt:
        new_count = attempt.get("count", 0) + 1
        update = {"$set": {"count": new_count, "lastAttempt": datetime.now(timezone.utc)}}
        if new_count >= 5:
            update["$set"]["lockout_until"] = datetime.now(timezone.utc) + timedelta(minutes=15)
        await db.login_attempts.update_one({"identifier": identifier}, update)
    else:
        await db.login_attempts.insert_one({
            "identifier": identifier,
            "count": 1,
            "lastAttempt": datetime.now(timezone.utc)
        })

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    logger.info(f"[AUTH] /auth/me called for user: {user.get('email')}")
    return user

@api_router.get("/auth/test-keys")
async def test_keys(request: Request):
    """Test which API keys are saved and can be decrypted"""
    user = await get_current_user(request)
    full_user = await db.users.find_one({"_id": ObjectId(user["_id"])})
    api_keys = full_user.get("apiKeys", {})
    
    openai_encrypted = api_keys.get("openai", "")
    falai_encrypted = api_keys.get("falai", "")
    gemini_encrypted = api_keys.get("gemini", "")
    together_encrypted = api_keys.get("together", "")
    pexels_encrypted = api_keys.get("pexels", "")
    
    openai_ok = False
    falai_ok = False
    gemini_ok = False
    together_ok = False
    pexels_ok = False
    
    if openai_encrypted:
        decrypted = decrypt_api_key(openai_encrypted)
        openai_ok = bool(decrypted and len(decrypted) > 5)
    
    if falai_encrypted:
        decrypted = decrypt_api_key(falai_encrypted)
        falai_ok = bool(decrypted and len(decrypted) > 5)
    
    if gemini_encrypted:
        decrypted = decrypt_api_key(gemini_encrypted)
        gemini_ok = bool(decrypted and len(decrypted) > 5)
    
    if together_encrypted:
        decrypted = decrypt_api_key(together_encrypted)
        together_ok = bool(decrypted and len(decrypted) > 5)
    
    if pexels_encrypted:
        decrypted = decrypt_api_key(pexels_encrypted)
        pexels_ok = bool(decrypted and len(decrypted) > 5)
    
    # Also check server-level default Pexels key
    if not pexels_ok and DEFAULT_PEXELS_KEY:
        pexels_ok = True
    
    logger.info(f"[AUTH] test-keys for {user.get('email')}: openai={openai_ok}, falai={falai_ok}, gemini={gemini_ok}, together={together_ok}, pexels={pexels_ok}")
    
    return {"openai": openai_ok, "falai": falai_ok, "gemini": gemini_ok, "together": together_ok, "pexels": pexels_ok}

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    # Try cookie first, then Authorization header
    token = request.cookies.get("refresh_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        user_id = str(user["_id"])
        access_token = create_access_token(user_id, user["email"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
        logger.info(f"[AUTH] Token refreshed for user: {user['email']}")
        return {"message": "Token refreshed", "access_token": access_token}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# Settings Endpoints
@api_router.post("/settings/api-key")
async def save_api_key(data: ApiKeyUpdate, request: Request):
    user = await get_current_user(request)
    logger.info(f"[SETTINGS] save_api_key called by {user.get('email')} for provider: {data.provider}")
    provider = data.provider.lower()
    if provider not in ["openai", "falai", "kling", "gemini", "together", "pexels"]:
        raise HTTPException(status_code=400, detail="Invalid provider")
    
    encrypted = encrypt_api_key(data.apiKey)
    await db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {f"apiKeys.{provider}": encrypted}}
    )
    return {"success": True, "provider": provider}

@api_router.get("/settings/api-keys")
async def get_api_keys(request: Request):
    user = await get_current_user(request)
    logger.info(f"[SETTINGS] get_api_keys called by {user.get('email')}")
    full_user = await db.users.find_one({"_id": ObjectId(user["_id"])})
    api_keys = full_user.get("apiKeys", {})
    return {
        "openai": bool(api_keys.get("openai")),
        "falai": bool(api_keys.get("falai")),
        "kling": bool(api_keys.get("kling")),
        "pexels": bool(api_keys.get("pexels"))
    }

@api_router.post("/settings/providers")
async def update_providers(data: ProviderSettings, request: Request):
    user = await get_current_user(request)
    await db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {
            "settings.imageProvider": data.imageProvider,
            "settings.videoProvider": data.videoProvider
        }}
    )
    return {"success": True}

@api_router.get("/settings")
async def get_settings(request: Request):
    user = await get_current_user(request)
    full_user = await db.users.find_one({"_id": ObjectId(user["_id"])})
    return {
        "imageProvider": full_user.get("settings", {}).get("imageProvider", "gpt-image-mini"),
        "videoProvider": full_user.get("settings", {}).get("videoProvider", "falai-wan")
    }

# Cost Log Endpoints
@api_router.get("/cost-logs")
async def get_cost_logs(request: Request):
    user = await get_current_user(request)
    logs = await db.cost_logs.find(
        {"userId": user["_id"]},
        {"_id": 0}
    ).sort("date", -1).to_list(100)
    total = sum(log.get("cost", 0) for log in logs)
    return {"logs": logs, "total": total}

@api_router.post("/cost-logs")
async def add_cost_log(request: Request, data: dict):
    user = await get_current_user(request)
    log_doc = {
        "userId": user["_id"],
        "projectId": data.get("projectId"),
        "date": datetime.now(timezone.utc).isoformat(),
        "action": data.get("action"),
        "provider": data.get("provider"),
        "cost": data.get("cost", 0),
        "details": data.get("details", "")
    }
    await db.cost_logs.insert_one(log_doc)
    return {"success": True}

# ========================================
# STOCK MEDIA SEARCH (Pexels Proxy)
# ========================================

DEFAULT_PEXELS_KEY = os.environ.get("PEXELS_API_KEY", "")

async def get_pexels_key(user_id: str) -> str:
    """Get Pexels API key - user's own key takes priority, then app-wide default."""
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user:
        encrypted = user.get("apiKeys", {}).get("pexels", "")
        if encrypted:
            key = decrypt_api_key(encrypted)
            if key:
                return key
    return DEFAULT_PEXELS_KEY

@api_router.get("/stock/search/photos")
async def search_stock_photos(request: Request, query: str, page: int = 1, per_page: int = 20):
    user = await get_current_user(request)
    pexels_key = await get_pexels_key(user["_id"])
    if not pexels_key:
        raise HTTPException(status_code=400, detail="No Pexels API key configured. Add one in Settings or contact the admin.")

    async with httpx.AsyncClient() as client_http:
        resp = await client_http.get(
            "https://api.pexels.com/v1/search",
            params={"query": query, "page": page, "per_page": per_page, "orientation": "portrait"},
            headers={"Authorization": pexels_key},
            timeout=15
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Pexels API error")
        data = resp.json()

    photos = []
    for p in data.get("photos", []):
        photos.append({
            "id": f"pexels-photo-{p['id']}",
            "pexelsId": p["id"],
            "type": "stock-photo",
            "thumbnailUrl": p.get("src", {}).get("medium", ""),
            "sourceUrl": p.get("src", {}).get("large2x", p.get("src", {}).get("original", "")),
            "width": p.get("width", 0),
            "height": p.get("height", 0),
            "photographer": p.get("photographer", ""),
            "pexelsUrl": p.get("url", ""),
        })

    return {
        "photos": photos,
        "page": data.get("page", page),
        "totalResults": data.get("total_results", 0),
        "hasMore": page * per_page < data.get("total_results", 0)
    }

@api_router.get("/stock/search/videos")
async def search_stock_videos(request: Request, query: str, page: int = 1, per_page: int = 15):
    user = await get_current_user(request)
    pexels_key = await get_pexels_key(user["_id"])
    if not pexels_key:
        raise HTTPException(status_code=400, detail="No Pexels API key configured. Add one in Settings or contact the admin.")

    async with httpx.AsyncClient() as client_http:
        resp = await client_http.get(
            "https://api.pexels.com/videos/search",
            params={"query": query, "page": page, "per_page": per_page, "orientation": "portrait"},
            headers={"Authorization": pexels_key},
            timeout=15
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Pexels API error")
        data = resp.json()

    videos = []
    for v in data.get("videos", []):
        # Pick best HD video file
        video_files = v.get("video_files", [])
        best_file = None
        for vf in sorted(video_files, key=lambda x: x.get("height", 0), reverse=True):
            if vf.get("file_type") == "video/mp4":
                best_file = vf
                break
        if not best_file and video_files:
            best_file = video_files[0]

        videos.append({
            "id": f"pexels-video-{v['id']}",
            "pexelsId": v["id"],
            "type": "stock-video",
            "thumbnailUrl": v.get("image", ""),
            "sourceUrl": best_file.get("link", "") if best_file else "",
            "width": best_file.get("width", 0) if best_file else 0,
            "height": best_file.get("height", 0) if best_file else 0,
            "duration": v.get("duration", 0),
            "user": v.get("user", {}).get("name", ""),
            "pexelsUrl": v.get("url", ""),
        })

    return {
        "videos": videos,
        "page": data.get("page", page),
        "totalResults": data.get("total_results", 0),
        "hasMore": page * per_page < data.get("total_results", 0)
    }

# ========================================
# MEDIA MANAGEMENT (Library Mode)
# ========================================

@api_router.post("/projects/{project_id}/media/upload")
async def upload_media(project_id: str, request: Request, file: UploadFile = File(...)):
    """Upload image or video to the project media pool."""
    user = await get_current_user(request)
    project = await db.projects.find_one({"_id": ObjectId(project_id), "userId": user["_id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    media_dir = PROJECTS_DIR / project_id / "media"
    media_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename).suffix.lower()
    is_video = ext in [".mp4", ".mov", ".avi", ".webm", ".mkv"]
    is_image = ext in [".jpg", ".jpeg", ".png", ".webp", ".gif"]
    if not is_video and not is_image:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use images (jpg/png/webp) or videos (mp4/mov).")

    file_id = str(uuid.uuid4())[:8]
    filename = f"{file_id}{ext}"
    file_path = media_dir / filename

    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)

    media_type = "upload-video" if is_video else "upload-image"
    duration = 0
    if is_video:
        try:
            probe_cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                        '-of', 'default=noprint_wrappers=1:nokey=1', str(file_path)]
            probe_result = await asyncio.to_thread(subprocess.run, probe_cmd, capture_output=True, text=True)
            if probe_result.returncode == 0 and probe_result.stdout.strip():
                duration = round(float(probe_result.stdout.strip()), 1)
        except Exception:
            pass

    return {
        "id": file_id,
        "type": media_type,
        "filename": file.filename,
        "localPath": str(file_path),
        "mediaUrl": f"/api/projects/{project_id}/media/{filename}",
        "duration": duration,
    }

@api_router.get("/projects/{project_id}/media/{filename}")
async def serve_media(project_id: str, filename: str, request: Request):
    """Serve media files for the project."""
    await get_current_user(request)
    file_path = PROJECTS_DIR / project_id / "media" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Media file not found")
    return FileResponse(str(file_path))

@api_router.post("/projects/{project_id}/media/download-stock")
async def download_stock_media(project_id: str, request: Request, data: dict):
    """Download a stock photo/video from Pexels into the project's media folder."""
    user = await get_current_user(request)
    project = await db.projects.find_one({"_id": ObjectId(project_id), "userId": user["_id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    source_url = data.get("sourceUrl")
    media_type = data.get("type", "stock-photo")
    if not source_url:
        raise HTTPException(status_code=400, detail="sourceUrl is required")

    media_dir = PROJECTS_DIR / project_id / "media"
    media_dir.mkdir(parents=True, exist_ok=True)

    file_id = str(uuid.uuid4())[:8]
    ext = ".mp4" if "video" in media_type else ".jpg"
    filename = f"{file_id}{ext}"
    file_path = media_dir / filename

    async with httpx.AsyncClient(follow_redirects=True) as client_http:
        resp = await client_http.get(source_url, timeout=60)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to download stock media")
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(resp.content)

    duration = 0
    if "video" in media_type:
        try:
            probe_cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                        '-of', 'default=noprint_wrappers=1:nokey=1', str(file_path)]
            probe_result = await asyncio.to_thread(subprocess.run, probe_cmd, capture_output=True, text=True)
            if probe_result.returncode == 0 and probe_result.stdout.strip():
                duration = round(float(probe_result.stdout.strip()), 1)
        except Exception:
            pass

    return {
        "id": file_id,
        "localPath": str(file_path),
        "mediaUrl": f"/api/projects/{project_id}/media/{filename}",
        "duration": duration,
    }

@api_router.post("/projects/{project_id}/media/still-to-clip")
async def still_to_clip(project_id: str, request: Request, data: dict):
    """Convert a still image into a video clip with cinematic effects using FFmpeg."""
    user = await get_current_user(request)
    project = await db.projects.find_one({"_id": ObjectId(project_id), "userId": user["_id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    image_path = data.get("imagePath")
    duration = data.get("duration", 4)
    duration = max(2, min(10, duration))
    effect = data.get("effect", "ken_burns_in")

    if not image_path or not Path(image_path).exists():
        raise HTTPException(status_code=400, detail=f"Image file not found: {image_path}")

    clips_dir = PROJECTS_DIR / project_id / "clips"
    clips_dir.mkdir(parents=True, exist_ok=True)

    clip_id = str(uuid.uuid4())[:8]
    output_path = clips_dir / f"still_{clip_id}.mp4"
    frames = int(duration * 30)

    # Build the effect filter chain — expanded set
    base_scale = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920"
    needs_fps_flag = False  # effects without zoompan need explicit -r 30

    effect_filters = {
        # Motion effects (zoompan-based, sets its own fps)
        "ken_burns_in": f"{base_scale},zoompan=z='min(zoom+0.0015,1.3)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s=1080x1920:fps=30",
        "ken_burns_out": f"{base_scale},zoompan=z='if(lte(zoom,1.0),1.3,max(1.001,zoom-0.0015))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s=1080x1920:fps=30",
        "pan_left": f"{base_scale},zoompan=z='1.15':x='iw*0.15*(1-on/{frames})':y='ih/2-(ih/zoom/2)':d={frames}:s=1080x1920:fps=30",
        "pan_right": f"{base_scale},zoompan=z='1.15':x='iw*0.15*(on/{frames})':y='ih/2-(ih/zoom/2)':d={frames}:s=1080x1920:fps=30",
        "pan_up": f"{base_scale},zoompan=z='1.15':x='iw/2-(iw/zoom/2)':y='ih*0.15*(1-on/{frames})':d={frames}:s=1080x1920:fps=30",
        "pan_down": f"{base_scale},zoompan=z='1.15':x='iw/2-(iw/zoom/2)':y='ih*0.15*(on/{frames})':d={frames}:s=1080x1920:fps=30",
        "zoom_rotate": f"{base_scale},zoompan=z='min(zoom+0.001,1.2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s=1080x1920:fps=30",
        # Slide effects (zoompan-based)
        "slide_left": f"{base_scale},zoompan=z='1.0':x='iw*0.3*(on/{frames})':y='ih/2-(ih/zoom/2)':d={frames}:s=1080x1920:fps=30",
        "slide_right": f"{base_scale},zoompan=z='1.0':x='iw*0.3*(1-on/{frames})':y='ih/2-(ih/zoom/2)':d={frames}:s=1080x1920:fps=30",
        "slide_up": f"{base_scale},zoompan=z='1.0':x='iw/2-(iw/zoom/2)':y='ih*0.3*(on/{frames})':d={frames}:s=1080x1920:fps=30",
        "slide_down": f"{base_scale},zoompan=z='1.0':x='iw/2-(iw/zoom/2)':y='ih*0.3*(1-on/{frames})':d={frames}:s=1080x1920:fps=30",
    }

    # Simple filter effects (need -r flag)
    simple_effects = {
        "fade_in": base_scale,
        "fade_out": base_scale,
        "blur_in": base_scale,
        "blur_out": base_scale,
        "vignette": f"{base_scale},vignette=PI/4",
        "vintage": f"{base_scale},colorbalance=rs=0.3:gs=-0.05:bs=-0.1,curves=vintage",
        "glow": f"{base_scale},unsharp=5:5:1.5:5:5:0.0",
        "film_grain": f"{base_scale},noise=alls=25:allf=t",
        "static": base_scale,
    }

    if effect in simple_effects:
        vf = simple_effects[effect]
        needs_fps_flag = True
    elif effect in effect_filters:
        vf = effect_filters[effect]
    else:
        vf = effect_filters["ken_burns_in"]

    # Post-processing fade/blur for simple effects
    fade_filter = ""
    if effect == "fade_in":
        fade_filter = f",fade=t=in:st=0:d={min(1.5, duration/2)}"
    elif effect == "fade_out":
        fade_filter = f",fade=t=out:st={max(0, duration - 1.5)}:d={min(1.5, duration/2)}"
    elif effect == "blur_in":
        fade_filter = f",fade=t=in:st=0:d=1"
    elif effect == "blur_out":
        fade_filter = f",fade=t=out:st={max(0, duration - 1)}:d=1"

    cmd = [
        'ffmpeg', '-y',
        '-loop', '1', '-i', str(image_path),
        '-vf', vf + fade_filter,
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-t', str(duration), '-pix_fmt', 'yuv420p',
    ]
    if needs_fps_flag:
        cmd.extend(['-r', '30'])
    cmd.append(str(output_path))

    logger.info(f"[EFFECT] Creating clip with effect='{effect}' for {image_path}")
    result = await asyncio.to_thread(subprocess.run, cmd, capture_output=True, text=True)

    if result.returncode != 0:
        logger.error(f"Still-to-clip effect failed ({effect}): {result.stderr[:500]}")
        # Fallback: simple static clip
        cmd_fallback = [
            'ffmpeg', '-y', '-loop', '1', '-i', str(image_path),
            '-vf', f'{base_scale}',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-t', str(duration), '-pix_fmt', 'yuv420p', '-r', '30',
            str(output_path)
        ]
        result = await asyncio.to_thread(subprocess.run, cmd_fallback, capture_output=True, text=True)
        if result.returncode != 0:
            logger.error(f"Fallback also failed: {result.stderr[:500]}")
            raise HTTPException(status_code=500, detail="Failed to convert image to clip")

    return {
        "clipId": clip_id,
        "clipUrl": f"/api/projects/{project_id}/clips/still_{clip_id}.mp4",
        "clipPath": str(output_path),
        "duration": duration,
        "effect": effect,
    }

@api_router.get("/effects/list")
async def list_effects():
    """Return all available visual effects and transitions for Library mode."""
    return {
        "effects": [
            {"id": "ken_burns_in", "name": "Zoom In", "category": "motion", "description": "Slow cinematic zoom in"},
            {"id": "ken_burns_out", "name": "Zoom Out", "category": "motion", "description": "Slow cinematic zoom out"},
            {"id": "pan_left", "name": "Pan Left", "category": "motion", "description": "Gentle pan from right to left"},
            {"id": "pan_right", "name": "Pan Right", "category": "motion", "description": "Gentle pan from left to right"},
            {"id": "pan_up", "name": "Pan Up", "category": "motion", "description": "Gentle upward pan"},
            {"id": "pan_down", "name": "Pan Down", "category": "motion", "description": "Gentle downward pan"},
            {"id": "slide_left", "name": "Slide Left", "category": "slide", "description": "Slide image from right to left"},
            {"id": "slide_right", "name": "Slide Right", "category": "slide", "description": "Slide image from left to right"},
            {"id": "slide_up", "name": "Slide Up", "category": "slide", "description": "Slide image upward"},
            {"id": "slide_down", "name": "Slide Down", "category": "slide", "description": "Slide image downward"},
            {"id": "zoom_rotate", "name": "Zoom + Rotate", "category": "motion", "description": "Subtle zoom with slight rotation feel"},
            {"id": "fade_in", "name": "Fade In", "category": "fade", "description": "Fade from black"},
            {"id": "fade_out", "name": "Fade Out", "category": "fade", "description": "Fade to black"},
            {"id": "blur_in", "name": "Blur In", "category": "fade", "description": "Blur to sharp reveal"},
            {"id": "blur_out", "name": "Blur Out", "category": "fade", "description": "Sharp to blur exit"},
            {"id": "vignette", "name": "Vignette", "category": "style", "description": "Dark edges, focused center"},
            {"id": "vintage", "name": "Vintage", "category": "style", "description": "Warm retro color grading"},
            {"id": "glow", "name": "Glow", "category": "style", "description": "Soft luminous glow"},
            {"id": "film_grain", "name": "Film Grain", "category": "style", "description": "Classic film grain texture"},
            {"id": "static", "name": "Static", "category": "basic", "description": "No motion, still frame"},
        ],
        "transitions": [
            {"id": "crossfade", "name": "Crossfade", "description": "Smooth blend between clips"},
            {"id": "cut", "name": "Hard Cut", "description": "Instant cut between clips"},
            {"id": "fade_black", "name": "Fade to Black", "description": "Fade through black"},
        ],
        "presets": [
            {"id": "cinematic", "name": "Cinematic", "effects": ["ken_burns_in", "pan_right", "ken_burns_out", "pan_left", "ken_burns_in"], "transition": "crossfade"},
            {"id": "dynamic", "name": "Dynamic", "effects": ["pan_left", "ken_burns_in", "slide_right", "ken_burns_out", "pan_up"], "transition": "crossfade"},
            {"id": "smooth", "name": "Smooth & Slow", "effects": ["fade_in", "ken_burns_in", "ken_burns_out", "fade_out", "ken_burns_in"], "transition": "crossfade"},
            {"id": "energetic", "name": "Energetic", "effects": ["slide_left", "pan_right", "slide_up", "pan_down", "ken_burns_in"], "transition": "cut"},
            {"id": "vintage_film", "name": "Vintage Film", "effects": ["vintage", "film_grain", "vignette", "ken_burns_in", "glow"], "transition": "crossfade"},
            {"id": "dreamy", "name": "Dreamy", "effects": ["glow", "blur_in", "ken_burns_in", "fade_out", "blur_out"], "transition": "crossfade"},
        ]
    }

@api_router.post("/projects/{project_id}/media/trim-video")
async def trim_video(project_id: str, request: Request, data: dict):
    """Trim a video to specified duration, resizing for 9:16 vertical format."""
    user = await get_current_user(request)
    project = await db.projects.find_one({"_id": ObjectId(project_id), "userId": user["_id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    video_path = data.get("videoPath")
    max_duration = data.get("maxDuration", 30)

    if not video_path or not Path(video_path).exists():
        raise HTTPException(status_code=400, detail="Video file not found")

    clips_dir = PROJECTS_DIR / project_id / "clips"
    clips_dir.mkdir(parents=True, exist_ok=True)

    clip_id = str(uuid.uuid4())[:8]
    output_path = clips_dir / f"trimmed_{clip_id}.mp4"

    cmd = [
        'ffmpeg', '-y', '-i', str(video_path),
        '-t', str(max_duration),
        '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-r', '30', '-an',
        str(output_path)
    ]

    result = await asyncio.to_thread(subprocess.run, cmd, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error(f"Video trim failed: {result.stderr[:500]}")
        raise HTTPException(status_code=500, detail="Failed to trim video")

    # Get actual duration
    actual_duration = max_duration
    try:
        probe_cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                    '-of', 'default=noprint_wrappers=1:nokey=1', str(output_path)]
        probe_result = await asyncio.to_thread(subprocess.run, probe_cmd, capture_output=True, text=True)
        if probe_result.returncode == 0 and probe_result.stdout.strip():
            actual_duration = round(float(probe_result.stdout.strip()), 1)
    except Exception:
        pass

    return {
        "clipId": clip_id,
        "clipUrl": f"/api/projects/{project_id}/clips/trimmed_{clip_id}.mp4",
        "clipPath": str(output_path),
        "duration": actual_duration,
    }

@api_router.put("/projects/{project_id}/media")
async def update_project_media(project_id: str, request: Request, data: dict):
    """Save the media pool state for a library-mode project."""
    user = await get_current_user(request)
    media = data.get("media", [])
    result = await db.projects.update_one(
        {"_id": ObjectId(project_id), "userId": user["_id"]},
        {"$set": {"media": media}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"success": True}

# Project Endpoints
@api_router.get("/projects")
async def get_projects(request: Request):
    user = await get_current_user(request)
    projects = await db.projects.find(
        {"userId": user["_id"]},
        {"_id": 1, "title": 1, "status": 1, "totalCost": 1, "createdAt": 1, "images": 1, "finalVideoPath": 1, "mode": 1}
    ).sort("createdAt", -1).to_list(100)
    
    for p in projects:
        p["_id"] = str(p["_id"])
    
    return projects

@api_router.post("/projects")
async def create_project(data: ProjectCreate, request: Request):
    user = await get_current_user(request)
    project_doc = {
        "userId": user["_id"],
        "title": data.title,
        "genre": data.genre,
        "lyrics": data.lyrics,
        "templateId": data.templateId,
        "mode": data.mode or "ai",
        "status": "draft",
        "audioOriginalPath": "",
        "audioClimaxPath": "",
        "climaxStart": 0,
        "climaxEnd": 0,
        "concept": {"theme": "", "mood": "", "palette": [], "prompts": [], "hooks": []},
        "images": [],
        "clips": [],
        "media": [],
        "finalVideoPath": "",
        "selectedHook": "",
        "totalCost": 0,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    result = await db.projects.insert_one(project_doc)
    return {"_id": str(result.inserted_id), **{k: v for k, v in project_doc.items() if k != "_id"}}

@api_router.get("/projects/{project_id}")
async def get_project(project_id: str, request: Request):
    user = await get_current_user(request)
    project = await db.projects.find_one({"_id": ObjectId(project_id), "userId": user["_id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project["_id"] = str(project["_id"])
    return project

@api_router.put("/projects/{project_id}")
async def update_project(project_id: str, data: ProjectUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.projects.update_one(
        {"_id": ObjectId(project_id), "userId": user["_id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"success": True}

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.projects.delete_one({"_id": ObjectId(project_id), "userId": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Clean up project files
    import shutil
    project_dir = PROJECTS_DIR / project_id
    if project_dir.exists():
        try:
            shutil.rmtree(project_dir)
            logger.info(f"Deleted project files: {project_dir}")
        except Exception as e:
            logger.error(f"Failed to delete project files: {e}")
    
    # Clean up cost logs
    await db.cost_logs.delete_many({"projectId": project_id})
    
    return {"success": True}

# Templates Endpoints
@api_router.get("/templates")
async def get_templates(request: Request):
    user = await get_current_user(request)
    templates = await db.templates.find({"userId": user["_id"]}, {"_id": 1, "name": 1, "emoji": 1, "visualStyle": 1}).to_list(100)
    for t in templates:
        t["_id"] = str(t["_id"])
    return templates

# Stats Endpoint
@api_router.get("/stats")
async def get_stats(request: Request):
    user = await get_current_user(request)
    
    # Count total projects
    total_videos = await db.projects.count_documents({"userId": user["_id"]})
    
    # This month's cost
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_logs = await db.cost_logs.find({
        "userId": user["_id"],
        "date": {"$gte": start_of_month.isoformat()}
    }, {"cost": 1, "_id": 0}).to_list(1000)
    month_cost = sum(log.get("cost", 0) for log in month_logs)
    
    # This week's videos
    start_of_week = now - timedelta(days=now.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    week_videos = await db.projects.count_documents({
        "userId": user["_id"],
        "createdAt": {"$gte": start_of_week.isoformat()}
    })
    
    return {
        "totalVideos": total_videos,
        "monthCost": round(month_cost, 2),
        "weekVideos": week_videos
    }

# Health check
@api_router.get("/")
async def root():
    return {"message": "Music Video Factory API"}

# ========================================
# AUDIO PROCESSING ENDPOINTS
# ========================================

# Ensure projects directory exists - use relative path that works on all platforms
# On Emergent/Linux it was /app/projects, locally we use ./projects relative to backend dir
import platform
if platform.system() == "Windows":
    # On Windows, use projects dir relative to the backend directory
    PROJECTS_DIR = Path(__file__).parent.parent / "projects"
else:
    # On Linux/Emergent, use the original absolute path
    PROJECTS_DIR = Path("/app/projects")
PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
logger.info(f"Projects directory: {PROJECTS_DIR.resolve()}")

class AudioUploadResponse(BaseModel):
    success: bool
    audioPath: str
    duration: float

class ClimaxDetectionResponse(BaseModel):
    start: float
    end: float
    duration: float
    message: str

class ClimaxExtractionRequest(BaseModel):
    projectId: str
    start: float
    end: float

@api_router.post("/audio/upload/{project_id}")
async def upload_audio(project_id: str, request: Request, file: UploadFile = File(...)):
    """Upload audio file for a project"""
    user = await get_current_user(request)
    
    # Verify project ownership
    project = await db.projects.find_one({"_id": ObjectId(project_id), "userId": user["_id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check file type
    if not file.content_type or not file.content_type.startswith('audio/'):
        raise HTTPException(status_code=400, detail="Invalid file type. Must be audio file.")
    
    # Create project audio directory
    project_dir = PROJECTS_DIR / project_id / "audio"
    project_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file
    audio_path = project_dir / "original.mp3"
    async with aiofiles.open(audio_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Get audio duration using ffprobe
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', str(audio_path)],
            capture_output=True, text=True
        )
        duration_info = json.loads(result.stdout)
        duration = float(duration_info['format']['duration'])
    except Exception as e:
        logger.error(f"Failed to get audio duration: {e}")
        duration = 0
    
    # Update project
    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"audioOriginalPath": str(audio_path), "audioDuration": duration}}
    )
    
    return {"success": True, "audioPath": str(audio_path), "duration": duration}

@api_router.post("/audio/detect-climax/{project_id}")
async def detect_climax(project_id: str, request: Request):
    """Auto-detect the climax section using pydub loudness analysis"""
    user = await get_current_user(request)
    logger.info(f"[AUDIO] detect-climax called by {user.get('email')} for project: {project_id}")
    
    project = await db.projects.find_one({"_id": ObjectId(project_id), "userId": user["_id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    audio_path = project.get("audioOriginalPath")
    if not audio_path:
        raise HTTPException(status_code=400, detail="No audio file uploaded. Please upload an audio file first.")
    
    if not Path(audio_path).exists():
        logger.error(f"Audio file not found at path: {audio_path}")
        raise HTTPException(status_code=400, detail=f"Audio file not found at: {audio_path}")
    
    try:
        from pydub import AudioSegment
        
        logger.info(f"Loading audio from: {audio_path}")
        audio = AudioSegment.from_file(audio_path)
        duration = len(audio) / 1000.0  # Convert to seconds
        
        logger.info(f"Audio loaded. Duration: {duration}s")
        
        # Calculate dBFS loudness for each 1-second segment
        loudness_values = []
        for i in range(int(duration)):
            chunk = audio[i * 1000:(i + 1) * 1000]
            if len(chunk) > 0:
                # dBFS returns negative values, higher = louder
                loudness_db = chunk.dBFS if chunk.dBFS > -float('inf') else -60
                loudness_values.append(loudness_db)
        
        logger.info(f"Calculated loudness for {len(loudness_values)} segments")
        
        if len(loudness_values) < 40:
            # Audio too short, return full range
            climax_start = 0
            climax_end = duration
        else:
            # Find 40-second window with highest average loudness
            window_size = 40
            best_start = 0
            best_avg_loudness = -float('inf')
            
            for i in range(len(loudness_values) - window_size + 1):
                window = loudness_values[i:i + window_size]
                avg_loudness = sum(window) / len(window)
                if avg_loudness > best_avg_loudness:
                    best_avg_loudness = avg_loudness
                    best_start = i
            
            climax_start = float(best_start)
            climax_end = min(duration, climax_start + 40)
        
        # Update project
        await db.projects.update_one(
            {"_id": ObjectId(project_id)},
            {"$set": {"climaxStart": climax_start, "climaxEnd": climax_end}}
        )
        
        logger.info(f"Climax detected: {climax_start}s - {climax_end}s")
        
        return {
            "start": round(climax_start, 2),
            "end": round(climax_end, 2),
            "duration": round(climax_end - climax_start, 2),
            "message": f"Climax detected at {int(climax_start//60)}:{int(climax_start%60):02d} - {int(climax_end//60)}:{int(climax_end%60):02d} - adjust if needed"
        }
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Climax detection failed: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Climax detection failed: {str(e)}")

@api_router.post("/audio/extract-climax/{project_id}")
async def extract_climax(project_id: str, data: ClimaxExtractionRequest, request: Request):
    """Extract the climax section using ffmpeg"""
    user = await get_current_user(request)
    logger.info(f"[AUDIO] extract-climax called by {user.get('email')} for project: {project_id}")
    
    project = await db.projects.find_one({"_id": ObjectId(project_id), "userId": user["_id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    audio_path = project.get("audioOriginalPath")
    if not audio_path:
        raise HTTPException(status_code=400, detail="No audio file uploaded")
    
    if not Path(audio_path).exists():
        logger.error(f"Audio file not found: {audio_path}")
        raise HTTPException(status_code=400, detail=f"Audio file not found: {audio_path}")
    
    try:
        # Ensure output directory exists
        project_dir = PROJECTS_DIR / project_id / "audio"
        project_dir.mkdir(parents=True, exist_ok=True)
        climax_path = project_dir / "climax.mp3"
        
        logger.info(f"Extracting climax: {audio_path} -> {climax_path}")
        logger.info(f"Time range: {data.start}s to {data.end}s")
        
        # Check if ffmpeg is available (cross-platform)
        import shutil
        ffmpeg_path = shutil.which('ffmpeg')
        if not ffmpeg_path:
            logger.error("ffmpeg not found on PATH. Please install ffmpeg and add it to PATH.")
            raise Exception("ffmpeg not found. Install ffmpeg and ensure it's on your PATH.")
        logger.info(f"ffmpeg found at: {ffmpeg_path}")
        
        # Run ffmpeg to extract segment
        cmd = [
            'ffmpeg', '-y',
            '-i', str(audio_path),
            '-ss', str(data.start),
            '-to', str(data.end),
            '-c', 'copy',
            str(climax_path)
        ]
        
        logger.info(f"Running ffmpeg command: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"ffmpeg stderr: {result.stderr}")
            raise Exception(f"ffmpeg error: {result.stderr[:500]}")
        
        if not climax_path.exists():
            raise Exception("Output file was not created")
        
        # Update project
        await db.projects.update_one(
            {"_id": ObjectId(project_id)},
            {"$set": {
                "audioClimaxPath": str(climax_path),
                "climaxStart": data.start,
                "climaxEnd": data.end
            }}
        )
        
        logger.info(f"Climax extracted successfully: {climax_path}")
        
        return {
            "success": True,
            "climaxPath": str(climax_path),
            "duration": round(data.end - data.start, 2)
        }
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Climax extraction failed: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Climax extraction failed: {str(e)}")

# ========================================
# AI ANALYSIS ENDPOINTS (OpenAI)
# ========================================

class AnalyzeSongRequest(BaseModel):
    projectId: str

class AnalyzeSongResponse(BaseModel):
    theme: str
    mood: str
    animationStyle: str
    palette: List[str]
    prompts: List[str]
    hooks: List[str]

async def get_user_openai_key(user_id: str) -> Optional[str]:
    """Get user's decrypted OpenAI API key"""
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return None
    encrypted_key = user.get("apiKeys", {}).get("openai")
    if not encrypted_key:
        return None
    return decrypt_api_key(encrypted_key)

class ParseSongInfoRequest(BaseModel):
    text: str

@api_router.post("/ai/parse-song-info")
async def parse_song_info(data: ParseSongInfoRequest, request: Request):
    """Parse song info text using OpenAI to extract title, genre, and lyrics"""
    user = await get_current_user(request)
    logger.info(f"[AI] parse-song-info called by {user.get('email')}")
    
    openai_key = await get_user_openai_key(user["_id"])
    if not openai_key:
        raise HTTPException(status_code=400, detail="Please save your OpenAI API key in Settings first.")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {
                            "role": "system",
                            "content": """You are a professional music analyst and metadata extractor. Given raw text from a song info file, extract:
1. title: The song title
2. genre: A DETAILED genre/style description that captures the full musical identity. Include:
   - Primary genre (e.g., Latin Pop, Regional Mexicano, R&B, Hip-Hop, Corrido)
   - Sub-genre or style (e.g., ballad, uptempo, tropical, trap)
   - Mood/emotion (e.g., emotional, nostalgic, romantic, melancholic, empowering)
   - Vocal style (e.g., duet male/female, soft female vocal, raspy male vocal)
   - Key instruments or production style (e.g., piano-driven, mariachi, acoustic guitar, synth-heavy)
   - Tempo feel (e.g., slow tempo, mid-tempo, uptempo, waltz)
   Example good genre: "Latin pop ballad, emotional duet, nostalgic, piano and strings, slow tempo, cinematic feel"
   Example good genre: "Regional mexicano corrido, male vocal, accordion and bajo sexto, mid-tempo, storytelling"
   Example good genre: "R&B soul, smooth female vocal, lo-fi beats, intimate, slow groove"
3. lyrics: The complete song lyrics (preserve all formatting, sections like [Verse], [Chorus], etc.)

The text may be in ANY format - it could have labels like "Title:", "Genre:", "Lyrics:" or tags like [Genre], or it could just be raw text. Look for clues in the entire text including: style tags (e.g., [mariachi], [duet]), BPM info, instrumentation notes, mood descriptions, vocal directions.

Respond ONLY with a JSON object (no markdown, no backticks):
{"title": "...", "genre": "...", "lyrics": "..."}

If you can't find a field, use empty string. For genre, ALWAYS infer a detailed description from the lyrics language, vocabulary, emotional tone, and any style hints in the text. Never return just one word like "Latin" - always be specific and descriptive."""
                        },
                        {
                            "role": "user",
                            "content": data.text[:5000]  # Limit to prevent token overflow
                        }
                    ],
                    "temperature": 0.3,
                    "max_tokens": 2000
                }
            )
            
            if response.status_code != 200:
                logger.error(f"OpenAI parse error: {response.text}")
                raise HTTPException(status_code=500, detail="AI parsing failed")
            
            result = response.json()
            content = result["choices"][0]["message"]["content"].strip()
            
            # Parse JSON from response
            import re
            # Remove potential markdown backticks
            content = re.sub(r'^```json\s*', '', content)
            content = re.sub(r'\s*```$', '', content)
            
            parsed = json.loads(content)
            
            # Log cost
            await db.cost_logs.insert_one({
                "userId": user["_id"],
                "date": datetime.now(timezone.utc).isoformat(),
                "action": "parse-song",
                "provider": "openai",
                "cost": 0.001,
                "details": "Song info parsing with GPT-4o-mini"
            })
            
            return {
                "title": parsed.get("title", ""),
                "genre": parsed.get("genre", ""),
                "lyrics": parsed.get("lyrics", "")
            }
            
    except json.JSONDecodeError:
        logger.error(f"Failed to parse AI response as JSON: {content}")
        raise HTTPException(status_code=500, detail="AI returned invalid format")
    except Exception as e:
        logger.error(f"Song info parsing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class AnalyzeImagesRequest(BaseModel):
    projectId: str
    imageUrls: List[str] = []  # base64 data URIs

@api_router.post("/ai/analyze-images")
async def analyze_images(data: AnalyzeImagesRequest, request: Request):
    """Analyze uploaded images with GPT-4o vision to extract visual context"""
    user = await get_current_user(request)
    logger.info(f"[AI] analyze-images called by {user.get('email')} for project: {data.projectId}, {len(data.imageUrls)} images")
    
    openai_key = await get_user_openai_key(user["_id"])
    if not openai_key:
        raise HTTPException(status_code=400, detail="Please save your OpenAI API key in Settings first.")
    
    if not data.imageUrls:
        return {"descriptions": "", "success": True}
    
    try:
        # Build vision message with up to 3 images (to control cost)
        image_content = []
        for i, img_url in enumerate(data.imageUrls[:3]):
            image_content.append({
                "type": "image_url",
                "image_url": {"url": img_url, "detail": "low"}
            })
        
        image_content.append({
            "type": "text",
            "text": "Describe these reference images in detail. For each image, describe: the characters/people (appearance, clothing, expression), the setting/environment, the color palette, the mood/atmosphere, the lighting, and any notable visual elements. This will be used to create consistent visual prompts for a music video."
        })
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {
                            "role": "user",
                            "content": image_content
                        }
                    ],
                    "max_tokens": 1000,
                    "temperature": 0.5
                }
            )
            
            if response.status_code != 200:
                logger.error(f"OpenAI vision error: {response.text}")
                return {"descriptions": "", "success": False, "error": "Vision API failed"}
            
            result = response.json()
            descriptions = result["choices"][0]["message"]["content"].strip()
            
            # Save to project
            await db.projects.update_one(
                {"_id": ObjectId(data.projectId)},
                {"$set": {"imageDescriptions": descriptions}}
            )
            
            # Log cost
            await db.cost_logs.insert_one({
                "userId": user["_id"],
                "projectId": data.projectId,
                "date": datetime.now(timezone.utc).isoformat(),
                "action": "image-analysis",
                "provider": "openai",
                "cost": 0.005,
                "details": f"Analyzed {len(data.imageUrls[:3])} reference images"
            })
            
            logger.info(f"Image analysis complete: {descriptions[:100]}...")
            return {"descriptions": descriptions, "success": True}
            
    except Exception as e:
        logger.error(f"Image analysis failed: {e}")
        return {"descriptions": "", "success": False, "error": str(e)}

@api_router.post("/ai/generate-image-prompts")
async def generate_image_prompts(data: dict, request: Request):
    """Generate 7 detailed image prompts for external use (Midjourney, FLUX, etc.)."""
    user = await get_current_user(request)
    logger.info(f"[AI] generate-image-prompts called by {user.get('email')}")

    openai_key = await get_user_openai_key(user["_id"])
    if not openai_key:
        raise HTTPException(status_code=400, detail="OpenAI API key not configured. Please add it in Settings.")

    title = data.get("title", "")
    lyrics = data.get("lyrics", "")
    genre = data.get("genre", "")
    project_id = data.get("projectId", "")

    try:
        async with httpx.AsyncClient() as client_http:
            response = await client_http.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {
                            "role": "system",
                            "content": """You are an expert visual director specializing in ultra-realistic, cinematic image prompts for Latin American / Mexican music videos.

Generate exactly 7 image prompts. Each prompt MUST be:
- Written in ENGLISH (for AI image generation tools like Midjourney, FLUX, DALL-E)
- 2-3 sentences long with specific details about: lighting, composition, camera angle, color palette, and emotional tone
- Ultra-realistic / photorealistic style — NO cartoon, NO illustration, NO anime
- Latin American / Mexican atmosphere and cultural aesthetic
- Emotional, cinematic, nostalgic, with warm color tones (golden hour, amber, deep browns, sunset oranges)
- Vertical 9:16 portrait format (mention this in each prompt)

The prompts should tell a visual story that flows from scene to scene, capturing the emotion of the song.

Return ONLY valid JSON (no markdown, no code blocks):
{"prompts": ["prompt 1", "prompt 2", "prompt 3", "prompt 4", "prompt 5", "prompt 6", "prompt 7"]}"""
                        },
                        {
                            "role": "user",
                            "content": f"Song: {title}\nGenre: {genre}\n\nLyrics:\n{lyrics[:2000]}"
                        }
                    ],
                    "temperature": 0.85,
                    "max_tokens": 2000,
                },
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            content = result["choices"][0]["message"]["content"]

            # Parse JSON response
            import re as re_mod
            json_match = re_mod.search(r'\{.*\}', content, re_mod.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
                prompts = parsed.get("prompts", [])
            else:
                prompts = []

            # Save prompts to project
            if project_id:
                try:
                    await db.projects.update_one(
                        {"_id": ObjectId(project_id), "userId": user["_id"]},
                        {"$set": {"imagePrompts": prompts}}
                    )
                except Exception as e:
                    logger.error(f"Failed to save prompts to project: {e}")

            return {"prompts": prompts}

    except httpx.HTTPStatusError as e:
        logger.error(f"OpenAI API error: {e.response.status_code} {e.response.text[:300]}")
        raise HTTPException(status_code=502, detail="OpenAI API error. Check your API key.")
    except Exception as e:
        logger.error(f"Prompt generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate prompts: {str(e)}")


@api_router.post("/ai/generate-metadata")
async def generate_metadata(data: dict, request: Request):
    """Generate platform-specific metadata (title, description, hashtags) for TikTok/YouTube/IG/FB."""
    user = await get_current_user(request)
    logger.info(f"[AI] generate-metadata called by {user.get('email')}")

    openai_key = await get_user_openai_key(user["_id"])
    if not openai_key:
        raise HTTPException(status_code=400, detail="OpenAI API key not configured. Please add it in Settings.")

    title = data.get("title", "")
    genre = data.get("genre", "")
    lyrics = data.get("lyrics", "")
    hooks = data.get("hooks", [])
    project_id = data.get("projectId", "")

    hooks_text = "\n".join(f'- "{h}"' for h in hooks) if hooks else "No hooks selected."

    try:
        async with httpx.AsyncClient() as client_http:
            response = await client_http.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {
                            "role": "system",
                            "content": """You are a social media marketing expert for Latin music content creators.

Generate metadata for 4 platforms. ALL titles, descriptions, and hashtags must be in SPANISH (include some trending English hashtags too).

Return ONLY valid JSON (no markdown, no code blocks):
{
  "tiktok": {
    "title": "short catchy title with 1-2 emojis in Spanish",
    "description": "2-3 line emotional caption in Spanish with emojis, hooks, and call to action",
    "hashtags": "#tag1 #tag2 ... (15-20 tags, mix trending Spanish + English + niche + song-specific)",
    "bestTime": "Day and hour range for Mexican/Latin audience, e.g. 'Viernes 7-9 PM CST'"
  },
  "youtube": {
    "title": "short catchy title with 1-2 emojis in Spanish",
    "description": "2-3 line emotional caption in Spanish with emojis",
    "hashtags": "#tag1 #tag2 ... (15-20 tags)",
    "bestTime": "Day and hour range"
  },
  "instagram": {
    "title": "short catchy title with 1-2 emojis in Spanish",
    "description": "2-3 line emotional caption in Spanish with emojis",
    "hashtags": "#tag1 #tag2 ... (15-20 tags)",
    "bestTime": "Day and hour range"
  },
  "facebook": {
    "title": "short catchy title with 1-2 emojis in Spanish",
    "description": "2-3 line emotional caption in Spanish with emojis",
    "hashtags": "#tag1 #tag2 ... (15-20 tags)",
    "bestTime": "Day and hour range"
  }
}

Rules:
- Titles max 60 chars with 1-2 relevant emojis
- Descriptions: 2-3 lines, emotional, include hooks from the song, end with a call to action
- Hashtags: mix of trending Spanish music hashtags, trending English hashtags, genre-specific, and song-specific
- Best time: specific to Mexican/Latin American timezone (CST/CDT)
- Each platform should have SLIGHTLY different tone: TikTok=casual/fun, YouTube=descriptive, Instagram=aesthetic, Facebook=emotional/shareable"""
                        },
                        {
                            "role": "user",
                            "content": f"Song: {title}\nGenre: {genre}\nHooks:\n{hooks_text}\n\nLyrics (excerpt):\n{lyrics[:1500]}"
                        }
                    ],
                    "temperature": 0.8,
                    "max_tokens": 2000,
                },
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            content = result["choices"][0]["message"]["content"]

            import re as re_mod
            json_match = re_mod.search(r'\{.*\}', content, re_mod.DOTALL)
            if json_match:
                metadata = json.loads(json_match.group())
            else:
                raise HTTPException(status_code=500, detail="Failed to parse metadata response")

            # Save to project
            if project_id:
                try:
                    await db.projects.update_one(
                        {"_id": ObjectId(project_id), "userId": user["_id"]},
                        {"$set": {"metadata": metadata}}
                    )
                except Exception as e:
                    logger.error(f"Failed to save metadata: {e}")

            # Log cost
            if project_id:
                await db.cost_logs.insert_one({
                    "userId": user["_id"],
                    "projectId": project_id,
                    "date": datetime.now(timezone.utc).isoformat(),
                    "action": "metadata",
                    "provider": "openai",
                    "cost": 0.01,
                    "details": "Platform metadata generation"
                })

            return {"metadata": metadata, "cost": 0.01}

    except httpx.HTTPStatusError as e:
        logger.error(f"OpenAI metadata error: {e.response.status_code}")
        raise HTTPException(status_code=502, detail="OpenAI API error. Check your API key.")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response. Try again.")
    except Exception as e:
        logger.error(f"Metadata generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Metadata generation failed: {str(e)}")


@api_router.post("/ai/generate-thumbnail")
async def generate_thumbnail(data: dict, request: Request):
    """Generate a platform-specific thumbnail using OpenAI GPT Image."""
    user = await get_current_user(request)
    logger.info(f"[AI] generate-thumbnail called by {user.get('email')}")

    openai_key = await get_user_openai_key(user["_id"])
    if not openai_key:
        raise HTTPException(status_code=400, detail="OpenAI API key not configured. Please add it in Settings.")

    platform = data.get("platform", "tiktok")
    title = data.get("title", "")
    mood = data.get("mood", "")
    genre = data.get("genre", "")
    project_id = data.get("projectId", "")

    # Platform-specific sizes and styles
    platform_configs = {
        "tiktok": {
            "size": "1024x1536",
            "style": "Bold vertical cover art for TikTok. Large dramatic text overlay with the song title, emotional cinematic imagery, neon accents, Latin music aesthetic, dark moody background with vibrant color pops. The text should be large and readable.",
        },
        "youtube": {
            "size": "1536x1024",
            "style": "Horizontal YouTube thumbnail. Clickbait style with very large bold text, emotional facial expression or dramatic scene, high contrast, warm cinematic colors, Latin music video aesthetic. Text must be huge and eye-catching.",
        },
        "instagram": {
            "size": "1024x1024",
            "style": "Square Instagram cover. Clean aesthetic design, subtle elegant text overlay, warm golden tones, cinematic mood, Latin romantic atmosphere. Minimalist but emotional composition.",
        },
        "facebook": {
            "size": "1536x1024",
            "style": "Horizontal Facebook cover. Emotional cinematic imagery, warm nostalgic color palette, subtle text overlay with song title, Latin American atmosphere, shareable and relatable visual.",
        },
    }

    config = platform_configs.get(platform, platform_configs["tiktok"])
    prompt = f'{config["style"]} Song title: "{title}". Genre: {genre}. Mood: {mood}. Ultra-realistic, photographic quality.'

    try:
        thumbnails_dir = PROJECTS_DIR / project_id / "thumbnails"
        thumbnails_dir.mkdir(parents=True, exist_ok=True)
        thumb_filename = f"thumb_{platform}.png"
        thumb_path = thumbnails_dir / thumb_filename

        async with httpx.AsyncClient(timeout=120.0) as client_http:
            response = await client_http.post(
                "https://api.openai.com/v1/images/generations",
                headers={
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-image-1",
                    "prompt": prompt,
                    "n": 1,
                    "size": config["size"],
                    "quality": "low"
                }
            )

            if response.status_code != 200:
                error_text = response.text[:300]
                logger.error(f"OpenAI thumbnail error: {error_text}")
                raise HTTPException(status_code=response.status_code, detail=f"Thumbnail generation failed: {error_text}")

            result = response.json()
            image_item = result["data"][0]

            if "b64_json" in image_item:
                image_data = base64.b64decode(image_item["b64_json"])
            elif "url" in image_item:
                img_resp = await client_http.get(image_item["url"])
                image_data = img_resp.content
            else:
                raise HTTPException(status_code=500, detail="Unknown image format")

        async with aiofiles.open(thumb_path, 'wb') as f:
            await f.write(image_data)

        thumb_url = f"/api/projects/{project_id}/thumbnails/{thumb_filename}"

        # Log cost
        cost = 0.005
        await db.cost_logs.insert_one({
            "userId": user["_id"],
            "projectId": project_id,
            "date": datetime.now(timezone.utc).isoformat(),
            "action": "thumbnail",
            "provider": "openai",
            "cost": cost,
            "details": f"Thumbnail for {platform}"
        })

        await db.projects.update_one(
            {"_id": ObjectId(project_id), "userId": user["_id"]},
            {"$set": {f"thumbnails.{platform}": thumb_url}}
        )

        return {
            "success": True,
            "thumbnailUrl": thumb_url,
            "platform": platform,
            "cost": cost,
        }

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Thumbnail generation timed out. Try again.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Thumbnail generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Thumbnail generation failed: {str(e)}")


@api_router.get("/projects/{project_id}/thumbnails/{filename}")
async def serve_thumbnail(project_id: str, filename: str, request: Request):
    """Serve thumbnail files."""
    await get_current_user(request)
    file_path = PROJECTS_DIR / project_id / "thumbnails" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    return FileResponse(str(file_path))


@api_router.post("/ai/analyze-song")
async def analyze_song(data: AnalyzeSongRequest, request: Request):
    """Analyze song with OpenAI GPT-4o-mini to generate visual concept"""
    user = await get_current_user(request)
    logger.info(f"[AI] analyze-song called by {user.get('email')} for project: {data.projectId}")
    
    # Get OpenAI key
    openai_key = await get_user_openai_key(user["_id"])
    logger.info(f"[AI] OpenAI key found: {bool(openai_key)}")
    if not openai_key:
        raise HTTPException(status_code=400, detail="OpenAI API key not configured. Please add it in Settings.")
    
    # Get project
    project = await db.projects.find_one({"_id": ObjectId(data.projectId), "userId": user["_id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    title = project.get("title", "Untitled")
    genre = project.get("genre", "Unknown")
    lyrics = project.get("lyrics", "")
    image_descriptions = project.get("imageDescriptions", "")
    
    if not lyrics:
        raise HTTPException(status_code=400, detail="Please add lyrics to analyze the song")
    
    # Build the user message with optional image context
    user_message = f"Title: {title}\nGenre: {genre}\nLyrics:\n{lyrics[:3000]}"
    if image_descriptions:
        user_message += f"\n\nReference Images Description (use these as visual inspiration for the prompts):\n{image_descriptions[:1000]}"
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o-mini",
                    "temperature": 0.8,
                    "max_tokens": 1500,
                    "messages": [
                        {
                            "role": "system",
                            "content": """You are a creative director for emotional music videos targeting Latin/Spanish-speaking audiences. Analyze this song deeply.

LANGUAGE RULES (STRICT):
- "hooks": MUST be written in SPANISH. These are short emotional phrases for text overlay. If lyrics are in Spanish, draw from them. If lyrics are in English, translate the emotion into Spanish.
- "theme", "mood", "animationStyle": MUST be written in ENGLISH. These guide AI image generation models that work best with English prompts.
- "prompts": MUST be written in ENGLISH. These are detailed image generation prompts that will be sent to AI models (FLUX, DALL-E). English is required for optimal results.

Return ONLY valid JSON (no markdown, no code blocks) with exactly this structure:
{
  "theme": "English description of the visual theme",
  "mood": "English description of overall mood and feeling",
  "animationStyle": "English description of camera movement and animation style",
  "palette": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "prompts": ["detailed English image prompt 1 for 9:16 vertical, cinematic, emotional", "prompt 2", "prompt 3", "prompt 4", "prompt 5"],
  "hooks": ["frase emotiva corta en español max 8 palabras 1", "frase 2", "frase 3", "frase 4", "frase 5", "frase 6", "frase 7"]
}
Generate at least 7 hooks. Each hook should be a powerful, emotional short phrase in SPANISH (max 8 words) that could appear as text overlay in the video. Draw directly from the lyrics' emotion and story.
All image prompts must be in ENGLISH for AI model compatibility — describe scenes, lighting, composition, mood in English."""
                        },
                        {
                            "role": "user",
                            "content": user_message
                        }
                    ]
                }
            )
            
            if response.status_code != 200:
                error_detail = response.json().get("error", {}).get("message", "Unknown error")
                raise HTTPException(status_code=response.status_code, detail=f"OpenAI API error: {error_detail}")
            
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            # Parse JSON response
            try:
                # Clean up response if it has markdown code blocks
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                concept = json.loads(content.strip())
            except json.JSONDecodeError:
                logger.error(f"Failed to parse AI response: {content}")
                raise HTTPException(status_code=500, detail="Failed to parse AI response")
            
            # Ensure all required fields exist
            concept.setdefault("theme", "")
            concept.setdefault("mood", "")
            concept.setdefault("animationStyle", "")
            concept.setdefault("palette", ["#1a1a2e", "#e94560", "#0f3460", "#f0a500"])
            concept.setdefault("prompts", [])
            concept.setdefault("hooks", [])
            
            # Update project concept
            await db.projects.update_one(
                {"_id": ObjectId(data.projectId)},
                {"$set": {"concept": concept}}
            )
            
            # Log cost
            await db.cost_logs.insert_one({
                "userId": user["_id"],
                "projectId": data.projectId,
                "date": datetime.now(timezone.utc).isoformat(),
                "action": "analysis",
                "provider": "openai",
                "cost": 0.01,
                "details": "GPT-4o-mini song analysis"
            })
            
            # Update total cost
            await db.projects.update_one(
                {"_id": ObjectId(data.projectId)},
                {"$inc": {"totalCost": 0.01}}
            )
            
            return concept
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="OpenAI API timeout. Please try again.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

# ========================================
# IMAGE GENERATION ENDPOINTS (OpenAI)
# ========================================

class GenerateImageRequest(BaseModel):
    projectId: str
    prompt: str
    imageIndex: int

class GenerateImageResponse(BaseModel):
    success: bool
    imageUrl: str
    imagePath: str
    cost: float

@api_router.post("/ai/generate-image")
async def generate_image(data: GenerateImageRequest, request: Request):
    """Generate a single image using OpenAI or Gemini"""
    user = await get_current_user(request)
    logger.info(f"[AI] generate-image called by {user.get('email')} for project: {data.projectId}, index: {data.imageIndex}")
    
    # Verify project
    project = await db.projects.find_one({"_id": ObjectId(data.projectId), "userId": user["_id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get user settings for image provider
    full_user = await db.users.find_one({"_id": ObjectId(user["_id"])})
    image_provider = full_user.get("settings", {}).get("imageProvider", "gpt-image-mini")
    
    # Create project images directory
    project_dir = PROJECTS_DIR / data.projectId / "images"
    project_dir.mkdir(parents=True, exist_ok=True)
    image_filename = f"img_{data.imageIndex}.png"
    image_path = project_dir / image_filename
    
    try:
        image_data = None
        cost_per_image = 0.005
        provider_name = "openai"
        
        # ===== GEMINI PROVIDER =====
        if image_provider.startswith("gemini"):
            gemini_key = decrypt_api_key(full_user.get("apiKeys", {}).get("gemini", ""))
            if not gemini_key:
                raise HTTPException(status_code=400, detail="Gemini API key not configured. Please add it in Settings.")
            
            provider_name = "gemini"
            
            # Select model and cost based on provider setting
            if image_provider == "gemini-flash":
                model_id = "gemini-2.5-flash-image"
                cost_per_image = 0.039
            elif image_provider == "gemini-nano-banana-2":
                model_id = "gemini-3.1-flash-image-preview"
                cost_per_image = 0.045
            elif image_provider == "imagen-4-fast":
                model_id = "imagen-4.0-generate-preview-05-20"
                cost_per_image = 0.02
            else:
                model_id = "gemini-2.5-flash-image"
                cost_per_image = 0.039
            
            logger.info(f"Using Gemini model: {model_id}, cost: ${cost_per_image}")
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                # Gemini API for image generation
                api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent"
                
                gemini_body = {
                    "contents": [{"parts": [{"text": f"{data.prompt}, vertical 9:16 format, cinematic, high quality"}]}],
                    "generationConfig": {
                        "responseModalities": ["IMAGE"],
                        "imageConfig": {"aspectRatio": "9:16"}
                    }
                }
                
                response = await client.post(
                    api_url,
                    headers={"Content-Type": "application/json"},
                    params={"key": gemini_key},
                    json=gemini_body
                )
                
                logger.info(f"Gemini Response Status: {response.status_code}")
                
                if response.status_code != 200:
                    error_text = response.text[:500]
                    logger.error(f"Gemini API Error: {error_text}")
                    raise HTTPException(status_code=response.status_code, detail=f"Gemini API error: {error_text}")
                
                result = response.json()
                
                # Extract image from Gemini response
                # Response format: candidates[0].content.parts[].inlineData.data (base64)
                candidates = result.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    for part in parts:
                        inline_data = part.get("inlineData")
                        if inline_data and inline_data.get("data"):
                            image_data = base64.b64decode(inline_data["data"])
                            break
                
                if not image_data:
                    logger.error(f"No image in Gemini response: {json.dumps(result)[:500]}")
                    raise HTTPException(status_code=500, detail="Gemini returned no image data")
        
        # ===== TOGETHER AI PROVIDER (FLUX) =====
        elif image_provider.startswith("together"):
            together_key = decrypt_api_key(full_user.get("apiKeys", {}).get("together", ""))
            if not together_key:
                raise HTTPException(status_code=400, detail="Together AI API key not configured. Please add it in Settings.")
            
            provider_name = "together"
            
            # All Together AI FLUX models use the same serverless model
            model_id = "black-forest-labs/FLUX.1-schnell"
            steps = 4
            if image_provider == "together-flux-schnell":
                cost_per_image = 0.003
                steps = 4
            elif image_provider == "together-flux-dev":
                model_id = "black-forest-labs/FLUX.1-dev"
                cost_per_image = 0.025
                steps = 28
            else:
                cost_per_image = 0.003
            
            logger.info(f"Using Together AI model: {model_id}, cost: ${cost_per_image}")
            
            try:
                async with httpx.AsyncClient(timeout=120.0) as client:
                    response = await client.post(
                        "https://api.together.xyz/v1/images/generations",
                        headers={
                            "Authorization": f"Bearer {together_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": model_id,
                            "prompt": f"{data.prompt}, vertical 9:16 portrait format, cinematic, high quality, detailed",
                            "n": 1,
                            "width": 768,
                            "height": 1344,
                            "steps": steps,
                            "response_format": "b64_json"
                        }
                    )
                    
                    logger.info(f"Together AI Response Status: {response.status_code}")
                    
                    if response.status_code != 200:
                        error_text = response.text[:500]
                        logger.error(f"Together AI Error: {error_text}")
                        raise Exception(f"Together AI returned {response.status_code}")
                    
                    result = response.json()
                    
                    if "data" in result and len(result["data"]) > 0:
                        item = result["data"][0]
                        if "b64_json" in item:
                            image_data = base64.b64decode(item["b64_json"])
                        elif "url" in item:
                            img_response = await client.get(item["url"])
                            image_data = img_response.content
                    
                    if not image_data:
                        logger.error("No image in Together AI response")
                        raise Exception("Together AI returned no image data")
                        
            except Exception as together_err:
                # FALLBACK to OpenAI if Together AI fails
                logger.warning(f"Together AI failed ({together_err}), falling back to OpenAI gpt-image-mini")
                openai_key = await get_user_openai_key(user["_id"])
                if not openai_key:
                    raise HTTPException(status_code=400, detail="Image generation failed with Together AI and no OpenAI key is configured as fallback. Please check your Together AI key or add an OpenAI key in Settings.")
                
                provider_name = "openai (fallback)"
                cost_per_image = 0.005
                
                request_body = {
                    "model": "gpt-image-1",
                    "prompt": data.prompt,
                    "n": 1,
                    "size": "1024x1536",
                    "quality": "low"
                }
                
                async with httpx.AsyncClient(timeout=120.0) as client:
                    response = await client.post(
                        "https://api.openai.com/v1/images/generations",
                        headers={
                            "Authorization": f"Bearer {openai_key}",
                            "Content-Type": "application/json"
                        },
                        json=request_body
                    )
                    
                    if response.status_code != 200:
                        error_detail = response.json().get("error", {}).get("message", "Unknown error")
                        raise HTTPException(status_code=response.status_code, detail=f"Image generation failed: {error_detail}")
                    
                    result = response.json()
                    if "data" in result and len(result["data"]) > 0:
                        item = result["data"][0]
                        if "b64_json" in item:
                            image_data = base64.b64decode(item["b64_json"])
                        elif "url" in item:
                            img_response = await client.get(item["url"])
                            image_data = img_response.content
                
                if not image_data:
                    raise HTTPException(status_code=500, detail="Image generation failed with both Together AI and OpenAI")
        
        # ===== OPENAI PROVIDER (default) =====
        else:
            openai_key = await get_user_openai_key(user["_id"])
            if not openai_key:
                raise HTTPException(status_code=400, detail="OpenAI API key not configured. Please add it in Settings.")
            
            if image_provider == "gpt-image-mini":
                quality = "low"
                cost_per_image = 0.005
            elif image_provider == "gpt-image-1.5":
                quality = "medium"
                cost_per_image = 0.04
            else:
                quality = "low"
                cost_per_image = 0.005
            
            request_body = {
                "model": "gpt-image-1",
                "prompt": data.prompt,
                "n": 1,
                "size": "1024x1536",
                "quality": quality
            }
            
            logger.info(f"OpenAI Image Request: {json.dumps(request_body)}")
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/images/generations",
                    headers={
                        "Authorization": f"Bearer {openai_key}",
                        "Content-Type": "application/json"
                    },
                    json=request_body
                )
                
                logger.info(f"OpenAI Response Status: {response.status_code}")
                
                if response.status_code != 200:
                    try:
                        error_data = response.json()
                        error_message = error_data.get("error", {}).get("message", response.text[:500])
                    except Exception:
                        error_message = response.text[:500]
                    logger.error(f"OpenAI API Error: {error_message}")
                    raise HTTPException(status_code=response.status_code, detail=f"OpenAI API error: {error_message}")
                
                result = response.json()
                
                if "data" not in result or len(result["data"]) == 0:
                    raise HTTPException(status_code=500, detail="OpenAI returned no image data")
                
                image_item = result["data"][0]
                
                if "b64_json" in image_item:
                    image_data = base64.b64decode(image_item["b64_json"])
                elif "url" in image_item:
                    img_response = await client.get(image_item["url"])
                    image_data = img_response.content
                else:
                    raise HTTPException(status_code=500, detail="Unknown image format in response")
        
        # ===== SAVE IMAGE (common for all providers) =====
        async with aiofiles.open(image_path, 'wb') as f:
            await f.write(image_data)
        
        logger.info(f"Image saved: {image_path} (provider: {provider_name})")
        
        image_url = f"/api/projects/{data.projectId}/images/{image_filename}"
        
        await db.cost_logs.insert_one({
            "userId": user["_id"],
            "projectId": data.projectId,
            "date": datetime.now(timezone.utc).isoformat(),
            "action": "image",
            "provider": provider_name,
            "cost": cost_per_image,
            "details": f"Image {data.imageIndex}: {data.prompt[:50]}..."
        })
        
        await db.projects.update_one(
            {"_id": ObjectId(data.projectId)},
            {"$inc": {"totalCost": cost_per_image}}
        )
        
        return {
            "success": True,
            "imageUrl": image_url,
            "imagePath": str(image_path),
            "cost": cost_per_image
        }
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Image generation timeout. Please try again.")
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Image generation failed: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

# Upload user images to a project
@api_router.post("/projects/{project_id}/upload-image")
async def upload_project_image(project_id: str, request: Request, file: UploadFile = File(...)):
    """Upload a user's own image to the project"""
    user = await get_current_user(request)
    logger.info(f"[IMAGES] upload-image called by {user.get('email')} for project: {project_id}")
    
    project = await db.projects.find_one({"_id": ObjectId(project_id), "userId": user["_id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Validate file type
    allowed_types = ['image/png', 'image/jpeg', 'image/webp', 'image/jpg']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PNG, JPEG, and WebP images are allowed")
    
    images_dir = PROJECTS_DIR / project_id / "images"
    images_dir.mkdir(parents=True, exist_ok=True)
    
    # Find next available upload index
    existing = list(images_dir.glob("upload_*.png")) + list(images_dir.glob("upload_*.jpg")) + list(images_dir.glob("upload_*.webp"))
    upload_index = len(existing)
    
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else 'png'
    if ext not in ['png', 'jpg', 'jpeg', 'webp']:
        ext = 'png'
    
    filename = f"upload_{upload_index}.{ext}"
    image_path = images_dir / filename
    
    contents = await file.read()
    async with aiofiles.open(image_path, 'wb') as f:
        await f.write(contents)
    
    image_url = f"/api/projects/{project_id}/images/{filename}"
    logger.info(f"User image uploaded: {image_path}")
    
    return {
        "success": True,
        "imageUrl": image_url,
        "imagePath": str(image_path),
        "filename": filename
    }

# Serve project images
@api_router.get("/projects/{project_id}/images/{filename}")
async def get_project_image(project_id: str, filename: str, request: Request):
    """Serve generated project images"""
    user = await get_current_user(request)
    
    # Verify project ownership - handle invalid ObjectId gracefully
    try:
        project = await db.projects.find_one({"_id": ObjectId(project_id), "userId": user["_id"]})
    except Exception:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    image_path = PROJECTS_DIR / project_id / "images" / filename
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    return FileResponse(image_path, media_type="image/png")

# Update project concept endpoint
class UpdateConceptRequest(BaseModel):
    concept: Dict[str, Any]

@api_router.put("/projects/{project_id}/concept")
async def update_project_concept(project_id: str, data: UpdateConceptRequest, request: Request):
    """Update project visual concept"""
    user = await get_current_user(request)
    
    result = await db.projects.update_one(
        {"_id": ObjectId(project_id), "userId": user["_id"]},
        {"$set": {"concept": data.concept}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"success": True}

# Update project images endpoint
class UpdateImagesRequest(BaseModel):
    images: List[Dict[str, Any]]

@api_router.put("/projects/{project_id}/images")
async def update_project_images(project_id: str, data: UpdateImagesRequest, request: Request):
    """Update project images array"""
    user = await get_current_user(request)
    
    result = await db.projects.update_one(
        {"_id": ObjectId(project_id), "userId": user["_id"]},
        {"$set": {"images": data.images}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"success": True}

# ========================================
# FAL.AI VIDEO ANIMATION ENDPOINTS
# ========================================

async def get_user_falai_key(user_id: str) -> Optional[str]:
    """Get user's decrypted FAL.AI API key"""
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return None
    encrypted_key = user.get("apiKeys", {}).get("falai")
    if not encrypted_key:
        return None
    return decrypt_api_key(encrypted_key)

class AnimateImageRequest(BaseModel):
    projectId: str
    imageIndex: int
    imagePath: str
    prompt: Optional[str] = "cinematic smooth camera movement, emotional, high quality"

@api_router.post("/ai/animate-image")
async def animate_image(data: AnimateImageRequest, request: Request):
    """Animate an image using FAL.AI Wan image-to-video"""
    user = await get_current_user(request)
    logger.info(f"[AI] animate-image called by {user.get('email')} for project: {data.projectId}, index: {data.imageIndex}")
    
    # Get FAL.AI key
    fal_key = await get_user_falai_key(user["_id"])
    logger.info(f"[AI] FAL.AI key found: {bool(fal_key)}")
    if not fal_key:
        raise HTTPException(status_code=400, detail="Please save your FAL.AI API key in Settings first.")
    
    # Verify project
    project = await db.projects.find_one({"_id": ObjectId(data.projectId), "userId": user["_id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Read image and convert to base64 data URI
    image_path = Path(data.imagePath)
    if not image_path.exists():
        # Try alternative path
        image_path = PROJECTS_DIR / data.projectId / "images" / f"img_{data.imageIndex}.png"
    
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image file not found")
    
    try:
        async with aiofiles.open(image_path, 'rb') as f:
            image_data = await f.read()
        
        image_b64 = base64.b64encode(image_data).decode('utf-8')
        image_data_uri = f"data:image/png;base64,{image_b64}"
        
        # Submit job to FAL.AI - using fal-ai/wan-i2v (Wan 2.1 image-to-video)
        async with httpx.AsyncClient(timeout=60.0) as client:
            submit_response = await client.post(
                "https://queue.fal.run/fal-ai/wan-i2v",
                headers={
                    "Authorization": f"Key {fal_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "image_url": image_data_uri,
                    "prompt": f"{data.prompt}, cinematic, emotional, smooth camera movement, high quality",
                    "negative_prompt": "blurry, distorted, text, watermark, low quality, static, jerky",
                    "resolution": "480p",
                    "num_frames": 81
                }
            )
            
            if submit_response.status_code != 200:
                error_text = submit_response.text
                logger.error(f"FAL.AI submit error: {error_text}")
                raise HTTPException(status_code=submit_response.status_code, detail=f"FAL.AI error: {error_text[:200]}")
            
            result = submit_response.json()
            request_id = result.get("request_id")
            
            if not request_id:
                raise HTTPException(status_code=500, detail="FAL.AI did not return a request ID")
            
            # Log the full submit response to see what URLs FAL.AI gives us
            logger.info(f"FAL.AI submit response: {json.dumps(result)}")
            
            # Save the URLs FAL.AI gives us - these are the correct ones to use
            response_url = result.get("response_url", "")
            status_url = result.get("status_url", "")
            
            # Store these URLs in the project for later use during polling
            await db.projects.update_one(
                {"_id": ObjectId(data.projectId)},
                {"$set": {
                    f"animation_jobs.{data.imageIndex}": {
                        "request_id": request_id,
                        "response_url": response_url,
                        "status_url": status_url,
                        "submitted_at": datetime.now(timezone.utc).isoformat()
                    }
                }}
            )
            
            return {
                "success": True,
                "requestId": request_id,
                "status": "IN_QUEUE",
                "responseUrl": response_url,
                "statusUrl": status_url
            }
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="FAL.AI request timeout. Please try again.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Video animation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Video animation failed: {str(e)}")

@api_router.get("/ai/animation-status/{request_id}")
async def get_animation_status(request_id: str, project_id: str, image_index: int, request: Request):
    """Poll FAL.AI for animation job status"""
    user = await get_current_user(request)
    
    fal_key = await get_user_falai_key(user["_id"])
    if not fal_key:
        raise HTTPException(status_code=400, detail="FAL.AI API key not configured")
    
    try:
        # First, check if we have saved URLs from the submit response
        project = await db.projects.find_one({"_id": ObjectId(project_id), "userId": user["_id"]})
        saved_job = None
        if project and "animation_jobs" in project:
            saved_job = project["animation_jobs"].get(str(image_index))
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Use saved status_url if available, otherwise construct it
            if saved_job and saved_job.get("status_url"):
                status_check_url = saved_job["status_url"]
                logger.info(f"Using saved status_url: {status_check_url}")
            else:
                # Construct URL - per FAL.AI docs, no subpath for status
                status_check_url = f"https://queue.fal.run/fal-ai/wan-i2v/requests/{request_id}/status"
                logger.info(f"Using constructed status_url: {status_check_url}")
            
            status_response = await client.get(
                status_check_url,
                headers={"Authorization": f"Key {fal_key}"}
            )
            
            # FAL.AI returns 200 for COMPLETED and 202 for IN_QUEUE/IN_PROGRESS
            # Both are valid responses!
            if status_response.status_code not in (200, 202):
                logger.error(f"FAL.AI status check failed: {status_response.status_code} - {status_response.text}")
                return {"status": "ERROR", "error": f"Status check failed: {status_response.status_code}"}
            
            status_data = status_response.json()
            status = status_data.get("status", "UNKNOWN")
            logger.info(f"FAL.AI animation status for {request_id}: HTTP {status_response.status_code}, status={status}")
            
            if status == "COMPLETED":
                logger.info(f"FAL.AI COMPLETED full response: {json.dumps(status_data)}")
                
                result_data = None
                
                # Strategy 1: Use saved response_url from submit
                if saved_job and saved_job.get("response_url"):
                    resp_url = saved_job["response_url"]
                    logger.info(f"Trying saved response_url: {resp_url}")
                    result_response = await client.get(
                        resp_url,
                        headers={"Authorization": f"Key {fal_key}"}
                    )
                    logger.info(f"Saved response_url returned: {result_response.status_code}")
                    if result_response.status_code == 200:
                        result_data = result_response.json()
                
                # Strategy 2: Use response_url from status response
                if not result_data and status_data.get("response_url"):
                    resp_url = status_data["response_url"]
                    logger.info(f"Trying status response_url: {resp_url}")
                    result_response = await client.get(
                        resp_url,
                        headers={"Authorization": f"Key {fal_key}"}
                    )
                    logger.info(f"Status response_url returned: {result_response.status_code}")
                    if result_response.status_code == 200:
                        result_data = result_response.json()
                
                # Strategy 3: Construct URLs manually
                if not result_data:
                    urls_to_try = [
                        f"https://queue.fal.run/fal-ai/wan-i2v/requests/{request_id}",
                    ]
                    for url in urls_to_try:
                        logger.info(f"Trying constructed URL: {url}")
                        result_response = await client.get(
                            url,
                            headers={"Authorization": f"Key {fal_key}"}
                        )
                        logger.info(f"URL {url} returned: {result_response.status_code}")
                        if result_response.status_code == 200:
                            result_data = result_response.json()
                            break
                
                if result_data:
                    logger.info(f"FAL.AI result keys: {list(result_data.keys())}")
                    logger.info(f"FAL.AI full result: {json.dumps(result_data)[:500]}")
                    
                    # Try multiple paths to find the video URL
                    video_url = None
                    if "video" in result_data:
                        v = result_data["video"]
                        video_url = v.get("url") if isinstance(v, dict) else v
                    elif "output" in result_data:
                        output = result_data["output"]
                        if isinstance(output, dict) and "video" in output:
                            v = output["video"]
                            video_url = v.get("url") if isinstance(v, dict) else v
                    elif "data" in result_data:
                        # Some models use data.video
                        d = result_data["data"]
                        if isinstance(d, dict) and "video" in d:
                            v = d["video"]
                            video_url = v.get("url") if isinstance(v, dict) else v
                    
                    logger.info(f"Video URL found: {video_url}")
                    
                    if video_url:
                        # Download and save video
                        video_response = await client.get(video_url)
                        if video_response.status_code == 200:
                            # Save to project directory
                            clips_dir = PROJECTS_DIR / project_id / "clips"
                            clips_dir.mkdir(parents=True, exist_ok=True)
                            clip_path = clips_dir / f"clip_{image_index}.mp4"
                            
                            async with aiofiles.open(clip_path, 'wb') as f:
                                await f.write(video_response.content)
                            
                            # Log cost (estimated 5s at $0.05/s = $0.25)
                            cost = 0.25
                            await db.cost_logs.insert_one({
                                "userId": user["_id"],
                                "projectId": project_id,
                                "date": datetime.now(timezone.utc).isoformat(),
                                "action": "video",
                                "provider": "fal-wan2.6",
                                "cost": cost,
                                "details": f"Clip {image_index} animation"
                            })
                            
                            await db.projects.update_one(
                                {"_id": ObjectId(project_id)},
                                {"$inc": {"totalCost": cost}}
                            )
                            
                            return {
                                "status": "COMPLETED",
                                "clipUrl": f"/api/projects/{project_id}/clips/clip_{image_index}.mp4",
                                "clipPath": str(clip_path),
                                "cost": cost
                            }
                
                return {"status": "COMPLETED", "error": "Failed to download video"}
            
            return {"status": status}
            
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return {"status": "ERROR", "error": str(e)}

# Serve project clips
@api_router.get("/projects/{project_id}/clips/{filename}")
async def get_project_clip(project_id: str, filename: str, request: Request):
    """Serve generated video clips"""
    user = await get_current_user(request)
    
    project = await db.projects.find_one({"_id": ObjectId(project_id), "userId": user["_id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    clip_path = PROJECTS_DIR / project_id / "clips" / filename
    if not clip_path.exists():
        raise HTTPException(status_code=404, detail="Clip not found")
    
    return FileResponse(clip_path, media_type="video/mp4")

# ========================================
# VIDEO ASSEMBLY ENDPOINTS (Background Job)
# ========================================

# In-memory job store for assembly tasks
assembly_jobs: Dict[str, Dict[str, Any]] = {}

MAX_SUBTITLE_LINES = 15

class AssembleVideoRequest(BaseModel):
    projectId: str
    clipOrder: List[int]
    crossfadeDuration: float = 0.5
    addTextOverlay: bool = True
    hookText: Optional[str] = None
    hookTexts: Optional[List[str]] = None
    addSubtitles: bool = False
    lyrics: Optional[str] = None
    libraryClipPaths: Optional[List[str]] = None  # For library mode
    # Text styling options
    textFont: Optional[str] = None
    textSize: Optional[str] = "medium"  # small, medium, large
    textColor: Optional[str] = "white"
    textPosition: Optional[str] = "middle"  # top, middle, bottom
    textStyle: Optional[str] = "shadow"  # shadow, outline, glow, none

async def _run_assembly(job_id: str, data: AssembleVideoRequest, user_id: str, project: dict):
    """Background task: runs FFmpeg assembly and updates job status."""
    job = assembly_jobs[job_id]
    try:
        clips_dir = PROJECTS_DIR / data.projectId / "clips"
        final_dir = PROJECTS_DIR / data.projectId / "final"
        final_dir.mkdir(parents=True, exist_ok=True)

        clip_paths = []
        if data.libraryClipPaths:
            # Library mode: use pre-prepared clip paths
            for p in data.libraryClipPaths:
                if Path(p).exists():
                    clip_paths.append(p)
        else:
            # AI mode: use clip indices
            for idx in data.clipOrder:
                clip_path = clips_dir / f"clip_{idx}.mp4"
                if clip_path.exists():
                    clip_paths.append(str(clip_path))

        if len(clip_paths) < 1:
            job.update({"status": "failed", "error": "No valid clips found on disk"})
            return

        job["message"] = "Reading audio..."

        audio_path_raw = project.get("audioClimaxPath") or project.get("audioOriginalPath")
        audio_path = None
        if audio_path_raw:
            audio_path_obj = Path(audio_path_raw)
            if audio_path_obj.exists():
                audio_path = str(audio_path_obj)
            else:
                clean_path = str(audio_path_raw).replace("/app/projects/", "").replace("\\app\\projects\\", "")
                resolved = PROJECTS_DIR / clean_path
                if resolved.exists():
                    audio_path = str(resolved)

        audio_duration = 0
        if audio_path:
            try:
                probe_cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                            '-of', 'default=noprint_wrappers=1:nokey=1', audio_path]
                probe_result = await asyncio.to_thread(subprocess.run, probe_cmd, capture_output=True, text=True)
                if probe_result.returncode == 0 and probe_result.stdout.strip():
                    audio_duration = float(probe_result.stdout.strip())
            except Exception as e:
                logger.error(f"Failed to get audio duration: {e}")

        clip_durations = []
        for cp in clip_paths:
            try:
                probe_cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                            '-of', 'default=noprint_wrappers=1:nokey=1', cp]
                probe_result = await asyncio.to_thread(subprocess.run, probe_cmd, capture_output=True, text=True)
                if probe_result.returncode == 0 and probe_result.stdout.strip():
                    clip_durations.append(float(probe_result.stdout.strip()))
                else:
                    clip_durations.append(5.0)
            except Exception:
                clip_durations.append(5.0)

        total_clip_duration = sum(clip_durations) if clip_durations else 5.0
        output_path = final_dir / "video.mp4"

        job["message"] = "Concatenating clips..."

        concat_file = final_dir / "concat.txt"
        async with aiofiles.open(concat_file, 'w') as f:
            if audio_duration > 0 and total_clip_duration < audio_duration:
                accumulated = 0
                clip_index = 0
                loop_count = 0
                while accumulated < audio_duration:
                    path = clip_paths[clip_index % len(clip_paths)]
                    dur = clip_durations[clip_index % len(clip_durations)]
                    await f.write(f"file '{path}'\n")
                    accumulated += dur
                    clip_index += 1
                    loop_count += 1
                    if loop_count > 200:
                        break
            else:
                for path in clip_paths:
                    await f.write(f"file '{path}'\n")

        concat_output = final_dir / "concat_temp.mp4"
        concat_cmd = [
            'ffmpeg', '-y', '-f', 'concat', '-safe', '0',
            '-i', str(concat_file), '-c', 'copy', str(concat_output)
        ]
        result = await asyncio.to_thread(subprocess.run, concat_cmd, capture_output=True, text=True)
        if result.returncode != 0:
            logger.error(f"FFmpeg concat error: {result.stderr}")

        job["message"] = "Adding overlays and encoding..."

        # Build filter for text overlay (hooks + subtitles)
        filter_parts = []
        if audio_duration > 0:
            filter_parts.append("fade=t=in:st=0:d=1")
            fade_out_start = max(0, audio_duration - 1)
            filter_parts.append(f"fade=t=out:st={fade_out_start:.1f}:d=1")
        else:
            filter_parts.append("fade=t=in:st=0:d=1")

        hooks_to_show = data.hookTexts or ([data.hookText] if data.hookText else [])
        hooks_to_show = [h for h in hooks_to_show if h and h.strip()]
        effective_duration = audio_duration if audio_duration > 0 else total_clip_duration

        # Resolve text styling
        font_size_map = {"small": 40, "medium": 56, "large": 72}
        txt_fontsize = font_size_map.get(data.textSize, 56)
        txt_color = data.textColor or "white"
        pos_y_map = {"top": "h*0.08", "middle": "h*0.35", "bottom": "h*0.82"}
        txt_y = pos_y_map.get(data.textPosition, "h*0.35")
        # Style params
        style_str = ""
        if data.textStyle == "shadow" or data.textStyle is None:
            style_str = ":shadowcolor=black@0.8:shadowx=4:shadowy=4"
        elif data.textStyle == "outline":
            style_str = ":borderw=3:bordercolor=black@0.9"
        elif data.textStyle == "glow":
            style_str = ":shadowcolor=white@0.5:shadowx=0:shadowy=0:borderw=2:bordercolor=black@0.6"
        # none = no extra style

        if data.addTextOverlay and hooks_to_show and effective_duration > 0:
            # Distribute hooks evenly across the full video timeline
            # If fewer hooks than clips, space them out; if more, cap at clip count
            num_clips = len(clip_durations)
            num_hooks = len(hooks_to_show)

            # Build a time-map of clip boundaries
            clip_starts = []
            acc = 0
            for cd in clip_durations:
                clip_starts.append(acc)
                acc += cd

            if num_hooks >= num_clips:
                # More hooks than clips: assign 1 per clip, drop extras
                for i in range(num_clips):
                    hook = hooks_to_show[i % num_hooks]
                    safe_hook = hook.replace("\\", "\\\\").replace("'", "\u2019").replace(":", "\\:").replace("%", "%%")
                    start_t = clip_starts[i]
                    end_t = start_t + clip_durations[i]
                    filter_parts.append(
                        f"drawtext=text='{safe_hook}'"
                        f":fontsize={txt_fontsize}:fontcolor={txt_color}"
                        f":x=(w-text_w)/2:y={txt_y}"
                        f"{style_str}"
                        f":enable='between(t\\,{start_t:.2f}\\,{end_t:.2f})'"
                    )
            else:
                # Fewer hooks than clips: spread evenly across timeline
                hook_segment = effective_duration / num_hooks
                for i in range(num_hooks):
                    hook = hooks_to_show[i]
                    safe_hook = hook.replace("\\", "\\\\").replace("'", "\u2019").replace(":", "\\:").replace("%", "%%")
                    start_t = i * hook_segment
                    end_t = start_t + hook_segment
                    filter_parts.append(
                        f"drawtext=text='{safe_hook}'"
                        f":fontsize={txt_fontsize}:fontcolor={txt_color}"
                        f":x=(w-text_w)/2:y={txt_y}"
                        f"{style_str}"
                        f":enable='between(t\\,{start_t:.2f}\\,{end_t:.2f})'"
                    )

        # Subtitle overlays — cap at MAX_SUBTITLE_LINES to prevent filter overload
        subtitles_capped = False
        original_subtitle_count = 0
        if data.addSubtitles and data.lyrics and effective_duration > 0:
            raw_lines = [ln.strip() for ln in data.lyrics.split('\n') if ln.strip()]
            subtitle_lines = [ln for ln in raw_lines if not (ln.startswith('[') and ln.endswith(']'))]
            original_subtitle_count = len(subtitle_lines)

            if len(subtitle_lines) > MAX_SUBTITLE_LINES:
                subtitles_capped = True
                # Evenly sample lines to keep timing coherent
                step = len(subtitle_lines) / MAX_SUBTITLE_LINES
                subtitle_lines = [subtitle_lines[int(i * step)] for i in range(MAX_SUBTITLE_LINES)]
                logger.info(f"Capped subtitles from {original_subtitle_count} to {MAX_SUBTITLE_LINES} lines")

            if subtitle_lines:
                sub_segment = effective_duration / len(subtitle_lines)
                for i, line in enumerate(subtitle_lines):
                    safe_line = line.replace("\\", "\\\\").replace("'", "\u2019").replace(":", "\\:").replace("%", "%%")
                    sub_start = i * sub_segment
                    sub_end = sub_start + sub_segment
                    filter_parts.append(
                        f"drawtext=text='{safe_line}'"
                        f":fontsize=36:fontcolor=white@0.95"
                        f":x=(w-text_w)/2:y=h-180"
                        f":shadowcolor=black@0.9:shadowx=3:shadowy=3"
                        f":borderw=2:bordercolor=black@0.5"
                        f":enable='between(t\\,{sub_start:.2f}\\,{sub_end:.2f})'"
                    )

        video_filter = ','.join(filter_parts) if filter_parts else 'null'
        logger.info(f"Video filter ({len(filter_parts)} parts): {video_filter[:300]}...")

        # Use fast preset to speed up encoding
        final_cmd = ['ffmpeg', '-y', '-i', str(concat_output)]
        if audio_path and Path(audio_path).exists():
            final_cmd.extend(['-i', audio_path])
        final_cmd.extend([
            '-filter_complex', f'[0:v]{video_filter}[vout]',
            '-map', '[vout]',
        ])
        if audio_path and Path(audio_path).exists():
            final_cmd.extend(['-map', '1:a', '-c:a', 'aac', '-b:a', '128k', '-shortest'])
        else:
            final_cmd.extend(['-an'])
        final_cmd.extend([
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-r', '30', '-s', '1080x1920',
            str(output_path)
        ])

        logger.info(f"Running FFmpeg final cmd (background job {job_id})...")
        result = await asyncio.to_thread(subprocess.run, final_cmd, capture_output=True, text=True)

        if result.returncode != 0:
            logger.error(f"FFmpeg assembly error: {result.stderr[:1000]}")
            job["message"] = "Primary render failed, trying fallback..."

            fallback_filter = 'fade=t=in:st=0:d=1'
            if audio_duration > 0:
                fallback_filter += f',fade=t=out:st={max(0, audio_duration - 1):.1f}:d=1'
            fallback_cmd = ['ffmpeg', '-y', '-i', str(concat_output)]
            if audio_path and Path(audio_path).exists():
                fallback_cmd.extend(['-i', audio_path])
            fallback_cmd.extend(['-vf', fallback_filter, '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-r', '30', '-s', '1080x1920'])
            if audio_path and Path(audio_path).exists():
                fallback_cmd.extend(['-c:a', 'aac', '-b:a', '128k', '-shortest'])
            else:
                fallback_cmd.extend(['-an'])
            fallback_cmd.append(str(output_path))
            fallback_result = await asyncio.to_thread(subprocess.run, fallback_cmd, capture_output=True, text=True)
            if fallback_result.returncode != 0:
                logger.error(f"Fallback also failed: {fallback_result.stderr[:500]}")
                simple_cmd = ['ffmpeg', '-y', '-i', str(concat_output)]
                if audio_path and Path(audio_path).exists():
                    simple_cmd.extend(['-i', audio_path, '-shortest'])
                simple_cmd.extend(['-c:v', 'libx264', '-c:a', 'aac', str(output_path)])
                await asyncio.to_thread(subprocess.run, simple_cmd, capture_output=True)

        # Clean up temp files
        for tmp in [concat_output, concat_file]:
            if tmp.exists():
                tmp.unlink()

        # Get video info
        duration = 0
        file_size = 0
        if output_path.exists():
            file_size = output_path.stat().st_size / (1024 * 1024)
            probe_cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', str(output_path)]
            probe_result = await asyncio.to_thread(subprocess.run, probe_cmd, capture_output=True, text=True)
            if probe_result.returncode == 0:
                probe_data = json.loads(probe_result.stdout)
                duration = float(probe_data.get('format', {}).get('duration', 0))

        await db.projects.update_one(
            {"_id": ObjectId(data.projectId)},
            {"$set": {"finalVideoPath": str(output_path), "status": "done"}}
        )

        job.update({
            "status": "completed",
            "message": "Video assembled successfully",
            "videoUrl": f"/api/projects/{data.projectId}/final/video.mp4",
            "duration": round(duration, 2),
            "fileSize": round(file_size, 2),
            "subtitlesCapped": subtitles_capped,
            "originalSubtitleCount": original_subtitle_count,
            "usedSubtitleCount": min(original_subtitle_count, MAX_SUBTITLE_LINES) if subtitles_capped else original_subtitle_count,
        })
        logger.info(f"Assembly job {job_id} completed successfully")

    except Exception as e:
        logger.error(f"Assembly job {job_id} failed: {e}")
        job.update({"status": "failed", "error": str(e), "message": f"Assembly failed: {str(e)}"})


@api_router.post("/video/assemble")
async def assemble_video(data: AssembleVideoRequest, request: Request):
    """Start video assembly as a background job. Returns job ID for polling."""
    user = await get_current_user(request)
    logger.info(f"[VIDEO] assemble called by {user.get('email')} for project: {data.projectId}")

    project = await db.projects.find_one({"_id": ObjectId(data.projectId), "userId": user["_id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Quick validation before starting background job
    if data.libraryClipPaths:
        clip_count = sum(1 for p in data.libraryClipPaths if Path(p).exists())
    else:
        clips_dir = PROJECTS_DIR / data.projectId / "clips"
        clip_count = sum(1 for idx in data.clipOrder if (clips_dir / f"clip_{idx}.mp4").exists())
    if clip_count < 1:
        raise HTTPException(status_code=400, detail="Need at least 1 clip to assemble video")

    job_id = str(uuid.uuid4())
    assembly_jobs[job_id] = {
        "status": "processing",
        "message": "Starting assembly...",
        "projectId": data.projectId,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }

    asyncio.create_task(_run_assembly(job_id, data, user["_id"], project))

    return {"jobId": job_id, "status": "processing", "message": "Assembly started"}


@api_router.get("/video/assemble/{job_id}/status")
async def get_assembly_status(job_id: str, request: Request):
    """Poll for assembly job status."""
    await get_current_user(request)

    job = assembly_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Assembly job not found")

    response = {
        "jobId": job_id,
        "status": job["status"],
        "message": job.get("message", ""),
    }

    if job["status"] == "completed":
        response.update({
            "success": True,
            "videoUrl": job.get("videoUrl"),
            "duration": job.get("duration"),
            "fileSize": job.get("fileSize"),
            "subtitlesCapped": job.get("subtitlesCapped", False),
            "originalSubtitleCount": job.get("originalSubtitleCount", 0),
            "usedSubtitleCount": job.get("usedSubtitleCount", 0),
        })
        # Clean up job after successful retrieval
        del assembly_jobs[job_id]
    elif job["status"] == "failed":
        response["error"] = job.get("error", "Unknown error")
        del assembly_jobs[job_id]

    return response

# Serve final video
@api_router.get("/projects/{project_id}/final/{filename}")
async def get_final_video(project_id: str, filename: str, request: Request):
    """Serve final assembled video"""
    user = await get_current_user(request)
    
    project = await db.projects.find_one({"_id": ObjectId(project_id), "userId": user["_id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    video_path = PROJECTS_DIR / project_id / "final" / filename
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    
    return FileResponse(video_path, media_type="video/mp4")

# ========================================
# DOWNLOAD ENDPOINTS
# ========================================

@api_router.get("/projects/{project_id}/download/{platform}")
async def download_video(project_id: str, platform: str, request: Request):
    """Download video for specific platform"""
    user = await get_current_user(request)
    
    project = await db.projects.find_one({"_id": ObjectId(project_id), "userId": user["_id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    final_path = PROJECTS_DIR / project_id / "final" / "video.mp4"
    if not final_path.exists():
        raise HTTPException(status_code=404, detail="Video not assembled yet")
    
    title = project.get("title", "video").replace(" ", "_")[:30]
    filename = f"{platform}_{title}.mp4"
    
    return FileResponse(
        final_path,
        media_type="video/mp4",
        filename=filename,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/projects/{project_id}/download-zip")
async def download_zip(project_id: str, request: Request):
    """Download all project files as ZIP"""
    user = await get_current_user(request)
    
    project = await db.projects.find_one({"_id": ObjectId(project_id), "userId": user["_id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project_dir = PROJECTS_DIR / project_id
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project files not found")
    
    # Create ZIP in memory
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        # Add all files from project directory
        for folder in ['audio', 'images', 'clips', 'final']:
            folder_path = project_dir / folder
            if folder_path.exists():
                for file in folder_path.iterdir():
                    if file.is_file():
                        zip_file.write(file, f"{folder}/{file.name}")
        
        # Add metadata
        metadata = {
            "title": project.get("title"),
            "genre": project.get("genre"),
            "createdAt": project.get("createdAt"),
            "totalCost": project.get("totalCost", 0),
            "concept": project.get("concept", {})
        }
        zip_file.writestr("metadata.json", json.dumps(metadata, indent=2))
    
    zip_buffer.seek(0)
    title = project.get("title", "project").replace(" ", "_")[:30]
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={title}_project.zip"}
    )

# Update project clips endpoint
class UpdateClipsRequest(BaseModel):
    clips: List[Dict[str, Any]]

@api_router.put("/projects/{project_id}/clips")
async def update_project_clips(project_id: str, data: UpdateClipsRequest, request: Request):
    """Update project clips array"""
    user = await get_current_user(request)
    
    result = await db.projects.update_one(
        {"_id": ObjectId(project_id), "userId": user["_id"]},
        {"$set": {"clips": data.clips}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"success": True}

# Include the router in the main app
app.include_router(api_router)

# CORS middleware
cors_origins = os.environ.get("CORS_ORIGINS", "*")
if cors_origins == "*":
    allow_origins = ["*"]
else:
    allow_origins = [origin.strip() for origin in cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event
@app.on_event("startup")
async def startup():
    # Ensure FFmpeg is available (required for video assembly)
    import shutil
    if not shutil.which("ffmpeg"):
        logger.warning("FFmpeg not found, attempting to install...")
        try:
            result = subprocess.run(
                ["apt-get", "install", "-y", "-qq", "ffmpeg"],
                capture_output=True, text=True, timeout=120
            )
            if result.returncode == 0:
                logger.info("FFmpeg installed successfully")
            else:
                logger.error(f"FFmpeg install failed: {result.stderr[:200]}")
        except Exception as e:
            logger.error(f"FFmpeg install error: {e}")
    else:
        logger.info(f"FFmpeg found at: {shutil.which('ffmpeg')}")

    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.projects.create_index([("userId", 1), ("createdAt", -1)])
    await db.cost_logs.create_index([("userId", 1), ("date", -1)])
    await db.templates.create_index("userId")
    logger.info("Database indexes created")

    # Log registered routes for debugging
    routes = []
    for route in app.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            routes.append(f"  {','.join(route.methods)} {route.path}")
    logger.info(f"Registered {len(routes)} API routes:")
    for r in sorted(routes):
        logger.info(r)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()