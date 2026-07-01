import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { Menu, BookOpen, Sparkles } from 'lucide-react';
import { Toaster } from 'react-hot-toast'; 

import Sidebar from './components/Sidebar';
import { StudyProvider, useStudy } from './components/StudyContext'; 

import ChatPage from './pages/ChatPage';
import FocusPage from './pages/FocusPage';
import GraphPage from './pages/GraphPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage'; 

// ==========================================
// Internal Layout Component 
// ==========================================
const MainLayout = ({ isSidebarOpen, setIsSidebarOpen, user, handleLogout, handleLoginSuccess }) => {
  return (
    <Router>
      <div className="flex h-[100dvh] w-full bg-[#050505] font-sans overflow-hidden relative">
        
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)} />
        )}
        
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} user={user} handleLogout={handleLogout} handleLoginSuccess={handleLoginSuccess} />
        
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          
          {/* THE UNIFIED GLOBAL TOP BAR (Now Clean and Minimal) */}
          <header className="flex-none flex items-center justify-between px-4 py-3 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/80 z-20 shadow-sm">
            
            {/* Left: Mobile Menu & Branding */}
            <div className="flex items-center gap-3 md:hidden">
              <button onClick={() => setIsSidebarOpen(true)} className="text-zinc-400 hover:text-white p-2 bg-zinc-900 rounded-xl transition-colors">
                <Menu className="w-5 h-5" />
              </button>
              <div className="text-lg font-extrabold text-indigo-400 tracking-tight">Study Space</div>
            </div>

            {/* Left: Desktop Breadcrumb/Status */}
            <div className="hidden md:flex items-center gap-2 text-zinc-500 font-medium text-xs uppercase tracking-widest">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Workspace Active</span>
            </div>

            {/* Right: Empty space for future global actions (e.g. Export, Share) */}
            <div className="flex items-center gap-3">
               {/* Model Selector removed from here. It now lives exclusively in ChatPage.jsx */}
            </div>
          </header>
          
          {/* THE FIX: Locked main wrapper so pages handle their own scrolling */}
          <main className="flex-1 overflow-hidden relative flex flex-col">
            <Routes>
              <Route path="/" element={<Navigate to="/chat" replace />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/focus" element={<FocusPage />} />
              <Route path="/graph" element={<GraphPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} /> 
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
};

// ==========================================
// MAIN APP COMPONENT
// ==========================================
export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user')) || null);
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem('isGuest') === 'true');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "570543164189-e7g3mvf73dkbh179p9j2i56bvhj49qv2.apps.googleusercontent.com";

  const handleLoginSuccess = (credentialResponse) => {
    const decoded = jwtDecode(credentialResponse.credential);
    setUser(decoded);
    setIsGuest(false);
    localStorage.setItem('user', JSON.stringify(decoded));
    localStorage.setItem('user_email', JSON.stringify(decoded.email)); 
    localStorage.removeItem('isGuest');
  };

  const handleGuestLogin = () => {
    setIsGuest(true);
    setUser(null);
    localStorage.setItem('isGuest', 'true');
    localStorage.removeItem('user');
    localStorage.setItem('user_email', JSON.stringify("guest")); 
  };

  const handleLogout = () => {
    setUser(null);
    setIsGuest(false);
    localStorage.clear(); 
  };

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#09090b',
            color: '#f4f4f5', 
            border: '1px solid #27272a', 
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          },
        }}
      />
      
      {!user && !isGuest ? (
        <div className="flex h-[100dvh] bg-[#050505] items-center justify-center font-sans px-4">
          <div className="bg-zinc-900/40 backdrop-blur-xl p-10 rounded-[2rem] border border-zinc-800/80 shadow-2xl max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 bg-zinc-950 rounded-full flex items-center justify-center mx-auto shadow-inner border border-zinc-800">
               <BookOpen className="w-10 h-10 text-indigo-500" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-zinc-100 tracking-tight">Study Space</h1>
              <p className="text-zinc-500 mt-2 font-medium">Your intelligent second brain.</p>
            </div>
            <div className="pt-6 space-y-4">
              <div className="flex justify-center transform hover:scale-105 transition-transform">
                <GoogleLogin 
                  onSuccess={handleLoginSuccess}
                  onError={() => console.log('Login Failed')}
                  theme="filled_black"
                  shape="pill"
                />
              </div>
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-zinc-800"></div>
                <span className="flex-shrink-0 mx-4 text-zinc-600 text-xs uppercase tracking-widest font-bold">or</span>
                <div className="flex-grow border-t border-zinc-800"></div>
              </div>
              <button onClick={handleGuestLogin} className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-full transition-colors border border-zinc-800 font-medium shadow-sm">
                Continue as Guest
              </button>
            </div>
          </div>
        </div>
      ) : (
        <StudyProvider userEmail={user ? user.email : (isGuest ? 'guest' : null)}> 
           <MainLayout 
             isSidebarOpen={isSidebarOpen} 
             setIsSidebarOpen={setIsSidebarOpen} 
             user={user} 
             handleLogout={handleLogout} 
             handleLoginSuccess={handleLoginSuccess} 
           />
        </StudyProvider>
      )}
    </GoogleOAuthProvider>
  );
}