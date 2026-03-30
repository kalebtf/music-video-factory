from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import secrets
from cryptography.fernet import Fernet
import base64
import hashlib

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
                "kling": bool(user["apiKeys"].get("kling"))
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
    provider: str  # openai, falai, kling
    apiKey: str

class ProviderSettings(BaseModel):
    imageProvider: str
    videoProvider: str

class ProjectCreate(BaseModel):
    title: str
    genre: Optional[str] = ""
    lyrics: Optional[str] = ""
    templateId: Optional[str] = None

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
        "apiKeys": {"openai": "", "falai": "", "kling": ""},
        "settings": {"imageProvider": "gpt-image-mini", "videoProvider": "falai-wan"},
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
    
    return {
        "_id": user_id,
        "email": email,
        "apiKeys": {"openai": False, "falai": False, "kling": False},
        "settings": user_doc["settings"],
        "createdAt": user_doc["createdAt"]
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
    
    return {
        "_id": user_id,
        "email": user["email"],
        "apiKeys": {
            "openai": bool(user.get("apiKeys", {}).get("openai")),
            "falai": bool(user.get("apiKeys", {}).get("falai")),
            "kling": bool(user.get("apiKeys", {}).get("kling"))
        },
        "settings": user.get("settings", {}),
        "createdAt": user.get("createdAt", "")
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
    return user

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
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
        return {"message": "Token refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# Settings Endpoints
@api_router.post("/settings/api-key")
async def save_api_key(data: ApiKeyUpdate, request: Request):
    user = await get_current_user(request)
    provider = data.provider.lower()
    if provider not in ["openai", "falai", "kling"]:
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
    full_user = await db.users.find_one({"_id": ObjectId(user["_id"])})
    api_keys = full_user.get("apiKeys", {})
    return {
        "openai": bool(api_keys.get("openai")),
        "falai": bool(api_keys.get("falai")),
        "kling": bool(api_keys.get("kling"))
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

# Project Endpoints
@api_router.get("/projects")
async def get_projects(request: Request):
    user = await get_current_user(request)
    projects = await db.projects.find(
        {"userId": user["_id"]},
        {"_id": 1, "title": 1, "status": 1, "totalCost": 1, "createdAt": 1}
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
        "status": "draft",
        "audioOriginalPath": "",
        "audioClimaxPath": "",
        "climaxStart": 0,
        "climaxEnd": 0,
        "concept": {"theme": "", "mood": "", "palette": [], "prompts": [], "hooks": []},
        "images": [],
        "clips": [],
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
    }).to_list(1000)
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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Startup event
@app.on_event("startup")
async def startup():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.projects.create_index([("userId", 1), ("createdAt", -1)])
    await db.cost_logs.create_index([("userId", 1), ("date", -1)])
    await db.templates.create_index("userId")
    logger.info("Database indexes created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
