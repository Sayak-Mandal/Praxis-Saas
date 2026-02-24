from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.requests import CodingEvaluationRequest
from app.services.gemini import generate_ai_response_async
from app.db.models import CodingAttempt
from app.api.dependencies import get_current_user
import json

router = APIRouter(prefix="/practice/coding", tags=["coding"])

SYSTEM_INSTRUCTION = """
You are a senior principal engineer and algorithmic judge.
Evaluate the user's submitted code for the given problem.
Analyze time complexity, space complexity, correctness, and edge cases.
Return strictly a JSON without markdown wrapping:
{
  "success": true, // or false if logic is fundamentally flawed or syntax errors exist
  "time_complexity": "O(N)",
  "space_complexity": "O(1)",
  "feedback": "Your solution is optimal, however, be careful with variable naming.",
  "hints": ["Consider using a hash map to reduce time complexity"]
}
"""

@router.post("/evaluate")
async def evaluate_code(
    request: CodingEvaluationRequest, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    prompt = f"Problem: {request.problem_slug}\nLanguage: {request.language}\nCode:\n{request.submitted_code}"
    
    raw_response = await generate_ai_response_async(SYSTEM_INSTRUCTION, prompt)
    
    if not raw_response:
        raise HTTPException(status_code=500, detail="Failed to get evaluation from AI.")
    
    try:
        cleaned = raw_response.replace("```json", "").replace("```", "").strip()
        feedback_data = json.loads(cleaned)
    except json.JSONDecodeError:
        print(f"Failed to parse JSON: {raw_response}")
        feedback_data = {"success": False, "error": "Failed to parse AI response."}

    attempt_record = CodingAttempt(
        user_id=current_user["id"],
        problem_slug=request.problem_slug,
        language=request.language,
        submitted_code=request.submitted_code,
        success=feedback_data.get("success", False),
        execution_time_ms=request.execution_time_ms,
        ai_feedback=feedback_data
    )
    db.add(attempt_record)
    db.commit()
    
    return {"evaluation": feedback_data}
