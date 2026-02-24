import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, Numeric, cast
from app.db.models import InterviewSession, CodingAttempt, Doubt, AppSession

def get_user_dashboard_stats(db: Session, user_id: str):
    """
    Calculates raw aggregates for the user's dashboard charts.
    """
    
    # Total attempts
    total_interviews = db.query(func.count(InterviewSession.id)).filter(InterviewSession.user_id == user_id).scalar() or 0
    total_coding = db.query(func.count(CodingAttempt.id)).filter(CodingAttempt.user_id == user_id).scalar() or 0
    total_doubts = db.query(func.count(Doubt.id)).filter(Doubt.user_id == user_id).scalar() or 0
    total_app_visits = db.query(func.count(AppSession.id)).filter(AppSession.user_id == user_id).scalar() or 0
    
    # Coding Success Rate
    successful_coding = db.query(func.count(CodingAttempt.id)).filter(
        CodingAttempt.user_id == user_id,
        CodingAttempt.success == True
    ).scalar() or 0
    
    coding_success_rate = (successful_coding / total_coding * 100) if total_coding > 0 else 0
    
    # Average Interview Score (from average_score in sessions)
    avg_interview = db.query(func.avg(InterviewSession.average_score)).filter(InterviewSession.user_id == user_id).scalar() or 0
    
    # Readiness Score (60% weight on interview performance (assuming out of 100 max if scaled, but default score looks like out of 10-100), 40% on coding success rate)
    # Let's normalize interview score to 100 first (Assuming it is out of 100).
    readiness_index = round((avg_interview * 0.6) + (coding_success_rate * 0.4))
    
    # Topic Strength / Weakness
    topic_averages = db.query(
        InterviewSession.role.label('role'), 
        func.avg(InterviewSession.average_score).label('avg_score')
    ).filter(InterviewSession.user_id == user_id)\
     .group_by(InterviewSession.role).all()
     
    topic_averages.sort(key=lambda x: x.avg_score or 0, reverse=True)
    
    if not topic_averages:
        top_strengths = ["No data yet"]
        top_weaknesses = ["No data yet"]
    else:
        roles = [t.role for t in topic_averages]
        if len(roles) == 1:
            top_strengths = roles
            top_weaknesses = ["Need more data"]
        else:
            # Safely split into top and bottom without overlap
            split_idx = max(1, len(roles) // 2)
            top_strengths = roles[:split_idx][:3]
            top_weaknesses = list(reversed(roles[split_idx:]))[:3]

    # 7-Day Activity Trends
    today = datetime.datetime.now(datetime.timezone.utc)
    seven_days_ago = today - datetime.timedelta(days=6) # Includes today
    
    # We will build a skeleton 7-day structure and fill it
    days_labels = []
    weekly_scores_dict = {}
    weekly_interviews_dict = {}
    
    for i in range(7):
        curr_day = (seven_days_ago + datetime.timedelta(days=i)).strftime('%Y-%m-%d')
        days_labels.append(curr_day)
        weekly_scores_dict[curr_day] = 0
        weekly_interviews_dict[curr_day] = 0
        
    # We must cast the created_at to date for grouping.
    interviews_by_day = db.query(
        func.date(InterviewSession.created_at).label('day'),
        func.avg(InterviewSession.average_score).label('avg_score'),
        func.count(InterviewSession.id).label('count')
    ).filter(
        InterviewSession.user_id == user_id,
        InterviewSession.created_at >= seven_days_ago
    ).group_by(func.date(InterviewSession.created_at)).all()
    
    for row in interviews_by_day:
        day_str = row.day.strftime('%Y-%m-%d') if hasattr(row.day, 'strftime') else str(row.day)
        if day_str in weekly_scores_dict:
            weekly_scores_dict[day_str] = round(row.avg_score or 0)
            weekly_interviews_dict[day_str] = row.count
            
    # Format for the charts
    short_days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
    weekly_activity_scores = []
    weekly_activity_interviews = []
    
    for i in range(7):
        curr_day_obj = seven_days_ago + datetime.timedelta(days=i)
        curr_day_str = curr_day_obj.strftime('%Y-%m-%d')
        day_label = short_days[curr_day_obj.weekday()] # or %a
        
        weekly_activity_scores.append({
            "day": day_label,
            "v": weekly_scores_dict[curr_day_str]
        })
        weekly_activity_interviews.append({
            "day": day_label,
            "v": weekly_interviews_dict[curr_day_str]
        })
    
    return {
        "total_interviews": total_interviews,
        "avg_interview_score": round(avg_interview, 2),
        "total_coding_attempts": total_coding,
        "coding_success_rate": round(coding_success_rate, 2),
        "total_doubts_asked": total_doubts,
        "total_app_visits": total_app_visits,
        "readiness_index": readiness_index,
        "top_strengths": top_strengths,
        "top_weaknesses": top_weaknesses,
        "weekly_activity": {
            "scores": weekly_activity_scores,
            "interviews": weekly_activity_interviews
        }
    }
