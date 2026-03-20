'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    LayoutDashboard, MessageSquare, Code2, HelpCircle, LogOut,
    Edit2, RefreshCw, Mic, AlignLeft, ChevronsLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const navigation = [
    { name: 'Dashboard',          href: '/dashboard',          icon: LayoutDashboard },
    { name: 'Interview Practice',  href: '/practice/interview', icon: MessageSquare },
    { name: 'Live Interview',      href: '/interview/live',     icon: Mic },
    { name: 'Coding Practice',     href: '/practice/coding',    icon: Code2 },
    { name: 'Doubt Solver',        href: '/doubts',             icon: HelpCircle },
]

// ─── User Avatar ──────────────────────────────────────────────────────────────
function UserAvatar({ sidebarOpen, collapsed }: { sidebarOpen: boolean; collapsed: boolean }) {
    const [userMeta, setUserMeta] = useState<{ full_name: string; avatar_seed?: string } | null>(null)
    const [isHovered, setIsHovered] = useState(false)
    const [isPickerOpen, setIsPickerOpen] = useState(false)
    const [seeds, setSeeds] = useState<string[]>([])
    const [saving, setSaving] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const [pickerPos, setPickerPos] = useState({ top: 150, left: 280 })

    useEffect(() => { setIsMounted(true) }, [])

    const generateSeeds = () => {
        const newSeeds = Array.from({ length: 9 }, () => Math.random().toString(36).substring(2, 8))
        setSeeds(newSeeds)
    }

    const togglePicker = () => {
        if (!isPickerOpen) {
            generateSeeds()
            const vw = window.innerWidth
            const isMobile = vw < 768
            if (isMobile) {
                setPickerPos({ top: 160, left: Math.max(16, (vw - 320) / 2) })
            } else {
                setPickerPos({ top: 150, left: collapsed ? 80 : 280 })
            }
            setIsPickerOpen(true)
        } else {
            setIsPickerOpen(false)
        }
    }

    const selectAvatar = async (s: string) => {
        setSaving(true)
        const supabase = createClient()
        await supabase.auth.updateUser({ data: { avatar_seed: s } })
        setUserMeta(prev => prev ? { ...prev, avatar_seed: s } : null)
        setSaving(false)
        setIsPickerOpen(false)
    }

    useEffect(() => {
        async function loadUser() {
            const supabase = createClient()
            const { data } = await supabase.auth.getUser()
            if (data?.user?.user_metadata) {
                setUserMeta({
                    full_name: data.user.user_metadata.full_name || 'Candidate',
                    avatar_seed: data.user.user_metadata.avatar_seed
                })
            }
        }
        loadUser()
        const handleAvatarUpdate = () => loadUser()
        window.addEventListener('avatar-updated', handleAvatarUpdate)
        return () => window.removeEventListener('avatar-updated', handleAvatarUpdate)
    }, [])

    useEffect(() => {
        if (!sidebarOpen) setIsPickerOpen(false)
    }, [sidebarOpen])

    const name = userMeta?.full_name || 'Candidate'
    const seed = userMeta?.avatar_seed || name
    const avatarUrl = `https://robohash.org/${seed}.png?set=set4&bgset=bg1&size=200x200`

    if (collapsed) {
        return (
            <div className="relative flex items-center justify-center w-full py-2">
                <div
                    className="w-9 h-9 rounded-full bg-slate-100 border-2 border-white shadow overflow-hidden cursor-pointer relative group"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onClick={togglePicker}
                    title={name}
                >
                    <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                    <div className={cn("absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-200", isHovered ? "opacity-100" : "opacity-0")}>
                        <Edit2 className="w-3 h-3 text-white" />
                    </div>
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-[1.5px] border-white rounded-full" />
                </div>

                {isPickerOpen && isMounted && createPortal(
                    <>
                        <div className="fixed inset-0 z-[999]" onClick={() => setIsPickerOpen(false)} />
                        <div
                            className="fixed w-[min(19rem,calc(100vw-2rem))] bg-white rounded-[2rem] p-5 shadow-[0_40px_100px_-15px_rgba(0,0,0,0.25)] border border-slate-100/80 z-[1000] animate-in slide-in-from-left-4 fade-in duration-300"
                            style={{ top: pickerPos.top, left: pickerPos.left }}
                        >
                            <div className="flex justify-between items-center mb-5">
                                <div>
                                    <h3 className="text-[15px] font-bold text-slate-900 tracking-tight leading-tight">Change Avatar</h3>
                                    <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Select a new fun kitten!</p>
                                </div>
                                <button onClick={generateSeeds} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 hover:rotate-180 transition-all duration-300 shadow-sm" title="Shuffle">
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {seeds.map(s => (
                                    <button key={s} disabled={saving} onClick={() => selectAvatar(s)} className="aspect-square rounded-[1.25rem] bg-slate-50 hover:bg-emerald-50 border-2 border-transparent hover:border-emerald-400 hover:scale-105 transition-all duration-300 overflow-hidden relative group/btn p-1.5 shadow-sm">
                                        <img src={`https://robohash.org/${s}.png?set=set4&bgset=bg1&size=200x200`} alt={`Kitten option ${s}`} className="w-full h-full object-cover group-hover/btn:-translate-y-0.5 transition-transform duration-300" />
                                        {saving && <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px]" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>,
                    document.body
                )}
            </div>
        )
    }

    return (
        <div className="relative flex flex-col items-center w-full">
            <div
                className="w-[84px] h-[84px] rounded-full bg-slate-100 border-[4px] border-white shadow-[0_8px_16px_rgb(0,0,0,0.06)] overflow-hidden relative cursor-pointer group z-20"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={togglePicker}
            >
                <img src={avatarUrl} alt={`${name}'s Avatar`} className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-50" />
                <div className={cn("absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-200", isHovered ? "opacity-100" : "opacity-0")}>
                    <Edit2 className="w-6 h-6 text-white" />
                </div>
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-[2.5px] border-white rounded-full" />
            </div>
            <div className="text-center mt-1 z-20">
                <div className="font-bold text-slate-900 text-[15px]">{name}</div>
            </div>

            {isPickerOpen && isMounted && createPortal(
                <>
                    <div className="fixed inset-0 z-[999]" onClick={() => setIsPickerOpen(false)} />
                    <div
                        className="fixed w-[min(19rem,calc(100vw-2rem))] bg-white rounded-[2rem] p-5 shadow-[0_40px_100px_-15px_rgba(0,0,0,0.25)] border border-slate-100/80 z-[1000] animate-in slide-in-from-left-4 fade-in duration-300"
                        style={{ top: pickerPos.top, left: pickerPos.left }}
                    >
                        <div className="flex justify-between items-center mb-5">
                            <div>
                                <h3 className="text-[15px] font-bold text-slate-900 tracking-tight leading-tight">Change Avatar</h3>
                                <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Select a new fun kitten!</p>
                            </div>
                            <button onClick={generateSeeds} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 hover:rotate-180 transition-all duration-300 shadow-sm" title="Shuffle">
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {seeds.map(s => (
                                <button key={s} disabled={saving} onClick={() => selectAvatar(s)} className="aspect-square rounded-[1.25rem] bg-slate-50 hover:bg-emerald-50 border-2 border-transparent hover:border-emerald-400 hover:scale-105 transition-all duration-300 overflow-hidden relative group/btn p-1.5 shadow-sm">
                                    <img src={`https://robohash.org/${s}.png?set=set4&bgset=bg1&size=200x200`} alt={`Kitten option ${s}`} className="w-full h-full object-cover group-hover/btn:-translate-y-0.5 transition-transform duration-300" />
                                    {saving && <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px]" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
interface SidebarProps {
    isOpen: boolean
    onClose: () => void
    isCollapsed: boolean
    onToggleCollapsed: () => void
}

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapsed }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()

    // Close mobile drawer on route change
    useEffect(() => {
        onClose()
    }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleSignOut = async () => {
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('praxis_visit_tracked')
            sessionStorage.removeItem('praxis_dashboard_stats')
            sessionStorage.removeItem('praxis_dashboard_userName')
            sessionStorage.removeItem('praxis_dashboard_greeting')
        }
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <>
            {/* ── Mobile backdrop overlay ── */}
            <div
                className={cn(
                    'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden',
                    isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                )}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* ── Sidebar panel ── */}
            <div
                className={cn(
                    // Base — always present
                    'flex h-full flex-col bg-white border-r border-[#f3f4f6] relative z-50 transition-all duration-300 ease-in-out',
                    // Desktop: always visible, collapses in width
                    'md:static md:translate-x-0 md:z-20',
                    // Desktop width
                    isCollapsed ? 'md:w-16' : 'md:w-64',
                    // Mobile: fixed drawer, full width
                    'fixed top-0 left-0 w-64',
                    isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                )}
            >
                {/* ── Logo header (original branding) + collapse toggle ── */}
                <div className={cn(
                    'relative flex shrink-0 border-b border-slate-100 transition-all duration-300',
                    isCollapsed
                        ? 'py-5 flex-col items-center justify-center gap-3 px-0'
                        : 'h-[110px] flex-col items-center justify-center px-4 mt-2'
                )}>
                    {isCollapsed ? (
                        /* Collapsed: P pill and toggle stacked vertically */
                        <>
                            <div className="relative inline-flex">
                                <div className="flex items-center justify-center bg-[#e6cab3] w-9 h-9 rounded-xl shadow-sm">
                                    <span className="text-sm font-black text-[#181b25]">P</span>
                                </div>
                                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                                </span>
                            </div>
                            
                            {/* Expand toggle — directly below the P pill */}
                            <button
                                onClick={onToggleCollapsed}
                                title="Expand sidebar"
                                className="hidden md:flex w-7 h-7 items-center justify-center rounded-lg bg-slate-50 hover:bg-[#181b25] text-slate-400 hover:text-white border border-slate-200 hover:border-[#181b25] transition-all duration-200 shadow-sm"
                            >
                                <AlignLeft className="w-3.5 h-3.5" />
                            </button>
                        </>
                    ) : (
                        /* Expanded: exact original logo + top-right absolute collapse toggle */
                        <>
                            <div className="relative inline-flex">
                                <div className="flex items-center gap-2 bg-[#e6cab3] px-5 py-2 rounded-2xl shadow-sm">
                                    <span className="text-2xl font-black text-[#181b25] tracking-tight">Praxis</span>
                                </div>
                                {/* Pulsing green dot — branding */}
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                                </span>
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] text-center mt-3 leading-tight w-full">
                                Your One Stop<br />Placement Assistant
                            </p>

                            {/* Collapse toggle — pinned top-right, fully inside sidebar, desktop only */}
                            <button
                                onClick={onToggleCollapsed}
                                title="Collapse sidebar"
                                className="hidden md:flex absolute top-2.5 right-2.5 w-7 h-7 items-center justify-center rounded-lg bg-slate-50 hover:bg-[#181b25] text-slate-400 hover:text-white border border-slate-200 hover:border-[#181b25] transition-all duration-200 shadow-sm"
                            >
                                <ChevronsLeft className="w-3.5 h-3.5" />
                            </button>
                        </>
                    )}
                </div>

                {/* ── Navigation ── */}
                <div className="flex flex-1 flex-col overflow-y-auto px-3">

                    {/* Profile Widget */}
                    <div className={cn(
                        'flex flex-col items-center justify-center transition-all duration-300',
                        isCollapsed ? 'mt-4 mb-4' : 'mt-6 mb-10 space-y-3'
                    )}>
                        <UserAvatar sidebarOpen={isOpen} collapsed={isCollapsed} />
                    </div>

                    <nav className="flex-1 space-y-1.5">
                        {navigation.map((item) => {
                            const isActive = pathname.startsWith(item.href)
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    title={isCollapsed ? item.name : undefined}
                                    className={cn(
                                        isActive
                                            ? 'bg-[#181b25] text-white shadow-md'
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                                        'group flex items-center rounded-2xl transition-all duration-200',
                                        isCollapsed
                                            ? 'justify-center p-3'
                                            : 'gap-x-4 px-4 py-3.5 text-[13px] font-bold'
                                    )}
                                >
                                    <item.icon
                                        className={cn(
                                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600',
                                            'shrink-0 transition-colors',
                                            isCollapsed ? 'h-5 w-5' : 'h-5 w-5'
                                        )}
                                        aria-hidden="true"
                                    />
                                    {!isCollapsed && (
                                        <span className="text-[13px] font-bold whitespace-nowrap overflow-hidden">
                                            {item.name}
                                        </span>
                                    )}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Sign out */}
                    <div className="mt-auto pb-8 pt-4">
                        <button
                            onClick={handleSignOut}
                            title={isCollapsed ? 'Exit' : undefined}
                            className={cn(
                                'w-full group flex items-center rounded-2xl text-[13px] font-bold text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all duration-200',
                                isCollapsed ? 'justify-center p-3' : 'gap-x-4 px-4 py-3.5'
                            )}
                        >
                            <LogOut className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-red-500 transition-colors" />
                            {!isCollapsed && 'Exit'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
