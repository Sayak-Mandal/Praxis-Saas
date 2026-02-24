import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PasswordInput } from '@/components/PasswordInput'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string }>
}) {
    const params = await searchParams
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    // If already logged in, go to dashboard
    if (session) {
        redirect('/dashboard')
    }

    const signIn = async (formData: FormData) => {
        'use server'
        const email = formData.get('email') as string
        const password = formData.get('password') as string
        const supabase = await createClient()

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            return redirect('/login?message=Could not authenticate user')
        }

        return redirect('/dashboard')
    }

    return (
        <div className="min-h-screen bg-[#f3f4f6] flex font-sans relative overflow-hidden">
            {/* Background Decor (for the right side now) */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#a6d8d4] rounded-full blur-[120px] opacity-40 pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[10%] w-[40%] h-[40%] bg-[#e6cab3] rounded-full blur-[120px] opacity-40 pointer-events-none"></div>

            {/* Left Side: Premium Image Showcase (Hidden on Mobile) */}
            <div className="hidden lg:flex lg:w-1/2 p-12 relative items-center justify-center isolate">
                {/* Animated Pulsing Glow behind the image */}
                <div className="absolute inset-16 bg-gradient-to-br from-emerald-400 via-cyan-400 to-[#e6cab3] rounded-[3rem] blur-[80px] opacity-[0.85] animate-pulse" style={{ animationDuration: '4s' }}></div>

                {/* 3D Glass Frame around the Image */}
                <div className="relative w-full h-full max-h-[85vh] rounded-[2.5rem] bg-white/10 p-2 shadow-[0_30px_100px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur-md border border-white/20 transform-gpu transition-transform hover:scale-[1.02] duration-700 ease-out z-10 before:absolute before:inset-0 before:rounded-[2.5rem] before:ring-1 before:ring-white/30 before:pointer-events-none">
                    <img
                        src="/login-bg.jpg"
                        alt="Digital AI Network visualization"
                        className="w-full h-full object-cover rounded-[2rem] shadow-inner"
                    />

                    {/* Inner glowing edge highlight */}
                    <div className="absolute inset-2 rounded-[2rem] ring-1 ring-white/40 pointer-events-none"></div>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="flex-1 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-20 lg:w-1/2 relative z-10 bg-white/40 lg:bg-transparent lg:backdrop-blur-none backdrop-blur-xl">
                <div className="w-full max-w-md mx-auto">
                    <div className="flex flex-col items-center justify-center mb-14">
                        <div className="relative inline-flex mb-4">
                            <div className="flex items-center gap-2 bg-[#e6cab3] px-6 py-2.5 rounded-2xl shadow-sm border border-white">
                                <span className="text-lg font-black text-[#181b25] uppercase tracking-[0.3em]">Praxis</span>
                            </div>
                            <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-90"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-400 border-[2.5px] border-white" style={{ boxShadow: '0 0 8px 3px rgba(34,197,94,0.85)' }}></span>
                            </span>
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] text-center mt-1">Your One Stop Placement Assistant</p>
                    </div>

                    <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
                        Welcome Back
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-600 font-medium mb-8">
                        New to Praxis?{' '}
                        <Link href="/signup" className="font-bold text-[#fd6940] hover:text-[#e05b35] transition-colors">
                            Create an account
                        </Link>
                    </p>

                    <div className="bg-white/80 py-10 px-6 shadow-[0_20px_60px_rgba(0,0,0,0.05)] sm:rounded-[2rem] sm:px-10 border border-slate-100/50 backdrop-blur-md">
                        <form className="space-y-6" action={signIn}>
                            <div>
                                <label htmlFor="email" className="block text-sm font-bold text-slate-700">
                                    Email Address
                                </label>
                                <div className="mt-2 text-left">
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        className="appearance-none block w-full px-4 py-3.5 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#5ec4c7] focus:border-transparent transition-all sm:text-sm"
                                        placeholder="your@email.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-bold text-slate-700">
                                    Password
                                </label>
                                <div className="mt-2">
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        autoComplete="current-password"
                                        required
                                        className="appearance-none block w-full pl-4 pr-12 py-3.5 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#5ec4c7] focus:border-transparent transition-all sm:text-sm"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            {params?.message && (
                                <p className="mt-4 p-4 bg-red-50 text-red-600 font-medium text-center text-sm rounded-xl border border-red-100 shadow-sm">
                                    {params.message}
                                </p>
                            )}

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-slate-200/50 text-sm font-bold text-white bg-[#181b25] hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#181b25] transition-all active:scale-[0.98]"
                                >
                                    Sign In to Praxis
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
