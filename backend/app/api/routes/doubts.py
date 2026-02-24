from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.gemini import generate_ai_response_async
from app.services.file_parser import parse_file_to_text
from app.db.models import Doubt
from app.api.dependencies import get_current_user
import json

router = APIRouter(prefix="/doubts", tags=["doubts"])

SYSTEM_INSTRUCTION = """
You are an expert technical interviewer and computer science tutor.
A student will ask you a doubt. Provide a clear, concise, and structured explanation.
You must return a JSON object containing:
1. "title": A short summary title (3-5 words max) representing the doubt topic.
2. "answer": The detailed explanation.

Return strict JSON:
{
  "title": "Short Summarized Title",
  "answer": "Your detailed markdown explanation here..."
}
"""

@router.post("/solve")
async def solve_doubt(
    prompt: str = Form(...),
    file: UploadFile = File(None),
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    # Process optional file
    file_context = ""
    file_name = None
    if file:
        file_name = file.filename
        file_bytes = await file.read()
        extracted_text = parse_file_to_text(file_bytes, file.filename)
        file_context = f"\n\n[Attached File Content]:\n{extracted_text}"

    # Construct the final prompt
    full_prompt = f"Student Question: {prompt}{file_context}"
    
    # Generate AI response
    raw_response = await generate_ai_response_async(SYSTEM_INSTRUCTION, full_prompt)
    if not raw_response:
        raise HTTPException(status_code=429, detail="Failed to get response from AI. You might be asking too many questions too quickly (API Rate Limit). Please wait a moment and try again.")
        
    try:
        cleaned = raw_response.replace("```json", "").replace("```", "").strip()
        result_data = json.loads(cleaned)
        ai_answer = result_data.get("answer", "No answer provided.")
        title = result_data.get("title", prompt[:30] + "...")
    except Exception as e:
        print(f"Error parsing JSON from Gemini: {e}")
        ai_answer = raw_response
        title = prompt[:30] + "..."
    
    # Save the doubt for history
    doubt_record = Doubt(
        user_id=current_user["id"],
        question=prompt,
        ai_answer=ai_answer,
        title=title,
        context_tags="",
        file_name=file_name
    )
    db.add(doubt_record)
    db.commit()
    db.refresh(doubt_record)
    
    return {
        "id": doubt_record.id,
        "title": doubt_record.title,
        "answer": doubt_record.ai_answer,
        "created_at": doubt_record.created_at,
        "file_name": doubt_record.file_name
    }

@router.get("/history")
async def get_doubt_history(
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    doubts = db.query(Doubt).filter(Doubt.user_id == current_user["id"]).order_by(Doubt.created_at.desc()).all()
    
    history_list = []
    for d in doubts:
        history_list.append({
            "id": str(d.id),
            "title": d.title or f"Doubt {d.created_at.strftime('%Y-%m-%d')}",
            "question": d.question,
            "answer": d.ai_answer,
            "created_at": d.created_at.isoformat(),
            "file_name": d.file_name
        })
        
    return history_list
