import io
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from psycopg.types.json import Jsonb
from app.auth import current_user_id
from app.db import get_db
from app.schemas.meeting import MeetingIn
from app.services import excel, summarizer

router = APIRouter(prefix="/meetings", tags=["meetings"])


def _project_owned(db, pid, uid):
    row = db.execute("select owner_id from projects where id=%s", (pid,)).fetchone()
    if row is None:
        raise HTTPException(404, "Project not found")
    if str(row["owner_id"]) != uid:
        raise HTTPException(403, "Not your project")


def _owned(db, mid, uid):
    row = db.execute("select * from meetings where id=%s", (mid,)).fetchone()
    if row is None:
        raise HTTPException(404, "Meeting not found")
    if str(row["owner_id"]) != uid:
        raise HTTPException(403, "Not your meeting")
    return row


def _json(v, rows=False):
    if v is None:
        return None
    return Jsonb([r.model_dump() for r in v] if rows else v)


@router.get("")
def list_meetings(project_id: str | None = None, uid: str = Depends(current_user_id), db=Depends(get_db)):
    sql = ("select m.id, m.project_id, p.name as project_name, m.title, m.meeting_date, "
           "(m.summary_rows is not null) as summarised, "
           "(select count(*) from tasks t where t.meeting_id=m.id) as tasks_created "
           "from meetings m join projects p on p.id=m.project_id where m.owner_id=%s")
    args = [uid]
    if project_id:
        sql += " and m.project_id=%s"; args.append(project_id)
    return db.execute(sql + " order by m.meeting_date desc nulls last, m.created_at desc", args).fetchall()


@router.post("", status_code=201)
def create_meeting(body: MeetingIn, uid: str = Depends(current_user_id), db=Depends(get_db)):
    _project_owned(db, body.project_id, uid)
    return db.execute(
        "insert into meetings (owner_id,project_id,title,meeting_date,meeting_time,location,attendees,"
        "transcript,summary_rows,next_actions) values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) returning *",
        (uid, body.project_id, body.title, body.meeting_date, body.meeting_time, body.location,
         body.attendees, body.transcript, _json(body.summary_rows, True), _json(body.next_actions)),
    ).fetchone()


@router.get("/{mid}")
def get_meeting(mid: str, uid: str = Depends(current_user_id), db=Depends(get_db)):
    return _owned(db, mid, uid)


@router.put("/{mid}")
def update_meeting(mid: str, body: MeetingIn, uid: str = Depends(current_user_id), db=Depends(get_db)):
    _owned(db, mid, uid)
    _project_owned(db, body.project_id, uid)
    return db.execute(
        "update meetings set project_id=%s,title=%s,meeting_date=%s,meeting_time=%s,location=%s,attendees=%s,"
        "transcript=%s,summary_rows=%s,next_actions=%s,updated_at=now() where id=%s returning *",
        (body.project_id, body.title, body.meeting_date, body.meeting_time, body.location, body.attendees,
         body.transcript, _json(body.summary_rows, True), _json(body.next_actions), mid),
    ).fetchone()


@router.delete("/{mid}", status_code=204)
def delete_meeting(mid: str, uid: str = Depends(current_user_id), db=Depends(get_db)):
    _owned(db, mid, uid)
    db.execute("delete from meetings where id=%s", (mid,))  # tasks keep existing; meeting_id becomes null
    return Response(status_code=204)


@router.post("/{mid}/summarize")
def summarize(mid: str, uid: str = Depends(current_user_id), db=Depends(get_db)):
    m = _owned(db, mid, uid)
    if not m["transcript"].strip():
        raise HTTPException(422, "Add a transcript first")
    try:
        result = summarizer.summarize(m["transcript"])
    except summarizer.AIBusy:
        raise HTTPException(503, "AI is busy, try again")
    except summarizer.AIBadOutput:
        raise HTTPException(502, "AI returned something unreadable, try again")
    return db.execute(
        "update meetings set summary_rows=%s,next_actions=%s,updated_at=now() where id=%s returning *",
        (_json(result.rows, True), Jsonb(result.next_actions), mid),
    ).fetchone()


@router.get("/{mid}/export")
def export(mid: str, uid: str = Depends(current_user_id), db=Depends(get_db)):
    m = _owned(db, mid, uid)
    if m["summary_rows"] is None:
        raise HTTPException(409, "Summarize first")
    data = excel.build_mom(m)
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="meeting-summary.xlsx"'},
    )
