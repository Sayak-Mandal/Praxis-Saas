import uuid
import io
from datetime import datetime
from typing import Dict, Any, Optional

from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from gtts import gTTS

from app.core.config import settings

class LiveInterviewScorecard(BaseModel):
    communication_score: int = Field(description="Score out of 100 for communication skills, clarity, and conciseness", ge=0, le=100)
    technical_accuracy: int = Field(description="Score out of 100 for technical accuracy based on the role and difficulty", ge=0, le=100)
    confidence: int = Field(description="Score out of 100 representing perceived candidate confidence", ge=0, le=100)
    overall_score: int = Field(description="Overall aggregate score out of 100", ge=0, le=100)
    strengths: str = Field(description="A brief paragraph summarizing the candidate's strengths")
    weaknesses: str = Field(description="A brief paragraph summarizing what the candidate needs to improve on")
    improvement_tips: list[str] = Field(description="Actionable improvement tips for the candidate")

def start_live_session(role: str, difficulty: str, user_id: str, db: Session) -> str:
    """
    Creates a new live_interview_sessions record in the DB with status='active'
    Returns the session_id
    """
    session_id = str(uuid.uuid4())
    
    # We use a raw SQL query since the model isn't currently explicitly defined in SQLAlchemy 
    # but we need to create the record as strictly requested by the task.
    # Note: Using text() creates a parameterized query, ensuring safety.
    query = text("""
        INSERT INTO live_interview_sessions (id, user_id, role, difficulty, status, created_at)
        VALUES (:id, :user_id, :role, :difficulty, 'active', :created_at)
    """)
    db.execute(query, {
        "id": session_id,
        "user_id": user_id,
        "role": role,
        "difficulty": difficulty,
        "created_at": datetime.utcnow()
    })
    db.commit()
    
    return session_id

# ---------------------------------------------------------------------------
# Smart model fallback system
# ---------------------------------------------------------------------------
# Models to try, in order, for each use-case.
_AUDIO_MODEL_CHAIN = ["gemini-2.5-flash-native-audio-dialog", "gemini-3-flash-preview"]
_VISION_MODEL_CHAIN = ["gemini-2.5-flash", "gemini-3-flash-preview"]
_SCORECARD_MODEL_CHAIN = ["gemini-2.5-flash", "gemini-3-flash-preview"]

# Tracks models that have hit quota during this server lifetime
_QUOTA_EXCEEDED_MODELS: set = set()


def _is_quota_error(exc: Exception) -> bool:
    """Return True if `exc` represents a quota / rate-limit error from Gemini."""
    exc_str = str(exc).lower()
    # Google AI SDK raises 429 as ClientError or ResourceExhausted
    quota_keywords = ["quota", "resource_exhausted", "resourceexhausted",
                      "rate limit", "ratelimit", "429", "too many requests"]
    return any(k in exc_str for k in quota_keywords)


async def _call_with_fallback(model_chain: list[str], call_fn):
    """
    Try each model in `model_chain` in order.
    Skip models already known to be over quota.
    Mark models as exhausted on 429-style errors and retry the next one.
    Raises the last exception if all models fail.
    """
    last_exc: Exception = Exception("No models available")
    for model in model_chain:
        if model in _QUOTA_EXCEEDED_MODELS:
            continue  # skip already-exhausted models
        try:
            return await call_fn(model)
        except Exception as exc:
            if _is_quota_error(exc):
                print(f"[ModelFallback] Quota exhausted for {model!r}, trying next model. Error: {exc}")
                _QUOTA_EXCEEDED_MODELS.add(model)
                last_exc = exc
            else:
                raise  # non-quota error — propagate immediately
    raise last_exc


# ---------------------------------------------------------------------------

class GeminiLiveInterviewer:
    def __init__(self, role: str, difficulty: str, questions: list[str] = None):
        self.role = role
        self.difficulty = difficulty
        self.questions = questions or []
        
        # Initialize the Gemini Client
        questions_list_str = "\n".join([f"Q{i+1}: {q}" for i, q in enumerate(self.questions)])
        
        self.system_prompt = f"""You are a professional technical interviewer for a {self.difficulty}-level {self.role} position.
Follow these rules strictly:
1. Ask exactly ONE question at a time. Do not ask multi-part questions at once.
2. Wait and listen to the candidate's full answer before you respond or ask the next question.
3. You MUST ask the following {len(self.questions)} specific questions in order during the interview:
{questions_list_str}
4. If the candidate interrupts you, pause what you were saying and acknowledge the interruption naturally.
5. You will ask exactly {len(self.questions)} technical questions in total. After the final question and the candidate's answer, wrap up the interview professionally without asking another question.

Keep your tone professional, encouraging, and natural, as if talking over a video or phone call.
"""
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        # Initial audio model — will be swapped if quota is exceeded
        audio_model = next(
            (m for m in _AUDIO_MODEL_CHAIN if m not in _QUOTA_EXCEEDED_MODELS),
            _AUDIO_MODEL_CHAIN[-1]
        )
        
        # Start the chat session using the best available audio dialog model
        self.chat_session = self.client.aio.chats.create(
            model=audio_model,
            config=types.GenerateContentConfig(
                system_instruction=self.system_prompt,
            )
        )


    async def process_audio_chunk(self, audio_bytes: bytes) -> tuple[bytes, str]:
        """
        Sends audio to Gemini API and returns the synthesized gTTS agent audio and transcript text.
        """
        audio_part = types.Part.from_bytes(
            data=audio_bytes,
            mime_type="audio/webm" 
        )
        
        response = await self.chat_session.send_message(audio_part)
        response_text = response.text
        
        if response_text:
            fp = io.BytesIO()
            tts = gTTS(text=response_text.strip(), lang='en', slow=False)
            tts.write_to_fp(fp)
            fp.seek(0)
            return fp.read(), response_text.strip()
        
        return b"", ""

    async def initiate_interview(self) -> tuple[bytes, str]:
        """
        Sends an initial prompt to Gemini to start the conversation and ask the first question.
        Returns the agent's synthesized initial audio response bytes and transcript.
        """
        response = await self.chat_session.send_message("Please introduce yourself and ask the first question.")
        response_text = response.text
        
        if response_text:
            fp = io.BytesIO()
            tts = gTTS(text=response_text.strip(), lang='en', slow=False)
            tts.write_to_fp(fp)
            fp.seek(0)
            return fp.read(), response_text.strip()
            
        return b"", ""

    async def analyze_video_frame(self, frame_bytes: bytes) -> Dict[str, Any]:
        """
        Sends a webcam frame to Gemini vision and returns eye contact score, confidence score, and notes.
        """
        image_part = types.Part.from_bytes(
            data=frame_bytes,
            mime_type="image/jpeg"
        )
        
        prompt = "Analyze this candidate's video interview frame. Output the following details."
        
        # Define the inline schema for JSON strictly using typing dictionaries
        schema = types.Schema(
            type="object",
            properties={
                "eye_contact_score": types.Schema(type="integer", description="Score 0-100 indicating how well the candidate makes eye contact with the camera"),
                "confidence_score": types.Schema(type="integer", description="Score 0-100 indicating bodily confidence posture"),
                "notes": types.Schema(type="string", description="Brief 1-sentence observation about the candidate's body language in this frame"),
            },
            required=["eye_contact_score", "confidence_score", "notes"]
        )
        
        # Use vision model chain with auto-fallback on quota errors
        async def _call(model: str):
            return await self.client.aio.models.generate_content(
                model=model,
                contents=[image_part, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=schema,
                )
            )

        response = await _call_with_fallback(_VISION_MODEL_CHAIN, _call)
        
        import json
        if response.text:
            return json.loads(response.text)
        
        return {"eye_contact_score": 0, "confidence_score": 0, "notes": "Unable to process frame"}

    async def generate_scorecard(self, transcript: str, filler_count: int) -> LiveInterviewScorecard:
        """
        Sends the full interview transcript to Gemini and returns a LiveInterviewScorecard.
        """
        prompt = f"""
You are an expert Senior Technical Interviewer and Hiring Manager evaluating a candidate for a {self.difficulty}-level {self.role} position.
Your goal is to provide a HIGH-FIDELITY, STRICT, and UNBIASED evaluation based ONLY on the provided transcript.

### EVALUATION CRITERIA:
1. **Technical Accuracy (0-100)**: How correct and deep were the technical answers for a {self.difficulty}-level {self.role}? 
   - Give < 30 if answers are "I don't know", gibberish, or fundamentally wrong.
   - Give 40-60 if answers are shallow or partially correct.
   - Give 80+ only for detailed, expert-level explanations.
2. **Communication (0-100)**: Clarity, conciseness, and relevant use of professional terminology.
   - Penalize generic "yes/no" answers without elaboration.
   - Consider the {filler_count} detected filler words as a negative factor.
3. **Confidence (0-100)**: Based on the decisiveness of answers and tone (interpreted from text).

### TRANSCRIPT ROLES:
- **Agent/AI Interviewer**: That is YOU (the interviewer). Do not evaluate yourself.
- **User/You**: That is the CANDIDATE. Evaluate ONLY their responses.

### TRANSCRIPT TO EVALUATE:
{transcript}

Generate a JSON scorecard. Be honest—if the candidate performed poorly, reflect that in the scores.
"""
        # Use scorecard model chain with auto-fallback on quota errors
        async def _call(model: str):
            return await self.client.aio.models.generate_content(
                model=model,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=LiveInterviewScorecard,
                )
            )

        response = await _call_with_fallback(_SCORECARD_MODEL_CHAIN, _call)
        
        # Construct the Pydantic instance from the returned JSON textual response
        import json
        text_response = response.text.strip()
        if text_response.startswith("```json"):
            text_response = text_response.split("```json")[1].split("```")[0].strip()
        elif text_response.startswith("```"):
            text_response = text_response.split("```")[1].split("```")[0].strip()
            
        data = json.loads(text_response)
        return LiveInterviewScorecard(**data)


def end_live_session(session_id: str, scorecard: LiveInterviewScorecard, db: Session) -> None:
    """
    Updates the DB record with final scores and sets status='completed', ended_at=now().
    """
    # Again, fallback to literal SQL due to missing SQLAlchemy model definition
    query = text("""
        UPDATE live_interview_sessions 
        SET 
            status = 'completed',
            ended_at = :ended_at,
            overall_score = :overall_score,
            communication_score = :communication_score,
            technical_accuracy = :technical_accuracy,
            strengths = :strengths,
            weaknesses = :weaknesses,
            filler_tips = :filler_tips
        WHERE id = :id
    """)
    import json
    db.execute(query, {
        "id": session_id,
        "ended_at": datetime.utcnow(),
        "overall_score": scorecard.overall_score,
        "communication_score": scorecard.communication_score,
        "technical_accuracy": scorecard.technical_accuracy,
        "strengths": scorecard.strengths,
        "weaknesses": scorecard.weaknesses,
        "filler_tips": json.dumps(scorecard.improvement_tips) # Save list as JSON string or JSONB
    })
    db.commit()
