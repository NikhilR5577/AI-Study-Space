import React from 'react';
import { NavLink } from 'react-router-dom';
import { MessageSquare, Clock, Calendar, Circle, X, LogOut, User, Plus } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useStudy } from './StudyContext'; 

export default function Sidebar({ isOpen, setIsOpen, user, handleLogout, handleLoginSuccess }) {
  const { startNewChat } = useStudy();

  const navItems = [
    { path: '/chat', label: 'Chat', icon: MessageSquare },
    { path: '/focus', label: 'Focus Timer', icon: Clock },
    { path: '/graph', label: 'Knowledge Graph', icon: Circle },
    { path: '/analytics', label: 'Analytics', icon: Calendar },
  ];

  return (
    <div className={`fixed inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out z-50 w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-[100dvh] text-gray-100 shadow-2xl md:shadow-none`}>
      
      <div className="p-6 flex items-center justify-between border-b border-gray-800">
        <div className="text-2xl font-bold text-indigo-400">
          📚 Study Space
        </div>
        <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-400 hover:text-white bg-gray-800 p-1.5 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 pt-4 flex-none">
        <button 
          onClick={() => {
            startNewChat();
            if (window.innerWidth < 768) setIsOpen(false);
          }}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl transition-all font-medium shadow-lg shadow-indigo-900/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          New Chat
        </button>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)} 
              className={({ isActive }) =>
                `w-full flex items-center p-3 rounded-lg transition-colors ${
                  isActive ? 'bg-indigo-600/10 text-indigo-400 font-medium' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                }`
              }
            >
              <Icon className="w-5 h-5 mr-3" /> 
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      
      {/* --- User Profile / Login Bottom Section (Pinned with flex-none) --- */}
      <div className="p-4 border-t border-gray-800 bg-gray-950/30 flex-none min-h-[80px]">
        {user ? (
          <div className="flex items-center gap-3">
            <img 
              src={user.picture} 
              alt="Profile" 
              className="w-10 h-10 rounded-full border border-gray-700 shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{user.name}</p>
              <button 
                onClick={handleLogout}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 mt-1 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 px-2">
              <div className="p-2 bg-gray-800 rounded-full border border-gray-700">
                <User className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200">Guest Mode</p>
                <p className="text-xs text-gray-500">Data not saved</p>
              </div>
            </div>
            
            <div className="w-full flex justify-center scale-90 mt-1">
               <GoogleLogin 
                  onSuccess={handleLoginSuccess}
                  onError={() => console.log('Login Failed')}
                  theme="filled_black"
                  shape="pill"
                  text="signin"
               />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}