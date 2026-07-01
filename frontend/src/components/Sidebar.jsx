import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { MessageSquare, Clock, Calendar, Circle, X, LogOut, User, Plus, ChevronLeft, ChevronRight, Hash } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useStudy } from './StudyContext'; 

export default function Sidebar({ isOpen, setIsOpen, user, handleLogout, handleLoginSuccess }) {
  const { startNewChat, sessionMetadata, loadSession, sessionId, setSessionMetadata } = useStudy();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch session history from Render backend
  useEffect(() => {
    const fetchHistory = async () => {
      const userEmail = user?.email || 'guest';
      try {
        const response = await fetch(`https://ai-study-space-backend.onrender.com/api/sessions/metadata/${userEmail}`);
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
      w-64 ${isCollapsed ? 'md:w-20' : 'md:w-64'} 
      bg-zinc-950 border-r border-zinc-800 flex flex-col h-[100dvh] text-zinc-100 shadow-2xl md:shadow-none`}
    >
      
      {/* Header */}
      <div className={`p-6 flex items-center ${isCollapsed ? 'md:justify-center justify-between' : 'justify-between'} border-b border-zinc-800 shrink-0`}>
        <div className={`text-xl font-bold text-indigo-400 flex items-center gap-2 ${isCollapsed ? 'md:hidden flex' : 'flex'}`}>
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
          className={`flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl transition-all font-medium active:scale-95 ${isCollapsed ? 'md:w-14 md:mx-auto w-full' : 'w-full'}`}
          title="New Chat"
        >
          <Plus className="w-5 h-5" />
          <span className={isCollapsed ? 'md:hidden block' : 'block'}>New Chat</span>
        </button>
      </div>
      
      {/* Scrollable Middle Section (Nav + History) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        
        {/* Main Nav */}
        <nav className="px-3 pt-4 pb-6 space-y-1 shrink-0 border-b border-zinc-800/50">
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
                  } ${isCollapsed ? 'md:justify-center justify-start' : 'justify-start'}`
                }
              >
                <Icon className={`w-5 h-5 ${isCollapsed ? 'md:mr-0 mr-3' : 'mr-3'}`} /> 
                <span className={isCollapsed ? 'md:hidden block' : 'block'}>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Recent Sessions */}
        <div className="p-3 space-y-1">
        <div className={`text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3 px-3 ${isCollapsed ? 'md:hidden block' : 'block'}`}>Recent</div>
        
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
              } ${isCollapsed ? 'md:justify-center justify-start' : 'justify-start'}`}
            >
              <Hash className={`w-4 h-4 shrink-0 ${isCollapsed ? 'md:mr-0 mr-3' : 'mr-3'} opacity-50 group-hover:opacity-100`} />
              <span className={`truncate ${isCollapsed ? 'md:hidden block' : 'block'}`}>{session.topic || "New Study Session"}</span>
            </button>
          ))
        ) : (
          <div className={`flex flex-col items-center justify-center h-32 opacity-50 ${isCollapsed ? 'md:hidden flex' : 'flex'}`}>
             <Clock className="w-5 h-5 mb-2 text-zinc-500" />
             <p className="text-xs text-zinc-500">No recent history</p>
          </div>
        )}
        </div>
      </div>
      
      {/* Footer / Toggle Section */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-950/50 shrink-0">
        <button 
           onClick={() => setIsCollapsed(!isCollapsed)}
           className="hidden md:flex w-full items-center justify-center p-2 mb-3 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 rounded-lg transition-colors"
        >
           {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>

        {user ? (
          <div className={`flex items-center gap-3 ${isCollapsed ? 'md:justify-center justify-start' : 'justify-start'}`}>
            <img src={user.picture} alt="Profile" className="w-9 h-9 rounded-full border border-zinc-700 shrink-0" />
            <div className={`flex-col ${isCollapsed ? 'md:hidden flex' : 'flex'}`}>
              <p className="text-sm font-medium text-zinc-200 truncate max-w-[120px]">{user.name}</p>
              <button onClick={handleLogout} className="text-[10px] text-red-400 hover:text-red-300 w-fit">Sign Out</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className={isCollapsed ? 'md:hidden block text-center mb-2' : 'block text-center mb-2'}>
               <p className="text-xs text-zinc-500">Sign in to save progress</p>
            </div>
            <div className="flex justify-center w-full overflow-hidden">
              <GoogleLogin 
                onSuccess={handleLoginSuccess} 
                onError={() => console.log('Login Failed')} 
                theme="filled_black" 
                shape="circle" 
                type={(isCollapsed && !isMobile) ? 'icon' : 'standard'}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}