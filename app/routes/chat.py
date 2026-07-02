import json
import traceback
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Request 
from fastapi.responses import StreamingResponse
from app.models.schemas import ChatRequest
from app.services.llm_service import get_rag_chain, get_graph_extraction_chain

router = APIRouter()

# --- NO MORE FLAT CHAT HISTORY GET ROUTE ---
# We removed get_chat_history because main.py now handles session retrieval via get_single_session

@router.post("/chat/stream")
async def chat_stream(request: ChatRequest, fastapi_req: Request):
    rag_chain = get_rag_chain(request.provider, request.model)
    db = getattr(fastapi_req.app.state, "db", None)
    
    async def generate():
        sources = set()
        full_response = ""
        
        try:
            # 1. Stream the Chat Response to the User
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
                        if source_name.startswith("http://") or source_name.startswith("https://"):
                            clean_name = source_name
                        else:
                            clean_name = source_name.split("/")[-1].split("\\")[-1]
                        sources.add(clean_name)

            topic = request.query[:50].strip().capitalize()
            
            # 2. Extract Graph & Save DB (Synchronous so frontend gets the graph immediately)
            extracted_nodes = []
            extracted_links = []
            
            try:
                 extraction_chain = get_graph_extraction_chain(request.provider, request.model)
                 combined_text = f"User Question: {request.query}\nAnswer: {full_response}"
                 
                 # Run in to_thread so it doesn't block the event loop, but wait for it
                 graph_result = await asyncio.to_thread(extraction_chain.invoke, {"text": combined_text})
                 
                 extracted_nodes = [node.model_dump() for node in graph_result.nodes]
                 extracted_links = [edge.model_dump() for edge in graph_result.edges]
                 
                 if request.user_id != "guest" and db is not None:
                     new_chat_user = {"role": "user", "content": request.query}
                     new_chat_assistant = {"role": "assistant", "content": full_response}
                     doc_meta_list = [{"fileName": s} for s in sources]

                     await db["sessions"].update_one(
                         {"sessionId": request.session_id},
                         {
                             "$set": { "userEmail": request.user_id, "topic": topic },
                             "$push": {
                                 "chatTranscript": { "$each": [new_chat_user, new_chat_assistant] },
                                 "knowledgeGraph.nodes": { "$each": extracted_nodes },
                                 "knowledgeGraph.edges": { "$each": extracted_links }
                             },
                             "$addToSet": { "documents": { "$each": doc_meta_list } }
                         },
                         upsert=True
                     )
                     print(f"✅ Success: Session {request.session_id} updated with graph.")
            except Exception as e:
                 print(f"⚠️ Graph/DB Save Failed: {e}")

            # 3. Yield the metadata immediately to unblock the frontend UI
            metadata = {
                "type": "metadata",
                "topic": topic,
                "sources": list(sources),
                "model": request.model,
                "provider": request.provider,
                "nodes": extracted_nodes, 
                "links": extracted_links  
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