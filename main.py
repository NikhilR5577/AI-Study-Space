import os 

from fastapi import FastAPI, File, UploadFile
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

from dotenv import load_dotenv
from pydantic import BaseModel
from langchain_mistralai import ChatMistralAI
from langchain_core.prompts import ChatPromptTemplate 
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_classic.retrievers.multi_query import MultiQueryRetriever
from langchain_core.messages import HumanMessage, AIMessage
from langchain_classic.chains import create_history_aware_retriever

load_dotenv()

app = FastAPI()

UPLOAD_DIR = "uploaded_files"
CHROMA_DB_DIR = "chroma_db"
os.makedirs(UPLOAD_DIR, exist_ok= True)
os.makedirs(CHROMA_DB_DIR, exist_ok= True)

embedding_model = HuggingFaceEmbeddings(model_name ="BAAI/bge-small-en-v1.5")

vectorstore = Chroma(
    persist_directory= CHROMA_DB_DIR,
    embedding_function= embedding_model
)

llm = ChatMistralAI(model = "mistral-small-2506")

base_retriever = vectorstore.as_retriever(search_kwargs={"k":3})

retriever = MultiQueryRetriever.from_llm(
    retriever= base_retriever,
    llm=llm
)

# Contextualize question prompt
contextualize_q_system_prompt = (
    "Given a chat history and the latest user question "
    "which might reference context in the chat history, "
    "formulate a standalone question which can be understood "
    "without the chat history. Do NOT answer the question, "
    "just reformulate it if needed and otherwise return it as is."
)

contextualize_q_prompt = ChatPromptTemplate.from_messages([
    ("system", contextualize_q_system_prompt),
    ("placeholder", "{chat_history}"),
    ("human", "{input}"),
])

# History-aware retriever
history_aware_retriever = create_history_aware_retriever(
    llm,
    retriever,
    contextualize_q_prompt
)

# Main system prompt
system_prompt = (
    "You are an intelligent AI Study Space assistant. "
    "Use the following pieces of retrieved context to answer the user's question. "
    "If you don't know the answer or the context doesn't contain it, explicitly say so. "
    "Keep the answer concise and strictly based on the context.\n\n"
    "Context:\n{context}"
)

prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("placeholder", "{chat_history}"),
    ("human", "{input}"),
])

# Question-answer chain
question_answer_chain = create_stuff_documents_chain(
    llm,
    prompt
)

# Final RAG chain
rag_chain = create_retrieval_chain(
    history_aware_retriever,
    question_answer_chain
)

@app.get("/health")
def health_check():
    return {"status":"ok","message": "AI study space Backend is running !"}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    
    # creating the exact file path
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    
    # open the new file and write the uploaded data into it
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
        
    return {"filename": file.filename, "message": "File saved successfully !"}

# Phase 2 - Read the PDF

@app.get("/read/{filename}")
def read_pdf(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    # checking the file 
    if not os.path.exists(file_path):
        return {"error" : "File not found. Did you upload it ?"}
    
    # load the documents 
    loader = PyPDFLoader(file_path)
    pages = loader.load()
    
    # is doc is empty ?
    if len(pages) == 0:
        return {"error":"The PDF is empty or unreadable."}
    
    preview_text = ""
    page_found = 0
    
    for i, page in enumerate(pages[:20]):
        preview_text = page.page_content
        page_found = i + 1
        
    if not preview_text:
        preview_text = "Could not find any readable text. This might be a scanned document (images only)"
    
    # extract text 
    return {
        "filename": filename,
        "total_pages": len(pages),
        "text_found_on_page": page_found,
        "preview": preview_text[:500]
    }
    
# Chunking

@app.get("/chunk/{filename}")
def chunk_pdf(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    if not os.path.exists(file_path):
        return {"error": "File not found."}
    
    loader = PyPDFLoader(file_path)
    pages = loader.load()
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size = 1000,
        chunk_overlap = 200,
        length_function = len
    )
    
    chunks = text_splitter.split_documents(pages)
    
    return{
        "filename": filename,
        "total_pages_original": len(pages),
        "total_chunks_created": len(chunks),
        "chunks_1_preview": chunks[0].page_content[:300]
    }
    
@app.post("/process/{filename}")
def process_pdf(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    if not os.path.exists(file_path):
        return {"error":"File not found."}
    
    # loading the pdf
    loader = PyPDFLoader(file_path)
    pages = loader.load()
    
    # chunk the text 
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size = 1000,
        chunk_overlap = 200,
        length_function = len
    )
    chunks = text_splitter.split_documents(pages)
    
    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embedding_model,
        persist_directory=CHROMA_DB_DIR
    )
    
    return {
        "filename": filename,
        "total_chunks_processed": len(chunks),
        "message": "Successfully chunked, embedded with BAAI, and saved to Chroma DB!"
    }
    
class ChatRequest(BaseModel):
    query: str
    session_id: str = "default_student"
    
sessions_db = {}
    
@app.post("/chat")
def chat_with_pdf(request: ChatRequest):
    
    # retrive or initialize this session's chat history
    if request.session_id not in sessions_db:
        sessions_db[request.session_id] = []
        
    chat_history = sessions_db[request.session_id]
    
    response = rag_chain.invoke({"input": request.query,"chat_history": chat_history})
    
    chat_history.append(HumanMessage(content=request.query))
    chat_history.append(AIMessage(content=response["answer"]))
    
    return {"answer": response["answer"],
            "sources":[doc.metadata for doc in response["context"]
            ]}