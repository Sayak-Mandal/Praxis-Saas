import asyncio
import os
from google import genai
from google.genai import types

async def test_init():
    try:
        print("Testing gemini init...")
        client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
        system_prompt = "Hello"
        
        chat_session = client.aio.chats.create(
            model="gemini-2.5-flash",
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
            )
        )
        print("Chat session created successfully.")
        
        print("Sending message...")
        response = await chat_session.send_message("Please introduce yourself and ask the first question.")
        print(f"Response received: {response.text}")
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Test failed: {e}")

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv(".env")
    asyncio.run(test_init())
