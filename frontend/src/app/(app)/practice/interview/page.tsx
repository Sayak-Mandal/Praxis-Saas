'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useScrollOnSelect } from '@/lib/useScrollOnSelect'
import {
    MessageSquare,
    Play,
    Loader2,
    CheckCircle2,
    XCircle,
    Lightbulb,
    ArrowRight,
    Award,
    RefreshCw,
    Target,
    Send,
    Sparkles,
    User as UserIcon,
    Bot,
    PanelLeftClose,
    Menu
} from 'lucide-react'
import { startInterviewSession, evaluateInterviewResponse } from '@/lib/api'
import { cn } from '@/lib/utils'

type Question = {
    id: string
    question_text: string
    hint?: string
}

type AIResponse = {
    score: number
    strengths: string[]
    weaknesses: string[]
    improved_answer: string | null
}

type Message = {
    id: string
    role: 'ai' | 'user'
    type: 'question' | 'evaluation' | 'answer' | 'loading' | 'system'
    content: any
    timestamp: Date
}

type SessionState = 'START' | 'CHATTING' | 'SUMMARY'

export default function InterviewPracticePage() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [role, setRole] = useState('Java Developer')
    const [difficulty, setDifficulty] = useState('Medium')

    const [sessionState, setSessionState] = useState<SessionState>('START')
    const [sessionId, setSessionId] = useState<string | null>(null)

    const [questions, setQuestions] = useState<Question[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)

    const [messages, setMessages] = useState<Message[]>([])
    const [answerText, setAnswerText] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const [sessionAverage, setSessionAverage] = useState<number>(0)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    // Hint feature states
    const [showHintBtn, setShowHintBtn] = useState(false)
    const [hintRevealed, setHintRevealed] = useState(false)
    const hintTimerRef = useRef<NodeJS.Timeout | null>(null)

    const bottomRef = useRef<HTMLDivElement>(null)
    const chatLogRef = useRef<HTMLDivElement>(null)

    // Clear and start hint timer for the current question
    const startHintTimer = useCallback(() => {
        setShowHintBtn(false)
        setHintRevealed(false)
        if (hintTimerRef.current) clearTimeout(hintTimerRef.current)

        hintTimerRef.current = setTimeout(() => {
            setShowHintBtn(true)
        }, 30000) // 30 seconds
    }, [])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Auto-scroll container during text selection drag
    useScrollOnSelect(chatLogRef)

    const handleStart = async () => {
        setIsLoading(true)
        setErrorMsg(null)
        try {
            const res = await startInterviewSession(role, difficulty)
            if (res.success && res.questions.length > 0) {
                setSessionId(res.session_id)
                setQuestions(res.questions)
                setCurrentIndex(0)

                // Push initial greeting and first question
                setMessages([
                    {
                        id: 'system-intro',
                        role: 'ai',
                        type: 'system',
                        content: `Welcome to your mock interview for **${role}** (${difficulty}). Let's get started!`,
                        timestamp: new Date()
                    },
                    {
                        id: 'q-0',
                        role: 'ai',
                        type: 'question',
                        content: res.questions[0].question_text,
                        timestamp: new Date()
                    }
                ])

                setSessionState('CHATTING')
                startHintTimer()
            } else {
                setErrorMsg('Failed to fetch questions. Please try again.')
            }
        } catch (err) {
            setErrorMsg('Error starting interview. Is the backend running?')
        }
        setIsLoading(false)
    }

    const handleSubmitAnswer = async () => {
        if (!answerText.trim() || !sessionId || isLoading) return

        // Optimistic UI updates
        const userMsg: Message = {
            id: `ans-${currentIndex}-${Date.now()}`,
            role: 'user',
            type: 'answer',
            content: answerText,
            timestamp: new Date()
        }

        const loadingMsg: Message = {
            id: `load-${currentIndex}`,
            role: 'ai',
            type: 'loading',
            content: 'Evaluating your response...',
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMsg, loadingMsg])
        const currentAnswer = answerText
        setAnswerText('')
        setIsLoading(true)

        try {
            const questionId = questions[currentIndex].id
            const res = await evaluateInterviewResponse(sessionId, questionId, currentAnswer)

            if (res.success) {
                setSessionAverage(res.session_average)

                // Replace loading msg with evaluation
                setMessages(prev => prev.map(m =>
                    m.id === loadingMsg.id
                        ? { id: `eval-${currentIndex}`, role: 'ai', type: 'evaluation', content: res.evaluation, timestamp: new Date() }
                        : m
                ))

                // Check if there are more questions
                if (currentIndex < questions.length - 1) {
                    const nextIndex = currentIndex + 1
                    setCurrentIndex(nextIndex)

                    // Small delay before asking the next question for a natural conversational feel
                    setTimeout(() => {
                        setMessages(prev => [...prev, {
                            id: `q-${nextIndex}`,
                            role: 'ai',
                            type: 'question',
                            content: questions[nextIndex].question_text,
                            timestamp: new Date()
                        }])
                        startHintTimer()
                    }, 800)

                } else {
                    // Finished all questions
                    setTimeout(() => {
                        setMessages(prev => [...prev, {
                            id: 'system-outro',
                            role: 'ai',
                            type: 'system',
                            content: `You have completed all ${questions.length} questions. Great job! Click the button below to view your final report.`,
                            timestamp: new Date()
                        }])
                    }, 800)
                }
            } else {
                // Failed evaluation
                setMessages(prev => prev.map(m =>
                    m.id === loadingMsg.id
                        ? { id: `err-${currentIndex}`, role: 'ai', type: 'system', content: 'Evaluation failed due to a server error. Please try answering again.', timestamp: new Date() }
                        : m
                ))
                setAnswerText(currentAnswer) // restore text
            }
        } catch (err) {
            setMessages(prev => prev.map(m =>
                m.id === loadingMsg.id
                    ? { id: `err-${currentIndex}`, role: 'ai', type: 'system', content: 'Connection timeout. Please ensure the backend is running and try again.', timestamp: new Date() }
                    : m
            ))
            setAnswerText(currentAnswer) // restore text
        }

        setIsLoading(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmitAnswer()
        }
    }

    const handleRetry = () => {
        setSessionState('START')
        setSessionId(null)
        setQuestions([])
        setCurrentIndex(0)
        setMessages([])
        setAnswerText('')
        setSessionAverage(0)
        setShowHintBtn(false)
        setHintRevealed(false)
        if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    }

    // --- RENDERS ---

    const isFinished = currentIndex === questions.length - 1 && messages[messages.length - 1]?.type === 'system' && messages[messages.length - 1]?.role === 'ai'

    return (
        <div className="flex h-screen bg-[#f3f4f6] dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-300">

            {/* Sidebar (Configuration) */}
            <div className={cn("bg-white dark:bg-slate-900 border-r border-[#e2e8f0] dark:border-slate-800 flex flex-col h-full shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300", isSidebarOpen ? "w-80" : "w-0 overflow-hidden border-none opacity-0")}>
                <div className="p-6 flex-1 overflow-y-auto w-full">
                    <div className="flex items-center justify-between mb-12">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-200 dark:border-indigo-500/20 shadow-sm">
                                <MessageSquare className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Mock Interview</h2>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Configure Session</p>
                            </div>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="p-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors" title="Collapse Sidebar">
                            <PanelLeftClose className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 block px-2">Target Role</label>
                            <div className="relative">
                                <select
                                    value={role}
                                    onChange={e => setRole(e.target.value)}
                                    disabled={sessionState !== 'START'}
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 appearance-none border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-[2rem] pl-5 pr-10 py-3.5 focus:border-[#5ec4c7] focus:ring-4 focus:ring-[#5ec4c7]/10 focus:outline-none transition-all text-[15px] font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                                >
                                    <option value="Java Developer">Java Developer</option>
                                    <option value="Frontend Developer">Frontend Developer</option>
                                    <option value="Backend Developer">Backend Developer</option>
                                    <option value="Data Scientist">Data Scientist</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 block px-2">Difficulty</label>
                            <div className="relative">
                                <select
                                    value={difficulty}
                                    onChange={e => setDifficulty(e.target.value)}
                                    disabled={sessionState !== 'START'}
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 appearance-none border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-[2rem] pl-5 pr-10 py-3.5 focus:border-[#5ec4c7] focus:ring-4 focus:ring-[#5ec4c7]/10 focus:outline-none transition-all text-[15px] font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                                >
                                    <option value="Easy">Beginner</option>
                                    <option value="Medium">Intermediate</option>
                                    <option value="Hard">Advanced</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {errorMsg && <p className="mt-4 text-red-500 dark:text-red-400 text-xs bg-red-50 dark:bg-red-400/10 p-3 rounded-lg border border-red-200 dark:border-red-400/20">{errorMsg}</p>}
                </div>

                <div className="p-6 border-t border-[#e2e8f0] dark:border-slate-800 bg-white dark:bg-slate-900">
                    {sessionState === 'START' ? (
                        <button
                            onClick={handleStart}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 bg-[#181b25] hover:bg-black dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4 fill-current" /> Start Interview</>}
                        </button>
                    ) : (
                        <button
                            onClick={handleRetry}
                            className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold py-3.5 rounded-xl transition-all"
                        >
                            <RefreshCw className="w-4 h-4" /> End Session
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full relative transition-all duration-300 min-w-0 bg-[#f3f4f6] dark:bg-slate-950">

                {!isSidebarOpen && (
                    <div className="absolute top-6 left-6 z-10 animate-in fade-in zoom-in duration-300">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-all"
                            title="Expand Sidebar"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {sessionState === 'SUMMARY' ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 custom-scrollbar overflow-y-auto">
                        <div className="max-w-xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 shadow-xl text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                                <Award className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Interview Complete!</h1>
                                <p className="text-slate-500 dark:text-slate-400 mt-2">You have finished the {questions.length}-question session.</p>
                            </div>

                            <div className="bg-[#f8fafc] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-inner text-center">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Final Average Score</h3>
                                <div className="text-5xl font-black mt-2 bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-cyan-400 dark:to-indigo-400 bg-clip-text text-transparent">
                                    {sessionAverage} <span className="text-2xl text-slate-400 dark:text-slate-600">/ 10</span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-4 max-w-sm mx-auto font-medium">
                                    {sessionAverage >= 8 ? "Excellent performance! You are clearly prepared for this role." :
                                        sessionAverage >= 5 ? "Good effort, but there are areas to polish before the real interview." :
                                            "You need to spend more time studying the fundamentals for this role."}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header Context in Chat Mode */}
                        {sessionState === 'CHATTING' && (
                            <div className="absolute top-0 left-0 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 py-4 z-10 flex justify-between items-center shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
                                        <Bot className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white text-md">Mock Interviewer</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-right">
                                    <div>
                                        <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Progress</span>
                                        <div className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded">Q{currentIndex + 1} / {questions.length}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Chat Log */}
                        <div ref={chatLogRef} className="flex-1 overflow-y-auto p-8 pt-24 pb-32 custom-scrollbar">
                            {sessionState === 'START' ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-80 mt-[-5%]">
                                    <div className="w-24 h-24 bg-gradient-to-br from-[#a6d8d4] to-[#5ec4c7] rounded-[2rem] flex items-center justify-center mb-8 shadow-xl shadow-[#5ec4c7]/20 rotate-3">
                                        <MessageSquare className="w-10 h-10 text-white fill-white/20" />
                                    </div>
                                    <h2 className="text-3xl font-extrabold text-[#181b25] dark:text-white tracking-tight mb-3">Ready when you are.</h2>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm">
                                        Choose your target role and difficulty from the sidebar to start a new mock interview session.
                                    </p>
                                </div>
                            ) : (
                                <div className="max-w-3xl mx-auto space-y-8">
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={cn("flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300", msg.role === 'user' ? "justify-end" : "justify-start")}>

                                            {/* AI Question / System Msg Bubble */}
                                            {msg.role === 'ai' && (msg.type === 'question' || msg.type === 'system') && (
                                                <div className="flex flex-col gap-2 max-w-[85%]">
                                                    <div className="flex gap-4">
                                                        <div className="w-8 h-8 rounded-full bg-white dark:bg-indigo-500/20 border border-slate-200 dark:border-indigo-500/30 shadow-sm flex items-center justify-center shrink-0 mt-1">
                                                            <Sparkles className="w-4 h-4 text-amber-500 dark:text-indigo-400" />
                                                        </div>
                                                        <div className={cn(
                                                            "rounded-[2rem] rounded-tl-md p-5 text-[15px] font-medium leading-relaxed shadow-[0_10px_40px_rgba(0,0,0,0.03)] transition-colors duration-300",
                                                            msg.type === 'system'
                                                                ? "bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 italic"
                                                                : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                                                        )}>
                                                            {msg.type === 'system' && msg.content.includes('**') ? (
                                                                <span dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-indigo-600 dark:text-indigo-400">$1</strong>') }} />
                                                            ) : msg.content}
                                                        </div>
                                                    </div>

                                                    {/* Hint Block (Appears under the current active question if revealed) */}
                                                    {msg.type === 'question' && msg.content === questions[currentIndex]?.question_text && hintRevealed && questions[currentIndex]?.hint && (
                                                        <div className="ml-12 mr-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 animate-in fade-in slide-in-from-top-4">
                                                            <div className="flex gap-2 items-center text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-widest mb-1.5">
                                                                <Lightbulb className="w-3.5 h-3.5" /> Hint
                                                            </div>
                                                            <p className="text-sm font-medium text-amber-900 dark:text-amber-200/80">{questions[currentIndex].hint}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* User Answer Bubble */}
                                            {msg.role === 'user' && (
                                                <div className="flex gap-4 max-w-[85%] flex-row-reverse">
                                                    <div className="bg-[#181b25] dark:bg-indigo-600 rounded-[2rem] rounded-tr-md p-5 text-[15px] font-medium text-white leading-relaxed shadow-[0_10px_40px_rgba(24,27,37,0.15)] whitespace-pre-wrap">
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            )}

                                            {/* AI Loading Bubble */}
                                            {msg.role === 'ai' && msg.type === 'loading' && (
                                                <div className="flex gap-4 max-w-[85%]">
                                                    <div className="w-8 h-8 rounded-full bg-white dark:bg-indigo-500/10 border border-slate-200 dark:border-indigo-500/20 shadow-sm flex items-center justify-center shrink-0 mt-1">
                                                        <Loader2 className="w-4 h-4 text-indigo-500 dark:text-indigo-400 animate-spin" />
                                                    </div>
                                                    <div className="rounded-[2rem] rounded-tl-md p-4 px-6 font-bold text-sm leading-relaxed bg-white border border-slate-100 dark:border-indigo-500/10 text-slate-400 dark:text-indigo-300 flex items-center gap-2 shadow-sm">
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            )}

                                            {/* AI Evaluation Bubble */}
                                            {msg.role === 'ai' && msg.type === 'evaluation' && (
                                                <div className="flex gap-4 w-full md:max-w-[90%]">
                                                    <div className="w-8 h-8 rounded-full bg-white dark:bg-indigo-500/20 border border-slate-200 dark:border-indigo-500/30 flex items-center justify-center shrink-0 mt-1 relative z-10 shadow-sm">
                                                        <Sparkles className="w-4 h-4 text-amber-500 dark:text-indigo-400" />
                                                    </div>

                                                    <div className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-[0_20px_60px_rgba(0,0,0,0.04)] rounded-[2rem] rounded-tl-md overflow-hidden transition-colors duration-300 backdrop-blur-sm -ml-2 sm:ml-0">

                                                        {/* Score Header */}
                                                        <div className={cn(
                                                            "px-6 py-4 flex items-center justify-between border-b",
                                                            msg.content.score >= 8 ? "bg-emerald-50/50 dark:bg-emerald-500/5 border-b-emerald-100 dark:border-b-emerald-500/10" :
                                                                msg.content.score >= 5 ? "bg-amber-50/50 dark:bg-amber-500/5 border-b-amber-100 dark:border-b-amber-500/10" :
                                                                    "bg-red-50/50 dark:bg-red-500/5 border-b-red-100 dark:border-b-red-500/10"
                                                        )}>
                                                            <span className="font-bold text-sm text-slate-700 dark:text-slate-300 tracking-wide">Evaluation Result</span>
                                                            <div className={cn(
                                                                "font-black text-sm px-3 py-1.5 rounded-lg border",
                                                                msg.content.score >= 8 ? "text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 bg-emerald-100/50 dark:bg-emerald-500/10" :
                                                                    msg.content.score >= 5 ? "text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 bg-amber-100/50 dark:bg-amber-500/10" :
                                                                        "text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30 bg-red-100/50 dark:bg-red-500/10"
                                                            )}>
                                                                {msg.content.score} / 10
                                                            </div>
                                                        </div>

                                                        <div className="p-6 space-y-6">
                                                            {/* Strengths & Weaknesses */}
                                                            <div className="grid grid-cols-1 gap-4">
                                                                <div className="bg-emerald-50/50 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/10 p-5">
                                                                    <h4 className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-500 mb-3 tracking-widest uppercase">
                                                                        <CheckCircle2 className="w-4 h-4" /> Attributes demonstrated
                                                                    </h4>
                                                                    <ul className="space-y-2">
                                                                        {Array.isArray(msg.content.strengths) && msg.content.strengths.length > 0 ?
                                                                            msg.content.strengths.map((s: string, i: number) => (
                                                                                <li key={i} className="text-slate-700 dark:text-slate-300 text-[14px] font-medium flex items-start gap-2">
                                                                                    <span className="text-emerald-500 dark:text-emerald-500/50 mt-0.5">•</span> <span>{s}</span>
                                                                                </li>
                                                                            ))
                                                                            : (
                                                                                typeof msg.content.strengths === 'string' && msg.content.strengths.length > 0
                                                                                    ? <p className="text-slate-700 dark:text-slate-300 text-[14px] font-medium whitespace-pre-wrap">{msg.content.strengths.replace(/\\n/g, '\n')}</p>
                                                                                    : <p className="text-slate-500 text-[14px] italic">None noted.</p>
                                                                            )}
                                                                    </ul>
                                                                </div>

                                                                <div className="bg-red-50/50 dark:bg-red-500/5 rounded-2xl border border-red-100 dark:border-red-500/10 p-5">
                                                                    <h4 className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-500 mb-3 tracking-widest uppercase">
                                                                        <XCircle className="w-4 h-4" /> Missing elements
                                                                    </h4>
                                                                    <ul className="space-y-2">
                                                                        {Array.isArray(msg.content.weaknesses) && msg.content.weaknesses.length > 0 ?
                                                                            msg.content.weaknesses.map((w: string, i: number) => (
                                                                                <li key={i} className="text-slate-700 dark:text-slate-300 text-[14px] font-medium flex items-start gap-2">
                                                                                    <span className="text-red-500 dark:text-red-500/50 mt-0.5">•</span> <span>{w}</span>
                                                                                </li>
                                                                            ))
                                                                            : (
                                                                                typeof msg.content.weaknesses === 'string' && msg.content.weaknesses.length > 0
                                                                                    ? <p className="text-slate-700 dark:text-slate-300 text-[14px] font-medium whitespace-pre-wrap">{msg.content.weaknesses.replace(/\\n/g, '\n')}</p>
                                                                                    : <p className="text-slate-500 text-[14px] italic">None noted.</p>
                                                                            )}
                                                                    </ul>
                                                                </div>
                                                            </div>

                                                            {/* Improved Answer */}
                                                            {msg.content.score < 10 && msg.content.improved_answer && (
                                                                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6">
                                                                    <h4 className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-3 tracking-widest uppercase">
                                                                        <Lightbulb className="w-4 h-4" /> Ideal Response
                                                                    </h4>
                                                                    <p className="text-slate-700 dark:text-slate-300 text-[14px] font-medium leading-relaxed whitespace-pre-wrap">
                                                                        {msg.content.improved_answer}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                        </div>
                                    ))}
                                    <div ref={bottomRef} className="h-4" />

                                    {isFinished && (
                                        <div className="flex justify-center pt-8 pb-12 animate-in fade-in slide-in-from-bottom-4 zoom-in duration-500">
                                            <button
                                                onClick={() => setSessionState('SUMMARY')}
                                                className="bg-[#181b25] hover:bg-black dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-[0_10px_30px_rgba(24,27,37,0.2)] px-8 py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 transform active:scale-95"
                                            >
                                                View Final Report <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Input Area (Sticky Bottom) - Exactly matching doubt page pattern */}
                        {!isFinished && (
                            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#f3f4f6] dark:from-slate-950 via-[#f3f4f6] dark:via-slate-950 to-transparent pt-10 pb-6 rounded-br-2xl pointer-events-none transition-colors duration-300">
                                <div className="max-w-3xl mx-auto px-8 pointer-events-auto flex flex-col items-end">
                                    {/* Hint Button (Floats right above the input) */}
                                    {showHintBtn && !hintRevealed && sessionState === 'CHATTING' && questions[currentIndex]?.hint && (
                                        <button
                                            onClick={() => setHintRevealed(true)}
                                            className="mb-3 mr-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 border border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-400 text-xs font-bold px-4 py-2 rounded-full shadow-sm flex items-center gap-2 transition-all animate-in fade-in slide-in-from-bottom-2"
                                        >
                                            <Lightbulb className="w-3.5 h-3.5" /> Need a hint?
                                        </button>
                                    )}

                                    <div className={`w-full relative flex items-end gap-3 bg-white dark:bg-slate-900 rounded-[2rem] p-3 pl-5 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-slate-800 focus-within:border-[#5ec4c7] focus-within:ring-4 focus-within:ring-[#5ec4c7]/10 transition-all ${sessionState === 'START' ? 'opacity-60 grayscale' : ''}`}>

                                        <textarea
                                            value={answerText}
                                            onChange={(e) => setAnswerText(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            disabled={isLoading || sessionState === 'START'}
                                            placeholder={sessionState === 'START' ? "Configure session in sidebar to start..." : "Message your answer... (Shift+Enter for new line)"}
                                            className="flex-1 max-h-40 min-h-[44px] bg-transparent border-none focus:outline-none resize-none py-3 text-slate-900 dark:text-slate-100 font-medium placeholder-slate-400 dark:placeholder-slate-500 custom-scrollbar text-[15px] disabled:cursor-not-allowed"
                                            rows={1}
                                        />

                                        <button
                                            onClick={handleSubmitAnswer}
                                            disabled={!answerText.trim() || isLoading || sessionState === 'START'}
                                            className="shrink-0 w-12 h-12 rounded-full bg-[#181b25] dark:bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:bg-black dark:hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-[#181b25] disabled:dark:hover:bg-indigo-600 transition-all transform active:scale-95 disabled:cursor-not-allowed"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <Send className="w-5 h-5 -ml-0.5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
