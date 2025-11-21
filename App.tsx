import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AppStep, DecisionResult, QuestionSession, Answer, HistoryItem } from './types';
import { generateQuestions, generateDecision, generateFollowUpQuestions } from './services/gemini';
import Grain from './components/Grain';
import GlassCard from './components/GlassCard';
import Button from './components/Button';
import Loader from './components/Loader';

// Utility components for icons
const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-emerald-400">
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);

const XMarkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-rose-400">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

const QuestionMarkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-blue-200">
     <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
  </svg>
);

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.INPUT);
  const [topic, setTopic] = useState('');
  const [session, setSession] = useState<QuestionSession | null>(null);
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Focus ref for input
  const inputRef = useRef<HTMLInputElement>(null);

  // Load history on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('clarity_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  useEffect(() => {
    if (step === AppStep.INPUT && inputRef.current && !showHistory) {
      inputRef.current.focus();
    }
  }, [step, showHistory]);

  const addToHistory = (topic: string, result: DecisionResult) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      topic,
      result
    };
    const updatedHistory = [newItem, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('clarity_history', JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('clarity_history');
  };

  const handleStart = useCallback(async () => {
    if (!topic.trim()) return;
    
    setStep(AppStep.ANALYZING);
    setError(null);

    try {
      const questions = await generateQuestions(topic);
      setSession({
        topic,
        questions,
        answers: [],
        currentQuestionIndex: 0,
      });
      setStep(AppStep.QUESTIONS);
    } catch (err) {
      console.error(err);
      setError("We couldn't generate questions for that topic. Try rephrasing.");
      setStep(AppStep.INPUT);
    }
  }, [topic]);

  const handleAnswer = useCallback(async (answer: Answer) => {
    if (!session) return;

    const newAnswers = [...session.answers, answer];
    const nextIndex = session.currentQuestionIndex + 1;

    setSession(prev => prev ? {
      ...prev,
      answers: newAnswers,
      currentQuestionIndex: nextIndex
    } : null);

    if (nextIndex >= session.questions.length) {
      setStep(AppStep.CALCULATING);
      try {
        const decision = await generateDecision(session.topic, session.questions, newAnswers);
        setResult(decision);
        addToHistory(session.topic, decision);
        setStep(AppStep.RESULT);
      } catch (err) {
        console.error(err);
        setError("We encountered an issue finalizing your decision.");
        setStep(AppStep.RESULT); 
      }
    }
  }, [session, history]);

  const handleRefine = useCallback(async () => {
    if (!session) return;
    setStep(AppStep.ANALYZING); // Re-use analyzing step for "generating more questions" style
    try {
        const newQuestions = await generateFollowUpQuestions(session.topic, session.questions, session.answers);
        setSession(prev => prev ? {
            ...prev,
            questions: [...prev.questions, ...newQuestions],
            // currentQuestionIndex remains the same (which equals existing questions length), pointing to the first new question
        } : null);
        setStep(AppStep.QUESTIONS);
    } catch (err) {
        console.error(err);
        setError("We couldn't generate more questions. Showing current result.");
        setStep(AppStep.RESULT);
    }
  }, [session]);

  const resetApp = () => {
    setTopic('');
    setSession(null);
    setResult(null);
    setStep(AppStep.INPUT);
    setShowHistory(false);
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setTopic(item.topic);
    setResult(item.result);
    setStep(AppStep.RESULT);
    setShowHistory(false);
    // We don't have the Q&A session for historical items, so deeper analysis isn't available for old items in this simple version
    setSession(null); 
  };

  // --- Render Helpers ---

  const renderBackground = () => (
    <div className="fixed inset-0 z-[-1] bg-slate-950 overflow-hidden">
      {/* Organic Animated Gradients - Adjusted colors for visibility against dark bg */}
      <div className="absolute top-[-20%] left-[-10%] h-[800px] w-[800px] rounded-full bg-purple-600/30 blur-[120px] animate-blob mix-blend-screen" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[800px] w-[800px] rounded-full bg-blue-500/30 blur-[120px] animate-blob-reverse animation-delay-2000 mix-blend-screen" />
      <div className="absolute top-[30%] left-[50%] h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/30 blur-[100px] animate-blob animation-delay-4000 mix-blend-screen" />
      <div className="absolute bottom-[10%] left-[10%] h-[400px] w-[400px] rounded-full bg-teal-500/20 blur-[90px] animate-blob-reverse mix-blend-screen" />
      <Grain />
    </div>
  );

  const renderHeader = () => (
    <div className="fixed top-0 left-0 w-full z-50 p-6 flex justify-between items-start pointer-events-none">
      {/* Logo/Brand could go here if needed */}
      <div /> 
      
      {/* History Toggle */}
      {step === AppStep.INPUT && !showHistory && (
        <button 
          onClick={() => setShowHistory(true)}
          className="pointer-events-auto p-3 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-md"
          title="History"
        >
          <ClockIcon />
        </button>
      )}

       {showHistory && (
        <button 
          onClick={() => setShowHistory(false)}
          className="pointer-events-auto p-3 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-md"
        >
          <XMarkIcon />
        </button>
      )}
    </div>
  );

  const renderHistory = () => (
    <div className="w-full max-w-3xl animate-fade-in space-y-8 p-4 my-8">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-4xl text-white font-bold">History</h2>
        {history.length > 0 && (
           <button 
             onClick={clearHistory} 
             className="text-rose-300 hover:text-rose-200 text-sm flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
           >
             <TrashIcon /> Clear
           </button>
        )}
      </div>

      {history.length === 0 ? (
        <GlassCard className="text-center py-12 text-white/50">
          <p>No decisions made yet.</p>
          <Button variant="secondary" className="mt-4" onClick={() => setShowHistory(false)}>
            Start your first decision
          </Button>
        </GlassCard>
      ) : (
        <div className="grid gap-4">
          {history.map((item) => (
            <div 
              key={item.id} 
              onClick={() => loadHistoryItem(item)}
              className="group relative cursor-pointer"
            >
              <GlassCard className="!p-6 transition-transform duration-300 hover:scale-[1.02] hover:bg-white/10">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-white/40 uppercase tracking-wider">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </p>
                    <h3 className="text-lg font-medium text-white line-clamp-1">{item.topic}</h3>
                  </div>
                  <div className="text-right shrink-0">
                     <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-white border border-white/10">
                       {item.result.recommendation}
                     </span>
                  </div>
                </div>
              </GlassCard>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderInputStep = () => (
    <div className="w-full max-w-lg space-y-8 text-center animate-fade-in p-4">
      <div className="space-y-2">
        <h1 className="font-serif text-5xl md:text-6xl text-white tracking-tight">Clarity</h1>
        <p className="text-white/60">One minute. Clear mind. Better decisions.</p>
      </div>
      
      <GlassCard>
        <div className="space-y-6">
          <label htmlFor="decision-input" className="block text-left text-sm font-medium text-white/80">
            What's on your mind?
          </label>
          <input
            ref={inputRef}
            id="decision-input"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            placeholder="e.g., Should I quit my job to start a bakery?"
            className="w-full bg-transparent border-b border-white/20 py-3 text-xl text-white placeholder-white/20 focus:border-white focus:outline-none transition-colors"
            autoComplete="off"
          />
          {error && <p className="text-rose-400 text-sm">{error}</p>}
          <div className="pt-2 flex justify-end">
            <Button onClick={handleStart} disabled={!topic.trim()}>
              <span className="flex items-center gap-2">
                Start <ArrowRightIcon />
              </span>
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );

  const renderLoadingStep = (text: string) => (
    <Loader text={text} />
  );

  const renderQuestionStep = () => {
    if (!session) return null;
    const progress = ((session.currentQuestionIndex) / session.questions.length) * 100;

    return (
      <div className="w-full max-w-xl space-y-6 p-4">
         {/* Progress Bar */}
         <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-500 ease-out" 
              style={{ width: `${progress}%` }} 
            />
         </div>

        {/* Increased Gap (gap-16) for better separation */}
        <GlassCard className="flex flex-col gap-8 animate-fade-in" gap="flex flex-col gap-8 animate-fade-in">
          <div className="space-y-4">
            <p className="text-sm font-medium text-white/40 uppercase tracking-widest">
              Question {session.currentQuestionIndex + 1} of {session.questions.length}
            </p>
            <h2 className="text-2xl md:text-3xl font-light text-white leading-relaxed">
              {session.questions[session.currentQuestionIndex]}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="secondary" onClick={() => handleAnswer('NO')} className="group order-1">
              <span className="flex items-center justify-center gap-2 group-hover:text-rose-300 transition-colors">
                <XMarkIcon /> No
              </span>
            </Button>
            
            <Button variant="secondary" onClick={() => handleAnswer('MAYBE')} className="group order-2 md:order-2 bg-white/5 border-white/10">
               <span className="flex items-center justify-center gap-2 group-hover:text-blue-200 transition-colors">
                <QuestionMarkIcon /> I don't know
              </span>
            </Button>

            <Button variant="primary" onClick={() => handleAnswer('YES')} className="bg-white/90 order-3">
               <span className="flex items-center justify-center gap-2 text-slate-900">
                <CheckIcon /> Yes
              </span>
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  };

  const renderResultStep = () => {
    if (!result) return (
        <div className="text-white">Something went wrong. <button onClick={resetApp} className="underline">Try again</button></div>
    );

    return (
      <div className="w-full max-w-3xl animate-slide-up space-y-6 p-4 my-8">
        <div className="text-center mb-8">
            <h3 className="text-white/50 text-sm uppercase tracking-widest mb-2">The verdict</h3>
            <h1 className="font-serif text-4xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/70 font-bold leading-tight pb-2">
            {result.recommendation}
            </h1>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
            <GlassCard className="!p-6 !bg-emerald-900/10 !border-emerald-500/20">
                <h4 className="text-emerald-400 font-medium mb-4 flex items-center gap-2">
                    <CheckIcon /> Pros
                </h4>
                <ul className="space-y-3">
                    {result.pros.map((pro, i) => (
                        <li key={i} className="text-emerald-100/80 text-sm leading-relaxed border-b border-emerald-500/10 pb-2 last:border-0 last:pb-0">
                            {pro}
                        </li>
                    ))}
                </ul>
            </GlassCard>

            <GlassCard className="!p-6 !bg-rose-900/10 !border-rose-500/20">
                <h4 className="text-rose-400 font-medium mb-4 flex items-center gap-2">
                    <XMarkIcon /> Cons
                </h4>
                <ul className="space-y-3">
                    {result.cons.map((con, i) => (
                        <li key={i} className="text-rose-100/80 text-sm leading-relaxed border-b border-rose-500/10 pb-2 last:border-0 last:pb-0">
                            {con}
                        </li>
                    ))}
                </ul>
            </GlassCard>
        </div>

        <GlassCard className="text-center !py-6">
            <p className="text-lg italic text-white/90 font-serif">"{result.closingThought}"</p>
        </GlassCard>

        <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-8">
            {session && (
                <Button variant="secondary" onClick={handleRefine} className="w-full md:w-auto">
                    <span className="flex items-center justify-center gap-2">
                        <PlusIcon /> Deepen Analysis
                    </span>
                </Button>
            )}
            <Button variant="primary" onClick={resetApp} className="w-full md:w-auto">
                 <span className="flex items-center justify-center gap-2">
                    <ArrowLeftIcon /> New Decision
                 </span>
            </Button>
        </div>
      </div>
    );
  };

  return (
    <div>
    {renderBackground()}
    {renderHeader()}
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-x-hidden pt-16 pb-8">
      {showHistory ? renderHistory() : (
          <>
            {step === AppStep.INPUT && renderInputStep()}
            {step === AppStep.ANALYZING && renderLoadingStep("Generating questions...")}
            {step === AppStep.QUESTIONS && renderQuestionStep()}
            {step === AppStep.CALCULATING && renderLoadingStep("Synthesizing your answers...")}
            {step === AppStep.RESULT && renderResultStep()}
          </>
      )}
    </div>
    </div>
  );
};

export default App;