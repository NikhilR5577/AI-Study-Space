from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter()

class AnalyticsSaveRequest(BaseModel):
    studyData: list
    studyHistory: list
    currentStreak: int
    sessionsCompleted: int

@router.get("/api/analytics/{user_email}")
async def get_analytics(user_email: str, request: Request):
    # Guard Clause to prevent Guest leaks
    if not user_email or user_email.lower() in ["guest", "undefined", "null"]:
        return None 
        
    db = getattr(request.app.state, "db", None)
    if db is None:
        return None
        
    data = await db["user_analytics"].find_one({"user_email": user_email})
    if data:
        data.pop("_id", None) # Remove MongoDB specific ID before sending to frontend
        return data
    return None

@router.post("/api/analytics/{user_email}")
async def save_analytics(user_email: str, payload: AnalyticsSaveRequest, request: Request):
    if not user_email or user_email.lower() in ["guest", "undefined", "null"]:
        return {"status": "ignored"}
        
    db = getattr(request.app.state, "db", None)
    if db is not None:
        await db["user_analytics"].update_one(
            {"user_email": user_email},
            {"$set": payload.model_dump()},
            upsert=True
        )
    return {"status": "success"}