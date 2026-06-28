import streamlit as st
import requests
import uuid

# --- 1. Page Configuration ---
st.set_page_config(page_title="AI Study Space", page_icon="📚", layout="centered")
st.title("📚 AI Study Space")
st.caption("Your intelligent engineering companion. Upload textbooks and ask anything.")

# --- 2. Backend Connection ---
BACKEND_URL = "http://127.0.0.1:8000"

# Initialize a unique session ID and message history for the user
if "session_id" not in st.session_state:
    st.session_state.session_id = str(uuid.uuid4()) # Creates a unique ID for memory
if "messages" not in st.session_state:
    st.session_state.messages = []

# --- 3. Sidebar: The Document Library ---
with st.sidebar:
    st.header("📂 Knowledge Base")
    st.write("Upload your PDFs here. (URL and Website processing coming soon!)")
    
    uploaded_files = st.file_uploader(
        "Upload Textbooks & Slides", 
        type=["pdf"], 
        accept_multiple_files=True
    )
    
    if uploaded_files:
        if st.button(f"🧠 Process {len(uploaded_files)} Documents"):
            progress_bar = st.progress(0)
            status_text = st.empty()
            
            for i, file in enumerate(uploaded_files):
                status_text.text(f"Uploading: {file.name}...")
                
                # Step A: Send to FastAPI /upload
                files_payload = {"file": (file.name, file.getvalue(), "application/pdf")}
                upload_resp = requests.post(f"{BACKEND_URL}/upload", files=files_payload)
                
                if upload_resp.status_code == 200:
                    status_text.text(f"Vectorizing: {file.name}... (Extracting chunks)")
                    
                    # Step B: Trigger the Chunking & Chroma DB Injection
                    proc_resp = requests.post(f"{BACKEND_URL}/process/{file.name}")
                    
                    if proc_resp.status_code != 200:
                        st.error(f"Error embedding {file.name}")
                else:
                    st.error(f"Failed to upload {file.name}")
                
                progress_bar.progress((i + 1) / len(uploaded_files))
                
            status_text.text("✅ All documents locked into AI memory!")
            st.success("Knowledge base updated. Ready to chat.")

# --- 4. Main Chat Interface ---

# Display all past messages
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# User Input Box
if user_query := st.chat_input("Ask about your books, say hello, or ask for C++ code..."):
    
    # Instantly show the user's message
    with st.chat_message("user"):
        st.markdown(user_query)
    st.session_state.messages.append({"role": "user", "content": user_query})
    
    # Call the Backend Router
    with st.chat_message("assistant"):
        with st.spinner("Analyzing intent and searching memory..."):
            payload = {
                "query": user_query,
                "session_id": st.session_state.session_id
            }
            try:
                response = requests.post(f"{BACKEND_URL}/chat", json=payload)
                if response.status_code == 200:
                    data = response.json()
                    answer = data.get("answer", "Error: No answer returned.")
                    route_used = data.get("routed_through", "UNKNOWN")
                    
                    st.markdown(answer)
                    # Tiny UI element to show which AI pipeline was used!
                    st.caption(f"⚡ Routed via: `{route_used}` pipeline")
                    
                    st.session_state.messages.append({"role": "assistant", "content": answer})
                else:
                    st.error(f"Backend Error: {response.status_code}")
            except requests.exceptions.ConnectionError:
                st.error("Could not connect to backend. Is Uvicorn running?")