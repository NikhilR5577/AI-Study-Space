import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, RotateCcw, BookOpen, Link, FileText, Coffee, Brain, Timer, ChevronDown, FolderOpen } from 'lucide-react';
import { useStudy } from '../components/StudyContext'; 
import toast from 'react-hot-toast';

export default function FocusPage() {
  const navigate = useNavigate();
  const { 
    timeLeft, isRunning, setIsRunning, timerConfig, 
    changeTimerMode, activeSources, currentTopic,
    sessionMetadata, loadSession
  } = useStudy();

  const [isBreakMode, setIsBreakMode] = useState(false);
  const [showContext, setShowContext] = useState(false);

  const handleLoadVaultSession = async (sessionId) => {
    await loadSession(sessionId);
    navigate('/chat');
    toast.success("Loaded vault session!");
  };

  const vaultDocs = (sessionMetadata || []).flatMap(session => 
    (session.documents || []).map(doc => ({ ...doc, sessionId: session.sessionId, topic: session.topic }))
  );

  // Calculate total seconds and progress
  const totalSeconds = isBreakMode ? 5 * 60 : timerConfig;
  const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;
  const circumference = 2 * Math.PI * 130; // radius = 130
  const strokeOffset = circumference - (progress / 100) * circumference;

  // Timer completion → trigger break
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      setIsRunning(false);

      if (isBreakMode) {
        // Break is over → reset to focus mode
        toast.success("Break over. Let's get back to it.", { 
          duration: 4000, icon: '🧠',
          style: { background: '#18181b', color: '#e4e4e7', border: '1px solid #27272a' }
        });
        setIsBreakMode(false);
        changeTimerMode(timerConfig / 60);
      } else {
        // Focus session complete → start break
        toast.success("Focus session complete! Take a 5-minute break.", { 
          duration: 6000, icon: '☕',
          style: { background: '#022c22', color: '#a7f3d0', border: '1px solid #064e3b' }
        });
        setIsBreakMode(true);
        changeTimerMode(5);
      }
    }
  }, [timeLeft, isRunning]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsBreakMode(false);
    changeTimerMode(timerConfig / 60); 
    toast("Timer reset", { icon: '🔄', style: { background: '#18181b', color: '#e4e4e7', border: '1px solid #27272a' } });
  };

  const handlePresetClick = (mins) => {
    setIsBreakMode(false);
    changeTimerMode(mins);
  };

  const getSourceIcon = (type) => {
    switch (type) {
      case 'pdf': return <FileText className="w-4 h-4 text-red-400" />;
      case 'url': return <Link className="w-4 h-4 text-emerald-400" />;
      case 'doc': 
      case 'docx': return <BookOpen className="w-4 h-4 text-blue-400" />;
      default: return <FileText className="w-4 h-4 text-zinc-500" />;
    }
  };

  const presets = [25, 50, 90];
  const activePresetMins = isBreakMode ? null : timerConfig / 60;

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20 px-4 md:px-0 pt-6 md:pt-8">
      
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-zinc-100 tracking-tight flex items-center gap-3">
               {isBreakMode ? (
                 <><Coffee className="w-6 h-6 md:w-7 md:h-7 text-emerald-400" /> Recovery</>
               ) : (
                 <>
                   Deep Focus
                   {isRunning && (
                     <span className="relative flex h-2.5 w-2.5">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                       <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500" />
                     </span>
                   )}
                 </>
               )}
            </h1>
            <p className="text-zinc-500 mt-1.5 text-sm font-medium">
              {isBreakMode ? "Step away. Let your mind consolidate." : "Eliminate distractions. Execute."}
            </p>
          </div>
          
          {/* Timer Presets — pill buttons */}
          <div className="flex bg-zinc-900/80 border border-zinc-800/60 p-1 rounded-full w-full sm:w-auto backdrop-blur-sm">
            {presets.map(mins => (
              <button 
                key={mins} 
                onClick={() => handlePresetClick(mins)}
                disabled={isRunning}
                className={`flex-1 sm:flex-none px-5 py-2 rounded-full text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  activePresetMins === mins 
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>
        
        {/* Timer Display Card */}
        <div className={`relative rounded-[2rem] border transition-all duration-700 shadow-2xl flex flex-col items-center overflow-hidden ${
          isBreakMode 
            ? 'bg-emerald-950/15 border-emerald-900/30' 
            : 'bg-zinc-900/30 border-zinc-800/60 backdrop-blur-sm'
        }`}>
          
          {/* Subtle top-corner icon */}
          <div className="hidden md:block absolute top-6 left-6 opacity-40">
            {isBreakMode 
              ? <Coffee className="w-6 h-6 text-emerald-500" /> 
              : <Brain className="w-6 h-6 text-indigo-500" />
            }
          </div>

          {/* Break mode label */}
          {isBreakMode && (
            <div className="mt-6 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest">
              ☕ Break Time
            </div>
          )}

          {/* Timer with SVG ring */}
          <div className="relative flex items-center justify-center py-8">
            <div className="relative flex items-center justify-center w-[260px] h-[260px] md:w-[320px] md:h-[320px]">
              {/* SVG Progress Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 280 280">
                {/* Background track */}
                <circle
                  cx="140" cy="140" r="130"
                  stroke={isBreakMode ? '#064e3b' : '#27272a'}
                  strokeWidth="4"
                  fill="none"
                />
                {/* Progress arc */}
                <circle
                  cx="140" cy="140" r="130"
                  stroke={isBreakMode ? '#34d399' : '#6366f1'}
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                  className="transition-all duration-1000 ease-linear"
                  style={{ filter: `drop-shadow(0 0 15px ${isBreakMode ? 'rgba(52,211,153,0.5)' : 'rgba(99,102,241,0.5)'})` }}
                />
              </svg>

              {/* Time display */}
              <div className={`relative z-10 text-6xl md:text-7xl font-black font-mono tracking-tighter leading-none select-none transition-colors duration-500 ${
                isBreakMode ? 'text-emerald-400' : 'text-zinc-100'
              }`}>
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
          
          {/* Player Controls — Circular Mobile-Friendly Buttons */}
          <div className="flex gap-8 md:gap-12 pb-10 justify-center items-center w-full">
            
            <button 
              onClick={handleReset} 
              className="flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all active:scale-95 shadow-sm"
              title="Reset Timer"
            >
              <RotateCcw className="w-6 h-6 md:w-7 md:h-7" />
            </button>
            
            <button 
              onClick={() => setIsRunning(!isRunning)} 
              className={`flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full transition-all active:scale-95 ${
                isRunning 
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                  : isBreakMode
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.2)]'
                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
              }`}
              title={isRunning ? "Pause" : (isBreakMode ? "Start Break" : "Start Focus")}
            >
              {isRunning ? <Pause className="w-6 h-6 md:w-7 md:h-7" fill="currentColor" /> : <Play className="w-6 h-6 md:w-7 md:h-7 ml-1" fill="currentColor" />}
            </button>

          </div>
        </div>

        {/* Global Document Vault */}
        <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-2xl backdrop-blur-sm overflow-hidden p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <FolderOpen className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-wide">Document Vault</span>
              <p className="text-xs text-zinc-500 mt-0.5">All documents across all your sessions.</p>
            </div>
          </div>
          
          {vaultDocs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {vaultDocs.map((doc, index) => {
                const isUrl = doc.fileName?.startsWith('http');
                const sourceType = isUrl ? 'url' : (doc.fileName?.endsWith('.pdf') ? 'pdf' : (doc.fileName?.endsWith('.docx') ? 'docx' : 'doc'));
                return (
                  <button 
                    key={index} 
                    onClick={() => handleLoadVaultSession(doc.sessionId)}
                    className="flex flex-col items-start text-left gap-2 bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/50 hover:border-indigo-500/50 hover:bg-zinc-900/80 transition-all group"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <div className="p-1.5 bg-zinc-900 rounded-md shrink-0">
                        {getSourceIcon(sourceType)}
                      </div>
                      <span className="text-sm font-medium text-zinc-300 truncate group-hover:text-white transition-colors">{doc.fileName}</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-medium truncate w-full">
                      From: {doc.topic}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-zinc-950/20 rounded-xl border border-zinc-800/30 border-dashed">
              <BookOpen className="w-8 h-8 text-zinc-600 mb-3" />
              <p className="text-zinc-400 text-sm font-semibold">Your vault is empty</p>
              <p className="text-zinc-500 text-xs mt-1 max-w-xs leading-relaxed">
                Documents uploaded in the Chat space will be securely stored and accessible here.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}