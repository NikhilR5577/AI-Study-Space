import React, { useState, useMemo } from 'react';
import { Target, Plus, Trash2, CalendarClock, TrendingUp } from 'lucide-react';

export default function GoalTracker({ goals, setGoals, studyHistory }) {
  const [newTopic, setNewTopic] = useState('');
  const [newTargetHours, setNewTargetHours] = useState('');
  const [newDeadline, setNewDeadline] = useState('');

  const handleAddGoal = (e) => {
    e.preventDefault();
    if (!newTopic || !newTargetHours) return;

    const newGoal = {
      id: crypto.randomUUID(),
      topic: newTopic,
      targetHours: parseFloat(newTargetHours),
      deadline: newDeadline || null,
      createdAt: new Date().toISOString()
    };

    setGoals(prev => [...prev, newGoal]);
    setNewTopic('');
    setNewTargetHours('');
    setNewDeadline('');
  };

  const handleDeleteGoal = (id) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const calculateProgress = (topic) => {
    if (!studyHistory) return 0;
    const topicMatches = studyHistory.filter(s => 
      s.topic.toLowerCase().includes(topic.toLowerCase())
    );
    const totalMinutes = topicMatches.reduce((acc, curr) => acc + (curr.duration || 0), 0);
    return totalMinutes / 60;
  };

  return (
    <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-4 sm:p-6 mb-6">
      <div className="flex items-center gap-2.5 mb-6">
        <Target className="w-5 h-5 text-indigo-400" />
        <h2 className="text-white text-base sm:text-lg font-semibold">
          Study Goal Tracker
        </h2>
      </div>

      <form onSubmit={handleAddGoal} className="flex flex-col sm:flex-row gap-3 mb-6 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/60">
        <input 
          type="text"
          placeholder="Topic (e.g., 'React', 'Networking')"
          className="flex-1 bg-zinc-900 border border-zinc-700/50 text-sm text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 placeholder-zinc-600"
          value={newTopic}
          onChange={e => setNewTopic(e.target.value)}
        />
        <input 
          type="number"
          step="0.5"
          placeholder="Target (Hours)"
          className="w-full sm:w-32 bg-zinc-900 border border-zinc-700/50 text-sm text-white px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 placeholder-zinc-600"
          value={newTargetHours}
          onChange={e => setNewTargetHours(e.target.value)}
        />
        <input 
          type="date"
          className="w-full sm:w-40 bg-zinc-900 border border-zinc-700/50 text-sm text-zinc-300 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
          value={newDeadline}
          onChange={e => setNewDeadline(e.target.value)}
        />
        <button 
          type="submit"
          disabled={!newTopic || !newTargetHours}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>

      {goals.length > 0 ? (
        <div className="space-y-4">
          {goals.map(goal => {
            const currentHours = calculateProgress(goal.topic);
            const progressPercent = Math.min(100, Math.round((currentHours / goal.targetHours) * 100));
            const isCompleted = progressPercent >= 100;

            return (
              <div key={goal.id} className="relative overflow-hidden bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 transition-all">
                {/* Progress bar background */}
                <div 
                  className={`absolute top-0 left-0 bottom-0 opacity-10 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                  style={{ width: `${progressPercent}%`, transition: 'width 1s ease-in-out' }} 
                />
                
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-zinc-100 font-bold text-sm sm:text-base flex items-center gap-2">
                      {goal.topic}
                      {isCompleted && <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] uppercase font-black tracking-wider">Completed</span>}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-xs font-medium text-zinc-500">
                      <span className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" /> 
                        {currentHours.toFixed(1)} / {goal.targetHours} hrs
                      </span>
                      {goal.deadline && (
                        <span className="flex items-center gap-1.5">
                          <CalendarClock className="w-3.5 h-3.5" /> 
                          {new Date(goal.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                        {progressPercent}%
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800/50 rounded-lg transition-colors"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 bg-zinc-950/30 rounded-xl border border-zinc-800/50 border-dashed">
          <Target className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-zinc-400">No active study goals.</p>
          <p className="text-xs text-zinc-500 mt-1">Set a target above to track your deep work progress.</p>
        </div>
      )}
    </div>
  );
}
