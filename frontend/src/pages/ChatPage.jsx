import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Mic, Send, Bot, User, Square, Copy, Sparkles, Cpu, FolderOpen, Brain } from 'lucide-react';
import ModelSelector from '../components/ModelSelector';
import DocumentDrawer from '../components/DocumentDrawer';
import ExaminerPanel from '../components/ExaminerPanel';
import VoiceButton from '../components/VoiceButton';
import { sendChatMessageStream } from '../services/chatApi'; 
import { uploadFile, processFile, processUrl, transcribeAudio } from '../services/uploadApi';
import { useStudy } from "../components/StudyContext";
import toast from 'react-hot-toast';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; 

function ChatInputBox({ 
  onSendMessage, 
  onFileUpload, 
  isLoading, 
  isUploading, 
  setIsDrawerOpen,
  provider,
  setProvider,
  model,
  setModel,
  setIsLoading
}) {
  const [localMessage, setLocalMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

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
              setLocalMessage((prev) => prev ? `${prev} ${data.text}` : data.text);
            }
          } catch (error) {
            toast.error("Audio transcription failed.");
          } finally {
            setIsLoading(false);
          }
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        toast.error("Could not access microphone."); 
      }
    }
  };

  const handleFileChange = (e) => {
    onFileUpload(e.target.files[0]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!localMessage.trim() || isLoading || isUploading || isRecording) return;
    onSendMessage(localMessage);
    setLocalMessage('');
  };

  return (
    <form onSubmit={onSubmit} className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl flex items-center p-1.5 shadow-2xl w-full shrink-0 transition-all focus-within:border-indigo-500/50 focus-within:shadow-[0_0_30px_rgba(99,102,241,0.1)] gap-1">
      
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.docx,.doc,.pptx,.png,.jpg,.jpeg" />

      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading || isLoading} className={`p-2 sm:p-2.5 rounded-xl transition-colors shrink-0 ${isUploading ? 'text-indigo-400 animate-pulse' : 'text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800'}`} title="Upload Document">
        <Paperclip className="w-5 h-5" />
      </button>

      <button type="button" onClick={() => setIsDrawerOpen(true)} className="p-2 sm:p-2.5 rounded-xl transition-colors shrink-0 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800" title="View Document Vault">
        <FolderOpen className="w-5 h-5" />
      </button>

      <button type="button" onClick={handleVoiceClick} disabled={isUploading} className={`p-2 sm:p-2.5 rounded-xl transition-colors shrink-0 ${isRecording ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' : 'text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800'}`} title="Voice Input">
        {isRecording ? <Square className="w-5 h-5 fill-red-400" /> : <Mic className="w-5 h-5" />}
      </button>

      <input 
        type="text" value={localMessage} onChange={(e) => setLocalMessage(e.target.value)}
        placeholder={isRecording ? "Listening..." : "Message Study Space..."}
        className="flex-1 min-w-0 bg-transparent border-none px-2 py-3 sm:px-3 text-sm text-zinc-100 focus:outline-none focus:ring-0 placeholder-zinc-600 font-medium"
        disabled={isLoading || isUploading || isRecording}
      />

      <div className="hidden md:block border-l border-zinc-800/80 pl-2 pr-1 scale-90 origin-right shrink-0">
         <ModelSelector selectedProvider={provider} setSelectedProvider={setProvider} selectedModel={model} setSelectedModel={setModel} />
      </div>

      <button type="submit" disabled={!localMessage.trim() || isLoading || isUploading || isRecording} className={`p-2.5 sm:p-3 rounded-xl transition-all shrink-0 ml-1 ${localMessage.trim() && !isLoading && !isUploading ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-900/20 active:scale-95' : 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'}`}>
        <Send className="w-5 h-5" />
      </button>
    </form>
  );
}

export default function ChatPage() {
  
  const {
    provider, setProvider, model, setModel, sessionId, userId, 
    chatHistory, addChatMessage, updateLastAssistantMessage,
    setCurrentTopic, updateKnowledgeGraph, setUploadedSources, addStudySession,
    activeSources
  } = useStudy();
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isExamMode, setIsExamMode] = useState(false);
  const fileInputRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const formatMath = (text) => {
    if (!text) return "";
    return text
      .replace(/\\\[/g, '$$$$') 
      .replace(/\\\]/g, '$$$$') 
      .replace(/\\\(/g, '$')    
      .replace(/\\\)/g, '$');   
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
            toast.error("Audio transcription failed. Check API connectivity.");
          } finally {
            setIsLoading(false);
          }
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        toast.error("Could not access microphone. Verify hardware permissions."); 
      }
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (!file.name.includes('.')) {
        toast.error("Folders are not allowed. Please select a specific file.");
        return;
    }

    setIsUploading(true);
    const now = new Date().toISOString();

    addChatMessage({ 
      role: 'assistant', 
      content: `⏳ Processing **${file.name}**...`,
      provider, model, timestamp: now
    });

    try {
      const uploadData = await uploadFile(file);
      setCurrentTopic(file.name.replace(/\.[^/.]+$/, ""));
      const processData = await processFile(uploadData.filename);
      updateLastAssistantMessage(`✅ **Success!** ${file.name} processed into ${processData.total_chunks_processed} chunks and added to your knowledge graph.`);
    } catch (error) {
      updateLastAssistantMessage(`❌ Error uploading ${file.name}.`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (userMessage) => {
    if (!userMessage.trim() || isLoading) return;

    let resolvedUserId = "guest";
    if (userId) {
      if (typeof userId === 'string') resolvedUserId = userId.replace(/^"|"$/g, ''); 
      else if (userId.email) resolvedUserId = userId.email; 
      else resolvedUserId = String(userId);
    }

    const now = new Date().toISOString();
    
    addChatMessage({ role: "user", content: userMessage, provider, model, timestamp: now });
    addChatMessage({ role: "assistant", content: "", provider, model, timestamp: now });
    
    setIsLoading(true); 

    const isUrl = /^https?:\/\/[^\s]+$/i.test(userMessage);
    if (isUrl) {
      updateLastAssistantMessage(`🌐 Fetching webpage content...`);
      try {
        const processData = await processUrl(userMessage);
        try {
          const url = new URL(userMessage);
          setCurrentTopic(url.hostname);
        } catch {} 
        updateLastAssistantMessage(`✅ **Success!** Webpage processed into ${processData.total_chunks_processed} chunks.`);
      } catch (error) {
        updateLastAssistantMessage("⚠️ Error scraping the URL.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      let fullResponse = ""; 
      await sendChatMessageStream(
        userMessage, provider, model, sessionId, resolvedUserId, 
        (chunkText) => {
          setIsLoading(false); 
          fullResponse += chunkText; 
          updateLastAssistantMessage(fullResponse);
        },
        (metadata) => {
           if (metadata.nodes?.length > 0) updateKnowledgeGraph(metadata.nodes, metadata.links || []);
           if (metadata.sources?.length > 0) setUploadedSources(metadata.sources.map(src => ({ name: src, type: 'pdf' })));
           if (addStudySession && metadata.topic) {
               addStudySession({ topic: metadata.topic, sources: metadata.sources, model, provider });
           }
        }
      );
    } catch (error) {
      setIsLoading(false);
      updateLastAssistantMessage("⚠️ Error communicating with the backend.");
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto text-zinc-100 min-w-0 pb-2 md:pb-6 pt-2 relative">
      
      {/* Floating Take Exam Button */}
      {activeSources.length > 0 && !isExamMode && (
        <button 
          onClick={() => setIsExamMode(true)}
          className="absolute top-16 md:top-4 right-4 z-10 flex items-center gap-2 px-4 py-2.5 bg-indigo-600/90 hover:bg-indigo-600 border border-indigo-500/20 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-900/30 active:scale-95 animate-in fade-in"
        >
          <Brain className="w-3.5 h-3.5" /> Take Exam
        </button>
      )}

      {/* Mobile Top Bar for AI Engine */}
      <div className="md:hidden flex justify-between items-center px-4 pb-2 mb-2 border-b border-zinc-800/50 z-20 shrink-0">
         <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">AI Engine</span>
         <div className="w-[180px]">
            <ModelSelector selectedProvider={provider} setSelectedProvider={setProvider} selectedModel={model} setSelectedModel={setModel} direction="down" />
         </div>
      </div>

      {/* Premium Borderless Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-6 px-2 md:px-4 mb-4 custom-scrollbar min-w-0">
        {chatHistory.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4 opacity-70 animate-in fade-in duration-700">
               <div className="w-16 h-16 bg-zinc-900/50 rounded-2xl flex items-center justify-center border border-zinc-800/50 shadow-inner">
                 <Sparkles className="w-8 h-8 text-indigo-500" />
               </div>
               <div className="text-center flex flex-col items-center gap-2">
                 <p className="text-lg font-bold text-zinc-300">Ready to synthesize.</p>
                 <p className="text-sm mt-1">Upload a document or ask a question to begin.</p>
                 {activeSources.length > 0 && (
                   <button 
                     onClick={() => setIsExamMode(true)}
                     className="mt-4 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/20 active:scale-95"
                   >
                     <Brain className="w-4 h-4" /> Start AI Exam
                   </button>
                 )}
               </div>
           </div>
        ) : (
          chatHistory.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex items-start gap-3 md:gap-4 max-w-[98%] md:max-w-[88%] transition-all animate-in slide-in-from-bottom-2 duration-300 ${
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 border border-zinc-700 text-indigo-400'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              
              <div className={`text-sm md:text-base leading-relaxed tracking-wide whitespace-pre-wrap min-w-0 overflow-x-auto w-full custom-scrollbar p-4 rounded-2xl ${
                msg.role === 'user' ? 'bg-indigo-900/20 text-indigo-50 border border-indigo-500/20 rounded-tr-sm' : 'bg-transparent text-zinc-200'
              }`}>
                <ReactMarkdown 
                  remarkPlugins={[remarkMath]} 
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeString = String(children).replace(/\n$/, '');
                      
                      const handleCopy = () => {
                        navigator.clipboard.writeText(codeString);
                        toast.success("Code copied to clipboard!", { icon: '📋' });
                      };

                      return !inline && match ? (
                        <div className="relative group my-5 rounded-xl overflow-hidden border border-zinc-800 shadow-xl">
                          <div className="flex justify-between items-center bg-[#18181b] text-zinc-400 text-xs px-4 py-2.5 border-b border-zinc-800/80">
                            <span className="uppercase font-bold tracking-wider flex items-center gap-2"><Cpu className="w-3.5 h-3.5" /> {match[1]}</span>
                            <button onClick={handleCopy} className="flex items-center gap-1.5 hover:text-white transition-colors bg-zinc-800/50 hover:bg-zinc-700 px-2 py-1 rounded-md">
                              <Copy className="w-3 h-3" /> Copy
                            </button>
                          </div>
                          <SyntaxHighlighter
                            {...props}
                            children={codeString}
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{ margin: 0, background: '#09090b', padding: '1.25rem' }}
                            className="text-xs md:text-sm custom-scrollbar"
                          />
                        </div>
                      ) : (
                        <code {...props} className={`${className} bg-zinc-800/60 text-indigo-300 px-1.5 py-0.5 rounded-md font-mono text-[0.9em] border border-zinc-700/50 break-words`}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {formatMath(msg.content)}
                </ReactMarkdown>

                {msg.role === 'assistant' && msg.content && (
                  <div className="mt-2 flex items-center justify-start border-t border-zinc-800/50 pt-2">
                    <VoiceButton text={msg.content} />
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-3 text-zinc-400 text-sm bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-2xl w-fit ml-12 animate-pulse">
              <Bot className="w-5 h-5 text-indigo-400 animate-bounce" />
              Synthesizing response...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* The "Command Center" Input Box - NOW EXTRACTED */}
      <ChatInputBox 
        onSendMessage={handleSendMessage}
        onFileUpload={handleFileUpload}
        isLoading={isLoading}
        isUploading={isUploading}
        setIsDrawerOpen={setIsDrawerOpen}
        provider={provider}
        setProvider={setProvider}
        model={model}
        setModel={setModel}
        setIsLoading={setIsLoading}
      />

      {/* Document Preview Side-Drawer */}
      <DocumentDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* AI Examiner Overlay */}
      {isExamMode && (
        <ExaminerPanel 
          sessionId={sessionId} 
          userId={userId} 
          provider={provider} 
          model={model} 
          onClose={() => setIsExamMode(false)} 
        />
      )}
    </div>
  );
}