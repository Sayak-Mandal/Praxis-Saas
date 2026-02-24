'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Paperclip, X, File as FileIcon, Image as ImageIcon, Code, MessageSquare, Plus, Clock, Loader2, Copy, Check, PanelLeftClose, Menu } from 'lucide-react'
import { getDoubtHistory, solveDoubtWithFile } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useScrollOnSelect } from '@/lib/useScrollOnSelect'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

type DoubtItem = {
    id: string
    title: string
    question: string
    answer: string
    created_at: string
    file_name?: string
}

export default function DoubtsPage() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [history, setHistory] = useState<DoubtItem[]>([])
    const [activeDoubt, setActiveDoubt] = useState<DoubtItem | null>(null)
    const [loadingHistory, setLoadingHistory] = useState(true)

    // Chat state
    const [inputText, setInputText] = useState('')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const chatEndRef = useRef<HTMLDivElement>(null)
    const chatLogRef = useRef<HTMLDivElement>(null)

    // Load history
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await getDoubtHistory()
                setHistory(data)
            } catch (err) {
                console.error("Failed to load history:", err)
            } finally {
                setLoadingHistory(false)
            }
        }
        fetchHistory()
    }, [])

    // Scroll chat log container when active doubt changes
    useEffect(() => {
        if (chatLogRef.current) {
            chatLogRef.current.scrollTop = 0
        }
    }, [activeDoubt])

    // Scroll to bottom while submitting
    useEffect(() => {
        if (isSubmitting && chatLogRef.current) {
            chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight
        }
    }, [isSubmitting])

    // Auto-scroll container during text selection drag
    useScrollOnSelect(chatLogRef)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0])
        }
    }

    const clearFile = () => {
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const startNewDoubt = () => {
        setActiveDoubt(null)
        setInputText('')
        clearFile()
        setError(null)
    }

    const getFileIcon = (file: File) => {
        if (file.type.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-[#5ec4c7]" />
        if (file.name.match(/\.(c|cpp|java|py|ts|tsx|js|html|css)$/i)) return <Code className="w-4 h-4 text-[#fd6940]" />
        return <FileIcon className="w-4 h-4 text-emerald-500" />
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const currentFile = selectedFile
        const currentText = inputText

        if (!currentText.trim() && !currentFile) return

        setIsSubmitting(true)
        setError(null)

        // Optimistically set active doubt with temporary data
        const tempId = `temp-${Date.now()}`
        const newDoubt: DoubtItem = {
            id: tempId,
            title: "Analyzing...",
            question: currentText || (currentFile ? "Attached a file for analysis" : ""),
            answer: "", // empty means loading
            file_name: currentFile?.name,
            created_at: new Date().toISOString()
        }

        setActiveDoubt(newDoubt)
        setInputText('')
        clearFile() // Clear UI immediately

        try {
            const formData = new FormData()
            // Even if text is empty, the backend expects 'prompt' field
            formData.append('prompt', newDoubt.question)

            if (currentFile) formData.append('file', currentFile)

            const result = await solveDoubtWithFile(formData)

            // Append result to local state
            const finalizedDoubt: DoubtItem = {
                id: result.id,
                title: result.title,
                question: newDoubt.question,
                answer: result.answer,
                created_at: result.created_at,
                file_name: result.file_name
            }

            setActiveDoubt(finalizedDoubt)
            setHistory(prev => [finalizedDoubt, ...prev])
        } catch (err: any) {
            console.error("Failed to solve doubt:", err)
            setError(err.message || "Something went wrong.")
            setActiveDoubt(null)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Group history by relative date (Today, Yesterday, Older)
    const groupedHistory = history.reduce((acc, item) => {
        const date = new Date(item.created_at)
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        let group = "Older"
        if (date.toDateString() === today.toDateString()) group = "Today"
        else if (date.toDateString() === yesterday.toDateString()) group = "Yesterday"

        if (!acc[group]) acc[group] = []
        acc[group].push(item)
        return acc
    }, {} as Record<string, DoubtItem[]>)

    return (
        <div className="flex h-screen bg-[#f3f4f6] font-sans pb-0">
            {/* Sidebar (History) */}
            <div className={cn("bg-white border-r border-[#e2e8f0] flex flex-col h-full shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300", isSidebarOpen ? "w-80" : "w-0 overflow-hidden border-none opacity-0")}>
                <div className="p-6 border-b border-[#e2e8f0] flex items-center gap-3">
                    <button
                        onClick={startNewDoubt}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-[#181b25] hover:bg-black text-white rounded-xl font-bold transition-all shadow-md active:scale-[0.98]"
                    >
                        <Plus className="w-5 h-5" />
                        New Doubt
                    </button>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-3 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors" title="Collapse Sidebar">
                        <PanelLeftClose className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                    {loadingHistory ? (
                        <div className="flex justify-center py-10 opacity-50">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-10 px-4">
                            <MessageSquare className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm font-medium text-slate-400">No past doubts found. Ask your first question!</p>
                        </div>
                    ) : (
                        ['Today', 'Yesterday', 'Older'].map(group => {
                            const items = groupedHistory[group]
                            if (!items || items.length === 0) return null
                            return (
                                <div key={group}>
                                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
                                        {group === 'Today' && <Clock className="w-3.5 h-3.5" />}
                                        {group}
                                    </h3>
                                    <div className="space-y-1">
                                        {items.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => setActiveDoubt(item)}
                                                className={`w-full text-left px-4 py-3 rounded-xl transition-all ${activeDoubt?.id === item.id ? 'bg-[#e6cab3]/30 border border-[#e6cab3] shadow-sm' : 'hover:bg-slate-50 border border-transparent'}`}
                                            >
                                                <div className={`text-sm font-bold truncate ${activeDoubt?.id === item.id ? 'text-[#181b25]' : 'text-slate-700'}`}>
                                                    {item.title}
                                                </div>
                                                <div className="text-xs text-slate-400 font-medium truncate mt-1">
                                                    {item.question}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full relative transition-all duration-300 min-w-0">

                {!isSidebarOpen && (
                    <div className="absolute top-6 left-6 z-10 animate-in fade-in zoom-in duration-300">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-3 bg-white border border-slate-200 shadow-sm hover:shadow-md rounded-xl text-slate-500 hover:text-slate-800 transition-all"
                            title="Expand Sidebar"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Header Context */}
                {activeDoubt && activeDoubt.id !== `temp-` && (
                    <div className="absolute top-0 left-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 z-10 flex justify-between items-center shadow-sm">
                        <div className="font-bold text-slate-900 text-lg">{activeDoubt.title}</div>
                        <div className="text-xs text-slate-400 font-medium bg-slate-100 px-3 py-1.5 rounded-full">
                            {new Date(activeDoubt.created_at).toLocaleDateString()}
                        </div>
                    </div>
                )}

                {/* Chat Log */}
                <div ref={chatLogRef} className="flex-1 overflow-y-auto p-8 pt-24 pb-32 custom-scrollbar">
                    {!activeDoubt && !isSubmitting ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-80 mt-[-5%]">
                            <div className="w-24 h-24 bg-gradient-to-br from-[#a6d8d4] to-[#5ec4c7] rounded-[2rem] flex items-center justify-center mb-8 shadow-xl shadow-[#5ec4c7]/20 rotate-3">
                                <MessageSquare className="w-10 h-10 text-white fill-white/20" />
                            </div>
                            <h2 className="text-3xl font-extrabold text-[#181b25] tracking-tight mb-3">Hi! What can I help you with?</h2>
                            <p className="text-slate-500 font-medium max-w-md">
                                Type your question below, or attach an image, PDF, or code file for AI analysis.
                            </p>

                            <div className="flex gap-4 mt-10">
                                <button onClick={() => { setInputText("Can you explain Dynamic Programming using a real world analogy?"); fileInputRef.current?.focus() }} className="px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:border-[#a6d8d4] hover:shadow-md transition-all">
                                    Explain DP Patterns
                                </button>
                                <button onClick={() => { setInputText("Review this System Design architecture for a chat app."); fileInputRef.current?.focus() }} className="px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:border-[#e6cab3] hover:shadow-md transition-all">
                                    System Design Help
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto space-y-8">

                            {/* User Bubble */}
                            <div className="flex justify-end animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="bg-slate-800 text-white rounded-[2rem] rounded-tr-md px-6 py-4 max-w-[85%] shadow-[0_10px_40px_rgba(24,27,37,0.15)] flex flex-col gap-3">
                                    {activeDoubt?.file_name && (
                                        <div className="flex items-center gap-2.5 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl px-4 py-2 w-max transition-colors">
                                            <Paperclip className="w-4 h-4 text-[#5ec4c7]" />
                                            <span className="text-sm font-bold text-white max-w-[200px] sm:max-w-[300px] truncate">{activeDoubt.file_name}</span>
                                        </div>
                                    )}
                                    {activeDoubt?.question && (
                                        <div className="whitespace-pre-wrap font-medium leading-relaxed">{activeDoubt.question}</div>
                                    )}
                                </div>
                            </div>

                            {/* AI Bubble */}
                            <div className="flex justify-start animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-white border border-slate-100 rounded-[2rem] rounded-tl-md px-8 py-6 max-w-[90%] shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
                                    {activeDoubt?.answer === "" ? (
                                        <div className="flex items-center gap-3 text-slate-400 font-bold p-2">
                                            <Loader2 className="w-5 h-5 animate-spin text-[#5ec4c7]" />
                                            Analyzing your doubt...
                                        </div>
                                    ) : (
                                        <div className="prose prose-slate prose-p:leading-relaxed max-w-none text-slate-700 pt-2 pb-2">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm, remarkMath]}
                                                rehypePlugins={[rehypeKatex]}
                                            >
                                                {activeDoubt?.answer || ''}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div ref={chatEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area (Sticky Bottom) */}
                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#f3f4f6] via-[#f3f4f6] to-transparent pt-10 pb-6 rounded-br-2xl pointer-events-none">
                    <div className="max-w-4xl mx-auto px-8 pointer-events-auto">

                        {/* File Preview Pill */}
                        {selectedFile && (
                            <div className="flex items-center gap-3 bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2.5 mb-3 w-max animate-in slide-in-from-bottom-2 fade-in">
                                {getFileIcon(selectedFile)}
                                <span className="text-sm font-bold text-slate-700 max-w-[200px] truncate">{selectedFile.name}</span>
                                <button onClick={clearFile} className="ml-2 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                                    <X className="w-3.5 h-3.5 text-slate-500" />
                                </button>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 text-red-600 border border-red-100 rounded-xl px-4 py-3 mb-3 text-sm font-bold shadow-sm flex items-center justify-between">
                                {error}
                                <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="relative flex items-end gap-3 bg-white rounded-[2rem] p-3 pl-5 shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-slate-200 focus-within:border-[#5ec4c7] focus-within:ring-4 focus-within:ring-[#5ec4c7]/10 transition-all">

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            >
                                <Paperclip className="w-5 h-5" />
                            </button>

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept=".pdf,image/*,.c,.cpp,.java,.py,.ts,.tsx,.js,.txt"
                            />

                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Message Doubt Solver..."
                                className="flex-1 max-h-40 min-h-[44px] bg-transparent border-none focus:outline-none resize-none py-3 text-slate-900 font-medium placeholder-slate-400 custom-scrollbar text-[15px]"
                                rows={1}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        if (inputText.trim() || selectedFile) handleSubmit(e)
                                    }
                                }}
                            />

                            <button
                                type="submit"
                                disabled={isSubmitting || (!inputText.trim() && !selectedFile)}
                                className="shrink-0 w-12 h-12 rounded-full bg-[#181b25] text-white flex items-center justify-center shadow-lg hover:bg-black disabled:opacity-50 disabled:hover:bg-[#181b25] transition-all transform active:scale-95"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5 -ml-0.5" />
                                )}
                            </button>

                        </form>
                    </div>
                </div>

            </div>
        </div>
    )
}
