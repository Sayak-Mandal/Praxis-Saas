'use client'

import { useState } from 'react'
import { PasswordInput } from './PasswordInput'

interface LoginFormProps {
    signIn: (formData: FormData) => Promise<void>
    errorMessage?: string
}

export function LoginForm({ signIn, errorMessage }: LoginFormProps) {
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true)
        await signIn(formData)
        // If signIn redirects on success, this won't run.
        // On error (redirect back), the page re-renders and isLoading resets.
        setIsLoading(false)
    }

    return (
        <form className="space-y-6" action={handleSubmit}>
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
                        disabled={isLoading}
                        className="appearance-none block w-full px-4 py-3.5 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#5ec4c7] focus:border-transparent transition-all sm:text-sm disabled:opacity-60 disabled:cursor-not-allowed"
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
                        disabled={isLoading}
                        className="appearance-none block w-full pl-4 pr-12 py-3.5 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#5ec4c7] focus:border-transparent transition-all sm:text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="••••••••"
                    />
                </div>
            </div>

            {errorMessage && (
                <p className="mt-4 p-4 bg-red-50 text-red-600 font-medium text-center text-sm rounded-xl border border-red-100 shadow-sm">
                    {errorMessage}
                </p>
            )}

            <div className="pt-2">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full relative flex justify-center items-center gap-3 py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-slate-200/50 text-sm font-bold text-white bg-[#181b25] hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#181b25] transition-all active:scale-[0.98] disabled:opacity-80 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                    {isLoading ? (
                        <>
                            {/* Spinner */}
                            <svg
                                className="animate-spin h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                            </svg>
                            Signing in…
                        </>
                    ) : (
                        'Sign In to Praxis'
                    )}
                </button>
            </div>

            {/* Subtle status text shown while loading */}
            {isLoading && (
                <p className="text-center text-xs text-slate-400 font-medium animate-pulse">
                    Authenticating, please wait…
                </p>
            )}
        </form>
    )
}
