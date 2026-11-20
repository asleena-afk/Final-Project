from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app import config
from app.auth import current_user_id
from app.routers import auth_routes, dashboard, meetings, projects, tasks, transcripts

app = FastAPI(title="Task Tracker API")
app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])

app.include_router(auth_routes.router)
app.include_router(dashboard.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(meetings.router)
app.include_router(transcripts.router)


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/me")
def me(uid: str = Depends(current_user_id)):
    return {"user_id": uid}
