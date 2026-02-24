import uuid
from sqlalchemy import Column, String, Integer, Float, Boolean, JSON, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default="student")
    readiness_index = Column(Integer, default=0)
    gender = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    interview_attempts = relationship("InterviewAttempt", back_populates="user")
    coding_attempts = relationship("CodingAttempt", back_populates="user")
    doubts = relationship("Doubt", back_populates="user")
    weak_topics = relationship("WeakTopic", back_populates="user")

class InterviewAttempt(Base):
    __tablename__ = "interview_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    topic = Column(String)
    score = Column(Integer)
    feedback = Column(JSON)
    duration_seconds = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="interview_attempts")

class CodingAttempt(Base):
    __tablename__ = "coding_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    problem_slug = Column(String)
    language = Column(String)
    submitted_code = Column(String)
    success = Column(Boolean)
    execution_time_ms = Column(Integer)
    ai_feedback = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="coding_attempts")

class Doubt(Base):
    __tablename__ = "doubts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    title = Column(String) # new column to summarize doubt history
    question = Column(String)
    ai_answer = Column(String)
    context_tags = Column(String)
    file_name = Column(String, nullable=True) # stores the attached file's name
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="doubts")

class WeakTopic(Base):
    __tablename__ = "weak_topics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    topic_name = Column(String)
    weakness_score = Column(Float)
    last_identified = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="weak_topics")

class QuestionBank(Base):
    __tablename__ = "question_bank"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)
    question_text = Column(String, nullable=False)
    hint = Column(String, nullable=True)

class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    role = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)
    average_score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    responses = relationship("InterviewResponse", back_populates="session", cascade="all, delete-orphan")

class InterviewResponse(Base):
    __tablename__ = "interview_responses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("interview_sessions.id", ondelete="CASCADE"))
    question_id = Column(UUID(as_uuid=True), ForeignKey("question_bank.id", ondelete="CASCADE"))
    answer = Column(String, nullable=True)
    score = Column(Integer, nullable=True)
    strengths = Column(String, nullable=True)
    weaknesses = Column(String, nullable=True)
    improved_answer = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    session = relationship("InterviewSession", back_populates="responses")
    question = relationship("QuestionBank")

class AppSession(Base):
    """Records each unique visit/session by a user. Used for App Visits metric."""
    __tablename__ = "app_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

