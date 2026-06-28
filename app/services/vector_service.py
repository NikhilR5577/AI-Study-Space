import os
import asyncio
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_pinecone import PineconeVectorStore

# Keep your exact same embedding model
embedding_model = HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")

# Get the index name from .env (fallback to "second-brain-index" if not set)
index_name = os.getenv("PINECONE_INDEX_NAME", "second-brain-index")

# 👈 THE FIX: Thread-Delegation Wrapper
# We intercept the async search and route it through a stable background thread.
# This completely bypasses the buggy aiohttp session in Pinecone's cloud client,
# preventing the "Session is closed" crash while maintaining full async concurrency.
class SafePineconeVectorStore(PineconeVectorStore):
    async def asimilarity_search(self, query: str, k: int = 4, **kwargs):
        return await asyncio.to_thread(self.similarity_search, query, k=k, **kwargs)

# We are returning the connected Pinecone Cloud Vector Store using our Safe Wrapper.
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