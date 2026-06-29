import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv, find_dotenv

# Import the missing analytics and graph_routes modules
from app.routes import health, upload, chat, analytics, graph_routes

# This will find the .env file even if it's in a parent directory
load_dotenv(find_dotenv()) 

# Add this line immediately after
print(f"DEBUG: MongoDB URL loaded: {'Yes' if os.getenv('MONGODB_URL') else 'No'}")

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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all modular routers
app.include_router(health.router)
app.include_router(upload.router)
app.include_router(chat.router)
# Tell FastAPI that these routes actually exist!
app.include_router(analytics.router)
app.include_router(graph_routes.router)