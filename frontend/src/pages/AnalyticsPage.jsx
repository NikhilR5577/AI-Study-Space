import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Clock, Zap, Flame, Target, History } from 'lucide-react';
import { useStudy } from '../components/StudyContext'; 

export default function AnalyticsPage() {
  const { studyData, currentStreak, sessionsCompleted, studyHistory } = useStudy();

  const totalHours = studyData.reduce((acc, curr) => acc + curr.hours, 0).toFixed(1);

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-10 animate-in fade-in duration-500 p-2 md:p-0">
      
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-100 tracking-tight flex items-center gap-3">
          Analytics 📅
        </h1>
        <p className="text-gray-400 mt-2 text-sm md:text-base">Weekly productivity dashboard.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="bg-[#111111] border border-gray-800/60 p-4 md:p-6 rounded-2xl shadow-lg flex items-center gap-4 overflow-hidden">
          <div className="p-3 bg-indigo-600/20 rounded-xl text-indigo-400 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1"> 
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider truncate">Hours Studied</p>
            <p className="text-xl md:text-3xl font-bold text-gray-100 truncate">{totalHours}h</p>
          </div>
        </div>

        <div className="bg-[#111111] border border-gray-800/60 p-4 md:p-6 rounded-2xl shadow-lg flex items-center gap-4 overflow-hidden">
          <div className="p-3 bg-amber-600/20 rounded-xl text-amber-400 shrink-0">
            <Target className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider truncate">Sessions</p>
            <p className="text-xl md:text-3xl font-bold text-gray-100 truncate">{sessionsCompleted}</p>
          </div>
        </div>

        <div className="bg-[#111111] border border-gray-800/60 p-4 md:p-6 rounded-2xl shadow-lg flex items-center gap-4 overflow-hidden">
          <div className="p-3 bg-red-600/20 rounded-xl text-red-400 shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider truncate">Current Streak</p>
            <p className="text-xl md:text-3xl font-bold text-gray-100 truncate">
              {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}
            </p>
          </div>
        </div>

      </div>

      {/* The Chart - FIX: Added overflow-x-auto wrapper and minWidth to container */}
      <div className="bg-[#111111] p-4 md:p-8 rounded-3xl border border-gray-800/60 h-[350px] md:h-[400px] shadow-xl overflow-x-auto custom-scrollbar">
        <ResponsiveContainer width="100%" height="100%" minWidth={500}>
          <BarChart data={studyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis dataKey="day" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12 }} tickMargin={10} />
            <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(val) => `${val}h`} />
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
            <div key={session.id} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-[#161616] transition-colors gap-3">
              <div>
                <p className="text-gray-100 font-medium text-sm md:text-base">{session.topic}</p>
                
                {(session.docs || session.provider) && (
                  <div className="flex flex-wrap gap-2 mt-2 text-[10px] md:text-xs font-mono text-gray-500">
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
                <p className="text-[10px] md:text-xs text-gray-500 mt-2">{session.date}</p>
              </div>
              
              {session.duration ? (
                <div className="bg-gray-900 border border-gray-800 px-3 py-1 rounded-lg text-xs md:text-sm font-mono text-indigo-400 shrink-0 w-fit">
                  {session.duration} mins
                </div>
              ) : (
                <div className="bg-indigo-900/20 border border-indigo-800/30 px-3 py-1 rounded-lg text-xs md:text-sm font-mono text-indigo-400 shrink-0 flex items-center gap-1.5 w-fit">
                  <Zap className="w-3 h-3" />
                  Chat
                </div>
              )}
            </div>
          ))}
          
          {studyHistory.length === 0 && (
            <div className="p-10 text-center text-gray-500 text-sm">
              No sessions recorded yet. Time to hit the books!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}