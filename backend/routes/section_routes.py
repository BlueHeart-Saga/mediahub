from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime
import re
from typing import Optional
from database import sections_collection
from routes.dependencies import get_current_user, resolve_company_scope

router = APIRouter()

def normalize_slug(value: str):
    return value.strip().lower()

def generate_slug(name: str):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')

@router.post("/sections")
def create_section(payload: dict, user=Depends(get_current_user)):
    company_id = resolve_company_scope(user, payload.get("company_id"))

    name = payload.get("name")
    if not name:
        raise HTTPException(400, "name required")

    slug = generate_slug(name)

    existing = sections_collection.find_one({
        "company_id": company_id,
        "slug": slug,
        "status": {"$ne": "deleted"}
    })

    if existing:
        raise HTTPException(409, "Section already exists")

    sections_collection.insert_one({
        "company_id": company_id,
        "name": name.strip(),
        "slug": slug,
        "status": "active",
        "is_system": False,
        "created_at": datetime.utcnow()
    })

    return {"message": "Section created", "slug": slug}

# ✅ FIXED: Proper company filtering for all roles
@router.get("/sections")
def list_sections(
    company_id: Optional[str] = Query(None, description="Company ID to filter sections"),
    user=Depends(get_current_user)
):
    """
    List sections with proper company filtering:
    - Super Admin: Must specify company_id, returns sections for that company
    - Company Admin/Editor: Automatically filtered to their company
    """
    
    role = user.get("role")
    
    # Build base query - exclude deleted sections
    query = {"status": {"$ne": "deleted"}}
    
    # Handle different roles
    if role == "super_admin":
        # Super Admin MUST specify company_id
        if not company_id:
            raise HTTPException(
                status_code=400, 
                detail="company_id is required for super admin"
            )
        query["company_id"] = company_id
        
    elif role in ["company_admin", "editor"]:
        # Company admins and editors are always bound to their company
        user_company_id = user.get("company_id")
        if not user_company_id:
            raise HTTPException(403, "User has no company assigned")
        query["company_id"] = user_company_id
        
    else:
        # Viewers and other roles - return empty or based on permissions
        raise HTTPException(403, "Insufficient permissions")
    
    # Execute query
    sections = list(sections_collection.find(
        query, 
        {"_id": 0}  # Exclude MongoDB _id
    ).sort("name", 1))  # Sort by name
    
    return {"sections": sections}

# ✅ UPDATE SECTION (Name + Slug)
@router.put("/sections/{slug}")
def update_section(
    slug: str, 
    payload: dict, 
    company_id: Optional[str] = Query(None),
    user=Depends(get_current_user)
):
    # Resolve which company to use
    target_company_id = resolve_company_scope(user, company_id or payload.get("company_id"))
    slug = normalize_slug(slug)

    section = sections_collection.find_one({
        "company_id": target_company_id,
        "slug": slug,
        "status": {"$ne": "deleted"}
    })

    if not section:
        raise HTTPException(404, "Section not found")

    if section.get("is_system"):
        raise HTTPException(403, "System sections cannot be modified")

    if not payload.get("name"):
        raise HTTPException(400, "name required")

    sections_collection.update_one(
        {"company_id": target_company_id, "slug": slug},
        {
            "$set": {
                "name": payload["name"].strip(),
                "updated_at": datetime.utcnow()
            }
        }
    )

    return {"message": "Section updated"}

# ✅ SOFT DELETE SECTION
@router.delete("/sections/{slug}")
def delete_section(
    slug: str, 
    company_id: str = Query(...),
    user=Depends(get_current_user)
):
    cid = resolve_company_scope(user, company_id)
    slug = normalize_slug(slug)

    section = sections_collection.find_one({
        "company_id": cid,
        "slug": slug,
        "status": {"$ne": "deleted"}
    })

    if not section:
        raise HTTPException(404, "Section not found")

    if section.get("is_system"):
        raise HTTPException(403, "System sections cannot be deleted")

    result = sections_collection.update_one(
        {"company_id": cid, "slug": slug},
        {
            "$set": {
                "status": "deleted",
                "deleted_at": datetime.utcnow()
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(404, "Section not found")

    return {"message": "Section deleted"}