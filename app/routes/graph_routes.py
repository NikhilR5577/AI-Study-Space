from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from typing import List
from langchain_core.prompts import ChatPromptTemplate
# Import your LLM initializer (adjust this import based on your setup)
from app.services.llm_service import get_llm 

router = APIRouter()

# 1. Define the exact JSON structure we want from the LLM
class GraphNode(BaseModel):
    id: str = Field(description="Short unique ID (e.g., 'TCP', 'OSPF')")
    name: str = Field(description="Full readable name (e.g., 'Transmission Control Protocol')")
    val: int = Field(description="Importance weight (usually 5 to 10)")
    color: str = Field(description="Hex color code based on topic (e.g., networking is #0ea5e9)")

class GraphLink(BaseModel):
    source: str = Field(description="ID of the source node")
    target: str = Field(description="ID of the target node")

class GraphExtraction(BaseModel):
    nodes: List[GraphNode]
    links: List[GraphLink]

# 2. Define Request payloads
class ExtractRequest(BaseModel):
    text: str
    provider: str
    model: str

class GraphSaveRequest(BaseModel):
    nodes: list
    links: list

# 3. The Extraction Endpoint (UNTOUCHED)
@router.post("/api/graph/extract")
async def extract_graph_entities(request: ExtractRequest):
    llm = get_llm(request.provider, request.model)
    
    # Bind the Pydantic schema to force JSON output
    structured_llm = llm.with_structured_output(GraphExtraction)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert knowledge graph extractor. 
        Analyze the user's study text. Extract 2 to 5 key educational concepts as nodes, and map the relationships between them as links.
        Make the colors match the subject category."""),
        ("human", "{text}")
    ])
    
    chain = prompt | structured_llm
    
    try:
        # Run the extraction
        result = await chain.ainvoke({"text": request.text})
        return result
    except Exception as e:
        return {"nodes": [], "links": []}

# --- NEW: SECURE DATABASE FETCH/SAVE ENDPOINTS ---

@router.get("/api/graph/{user_email}")
async def get_user_graph(user_email: str, request: Request):
    if not user_email or user_email.lower() in ["guest", "undefined", "null"]:
        return {"nodes": [], "links": []}
        
    db = getattr(request.app.state, "db", None)
    if db is None:
        return {"nodes": [], "links": []}
        
    graph_data = await db["user_graphs"].find_one({"user_email": user_email})
    if graph_data:
        return {"nodes": graph_data.get("nodes", []), "links": graph_data.get("links", [])}
    return {"nodes": [], "links": []}

@router.post("/api/graph/{user_email}")
async def save_user_graph(user_email: str, payload: GraphSaveRequest, request: Request):
    if not user_email or user_email.lower() in ["guest", "undefined", "null"]:
        return {"status": "ignored"}
        
    db = getattr(request.app.state, "db", None)
    if db is not None:
        await db["user_graphs"].update_one(
            {"user_email": user_email},
            {"$set": {"nodes": payload.nodes, "links": payload.links}},
            upsert=True
        )
    return {"status": "success"}