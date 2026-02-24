from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import health, doubts, interview, coding, users

app = FastAPI(
    title="Praxis API",
    description="SaaS Backend for Praxis AI Assitant",
    version="1.0.0"
)

# Proper CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https://.*\.vercel\.app",
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

@app.get("/")
def read_root():
    return {"message": "Welcome to Praxis API"}
