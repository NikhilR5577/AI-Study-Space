import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, BookOpen, Link, FileText, UploadCloud, CheckCircle } from 'lucide-react';
import { useStudy } from '../components/StudyContext'; 

export default function FocusPage() {
  const { 
    timeLeft, 
    isRunning, 
    setIsRunning, 
    timerConfig, 
    changeTimerMode,
    activeSources
  } = useStudy();

  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      setShowSuccess(true);

      const timer = setTimeout(() => {
        setShowSuccess(false);
        changeTimerMode(timerConfig / 60); 
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [timeLeft, isRunning, setIsRunning, changeTimerMode, timerConfig]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleReset = () => {
    setIsRunning(false);
    setShowSuccess(false); 
    changeTimerMode(timerConfig / 60); 
  };

  const getSourceIcon = (type) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5 text-indigo-400 mt-0.5" />;
      case 'url': return <Link className="w-5 h-5 text-emerald-400 mt-0.5" />;
      case 'doc': 
      case 'docx': return <BookOpen className="w-5 h-5 text-amber-400 mt-0.5" />;
      default: return <FileText className="w-5 h-5 text-gray-400 mt-0.5" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 md:space-y-10 animate-in fade-in duration-500">
      
      {/* RESPONSIVE HEADER: Stacks on mobile, side-by-side on desktop */}
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-100 flex items-center gap-3">
            Focus Mode ⏱️
          </h1>
          <p className="text-gray-400 mt-2">Pomodoro timer for deep work.</p>
        </div>
        
        <div className="flex gap-2 bg-[#111111] border border-gray-800 p-1.5 rounded-xl self-start">
          {[25, 50, 90].map(mins => (
            <button 
              key={mins}
              onClick={() => changeTimerMode(mins)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timerConfig === mins * 60 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
              }`}
            >
              {mins}m
            </button>
          ))}
        </div>
      </div>
      
      {/* Timer Display */}
      <div className="bg-[#111111] p-8 md:p-12 rounded-3xl border border-gray-800/60 flex flex-col items-center shadow-2xl relative">
        <div className="text-7xl md:text-9xl font-black font-mono text-white mb-8 md:mb-10 tracking-tight">
          {formatTime(timeLeft)}
        </div>
        
        <div className="flex space-x-6 mb-4">
          <button 
            onClick={() => setIsRunning(!isRunning)} 
            className={`p-5 rounded-2xl transition-all shadow-lg ${
              isRunning ? 'bg-amber-600 hover:bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
          >
            {isRunning ? <Pause className="w-8 h-8 text-white" /> : <Play className="w-8 h-8 text-white ml-1" />}
          </button>
          
          <button 
            onClick={handleReset} 
            className="p-5 rounded-2xl bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <RotateCcw className="w-8 h-8" />
          </button>
        </div>

        {showSuccess && (
          <div className="absolute bottom-6 flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-4 py-2 rounded-full animate-in slide-in-from-bottom-2 fade-in duration-300 text-sm md:text-base">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Session Complete! Great focus.</span>
          </div>
        )}
      </div>

      <div className="bg-[#0a0a0a] border border-gray-800/60 p-6 rounded-2xl">
        <h3 className="text-sm font-mono text-gray-500 uppercase tracking-wider mb-4">Current Context</h3>
        <div className="space-y-4">
          {activeSources.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-gray-500 py-6 gap-2">
                <UploadCloud className="w-8 h-8 opacity-50" />
                <p className="text-sm">No files or URLs loaded in current session.</p>
            </div>
          ) : (
            activeSources.map((source, index) => {
              const sourceName = typeof source === 'string' ? source : source.name;
              const isUrl = sourceName.startsWith('http://') || sourceName.startsWith('https://');
              const sourceType = isUrl ? 'url' : (typeof source === 'string' ? 'pdf' : source.type);

              return (
                <div key={index} className="flex items-start gap-3">
                  {getSourceIcon(sourceType)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 font-mono mb-1 uppercase">{sourceType}:</p>
                    {isUrl ? (
                      <a href={sourceName} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 text-sm font-mono bg-gray-900 px-3 py-1.5 rounded-md border border-gray-800 w-fit block transition-colors truncate">
                        {sourceName}
                      </a>
                    ) : (
                      <p className="text-gray-200 text-sm font-mono bg-gray-900 px-3 py-1.5 rounded-md border border-gray-800 w-fit truncate">
                        {sourceName}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}