from google import genai
from google.genai import types
from app.core.config import settings

# Initialize the Gemini client using the new SDK
client = genai.Client(api_key=settings.GEMINI_API_KEY)

def generate_ai_response(system_instruction: str, user_prompt: str) -> str:
    """
    Sends a prompt with system instructions to Gemini and returns the textual response.
    Returns empty string on failure.
    """
    try:
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction
            )
        )
        return response.text
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return ""

async def generate_ai_response_async(system_instruction: str, user_prompt: str) -> str:
    """
    Async implementation for FastAPI route handlers.
    (Note: As of early google-genai versions, async might be handled via a sync wrap or specific wrapper if async methods differ. We will use the standard sync wrapper for now if async is not fully exposed.)
    """
    import asyncio
    try:
        def call_gemini():
            return client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction
                )
            )
        # Run the synchronous client call in a threadpool so it doesn't block the FastAPI event loop
        response = await asyncio.to_thread(call_gemini)
        return response.text
    except Exception as e:
        print(f"Error calling Gemini API async: {e}")
        return ""
