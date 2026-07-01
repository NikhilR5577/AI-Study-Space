import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv, find_dotenv

# Pydantic & Typing imports for the new Session Schema
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

# Import the missing analytics and graph_routes modules
from app.routes import health, upload, chat, analytics, graph_routes, examiner

# This will find the .env file even if it's in a parent directory
load_dotenv(find_dotenv()) 

# Get the connection string from the .env file
MONGODB_URL = os.getenv("MONGODB_URL")
DATABASE_NAME = "SecondBrainDB"  # You can name your database anything you like

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager to handle startup and shutdown events.
    """
    # --- STARTUP LOGIC ---
    if MONGODB_URL:
        try:
            # Create the MongoDB client
            app.state.mongodb_client = AsyncIOMotorClient(MONGODB_URL)
            # Access the specific database
            app.state.db = app.state.mongodb_client[DATABASE_NAME]
            print(f"✅ Successfully connected to MongoDB Atlas! Database: {DATABASE_NAME}")
        except Exception as e:
            print(f"❌ Failed to connect to MongoDB: {e}")
    else:
        print("⚠️ MONGODB_URL not found. Please set it in your .env file!")
    
    yield  # This yields control back to FastAPI to run the app
    
    # --- SHUTDOWN LOGIC ---
    if hasattr(app.state, "mongodb_client"):
        app.state.mongodb_client.close()
        print("🛑 Closed MongoDB connection.")

# Initialize FastAPI with the lifespan manager
app = FastAPI(title="AI Study Space Backend", lifespan=lifespan)

# Add CORS Middleware
# Expanded origins to support common local development ports (Vite/CRA)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8000", "https://ai-study-space-2.vercel.app"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all modular routers
app.include_router(health.router)
app.include_router(upload.router)
app.include_router(chat.router)
app.include_router(analytics.router)
app.include_router(graph_routes.router)
app.include_router(examiner.router)

# =====================================================================
# MASTER SESSION SCHEMA (MODELS)
# =====================================================================

class DocumentMeta(BaseModel):
    fileName: str
    fileUrl: Optional[str] = None
    extractedText: Optional[str] = None

class ChatMessage(BaseModel):
    role: str
    content: str

class GraphData(BaseModel):
    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []

class StudySession(BaseModel):
    sessionId: str
    userEmail: str
    topic: str = "New Study Session"
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    durationMinutes: int = 0
    documents: List[DocumentMeta] = []
    chatTranscript: List[ChatMessage] = []
    knowledgeGraph: GraphData = GraphData()

# =====================================================================
# NEW TWO-TIER SESSION API ENDPOINTS
# =====================================================================

# --- TIER 1: SHALLOW FETCH (For Sidebar & Analytics) ---
@app.get("/api/sessions/metadata/{user_email}")
async def get_session_metadata(user_email: str, request: Request):
    try:
        db = request.app.state.db
        # Projection: We ONLY want these fields to keep the payload tiny
        cursor = db.sessions.find(
            {"userEmail": user_email},
            {"_id": 0, "sessionId": 1, "topic": 1, "createdAt": 1, "durationMinutes": 1, "documents": 1}
        ).sort("createdAt", -1) 
        
        metadata = await cursor.to_list(length=100)
        return {"status": "success", "data": metadata}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- TIER 2: DEEP FETCH (For Active Chat, Graph & Docs) ---
@app.get("/api/sessions/{session_id}")
async def get_single_session(session_id: str, user_email: str, request: Request):
    try:
        db = request.app.state.db
        session_data = await db.sessions.find_one(
            {"sessionId": session_id, "userEmail": user_email},
            {"_id": 0} 
        )
        if not session_data:
            raise HTTPException(status_code=404, detail="Session not found")
            
        return {"status": "success", "data": session_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- AUTO-SAVE (Upsert Endpoint) ---
@app.post("/api/sessions/save")
async def save_session(session: StudySession, request: Request):
    try:
        db = request.app.state.db
        
        # 💡 THE FIX: Strip the auto-generated createdAt date from the update payload
        session_dict = session.model_dump()
        session_dict.pop("createdAt", None) # Remove it so $set doesn't overwrite it!
        
        await db.sessions.update_one(
            {"sessionId": session.sessionId, "userEmail": session.userEmail},
            {
                "$set": session_dict, # Update everything else (chats, nodes, edges)
                "$setOnInsert": {"createdAt": datetime.now(timezone.utc)} # ONLY set the date if it's a brand new session
            },
            upsert=True
        )
        return {"status": "success", "message": "Session saved safely"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))