from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import health, doubts, interview, coding, users, live_interview
from app.db.session import engine, Base
from app.db import models  # noqa: F401 — ensures all models are registered

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create all tables on startup (safe: uses CREATE TABLE IF NOT EXISTS)
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="Praxis API",
    description="SaaS Backend for Praxis AI Assitant",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = [
    "http://localhost:3000",
    "https://praxis-saas.vercel.app",  # Vercel production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # Catches all Vercel preview deployment URLs
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
