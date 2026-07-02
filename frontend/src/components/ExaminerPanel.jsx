import React, { useState } from 'react';
import { Brain, HelpCircle, CheckCircle, XCircle, ChevronRight, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ExaminerPanel({ sessionId, userId, provider, model, onClose }) {
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // {questionId: optionText}
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Start exam generation
  const startExam = async () => {
    setLoading(true);
    setQuiz(null);
    setError('');
    setSubmitted(false);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});

    try {
      const res = await api.post('/api/exam/generate', {
        session_id: sessionId,
        user_email: userId || 'guest',
        provider,
        model
      });

      if (res.data && res.data.questions?.length > 0) {
        setQuiz(res.data);
      } else {
        setError('No questions could be generated. Make sure you have uploaded files in this session.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to generate quiz. Please ensure you have uploaded documents.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId, option) => {
    if (submitted) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const calculateScore = () => {
    let score = 0;
    quiz.questions.forEach(q => {
      if (selectedAnswers[q.id] === q.correct_answer) {
        score += 1;
      }
    });
    return score;
  };

  const handleSubmitQuiz = async () => {
    // Ensure all questions are answered
    const unanswered = quiz.questions.filter(q => !selectedAnswers[q.id]);
    if (unanswered.length > 0) {
      toast.error(`Please answer all questions before submitting.`);
      return;
    }

    setSubmitted(true);
    const score = calculateScore();

    // Log wrong answers to IDK tracker
    const incorrectQuestions = [];
    quiz.questions.forEach(q => {
      const userAnswer = selectedAnswers[q.id];
      if (userAnswer !== q.correct_answer) {
        incorrectQuestions.push({
          question: q.question,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          user_answer: userAnswer
        });
      }
    });

    try {
      await api.post('/api/exam/record', {
        session_id: sessionId,
        user_email: userId || 'guest',
        score,
        total_questions: quiz.questions.length,
        incorrect_questions: incorrectQuestions
      });
      toast.success(`Quiz completed! Score: ${score}/${quiz.questions.length}`);
    } catch (err) {
      console.error("Failed to log quiz result:", err);
    }
  };

  // Automatically start exam when panel opens if quiz isn't loaded
  React.useEffect(() => {
    startExam();
  }, [sessionId]);

  const currentQuestion = quiz?.questions[currentQuestionIndex];

  return (
    <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-xl z-30 flex flex-col p-4 md:p-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80 mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose} 
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition-all"
            title="Back to chat"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-zinc-100 tracking-tight">AI Examiner Mode</h2>
          </div>
        </div>
        {quiz && !loading && (
          <button 
            onClick={startExam} 
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition-all flex items-center gap-2 text-xs font-bold"
            title="Regenerate quiz"
          >
            <RefreshCw className="w-4 h-4" /> Reset Exam
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col min-h-0 items-center justify-center">
        
        {loading && (
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
              <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin" />
            </div>
            <div>
              <p className="text-base font-bold text-zinc-200">Generating AI Quiz...</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">Analyzing document context vectors and constructing questions.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center text-center max-w-sm gap-4">
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-200">Unable to generate quiz</h3>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">{error}</p>
            </div>
            <button 
              onClick={startExam} 
              className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 rounded-xl text-sm font-bold transition-all"
            >
              Try Again
            </button>
          </div>
        )}

        {quiz && currentQuestion && (
          <div className="w-full max-w-2xl flex-grow flex flex-col min-h-0">
            {/* Progress indicators */}
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div className="flex items-center gap-1">
                {quiz.questions.map((q, idx) => {
                  const isCurrent = idx === currentQuestionIndex;
                  const isAnswered = selectedAnswers[q.id] !== undefined;
                  return (
                    <div 
                      key={q.id} 
                      className={`h-1.5 w-10 rounded-full transition-all ${
                        isCurrent 
                          ? 'bg-indigo-500' 
                          : isAnswered 
                            ? 'bg-zinc-700' 
                            : 'bg-zinc-900'
                      }`}
                    />
                  );
                })}
              </div>
              <span className="text-xs font-bold text-zinc-500 font-mono">
                {currentQuestionIndex + 1} of {quiz.questions.length}
              </span>
            </div>

            {/* Question Box */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6 min-h-0 select-text">
              <div className="bg-zinc-900/30 border border-zinc-800/50 p-6 rounded-2xl">
                <div className="flex gap-3">
                  <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-zinc-200 font-semibold leading-relaxed">
                    {currentQuestion.question}
                  </p>
                </div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options.map((option, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isSelected = selectedAnswers[currentQuestion.id] === option;
                  const isCorrect = option === currentQuestion.correct_answer;
                  const wasSelected = selectedAnswers[currentQuestion.id] === option;

                  let borderStyle = 'border-zinc-800/60 bg-zinc-900/10 hover:border-zinc-700';
                  let icon = null;

                  if (isSelected && !submitted) {
                    borderStyle = 'border-indigo-500 bg-indigo-500/5 text-indigo-300';
                  }

                  if (submitted) {
                    if (isCorrect) {
                      borderStyle = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400';
                      icon = <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />;
                    } else if (wasSelected) {
                      borderStyle = 'border-red-500/50 bg-red-500/10 text-red-400';
                      icon = <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
                    } else {
                      borderStyle = 'border-zinc-900 bg-zinc-950/20 opacity-50';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(currentQuestion.id, option)}
                      disabled={submitted}
                      className={`flex items-center gap-4 p-4 rounded-xl border text-left text-sm font-medium transition-all ${borderStyle}`}
                    >
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold border shrink-0 ${
                        isSelected && !submitted
                          ? 'border-indigo-400 bg-indigo-500/20 text-indigo-300'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-500'
                      }`}>
                        {letter}
                      </span>
                      <span className="flex-1 truncate">{option}</span>
                      {icon}
                    </button>
                  );
                })}
                
                {/* Explicit I Don't Know Button */}
                {!submitted && (
                  <button
                    onClick={() => handleSelectOption(currentQuestion.id, "I Don't Know")}
                    className={`flex items-center justify-center gap-2 p-3 mt-2 rounded-xl border text-sm font-bold transition-all border-dashed
                      ${selectedAnswers[currentQuestion.id] === "I Don't Know" 
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' 
                        : 'border-zinc-700 hover:border-amber-500/50 hover:bg-amber-500/5 hover:text-amber-400 text-zinc-500'}`}
                  >
                    <HelpCircle className="w-4 h-4" /> I Don't Know (Flag for Review)
                  </button>
                )}
              </div>

              {/* Explanation (only shown after submit) */}
              {submitted && (
                <div className="bg-indigo-500/5 border border-indigo-500/20 p-5 rounded-xl space-y-2 animate-in slide-in-from-bottom-2 duration-300">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Explanation
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans select-text">
                    {currentQuestion.explanation}
                  </p>
                </div>
              )}
            </div>

            {/* Footer Navigation Controls */}
            <div className="pt-6 border-t border-zinc-800/80 flex items-center justify-between shrink-0">
              <button
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {submitted ? (
                currentQuestionIndex < quiz.questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                  >
                    Next Question <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-lg text-xs font-bold transition-all"
                  >
                    Finish Review
                  </button>
                )
              ) : (
                currentQuestionIndex < quiz.questions.length - 1 ? (
                  <button
                    disabled={!selectedAnswers[currentQuestion.id]}
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-900 disabled:text-zinc-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 disabled:cursor-not-allowed"
                  >
                    Next Question <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    disabled={Object.keys(selectedAnswers).length < quiz.questions.length}
                    onClick={handleSubmitQuiz}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-900 disabled:text-zinc-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-900/20 disabled:cursor-not-allowed"
                  >
                    Submit Quiz
                  </button>
                )
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
