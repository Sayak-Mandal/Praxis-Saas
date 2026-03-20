'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from '@/components/Sidebar'

export default function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

    return (
        <div className="flex h-screen overflow-hidden bg-[#f3f4f6]">
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                isCollapsed={sidebarCollapsed}
                onToggleCollapsed={() => setSidebarCollapsed(prev => !prev)}
            />

            {/* Right column: mobile topbar + page content */}
            <div className="flex flex-col flex-1 overflow-hidden min-w-0">

                {/* Mobile-only topbar */}
                <div className="md:hidden flex items-center h-14 px-4 bg-white border-b border-slate-100 shrink-0 z-10">
                    <button
                        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[#f3f4f6] border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200"
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Open navigation"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                </div>

                <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    {children}
                </main>
            </div>
        </div>
    )
}
