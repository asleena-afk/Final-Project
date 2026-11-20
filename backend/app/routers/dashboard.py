from fastapi import APIRouter, Depends
from app.auth import current_user_id
from app.db import get_db

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard")
def dashboard(uid: str = Depends(current_user_id), db=Depends(get_db)):
    projects = db.execute(
        """
        select p.id, p.name, p.status, p.health, p.health_note,
          count(t.id) as total,
          count(t.id) filter (where t.status='todo') as todo,
          count(t.id) filter (where t.status='in_progress') as in_progress,
          count(t.id) filter (where t.status='pending_review') as pending_review,
          count(t.id) filter (where t.status='done') as done,
          count(t.id) filter (where t.is_blocked and t.status<>'done') as blocked,
          count(t.id) filter (where t.status<>'done' and t.due_date between current_date and current_date+7) as due_soon
        from projects p left join tasks t on t.project_id=p.id
        where p.owner_id=%s group by p.id order by p.created_at desc
        """,
        (uid,),
    ).fetchall()
    for p in projects:
        p["progress_pct"] = round(100 * p["done"] / p["total"]) if p["total"] else 0
    by_status = {k: sum(p[k] for p in projects) for k in ("todo", "in_progress", "pending_review", "done")}
    return {
        "kpis": {
            "total_projects": len(projects),
            "open_tasks": sum(p["total"] - p["done"] for p in projects),
            "blocked": sum(p["blocked"] for p in projects),
            "due_soon": sum(p["due_soon"] for p in projects),
        },
        "tasks_by_status": by_status,
        "projects": projects,
    }
