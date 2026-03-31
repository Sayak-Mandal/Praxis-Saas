import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from '@/components/LoginForm'

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

        let redirectUrl = '/dashboard'

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                redirectUrl = '/login?message=Could not authenticate user'
            }
        } catch (err) {
            console.error('Login action error:', err)
            redirectUrl = '/login?message=Authentication service unreachable. Check your Supabase URL.'
        }

        return redirect(redirectUrl)
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
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
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
                        <LoginForm signIn={signIn} errorMessage={params?.message} />
                    </div>
                </div>
            </div>
        </div>
    )
}
