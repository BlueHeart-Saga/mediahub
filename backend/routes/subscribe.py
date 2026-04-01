from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from datetime import datetime
import os
from bson import ObjectId
from typing import Optional, List
import logging
from pymongo.errors import DuplicateKeyError

from database import db, content_collection, subscribers_collection, subscription_logs, images_collection, azure_storage
from core.mailer import send_email
from routes.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


# -----------------------------
# PUBLIC SUBSCRIBE
# -----------------------------

@router.post("/public/subscribe")
def subscribe(payload: dict):
    """
    Public subscription endpoint
    Anyone can subscribe
    """

    email = payload.get("email", "").strip().lower()
    company_id = payload.get("company_id")
    sections = payload.get("sections", [])
    categories = payload.get("categories", [])

    if not email:
        raise HTTPException(400, "Email required")
    
    if "@" not in email or "." not in email:
        raise HTTPException(400, "Invalid email address")

    if not company_id:
        raise HTTPException(400, "company_id required")

    existing = subscribers_collection.find_one({
        "email": email,
        "company_id": company_id
    })

    if existing:
        if existing.get("status") == "unsubscribed":
            raise HTTPException(
                status_code=403,
                detail="You are currently unsubscribed. Please contact us to reactivate your account."
            )

        if existing.get("status") == "active":
            # ✅ Normalize input (important)
            clean_categories = set([c.strip().lower() for c in categories])
            existing_categories = set(existing.get("categories", []))
            
            # ❌ Block if no new interests
            if clean_categories and clean_categories.issubset(existing_categories):
                raise HTTPException(
                    status_code=409,
                    detail="You are already interested in this"
                )

            # Update records
            subscribers_collection.update_one(
                {"_id": existing["_id"]},
                {
                    "$set": {
                        "categories": list(clean_categories),   # Overwrite with current selections
                        "sections": list(set([s.strip().lower() for s in sections])),
                        "updated_at": datetime.utcnow()
                    }
                }
            )

            return {
                "message": "Preferences updated successfully",
                "email": email
            }

    # 👇 Only runs for NEW subscribers
    subscriber = {
        "email": email,
        "company_id": company_id,
        "sections": sections,
        "categories": categories,
        "status": "active",
        "confirmed": True,
        "created_at": datetime.utcnow()
    }

    try:
        subscribers_collection.insert_one(subscriber)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="Email already subscribed."
        )

    return {
        "message": "Subscribed successfully",
        "email": email
    }


@router.get("/public/subscriber-preferences")
def get_subscriber_preferences(email: str, company_id: str):
    """
    Fetch existing subscriptions for an email to pre-fill UI
    """
    subscriber = subscribers_collection.find_one({
        "email": email.strip().lower(),
        "company_id": company_id
    })
    
    if not subscriber:
        return {"sections": [], "categories": [], "status": None}
        
    return {
        "sections": subscriber.get("sections", []),
        "categories": subscriber.get("categories", []),
        "status": subscriber.get("status")
    }


# -----------------------------
# UNSUBSCRIBE
# -----------------------------

@router.post("/public/unsubscribe")
def unsubscribe(payload: dict):

    email = payload.get("email")
    company_id = payload.get("company_id")

    if not email or not company_id:
        raise HTTPException(400, "email and company_id required")

    result = subscribers_collection.update_one(
        {"email": email, "company_id": company_id},
        {"$set": {"status": "unsubscribed"}}
    )

    if result.matched_count == 0:
        raise HTTPException(404, "Subscriber not found")

    return {"message": "Unsubscribed successfully"}


# -----------------------------
# GET SUBSCRIBERS (ADMIN)
# -----------------------------

@router.get("/admin/subscribers")
def get_subscribers(
    user: dict = Depends(get_current_user),
    company_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):

    role = user.get("role")

    query = {}

    if role != "super_admin":
        query["company_id"] = user.get("company_id")
    else:
        if company_id:
            query["company_id"] = company_id

    total = subscribers_collection.count_documents(query)

    cursor = subscribers_collection.find(query).skip(skip).limit(limit)

    items = []

    for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        items.append(doc)

    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }

# -----------------------------
# DELETE SUBSCRIBER
# -----------------------------

@router.delete("/admin/subscribers/{subscriber_id}")
def delete_subscriber(
    subscriber_id: str,
    user: dict = Depends(get_current_user)
):

    try:
        oid = ObjectId(subscriber_id)
    except:
        raise HTTPException(400, "Invalid id")

    query = {"_id": oid}
    if user.get("role") != "super_admin":
        query["company_id"] = user.get("company_id")

    result = subscribers_collection.delete_one(query)

    if result.deleted_count == 0:
        raise HTTPException(404, "Subscriber not found or access denied")

    return {"message": "Subscriber removed"}


# -----------------------------
# UPDATE SUBSCRIPTION
# -----------------------------

@router.put("/admin/subscribers/{subscriber_id}")
def update_subscription(
    subscriber_id: str,
    payload: dict,
    user: dict = Depends(get_current_user)
):

    try:
        oid = ObjectId(subscriber_id)
    except:
        raise HTTPException(400, "Invalid id")

    update = {}

    if "sections" in payload:
        update["sections"] = payload["sections"]

    if "categories" in payload:
        update["categories"] = payload["categories"]

    if "status" in payload:
        update["status"] = payload["status"]

    subscribers_collection.update_one(
        {"_id": oid},
        {"$set": update}
    )

    return {"message": "Subscription updated"}


# -----------------------------
# SEND EMAIL WHEN CONTENT PUBLISHED
# -----------------------------

def send_content_notification(content: dict, background_tasks: BackgroundTasks):
    """
    Trigger when content published
    """
    company_id = content.get("company_id")

    section = content.get("section", {}).get("slug")
    category = content.get("category", {}).get("slug")

    # 🔍 Debug like a pro
    print("📢 Triggered mail system")
    print("📦 Content:", content.get("title"))
    print("CATEGORY:", category)
    print("SECTION:", section)

    subscribers = list(subscribers_collection.find({
        "company_id": company_id,
        "status": "active",
        "$or": [
            {"categories": category},
            {"sections": section},
            {"categories": {"$size": 0}},
            {"sections": {"$size": 0}}
        ]
    }))

    print("🔥 Subscribers found:", len(subscribers))

    # Determine Frontend URL (Hardcoded as requested, ignoring env file)
    frontend_url = "https://devopstrio.co.uk/insights-knowledge/blogs"
    domain_url = "https://devopstrio.co.uk"
    brand_color = "#ce2453"
    
    # 🎨 Fallback image if blog has no cover
    cover_image_url = "https://img.freepik.com/premium-vector/paper-plane-flying-up-sky-growth-concept-business-success-startup-vision_101884-1135.jpg?w=1000"
    
    # Construction of dynamic cover image path
    image_id = None
    if content.get("cover_image_info") and content["cover_image_info"].get("id"):
        image_id = content["cover_image_info"]["id"]
    elif content.get("cover_image_id"):
        image_id = content["cover_image_id"]
        
    if image_id:
        try:
            # Fetch actual metadata to get the direct public URL (more reliable for emails)
            img_doc = images_collection.find_one({"_id": ObjectId(image_id)})
            if img_doc:
                if img_doc.get("url"):
                    cover_image_url = img_doc["url"]
                elif img_doc.get("blob_name"):
                    cover_image_url = azure_storage.get_public_url(img_doc["blob_name"])
        except Exception as e:
            print(f"⚠️ Error fetching image metadata: {e}")
            # Fallback to API route if metadata lookup fails
            cover_image_url = f"{domain_url}/api/images/{image_id}"

    for sub in subscribers:

        email = sub["email"]
        post_url = f"{frontend_url}/{content['_id']}"
        unsubscribe_url = f"{frontend_url}/unsubscribe?email={email}"

        subject = f"🚀 New Update: {content['title']}"

        # Miro-inspired layout constants
        brand_blue = "#ce2453"
        text_dark = "#050038"

        body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ margin: 0; padding: 0; background-color: #fdfdfd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: {text_dark}; }}
                .wrapper {{ padding: 20px; background-color: #fdfdfd; }}
                .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; }}
                .header {{ display: block; width: 100%; margin-bottom: 40px; }}
                .logo {{ float: left; font-weight: 900; font-size: 22px; color: {text_dark}; text-decoration: none; }}
                .browser-link {{ float: right; color: {brand_blue}; text-decoration: none; font-size: 14px; font-weight: 600; padding-top: 5px; }}
                .clear {{ clear: both; }}
                .title {{ font-size: 38px; font-weight: 800; line-height: 1.1; margin: 0 0 30px; letter-spacing: -0.02em; }}
                .hero-box {{ background-color: #fff0f0; border-radius: 24px; padding: 0; margin-bottom: 40px; text-align: center; overflow: hidden; line-height: 0; height: 280px; }}
                .hero-img {{ width: 100%; height: 280px; object-fit: cover; object-position: center; display: block; }}
                .paragraph {{ font-size: 16px; line-height: 1.6; margin-bottom: 24px; color: {text_dark}; }}
                .btn {{ display: inline-block; background-color: {brand_blue}; color: #ffffff !important; padding: 16px 32px; border-radius: 100px; text-decoration: none; font-weight: 600; font-size: 16px; margin-bottom: 40px; }}
                .incentive-box {{ background-color: #f0f0ff; padding: 30px; border-radius: 16px; margin-bottom: 40px; }}
                .incentive-title {{ font-size: 20px; font-weight: 700; margin: 0 0 10px; }}
                .incentive-text {{ font-size: 15px; margin: 0; line-height: 1.5; }}
                .footer {{ font-size: 16px; line-height: 1.6; margin-top: 40px; }}
                .footer-sub {{ font-size: 12px; color: #999; margin-top: 20px; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header">
                        <a class="logo">Devopstrio</a>
                        <div class="clear"></div>
                    </div>

                    <h1 class="title">{content['title']}</h1>

                    <div class="hero-box">
                        <img src="{cover_image_url}" class="hero-img" alt="Illustration">
                    </div>

                    <p class="paragraph">
                        {content.get('subtitle', 'Stay ahead in the industry with our latest insights. We have just published a new article that might interest you.')}
                    </p>

                    <p class="paragraph">
                        Our goal at Devopstrio is to provide you with the most relevant and high-quality content to help you scale your operations efficiently.
                    </p>

                    <a href="{post_url}" class="btn">Read full article →</a>

                    <div class="incentive-box">
                        <h3 class="incentive-title">New Content Published</h3>
                        <p class="incentive-text">
                            You are receiving this update because you are subscribed to <strong>{content.get('category', {}).get('name') or category or 'General'}</strong> news from Devopstrio.
                        </p>
                    </div>

                    <div class="footer">
                        <p style="margin:0;">Thank you, and happy collaborating!</p>
                        <p style="margin:4px 0 0; font-weight:700;">The Devopstrio Team</p>
                    </div>

                    <div class="footer-sub">
                        <p>© 2026 Devopstrio. All rights reserved.</p>
                        <p><a href="{unsubscribe_url}" style="color: {brand_blue};">Unsubscribe from this list</a></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        background_tasks.add_task(
            send_email,
            to_email=email,
            subject=subject,
            body=body
        )

        subscription_logs.insert_one({
            "subscriber_email": email,
            "content_id": str(content["_id"]),
            "sent_at": datetime.utcnow()
        })


# -----------------------------
# MANUAL SEND NEWSLETTER
# -----------------------------

@router.post("/admin/send-newsletter")
def send_newsletter(
    payload: dict,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):

    if user.get("role") != "super_admin":
        raise HTTPException(403, "Only super admin allowed")

    company_id = payload.get("company_id")
    subject = payload.get("subject")
    body = payload.get("body")

    subscribers = subscribers_collection.find({
        "company_id": company_id,
        "status": "active"
    })

    count = 0

    for sub in subscribers:
        background_tasks.add_task(
            send_email,
            to_email=sub["email"],
            subject=subject,
            body=body
        )
        count += 1

    return {
        "message": "Newsletter sending started",
        "subscribers": count
    }