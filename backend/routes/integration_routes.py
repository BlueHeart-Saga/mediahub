from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from database import content_collection, companies_collection, sections_collection, categories_collection

router = APIRouter()

@router.get("/integration/v1/posts")
def get_company_integration_posts(
    company_id: str = Query(..., description="Unique Company Protocol ID"),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = Query(None, description="Filter by category slug")
):
    """
    Simple, user-friendly API for third-party company integrations.
    Returns a list of published posts based on the provided company_id.
    """
    
    # 1. Verify company exists and is active
    company = companies_collection.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company Protocol ID not found")
    
    if company.get("status") != "active":
        raise HTTPException(status_code=403, detail="Company integration is currently suspended or inactive")

    # 2. Build Query
    query = {
        "company_id": company_id,
        "status": "published"
    }
    
    if category:
        query["category_slug"] = category

    # 3. Fetch Posts
    cursor = content_collection.find(
        query,
        {
            "_id": 1,
            "title": 1,
            "slug": 1,
            "summary": 1,
            "cover_image_url": 1,
            "category_slug": 1,
            "section_slug": 1,
            "published_at": 1,
            "author_name": 1,
            "read_time": 1
        }
    ).sort("published_at", -1).limit(limit)

    posts = []
    for post in cursor:
        post["id"] = str(post.pop("_id"))
        # Format date for user friendliness
        if post.get("published_at"):
            post["published_date"] = post["published_at"].strftime("%b %d, %Y")
        posts.append(post)

    return {
        "success": True,
        "company_name": company["name"],
        "total_count": len(posts),
        "posts": posts,
        "meta": {
            "timestamp": datetime.utcnow(),
            "version": "1.0.0"
        }
    }
