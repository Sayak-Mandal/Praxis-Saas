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
│   │
│   └── app/                         # Main application package
│       ├── main.py                  # FastAPI app entry point; registers all routers & CORS
│       │
│       ├── core/
│       │   └── config.py            # Pydantic Settings — reads .env vars (SUPABASE_URL, GEMINI_API_KEY, etc.)
│       │
│       ├── db/
│       │   ├── models.py            # SQLAlchemy ORM models (InterviewSession, CodingAttempt, Doubt, etc.)
│       │   └── session.py           # DB engine & session factory (connects to Supabase PostgreSQL)
│       │
│       ├── schemas/
│       │   └── requests.py          # Pydantic request/response schemas used by API routes
│       │
│       ├── services/
│       │   ├── gemini.py            # Google Gemini AI integration (interview eval, doubt solving, coding eval)
│       │   ├── file_parser.py       # Extracts text from uploaded PDFs and images (PyPDF2 + Tesseract OCR)
│       │   └── analytics.py        # Aggregates DB data into dashboard stats (scores, readiness index, etc.)
│       │
│       └── api/
│           ├── dependencies.py      # Shared FastAPI dependency — extracts & verifies Supabase JWT from headers
│           └── routes/
│               ├── health.py        # GET /health — simple liveness probe
│               ├── users.py         # POST /users/visit — tracks app visits per user
│               ├── interview.py     # POST /interview/start, /interview/evaluate — mock interview flow
│               ├── coding.py        # POST /coding/evaluate — code submission evaluation via Gemini
│               └── doubts.py        # POST /doubts/solve, GET /doubts/history — doubt solver flow
│
└── frontend/                        # Next.js 14 (App Router) TypeScript frontend
    ├── package.json                 # NPM dependencies & scripts
    ├── next.config.ts               # Next.js configuration
    ├── tsconfig.json                # TypeScript configuration
    ├── postcss.config.mjs           # PostCSS config (for Tailwind)
    ├── eslint.config.mjs            # ESLint rules
    │
    ├── public/                      # Static assets served at root URL
    │   └── login-bg.jpg             # Background image used on auth pages
    │
    └── src/
        ├── middleware.ts            # Next.js middleware — protects /dashboard, /practice, /doubts routes
        │                           #   (redirects unauthenticated users to /login via Supabase session check)
        │
        ├── app/                     # Next.js App Router pages
        │   ├── layout.tsx           # Root layout — sets up ThemeProvider & Geist fonts
        │   ├── page.tsx             # Root redirect → /dashboard (or /login if not authed)
        │   ├── globals.css          # Global CSS — Tailwind base, typography overrides
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
        │       └── practice/
        │           ├── interview/
        │           │   └── page.tsx # Interview Practice — configurable role/difficulty mock interview
        │           └── coding/
        │               └── page.tsx # Coding Practice — question bank with AI code evaluation
        │
        ├── components/              # Shared UI components
        │   ├── Sidebar.tsx          # Main navigation sidebar (collapsible on mobile, always-open on desktop)
        │   ├── PasswordInput.tsx    # Password field with show/hide toggle
        │   ├── theme-provider.tsx   # next-themes ThemeProvider wrapper
        │   └── theme-toggle.tsx     # Dark/light mode toggle button
        │
        └── lib/                     # Utilities & API helpers
            ├── api.ts               # All fetch calls to the FastAPI backend (interview, coding, doubts, analytics)
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

## Database Setup

1. Open your Supabase project → **SQL Editor**
2. Paste and run the contents of `backend/schema.sql` — this creates all required tables
3. *(Optional)* Run `python backend/seed_questions.py` to pre-populate interview questions in the DB

---

## Request Flow

```
Browser → Next.js Frontend (port 3000)
            │
            ├── Supabase Auth  (login / signup / session management)
            │
            └── FastAPI Backend (port 8000)
                    │
                    ├── Supabase PostgreSQL  (stores sessions, attempts, doubts, analytics)
                    └── Google Gemini AI     (evaluates interviews, code, and doubts)
```
