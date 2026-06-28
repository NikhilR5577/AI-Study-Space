from pydantic import BaseModel

class ChatRequest(BaseModel):
    query: str
    session_id: str = "default_student"
    provider: str = "mistral"      
    model: str = "mistral-small"
    user_id: str = "guest"   
    
class URLRequest(BaseModel):
    url: str