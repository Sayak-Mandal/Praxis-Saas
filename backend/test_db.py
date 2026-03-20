import asyncio
from sqlalchemy.orm import Session
from app.db.session import engine
from sqlalchemy import text

def test_db():
    with Session(engine) as db:
        try:
            db.execute(text("SELECT * FROM live_interview_sessions LIMIT 1"))
            print("Table exists")
        except Exception as e:
            print(f"Error: {e}")

test_db()
