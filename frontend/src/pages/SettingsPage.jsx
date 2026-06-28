import React from 'react';
import { Settings, Moon, Sun, Cpu, Thermometer, Database } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold text-gray-100 tracking-tight">Settings</h1>
        <p className="text-gray-400 mt-2">Configure your AI engine and dashboard preferences.</p>
      </div>

      {/* Model Defaults Section */}
      <div className="bg-[#111111] p-8 rounded-3xl border border-gray-800/60 shadow-lg space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Cpu className="w-6 h-6 text-indigo-400" />
          <h2 className="text-xl font-semibold text-gray-200">Model Defaults</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Default Provider</label>
            <select className="w-full bg-[#0a0a0a] border border-gray-800 rounded-xl p-3 text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none">
              <option>Mistral</option>
              <option>Groq</option>
              <option>Gemini</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Temperature</label>
            <div className="flex items-center gap-4">
              <input type="range" min="0" max="1" step="0.1" defaultValue="0.3" className="flex-1 accent-indigo-500" />
              <span className="font-mono text-indigo-400 font-bold">0.3</span>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Section */}
      <div className="bg-[#111111] p-8 rounded-3xl border border-gray-800/60 shadow-lg space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Database className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-semibold text-gray-200">Appearance</h2>
        </div>

        <div className="flex gap-4">
          <button className="flex-1 flex items-center justify-center gap-3 p-4 bg-gray-800 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-700 transition-all">
            <Moon className="w-5 h-5" /> Dark Mode
          </button>
          <button className="flex-1 flex items-center justify-center gap-3 p-4 bg-[#0a0a0a] rounded-xl border border-gray-800 text-gray-500 hover:text-gray-300 transition-all">
            <Sun className="w-5 h-5" /> Light Mode
          </button>
        </div>
      </div>
    </div>
  );
}