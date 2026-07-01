import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Globe, Image, Presentation, File, FolderOpen, Search, ExternalLink, ChevronRight, ArrowLeft, Download } from 'lucide-react';
import { useStudy } from './StudyContext';

export default function DocumentDrawer({ isOpen, onClose }) {
  const { activeSources, currentTopic, chatHistory } = useStudy();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const drawerRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const [docText, setDocText] = useState('');
  const [loadingText, setLoadingText] = useState(false);
  const [errorText, setErrorText] = useState('');

  // Reset selected document when drawer is closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedDoc(null);
      setDocText('');
      setErrorText('');
    }
  }, [isOpen]);

  // Fetch document text content when DOCX/PPTX is selected
  useEffect(() => {
    if (selectedDoc && (selectedDoc.type === 'docx' || selectedDoc.type === 'doc' || selectedDoc.type === 'pptx' || selectedDoc.type === 'ppt')) {
      setLoadingText(true);
      setDocText('');
      setErrorText('');
      
      const apiBase = 'https://ai-study-space-backend.onrender.com';
      fetch(`${apiBase}/files/text/${encodeURIComponent(selectedDoc.name)}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to load text');
          return res.json();
        })
        .then(data => {
          setDocText(data.text || 'No readable text content found.');
          setLoadingText(false);
        })
        .catch(err => {
          console.error(err);
          setErrorText('Unable to extract text content.');
          setLoadingText(false);
        });
    }
  }, [selectedDoc]);

  // Extract documents from both activeSources AND chat history messages
  const extractedDocs = React.useMemo(() => {
    const docs = [];
    const seen = new Set();

    // 1. From activeSources (primary source)
    activeSources.forEach((source) => {
      const name = typeof source === 'string' ? source : (source.name || 'Unknown Document');
      const type = typeof source === 'string' 
        ? (name.startsWith('http') ? 'url' : 'pdf') 
        : (source.type || 'pdf');
      
      if (!seen.has(name)) {
        seen.add(name);
        docs.push({ name, type, source: 'context' });
      }
    });

    // 2. Scan chat history for upload confirmations to find documents
    chatHistory.forEach((msg) => {
      if (msg.role === 'assistant' && msg.content) {
        // Match "✅ Success! filename.pdf processed into X chunks"
        const fileMatch = msg.content.match(/✅.*?(?:Success!?\s*)(.+?)\s+(?:processed|has been processed)/i);
        if (fileMatch) {
          const name = fileMatch[1].replace(/\*\*/g, '').trim();
          if (!seen.has(name)) {
            seen.add(name);
            const ext = name.split('.').pop()?.toLowerCase();
            let type = 'pdf';
            if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) type = 'image';
            else if (['pptx', 'ppt'].includes(ext)) type = 'pptx';
            else if (['docx', 'doc'].includes(ext)) type = 'docx';
            docs.push({ name, type, source: 'history', timestamp: msg.timestamp });
          }
        }

        // Match "✅ Success! Webpage processed into X chunks"
        const urlMatch = msg.content.match(/✅.*?(?:Success!?\s*)(?:The )?webpage.*processed/i);
        if (urlMatch) {
          // Look back one message for the URL
          const idx = chatHistory.indexOf(msg);
          if (idx > 0) {
            const prevMsg = chatHistory[idx - 1];
            if (prevMsg.role === 'user' && /^https?:\/\//.test(prevMsg.content.trim())) {
              const url = prevMsg.content.trim();
              if (!seen.has(url)) {
                seen.add(url);
                docs.push({ name: url, type: 'url', source: 'history', timestamp: msg.timestamp });
              }
            }
          }
        }
      }
    });

    return docs;
  }, [activeSources, chatHistory]);

  // Filter by search
  const filteredDocs = searchQuery.trim()
    ? extractedDocs.filter(doc => doc.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : extractedDocs;

  const getFileIcon = (type) => {
    switch (type) {
      case 'url': return <Globe className="w-5 h-5 text-emerald-400" />;
      case 'image': return <Image className="w-5 h-5 text-amber-400" />;
      case 'pptx': case 'ppt': return <Presentation className="w-5 h-5 text-orange-400" />;
      case 'docx': case 'doc': return <FileText className="w-5 h-5 text-blue-400" />;
      case 'pdf': return <FileText className="w-5 h-5 text-red-400" />;
      default: return <File className="w-5 h-5 text-zinc-400" />;
    }
  };

  const getFileExtBadge = (type) => {
    const colors = {
      url: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      image: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      pptx: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      ppt: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      docx: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      doc: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      pdf: 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return colors[type] || 'bg-zinc-800 text-zinc-400 border-zinc-700';
  };

  const truncateName = (name, maxLen = 35) => {
    if (name.length <= maxLen) return name;
    const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
    const base = name.slice(0, maxLen - ext.length - 3);
    return `${base}...${ext}`;
  };

  const getOpenUrl = (doc) => {
    if (!doc) return '';
    if (doc.type === 'url') return doc.name;
    const apiBase = 'https://ai-study-space-backend.onrender.com';
    return `${apiBase}/files/view/${encodeURIComponent(doc.name)}`;
  };

  return createPortal(
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 h-full w-full sm:w-[640px] bg-zinc-950 border-l border-zinc-800/80 shadow-2xl z-50 
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          flex flex-col
        `}
      >
        {selectedDoc ? (
          /* =============================================
             DOCUMENT PREVIEW VIEW
             ============================================= */
          <div className="flex-1 flex flex-col h-full min-h-0 bg-[#050505]">
            {/* Preview Header */}
            <div className="px-6 py-4 border-b border-zinc-800/80 shrink-0 flex items-center justify-between bg-zinc-950/80 backdrop-blur-md">
              <div className="flex items-center gap-3 min-w-0">
                <button 
                  onClick={() => setSelectedDoc(null)}
                  className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-xl transition-all"
                  title="Back to list"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-zinc-100 truncate tracking-tight" title={selectedDoc.name}>
                    {selectedDoc.name}
                  </h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-wider ${getFileExtBadge(selectedDoc.type)}`}>
                    {selectedDoc.type}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <a
                  href={getOpenUrl(selectedDoc)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
                  title="Open in new window"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">New Tab</span>
                </a>
                <button 
                  onClick={onClose} 
                  className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-xl transition-all"
                  aria-label="Close document drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Body */}
            <div className="flex-1 min-h-0 bg-zinc-950/40 relative">
              {selectedDoc.type === 'pdf' ? (
                <iframe 
                  src={getOpenUrl(selectedDoc)} 
                  className="w-full h-full bg-zinc-900 border-none"
                  title="Document Preview"
                />
              ) : selectedDoc.type === 'image' ? (
                <div className="w-full h-full flex items-center justify-center p-6 overflow-auto">
                  <img 
                    src={getOpenUrl(selectedDoc)} 
                    alt={selectedDoc.name} 
                    className="max-w-full max-h-full object-contain rounded-lg border border-zinc-800 shadow-2xl"
                  />
                </div>
              ) : selectedDoc.type === 'url' ? (
                <div className="w-full h-full flex flex-col">
                  {/* Backup header message since some sites block iframes */}
                  <div className="bg-amber-500/5 border-b border-amber-500/10 px-6 py-3 flex items-center justify-between text-xs text-amber-300 font-medium">
                    <span>Web pages might prevent direct previewing due to security restrictions.</span>
                    <a 
                      href={selectedDoc.name} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="underline flex items-center gap-1 hover:text-amber-200 transition-colors shrink-0"
                    >
                      Open directly <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <iframe 
                    src={getOpenUrl(selectedDoc)} 
                    className="w-full flex-1 bg-zinc-900 border-none"
                    title="Website Preview"
                  />
                </div>
              ) : (
                /* PowerPoint / Word DOCX Files with extracted text reader */
                <div className="w-full h-full flex flex-col min-h-0 bg-[#050505]">
                  {loadingText ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-3">
                      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-semibold">Extracting document text...</p>
                    </div>
                  ) : errorText ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
                      <div className="w-20 h-20 bg-zinc-900/50 rounded-3xl flex items-center justify-center border border-zinc-800/50 mb-6">
                        {getFileIcon(selectedDoc.type)}
                      </div>
                      <h4 className="text-base font-bold text-zinc-200 mb-2">{errorText}</h4>
                      <a
                        href={getOpenUrl(selectedDoc)}
                        download
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-900/20 active:scale-[0.98] transition-all"
                      >
                        <Download className="w-4 h-4" /> Download File
                      </a>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                      {/* Document text container */}
                      <div className="flex-grow overflow-y-auto p-6 md:p-8 text-sm text-zinc-300 leading-relaxed font-sans whitespace-pre-wrap selection:bg-indigo-500/30 selection:text-white custom-scrollbar select-text">
                        {docText}
                      </div>
                      {/* Floating download helper bar */}
                      <div className="px-6 py-3 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between shrink-0">
                        <span className="text-[11px] text-zinc-500 font-medium">Text extraction completed.</span>
                        <a
                          href={getOpenUrl(selectedDoc)}
                          download
                          className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> Download Original
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* =============================================
             DOCUMENT LIST VIEW
             ============================================= */
          <>
            {/* Header */}
            <div className="px-6 py-5 border-b border-zinc-800/80 shrink-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                    <FolderOpen className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-100 tracking-tight">Documents</h2>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5">
                      {currentTopic ? `Session: ${currentTopic.substring(0, 30)}${currentTopic.length > 30 ? '...' : ''}` : 'Current session'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={onClose} 
                  className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-xl transition-all"
                  aria-label="Close document drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search */}
              {extractedDocs.length > 3 && (
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search documents..."
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>
              )}
            </div>

            {/* Document list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-2">
              {filteredDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4 px-6">
                  <div className="w-20 h-20 bg-zinc-900/50 rounded-3xl flex items-center justify-center border border-zinc-800/50">
                    <FolderOpen className="w-10 h-10 opacity-30" />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold text-zinc-400">No documents yet</p>
                    <p className="text-sm mt-2 leading-relaxed text-zinc-600">
                      Upload a PDF, DOCX, or paste a URL in the chat to build your knowledge base.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {['PDF', 'DOCX', 'PPTX', 'URL', 'Image'].map((label) => (
                      <span key={label} className="text-[10px] px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 font-mono uppercase tracking-wider">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                filteredDocs.map((doc, index) => (
                  <div
                    key={`${doc.name}-${index}`}
                    onClick={() => setSelectedDoc(doc)}
                    className="group bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800/50 hover:border-indigo-500/30 rounded-xl p-4 transition-all duration-200 cursor-pointer active:scale-[0.98]"
                    title={`Click to preview ${doc.name}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="p-2 bg-zinc-800/60 group-hover:bg-zinc-800 rounded-lg shrink-0 transition-colors">
                        {getFileIcon(doc.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 truncate transition-colors" title={doc.name}>
                            {doc.type === 'url' ? truncateName(doc.name, 40) : doc.name}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Type badge */}
                          <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-wider ${getFileExtBadge(doc.type)}`}>
                            {doc.type}
                          </span>
                          
                          {/* Timestamp */}
                          {doc.timestamp && (
                            <span className="text-[10px] text-zinc-600 font-mono">
                              {new Date(doc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}

                          {/* Source indicator */}
                          <span className="text-[10px] text-zinc-700 font-mono">
                            • In Pinecone
                          </span>
                        </div>
                      </div>

                      {/* Open button — always visible */}
                      <div className="flex items-center shrink-0">
                        <div className="p-1.5 text-zinc-600 group-hover:text-indigo-400 transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer summary */}
            {filteredDocs.length > 0 && (
              <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-950/50 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500 font-medium">
                      {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''} indexed
                    </span>
                    <div className="flex -space-x-1">
                      {[...new Set(filteredDocs.map(d => d.type))].slice(0, 4).map((type) => (
                        <span key={type} className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold uppercase border-2 border-zinc-950 ${getFileExtBadge(type)}`}>
                          {type.slice(0, 2)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-700 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Vectorized
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>,
    document.body
  );
}
