import { createClient } from './supabase/client'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

async function getAuthHeaders() {
    const supabase = createClient()

    // Always try to get an up-to-date session. 
    // getSession() can return a stale cached token, so we call it to check for
    // an existing refresh_token, then use refreshSession if available.
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
        throw new Error("No active session")
    }

    // If the session has a refresh_token, force a silent refresh to avoid 
    // sending an expired access_token to the backend.
    if (session.refresh_token) {
        try {
            const { data: refreshed } = await supabase.auth.refreshSession({ refresh_token: session.refresh_token })
            if (refreshed?.session?.access_token) {
                return {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${refreshed.session.access_token}`
                }
            }
        } catch {
            // Fall through to use the existing session token
        }
    }

    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
    }
}

export async function solveDoubtWithFile(formData: FormData) {
    const { 'Content-Type': _ignored, ...headers } = await getAuthHeaders()
    // Content-Type is omitted so the browser sets it to multipart/form-data with boundary

    const response = await fetch(`${API_BASE_URL}/doubts/solve`, {
        method: 'POST',
        headers,
        body: formData
    })

    if (!response.ok) throw new Error("Failed to fetch doubt resolution")
    return response.json()
}

export async function getDoubtHistory() {
    const headers = await getAuthHeaders()

    const response = await fetch(`${API_BASE_URL}/doubts/history`, {
        method: 'GET',
        headers,
    })

    if (!response.ok) throw new Error("Failed to fetch doubt history")
    return response.json()
}

export async function evaluateCoding(problemSlug: string, language: string, code: string, executionTimeMs: number) {
    const headers = await getAuthHeaders()

    const response = await fetch(`${API_BASE_URL}/practice/coding/evaluate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            user_id: "placeholder",
            problem_slug: problemSlug,
            language,
            submitted_code: code,
            execution_time_ms: executionTimeMs
        })
    })

    if (!response.ok) throw new Error("Failed to evaluate code")
    return response.json()
}

export async function startInterviewSession(role: string, difficulty: string) {
    const headers = await getAuthHeaders()

    const response = await fetch(`${API_BASE_URL}/practice/interview/session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ role, difficulty })
    })

    if (!response.ok) throw new Error("Failed to start session")
    return response.json()
}

export async function evaluateInterviewResponse(sessionId: string, questionId: string, answerText: string) {
    const headers = await getAuthHeaders()

    const response = await fetch(`${API_BASE_URL}/practice/interview/session/evaluate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            session_id: sessionId,
            question_id: questionId,
            answer_text: answerText
        })
    })

    if (!response.ok) throw new Error("Failed to evaluate answer")
    return response.json()
}

export async function getAnalytics() {
    const headers = await getAuthHeaders()

    const response = await fetch(`${API_BASE_URL}/users/me/analytics`, {
        method: 'GET',
        headers,
    })

    if (!response.ok) {
        const errText = await response.text()
        console.error("Analytics API Error:", errText)
        throw new Error("Failed to fetch analytics")
    }
    return response.json()
}

export async function trackVisit() {
    try {
        const headers = await getAuthHeaders()
        const response = await fetch(`${API_BASE_URL}/users/me/track-visit`, {
            method: 'POST',
            headers,
        })
        if (!response.ok) {
            const errText = await response.text()
            console.error("[trackVisit] Backend error:", response.status, errText)
        } else {
        }
    } catch (e) {
        console.error("[trackVisit] Network error:", e)
    }
}

export async function startLiveInterview(role: string, difficulty: string) {
    const headers = await getAuthHeaders()

    const response = await fetch(`${API_BASE_URL}/interview/live/start`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ role, difficulty })
    })

    if (!response.ok) throw new Error("Failed to start live interview")
    return response.json()
}

export async function endLiveInterview(sessionId: string, fillerWordCount: number, transcript: any[]) {
    let headers: Record<string, string>
    try {
        headers = await getAuthHeaders()
    } catch (authErr) {
        console.error("endLiveInterview: auth session unavailable", authErr)
        throw new Error("Session expired. Please refresh and try again.")
    }

    const response = await fetch(`${API_BASE_URL}/interview/live/end`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            session_id: sessionId,
            filler_word_count: fillerWordCount,
            transcript: transcript
        })
    })

    if (!response.ok) {
        const errText = await response.text().catch(() => "")
        console.error("endLiveInterview error:", response.status, errText)
        throw new Error(`Failed to end live interview (${response.status})`)
    }
    return response.json()
}

