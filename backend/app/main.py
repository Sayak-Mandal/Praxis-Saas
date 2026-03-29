from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import health, doubts, interview, coding, users, live_interview

app = FastAPI(
    title="Praxis API",
    description="SaaS Backend for Praxis AI Assitant",
    version="1.0.0"
)

# CORS configuration
# Explicit origins for localhost dev
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # Allows ALL Vercel preview deployments and production domains for this project
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api/v1")
app.include_router(doubts.router, prefix="/api/v1")
app.include_router(interview.router, prefix="/api/v1")
app.include_router(coding.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(live_interview.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "Welcome to Praxis API"}
