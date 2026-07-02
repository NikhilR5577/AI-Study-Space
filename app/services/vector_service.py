import os
import asyncio
# 👈 UPGRADED: Using Google's free, fast embedding API instead of HuggingFace's slow endpoint
from langchain_huggingface import HuggingFaceEndpointEmbeddings
from langchain_pinecone import PineconeVectorStore

# 👈 UPGRADED: Using HuggingFaceEndpointEmbeddings with all-MiniLM-L6-v2 
# This model is fast, serverless, and produces the required 384-dimensional vectors.
embedding_model = HuggingFaceEndpointEmbeddings(
    model="sentence-transformers/all-MiniLM-L6-v2",
    task="feature-extraction",
    huggingfacehub_api_token=os.getenv("HUGGINGFACEHUB_API_TOKEN")
)

# Get the index name from .env (fallback to "second-brain-index" if not set)
index_name = os.getenv("PINECONE_INDEX_NAME", "second-brain-index")

# Thread-Delegation Wrapper
# We intercept the async search and route it through a stable background thread.
# This completely bypasses the buggy aiohttp session in Pinecone's cloud client,
# preventing the "Session is closed" crash while maintaining full async concurrency.
class SafePineconeVectorStore(PineconeVectorStore):
    async def asimilarity_search(self, query: str, k: int = 4, **kwargs):
        return await asyncio.to_thread(self.similarity_search, query, k=k, **kwargs)

# Returns the connected Pinecone Cloud Vector Store using our Safe Wrapper.
def get_vectorstore():
    return SafePineconeVectorStore(
        index_name=index_name,
        embedding=embedding_model
    )
    
# Embeds and saves document chunks to the cloud database.
def save_to_pinecone(chunks):
    return SafePineconeVectorStore.from_documents(
        documents=chunks,
        embedding=embedding_model,
        index_name=index_name
    )