Praxis SaaS

AI-Powered Placement Preparation Platform

Praxis SaaS is a full-stack, production-ready interview and coding preparation platform built with modern web technologies. It helps candidates simulate technical interviews, evaluate coding solutions, and resolve doubts using AI-powered feedback.

The platform is designed with a scalable architecture separating frontend, backend, database, and AI service layers.

⸻

Core Features

Interview Practice
	•	Role & difficulty-based mock interviews
	•	AI-evaluated responses using Google Gemini
	•	Structured feedback (score, strengths, weaknesses, improved answer)
	•	Session persistence and history tracking

Coding Practice
	•	DSA-style question bank
	•	AI code evaluation & optimization suggestions
	•	Performance scoring system
	•	Submission tracking per user

Doubt Solver
	•	AI-powered conceptual explanations
	•	PDF/image/code upload support
	•	OCR-based text extraction (Tesseract)
	•	Conversation history storage

Dashboard & Analytics
	•	Readiness score calculation
	•	Interview & coding performance metrics
	•	Engagement tracking
	•	Fully backend-calculated analytics (no unnecessary AI calls)

Authentication
	•	Secure login & signup using Supabase Auth
	•	JWT-based route protection
	•	Middleware-protected frontend routes

⸻

Tech Stack

Frontend
	•	Next.js 14 (App Router)
	•	TypeScript
	•	Tailwind CSS
	•	Supabase Auth Client

Backend
	•	FastAPI (Python)
	•	SQLAlchemy ORM
	•	Pydantic
	•	Supabase PostgreSQL
	•	Google Gemini API

Dev Tools
	•	Uvicorn
	•	ESLint
	•	PostCSS
	•	Tesseract OCR
	•	PyPDF

⸻

## 📂 Project Architecture

```
praxis-saas/
│
├── backend/                 # FastAPI + SQLAlchemy + Supabase
│   ├── app/
│   │   ├── main.py          # FastAPI entry point
│   │   ├── api/             # Route definitions
│   │   ├── core/            # App configuration
│   │   ├── db/              # Database models & session
│   │   ├── schemas/         # Pydantic request/response models
│   │   └── services/        # Business logic (AI, analytics, file parsing)
│   │
│   ├── schema.sql           # Supabase DB schema
│   └── requirements.txt
│
├── frontend/                # Next.js 14 (App Router) + Tailwind
│   ├── src/
│   │   ├── app/             # Pages (Dashboard, Interview, Coding, Doubts)
│   │   ├── components/      # Shared UI components
│   │   └── lib/             # API + Supabase utilities
│   │
│   └── public/              # Static assets
│
└── README.md
```

⸻

Getting Started

Prerequisites
	•	Node.js v18+
	•	Python 3.10+
	•	Supabase Project
	•	Google Gemini API Key

⸻

Backend Setup

cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

Create .env:

SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
POSTGRES_URL=your_supabase_connection_string
GEMINI_API_KEY=your_gemini_key

Run backend:

uvicorn app.main:app --reload

Backend runs on:

http://localhost:8000

Swagger Docs:

http://localhost:8000/docs


⸻

Frontend Setup

cd frontend
npm install

Create .env.local:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

Run frontend:

npm run dev

Frontend runs on:

http://localhost:3000


⸻

Architecture Highlights
	•	Modular backend structure (API → Services → DB → Core)
	•	Clean separation of concerns
	•	Stateless FastAPI routes
	•	JWT-based authentication middleware
	•	AI usage optimized to reduce unnecessary API consumption
	•	Scalable SaaS-ready architecture

⸻

Future Improvements
	•	AI-powered adaptive difficulty
	•	Resume analysis & personalized question recommendations
	•	Leaderboards & peer comparison
	•	Interview performance trend prediction
	•	Stripe subscription integration
