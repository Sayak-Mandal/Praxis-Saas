'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface PasswordInputProps {
    id: string
    name: string
    placeholder?: string
    required?: boolean
    autoComplete?: string
    className?: string
    disabled?: boolean
}

export function PasswordInput({
    id,
    name,
    placeholder = '••••••••',
    required = false,
    autoComplete,
    className = '',
    disabled = false
}: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false)

    return (
        <div className="relative">
            <input
                id={id}
                name={name}
                type={showPassword ? 'text' : 'password'}
                autoComplete={autoComplete}
                required={required}
                className={className}
                placeholder={placeholder}
                disabled={disabled}
            />
            <button
                type="button"
                disabled={disabled}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
            >
                {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                )}
            </button>
        </div>
    )
}
