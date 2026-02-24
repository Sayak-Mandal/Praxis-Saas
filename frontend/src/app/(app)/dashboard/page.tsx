'use client'

import { useEffect, useState, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { CheckCircle2, ArrowUpRight, ArrowDownRight, Eye, ArrowRight, Star, RefreshCw } from 'lucide-react'
import { getAnalytics, trackVisit } from '@/lib/api'

// MOCK_DATA removed, using real DB data

export default function DashboardPage() {
    const [stats, setStats] = useState<any>(null)

    // Split loading states to render stats immediately
    const [statsLoading, setStatsLoading] = useState(true)

    // Chart interactivity state
    const [activeMetric, setActiveMetric] = useState<'scores' | 'interviews'>('scores')
    const [timeframe, setTimeframe] = useState<'Week' | 'Month'>('Week')

    const [userName, setUserName] = useState('Candidate')

    // Greeting logic based on hour
    const [greeting, setGreeting] = useState('Good day')

    // Refreshing state for the button spinner
    const [refreshing, setRefreshing] = useState(false)

    // Define loadStats as a reusable callback so it can be triggered by the refresh button
    const loadStats = useCallback(async () => {
        setStatsLoading(true)
        setRefreshing(true)
        try {
            // Fetch User metadata for name
            const { createClient } = await import('@/lib/supabase/client')
            const supabase = createClient()
            const { data: userData } = await supabase.auth.getUser()

            let newUserName = 'Candidate'
            if (userData?.user?.user_metadata?.full_name) {
                // Extract first name
                newUserName = userData.user.user_metadata.full_name.split(' ')[0]
            }
            setUserName(newUserName)

            // Calculate greeting
            const hour = new Date().getHours()
            let newGreeting = 'Good day'
            if (hour >= 5 && hour < 12) newGreeting = 'Good morning'
            else if (hour >= 12 && hour < 17) newGreeting = 'Good afternoon'
            else if (hour >= 17 && hour < 22) newGreeting = 'Good evening'
            else newGreeting = 'Good night'
            setGreeting(newGreeting)

            const analyticsRes = await getAnalytics()
            setStats(analyticsRes.stats)

            // Cache the data in sessionStorage so leaving the tab and coming back doesn't cause a reload
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('praxis_dashboard_stats', JSON.stringify(analyticsRes.stats))
                sessionStorage.setItem('praxis_dashboard_userName', newUserName)
                sessionStorage.setItem('praxis_dashboard_greeting', newGreeting)
            }

            // NOTE: trackVisit is intentionally NOT called here.
            // It is called once on login/sign-in, not on every dashboard refresh.
        } catch (e) {
            console.error("Using mock stats", e)
            setStats({
                total_interviews: 12, avg_interview_score: 78.5,
                total_coding_attempts: 45, coding_success_rate: 62.4, total_doubts_asked: 28
            })
        } finally {
            setStatsLoading(false)
            setRefreshing(false)
        }
    }, [])

    // Load fast stats on initial render if not cached
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const cachedStats = sessionStorage.getItem('praxis_dashboard_stats')
            if (cachedStats) {
                try {
                    setStats(JSON.parse(cachedStats))
                    setUserName(sessionStorage.getItem('praxis_dashboard_userName') || 'Candidate')
                    setGreeting(sessionStorage.getItem('praxis_dashboard_greeting') || 'Good day')
                    setStatsLoading(false)
                } catch (e) {
                    loadStats()
                }
            } else {
                loadStats()
            }
        }
    }, [loadStats])

    // Track app visit only once per browser session (tab close clears sessionStorage)
    useEffect(() => {
        if (typeof window !== 'undefined' && !sessionStorage.getItem('praxis_visit_tracked')) {
            // Only mark as tracked after the API call succeeds, so failures allow retry
            trackVisit().then(() => {
                sessionStorage.setItem('praxis_visit_tracked', '1')
            })
        }
    }, [])

    const toggleTimeframe = () => {
        setTimeframe(prev => prev === 'Week' ? 'Month' : 'Week')
    }

    if (statsLoading) {
        return (
            <div className="flex items-center justify-center h-full bg-[#f3f4f6]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#181b25]"></div>
            </div>
        )
    }

    const chartData = stats?.weekly_activity?.[activeMetric] || []

    return (
        <div className="h-full bg-[#f3f4f6] text-slate-900 p-6 md:p-10 font-sans pb-20 overflow-y-auto w-full">
            <div className="max-w-[1200px] mx-auto space-y-6">

                {/* Personalized Greeting Header */}
                <div className="mb-8 pl-2">
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                        {greeting}, {userName}! 👋
                    </h1>
                    <p className="text-slate-500 font-medium mt-1 ml-1 text-sm">
                        Here&apos;s your latest placement readiness report.
                    </p>
                </div>

                {/* Top Row: Performance (1/3) & Activity (2/3) */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">

                    {/* Performance Card (Navy Box) */}
                    <div className="bg-[#181b25] text-white rounded-[2rem] p-8 shadow-xl flex flex-col relative overflow-hidden h-[400px]">
                        <div className="flex justify-between items-center mb-10 shrink-0">
                            <h2 className="text-xl font-bold tracking-wide">Performance</h2>
                            <button className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                                …
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8 shrink-0">
                            <div>
                                <div className="text-4xl font-extrabold">{stats?.avg_interview_score || 0}%</div>
                                <div className="text-[10px] text-white/50 mt-1.5 uppercase tracking-wider font-semibold">Avg Score</div>
                            </div>
                            <div className="border-l border-white/20 pl-6">
                                <div className="text-4xl font-extrabold">{stats?.coding_success_rate || 0}%</div>
                                <div className="text-[10px] text-white/50 mt-1.5 uppercase tracking-wider font-semibold">Coding Success</div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                            {/* Strengths First (Positive Affirmation) */}
                            <div>
                                <h3 className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-3">Your Strengths</h3>
                                <div className="space-y-4">
                                    {(stats?.top_strengths || ["Data Structures"]).map((topic: string, i: number) => {
                                        const colors = ["bg-emerald-500", "bg-teal-400", "bg-green-400"];
                                        return (
                                            <div key={`s-${i}`} className="flex items-center gap-4 group cursor-default">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${colors[i % 3]}`}>
                                                    <Star className="w-3.5 h-3.5 text-white fill-white" />
                                                </div>
                                                <span className="text-sm text-slate-200 font-medium group-hover:text-white transition-colors capitalize">{topic}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Weaknesses Below */}
                            <div>
                                <h3 className="text-xs text-[#fd6940] font-bold uppercase tracking-wider mb-3">Areas to Polish</h3>
                                <div className="space-y-4">
                                    {(stats?.top_weaknesses?.slice(0, 3) || ["Dynamic Programming", "System Design"]).map((topic: string, i: number) => {
                                        const colors = ["bg-[#fd6940]", "bg-[#5ec4c7]", "bg-[#deb18b]"];
                                        return (
                                            <div key={`w-${i}`} className="flex items-center gap-4 group cursor-default">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${colors[i % 3]}`}>
                                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                                </div>
                                                <span className="text-sm text-slate-300 font-medium group-hover:text-white transition-colors capitalize">{topic}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Activity Box (Light Blue) */}
                    <div className="bg-[#a6d8d4] rounded-[2rem] p-8 shadow-xl relative overflow-hidden flex flex-col h-[400px]">
                        <div className="flex justify-between items-start mb-6 z-10 relative">
                            <div className="flex gap-6 items-baseline">
                                <h2 className="text-xl font-bold text-slate-900 border-b-2 border-transparent pb-1">Activity</h2>
                                <button
                                    onClick={() => setActiveMetric('scores')}
                                    className={`font-semibold transition-colors ${activeMetric === 'scores' ? 'text-slate-900 border-b-2 border-[#fd6940] pb-1' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Scores
                                </button>
                                <button
                                    onClick={() => setActiveMetric('interviews')}
                                    className={`font-semibold transition-colors ${activeMetric === 'interviews' ? 'text-slate-900 border-b-2 border-[#fd6940] pb-1' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Interviews
                                </button>
                            </div>
                            <button
                                onClick={toggleTimeframe}
                                className="bg-[#181b25] text-white text-xs font-bold px-4 py-2 border border-black/10 rounded-xl hover:bg-black transition-colors"
                            >
                                {timeframe} ▾
                            </button>
                        </div>

                        <div className="z-10 relative flex justify-between items-center">
                            <p className="text-xs text-slate-700/80 font-medium leading-[1.4] max-w-[150px]">
                                Your data updates<br />every <span className="font-bold border-b border-black text-slate-900">3 hours</span>
                            </p>

                            {/* Center Floating Value Tooltip matching the design */}
                            {!statsLoading && (
                                <div className="absolute top-8 left-1/2 -translate-x-[40%] bg-white rounded-full px-4 py-2 flex items-center gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.1)] z-20">
                                    <div className="w-6 h-6 rounded-full bg-[#fd6940] flex items-center justify-center shrink-0">
                                        <Eye className="w-3 h-3 text-white" />
                                    </div>
                                    <div className="flex flex-col pr-2">
                                        <span className="text-sm font-bold text-slate-900 leading-none">{stats?.readiness_index || 0} / 100</span>
                                        <span className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">Readiness</span>
                                    </div>
                                    <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-r border-b border-transparent shadow-[2px_2px_4px_rgba(0,0,0,0.02)]" />

                                    <div className="absolute top-10 left-1/2 -translate-x-1/2 w-px h-[100px] border-l border-dashed border-slate-400/50 -z-10" />
                                </div>
                            )}
                        </div>

                        {/* Chart Area with Wave background mock */}
                        <div className="absolute bottom-0 left-0 w-full h-[60%] bg-gradient-to-b from-white-200 to-white/30 rounded-t-[100%] scale-x-[1.5] scale-y-[0.8] origin-bottom opacity-40 mix-blend-overlay pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-full h-[45%] bg-gradient-to-b from-white/60 to-white/90 rounded-t-[100%] scale-x-[1.2] scale-y-[0.5] origin-bottom translate-x-10 mix-blend-soft-light pointer-events-none"></div>

                        <div className="flex-1 w-[105%] -ml-[2.5%] relative z-10 min-h-[160px] pb-4 self-end min-w-0 min-h-0">
                            <ResponsiveContainer width="99%" height="100%" minWidth={400} minHeight={160}>
                                <LineChart data={chartData} margin={{ top: 120, right: 20, left: 20, bottom: 0 }}>
                                    <XAxis dataKey="day" stroke="#475569" tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                                    <Line
                                        key={`${timeframe}-${activeMetric}`}
                                        type="monotone"
                                        dataKey="v"
                                        stroke="#ffffff"
                                        strokeWidth={4}
                                        dot={false}
                                        activeDot={{ r: 6, strokeWidth: 4, stroke: "#181b25", fill: "#ffffff" }}
                                        isAnimationActive={true}
                                        animationDuration={500}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Engagement */}
                <div className="bg-[#e6cab3] rounded-[2rem] p-8 shadow-xl flex flex-col lg:flex-row gap-8 lg:gap-12 items-center relative overflow-visible mt-12 mb-8">

                    <div className="w-full lg:w-1/4 shrink-0 pr-4">
                        <h2 className="text-[1.35rem] font-bold text-slate-900 mb-3 tracking-tight">Engagement</h2>
                        <p className="text-[11px] text-slate-700 font-medium leading-relaxed tracking-wide opacity-80">General statistic of<br />user engagement<br />processes.</p>
                    </div>

                    <div className="w-full lg:w-3/4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-5 h-full relative z-10 pt-4 lg:pt-0">

                        {/* Daily Card */}
                        <div className="bg-white rounded-[1.25rem] p-5 shadow-[0_15px_30px_rgb(0,0,0,0.06)] flex flex-col justify-between h-[150px] relative mt-4 lg:mt-0 lg:-top-6 hover:-translate-y-1 transition-transform">
                            <div className="w-9 h-9 rounded-full bg-[#fd6940] flex items-center justify-center text-white absolute -top-4 shadow-lg shrink-0">
                                ✦
                            </div>
                            <div className="mt-5 text-[11px] font-bold text-slate-700 tracking-wide uppercase">Total Interviews</div>
                            <div className="flex items-baseline gap-2 mt-auto">
                                <span className="text-[2rem] font-black text-slate-900 leading-none">{stats?.total_interviews || 0}</span>
                                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                            </div>
                        </div>

                        {/* Weekly Card */}
                        <div className="bg-white rounded-[1.25rem] p-5 shadow-[0_15px_30px_rgb(0,0,0,0.06)] flex flex-col justify-between h-[150px] relative mt-4 lg:mt-0 lg:top-0 hover:-translate-y-1 transition-transform">
                            <div className="w-9 h-9 rounded-full bg-[#fd6940] flex items-center justify-center text-white absolute -top-4 shadow-lg shrink-0 overflow-hidden relative group">
                                <span className="relative z-10 leading-none pb-0.5">◐</span>
                            </div>
                            <div className="mt-5 text-[11px] font-bold text-slate-700 tracking-wide uppercase">Coding Subs</div>
                            <div className="flex items-baseline gap-2 mt-auto">
                                <span className="text-[2rem] font-black text-slate-900 leading-none">{stats?.total_coding_attempts || 0}</span>
                                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                            </div>
                        </div>

                        {/* Monthly Card */}
                        <div className="bg-white rounded-[1.25rem] p-5 shadow-[0_15px_30px_rgb(0,0,0,0.06)] flex flex-col justify-between h-[150px] relative mt-4 lg:mt-0 lg:-top-6 hover:-translate-y-1 transition-transform">
                            <div className="w-9 h-9 rounded-full bg-[#fd6940] flex items-center justify-center text-white absolute -top-4 shadow-lg shrink-0">
                                ★
                            </div>
                            <div className="mt-5 text-[11px] font-bold text-slate-700 tracking-wide uppercase">Doubts Solved</div>
                            <div className="flex items-baseline gap-2 mt-auto">
                                <span className="text-[2rem] font-black text-slate-900 leading-none">{stats?.total_doubts_asked || 0}</span>
                                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                            </div>
                        </div>

                        {/* Pending Card */}
                        <div className="bg-white rounded-[1.25rem] p-5 shadow-[0_15px_30px_rgb(0,0,0,0.06)] flex flex-col justify-between h-[150px] relative mt-4 lg:mt-0 lg:top-0 hover:-translate-y-1 transition-transform">
                            <div className="w-9 h-9 rounded-full bg-[#fd6940] flex items-center justify-center text-white absolute -top-4 shadow-lg shrink-0">
                                ⏏
                            </div>
                            <div className="mt-5 text-[11px] font-bold text-slate-700 tracking-wide uppercase">App Visits</div>
                            <div className="flex items-baseline gap-2 mt-auto">
                                <span className="text-[2rem] font-black text-slate-900 leading-none">{stats?.total_app_visits || 0}</span>
                                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                            </div>
                        </div>

                        {/* Action Card - Your New Metrics - Refresh Dashboard */}
                        <div className="bg-gradient-to-br from-[#a6d8d4] to-[#88c8c5] rounded-[1.25rem] p-5 shadow-[0_15px_30px_rgb(0,0,0,0.1)] flex flex-col justify-between h-[150px] relative mt-4 lg:mt-0 lg:-top-6 hover:-translate-y-1 transition-transform border border-white/20 col-span-2 md:col-span-4 lg:col-span-1">
                            <div className="text-sm font-bold text-slate-900 leading-[1.2] relative z-10 w-3/4">Refresh<br />Metrics</div>
                            <button
                                onClick={() => loadStats()}
                                disabled={refreshing}
                                className="w-10 h-10 rounded-[10px] bg-[#181b25] text-white flex items-center justify-center hover:bg-black transition-colors mt-auto relative z-10 disabled:opacity-70"
                            >
                                <RefreshCw className={`w-4 h-4 stroke-[3] ${refreshing ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
