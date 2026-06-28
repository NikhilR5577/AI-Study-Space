import json
import traceback
from datetime import datetime, timezone
from fastapi import APIRouter, Request 
from fastapi.responses import StreamingResponse
from app.models.schemas import ChatRequest
from app.services.llm_service import get_rag_chain

router = APIRouter()

@router.get("/api/chat/history/{user_email}")
async def get_chat_history(user_email: str, request: Request):
    # --- GUARD CLAUSE ADDED HERE ---
    # Immediately reject guests or broken frontend states
    if not user_email or user_email.lower() in ["guest", "undefined", "null"]:
        return {"history": []}

    db = getattr(request.app.state, "db", None)
    if db is None:
        return {"history": []}
    
    cursor = db["chat_history"].find({"user_email": user_email}).sort("timestamp", 1)
    chats = await cursor.to_list(length=1000)
    
    formatted_history = []
    for chat in chats:
        formatted_history.append({"id": str(chat.get("_id", "u")), "role": "user", "content": chat["query"]})
        formatted_history.append({"id": str(chat.get("_id", "a")) + "_resp", "role": "assistant", "content": chat["response"]})
        
    return {"history": formatted_history}

@router.post("/chat/stream")
async def chat_stream(request: ChatRequest, fastapi_req: Request):
    rag_chain = get_rag_chain(request.provider, request.model)
    db = getattr(fastapi_req.app.state, "db", None)
    
    async def generate():
        sources = set()
        full_response = ""
        
        try:
            async for chunk in rag_chain.astream(
                {"input": request.query},
                config={"configurable": {"session_id": request.session_id}}
            ):
                if "answer" in chunk:
                    text_chunk = chunk["answer"]
                    full_response += text_chunk
                    yield json.dumps({"type": "text", "content": text_chunk}) + "\n"
                
                if "context" in chunk:
                    for doc in chunk["context"]:
                        source_name = doc.metadata.get("source", "Unknown Document")
                        
                        # 👈 THE FIX: URL vs. File Path routing
                        # If it is a web link, preserve it so the frontend UI knows it's a URL.
                        if source_name.startswith("http://") or source_name.startswith("https://"):
                            clean_name = source_name
                        else:
                            # If it is a local file, clean the long OS path down to just the filename.
                            clean_name = source_name.split("/")[-1].split("\\")[-1]
                            
                        sources.add(clean_name)

            topic = request.query[:50].strip().capitalize()
            
            # --- DEBUGGING LOGIC ---
            print(f"DEBUG: Attempting save. UserID provided: '{request.user_id}'")
            print(f"DEBUG: Database exists: {db is not None}")

            if request.user_id != "guest" and db is not None:
                try:
                    chat_doc = {
                        "user_email": request.user_id,
                        "session_id": request.session_id,
                        "query": request.query,
                        "response": full_response,
                        "topic": topic,
                        "sources": list(sources),
                        "timestamp": datetime.now(timezone.utc)
                    }
                    await db["chat_history"].insert_one(chat_doc)
                    print(f"✅ Success: Saved chat for {request.user_id}")
                except Exception as db_err:
                    print(f"❌ Critical MongoDB Insert Error: {db_err}")
            else:
                print(f"DEBUG: Save skipped. Condition check failed (user_id='{request.user_id}', db_exists={db is not None})")

            # Yield metadata
            metadata = {
                "type": "metadata",
                "topic": topic,
                "sources": list(sources),
                "model": request.model,
                "provider": request.provider,
                "nodes": [{"id": topic, "name": topic, "val": 8}],
                "links": []
            }
            yield json.dumps(metadata) + "\n"

        except Exception as e:
            print("========== FULL TRACEBACK ==========")
            traceback.print_exc()
            print("====================================")
            yield json.dumps({
                "type": "error",
                "content": f"\n\n⚠️ Error during generation: {str(e)}"}) + "\n"    

    return StreamingResponse(generate(), media_type="application/x-ndjson")