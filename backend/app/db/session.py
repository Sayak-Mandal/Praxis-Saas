from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Wait for POSTGRES_URL to be set in environment
engine = create_engine(
    settings.POSTGRES_URL.replace("postgres://", "postgresql://") if settings.POSTGRES_URL else "sqlite:///./test.db",
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
