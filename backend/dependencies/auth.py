import os
import jwt
from fastapi import Header, HTTPException, Query


def _decode_token(token: str) -> dict:
    secret = os.getenv("JWT_SECRET", "")
    if secret:
        return jwt.decode(token, secret, algorithms=["HS256"])
    return jwt.decode(token, options={"verify_signature": False})


async def get_org_id(
    authorization: str = Header(default=""),
    access_token: str = Query(default=""),
) -> str:
    token = ""
    if authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "", 1).strip()
    elif access_token:
        token = access_token.strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    try:
        payload = _decode_token(token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc
    org_id = payload.get("org_id")
    if not isinstance(org_id, str) or not org_id:
        raise HTTPException(status_code=401, detail="org_id claim missing")
    return org_id
