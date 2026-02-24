import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User
from app.core.config import settings
from supabase import create_client, Client
import uuid

# Define the HTTP Bearer scheme
security = HTTPBearer()

# Initialize Supabase Admin Client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """
    Validates the Supabase JWT token using the official Supabase client.
    It retrieves the remote User session and provisions the corresponding User in our PostgreSQL db.
    """
    token = credentials.credentials
    try:
        # Ask Supabase to verify the token and return the user
        response = supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Invalid token content")
            
        user_data = response.user
        user_id = user_data.id
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token content")
            
        # Auto-provision user in our public.users table if they don't exist yet
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                user_email = user_data.email or ""
                user_metadata = user_data.user_metadata or {}
                new_user = User(
                    id=user_id,
                    email=user_email,
                    full_name=user_metadata.get("full_name", ""),
                    gender=user_metadata.get("gender", "")
                )
                db.add(new_user)
                db.commit()
        except Exception as e:
            print(f"Error provisioning user in DB: {e}")
            
        return {"id": user_id, "email": user_data.email or "", "metadata": user_data.user_metadata or {}}

    except Exception as e:
        print(f"Token Error: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")
