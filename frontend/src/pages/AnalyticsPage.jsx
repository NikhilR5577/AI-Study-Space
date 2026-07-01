import React, { useMemo, useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Clock,
  Target,
  Flame,
  FileText,
  Bot,
  Calendar,
  Timer,
  BarChart3,
  BookOpen,
  Brain,
  HelpCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useStudy } from '../components/StudyContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import GoalTracker from '../components/GoalTracker';

/* ───────────────────────── helpers ───────────────────────── */

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getTodayIndex() {
  return new Date().getDay();
}

function formatDuration(mins) {
  if (!mins && mins !== 0) return '—';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ───────────────────────── custom tooltip ───────────────────────── */

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const hours = payload[0].value || 0;
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  return (
    <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/60 rounded-xl px-4 py-3 shadow-2xl pointer-events-none">
      <p className="text-zinc-300 text-xs font-medium mb-1">{label}</p>
      <p className="text-white text-lg font-bold">
        {h > 0 ? `${h}h ` : ''}
        {m}m
      </p>
      <p className="text-zinc-500 text-xs mt-0.5">
        {hours.toFixed(1)} hours
      </p>
    </div>
  );
}

/* ───────────────────────── custom x-axis tick ───────────────────────── */

function CustomXAxisTick({ x, y, payload }) {
  const todayIdx = getTodayIndex();
  const dayIdx = DAY_LABELS.indexOf(payload.value);
  const isToday = dayIdx === todayIdx;

  return (
    <text
      x={x}
      y={y + 14}
      textAnchor="middle"
      className="pointer-events-none"
      fill={isToday ? '#a5b4fc' : '#71717a'}
      fontSize={12}
      fontWeight={isToday ? 700 : 400}
    >
      {payload.value}
    </text>
  );
}

/* ───────────────────────── metric card ───────────────────────── */

function MetricCard({ icon: Icon, label, value, color, glowColor }) {
  return (
    <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-4 sm:p-5 flex items-center gap-4">
      <div className="relative flex-shrink-0">
        <div
          className="absolute inset-0 rounded-xl blur-lg opacity-40"
          style={{ backgroundColor: glowColor }}
        />
        <div
          className="relative w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${glowColor}22` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">
          {label}
        </p>
        <p className="text-white text-xl sm:text-2xl font-bold mt-0.5 truncate">
          {value}
        </p>
      </div>
    </div>
  );
}

/* ───────────────────────── session item ───────────────────────── */

function SessionItem({ session }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3.5 border-b border-zinc-800/40 last:border-0">
      {/* Topic & date */}
      <div className="flex-1 min-w-0">
        <p className="text-zinc-100 text-sm font-medium truncate">
          {session.topic || 'Untitled Session'}
        </p>
        <div className="flex items-center gap-1.5 mt-1 text-zinc-500 text-xs">
          <Calendar className="w-3 h-3 flex-shrink-0" />
          <span>{formatDate(session.date)}</span>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Docs */}
        {session.docs && session.docs.length > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
            <FileText className="w-3 h-3" />
            {session.docs.length} doc{session.docs.length !== 1 ? 's' : ''}
          </span>
        )}

        {/* Model */}
        {session.model && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs">
            <Bot className="w-3 h-3" />
            {session.model}
          </span>
        )}

        {/* Provider */}
        {session.provider && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs truncate max-w-[120px]">
            {session.provider}
          </span>
        )}

        {/* Duration */}
        {session.duration != null && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
            <Timer className="w-3 h-3" />
            {formatDuration(session.duration)}
          </span>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── main page ───────────────────────── */

export default function AnalyticsPage() {
  const { studyData, currentStreak, sessionsCompleted, studyHistory, userId, studyGoals, setStudyGoals } =
    useStudy();

  const todayIdx = getTodayIndex();

  /* ───────────────────────── "I Don't Know" Spaced Repetition Tracker States ───────────────────────── */
  const [idkQuestions, setIdkQuestions] = useState([]);
  const [loadingIdk, setLoadingIdk] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // {questionId: optionText}
  const [checkedQuestions, setCheckedQuestions] = useState({}); // {questionId: true/false}

  const fetchIdkQuestions = async () => {
    if (!userId || userId === "guest") return;
    setLoadingIdk(true);
    try {
      const res = await api.get(`/api/exam/idk/${encodeURIComponent(userId)}`);
      if (res.data && res.data.questions) {
        setIdkQuestions(res.data.questions);
      }
    } catch (err) {
      console.error("Failed to fetch IDK questions:", err);
    } finally {
      setLoadingIdk(false);
    }
  };

  useEffect(() => {
    fetchIdkQuestions();
  }, [userId]);

  const handleSelectOption = (questionId, option) => {
    if (checkedQuestions[questionId]) return;
    setSelectedAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const handleCheckAnswer = async (q) => {
    const userAnswer = selectedAnswers[q.id];
    if (!userAnswer) return;

    const isCorrect = userAnswer === q.correct_answer;
    setCheckedQuestions(prev => ({ ...prev, [q.id]: true }));

    if (isCorrect) {
      toast.success("Correct! Removed from Review Deck.", { 
        style: { background: '#022c22', color: '#a7f3d0', border: '1px solid #064e3b' }
      });
      try {
        await api.post('/api/exam/idk/resolve', {
          user_email: userId,
          question: q.question
        });
        setTimeout(() => {
          setIdkQuestions(prev => prev.filter(item => item.id !== q.id));
        }, 1200);
      } catch (err) {
        console.error(err);
      }
    } else {
      toast.error("Incorrect. Review the explanation.");
    }
  };

  /* Prepare chart data: always show 7 days */
  const chartData = useMemo(() => {
    if (!studyData || studyData.length === 0) {
      return DAY_LABELS.map((d) => ({ day: d, hours: 0 }));
    }
    return studyData.map((d) => ({
      day: d.day,
      hours: typeof d.hours === 'number' ? d.hours : 0,
    }));
  }, [studyData]);

  /* Total hours this week */
  const totalHours = useMemo(
    () => chartData.reduce((acc, d) => acc + (d.hours || 0), 0),
    [chartData],
  );

  /* Sessions sorted by date descending */
  const sortedSessions = useMemo(() => {
    if (!studyHistory || studyHistory.length === 0) return [];
    return [...studyHistory].sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    );
  }, [studyHistory]);

  const hasChartData = chartData.some((d) => d.hours > 0);

  return (
    <div className="h-full w-full overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-6 p-4 pb-12">
        {/* ── Header ── */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Analytics
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Track your study progress and habits
          </p>
        </div>

        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <MetricCard
            icon={Clock}
            label="Hours This Week"
            value={totalHours.toFixed(1)}
            color="#818cf8"
            glowColor="#6366f1"
          />
          <MetricCard
            icon={Target}
            label="Sessions"
            value={sessionsCompleted ?? 0}
            color="#34d399"
            glowColor="#10b981"
          />
          <MetricCard
            icon={Flame}
            label="Day Streak"
            value={currentStreak ?? 0}
            color="#fb923c"
            glowColor="#f97316"
          />
        </div>

        {/* ── Study Goal Tracker ── */}
        <GoalTracker goals={studyGoals} setGoals={setStudyGoals} studyHistory={studyHistory} />

        {/* ── Weekly Study Chart ── */}
        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-4 sm:p-6">
          {/* Chart header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2.5">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              <h2 className="text-white text-base sm:text-lg font-semibold">
                Weekly Overview
              </h2>
            </div>
            <span className="text-zinc-400 text-xs sm:text-sm font-medium">
              {totalHours.toFixed(1)}h total
            </span>
          </div>

          {hasChartData ? (
            <div className="w-full h-52 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 4, right: 4, left: -20, bottom: 4 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="#27272a"
                    strokeOpacity={0.5}
                  />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={<CustomXAxisTick />}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#52525b', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 8 }}
                  />
                  <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {chartData.map((entry, index) => {
                      const dayIdx = DAY_LABELS.indexOf(entry.day);
                      const isToday = dayIdx === todayIdx;
                      const isEmpty = !entry.hours || entry.hours === 0;

                      let fill;
                      if (isEmpty) {
                        fill = 'rgba(63, 63, 70, 0.25)';
                      } else if (isToday) {
                        fill = '#818cf8'; // indigo-400
                      } else {
                        fill = 'rgba(79, 70, 229, 0.4)'; // indigo-600 @ 40%
                      }

                      return <Cell key={`cell-${index}`} fill={fill} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-52 sm:h-64 text-center">
              <BarChart3 className="w-10 h-10 text-zinc-700 mb-3" />
              <p className="text-zinc-500 text-sm">No study data yet</p>
              <p className="text-zinc-600 text-xs mt-1">
                Complete a study session to see your progress here
              </p>
            </div>
          )}
        </div>

        {/* ── Spaced Repetition Review Deck (IDK Tracker) ── */}
        {userId && userId !== "guest" && (
          <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <Brain className="w-5 h-5 text-indigo-400" />
              <h2 className="text-white text-base sm:text-lg font-semibold">
                Spaced Repetition Review Deck
              </h2>
              {idkQuestions.length > 0 && (
                <span className="ml-auto px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold animate-pulse">
                  {idkQuestions.length} pending
                </span>
              )}
            </div>
            
            {loadingIdk ? (
              <div className="flex items-center justify-center py-8 text-zinc-500 gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                <span className="text-xs font-semibold">Loading review items...</span>
              </div>
            ) : idkQuestions.length > 0 ? (
              <div className="space-y-3">
                {idkQuestions.map((q) => {
                  const isExpanded = expandedQuestionId === q.id;
                  const selectedAnswer = selectedAnswers[q.id];
                  const isChecked = checkedQuestions[q.id];
                  
                  return (
                    <div 
                      key={q.id} 
                      className={`border border-zinc-800 rounded-xl transition-all ${
                        isExpanded ? 'bg-zinc-900/40' : 'bg-transparent hover:border-zinc-700/60'
                      }`}
                    >
                      {/* Accordion Trigger */}
                      <button
                        onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                        className="w-full px-4 py-3.5 flex items-center justify-between text-left"
                      >
                        <div className="flex items-start gap-3 min-w-0 pr-4">
                          <HelpCircle className="w-4 h-4 text-indigo-400/80 shrink-0 mt-0.5" />
                          <span className="text-xs sm:text-sm font-medium text-zinc-200 truncate">{q.question}</span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
                        )}
                      </button>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-zinc-800/60 pt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                          {/* Options grid */}
                          <div className="grid grid-cols-1 gap-2">
                            {q.options.map((option, idx) => {
                              const letter = String.fromCharCode(65 + idx);
                              const isSel = selectedAnswer === option;
                              const isCorr = option === q.correct_answer;
                              
                              let borderClass = 'border-zinc-800/80 hover:border-zinc-700';
                              
                              if (isSel && !isChecked) borderClass = 'border-indigo-500 bg-indigo-500/5 text-indigo-300';
                              if (isChecked) {
                                if (isCorr) borderClass = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400';
                                else if (isSel) borderClass = 'border-red-500/50 bg-red-500/10 text-red-400';
                                else borderClass = 'border-zinc-900 opacity-40';
                              }

                              return (
                                <button
                                  key={idx}
                                  onClick={() => handleSelectOption(q.id, option)}
                                  disabled={isChecked}
                                  className={`flex items-center gap-3 p-3 rounded-lg border text-left text-xs sm:text-sm font-medium transition-all ${borderClass}`}
                                >
                                  <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold border shrink-0 ${
                                    isSel && !isChecked
                                      ? 'border-indigo-400 bg-indigo-500/20 text-indigo-300'
                                      : 'border-zinc-800 bg-zinc-950 text-zinc-500'
                                  }`}>
                                    {letter}
                                  </span>
                                  <span className="truncate">{option}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Controls & Feedback */}
                          <div className="flex items-center justify-between gap-4 pt-2">
                            {isChecked ? (
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
                                  {selectedAnswer === q.correct_answer ? (
                                    <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Correct Answer!</span>
                                  ) : (
                                    <span className="text-red-400 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Incorrect</span>
                                  )}
                                </div>
                                <p className="text-xs text-zinc-400 bg-indigo-500/5 border border-indigo-500/10 p-3 rounded-lg leading-relaxed select-text font-sans">
                                  {q.explanation}
                                </p>
                              </div>
                            ) : (
                              <>
                                <span className="text-[10px] text-zinc-600 font-medium">Select an option to test yourself.</span>
                                <button
                                  onClick={() => handleCheckAnswer(q)}
                                  disabled={!selectedAnswer}
                                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-900 disabled:text-zinc-600 text-white rounded-lg text-xs font-bold transition-all disabled:cursor-not-allowed"
                                >
                                  Check Answer
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CheckCircle2 className="w-9 h-9 text-emerald-500/30 mb-2.5" />
                <p className="text-zinc-400 text-sm font-semibold">Clean Slate!</p>
                <p className="text-zinc-600 text-xs mt-1 max-w-xs leading-relaxed">
                  No missed questions recorded. Complete AI exams in the Chat space to test your knowledge!
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Session Log ── */}
        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-4 sm:p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h2 className="text-white text-base sm:text-lg font-semibold">
              Session History
            </h2>
            {sortedSessions.length > 0 && (
              <span className="ml-auto text-zinc-500 text-xs">
                {sortedSessions.length} session
                {sortedSessions.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {sortedSessions.length > 0 ? (
            <div className="divide-y divide-zinc-800/40">
              {sortedSessions.map((session) => (
                <SessionItem key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="w-10 h-10 text-zinc-700 mb-3" />
              <p className="text-zinc-500 text-sm">No sessions recorded</p>
              <p className="text-zinc-600 text-xs mt-1">
                Your study sessions will appear here once you start learning
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}