import React, { useState, useRef, useEffect } from 'react';
import { Cpu, ChevronDown, Check } from 'lucide-react';

// Your exact FastAPI get_llm factory logic
const AVAILABLE_PROVIDERS = [
  {
    id: 'google',
    name: 'Google Gemini',
    models: [
      { id: 'gemini-flash', name: 'Gemini 2.5 Flash (Fast)' },
      { id: 'gemini-pro', name: 'Gemini 2.5 Pro (Deep)' }
    ]
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    models: [
      { id: 'llama-3.3', name: 'Llama 3.3 70B' },
      { id: 'gpt-oss', name: 'GPT OSS 120B' },
      { id: 'qwen3', name: 'Qwen 3 32B' }
    ]
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    models: [
      { id: 'mistral-small', name: 'Mistral Small (Concise)' }
    ]
  }
];

export default function ModelSelector({ selectedModel, setSelectedModel, setSelectedProvider, direction = "up" }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (targetModelId, targetProviderId) => {
    setSelectedModel(targetModelId);
    setSelectedProvider(targetProviderId);
    setIsOpen(false);
  };

  // Find selected model name for the button label
  let selectedName = 'Select Model';
  for (const provider of AVAILABLE_PROVIDERS) {
    const modelMatch = provider.models.find(m => m.id === selectedModel);
    if (modelMatch) {
      selectedName = modelMatch.name;
      break;
    }
  }

  return (
    <div className="relative group" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center bg-zinc-950/40 rounded-xl border border-zinc-800/80 hover:border-zinc-700 transition-colors w-full h-full py-2.5 pl-9 pr-8"
      >
        <Cpu className="w-4 h-4 text-indigo-400 absolute left-3" />
        <span className="text-zinc-300 text-[13px] font-semibold tracking-wide truncate max-w-[130px] sm:max-w-[160px] md:max-w-[200px]">
          {selectedName}
        </span>
        <ChevronDown className={`w-4 h-4 text-zinc-500 absolute right-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 w-64 bg-zinc-950 border border-zinc-800 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden z-[100] animate-in ${direction === 'up' ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'}`}>
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 space-y-3">
            {AVAILABLE_PROVIDERS.map((provider) => (
              <div key={provider.id}>
                <div className="px-3 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                  {provider.name}
                </div>
                <div className="space-y-0.5">
                  {provider.models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => handleSelect(model.id, provider.id)}
                      className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                        selectedModel === model.id 
                          ? 'bg-indigo-500/10 text-indigo-400 font-bold' 
                          : 'text-zinc-300 font-medium hover:bg-zinc-900'
                      }`}
                    >
                      <span className="text-[13px]">{model.name}</span>
                      {selectedModel === model.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}