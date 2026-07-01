import React, { useState, useEffect } from 'react';
import { Volume2, Square } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VoiceButton({ text }) {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return () => {
      if (isPlaying) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isPlaying]);

  const handleToggle = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    if (!('speechSynthesis' in window)) {
      toast.error('Text-to-speech not supported in this browser.');
      return;
    }

    // Strip markdown formatting for better reading
    const cleanText = text
      .replace(/[#*`~>]/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // remove link syntax but keep text
      .replace(/\s+/g, ' ')
      .trim();

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        setIsPlaying(false);
        toast.error('Failed to read aloud.');
      }
    };

    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      onClick={handleToggle}
      className={`p-1.5 rounded-md transition-colors flex items-center gap-1 shrink-0 text-xs font-medium ${
        isPlaying
          ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30'
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80'
      }`}
      title={isPlaying ? "Stop reading" : "Read aloud"}
    >
      {isPlaying ? (
        <>
          <Square className="w-3.5 h-3.5 fill-current" /> Stop
        </>
      ) : (
        <>
          <Volume2 className="w-3.5 h-3.5" /> Read
        </>
      )}
    </button>
  );
}
