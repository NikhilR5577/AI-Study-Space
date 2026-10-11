import os
import asyncio
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_pinecone import PineconeVectorStore

# Ultra-lightweight ONNX embeddings (all-MiniLM-L6-v2, 384 dimensions)
# Uses ONNX Runtime (C++) to stay safely below Render's 512MB RAM limit without OOM crashes!
embedding_model = FastEmbedEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
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