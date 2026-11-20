import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app import config

bearer = HTTPBearer(auto_error=False)


def current_user_id(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> str:
    """Ask Supabase Auth who the token belongs to. 401 if missing or invalid."""
    if creds is None:
        raise HTTPException(401, "Missing token")
    try:
        r = httpx.get(
            f"{config.SUPABASE_URL}/auth/v1/user",
            headers={"Authorization": f"Bearer {creds.credentials}", "apikey": config.SUPABASE_ANON_KEY},
            timeout=10,
        )
    except httpx.HTTPError:
        raise HTTPException(503, "Auth service unreachable")
    if r.status_code != 200:
        raise HTTPException(401, "Invalid or expired token")
    return r.json()["id"]
