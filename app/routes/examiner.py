import os
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from langchain_core.prompts import ChatPromptTemplate
from app.services.llm_service import get_llm
from app.services.document_service import get_file_path, get_loader

router = APIRouter()

# =====================================================================
# SCHEMAS FOR STRUCTURED QUIZ GENERATION
# =====================================================================

class QuizQuestion(BaseModel):
    id: int = Field(description="Index of the question starting from 1")
    question: str = Field(description="The multiple choice question text")
    options: List[str] = Field(description="List of exactly 4 options")
    correct_answer: str = Field(description="The exact text of the correct option matching one of the options")
    explanation: str = Field(description="A brief explanation of why this option is correct")

class Quiz(BaseModel):
    questions: List[QuizQuestion]

class GenerateQuizRequest(BaseModel):
    session_id: str
    user_email: str
    provider: str
    model: str

class RecordQuizResultRequest(BaseModel):
    session_id: str
    user_email: str
    score: int
    total_questions: int
    incorrect_questions: List[dict] # Keeps list of {question, options, correct_answer, explanation, user_answer}

# =====================================================================
# API ENDPOINTS
# =====================================================================

@router.post("/api/exam/generate")
async def generate_quiz(payload: GenerateQuizRequest, request: Request):
    """Generates a 5-question multiple choice quiz based on session documents."""
    db = getattr(request.app.state, "db", None)
    if db is None:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    # 1. Fetch the session details to get document names
    session = await db.sessions.find_one({"sessionId": payload.session_id, "userEmail": payload.user_email})
    if not session:
        raise HTTPException(status_code=404, detail="Study session not found")
        
    documents = session.get("documents", [])
    if not documents:
        raise HTTPException(status_code=400, detail="No documents uploaded to this study session to generate a quiz from.")
        
    # 2. Load text from all session files
    combined_text = ""
    for doc in documents:
        filename = doc.get("fileName")
        if not filename:
            continue
            
        filepath = get_file_path(filename)
        if not os.path.exists(filepath):
            continue
            
        try:
            loader = get_loader(filepath)
            pages = loader.load()
            doc_text = "\n".join([page.page_content for page in pages])
            combined_text += f"\n\n--- Document: {filename} ---\n{doc_text}"
        except Exception as e:
            print(f"Error loading document text for quiz: {e}")
            
    # Fallback to general topic if no local files were loaded
    if not combined_text.strip():
        combined_text = f"Study Topic: {session.get('topic', 'General Study')}"
        
    # Limit text length to avoid context window explosion (approx 20,000 characters)
    max_char_limit = 20000
    if len(combined_text) > max_char_limit:
        combined_text = combined_text[:max_char_limit] + "\n...[truncated for length]..."

    # 3. Call LLM with structured output to generate the Quiz
    llm = get_llm(payload.provider, payload.model)
    structured_llm = llm.with_structured_output(Quiz)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an elite academic examiner. 
        Analyze the provided study context text and generate a 5-question multiple choice quiz.
        Each question must have exactly 4 choices. Make the questions challenging but fair.
        Ensure the correct_answer matches one of the options exactly.
        Provide a concise explanation for the correct answer."""),
        ("human", "Generate a quiz for this study content:\n\n{text}")
    ])
    
    chain = prompt | structured_llm
    
    try:
        quiz_data = await chain.ainvoke({"text": combined_text})
        return quiz_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")


@router.post("/api/exam/record")
async def record_quiz_result(payload: RecordQuizResultRequest, request: Request):
    """Saves quiz results and pushes wrong answers to the Spaced Repetition IDK Tracker."""
    db = getattr(request.app.state, "db", None)
    if db is None:
        return {"status": "ignored"}
        
    # 1. Update session completed count/hours or log in study history if needed
    # 2. Add incorrect questions to "idk_tracker" database collection
    if payload.incorrect_questions:
        for item in payload.incorrect_questions:
            # Upsert into idk_tracker based on question text to avoid duplicates
            await db["idk_tracker"].update_one(
                {"user_email": payload.user_email, "question": item.get("question")},
                {
                    "$set": {
                        "options": item.get("options"),
                        "correct_answer": item.get("correct_answer"),
                        "explanation": item.get("explanation"),
                        "user_answer": item.get("user_answer"),
                        "session_id": payload.session_id,
                        "last_tested": datetime.utcnow(),
                        "box": 1 # Spaced Repetition Leitner Box 1
                    }
                },
                upsert=True
            )
            
    return {"status": "success", "message": "Quiz logged and IDK Tracker updated"}


@router.get("/api/exam/idk/{user_email}")
async def get_idk_questions(user_email: str, request: Request):
    """Retrieves all active incorrect/skipped questions for spaced repetition practice."""
    if not user_email or user_email.lower() in ["guest", "undefined", "null"]:
        return {"questions": []}
        
    db = getattr(request.app.state, "db", None)
    if db is None:
        return {"questions": []}
        
    cursor = db["idk_tracker"].find({"user_email": user_email})
    questions = await cursor.to_list(length=100)
    
    # Map _id object to string
    for q in questions:
        q["id"] = str(q.pop("_id"))
        
    return {"questions": questions}


class ResolveQuestionRequest(BaseModel):
    user_email: str
    question: str

@router.post("/api/exam/idk/resolve")
async def resolve_idk_question(payload: ResolveQuestionRequest, request: Request):
    """Deletes a question from the IDK tracker once the user gets it correct on review."""
    db = getattr(request.app.state, "db", None)
    if db is None:
        return {"status": "ignored"}
        
    await db["idk_tracker"].delete_one({
        "user_email": payload.user_email,
        "question": payload.question
    })
    return {"status": "success", "message": "Question resolved and removed from IDK Tracker"}
