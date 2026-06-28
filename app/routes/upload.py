import os
from fastapi import APIRouter, File, UploadFile, HTTPException
from app.models.schemas import URLRequest
from app.services.document_service import get_file_path, load_and_split_document
# 👈 THE FIX: Import the new Pinecone save function
from app.services.vector_service import save_to_pinecone
from groq import Groq

router = APIRouter()

# Initialize Groq client (Make sure GROQ_API_KEY is in your environment variables)
groq_client = Groq()

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Added .pptx and .ppt to allowed extensions
    allowed_extensions = {
        ".pdf",
        ".docx",
        ".doc",
        ".pptx",
        ".ppt",
        ".png",
        ".jpg",
        ".jpeg"
    }

    ext = os.path.splitext(file.filename)[1].lower()

    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type"
        )
    
    file_path = get_file_path(file.filename)
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    return {"filename": file.filename, "message": "File saved successfully!"}

@router.post("/process/file/{filename}")
def process_file(filename: str):
    file_path = get_file_path(filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found.")
    
    try:
        _, chunks = load_and_split_document(file_path=file_path)
        # 👈 THE FIX: Save chunks to the cloud
        save_to_pinecone(chunks)
        
        return {
            "filename": filename,
            "total_chunks_processed": len(chunks),
            "message": "Successfully processed, embedded, and saved to Pinecone Cloud DB!"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process/url")
def process_url(request: URLRequest):
    try:
        _, chunks = load_and_split_document(url=request.url)
        # 👈 THE FIX: Save chunks to the cloud
        save_to_pinecone(chunks)
        
        return {
            "source": request.url,
            "total_chunks_processed": len(chunks),
            "message": "Successfully scraped URL, embedded, and saved to Pinecone Cloud DB!"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- NEW: VOICE TRANSCRIBE ENDPOINT ---
@router.post("/voice/transcribe")
async def transcribe_voice(file: UploadFile = File(...)):
    """Receives an audio file from the frontend and uses Groq Whisper to transcribe it."""
    try:
        # Read the audio contents
        audio_data = await file.read()
        
        # Groq's transcription client accepts a tuple: (filename, binary_content)
        transcription = groq_client.audio.transcriptions.create(
            file=(file.filename, audio_data),
            model="whisper-large-v3",
            prompt="Specify terms related to computer science, engineering, or equations if needed.",
            response_format="json"
        )
        
        return {"text": transcription.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")