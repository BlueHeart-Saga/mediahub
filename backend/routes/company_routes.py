import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pymongo.errors import DuplicateKeyError

from database import companies_collection, content_collection
from routes.dependencies import get_current_user, require_super_admin

router = APIRouter()

# ⭐ DEFAULT TAXONOMY CONFIG

DEFAULT_SECTIONS = [
    {
        "name": "Insights & Knowledge",
        "slug": "insights-knowledge",
        "categories": [
            ("Blogs", "blogs"),
            ("Case Studies", "case-studies"),
            ("Newsletters", "newsletters"),
            ("Podcasts", "podcasts"),
        ],
    },
    {
        "name": "News & Events",
        "slug": "news-events",
        "categories": [
            ("Industry Events", "industry-events"),
            ("Company Announcements", "company-announcements"),
            ("Achievements", "achievements"),
            ("Awards & Milestones", "awards-milestones"),
        ],
    },
    {
        "name": "Success Stories",
        "slug": "success-stories",
        "categories": [
            ("Client Transformations", "client-transformations"),
            ("Impact Metrics", "impact-metrics"),
            ("Testimonials", "testimonials"),
        ],
    },
    {
        "name": "Life at {company}",
        "slug": "life-at",
        "categories": [
            ("Celebrations", "celebrations"),
            ("Team Culture", "team-culture"),
            ("Posters", "posters"),
            ("Community", "community"),
        ],
    },
]



def generate_suffix():
    return str(random.randint(100000, 999999))

def build_company_id(prefix: str):
    return f"{prefix}-{generate_suffix()}"

def generate_company_id(prefix: str):   # ⭐ ADD HERE
    for _ in range(10):
        yield f"{prefix}-{random.randint(100000, 999999)}"

    raise HTTPException(500, "Could not generate company ID")

def validate_company_number(number: str):
    if not number.isdigit():
        raise HTTPException(400, "Company number must contain digits only")

    if len(number) != 6:
        raise HTTPException(400, "Company number must be exactly 6 digits")

from database import sections_collection, categories_collection

def seed_default_taxonomy(company_id: str, company_name: str):

    now = datetime.utcnow()

    for section in DEFAULT_SECTIONS:

        name = section["name"].replace("{company}", company_name)
        slug = section["slug"]

        sections_collection.update_one(
            {"company_id": company_id, "slug": slug},
            {
                "$setOnInsert": {
                    "company_id": company_id,
                    "name": name,
                    "slug": slug,
                    "status": "active",
                    "is_system": True,
                    "created_at": now,
                }
            },
            upsert=True
        )

        for cat_name, cat_slug in section["categories"]:
            categories_collection.update_one(
                {
                    "company_id": company_id,
                    "section_slug": slug,
                    "slug": cat_slug,
                },
                {
                    "$setOnInsert": {
                        "company_id": company_id,
                        "section_slug": slug,
                        "name": cat_name,
                        "slug": cat_slug,
                        "status": "active",
                        "is_system": True,
                        "created_at": now,
                    }
                },
                upsert=True
            )
            
            
# ✅ CREATE COMPANY
@router.post("/companies")
def create_company(payload: dict, user=Depends(get_current_user)):

    require_super_admin(user)

    name = payload.get("name")
    number = payload.get("number")
    prefix = payload.get("prefix")

    if not name:
        raise HTTPException(400, "Company name required")

    if not number:
        raise HTTPException(400, "Company number required")

    validate_company_number(number)

    if not prefix:
        raise HTTPException(400, "Prefix required")

    prefix = prefix.upper()
    name = name.strip()
    now = datetime.utcnow()

    for company_id in generate_company_id(prefix):

        try:
            companies_collection.insert_one({
                "company_id": company_id,
                "name": name,
                "number": number,
                "prefix": prefix,
                "status": "active",
                "created_at": now
            })

            # ⭐ Seed defaults ONLY for new company
            seed_default_taxonomy(company_id, name)

            return {
                "message": "Company created successfully",
                "company_id": company_id
            }

        except DuplicateKeyError as e:

            details = getattr(e, "details", None)

            if details and "keyPattern" in details:

                keys = details["keyPattern"]

                if "company_id" in keys:
                    continue  # retry ID generation

                if "name" in keys:
                    raise HTTPException(409, "Company name already exists")

                if "number" in keys:
                    raise HTTPException(409, "Company number already exists")

            raise HTTPException(409, "Duplicate company data")

    raise HTTPException(500, "Could not generate company ID")


# ✅ LIST COMPANIES
@router.get("/companies")
def list_companies(user=Depends(get_current_user)):

    require_super_admin(user)

    companies = list(
        companies_collection.find({}, {"_id": 0})
    )

    return {"companies": companies}

# ✅ UPDATE COMPANY
@router.put("/companies/{company_id}")
def update_company(company_id: str, payload: dict, user=Depends(get_current_user)):

    require_super_admin(user)

    existing = companies_collection.find_one({"company_id": company_id})

    if not existing:
        raise HTTPException(404, "Company not found")

    update_data = {
        "updated_at": datetime.utcnow()
    }

    if "name" in payload:
        update_data["name"] = payload["name"]

    if "number" in payload:
        validate_company_number(payload["number"])
        update_data["number"] = payload["number"]

    try:
        companies_collection.update_one(
            {"company_id": company_id},
            {"$set": update_data}
        )

    except DuplicateKeyError as e:
        details = getattr(e, "details", None)

        if details and "keyPattern" in details:

            keys = details["keyPattern"]

            if "name" in keys:
                raise HTTPException(409, "Company name already exists")

            if "number" in keys:
                raise HTTPException(409, "Company number already exists")

        raise HTTPException(409, "Duplicate value conflict")

    return {"message": "Company updated"}

# ✅ SOFT DELETE
@router.delete("/companies/{company_id}")
def soft_delete_company(company_id: str, user=Depends(get_current_user)):

    require_super_admin(user)

    result = companies_collection.update_one(
        {"company_id": company_id},
        {
            "$set": {
                "status": "deleted",
                "deleted_at": datetime.utcnow()
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(404, "Company not found")

    return {"message": "Company soft deleted"}


@router.delete("/companies/{company_id}/permanent")
def permanent_delete_company(company_id: str, user=Depends(get_current_user)):

    require_super_admin(user)

    company = companies_collection.find_one({"company_id": company_id})

    if not company:
        raise HTTPException(404, "Company not found")

    sections_collection.delete_many({"company_id": company_id})
    categories_collection.delete_many({"company_id": company_id})
    # Optional if exists
    content_collection.delete_many({"company_id": company_id})

    companies_collection.delete_one({"company_id": company_id})

    return {"message": "Company permanently deleted"}

# ✅ SUSPEND COMPANY
@router.patch("/companies/{company_id}/suspend")
def suspend_company(company_id: str, user=Depends(get_current_user)):

    require_super_admin(user)

    result = companies_collection.update_one(
        {"company_id": company_id},
        {"$set": {"status": "suspended", "updated_at": datetime.utcnow()}}
    )

    if result.matched_count == 0:
        raise HTTPException(404, "Company not found")

    return {"message": "Company suspended"}

# ✅ ACTIVATE COMPANY
@router.patch("/companies/{company_id}/activate")
def activate_company(company_id: str, user=Depends(get_current_user)):

    require_super_admin(user)

    result = companies_collection.update_one(
        {"company_id": company_id},
        {"$set": {"status": "active", "updated_at": datetime.utcnow()}}
    )

    if result.matched_count == 0:
        raise HTTPException(404, "Company not found")

    return {"message": "Company activated"}

