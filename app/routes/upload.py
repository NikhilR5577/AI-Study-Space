import os
from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from app.models.schemas import URLRequest
from app.services.document_service import get_file_path, load_and_split_document, get_loader
from app.services.vector_service import save_to_pinecone
from app.core.config import UPLOAD_DIR
from groq import Groq

router = APIRouter()

# =============================================
# FILE VIEWING ENDPOINTS (for Document Drawer)
# =============================================

@router.get("/files/text/{filename}")
async def get_file_text(filename: str):
    """Extracts and returns the text content of a file for inline reading."""
    safe_filename = os.path.basename(filename)
    filepath = get_file_path(safe_filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
        
    try:
        loader = get_loader(filepath)
        docs = loader.load()
        full_text = "\n\n".join([doc.page_content for doc in docs])
        return {"filename": safe_filename, "text": full_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract document text: {str(e)}")

@router.get("/files/list")
async def list_uploaded_files():
    """Returns a list of all uploaded files with their metadata."""
    try:
        if not os.path.exists(UPLOAD_DIR):
            return {"files": []}
        
        files = []
        for filename in os.listdir(UPLOAD_DIR):
            filepath = os.path.join(UPLOAD_DIR, filename)
            if os.path.isfile(filepath):
                ext = os.path.splitext(filename)[1].lower()
                files.append({
                    "filename": filename,
                    "size": os.path.getsize(filepath),
                    "type": ext.replace(".", ""),
                    "modified": os.path.getmtime(filepath)
                })
        
        # Sort by most recently modified
        files.sort(key=lambda f: f["modified"], reverse=True)
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files/view/{filename}")
async def view_file(filename: str):
    """Serves an uploaded file for viewing/download."""
    # Sanitize: prevent path traversal
    safe_filename = os.path.basename(filename)
    filepath = os.path.join(UPLOAD_DIR, safe_filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Map extensions to MIME types for inline viewing
    ext = os.path.splitext(safe_filename)[1].lower()
    media_types = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".doc": "application/msword",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".ppt": "application/vnd.ms-powerpoint",
    }
    
    media_type = media_types.get(ext, "application/octet-stream")
    
    # PDFs and images can be viewed inline; others get downloaded
    if ext in [".pdf", ".png", ".jpg", ".jpeg"]:
        return FileResponse(filepath, media_type=media_type, content_disposition_type="inline")
    else:
        return FileResponse(filepath, media_type=media_type, filename=safe_filename, content_disposition_type="attachment")

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