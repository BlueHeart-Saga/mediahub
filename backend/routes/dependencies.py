from fastapi import Header, HTTPException
from jose import jwt, JWTError
from core.security import SECRET_KEY, ALGORITHM
from typing import Dict, Any, Optional
from bson import ObjectId
from database import (
    users_collection)

from core.security import decode_token


def get_current_user(authorization: str = Header(None)):
    """
    Extract and validate JWT token from Authorization header.
    Expected format:

    Authorization: Bearer <token>
    """

    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing"
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization scheme"
        )

    token = authorization.replace("Bearer ", "")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # Expected fields from backend token creation
        return {
            "id": payload.get("id"),
            "role": payload.get("role"),
            "company_id": payload.get("company_id"),
            "enabled_modules": payload.get("enabled_modules", [])
        }

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )
        
def require_super_admin(user: dict):
    if user["role"] != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Super Admin access required"
        )
        
def require_company_admin(user: dict):
    if user["role"] not in ["company_admin", "super_admin"]:
        raise HTTPException(
            status_code=403,
            detail="Company Admin access required"
        )
        
def enforce_company_scope(user: dict, company_id: str):
    """
    Prevent cross-company data access.
    Super Admin bypasses restriction.
    """

    if user["role"] == "super_admin":
        return

    if user.get("company_id") != company_id:
        raise HTTPException(
            status_code=403,
            detail="Cross-company access denied"
        )
        
def resolve_company_scope(user: dict, payload_company_id: str | None = None):

    role = user.get("role")

    # ✅ Super Admin → explicit company required
    if role == "super_admin":
        if not payload_company_id:
            raise HTTPException(400, "company_id required")
        return payload_company_id

    # ✅ Company Admin → always bound to token company
    if role == "company_admin":
        company_id = user.get("company_id")
        if not company_id:
            raise HTTPException(403, "Invalid company context")
        return company_id

    # ✅ Editor → same behavior as company_admin but stricter intent
    if role == "editor":
        company_id = user.get("company_id")
        if not company_id:
            raise HTTPException(403, "Invalid company context")
        return company_id

    raise HTTPException(403, "Not allowed")

async def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """
    Get current user from JWT token if provided, otherwise return None
    Used for public endpoints that can work with or without authentication
    """
    if not authorization:
        return None
    
    try:
        # Extract token
        parts = authorization.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return None
        
        token = parts[1]
        
        # Decode token
        payload = decode_token(token)
        
        # Get user from database
        user = users_collection.find_one({"_id": ObjectId(payload["id"])})
        
        if not user or user.get("status") != "active":
            return None
        
        return {
            "id": str(user["_id"]),
            "email": user["email"],
            "role": user["role"],
            "company_id": user.get("company_id"),
            "name": user.get("name")
        }
        
    except Exception:
        return None