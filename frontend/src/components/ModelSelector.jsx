import React from 'react';
import { Cpu, ChevronDown } from 'lucide-react';

// Unified dictionary matching your FastAPI get_llm factory logic
const AVAILABLE_PROVIDERS = [
  {
    id: 'google',
    name: 'Google Gemini',
    models: [
      { id: 'gemini-flash', name: 'Gemini 2.5 Flash (Fast & General)' },
      { id: 'gemini-pro', name: 'Gemini 2.5 Pro (Deep Reasoning)' }
    ]
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    models: [
      { id: 'llama-3.3', name: 'Llama 3.3 70B (Versatile)' },
      { id: 'gpt-oss', name: 'GPT OSS 120B (High Capacity)' },
      { id: 'qwen3', name: 'Qwen 3 32B (Coding/Logic)' }
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

export default function ModelSelector({ 
  selectedProvider, 
  setSelectedProvider, 
  selectedModel, 
  setSelectedModel 
}) {
  
  // Handle provider change and automatically select its first available model
  const handleProviderChange = (e) => {
    const newProvider = e.target.value;
    setSelectedProvider(newProvider);
    
    const providerData = AVAILABLE_PROVIDERS.find(p => p.id === newProvider);
    if (providerData && providerData.models.length > 0) {
      setSelectedModel(providerData.models[0].id);
    }
  };

  // Find models for the currently active provider
  const activeProviderData = AVAILABLE_PROVIDERS.find(p => p.id === selectedProvider);
  const modelsToDisplay = activeProviderData ? activeProviderData.models : [];

  return (
    <div className="flex flex-col sm:flex-row gap-3 p-3 bg-gray-900 rounded-xl border border-gray-800 shadow-md">
      
      {/* PROVIDER SELECTOR */}
      <div className="flex-1 relative">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 px-1">
          AI Engine
        </label>
        <div className="relative flex items-center">
          <Cpu className="absolute left-3 w-4 h-4 text-indigo-400 pointer-events-none" />
          <select
            value={selectedProvider}
            onChange={handleProviderChange}
            className="w-full pl-9 pr-8 py-2 bg-gray-950 text-gray-100 rounded-lg border border-gray-800 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer text-sm font-medium transition-colors"
          >
            {AVAILABLE_PROVIDERS.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* MODEL SELECTOR */}
      <div className="flex-1 relative">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 px-1">
          Model Variant
        </label>
        <div className="relative flex items-center">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full pl-4 pr-8 py-2 bg-gray-950 text-gray-100 rounded-lg border border-gray-800 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer text-sm font-medium transition-colors"
          >
            {modelsToDisplay.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

    </div>
  );
}