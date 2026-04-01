from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime
import re
from typing import Optional
from database import categories_collection, sections_collection
from routes.dependencies import get_current_user, resolve_company_scope

router = APIRouter()

def generate_slug(name: str):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

def normalize_slug(value: str):
    return value.strip().lower()

# ✅ CREATE CATEGORY
@router.post("/categories")
def create_category(payload: dict, user=Depends(get_current_user)):
    company_id = resolve_company_scope(user, payload.get("company_id"))
    name = payload.get("name")
    section_slug = payload.get("section_slug")

    if not name or not section_slug:
        raise HTTPException(400, "name & section required")

    slug = generate_slug(name)
    section_slug = normalize_slug(section_slug)

    # Verify section exists and belongs to company
    section = sections_collection.find_one({
        "company_id": company_id,
        "slug": section_slug,
        "status": {"$ne": "deleted"}
    })

    if not section:
        raise HTTPException(404, "Section not found")

    # Check if category already exists
    if categories_collection.find_one({
        "company_id": company_id,
        "section_slug": section_slug,
        "slug": slug,
        "status": {"$ne": "deleted"}
    }):
        raise HTTPException(409, "Category already exists in this section")

    categories_collection.insert_one({
        "company_id": company_id,
        "section_slug": section_slug,
        "name": name.strip(),
        "slug": slug,
        "status": "active",
        "is_system": False,
        "created_at": datetime.utcnow()
    })

    return {"message": "Category created", "slug": slug}

# ✅ FIXED: Proper company filtering for categories
@router.get("/categories")
def list_categories(
    section_slug: Optional[str] = Query(None, description="Filter by section slug"),
    company_id: Optional[str] = Query(None, description="Company ID for super admin"),
    user=Depends(get_current_user)
):
    """
    List categories with proper filtering:
    - Super Admin: Must specify company_id, returns categories for that company
    - Company Admin/Editor: Automatically filtered to their company
    """
    
    role = user.get("role")
    
    # Build base query
    query = {"status": {"$ne": "deleted"}}
    
    # Handle role-based company filtering
    if role == "super_admin":
        # Super Admin MUST specify company_id
        if not company_id:
            raise HTTPException(
                status_code=400, 
                detail="company_id is required for super admin"
            )
        query["company_id"] = company_id
        
    elif role in ["company_admin", "editor"]:
        # Company admins and editors are bound to their company
        user_company_id = user.get("company_id")
        if not user_company_id:
            raise HTTPException(403, "User has no company assigned")
        query["company_id"] = user_company_id
        
    else:
        raise HTTPException(403, "Insufficient permissions")
    
    # Add section filter if provided
    if section_slug:
        query["section_slug"] = normalize_slug(section_slug)
    
    # Execute query
    categories = list(categories_collection.find(
        query,
        {"_id": 0}
    ).sort("name", 1))
    
    return {"categories": categories}

# ✅ UPDATE CATEGORY
@router.put("/categories/{slug}")
def update_category(
    slug: str, 
    payload: dict, 
    company_id: Optional[str] = Query(None),
    user=Depends(get_current_user)
):
    target_company_id = resolve_company_scope(user, company_id or payload.get("company_id"))
    slug = normalize_slug(slug)

    name = payload.get("name")
    section_slug = payload.get("section_slug")

    if not name or not section_slug:
        raise HTTPException(400, "name & section required")

    section_slug = normalize_slug(section_slug)

    category = categories_collection.find_one({
        "company_id": target_company_id,
        "section_slug": section_slug,
        "slug": slug,
        "status": {"$ne": "deleted"}
    })

    if not category:
        raise HTTPException(404, "Category not found")

    if category.get("is_system"):
        raise HTTPException(403, "System categories cannot be modified")

    categories_collection.update_one(
        {
            "company_id": target_company_id,
            "section_slug": section_slug,
            "slug": slug
        },
        {
            "$set": {
                "name": name.strip(),
                "updated_at": datetime.utcnow()
            }
        }
    )

    return {"message": "Category updated"}

# ✅ SOFT DELETE CATEGORY
@router.delete("/categories/{slug}")
def delete_category(
    slug: str, 
    company_id: str = Query(...),
    section_slug: str = Query(...),
    user=Depends(get_current_user)
):
    cid = resolve_company_scope(user, company_id)
    slug = normalize_slug(slug)
    section_slug = normalize_slug(section_slug)

    category = categories_collection.find_one({
        "company_id": cid,
        "section_slug": section_slug,
        "slug": slug,
        "status": {"$ne": "deleted"}
    })

    if not category:
        raise HTTPException(404, "Category not found")

    if category.get("is_system"):
        raise HTTPException(403, "System categories cannot be deleted")

    categories_collection.update_one(
        {
            "company_id": cid,
            "section_slug": section_slug,
            "slug": slug
        },
        {
            "$set": {
                "status": "deleted",
                "deleted_at": datetime.utcnow()
            }
        }
    )

    return {"message": "Category deleted"}