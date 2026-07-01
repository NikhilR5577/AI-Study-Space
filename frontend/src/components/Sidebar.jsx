import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { MessageSquare, Clock, Calendar, Circle, X, LogOut, User, Plus, ChevronLeft, ChevronRight, Hash } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useStudy } from './StudyContext'; 

export default function Sidebar({ isOpen, setIsOpen, user, handleLogout, handleLoginSuccess }) {
  const { startNewChat, sessionMetadata, loadSession, sessionId, setSessionMetadata } = useStudy();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const navigate = useNavigate();

  // Fetch session history from Render backend
  useEffect(() => {
    const fetchHistory = async () => {
      const userEmail = user?.email || 'guest';
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/sessions/metadata/${userEmail}`);
        const result = await response.json();
        if (result.status === 'success') {
           setSessionMetadata(result.data);
        }
      } catch (err) {
        console.error("Failed to fetch session history:", err);
      }
    };
    
    fetchHistory();
  }, [user, setSessionMetadata]);

  const navItems = [
    { path: '/chat', label: 'Chat', icon: MessageSquare },
    { path: '/focus', label: 'Focus Timer', icon: Clock },
    { path: '/graph', label: 'Knowledge Graph', icon: Circle },
    { path: '/analytics', label: 'Analytics', icon: Calendar },
  ];

  const handleHistoryClick = (targetSessionId) => {
    loadSession(targetSessionId);
    navigate('/chat');
    if (window.innerWidth < 768) setIsOpen(false);
  };

  return (
    <div 
      className={`fixed inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
      md:relative md:translate-x-0 transition-all duration-300 ease-in-out z-50 
      ${isCollapsed ? 'md:w-20' : 'md:w-64'} 
      bg-zinc-950 border-r border-zinc-800 flex flex-col h-[100dvh] text-zinc-100 shadow-2xl md:shadow-none`}
    >
      
      {/* Header */}
      <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} border-b border-zinc-800 shrink-0`}>
        <div className={`text-xl font-bold text-indigo-400 flex items-center gap-2 ${isCollapsed ? 'hidden' : 'flex'}`}>
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">S</div>
          <span>Study Space</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="md:hidden text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 pt-4 shrink-0">
        <button 
          onClick={() => { startNewChat(); navigate('/chat'); if (window.innerWidth < 768) setIsOpen(false); }}
          className={`flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl transition-all font-medium active:scale-95 ${isCollapsed ? 'w-14 mx-auto' : 'w-full'}`}
          title="New Chat"
        >
          <Plus className="w-5 h-5" />
          <span className={isCollapsed ? 'hidden' : 'block'}>New Chat</span>
        </button>
      </div>
      
      {/* Main Nav */}
      <nav className={`mt-4 px-3 space-y-1 shrink-0 border-b border-zinc-800/50 pb-6 ${isCollapsed ? 'items-center' : ''}`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)} 
              className={({ isActive }) =>
                `flex items-center p-3 rounded-xl transition-all ${
                  isActive ? 'bg-zinc-900 text-indigo-400 font-medium' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-100'
                } ${isCollapsed ? 'justify-center' : ''}`
              }
            >
              <Icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} /> 
              <span className={isCollapsed ? 'hidden' : 'block'}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Recent Sessions */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1 min-h-0 ${isCollapsed ? 'items-center' : ''}`}>
        {!isCollapsed && (
          <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3 px-3">Recent</div>
        )}
        
        {sessionMetadata && sessionMetadata.length > 0 ? (
          sessionMetadata.map((session) => (
            <button
              key={session.sessionId}
              onClick={() => handleHistoryClick(session.sessionId)}
              title={session.topic}
              className={`w-full flex items-center p-3 rounded-xl transition-colors text-sm group ${
                session.sessionId === sessionId
                  ? 'bg-zinc-900 text-indigo-400'
                  : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'
              } ${isCollapsed ? 'justify-center' : ''}`}
            >
              <Hash className={`w-4 h-4 ${isCollapsed ? '' : 'mr-3'} opacity-50 group-hover:opacity-100`} />
              <span className={`truncate ${isCollapsed ? 'hidden' : 'block'}`}>{session.topic || "New Study Session"}</span>
            </button>
          ))
        ) : (
          !isCollapsed && <p className="text-xs text-zinc-700 px-4 italic">No recent history</p>
        )}
      </div>
      
      {/* Footer / Toggle Section */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-950/50 shrink-0">
        <button 
           onClick={() => setIsCollapsed(!isCollapsed)}
           className="w-full flex items-center justify-center p-2 mb-3 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 rounded-lg transition-colors"
        >
           {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>

        {user ? (
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <img src={user.picture} alt="Profile" className="w-9 h-9 rounded-full border border-zinc-700 shrink-0" />
            <div className={`flex-col ${isCollapsed ? 'hidden' : 'flex'}`}>
              <p className="text-sm font-medium text-zinc-200 truncate max-w-[120px]">{user.name}</p>
              <button onClick={handleLogout} className="text-[10px] text-red-400 hover:text-red-300 w-fit">Sign Out</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className={isCollapsed ? 'hidden' : 'block text-center mb-2'}>
               <p className="text-xs text-zinc-500">Sign in to save progress</p>
            </div>
            <GoogleLogin onSuccess={handleLoginSuccess} onError={() => console.log('Login Failed')} theme="filled_black" shape="circle" />
          </div>
        )}
      </div>
    </div>
  );
}