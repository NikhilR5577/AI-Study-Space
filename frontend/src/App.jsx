import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { Menu, BookOpen } from 'lucide-react';
import Sidebar from './components/Sidebar';
import { StudyProvider } from './components/StudyContext'; 

import ChatPage from './pages/ChatPage';
import FocusPage from './pages/FocusPage';
import GraphPage from './pages/GraphPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage'; 

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user')) || null);
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem('isGuest') === 'true');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Use the env variable. If it's missing, use the hardcoded one for testing.
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
    localStorage.removeItem('user');
    localStorage.removeItem('isGuest');
    localStorage.removeItem('user_email'); 
    localStorage.removeItem('chatHistory');
    localStorage.removeItem('currentTopic');
    localStorage.removeItem('activeSources');
    localStorage.removeItem('graphData');
  };

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {!user && !isGuest ? (
        // Gateway Screen
        <div className="flex h-[100dvh] bg-gray-950 items-center justify-center font-sans px-4">
          <div className="bg-gray-900 p-10 rounded-3xl border border-gray-800 shadow-2xl max-w-md w-full text-center space-y-6">
            <BookOpen className="w-16 h-16 text-indigo-500 mx-auto" />
            <h1 className="text-3xl font-bold text-gray-100 tracking-tight">AI Study Space</h1>
            <p className="text-gray-400">Your intelligent second brain.</p>
            <div className="pt-6 space-y-5">
              <div className="flex justify-center">
                <GoogleLogin 
                  onSuccess={handleLoginSuccess}
                  onError={() => console.log('Login Failed')}
                  theme="filled_black"
                  shape="pill"
                />
              </div>
              <button onClick={handleGuestLogin} className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-full transition-colors border border-gray-700 font-medium">
                Continue as Guest
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Main App Layout
        <StudyProvider userEmail={user ? user.email : (isGuest ? 'guest' : null)}> 
          <Router>
            {/* Added h-[100dvh] and w-full to lock the main boundary to the screen */}
            <div className="flex h-[100dvh] w-full bg-gray-950 font-sans overflow-hidden relative">
              {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)} />
              )}
              <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} user={user} handleLogout={handleLogout} handleLoginSuccess={handleLoginSuccess} />
              
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Added flex-none to ensure the header is NEVER pushed off screen */}
                <header className="flex-none flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800 md:hidden z-10 shadow-md">
                  <div className="text-xl font-bold text-indigo-400 flex items-center gap-2">📚 Study Space</div>
                  <button onClick={() => setIsSidebarOpen(true)} className="text-gray-400 hover:text-white p-2 bg-gray-800 rounded-lg transition-colors"><Menu className="w-5 h-5" /></button>
                </header>
                
                <main className="flex-1 p-4 md:p-10 overflow-y-auto custom-scrollbar">
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
        </StudyProvider>
      )}
    </GoogleOAuthProvider>
  );
}