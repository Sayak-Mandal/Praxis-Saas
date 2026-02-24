from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import func
from app.db.session import get_db
from app.schemas.requests import InterviewSessionStartRequest, InterviewResponseEvaluationRequest
from app.services.gemini import generate_ai_response_async
from app.db.models import InterviewSession, InterviewResponse, QuestionBank
from app.api.dependencies import get_current_user
import json

router = APIRouter(prefix="/practice/interview", tags=["interview"])

EVALUATION_SYSTEM_INSTRUCTION = """
You are an expert technical interviewer evaluating a candidate's answer to an interview question.
You must be strict but fair.
Penalize vague answers. Reward structure, clarity, and specific examples.
Only provide an improved_answer if the score is less than 10.
Return ONLY valid JSON matching this exact structure:
{
  "score": 0,
  "strengths": ["string"],
  "weaknesses": ["string"],
  "improved_answer": "string or null"
}
Do not include any markdown fences or explanations outside of the JSON object.
"""

@router.post("/session")
async def start_interview_session(
    request: InterviewSessionStartRequest, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Fetch 3 random questions matching role and difficulty
    questions = db.query(QuestionBank).filter(
        QuestionBank.role == request.role,
        QuestionBank.difficulty == request.difficulty
    ).order_by(func.random()).limit(3).all()

    if not questions:
        # Fallback if no specific questions found
        questions = db.query(QuestionBank).order_by(func.random()).limit(3).all()
        
    if not questions:
        raise HTTPException(status_code=400, detail="No questions available in the bank.")

    # Create Session
    new_session = InterviewSession(
        user_id=current_user["id"],
        role=request.role,
        difficulty=request.difficulty
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    # Return session along with the locked questions
    return {
        "success": True,
        "session_id": str(new_session.id),
        "questions": [
            {
                "id": str(q.id),
                "question_text": q.question_text,
                "hint": q.hint
            } for q in questions
        ]
    }

@router.post("/session/evaluate")
async def evaluate_interview_response(
    request: InterviewResponseEvaluationRequest, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Validate session and user
    session_val = db.query(InterviewSession).filter(
        InterviewSession.id == request.session_id,
        InterviewSession.user_id == current_user["id"]
    ).first()
    
    if not session_val:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    # Get question text
    question = db.query(QuestionBank).filter(QuestionBank.id == request.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")

    prompt = f"Question: {question.question_text}\nCandidate's Answer: {request.answer_text}"
    
    raw_response = await generate_ai_response_async(EVALUATION_SYSTEM_INSTRUCTION, prompt)
    
    if not raw_response:
        raise HTTPException(status_code=500, detail="Failed to get response from AI.")
        
    try:
        # Clean up in case Gemini wraps in markdown despite instructions
        cleaned_response = raw_response.replace("```json", "").replace("```", "").strip()
        feedback_data = json.loads(cleaned_response)
    except json.JSONDecodeError:
        print(f"Failed to parse JSON: {raw_response}")
        raise HTTPException(status_code=500, detail="AI returned malformed evaluation data.")

    strengths = "\\n".join(feedback_data.get("strengths", [])) if isinstance(feedback_data.get("strengths"), list) else ""
    weaknesses = "\\n".join(feedback_data.get("weaknesses", [])) if isinstance(feedback_data.get("weaknesses"), list) else ""

    response_record = InterviewResponse(
        session_id=session_val.id,
        question_id=question.id,
        answer=request.answer_text,
        score=feedback_data.get("score", 0),
        strengths=strengths,
        weaknesses=weaknesses,
        improved_answer=feedback_data.get("improved_answer")
    )
    db.add(response_record)
    
    # Update running average score of the session
    all_responses = db.query(InterviewResponse).filter(InterviewResponse.session_id == session_val.id).all()
    current_total_score = sum(r.score for r in all_responses if r.score is not None) + feedback_data.get("score", 0)
    session_val.average_score = current_total_score / (len(all_responses) + 1)
    
    db.commit()
    
    return {
        "success": True, 
        "evaluation": {
            "score": feedback_data.get("score", 0),
            "strengths": feedback_data.get("strengths", []),
            "weaknesses": feedback_data.get("weaknesses", []),
            "improved_answer": feedback_data.get("improved_answer")
        },
        "session_average": round(session_val.average_score, 1)
    }
