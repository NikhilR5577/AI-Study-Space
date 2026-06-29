import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Mic, Send, Bot, User, Square } from 'lucide-react';
import ModelSelector from '../components/ModelSelector';
import { sendChatMessageStream } from '../services/chatApi'; 
import { uploadFile, processFile, processUrl, transcribeAudio } from '../services/uploadApi';
import { useStudy } from "../components/StudyContext";

// 💡 Math formatting imports
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; 

export default function ChatPage() {
  
  const {
    provider,
    setProvider,
    model,
    setModel,
    sessionId,
    userId, 
    chatHistory, 
    addChatMessage,
    updateLastAssistantMessage,
    setCurrentTopic,
    updateKnowledgeGraph,
    setUploadedSources, 
    addStudySession 
  } = useStudy();
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // --- Voice Recording States & Refs ---
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
        behavior: "smooth"
    });
  }, [chatHistory]);

  // 👈 THE FIX: Math formatter to safely convert AI brackets to Markdown dollar signs
  const formatMath = (text) => {
    if (!text) return "";
    return text
      .replace(/\\\[/g, '$$$$') // Converts \[ to $$
      .replace(/\\\]/g, '$$$$') // Converts \] to $$
      .replace(/\\\(/g, '$')    // Converts \( to $
      .replace(/\\\)/g, '$');   // Converts \) to $
  };

  const handleVoiceClick = async () => {
    if (isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      audioChunksRef.current = [];
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          setIsLoading(true);
          try {
            const data = await transcribeAudio(audioBlob);
            if (data.text) {
              setInputMessage((prev) => prev ? `${prev} ${data.text}` : data.text);
            }
          } catch (error) {
            addChatMessage({ 
              role: 'assistant', 
              content: "⚠️ Audio transcription failed. Please check your API connectivity." 
            });
          } finally {
            setIsLoading(false);
          }
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Microphone access denied or unsupported browser:", err);
        alert("Could not access microphone. Verify hardware permissions.");
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.includes('.')) {
        alert("Folders are not allowed. Please select a specific document or image.");
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

    setIsUploading(true);
    const now = new Date().toISOString();

    addChatMessage({ 
      role: 'assistant', 
      content: `⏳ Uploading and processing ${file.name}...`,
      provider,
      model,
      timestamp: now
    });

    try {
      const uploadData = await uploadFile(file);
      setCurrentTopic(file.name.replace(/\.[^/.]+$/, ""));
      const processData = await processFile(uploadData.filename);
      
      const successMsg = `✅ Success! ${file.name} has been processed into ${processData.total_chunks_processed} chunks and added to your knowledge base.`;
      
      updateLastAssistantMessage(successMsg);

    } catch (error) {
      const errorMsg = `❌ Error uploading ${file.name}.`;
      updateLastAssistantMessage(errorMsg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    let resolvedUserId = "guest";
    if (userId) {
      if (typeof userId === 'string') {
        resolvedUserId = userId.replace(/^"|"$/g, ''); 
      } else if (userId.email) {
        resolvedUserId = userId.email; 
      } else {
        resolvedUserId = String(userId);
      }
    }

    console.log("DEBUG: Sending message with cleaned user_id:", resolvedUserId);

    const userMessage = inputMessage.trim();
    setInputMessage(''); 
    const now = new Date().toISOString();
    
    addChatMessage({
      role: "user",
      content: userMessage,
      provider,
      model,
      timestamp: now
    });
    
    addChatMessage({
      role: "assistant",
      content: "",
      provider,
      model,
      timestamp: now
    });
    
    setIsLoading(true); 

    // --- URL Interception Logic ---
    const isUrl = /^https?:\/\/[^\s]+$/i.test(userMessage);
    if (isUrl) {
      updateLastAssistantMessage(`🌐 I see a URL! Fetching and processing the webpage content...`);
      try {
        const processData = await processUrl(userMessage);
        try {
          const url = new URL(userMessage);
          setCurrentTopic(url.hostname);
        } catch {} 
        
        const successMsg = `✅ Success! The webpage has been processed into ${processData.total_chunks_processed} chunks and added to your knowledge base.`;
        updateLastAssistantMessage(successMsg);

      } catch (error) {
        updateLastAssistantMessage("⚠️ Error scraping the URL.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // --- AI Chat Logic ---
    try {
      let fullResponse = ""; 
      
      await sendChatMessageStream(
        userMessage, 
        provider, 
        model, 
        sessionId,
        resolvedUserId, 
        
        (chunkText) => {
          setIsLoading(false); 
          fullResponse += chunkText; 
          updateLastAssistantMessage(fullResponse);
        },

        (metadata) => {
           if (metadata.nodes && metadata.nodes.length > 0) {
               updateKnowledgeGraph(metadata.nodes, metadata.links || []);
           }
           if (metadata.sources && metadata.sources.length > 0) {
               const sourceObjects = metadata.sources.map(src => ({ name: src, type: 'pdf' }));
               setUploadedSources(sourceObjects);
           }
           
           if (addStudySession && metadata.topic) {
               addStudySession({
                   topic: metadata.topic,
                   sources: metadata.sources,
                   model: model,
                   provider: provider
               });
           }
        }
      );
      
    } catch (error) {
      setIsLoading(false);
      updateLastAssistantMessage("⚠️ Error communicating with the backend.");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-5xl mx-auto text-gray-100">
      
      <div className="mb-4">
        <ModelSelector 
          selectedProvider={provider} setSelectedProvider={setProvider}
          selectedModel={model} setSelectedModel={setModel} 
        />
      </div>

      <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl p-6 overflow-y-auto space-y-4 mb-4 shadow-xl custom-scrollbar">
        
        {chatHistory.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-3 opacity-50">
               <Bot className="w-12 h-12" />
               <p>Hello! Ready to study today?</p>
           </div>
        ) : (
          chatHistory.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex items-start gap-4 p-4 rounded-xl max-w-[85%] transition-all ${
                msg.role === 'user' ? 'bg-indigo-600/20 border border-indigo-500/30 ml-auto flex-row-reverse' : 'bg-gray-950 border border-gray-800/80 mr-auto'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-indigo-400'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className="text-sm md:text-base leading-relaxed tracking-wide whitespace-pre-wrap">
                {/* 👈 FIXED: msg.content is wrapped in formatMath() before rendering */}
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {formatMath(msg.content)}
                </ReactMarkdown>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-3 text-gray-400 text-sm bg-gray-950 border border-gray-800 p-4 rounded-xl w-fit animate-pulse">
              <Bot className="w-5 h-5 text-indigo-400 animate-spin" />
              Processing payload response...
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-3 shadow-lg">
        <input 
          type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden"
          accept=".pdf,.docx,.doc,.pptx,.png,.jpg,.jpeg"
        />

        <button 
          type="button" onClick={() => fileInputRef.current.click()} disabled={isUploading || isLoading}
          className={`p-2.5 rounded-lg transition-colors ${isUploading ? 'text-indigo-400 animate-pulse' : 'text-gray-400 hover:text-indigo-400 hover:bg-gray-950'}`}
          title="Upload document or presentation"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <button 
          type="button" 
          onClick={handleVoiceClick}
          disabled={isUploading}
          className={`p-2.5 rounded-lg transition-colors ${
            isRecording 
              ? 'bg-red-600/20 text-red-400 border border-red-500/30 animate-pulse' 
              : 'text-gray-400 hover:text-indigo-400 hover:bg-gray-950'
          }`}
          title={isRecording ? "Stop recording" : "Dictate message"}
        >
          {isRecording ? <Square className="w-5 h-5 fill-red-400" /> : <Mic className="w-5 h-5" />}
        </button>

        <input 
          type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)}
          placeholder={isRecording ? "Listening closely..." : `Ask anything using ${model} or drop assets...`}
          className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-sm md:text-base text-gray-100 focus:outline-none focus:border-indigo-500 transition-colors placeholder-gray-500"
          disabled={isLoading || isUploading || isRecording}
        />

        <button 
          type="submit" disabled={!inputMessage.trim() || isLoading || isUploading || isRecording}
          className={`p-2.5 rounded-lg transition-all ${inputMessage.trim() && !isLoading && !isUploading ? 'bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}