import asyncio
from langchain_mistralai import ChatMistralAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate 
from langchain_core.output_parsers import StrOutputParser
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_classic.chains import create_history_aware_retriever, create_retrieval_chain
from app.services.vector_service import get_vectorstore

# --- NEW MEMORY & RUNNABLE IMPORTS ---
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.runnables import RunnableLambda 

# In-memory store for chat histories
store = {}

def get_session_history(session_id: str) -> BaseChatMessageHistory:
    """Fetches or creates a new chat history for a given session."""
    if session_id not in store:
        store[session_id] = ChatMessageHistory()
    return store[session_id]

def get_llm(provider: str, model_name: str):
    """
    Enterprise Factory function: Routes by Provider first, then by Model.
    """
    provider_lower = provider.lower()
    model_lower = model_name.lower()
    
    if provider_lower == "google" or provider_lower == "gemini":
        if model_lower == "gemini-pro":
            return ChatGoogleGenerativeAI(model="gemini-2.5-pro", temperature=0.3)
        return ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.3)
        
    elif provider_lower == "groq":
        if model_lower == "llama-3.3":
            return ChatGroq(model="llama-3.3-70b-versatile", temperature=0.3)
        elif model_lower == "gpt-oss":
            return ChatGroq(model="openai/gpt-oss-120b", temperature=0.3)
        elif model_lower == "qwen3":
            return ChatGroq(model="qwen/qwen3-32b", temperature=0.3)
        return ChatGroq(model="llama-3.3-70b-versatile", temperature=0.3)
        
    elif provider_lower == "mistral":
        return ChatMistralAI(model="mistral-small-2506", temperature=0.3)
        
    else:
        return ChatMistralAI(model="mistral-small-2506", temperature=0.3)

# 👈 CUSTOM ASYNC MULTI-QUERY FUNCTION
async def get_unique_docs(query: str):
    """
    Takes the standalone question, generates 3 variations, 
    searches Pinecone concurrently, and returns deduplicated documents.
    """
    vectorstore = get_vectorstore()
    llm = get_llm("mistral", "mistral-small") 
    
    query_gen_prompt = ChatPromptTemplate.from_template(
        "You are a helpful study assistant. Generate 3 diverse variations of this student question "
        "to search for related study materials: {question}\n"
        "Output ONLY the 3 queries separated by newlines."
    )
    
    query_chain = query_gen_prompt | llm | StrOutputParser()
    variations = await query_chain.ainvoke({"question": query})
    queries = [q.strip() for q in variations.split('\n') if q.strip()]
    
    # Always ensure the original query is included in the search
    if query not in queries:
        queries.append(query)

    # Parallel Search (asyncio.gather natively prevents 'Session is closed')
    tasks = [vectorstore.asimilarity_search(q, k=3) for q in queries]
    results = await asyncio.gather(*tasks)
    
    # Deduplicate documents based on their actual text content
    unique_docs = {}
    for doc_list in results:
        for doc in doc_list:
            unique_docs[doc.page_content] = doc
            
    return list(unique_docs.values())


def build_rag_chain(provider: str, model_name: str):
    llm = get_llm(provider, model_name)
    
    # 👈 THE FIX: A dummy synchronous lambda satisfies the strict type-checker.
    custom_retriever = RunnableLambda(func=lambda x: [], afunc=get_unique_docs)
    
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
    
    history_aware_retriever = create_history_aware_retriever(
        llm, custom_retriever, contextualize_q_prompt
    )
    
    system_prompt = (
        "You are an expert AI study companion. Your primary directive is to maintain absolute trust with the user.\n"
        "First, analyze the provided Context to answer the user's question.\n"
        "If the Context contains the answer, answer the question directly and confidently using ONLY that information.\n"
        "If the Context DOES NOT contain the answer, you MUST begin your response with exactly this phrase: "
        "'I couldn't find this in your uploaded study materials, but based on my general knowledge: ' "
        "and then proceed to answer the question accurately.\n\n"
        "Context:\n{context}"
    )
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("placeholder", "{chat_history}"),
        ("human", "{input}"),
    ])
    
    question_answer_chain = create_stuff_documents_chain(llm, prompt)
    
    return create_retrieval_chain(history_aware_retriever, question_answer_chain)


def get_rag_chain(provider: str, model_name: str):
    base_chain = build_rag_chain(provider, model_name)
    
    history_chain = RunnableWithMessageHistory(
        base_chain,
        get_session_history,
        input_messages_key="input",
        history_messages_key="chat_history",
        output_messages_key="answer",
    )
    
    return history_chain