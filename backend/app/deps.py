from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import decode_access_token
from app import models

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """
    Bearer-token auth (Authorization: Bearer <token>) instead of cookies --
    simplest, most standard approach when frontend (Vercel/Netlify) and
    backend (Render) live on different domains, avoiding SameSite/CORS
    cookie complications entirely.
    """
    if creds is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_access_token(creds.credentials)
    if not payload or "user_id" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    user = db.query(models.User).filter(models.User.id == payload["user_id"]).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user
