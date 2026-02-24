from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.dependencies import get_current_user
from app.services.analytics import get_user_dashboard_stats
from app.db.models import AppSession

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me/analytics")
async def get_analytics(
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    stats = get_user_dashboard_stats(db, current_user["id"])
    return {"success": True, "stats": stats}

@router.post("/me/track-visit")
async def track_visit(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Records a new app visit/session for the current user."""
    session = AppSession(user_id=current_user["id"])
    db.add(session)
    db.commit()
    return {"success": True}
