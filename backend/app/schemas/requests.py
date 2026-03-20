from pydantic import BaseModel
from typing import Optional

class DoubtRequest(BaseModel):
    user_id: str
    question: str
    context_tags: Optional[str] = None

class InterviewSessionStartRequest(BaseModel):
    role: str
    difficulty: str

class InterviewResponseEvaluationRequest(BaseModel):
    session_id: str
    question_id: str
    answer_text: str

class InterviewEvaluationRequest(BaseModel):
    user_id: str
    topic: str
    transcript: str
    duration_seconds: int

class CodingEvaluationRequest(BaseModel):
    user_id: str
    problem_slug: str
    language: str
    submitted_code: str
    execution_time_ms: int

class LiveInterviewStartRequest(BaseModel):
    role: str
    difficulty: str

class LiveInterviewEndRequest(BaseModel):
    session_id: str
    filler_word_count: int
    transcript: list[dict[str, str]]
