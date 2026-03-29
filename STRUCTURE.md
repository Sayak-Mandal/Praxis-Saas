# Praxis — Project Structure

A full walkthrough of the repository layout to help contributors and self-hosters understand where everything lives.

```
praxis-saas/
├── README.md                        # Setup & installation guide
├── STRUCTURE.md                     # This file — full project map
│
├── backend/                         # FastAPI Python backend
│   ├── requirements.txt             # All Python dependencies (pip install -r)
│   ├── schema.sql                   # Raw SQL schema — run once in Supabase SQL editor
│   ├── seed_questions.py            # Optional: seeds interview question bank to DB
│   ├── create_table.py              # Utility: creates DB tables programmatically via SQLAlchemy
│   │
│   └── app/                         # Main application package
│       ├── main.py                  # FastAPI app entry point; registers all routers & CORS
│       │
│       ├── core/
│       │   └── config.py            # Pydantic Settings — reads .env vars (SUPABASE_URL, GEMINI_API_KEY, etc.)
│       │
│       ├── db/
│       │   ├── models.py            # SQLAlchemy ORM models:
│       │   │                        #   InterviewSession, CodingAttempt, Doubt, User, LiveInterviewSession
│       │   ├── session.py           # DB engine & session factory (connects to Supabase PostgreSQL)
│       │   └── auth/                # Auth-related DB utilities
│       │
│       ├── schemas/
│       │   └── requests.py          # Pydantic request/response schemas used by API routes
│       │                            #   includes LiveInterviewCreate, LiveInterviewEnd, LiveInterviewResponse
│       │
│       ├── services/
│       │   ├── gemini.py            # Google Gemini AI integration:
│       │   │                        #   interview eval, doubt solving, coding eval, live interview analysis
│       │   ├── file_parser.py       # Extracts text from uploaded PDFs and images (PyPDF + Tesseract OCR)
│       │   └── analytics.py         # Aggregates DB data into dashboard stats (scores, readiness index, etc.)
│       │
│       └── api/
│           ├── dependencies.py      # Shared FastAPI dep — extracts & verifies Supabase JWT from headers
│           └── routes/
│               ├── health.py        # GET /api/v1/health — liveness probe (returns status + version)
│               ├── users.py         # POST /api/v1/users/visit — tracks app visits per user
│               ├── interview.py     # POST /api/v1/interview/start
│               │                    # POST /api/v1/interview/evaluate — mock interview flow
│               ├── coding.py        # POST /api/v1/coding/evaluate — code submission via Gemini
│               ├── doubts.py        # POST /api/v1/doubts/solve
│               │                    # GET  /api/v1/doubts/history — doubt solver flow
│               └── live_interview.py # POST /api/v1/live-interview/start  — create a new live session
│                                     # POST /api/v1/live-interview/end    — submit transcript & get AI feedback
│                                     # GET  /api/v1/live-interview/history — list past live sessions per user
│                                     # GET  /api/v1/live-interview/{id}   — get single session details
│
└── frontend/                        # Next.js 16 (App Router) TypeScript frontend
    ├── package.json                 # NPM dependencies & scripts (dev, build, start, lint)
    ├── next.config.ts               # Next.js configuration
    ├── tsconfig.json                # TypeScript configuration
    ├── postcss.config.mjs           # PostCSS config (for Tailwind v4)
    ├── eslint.config.mjs            # ESLint rules
    │
    ├── public/                      # Static assets served at root URL
    │   └── login-bg.jpg             # Background image used on auth pages
    │
    └── src/
        ├── middleware.ts            # Next.js middleware — protects /dashboard, /practice, /doubts, /interview
        │                           #   routes (redirects unauthenticated users to /login via Supabase session check)
        │
        ├── app/                     # Next.js App Router pages
        │   ├── layout.tsx           # Root layout — sets up ThemeProvider & Geist fonts
        │   ├── page.tsx             # Root redirect → /dashboard (or /login if not authed)
        │   ├── globals.css          # Global CSS — Tailwind base, typography overrides, custom fonts
        │   │
        │   ├── (auth)/              # Route group — no sidebar layout
        │   │   ├── login/
        │   │   │   └── page.tsx     # Login page (email + password via Supabase Auth)
        │   │   └── signup/
        │   │       └── page.tsx     # Sign Up page (name, email, password)
        │   │
        │   └── (app)/               # Route group — protected, shares sidebar layout
        │       ├── layout.tsx       # App shell: Sidebar + mobile hamburger topbar + <main>
        │       ├── dashboard/
        │       │   └── page.tsx     # Dashboard — performance stats, activity chart, engagement metrics
        │       ├── doubts/
        │       │   └── page.tsx     # Doubt Solver — AI chat with file attachment support (PDF/image/code)
        │       ├── interview/
        │       │   └── live/
        │       │       └── page.tsx # 🎙️ Live Interview Mode — real-time AI interviewer with:
        │       │                    #   • Animated AI avatar + synchronized lip movement
        │       │                    #   • Browser Speech Synthesis API for AI voice output
        │       │                    #   • Microphone input for candidate voice responses
        │       │                    #   • TensorFlow BlazeFace local video analysis (privacy-first)
        │       │                    #   • Configurable role & difficulty setup screen
        │       │                    #   • Full transcript collection & post-session AI feedback
        │       └── practice/
        │           ├── interview/
        │           │   └── page.tsx # Interview Practice — configurable role/difficulty mock interview
        │           └── coding/
        │               └── page.tsx # Coding Practice — question bank with AI code evaluation
        │
        ├── components/              # Shared UI components
        │   ├── Sidebar.tsx          # Main navigation sidebar — collapsible on mobile, always-open on desktop
        │   │                        #   includes links to Dashboard, Practice (Interview/Coding), Doubts, Live Interview
        │   ├── PasswordInput.tsx    # Password field with show/hide toggle
        │   ├── theme-provider.tsx   # next-themes ThemeProvider wrapper
        │   └── theme-toggle.tsx     # Dark/light mode toggle button
        │
        └── lib/                     # Utilities & API helpers
            ├── api.ts               # All fetch calls to the FastAPI backend:
            │                        #   interview, coding, doubts, analytics, live interview
            ├── utils.ts             # cn() helper — merges Tailwind class names (clsx + tailwind-merge)
            ├── useScrollOnSelect.ts # Custom hook — auto-scrolls containers on text-selection drag
            └── supabase/
                ├── client.ts        # Supabase browser client (for use in Client Components)
                ├── server.ts        # Supabase server client (for use in Server Components / Route Handlers)
                └── middleware.ts    # Supabase session refresh helper used by src/middleware.ts
```

---

## Environment Variables

### `backend/.env`

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL (e.g. `https://xyz.supabase.co`) |
| `SUPABASE_KEY` | Supabase **service role** key (has full DB access — keep secret!) |
| `GEMINI_API_KEY` | Google Gemini API key from [Google AI Studio](https://aistudio.google.com/) |
| `DATABASE_URL` | Full PostgreSQL connection string from Supabase → Project Settings → Database |

### `frontend/.env.local`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Same Supabase project URL as above |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase **anon** (public) key — safe to expose in client |
| `NEXT_PUBLIC_API_URL` | Backend base URL (default: `http://localhost:8000`) |

---

## Database Tables

| Table | Description |
|---|---|
| `users` | Registered user profiles & visit tracking |
| `interview_sessions` | Mock interview sessions (questions, answers, AI scores) |
| `coding_attempts` | Code submissions per user with AI evaluation results |
| `doubts` | Doubt solver conversations and uploaded file references |
| `live_interview_sessions` | Live interview sessions — stores transcript, role, difficulty, AI feedback & score |

Run `backend/schema.sql` in your Supabase SQL editor to create all tables.

---

## Request Flow

```
Browser → Next.js Frontend (port 3000)
            │
            ├── Supabase Auth  (login / signup / session management)
            │
            └── FastAPI Backend (port 8000)
                    │
                    ├── Supabase PostgreSQL  (stores sessions, attempts, doubts, live interview sessions)
                    └── Google Gemini AI     (evaluates interviews, code, doubts, and live interview transcripts)
```

### Live Interview Flow (client-side heavy)

```
User Setup Screen (role + difficulty)
        │
        ▼
POST /api/v1/live-interview/start  → creates DB record, returns session_id
        │
        ▼
Live Interview Page
  ├── AI Avatar speaks questions via Browser Speech Synthesis API
  ├── Candidate responds via Microphone (Web Speech Recognition)
  ├── TensorFlow BlazeFace analyses webcam locally (no video sent to server)
  └── Transcript built incrementally in browser state
        │
        ▼
POST /api/v1/live-interview/end  (with full transcript)
  └── Gemini AI evaluates transcript → returns score + structured feedback
        │
        ▼
Feedback screen shown to user, session saved to DB
```
