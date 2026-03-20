'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useScrollOnSelect } from '@/lib/useScrollOnSelect'
import {
    Code2,
    Send,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Lightbulb,
    Zap,
    Clock,
    BrainCircuit,
    Sparkles,
    User as UserIcon,
    RefreshCw,
    ChevronsLeft,
    AlignLeft
} from 'lucide-react'
import { evaluateCoding } from '@/lib/api'
import { cn } from '@/lib/utils'

// Predefined Question Bank
const QUESTIONS = [
    {
        id: 'two-sum',
        title: 'Two Sum',
        difficulty: 'Easy',
        track: 'Arrays',
        description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
        hint: 'Can you use a Hash Map to store the numbers you have already seen? What would the key and value be?'
    },
    {
        id: 'valid-parentheses',
        title: 'Valid Parentheses',
        difficulty: 'Easy',
        track: 'Stacks',
        description: 'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nOpen brackets must be closed by the same type of brackets in the correct order.',
        hint: 'Think about using a Stack. When you encounter a closing bracket, what should be at the top of the stack?'
    },
    {
        id: 'best-time-to-buy-sell-stock',
        title: 'Best Time to Buy and Sell Stock',
        difficulty: 'Easy',
        track: 'Arrays',
        description: 'You are given an array `prices` where `prices[i]` is the price of a given stock on the `i`th day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.',
        hint: 'You only need to loop through the array once. Keep track of the minimum price you have seen so far.'
    },
    {
        id: 'climbing-stairs',
        title: 'Climbing Stairs',
        difficulty: 'Easy',
        track: 'Dynamic Programming',
        description: 'You are climbing a staircase. It takes `n` steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
        hint: 'This is similar to the Fibonacci sequence. The number of ways to reach step n is the sum of ways to reach step n-1 and step n-2.'
    },
    {
        id: 'lru-cache',
        title: 'LRU Cache',
        difficulty: 'Medium',
        track: 'Design',
        description: 'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.\n\nImplement the `LRUCache` class:\n- `get(key)`\n- `put(key, value)`\n\nwith O(1) average time complexity.',
        hint: 'You need O(1) lookups and O(1) removals. What combination of data structures gives you both? (Think Hash Map + Doubly Linked List).'
    },
    {
        id: 'merge-intervals',
        title: 'Merge Intervals',
        difficulty: 'Medium',
        track: 'Sorting',
        description: 'Given an array of `intervals` where `intervals[i] = [starti, endi]`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.',
        hint: 'What if you sort the intervals by their start times first? Then you only need to compare the current interval with the last merged interval.'
    },
    {
        id: 'number-of-islands',
        title: 'Number of Islands',
        difficulty: 'Medium',
        track: 'Graphs',
        description: 'Given an `m x n` 2D binary grid `grid` which represents a map of `\'1\'`s (land) and `\'0\'`s (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.',
        hint: 'You can use Depth First Search (DFS) or Breadth First Search (BFS). When you find a 1, increment your count and sink the island (turn connected 1s to 0s).'
    },
    {
        id: 'coin-change',
        title: 'Coin Change',
        difficulty: 'Medium',
        track: 'Dynamic Programming',
        description: 'You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return `-1`.',
        hint: 'Build up the solution from amount=0 to amount=target. For each amount, try all coins and find the minimum.'
    },
    {
        id: 'word-search',
        title: 'Word Search',
        difficulty: 'Medium',
        track: 'Backtracking',
        description: 'Given an `m x n` grid of characters `board` and a string `word`, return `true` if `word` exists in the grid. The word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once.',
        hint: 'Use DFS from every cell that matches the first letter. Remember to mark cells as visited so you don\'t reuse them, and backtrack if the path fails.'
    },
    {
        id: 'merge-k-sorted-lists',
        title: 'Merge K Sorted Lists',
        difficulty: 'Hard',
        track: 'Linked Lists',
        description: 'You are given an array of `k` linked-lists `lists`, each linked-list is sorted in ascending order.\n\nMerge all the linked-lists into one sorted linked-list and return it.',
        hint: 'You can use a Min-Heap (Priority Queue) to always get the smallest current element from the K lists. Alternatively, try Divide and Conquer.'
    }
]
type Question = {
    id: string
    title: string
    difficulty: string
    track: string
    description: string
    hint?: string
}

const LANGUAGES = ['Python', 'JavaScript', 'Java', 'C++', 'C', 'Go', 'TypeScript']

type Message = {
    id: string
    role: 'user' | 'ai'
    content: any // String for user code, Object for AI evaluation
    timestamp: Date
    type: 'system' | 'code_submission' | 'evaluation' | 'loading'
    language?: string
}

export default function CodingPracticePage() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [selectedDifficulty, setSelectedDifficulty] = useState('All')
    const [selectedTopic, setSelectedTopic] = useState(QUESTIONS[0])
    const [language, setLanguage] = useState(LANGUAGES[0])
    const [code, setCode] = useState('')
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [sessionCount, setSessionCount] = useState(0)

    // Hint feature states
    const [showHintBtn, setShowHintBtn] = useState(false)
    const [hintRevealed, setHintRevealed] = useState(false)
    const hintTimerRef = useRef<NodeJS.Timeout | null>(null)

    const bottomRef = useRef<HTMLDivElement>(null)
    const chatLogRef = useRef<HTMLDivElement>(null)

    const startHintTimer = useCallback(() => {
        setShowHintBtn(false)
        setHintRevealed(false)
        if (hintTimerRef.current) clearTimeout(hintTimerRef.current)

        hintTimerRef.current = setTimeout(() => {
            setShowHintBtn(true)
        }, 30000) // 30 seconds
    }, [])

    // Reset Chat when Topic Changes
    useEffect(() => {
        // If limit reached, don't show the initial prompt
        if (sessionCount >= 3) return

        setMessages([
            {
                id: `system-${selectedTopic.id}-${Date.now()}`,
                role: 'ai',
                type: 'system',
                content: `**${selectedTopic.title}**\n\n${selectedTopic.description}`,
                timestamp: new Date()
            }
        ])
        setCode('')
        startHintTimer()
    }, [selectedTopic, startHintTimer, sessionCount])

    // Auto-scroll to bottom of chat
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Auto-scroll container during text selection drag
    useScrollOnSelect(chatLogRef)

    const handleSubmit = async () => {
        if (!code.trim() || isLoading || sessionCount >= 3) return

        const newSubmission: Message = {
            id: Date.now().toString(),
            role: 'user',
            type: 'code_submission',
            content: code,
            language: language,
            timestamp: new Date()
        }

        const loadingMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'ai',
            type: 'loading',
            content: 'Analyzing logic, complexity, and edge cases...',
            timestamp: new Date()
        }

        setMessages(prev => [...prev, newSubmission, loadingMessage])
        const currentCode = code
        setCode('')
        setIsLoading(true)

        try {
            const executionTimeMs = Math.round(Math.random() * 50) + 10 // Mock execution time

            const response = await evaluateCoding(selectedTopic.id, language, newSubmission.content, executionTimeMs)
            const evaluation = response?.evaluation || {}

            setMessages(prev => prev.map(msg =>
                msg.id === loadingMessage.id
                    ? { ...msg, type: 'evaluation', content: evaluation }
                    : msg
            ))

            // Only increment session count on successful processing
            if (response?.evaluation?.success) {
                const newCount = sessionCount + 1
                setSessionCount(newCount)

                if (newCount >= 3) {
                    setTimeout(() => {
                        setMessages(prev => [...prev, {
                            id: `system-limit-${Date.now()}`,
                            role: 'ai',
                            type: 'system',
                            content: `**Session Limit Reached**\n\nYou've completed your daily limit of 3 coding questions to help conserve resources. Take a break and try again tomorrow!`,
                            timestamp: new Date()
                        }])
                    }, 500)
                }
            }

        } catch (error) {
            console.error(error)
            setMessages(prev => prev.map(msg =>
                msg.id === loadingMessage.id
                    ? {
                        ...msg,
                        type: 'evaluation',
                        content: { success: false, error: "Failed to reach evaluation engine. Please try again." }
                    }
                    : msg
            ))
            setCode(currentCode) // Restore on error
        }
        setIsLoading(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Since code can have many new lines, we typically don't want bare "Enter" to submit.
        // We'll require Mod+Enter (Cmd+Enter / Ctrl+Enter) to submit code.
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            handleSubmit()
        }
    }

    const handleReset = () => {
        setSessionCount(0)
        setMessages([
            {
                id: `system-${selectedTopic.id}-${Date.now()}`,
                role: 'ai',
                type: 'system',
                content: `**${selectedTopic.title}**\n\n${selectedTopic.description}`,
                timestamp: new Date()
            }
        ])
        setCode('')
        startHintTimer()
    }

    const filteredQuestions = QUESTIONS.filter(q => selectedDifficulty === 'All' || q.difficulty === selectedDifficulty)

    return (
        <div className="flex h-screen bg-[#f3f4f6] dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-300">

            {/* Sidebar (Configuration) */}
            <div className={cn("bg-white dark:bg-slate-900 border-r border-[#e2e8f0] dark:border-slate-800 flex flex-col h-full shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300", isSidebarOpen ? "w-80" : "w-0 overflow-hidden border-none opacity-0")}>
                <div className="p-6 flex-1 overflow-y-auto w-full custom-scrollbar">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-200 dark:border-indigo-500/20 shadow-sm">
                                <Code2 className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Coding Practice</h2>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Select Problem</p>
                            </div>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400 hover:text-white dark:hover:text-white bg-slate-50 dark:bg-slate-800 hover:bg-[#181b25] dark:hover:bg-[#181b25] border border-slate-200 dark:border-slate-700 hover:border-[#181b25] rounded-lg transition-all duration-200 shadow-sm shrink-0" title="Collapse Sidebar">
                            <ChevronsLeft className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 block px-2">Filter Difficulty</label>
                            <div className="relative">
                                <select
                                    value={selectedDifficulty}
                                    onChange={e => setSelectedDifficulty(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 appearance-none border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-[2rem] pl-5 pr-10 py-3 focus:border-[#5ec4c7] focus:ring-4 focus:ring-[#5ec4c7]/10 focus:outline-none transition-all text-[14px] font-medium shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                                >
                                    <option value="All">All Difficulties</option>
                                    <option value="Easy">Beginner (Easy)</option>
                                    <option value="Medium">Intermediate (Medium)</option>
                                    <option value="Hard">Advanced (Hard)</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 block px-2">Problems ({filteredQuestions.length})</label>
                            <div className="flex flex-col gap-2">
                                {filteredQuestions.map(q => (
                                    <button
                                        key={q.id}
                                        onClick={() => setSelectedTopic(q)}
                                        disabled={sessionCount >= 3}
                                        className={cn(
                                            "text-left px-4 py-3 rounded-2xl border transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed",
                                            selectedTopic.id === q.id
                                                ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400 shadow-sm"
                                                : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                        )}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="truncate">{q.title}</span>
                                        </div>
                                        <div className="flex gap-2 items-center text-[10px]">
                                            <span className={cn(
                                                "font-bold uppercase tracking-wider",
                                                q.difficulty === 'Easy' ? "text-emerald-600 dark:text-emerald-400" :
                                                    q.difficulty === 'Medium' ? "text-amber-600 dark:text-amber-400" :
                                                        "text-red-600 dark:text-red-400"
                                            )}>{q.difficulty}</span>
                                            <span className="text-slate-400 dark:text-slate-500">•</span>
                                            <span className="text-slate-500 dark:text-slate-500">{q.track}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-[#e2e8f0] dark:border-slate-800 bg-white dark:bg-slate-900">
                    <button
                        onClick={handleReset}
                        className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold py-3.5 rounded-xl transition-all text-[15px]"
                    >
                        <RefreshCw className="w-4 h-4" /> Reset Chat
                    </button>
                    {sessionCount >= 3 && (
                        <p className="mt-3 text-center text-[10px] text-amber-600 dark:text-amber-500 font-bold uppercase tracking-widest">
                            Daily Limit Reached
                        </p>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full relative transition-all duration-300 min-w-0 bg-[#f3f4f6] dark:bg-slate-950">

                {!isSidebarOpen && (
                    <div className="absolute top-6 left-6 z-50 animate-in fade-in zoom-in duration-300">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-[#181b25] dark:hover:bg-[#181b25] text-slate-400 dark:text-slate-400 hover:text-white dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:border-[#181b25] rounded-lg shadow-sm transition-all duration-200"
                            title="Expand Sidebar"
                        >
                            <AlignLeft className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Header Context in Chat Area */}
                <div className="absolute top-0 left-0 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 py-4 z-10 flex justify-between items-center shadow-sm">
                    <div className={cn("flex items-center gap-3", !isSidebarOpen && "pl-14")}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm text-white font-bold text-lg">
                            {selectedTopic.title.charAt(0)}
                        </div>
                        <div>
                            <div className="font-bold text-slate-900 dark:text-white text-md">{selectedTopic.title}</div>
                            <div className="flex gap-2 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                                <span className={cn(
                                    selectedTopic.difficulty === 'Easy' ? "text-emerald-600 dark:text-emerald-400" :
                                        selectedTopic.difficulty === 'Medium' ? "text-amber-600 dark:text-amber-400" :
                                            "text-red-600 dark:text-red-400"
                                )}>{selectedTopic.difficulty}</span>
                                <span className="text-slate-400">• {selectedTopic.track}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chat History Area */}
                <div ref={chatLogRef} className="flex-1 overflow-y-auto p-8 pt-24 pb-32 custom-scrollbar">
                    <div className="max-w-4xl mx-auto space-y-8">
                        {messages.map((msg) => (
                            <div key={msg.id} className={cn("flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300", msg.role === 'user' ? "justify-end" : "justify-start")}>

                                {/* System Message (Problem Description) */}
                                {msg.role === 'ai' && msg.type === 'system' && (
                                    <div className="flex flex-col gap-2 max-w-[85%]">
                                        <div className="flex gap-4 w-full">
                                            <div className="w-8 h-8 rounded-full bg-white dark:bg-indigo-500/20 border border-slate-200 dark:border-indigo-500/30 shadow-sm flex items-center justify-center shrink-0 mt-1">
                                                <Sparkles className="w-4 h-4 text-amber-500 dark:text-indigo-400" />
                                            </div>
                                            <div className="rounded-2xl p-5 text-sm leading-relaxed shadow-sm transition-colors duration-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 w-full prose prose-sm dark:prose-invert max-w-none">
                                                <div dangerouslySetInnerHTML={{
                                                    __html: msg.content
                                                        .replace(/\*\*(.*?)\*\*/g, '<h3 class="text-xl font-bold text-indigo-600 dark:text-indigo-400 mb-4 mt-0">$1</h3>')
                                                        .replace(/`(.*?)`/g, '<code class="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded text-[0.8em] font-mono border border-indigo-100 dark:border-indigo-500/20">$1</code>')
                                                        .replace(/\n/g, '<br/>')
                                                }} />
                                            </div>
                                        </div>

                                        {/* Hint Block (Appears under the current active question if revealed) */}
                                        {msg.content.includes(selectedTopic.title) && hintRevealed && selectedTopic.hint && (
                                            <div className="ml-12 mr-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 animate-in fade-in slide-in-from-top-4">
                                                <div className="flex gap-2 items-center text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-widest mb-1.5">
                                                    <Lightbulb className="w-3.5 h-3.5" /> Hint
                                                </div>
                                                <p className="text-sm font-medium text-amber-900 dark:text-amber-200/80">{selectedTopic.hint}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* User Code Bubble */}
                                {msg.role === 'user' && msg.type === 'code_submission' && (
                                    <div className="flex gap-4 max-w-[85%] flex-row-reverse">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-cyan-500/20 border border-blue-200 dark:border-cyan-500/30 shadow-sm flex items-center justify-center shrink-0 mt-1">
                                            <UserIcon className="w-4 h-4 text-blue-500 dark:text-cyan-400" />
                                        </div>
                                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-slate-800 dark:to-slate-800 border-[0.5px] border-blue-400 dark:border-slate-700 rounded-2xl rounded-tr-sm p-4 text-sm shadow-md text-white w-full">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-xs font-bold text-indigo-100 dark:text-slate-400 tracking-widest">{msg.language}</span>
                                                <span className="text-[10px] text-indigo-200 dark:text-slate-500">{msg.timestamp.toLocaleTimeString()}</span>
                                            </div>
                                            <pre className="bg-black/20 dark:bg-slate-950 p-4 rounded-xl text-sm font-mono text-cyan-50 dark:text-cyan-300 overflow-x-auto border border-white/10 dark:border-slate-800/50">
                                                <code>{msg.content}</code>
                                            </pre>
                                        </div>
                                    </div>
                                )}

                                {/* AI Loading Bubble */}
                                {msg.role === 'ai' && msg.type === 'loading' && (
                                    <div className="flex gap-4 max-w-[85%]">
                                        <div className="w-8 h-8 rounded-full bg-white dark:bg-indigo-500/10 border border-slate-200 dark:border-indigo-500/20 shadow-sm flex items-center justify-center shrink-0 mt-1">
                                            <BrainCircuit className="w-4 h-4 text-indigo-500 dark:text-indigo-400 animate-spin-slow" />
                                        </div>
                                        <div className="rounded-2xl p-4 text-sm leading-relaxed bg-slate-50 dark:bg-indigo-500/5 border border-slate-100 dark:border-indigo-500/10 text-slate-500 dark:text-indigo-300 animate-pulse">
                                            {msg.content}
                                        </div>
                                    </div>
                                )}

                                {/* AI Evaluation Bubble */}
                                {msg.role === 'ai' && msg.type === 'evaluation' && (
                                    <div className="flex gap-4 w-full md:max-w-[100%]">
                                        <div className="w-8 h-8 rounded-full bg-white dark:bg-indigo-500/20 border border-slate-200 dark:border-indigo-500/30 shadow-sm flex items-center justify-center shrink-0 mt-1 relative z-10">
                                            <Sparkles className="w-4 h-4 text-amber-500 dark:text-indigo-400" />
                                        </div>
                                        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl rounded-2xl rounded-tl-sm overflow-hidden transition-colors duration-300 backdrop-blur-sm -ml-2 sm:ml-0 p-5 space-y-6">
                                            {msg.content.error ? (
                                                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-400/10 p-4 rounded-xl border border-red-200 dark:border-red-400/20">
                                                    <AlertCircle className="w-5 h-5" />
                                                    <span className="text-sm font-medium">{msg.content.error}</span>
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Header Status */}
                                                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                                                        <div className="flex items-center gap-2">
                                                            {msg.content.success ? (
                                                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-400/20 font-bold text-sm">
                                                                    <CheckCircle2 className="w-4 h-4" /> Optimal Logic
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-400/20 font-bold text-sm">
                                                                    <AlertCircle className="w-4 h-4" /> Needs Improvement
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Complexity Badges */}
                                                        <div className="flex gap-2">
                                                            <span className="flex items-center gap-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-md text-slate-600 dark:text-slate-300 font-bold" title="Time Complexity">
                                                                <Clock className="w-3.5 h-3.5 text-fuchsia-500 dark:text-fuchsia-400" /> {msg.content.time_complexity || 'O(N)'}
                                                            </span>
                                                            <span className="flex items-center gap-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-md text-slate-600 dark:text-slate-300 font-bold" title="Space Complexity">
                                                                <Zap className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" /> {msg.content.space_complexity || 'O(1)'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {/* Strengths */}
                                                        <div className="bg-emerald-50 dark:bg-emerald-500/5 rounded-xl border border-emerald-100 dark:border-emerald-500/10 p-5">
                                                            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500 mb-3 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Strengths</h4>
                                                            <ul className="space-y-3">
                                                                {(msg.content.strengths || ['Good attempt at the core logic.']).map((s: string, i: number) => (
                                                                    <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                                                                        <span className="text-emerald-500 dark:text-emerald-500/50 mt-0.5">•</span> <span>{s}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>

                                                        {/* Weaknesses */}
                                                        <div className="bg-red-50 dark:bg-red-500/5 rounded-xl border border-red-100 dark:border-red-500/10 p-5">
                                                            <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-500 mb-3 flex items-center gap-1.5"><XCircle className="w-4 h-4" /> Weaknesses & Edge Cases</h4>
                                                            <ul className="space-y-3">
                                                                {(msg.content.weaknesses || []).concat(msg.content.edge_cases_missed || []).length > 0
                                                                    ? (msg.content.weaknesses || []).concat(msg.content.edge_cases_missed || []).map((w: string, i: number) => (
                                                                        <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                                                                            <span className="text-red-500 dark:text-red-500/50 mt-0.5">•</span> <span>{w}</span>
                                                                        </li>
                                                                    ))
                                                                    : <li className="text-sm text-slate-500 dark:text-slate-500 italic">No significant issues found!</li>
                                                                }
                                                            </ul>
                                                        </div>
                                                    </div>

                                                    {/* Optimized Approach */}
                                                    {msg.content.optimized_approach && (
                                                        <div className="bg-slate-50 dark:bg-indigo-500/10 rounded-xl border border-slate-200 dark:border-indigo-500/20 p-5 mt-4">
                                                            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-1.5"><Lightbulb className="w-4 h-4" /> Optimized Approach / Feedback</h4>
                                                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                                {msg.content.optimized_approach}
                                                            </p>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                            </div>
                        ))}
                        <div ref={bottomRef} className="h-4" />
                    </div>
                </div>

                {/* Input Area (Sticky Bottom Code Editor) */}
                <div className="flex-none p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/80 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)] z-10 relative transition-colors duration-300">
                    <div className="max-w-4xl mx-auto">
                        {/* Language Selector */}
                        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 custom-scrollbar">
                            {LANGUAGES.map(lang => (
                                <button
                                    key={lang}
                                    onClick={() => setLanguage(lang)}
                                    className={cn(
                                        "text-xs px-3 py-1.5 rounded-lg border font-bold transition-colors whitespace-nowrap",
                                        language === lang
                                            ? "bg-indigo-100 dark:bg-indigo-600 text-indigo-700 dark:text-white border-indigo-200 dark:border-indigo-500"
                                            : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    )}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>

                        <div className="max-w-4xl mx-auto flex flex-col items-end">
                            {/* Hint Button (Floats right above the input) */}
                            {showHintBtn && !hintRevealed && sessionCount < 3 && selectedTopic.hint && (
                                <button
                                    onClick={() => setHintRevealed(true)}
                                    className="mb-3 mr-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 border border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-400 text-xs font-bold px-4 py-2 rounded-full shadow-sm flex items-center gap-2 transition-all animate-in fade-in slide-in-from-bottom-2 z-20 relative"
                                >
                                    <Lightbulb className="w-3.5 h-3.5" /> Need a hint?
                                </button>
                            )}

                            <div className="w-full relative group flex items-end bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-1.5 focus-within:ring-2 ring-indigo-500/50 focus-within:border-indigo-500/50 transition-all shadow-inner">
                                <textarea
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={isLoading || sessionCount >= 3}
                                    placeholder={sessionCount >= 3 ? "Daily limit reached." : "Write your code here... (Cmd+Enter to submit)"}
                                    className="flex-1 min-h-[120px] max-h-[40vh] bg-transparent text-slate-800 dark:text-slate-300 font-mono text-[13px] sm:text-sm px-4 py-3 placeholder:text-slate-400 dark:placeholder:text-slate-600 resize-none focus:outline-none custom-scrollbar rounded-3xl disabled:opacity-50"
                                    spellCheck={false}
                                    autoComplete="off"
                                />
                                <button
                                    onClick={handleSubmit}
                                    disabled={!code.trim() || isLoading || sessionCount >= 3}
                                    className="h-10 w-10 shrink-0 bg-gradient-to-br from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 dark:bg-indigo-600 dark:from-indigo-600 dark:hover:bg-indigo-500 rounded-2xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:bg-slate-200 disabled:dark:bg-slate-800 disabled:text-slate-400 disabled:dark:text-slate-600 text-white mb-1 mr-1 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-900 z-10"
                                    title="Submit Code (Cmd+Enter)"
                                >
                                    <Send className="w-4 h-4 ml-0.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
