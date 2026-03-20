import os
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, List
import json
import base64

from app.db.session import get_db
from app.api.dependencies import get_current_user
from app.schemas.requests import LiveInterviewStartRequest, LiveInterviewEndRequest
from app.db.models import QuestionBank
from sqlalchemy.sql.expression import func
from app.services.live_interview_service import (
    start_live_session,
    GeminiLiveInterviewer,
    end_live_session,
    LiveInterviewScorecard
)

router = APIRouter(prefix="/interview/live", tags=["live_interview"])

# In-memory store for transcripts mapping session_id -> list of exchanges
ACTIVE_TRANSCRIPTS: Dict[str, List[Dict[str, str]]] = {}

# In-memory store for interviewer instances (for end session if needed to use instance method)
# Since generate_scorecard is an instance method on GeminiLiveInterviewer, we either recreate it or keep it here.
ACTIVE_INTERVIEWERS: Dict[str, GeminiLiveInterviewer] = {}


@router.post("/start")
async def start_live_interview(
    request: LiveInterviewStartRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        session_id = start_live_session(
            role=request.role,
            difficulty=request.difficulty,
            user_id=current_user["id"],
            db=db
        )
        return {"session_id": session_id, "status": "active"}
    except Exception as e:
        print(f"Error starting live session: {e}")
        raise HTTPException(status_code=500, detail="Failed to start live session")


@router.websocket("/stream/{session_id}")
async def live_interview_stream(websocket: WebSocket, session_id: str, db: Session = Depends(get_db)):
    await websocket.accept()
    
    # 1. Fetch difficulty and role to initialize the Gemini agent
    try:
        query = text("""
            SELECT role, difficulty FROM live_interview_sessions WHERE id = :session_id
        """)
        result = db.execute(query, {"session_id": session_id}).fetchone()
        
        if not result:
            await websocket.send_json({"type": "error", "message": "Session not found."})
            await websocket.close(code=1008)
            return

        role = result[0]
        difficulty = result[1]
        
        # 1.5 Fetch identical mock interview questions
        questions = db.query(QuestionBank).filter(
            QuestionBank.role == role,
            QuestionBank.difficulty == difficulty
        ).order_by(func.random()).limit(3).all()

        if not questions:
            questions = db.query(QuestionBank).order_by(func.random()).limit(3).all()

        question_texts = [q.question_text for q in questions] if questions else ["Could you describe your overall experience in this field?"]
        
    except Exception as e:
        print(f"WebSocket DB Error: {e}")
        await websocket.send_json({"type": "error", "message": "Failed to look up session."})
        await websocket.close(code=1011)
        return

    # 2. Initialize the Interviewer
    try:
        interviewer = GeminiLiveInterviewer(role=role, difficulty=difficulty, questions=question_texts)
        ACTIVE_INTERVIEWERS[session_id] = interviewer
        ACTIVE_TRANSCRIPTS[session_id] = []
        
        # Initiate interview
        initial_audio, initial_text = await interviewer.initiate_interview()
        if initial_audio:
            encoded_audio = base64.b64encode(initial_audio).decode('utf-8')
            await websocket.send_json({
                "type": "audio_response",
                "data": encoded_audio,
                "text": initial_text
            })
            ACTIVE_TRANSCRIPTS[session_id].append({"role": "agent", "text": initial_text})
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error initializing interviewer: {e}")
        await websocket.send_json({"type": "error", "message": "Failed to initialize Gemini agent due to Rate Limits or config. The interview will proceed without AI agent."})
        ACTIVE_INTERVIEWERS[session_id] = None
        ACTIVE_TRANSCRIPTS[session_id] = []

    # 3. Message Loop
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                msg_type = message.get("type")
                msg_data = message.get("data")
                transcript_text = message.get("transcript_text") # Frontend might send the user's recognized text

                if msg_type == "audio" and msg_data:
                    # Append user text to transcript if provided by frontend speech-to-text optionally
                    if transcript_text:
                        ACTIVE_TRANSCRIPTS[session_id].append({"role": "user", "text": transcript_text})
                    # If we receive audio, but no transcript_text, we can't process it with Gemini's text-based chat.
                    # The original process_audio_chunk was removed, so this block now only handles transcript logging.
                    # If audio processing is needed, a speech-to-text service would be required here.
                    
                elif msg_type == "video_frame" and msg_data:
                    # Process video if interviewer is alive
                    if interviewer:
                        frame_bytes = base64.b64decode(msg_data)
                        vision_result = await interviewer.analyze_video_frame(frame_bytes)
                        
                        await websocket.send_json({
                            "type": "vision_feedback",
                            "eye_contact_score": vision_result.get("eye_contact_score", 0),
                            "confidence_score": vision_result.get("confidence_score", 0),
                            "notes": vision_result.get("notes", "")
                        })

                else:
                    await websocket.send_json({"type": "error", "message": "Unknown message type or missing data."})

            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON payload."})
            except Exception as e:
                print(f"Error processing message: {e}")
                await websocket.send_json({"type": "error", "message": f"Server processing error: {str(e)}"})

    except WebSocketDisconnect:
        print(f"WebSocket disconnected for session {session_id}")
        # Disconnect means the interview is over or interrupted, keep transcript in memory.
    except Exception as e:
        print(f"WebSocket unexpected error: {e}")
        await websocket.close(code=1011)


@router.post("/end")
async def end_live_interview(
    request: LiveInterviewEndRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    session_id = request.session_id
    filler_count = request.filler_word_count
    
    # Check if session belongs to user (optional but safe)
    try:
        query = text("""
            SELECT user_id, role, difficulty FROM live_interview_sessions WHERE id = :id
        """)
        result = db.execute(query, {"id": session_id}).fetchone()
        if not result or str(result[0]) != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to end this session or session not found")
        role = result[1]
        difficulty = result[2]
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database error during validation: {str(e)}")

    # Get transcript from request payload
    transcript_log = request.transcript
    transcript_text = "\n".join([f"{t['role'].capitalize()}: {t.get('text', '')}" for t in transcript_log])
    
    # Even if empty transcript, generate a generic scorecard
    if not transcript_text:
         transcript_text = "[No conversation recorded.]"
         
    # Fetch interviewer instance
    interviewer = ACTIVE_INTERVIEWERS.get(session_id)
    if not interviewer:
        # Re-initialize just for scorecard if the pod restarted or dict cleared
        interviewer = GeminiLiveInterviewer(role=role, difficulty=difficulty)

    # Generate Scorecard
    try:
        scorecard = await interviewer.generate_scorecard(transcript=transcript_text, filler_count=filler_count)
    except Exception as e:
        import traceback
        traceback.print_exc()
        # Fallback scorecard when Gemini is unavailable (rate limit etc.)
        print(f"Gemini scorecard generation failed, using fallback: {e}")
        scorecard = LiveInterviewScorecard(
            communication_score=0,
            technical_accuracy=0,
            confidence=0,
            overall_score=0,
            strengths="Evaluation Unavailable",
            weaknesses=f"The AI evaluation system is temporarily unavailable or your transcript was too short to analyze. Developer error context: {str(e)}",
            improvement_tips=[
                "Ensure your microphone is working and you are speaking clearly.",
                "Try to provide more detailed answers to the interviewer's questions.",
                "Refresh the page and try again in a few minutes."
            ]
        )
        
    # End Session
    try:
        end_live_session(session_id=session_id, scorecard=scorecard, db=db)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to save results to database: {str(e)}")
        
    # Cleanup memory
    if session_id in ACTIVE_TRANSCRIPTS:
        del ACTIVE_TRANSCRIPTS[session_id]
    if session_id in ACTIVE_INTERVIEWERS:
        del ACTIVE_INTERVIEWERS[session_id]

    return scorecard
