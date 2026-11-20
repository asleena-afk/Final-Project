from fastapi import APIRouter, Depends, HTTPException, Response
from app.auth import current_user_id
from app.db import get_db
from app.schemas.project import ProjectIn

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("")
def list_projects(uid: str = Depends(current_user_id), db=Depends(get_db)):
    return db.execute("select * from projects where owner_id=%s order by created_at desc", (uid,)).fetchall()


@router.post("", status_code=201)
def create_project(body: ProjectIn, uid: str = Depends(current_user_id), db=Depends(get_db)):
    return db.execute(
        "insert into projects (owner_id,name,description,status,health,health_note) "
        "values (%s,%s,%s,%s,%s,%s) returning *",
        (uid, body.name, body.description, body.status, body.health, body.health_note),
    ).fetchone()


def _owned(db, pid: str, uid: str):
    row = db.execute("select * from projects where id=%s", (pid,)).fetchone()
    if row is None:
        raise HTTPException(404, "Project not found")
    if str(row["owner_id"]) != uid:
        raise HTTPException(403, "Not your project")
    return row


@router.get("/{pid}")
def get_project(pid: str, uid: str = Depends(current_user_id), db=Depends(get_db)):
    return _owned(db, pid, uid)


@router.put("/{pid}")
def update_project(pid: str, body: ProjectIn, uid: str = Depends(current_user_id), db=Depends(get_db)):
    _owned(db, pid, uid)
    return db.execute(
        "update projects set name=%s,description=%s,status=%s,health=%s,health_note=%s,updated_at=now() "
        "where id=%s returning *",
        (body.name, body.description, body.status, body.health, body.health_note, pid),
    ).fetchone()


@router.delete("/{pid}", status_code=204)
def delete_project(pid: str, uid: str = Depends(current_user_id), db=Depends(get_db)):
    _owned(db, pid, uid)
    db.execute("delete from projects where id=%s", (pid,))
    return Response(status_code=204)
