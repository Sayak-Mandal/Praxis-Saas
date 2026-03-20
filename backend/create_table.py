from sqlalchemy.orm import Session
from app.db.session import engine
from sqlalchemy import text

def create_table():
    with Session(engine) as db:
        try:
            db.execute(text("""
            CREATE TABLE IF NOT EXISTS live_interview_sessions (
                id UUID PRIMARY KEY,
                user_id UUID NOT NULL,
                role VARCHAR(255) NOT NULL,
                difficulty VARCHAR(50) NOT NULL,
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                ended_at TIMESTAMP WITHOUT TIME ZONE,
                overall_score INTEGER,
                communication_score INTEGER,
                technical_accuracy INTEGER,
                strengths TEXT,
                weaknesses TEXT,
                filler_tips JSONB
            );
            """))
            db.commit()
            print("Table created successfully")
        except Exception as e:
            print(f"Error: {e}")

create_table()
