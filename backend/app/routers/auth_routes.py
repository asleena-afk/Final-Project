import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field
from app import config

router = APIRouter(tags=["auth"])


class Credentials(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=6, max_length=72)


def _call(path: str, body: dict, params: dict | None = None) -> dict:
    try:
        r = httpx.post(
            f"{config.SUPABASE_URL}/auth/v1/{path}",
            json=body, params=params, headers={"apikey": config.SUPABASE_ANON_KEY}, timeout=10,
        )
    except httpx.HTTPError:
        raise HTTPException(503, "Auth service unreachable")
    data = r.json() if r.content else {}
    if r.status_code >= 400:
        msg = data.get("msg") or data.get("error_description") or data.get("message") or "Auth failed"
        raise HTTPException(400 if r.status_code < 500 else 503, msg)
    return data


@router.post("/signup", status_code=201)
def signup(body: Credentials):
    data = _call("signup", body.model_dump())
    if not data.get("access_token"):
        # Supabase has "Confirm email" switched on: the user must click the email link first.
        return {"message": "Check your email to confirm, then log in"}
    return {"access_token": data["access_token"], "token_type": "bearer"}


@router.post("/login")
def login(body: Credentials):
    data = _call("token", body.model_dump(), {"grant_type": "password"})
    return {"access_token": data["access_token"], "token_type": "bearer"}
