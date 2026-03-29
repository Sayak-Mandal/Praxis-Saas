# Praxis SaaS

### AI-Powered Placement Preparation Platform

Praxis SaaS is a full-stack, production-ready interview and coding preparation platform built with modern web technologies. It helps candidates simulate technical interviews — including real-time live mock interviews with an AI interviewer — evaluate coding solutions, and resolve doubts using AI-powered feedback.

The platform is designed with a scalable architecture separating frontend, backend, database, and AI service layers.

---

## Core Features

### 🎙️ Live Interview Mode *(New)*
- Real-time AI interviewer using browser Speech Synthesis API
- Animated AI avatar with synchronized lip movement
- Microphone-based voice input from the candidate
- TensorFlow BlazeFace-powered local video analysis (privacy-first — no video is sent to the server)
- Configurable role & difficulty selection before session start
- Full session transcript stored and evaluated after the interview
- Post-session structured feedback (score, strengths, areas of improvement)

### 🧑‍💼 Interview Practice
- Role & difficulty-based mock interviews
- AI-evaluated responses using Google Gemini
- Structured feedback (score, strengths, weaknesses, improved answer)
- Session persistence and history tracking

### 💻 Coding Practice
- DSA-style question bank
- AI code evaluation & optimization suggestions
- Performance scoring system
- Submission tracking per user

### 🤔 Doubt Solver
- AI-powered conceptual explanations
- PDF / image / code upload support
- OCR-based text extraction (Tesseract)
- Conversation history storage

### 📊 Dashboard & Analytics
- Readiness score calculation
- Interview & coding performance metrics
- Engagement tracking
- Fully backend-calculated analytics (no unnecessary AI calls)

### 🔐 Authentication
- Secure login & signup using Supabase Auth
- JWT-based route protection
- Middleware-protected frontend routes

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v4 |
| **Auth Client** | Supabase SSR |
| **AI (Face Detection)** | TensorFlow.js + BlazeFace |
| **Backend Framework** | FastAPI (Python) |
| **ORM** | SQLAlchemy |
| **Validation** | Pydantic v2 |
| **DB & Auth** | Supabase (PostgreSQL) |
| **AI / LLM** | Google Gemini API |
| **OCR** | Tesseract + PyPDF |
| **Server** | Uvicorn |

---

## Architecture Overview

Praxis SaaS follows a clean layered architecture:

```
Browser → Next.js Frontend (port 3000)
            │
            ├── Supabase Auth  (login / signup / session management)
            │
            └── FastAPI Backend (port 8000)
                    │
                    ├── Supabase PostgreSQL  (sessions, attempts, doubts, live interviews)
                    └── Google Gemini AI     (evaluates interviews, code, doubts, and live sessions)
```

- **Frontend (Next.js)** → UI + Auth + Protected Routes
- **Backend (FastAPI)** → Business logic + REST API endpoints
- **Services Layer** → AI evaluation, analytics, file parsing
- **Database (Supabase PostgreSQL)** → Persistent storage
- **Authentication** → Supabase JWT verification

---

## Project Structure

```
praxis-saas/
│
├── backend/                 # FastAPI + SQLAlchemy + Supabase
│   ├── app/
│   │   ├── main.py          # FastAPI entry point, CORS config, router registration
│   │   ├── api/             # Route handlers (interview, coding, doubts, live_interview, users, health)
│   │   ├── core/            # App configuration (Pydantic Settings)
│   │   ├── db/              # SQLAlchemy models & database session
│   │   ├── schemas/         # Pydantic request/response models
│   │   └── services/        # Business logic (Gemini AI, analytics, file parsing)
│   │
│   ├── schema.sql           # Supabase DB schema (run once in SQL editor)
│   └── requirements.txt     # Python dependencies
│
├── frontend/                # Next.js 16 (App Router) + Tailwind CSS
│   ├── src/
│   │   ├── app/             # Pages (Dashboard, Interview, Live Interview, Coding, Doubts)
│   │   ├── components/      # Shared UI components (Sidebar, PasswordInput, ThemeToggle)
│   │   └── lib/             # API helpers, Supabase client/server, custom hooks
│   │
│   └── public/              # Static assets
│
├── README.md
└── STRUCTURE.md             # Full project file map
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- Python 3.10+
- Supabase project
- Google Gemini API key

---

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_service_role_key
DATABASE_URL=your_supabase_postgres_connection_string
GEMINI_API_KEY=your_gemini_key
```

Run backend:
```bash
uvicorn app.main:app --reload
```

- **API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs

---

### Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Run frontend:
```bash
npm run dev
```

- **App**: http://localhost:3000

---

### Database Setup

1. Open your Supabase project → **SQL Editor**
2. Paste and run `backend/schema.sql` — creates all required tables including `live_interview_sessions`
3. *(Optional)* Run `python backend/seed_questions.py` to pre-populate the question bank

---

## Architecture Highlights

- Modular backend structure (API → Services → DB → Core)
- Clean separation of concerns — stateless FastAPI routes
- JWT-based authentication middleware
- Privacy-first live interview: face detection runs locally in the browser (no video sent to server)
- Browser Speech Synthesis API used for AI voice (zero cost, zero latency)
- AI usage optimized to reduce unnecessary API consumption
- Scalable SaaS-ready architecture

---

## Future Improvements

- AI-powered adaptive difficulty based on performance history
- Resume analysis & personalized question recommendations
- Leaderboards & peer comparison
- Interview performance trend prediction
- Stripe subscription integration
- Emotion & confidence scoring via video analysis
