import React from 'react';
import { Cpu, ChevronDown } from 'lucide-react';

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

export default function ModelSelector({ selectedModel, setSelectedModel, setSelectedProvider }) {
  
  // Scans the dictionary to update both Model and Provider simultaneously
  const handleChange = (e) => {
    const targetModelId = e.target.value;
    
    for (const provider of AVAILABLE_PROVIDERS) {
      const modelMatch = provider.models.find(m => m.id === targetModelId);
      if (modelMatch) {
        setSelectedModel(targetModelId);
        setSelectedProvider(provider.id);
        break;
      }
    }
  };

  return (
    <div className="relative flex items-center bg-zinc-950/40 rounded-xl border border-zinc-800/80 hover:border-zinc-700 transition-colors group">
      
      <Cpu className="w-4 h-4 text-indigo-400 absolute left-3 pointer-events-none group-hover:text-indigo-300 transition-colors" />
      
      {/* Sleek Native Select with OptGroups */}
      <select
        value={selectedModel}
        onChange={handleChange}
        className="appearance-none bg-transparent text-zinc-300 text-[13px] font-semibold pl-9 pr-9 py-2.5 outline-none cursor-pointer w-full tracking-wide min-w-[200px]"
      >
        {AVAILABLE_PROVIDERS.map((provider) => (
          <optgroup 
            key={provider.id} 
            label={provider.name} 
            className="bg-zinc-950 text-zinc-500 font-bold uppercase tracking-widest text-[10px]"
          >
            {provider.models.map((model) => (
              <option 
                key={model.id} 
                value={model.id} 
                className="bg-zinc-900 text-zinc-200 font-medium text-[13px] normal-case"
              >
                {model.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      
      <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 pointer-events-none group-hover:text-zinc-300 transition-colors" />
    </div>
  );
}