import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Clock, Zap, Flame, Target, History } from 'lucide-react';
import { useStudy } from '../components/StudyContext'; 

export default function AnalyticsPage() {
  const { studyData, currentStreak, sessionsCompleted, studyHistory } = useStudy();

  const totalHours = studyData.reduce((acc, curr) => acc + curr.hours, 0).toFixed(1);

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500">
      
      <div>
        <h1 className="text-4xl font-bold text-gray-100 tracking-tight flex items-center gap-3">
          Analytics 📅
        </h1>
        <p className="text-gray-400 mt-2">Weekly productivity dashboard.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        
        <div className="bg-[#111111] border border-gray-800/60 p-4 md:p-6 rounded-2xl shadow-lg flex items-center gap-4 overflow-hidden">
          <div className="p-3 md:p-4 bg-indigo-600/20 rounded-xl text-indigo-400 shrink-0">
            <Clock className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div className="min-w-0 flex-1"> 
            <p className="text-xs md:text-sm text-gray-400 font-medium uppercase tracking-wider truncate">Hours Studied</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-100 truncate">{totalHours}h</p>
          </div>
        </div>

        <div className="bg-[#111111] border border-gray-800/60 p-4 md:p-6 rounded-2xl shadow-lg flex items-center gap-4 overflow-hidden">
          <div className="p-3 md:p-4 bg-amber-600/20 rounded-xl text-amber-400 shrink-0">
            <Target className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs md:text-sm text-gray-400 font-medium uppercase tracking-wider truncate">Sessions Completed</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-100 truncate">{sessionsCompleted}</p>
          </div>
        </div>

        <div className="bg-[#111111] border border-gray-800/60 p-4 md:p-6 rounded-2xl shadow-lg flex items-center gap-4 overflow-hidden">
          <div className="p-3 md:p-4 bg-red-600/20 rounded-xl text-red-400 shrink-0">
            <Flame className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs md:text-sm text-gray-400 font-medium uppercase tracking-wider truncate">Current Streak</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-100 truncate">
              {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}
            </p>
          </div>
        </div>

      </div>

      {/* The Chart */}
      <div className="bg-[#111111] p-8 rounded-3xl border border-gray-800/60 h-[400px] shadow-xl">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={studyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis dataKey="day" stroke="#6b7280" tick={{ fill: '#9ca3af' }} tickMargin={10} />
            <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af' }} tickFormatter={(val) => `${val}h`} />
            <Tooltip 
              cursor={{ fill: '#1f2937' }}
              contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #1f2937', borderRadius: '12px', color: '#f3f4f6' }} 
            />
            <Bar dataKey="hours" fill="#4f46e5" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent History Table */}
      <div className="bg-[#111111] border border-gray-800/60 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-800/60 flex items-center gap-3">
          <History className="w-5 h-5 text-gray-400" />
          <h2 className="text-xl font-bold text-gray-100">Recent Sessions</h2>
        </div>
        
        <div className="divide-y divide-gray-800/60">
          {studyHistory.map((session) => (
            <div key={session.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-[#161616] transition-colors gap-4">
              <div>
                <p className="text-gray-100 font-medium">{session.topic}</p>
                
                {/* 👈 NEW: Render Metadata Tags if it's a Chat Session */}
                {(session.docs || session.provider) && (
                  <div className="flex flex-wrap gap-2 mt-2 mb-1 text-xs font-mono text-gray-500">
                    {session.docs && (
                      <span className="bg-gray-900 px-2 py-1 rounded border border-gray-800">
                        Doc: {session.docs}
                      </span>
                    )}
                    {session.provider && session.model && (
                      <span className="bg-gray-900 px-2 py-1 rounded border border-gray-800">
                        AI: {session.provider} / {session.model}
                      </span>
                    )}
                  </div>
                )}

                <p className="text-sm text-gray-500 mt-1">{session.date}</p>
              </div>
              
              {/* Conditional Rendering based on session type */}
              {session.duration ? (
                // It's a Timer Session
                <div className="bg-gray-900 border border-gray-800 px-4 py-2 rounded-lg text-sm font-mono text-indigo-400 shrink-0">
                  {session.duration} mins
                </div>
              ) : (
                // It's a Chat Session
                <div className="bg-indigo-900/20 border border-indigo-800/30 px-4 py-2 rounded-lg text-sm font-mono text-indigo-400 shrink-0 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Chat Session
                </div>
              )}
              
            </div>
          ))}
          
          {studyHistory.length === 0 && (
            <div className="p-10 text-center text-gray-500">
              No sessions recorded yet. Time to hit the books!
            </div>
          )}
        </div>
      </div>

    </div>
  );
}