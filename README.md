# 🧠 AI Study Space

> Your intelligent second brain for hyper-focused learning and knowledge synthesis.

[![Demo Video](https://img.shields.io/badge/Watch-Demo_Video-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](#) <!-- Add your video link here -->
[![Live Preview](https://img.shields.io/badge/Live-Preview-000000?style=for-the-badge&logo=vercel&logoColor=white)](#) <!-- Add your Vercel link here -->

![App Demo](./demo.gif) <!-- Add your GIF here in the root folder named demo.gif -->

**AI Study Space** is a full-stack, AI-powered learning platform designed to help students and professionals learn faster and retain more information. By combining Retrieval-Augmented Generation (RAG), dynamic knowledge graphs, and spaced repetition, it transforms passive reading into active, hyper-focused learning.

---

## ✨ Features

- 📚 **Global Document Vault & RAG Chat**: Upload PDFs, DOCX, PPTX, or scrape web URLs. The AI instantly reads and contextualizes your documents, allowing you to chat with your study materials.
- 🎓 **AI Examiner Mode (Spaced Repetition)**: Don't just read—test yourself. The AI generates custom exam questions based on your uploaded context. If you get a question wrong, the "I Don't Know" tracker flags the concept and re-tests you on it later.
- 🕸️ **Auto-Generated Knowledge Graphs**: Watch your brain expand. As you chat, the AI automatically extracts core concepts and builds an interactive, physics-based 2D network graph of what you're learning.
- ⏱️ **Deep Focus & Goal Tracking**: A built-in Pomodoro timer seamlessly integrates with a Goal Tracker. Set targets like "10 hours of Biology" and watch your progress bar fill up as you log focus sessions.
- 🎙️ **Voice Q&A**: Hands-free learning with end-to-end voice. Use the microphone for speech-to-text queries, and use the native Text-to-Speech "Read" button to have the AI explain complex concepts out loud.
- 🔐 **Secure Multi-Tenancy**: Built with Google OAuth. Your documents, chat histories, graphs, and study analytics are completely private and securely isolated to your account.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React.js + Vite
- **Styling**: Tailwind CSS + Lucide Icons
- **State Management**: React Context API
- **Graph Visualization**: react-force-graph-2d
- **Markdown Rendering**: react-markdown + remark-math + rehype-katex
- **Hosting**: Vercel

### Backend
- **Framework**: FastAPI (Python)
- **AI / LLM Orchestration**: LangChain
- **Models**: Google Gemini 2.5 Flash/Pro, Groq (Llama 3)
- **Vector Database**: Pinecone (for RAG / Semantic Search)
- **Primary Database**: MongoDB (for user sessions, analytics, and graph persistence)
- **Hosting**: Render

---

## 🚀 Quick Start (Local Development)

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/ai-study-space.git
cd ai-study-space
```

### 2. Backend Setup
```bash
# Navigate to the root directory
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`

# Install dependencies
pip install -r requirements.txt

# Create a .env file and add your keys
# GOOGLE_API_KEY=...
# GROQ_API_KEY=...
# PINECONE_API_KEY=...
# PINECONE_INDEX_NAME=...
# MONGO_URI=...

# Start the FastAPI server
uvicorn app.main:app --reload
```

### 3. Frontend Setup
```bash
# Open a new terminal and navigate to the frontend
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](#).

## 📝 License
This project is [MIT](https://choosealicense.com/licenses/mit/) licensed.
