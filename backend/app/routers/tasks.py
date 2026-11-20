from fastapi import APIRouter, Depends, HTTPException, Query, Response
from app.auth import current_user_id
from app.db import get_db
from app.schemas.task import TaskIn
from app.services.stages import status_for_stage

router = APIRouter(prefix="/tasks", tags=["tasks"])

SORTABLE = {"due_date", "title", "status", "priority", "assignee", "created_at"}
COLS = ("project_id,meeting_id,title,notes,status,priority,due_date,assignee,is_blocked,"
        "blocker_reason,ticket_ref,module,estimate_hrs,ticket_stage").split(",")


def _project_owned(db, pid: str, uid: str):
    row = db.execute("select owner_id from projects where id=%s", (pid,)).fetchone()
    if row is None:
        raise HTTPException(404, "Project not found")
    if str(row["owner_id"]) != uid:
        raise HTTPException(403, "Not your project")


def _meeting_owned(db, mid, uid):
    if mid is None:
        return
    row = db.execute("select owner_id from meetings where id=%s", (mid,)).fetchone()
    if row is None:
        raise HTTPException(404, "Meeting not found")
    if str(row["owner_id"]) != uid:
        raise HTTPException(403, "Not your meeting")


def _task_owned(db, tid: str, uid: str):
    row = db.execute("select * from tasks where id=%s", (tid,)).fetchone()
    if row is None:
        raise HTTPException(404, "Task not found")
    if str(row["owner_id"]) != uid:
        raise HTTPException(403, "Not your task")
    return row


def _values(body: TaskIn):
    data = body.model_dump()
    data["status"] = status_for_stage(body.ticket_stage, body.status)
    return [data[c] for c in COLS]


@router.get("")
def list_tasks(
    project_id: str,
    status: str | None = None,
    blocked: bool | None = None,
    assignee: str | None = None,
    sort: str = "created_at",
    desc: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=500),
    uid: str = Depends(current_user_id),
    db=Depends(get_db),
):
    _project_owned(db, project_id, uid)
    if sort not in SORTABLE:
        raise HTTPException(422, "Cannot sort by that column")
    where, args = ["project_id=%s", "owner_id=%s"], [project_id, uid]
    if status:
        where.append("status=%s"); args.append(status)
    if blocked is not None:
        where.append("is_blocked=%s"); args.append(blocked)
    if assignee:
        where.append("assignee=%s"); args.append(assignee)
    clause = " and ".join(where)
    total = db.execute(f"select count(*) as n from tasks where {clause}", args).fetchone()["n"]
    rows = db.execute(
        f"select * from tasks where {clause} order by {sort} {'desc' if desc else 'asc'} nulls last, id "
        "limit %s offset %s",
        [*args, page_size, (page - 1) * page_size],
    ).fetchall()
    return {"items": rows, "total": total, "page": page, "page_size": page_size}


@router.post("", status_code=201)
def create_task(body: TaskIn, uid: str = Depends(current_user_id), db=Depends(get_db)):
    _project_owned(db, body.project_id, uid)
    _meeting_owned(db, body.meeting_id, uid)
    return db.execute(
        f"insert into tasks (owner_id,{','.join(COLS)}) values (%s,{','.join(['%s'] * len(COLS))}) returning *",
        [uid, *_values(body)],
    ).fetchone()


@router.get("/{tid}")
def get_task(tid: str, uid: str = Depends(current_user_id), db=Depends(get_db)):
    return _task_owned(db, tid, uid)


@router.put("/{tid}")
def update_task(tid: str, body: TaskIn, uid: str = Depends(current_user_id), db=Depends(get_db)):
    _task_owned(db, tid, uid)
    _project_owned(db, body.project_id, uid)
    _meeting_owned(db, body.meeting_id, uid)
    sets = ",".join(f"{c}=%s" for c in COLS)
    return db.execute(
        f"update tasks set {sets},updated_at=now() where id=%s returning *", [*_values(body), tid]
    ).fetchone()


@router.delete("/{tid}", status_code=204)
def delete_task(tid: str, uid: str = Depends(current_user_id), db=Depends(get_db)):
    _task_owned(db, tid, uid)
    db.execute("delete from tasks where id=%s", (tid,))
    return Response(status_code=204)
