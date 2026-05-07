from random import randint
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Query
from bson import ObjectId

import logging
import base64
import hashlib
import io
from PIL import Image

from core.config import FRONTEND_URL
from database import (
    users_collection, companies_collection, sections_collection, 
    categories_collection, content_collection, images_collection
)
from routes.dependencies import get_current_user, require_super_admin, require_company_admin
from core.mailer import send_email
from core.security import hash_password, verify_password
from core.templates.company_admin_invite import build_company_admin_invite_email
from core.templates.editor_invite import build_editor_invite_email
from utils.blob_storage import AzureBlobStorage

azure_storage = AzureBlobStorage

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

# Constants
ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_IMAGE_DIMENSION = 2048  # Max width/height in pixels
IMAGE_QUALITY = 85  # JPEG quality


def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return str(randint(100000, 999999))


def validate_email(email: str) -> bool:
    """Basic email validation"""
    import re
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return re.match(pattern, email) is not None


async def process_profile_image(file: UploadFile) -> Optional[Dict[str, Any]]:
    """
    Process and validate profile image
    Returns image data or None if no image
    """
    if not file:
        return None
    
    try:
        # Read file
        contents = await file.read()
        
        # Check file size
        if len(contents) > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"Image too large. Max size: {MAX_IMAGE_SIZE // (1024 * 1024)}MB"
            )
        
        # Validate image
        try:
            img = Image.open(io.BytesIO(contents))
            width, height = img.size
            
            # Validate dimensions
            if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
                raise HTTPException(
                    status_code=400,
                    detail=f"Image dimensions too large. Max: {MAX_IMAGE_DIMENSION}x{MAX_IMAGE_DIMENSION}"
                )
            
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'LA', 'P'):
                rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img_bytes = io.BytesIO()
                rgb_img.save(img_bytes, format='JPEG', quality=IMAGE_QUALITY)
                contents = img_bytes.getvalue()
                content_type = 'image/jpeg'
            else:
                content_type = file.content_type or 'image/jpeg'
            
        except Exception as e:
            logger.error(f"Invalid image file: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Calculate hash for duplicate detection
        file_hash = hashlib.md5(contents).hexdigest()
        
        return {
            "data": contents,
            "content_type": content_type,
            "hash": file_hash,
            "width": width,
            "height": height,
            "size": len(contents)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to process image: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process image")


@router.post("/create-company-admin")
def create_company_admin(payload: dict, user=Depends(get_current_user)):
    """
    Create a new company admin (Super Admin only)
    """
    require_super_admin(user)

    email = payload.get("email", "").strip().lower()
    company_id = payload.get("company_id")
    name = payload.get("name", "").strip()

    if not email:
        raise HTTPException(status_code=400, detail="Email required")

    if not validate_email(email):
        raise HTTPException(status_code=400, detail="Invalid email format")

    if not company_id:
        raise HTTPException(status_code=400, detail="Company ID required")

    if not name:
        raise HTTPException(status_code=400, detail="Name required")

    # Check if company exists
    company = companies_collection.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    if company.get("status") != "active":
        raise HTTPException(status_code=400, detail="Company is not active")

    # Check if user already exists
    existing = users_collection.find_one({"email": email})
    if existing:
        if existing.get("status") == "deleted":
            # Reactivate deleted user
            otp = generate_otp()
            expiry = datetime.utcnow() + timedelta(minutes=10)
            
            users_collection.update_one(
                {"email": email},
                {
                    "$set": {
                        "role": "company_admin",
                        "company_id": company_id,
                        "name": name,
                        "otp": otp,
                        "otp_expiry": expiry,
                        "status": "pending",
                        "updated_at": datetime.utcnow(),
                        "deleted_at": None
                    }
                }
            )
            message = "User reactivated and invitation sent successfully"
        else:
            raise HTTPException(status_code=409, detail="User with this email already exists")
    else:
        # Create new user
        otp = generate_otp()
        expiry = datetime.utcnow() + timedelta(minutes=10)

        users_collection.insert_one({
            "email": email,
            "name": name,
            "role": "company_admin",
            "company_id": company_id,
            "password": None,
            "otp": otp,
            "otp_expiry": expiry,
            "status": "pending",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": user.get("id"),
            "profile_image": None,
            "avatar_id": None,
            "metadata": {}
        })
        message = "Company Admin invited successfully"

    # Send invitation email WITH NAME
    if not send_email(
        to_email=email,
        subject=f"{company['name']} Admin Access",
        body=build_company_admin_invite_email(
            company_name=company["name"],
            name=name,
            otp=otp,
            frontend_url=FRONTEND_URL
        )
    ):
        logger.error(f"Failed to send invitation email to {email}")
        raise HTTPException(
            status_code=500,
            detail="Failed to send invitation email"
        )

    logger.info(f"Company admin invited: {email} to company {company_id}")

    return {"message": message, "success": True}

@router.get("/company-admins")
def get_company_admins(
    company_id: Optional[str] = Query(None, description="Filter by company"),
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user=Depends(get_current_user)
):
    """
    Get company admins with filters (Super Admin only)
    """
    require_super_admin(user)

    # Build query
    query = {
        "role": "company_admin",
        "status": {"$ne": "deleted"}
    }

    if company_id:
        query["company_id"] = company_id
    
    if status:
        query["status"] = status

    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]

    # Get total count
    total = users_collection.count_documents(query)

    # Get paginated results
    cursor = users_collection.find(
        query,
        {
            "password": 0, 
            "otp": 0, 
            "otp_expiry": 0,
            "reset_otp": 0,
            "reset_otp_expiry": 0
        }
    ).sort("created_at", -1).skip(skip).limit(limit)

    admins = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        # Add company name
        if doc.get("company_id"):
            company = companies_collection.find_one(
                {"company_id": doc["company_id"]},
                {"name": 1}
            )
            if company:
                doc["company_name"] = company.get("name")
        admins.append(doc)

    return {
        "admins": admins,
        "total": total,
        "skip": skip,
        "limit": limit,
        "has_more": (skip + limit) < total
    }


@router.patch("/company-admins/{admin_id}/suspend")
def suspend_company_admin(admin_id: str, user=Depends(get_current_user)):
    """
    Suspend a company admin (Super Admin only)
    """
    require_super_admin(user)

    try:
        target = users_collection.find_one({"_id": ObjectId(admin_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid admin ID")

    if not target:
        raise HTTPException(status_code=404, detail="Admin not found")

    if target.get("role") != "company_admin":
        raise HTTPException(status_code=400, detail="User is not a company admin")

    # Cannot suspend self
    if str(target["_id"]) == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot suspend yourself")

    if target.get("status") == "suspended":
        raise HTTPException(status_code=400, detail="Admin is already suspended")

    # Update user
    users_collection.update_one(
        {"_id": target["_id"]},
        {
            "$set": {
                "status": "suspended",
                "suspended_at": datetime.utcnow(),
                "suspended_by": user["id"],
                "updated_at": datetime.utcnow()
            }
        }
    )

    logger.info(f"Company admin suspended: {target['email']} by {user.get('email', 'unknown')}")

    return {"message": "Admin suspended successfully", "success": True}


@router.patch("/company-admins/{admin_id}/activate")
def activate_company_admin(admin_id: str, user=Depends(get_current_user)):
    """
    Activate a suspended company admin (Super Admin only)
    """
    require_super_admin(user)

    try:
        target = users_collection.find_one({"_id": ObjectId(admin_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid admin ID")

    if not target:
        raise HTTPException(status_code=404, detail="Admin not found")

    if target.get("role") != "company_admin":
        raise HTTPException(status_code=400, detail="User is not a company admin")

    if target.get("status") != "suspended":
        raise HTTPException(status_code=400, detail="Admin is not suspended")

    # Update user
    users_collection.update_one(
        {"_id": target["_id"]},
        {
            "$set": {
                "status": "active",
                "activated_at": datetime.utcnow(),
                "activated_by": user["id"],
                "updated_at": datetime.utcnow()
            }
        }
    )

    logger.info(f"Company admin activated: {target['email']} by {user.get('email', 'unknown')}")

    return {"message": "Admin activated successfully", "success": True}


@router.delete("/company-admins/{admin_id}")
def delete_company_admin(admin_id: str, user=Depends(get_current_user)):
    """
    Soft delete a company admin (Super Admin only)
    """
    require_super_admin(user)

    try:
        target = users_collection.find_one({"_id": ObjectId(admin_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid admin ID")

    if not target:
        raise HTTPException(status_code=404, detail="Admin not found")

    if target.get("role") != "company_admin":
        raise HTTPException(status_code=400, detail="User is not a company admin")

    # Cannot delete self
    if str(target["_id"]) == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    if target.get("status") == "deleted":
        raise HTTPException(status_code=400, detail="Admin is already deleted")

    # Soft delete user
    users_collection.update_one(
        {"_id": target["_id"]},
        {
            "$set": {
                "status": "deleted",
                "deleted_at": datetime.utcnow(),
                "deleted_by": user["id"],
                "updated_at": datetime.utcnow()
            }
        }
    )

    logger.info(f"Company admin deleted: {target['email']} by {user.get('email', 'unknown')}")

    return {"message": "Admin deleted successfully", "success": True}


@router.post("/company-admins/{admin_id}/resend-invite")
def resend_admin_invite(admin_id: str, user=Depends(get_current_user)):
    """
    Resend invitation to a pending company admin (Super Admin only)
    """
    require_super_admin(user)

    try:
        target = users_collection.find_one({"_id": ObjectId(admin_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid admin ID")

    if not target:
        raise HTTPException(status_code=404, detail="Admin not found")

    if target.get("role") != "company_admin":
        raise HTTPException(status_code=400, detail="User is not a company admin")

    if target.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Only pending admins can be re-invited")

    # Rate limiting
    last_update = target.get("updated_at")
    if last_update and datetime.utcnow() - last_update < timedelta(seconds=60):
        raise HTTPException(
            status_code=429, 
            detail="Please wait 60 seconds before resending invitation"
        )

    # Generate new OTP
    otp = generate_otp()
    expiry = datetime.utcnow() + timedelta(minutes=10)

    users_collection.update_one(
        {"_id": target["_id"]},
        {
            "$set": {
                "otp": otp,
                "otp_expiry": expiry,
                "updated_at": datetime.utcnow(),
                "invite_resend_count": target.get("invite_resend_count", 0) + 1
            }
        }
    )

    # Get company info
    company = companies_collection.find_one({"company_id": target["company_id"]})

    # Send invitation email
    if not send_email(
        to_email=target["email"],
        subject=f"{company['name']} Admin Access",
        body=build_company_admin_invite_email(
            company_name=company["name"],
            name=target["name"],
            otp=otp,
            frontend_url=FRONTEND_URL
        )
    ):
        logger.error(f"Failed to resend invitation to {target['email']}")
        raise HTTPException(
            status_code=500,
            detail="Failed to send invitation email"
        )

    logger.info(f"Invitation resent to: {target['email']}")

    return {"message": "Invitation resent successfully", "success": True}

@router.post("/create-editor")
def create_editor(payload: dict, user=Depends(get_current_user)):
    """
    Create a new editor (Super Admin or Company Admin)
    """
    role = user.get("role")

    if role not in ["super_admin", "company_admin"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    email = payload.get("email", "").strip().lower()
    name = payload.get("name", "").strip()

    if not email:
        raise HTTPException(status_code=400, detail="Email required")

    if not validate_email(email):
        raise HTTPException(status_code=400, detail="Invalid email format")

    if not name:
        raise HTTPException(status_code=400, detail="Name required")

    # Determine company scope properly
    if role == "super_admin":
        company_id = payload.get("company_id")
        if not company_id:
            raise HTTPException(status_code=400, detail="Company ID required for super admin")
    else:  # company_admin
        company_id = user.get("company_id")
        if not company_id:
            raise HTTPException(status_code=400, detail="Invalid company context")

    # Check if company exists
    company = companies_collection.find_one({"company_id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    if company.get("status") != "active":
        raise HTTPException(status_code=403, detail="Company not active")

    # Check if user already exists
    existing = users_collection.find_one({"email": email})
    if existing:
        if existing.get("status") == "deleted" and existing.get("company_id") == company_id:
            # Reactivate deleted user
            otp = generate_otp()
            expiry = datetime.utcnow() + timedelta(minutes=10)
            
            users_collection.update_one(
                {"email": email},
                {
                    "$set": {
                        "role": "editor",
                        "company_id": company_id,
                        "name": name,
                        "otp": otp,
                        "otp_expiry": expiry,
                        "status": "pending",
                        "updated_at": datetime.utcnow(),
                        "deleted_at": None
                    }
                }
            )
            message = "User reactivated and invitation sent successfully"
        else:
            raise HTTPException(status_code=409, detail="User with this email already exists")
    else:
        # Create new user
        otp = generate_otp()
        expiry = datetime.utcnow() + timedelta(minutes=10)

        users_collection.insert_one({
            "email": email,
            "name": name,
            "role": "editor",
            "company_id": company_id,
            "password": None,
            "otp": otp,
            "otp_expiry": expiry,
            "status": "pending",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": user.get("id"),
            "profile_image": None,
            "avatar_id": None,
            "metadata": {}
        })
        message = "Editor invited successfully"

    # Send invitation email WITH NAME
    if not send_email(
        to_email=email,
        subject=f"{company['name']} Editor Access",
        body=build_editor_invite_email(
            company_name=company["name"],
            name=name,
            otp=otp,
            frontend_url=FRONTEND_URL
        )
    ):
        logger.error(f"Failed to send invitation email to {email}")
        raise HTTPException(
            status_code=500,
            detail="Failed to send invitation email"
        )

    logger.info(f"Editor invited: {email} to company {company_id}")

    return {"message": message, "success": True}


@router.get("/editors")
def get_editors(
    company_id: Optional[str] = Query(None, description="Filter by company"),
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user=Depends(get_current_user)
):
    """
    Get editors with filters (Super Admin or Company Admin)
    """
    role = user.get("role")
    
    if role not in ["super_admin", "company_admin"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    # Build query
    query = {
        "role": "editor",
        "status": {"$ne": "deleted"}
    }

    # Apply company filter based on role
    if role == "super_admin":
        if company_id:
            query["company_id"] = company_id
    else:  # company_admin
        query["company_id"] = user.get("company_id")
    
    if status:
        query["status"] = status

    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]

    # Get total count
    total = users_collection.count_documents(query)

    # Get paginated results
    cursor = users_collection.find(
        query,
        {
            "password": 0, 
            "otp": 0, 
            "otp_expiry": 0,
            "reset_otp": 0,
            "reset_otp_expiry": 0
        }
    ).sort("created_at", -1).skip(skip).limit(limit)

    editors = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        # Add company name
        if doc.get("company_id"):
            company = companies_collection.find_one(
                {"company_id": doc["company_id"]},
                {"name": 1}
            )
            if company:
                doc["company_name"] = company.get("name")
        editors.append(doc)

    return {
        "editors": editors,
        "total": total,
        "skip": skip,
        "limit": limit,
        "has_more": (skip + limit) < total
    }


@router.patch("/editors/{editor_id}/suspend")
def suspend_editor(editor_id: str, user=Depends(get_current_user)):
    """
    Suspend an editor (Super Admin or Company Admin)
    """
    role = user.get("role")
    
    if role not in ["super_admin", "company_admin"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    try:
        target = users_collection.find_one({"_id": ObjectId(editor_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid editor ID")

    if not target:
        raise HTTPException(status_code=404, detail="Editor not found")

    if target.get("role") != "editor":
        raise HTTPException(status_code=400, detail="User is not an editor")

    # Check company access for company admin
    if role == "company_admin" and target.get("company_id") != user.get("company_id"):
        raise HTTPException(status_code=403, detail="Cannot modify editor from another company")

    # Cannot suspend self
    if str(target["_id"]) == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot suspend yourself")

    if target.get("status") == "suspended":
        raise HTTPException(status_code=400, detail="Editor is already suspended")

    # Update user
    users_collection.update_one(
        {"_id": target["_id"]},
        {
            "$set": {
                "status": "suspended",
                "suspended_at": datetime.utcnow(),
                "suspended_by": user["id"],
                "updated_at": datetime.utcnow()
            }
        }
    )

    logger.info(f"Editor suspended: {target['email']} by {user.get('email', 'unknown')}")

    return {"message": "Editor suspended successfully", "success": True}


@router.patch("/editors/{editor_id}/activate")
def activate_editor(editor_id: str, user=Depends(get_current_user)):
    """
    Activate a suspended editor (Super Admin or Company Admin)
    """
    role = user.get("role")
    
    if role not in ["super_admin", "company_admin"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    try:
        target = users_collection.find_one({"_id": ObjectId(editor_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid editor ID")

    if not target:
        raise HTTPException(status_code=404, detail="Editor not found")

    if target.get("role") != "editor":
        raise HTTPException(status_code=400, detail="User is not an editor")

    # Check company access for company admin
    if role == "company_admin" and target.get("company_id") != user.get("company_id"):
        raise HTTPException(status_code=403, detail="Cannot modify editor from another company")

    if target.get("status") != "suspended":
        raise HTTPException(status_code=400, detail="Editor is not suspended")

    # Update user
    users_collection.update_one(
        {"_id": target["_id"]},
        {
            "$set": {
                "status": "active",
                "activated_at": datetime.utcnow(),
                "activated_by": user["id"],
                "updated_at": datetime.utcnow()
            }
        }
    )

    logger.info(f"Editor activated: {target['email']} by {user.get('email', 'unknown')}")

    return {"message": "Editor activated successfully", "success": True}


@router.delete("/editors/{editor_id}")
def delete_editor(editor_id: str, user=Depends(get_current_user)):
    """
    Soft delete an editor (Super Admin or Company Admin)
    """
    role = user.get("role")
    
    if role not in ["super_admin", "company_admin"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    try:
        target = users_collection.find_one({"_id": ObjectId(editor_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid editor ID")

    if not target:
        raise HTTPException(status_code=404, detail="Editor not found")

    if target.get("role") != "editor":
        raise HTTPException(status_code=400, detail="User is not an editor")

    # Check company access for company admin
    if role == "company_admin" and target.get("company_id") != user.get("company_id"):
        raise HTTPException(status_code=403, detail="Cannot delete editor from another company")

    # Cannot delete self
    if str(target["_id"]) == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    if target.get("status") == "deleted":
        raise HTTPException(status_code=400, detail="Editor is already deleted")

    # Soft delete user
    users_collection.update_one(
        {"_id": target["_id"]},
        {
            "$set": {
                "status": "deleted",
                "deleted_at": datetime.utcnow(),
                "deleted_by": user["id"],
                "updated_at": datetime.utcnow()
            }
        }
    )

    logger.info(f"Editor deleted: {target['email']} by {user.get('email', 'unknown')}")

    return {"message": "Editor deleted successfully", "success": True}


@router.post("/editors/{editor_id}/resend-invite")
def resend_editor_invite(editor_id: str, user=Depends(get_current_user)):
    """
    Resend invitation to a pending editor (Super Admin or Company Admin)
    """
    role = user.get("role")
    
    if role not in ["super_admin", "company_admin"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    try:
        target = users_collection.find_one({"_id": ObjectId(editor_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid editor ID")

    if not target:
        raise HTTPException(status_code=404, detail="Editor not found")

    if target.get("role") != "editor":
        raise HTTPException(status_code=400, detail="User is not an editor")

    # Check company access for company admin
    if role == "company_admin" and target.get("company_id") != user.get("company_id"):
        raise HTTPException(status_code=403, detail="Cannot modify editor from another company")

    if target.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Only pending editors can be re-invited")

    # Rate limiting
    last_update = target.get("updated_at")
    if last_update and datetime.utcnow() - last_update < timedelta(seconds=60):
        raise HTTPException(
            status_code=429, 
            detail="Please wait 60 seconds before resending invitation"
        )

    # Generate new OTP
    otp = generate_otp()
    expiry = datetime.utcnow() + timedelta(minutes=10)

    users_collection.update_one(
        {"_id": target["_id"]},
        {
            "$set": {
                "otp": otp,
                "otp_expiry": expiry,
                "updated_at": datetime.utcnow(),
                "invite_resend_count": target.get("invite_resend_count", 0) + 1
            }
        }
    )

    # Get company info
    company = companies_collection.find_one({"company_id": target["company_id"]})

    # Send invitation email
    if not send_email(
        to_email=target["email"],
        subject=f"{company['name']} Editor Access",
        body=build_editor_invite_email(
            company_name=company["name"],
            name=target["name"],
            otp=otp,
            frontend_url=FRONTEND_URL
        )
    ):
        logger.error(f"Failed to resend invitation to editor {target['email']}")
        raise HTTPException(
            status_code=500,
            detail="Failed to send invitation email"
        )

    logger.info(f"Invitation resent to editor: {target['email']}")

    return {"message": "Invitation resent successfully", "success": True}


@router.get("/users")
def list_users(
    role: Optional[str] = Query(None, description="Filter by role"),
    company_id: Optional[str] = Query(None, description="Filter by company (super admin only)"),
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user=Depends(get_current_user)
):
    """
    List users with filters and pagination
    """
    # Build query
    query = {"status": {"$ne": "deleted"}}

    # Apply role-based restrictions
    if user["role"] == "super_admin":
        if company_id:
            query["company_id"] = company_id
    elif user["role"] == "company_admin":
        query["company_id"] = user["company_id"]
    else:
        raise HTTPException(status_code=403, detail="Not allowed")

    # Apply filters
    if role:
        query["role"] = role
    
    if status:
        query["status"] = status

    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]

    # Get total count
    total = users_collection.count_documents(query)

    # Get paginated results
    cursor = users_collection.find(
        query,
        {
            "password": 0, 
            "otp": 0, 
            "otp_expiry": 0,
            "reset_otp": 0,
            "reset_otp_expiry": 0
        }
    ).sort("created_at", -1).skip(skip).limit(limit)

    users = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        # Add company name if available
        if doc.get("company_id"):
            company = companies_collection.find_one(
                {"company_id": doc["company_id"]},
                {"name": 1}
            )
            if company:
                doc["company_name"] = company.get("name")
        users.append(doc)

    return {
        "items": users,
        "total": total,
        "skip": skip,
        "limit": limit,
        "has_more": (skip + limit) < total
    }


@router.patch("/users/{user_id}/suspend")
def suspend_user(user_id: str, user=Depends(get_current_user)):
    """
    Suspend a user
    """
    try:
        target = users_collection.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Check permissions
    if user["role"] == "super_admin":
        pass  # Full access
    elif user["role"] == "company_admin":
        if target.get("company_id") != user.get("company_id"):
            raise HTTPException(status_code=403, detail="Cannot modify user from another company")
        if target.get("role") != "editor":
            raise HTTPException(status_code=403, detail="Only editors can be suspended")
    else:
        raise HTTPException(status_code=403, detail="Not allowed")

    # Cannot suspend self
    if str(target["_id"]) == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot suspend yourself")

    # Update user
    users_collection.update_one(
        {"_id": target["_id"]},
        {
            "$set": {
                "status": "suspended",
                "suspended_at": datetime.utcnow(),
                "suspended_by": user["id"],
                "updated_at": datetime.utcnow()
            }
        }
    )

    # Get user email safely for logging
    user_email = user.get("email", "unknown")
    logger.info(f"User suspended: {target['email']} by {user_email}")

    return {"message": "User suspended successfully", "success": True}


@router.patch("/users/{user_id}/activate")
def activate_user(user_id: str, user=Depends(get_current_user)):
    """
    Activate a suspended user
    """
    try:
        target = users_collection.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Check permissions
    if user["role"] == "super_admin":
        pass
    elif user["role"] == "company_admin":
        if target.get("company_id") != user.get("company_id"):
            raise HTTPException(status_code=403, detail="Cannot modify user from another company")
        if target.get("role") != "editor":
            raise HTTPException(status_code=403, detail="Only editors can be activated")
    else:
        raise HTTPException(status_code=403, detail="Not allowed")

    if target.get("status") != "suspended":
        raise HTTPException(status_code=400, detail="User is not suspended")

    # Update user
    users_collection.update_one(
        {"_id": target["_id"]},
        {
            "$set": {
                "status": "active",
                "activated_at": datetime.utcnow(),
                "activated_by": user["id"],
                "updated_at": datetime.utcnow()
            }
        }
    )

    user_email = user.get("email", "unknown")
    logger.info(f"User activated: {target['email']} by {user_email}")

    return {"message": "User activated successfully", "success": True}


@router.delete("/users/{user_id}")
def soft_delete_user(user_id: str, user=Depends(get_current_user)):
    """
    Soft delete a user (Super Admin only)
    """
    require_super_admin(user)

    try:
        target = users_collection.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Cannot delete self
    if str(target["_id"]) == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    # Cannot delete other super admins
    if target.get("role") == "super_admin":
        raise HTTPException(status_code=403, detail="Cannot delete super admin")

    # Check if user is pending - you can delete pending users
    # No restriction needed, pending users can be deleted

    # Soft delete user
    result = users_collection.update_one(
        {"_id": target["_id"]},
        {
            "$set": {
                "status": "deleted",
                "deleted_at": datetime.utcnow(),
                "deleted_by": user["id"],
                "updated_at": datetime.utcnow()
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    # Fix the KeyError by using .get()
    user_email = user.get("email", "unknown")
    logger.info(f"User deleted: {target['email']} by {user_email}")

    return {"message": "User deleted successfully", "success": True}


@router.post("/users/{user_id}/resend-invite")
def resend_invite(user_id: str, user=Depends(get_current_user)):
    """
    Resend invitation to a pending user
    """
    try:
        target = users_collection.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if target.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Only pending users can be reinvited")

    # Check permissions
    if user["role"] == "super_admin":
        pass
    elif user["role"] == "company_admin":
        if target.get("company_id") != user.get("company_id"):
            raise HTTPException(status_code=403, detail="Cannot modify user from another company")
        if target.get("role") != "editor":
            raise HTTPException(status_code=403, detail="Can only resend editor invites")
    else:
        raise HTTPException(status_code=403, detail="Not allowed")

    # Rate limiting
    last_update = target.get("updated_at")
    if last_update and datetime.utcnow() - last_update < timedelta(seconds=60):
        raise HTTPException(
            status_code=429, 
            detail="Please wait 60 seconds before resending invitation"
        )

    # Generate new OTP
    otp = generate_otp()
    expiry = datetime.utcnow() + timedelta(minutes=10)

    users_collection.update_one(
        {"_id": target["_id"]},
        {
            "$set": {
                "otp": otp,
                "otp_expiry": expiry,
                "updated_at": datetime.utcnow(),
                "invite_resend_count": target.get("invite_resend_count", 0) + 1
            }
        }
    )

    # Get company info
    company = companies_collection.find_one({"company_id": target["company_id"]})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Send email based on role WITH NAME
    if target["role"] == "company_admin":
        body = build_company_admin_invite_email(
            company_name=company["name"],
            name=target["name"],  # Make sure this is passed
            otp=otp,
            frontend_url=FRONTEND_URL
        )
        subject = f"{company['name']} Admin Access"
    else:
        body = build_editor_invite_email(
            company_name=company["name"],
            name=target["name"],  # Make sure this is passed
            otp=otp,
            frontend_url=FRONTEND_URL
        )
        subject = f"{company['name']} Editor Access"

    if not send_email(target["email"], subject, body):
        logger.error(f"Failed to send invitation email to {target['email']}")
        # Don't raise here as it might be part of a loop or already partially updated

    # Fix the KeyError here too
    user_email = user.get("email", "unknown")
    logger.info(f"Invitation resent to: {target['email']} by {user_email}")

    return {"message": "Invitation resent successfully", "success": True}


# Stats endpoints
@router.get("/super-admin-stats")
def super_admin_stats(user=Depends(get_current_user)):
    """
    Get global statistics (Super Admin only)
    """
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Not allowed")

    # Companies
    total_companies = companies_collection.count_documents({
        "status": {"$ne": "deleted"}
    })
    
    active_companies = companies_collection.count_documents({
        "status": "active"
    })
    
    inactive_companies = companies_collection.count_documents({
        "status": "inactive"
    })

    # Users
    total_users = users_collection.count_documents({
        "status": {"$ne": "deleted"}
    })

    active_users = users_collection.count_documents({
        "status": "active"
    })

    pending_users = users_collection.count_documents({
        "status": "pending"
    })

    suspended_users = users_collection.count_documents({
        "status": "suspended"
    })

    # By role
    admins = users_collection.count_documents({
        "role": "company_admin",
        "status": {"$ne": "deleted"}
    })

    editors = users_collection.count_documents({
        "role": "editor",
        "status": {"$ne": "deleted"}
    })

    # Content
    sections = sections_collection.count_documents({
        "status": {"$ne": "deleted"}
    })

    categories = categories_collection.count_documents({
        "status": {"$ne": "deleted"}
    })

    total_posts = content_collection.count_documents({
        "status": {"$ne": "deleted"}
    })

    published_posts = content_collection.count_documents({
        "status": "published"
    })

    draft_posts = content_collection.count_documents({
        "status": "draft"
    })

    return {
        "companies": {
            "total": total_companies,
            "active": active_companies,
            "inactive": inactive_companies
        },
        "users": {
            "total": total_users,
            "active": active_users,
            "pending": pending_users,
            "suspended": suspended_users,
            "admins": admins,
            "editors": editors
        },
        "content": {
            "sections": sections,
            "categories": categories,
            "total_posts": total_posts,
            "published_posts": published_posts,
            "draft_posts": draft_posts
        }
    }


@router.get("/company-admin-stats")
def company_admin_stats(user=Depends(get_current_user)):
    """
    Get company statistics (Company Admin only)
    """
    require_company_admin(user)

    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="Invalid company context")

    # Users in company
    total_users = users_collection.count_documents({
        "company_id": company_id,
        "status": {"$ne": "deleted"}
    })

    active_users = users_collection.count_documents({
        "company_id": company_id,
        "status": "active"
    })

    pending_users = users_collection.count_documents({
        "company_id": company_id,
        "status": "pending"
    })

    editors = users_collection.count_documents({
        "company_id": company_id,
        "role": "editor",
        "status": {"$ne": "deleted"}
    })

    # Content in company
    sections = sections_collection.count_documents({
        "company_id": company_id,
        "status": {"$ne": "deleted"}
    })

    categories = categories_collection.count_documents({
        "company_id": company_id,
        "status": {"$ne": "deleted"}
    })

    total_posts = content_collection.count_documents({
        "company_id": company_id,
        "status": {"$ne": "deleted"}
    })

    published_posts = content_collection.count_documents({
        "company_id": company_id,
        "status": "published"
    })

    draft_posts = content_collection.count_documents({
        "company_id": company_id,
        "status": "draft"
    })

    # Get company info
    company = companies_collection.find_one(
        {"company_id": company_id},
        {"name": 1, "status": 1}
    )

    return {
        "company": {
            "id": company_id,
            "name": company.get("name") if company else None,
            "status": company.get("status") if company else None
        },
        "users": {
            "total": total_users,
            "active": active_users,
            "pending": pending_users,
            "editors": editors
        },
        "content": {
            "sections": sections,
            "categories": categories,
            "total_posts": total_posts,
            "published_posts": published_posts,
            "draft_posts": draft_posts
        }
    }


@router.get("/editor-stats")
def editor_stats(user=Depends(get_current_user)):
    """
    Get editor statistics (Editor only)
    """
    if user.get("role") != "editor":
        raise HTTPException(status_code=403, detail="Not allowed")

    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="Invalid company context")

    user_id = user.get("id")

    # Company content stats
    total_posts = content_collection.count_documents({
        "company_id": company_id,
        "status": {"$ne": "deleted"}
    })

    published_posts = content_collection.count_documents({
        "company_id": company_id,
        "status": "published"
    })

    draft_posts = content_collection.count_documents({
        "company_id": company_id,
        "status": "draft"
    })

    # My posts
    my_posts = content_collection.count_documents({
        "company_id": company_id,
        "author.id": user_id,
        "status": {"$ne": "deleted"}
    })

    my_published = content_collection.count_documents({
        "company_id": company_id,
        "author.id": user_id,
        "status": "published"
    })

    my_drafts = content_collection.count_documents({
        "company_id": company_id,
        "author.id": user_id,
        "status": "draft"
    })

    # Sections and categories
    sections = sections_collection.count_documents({
        "company_id": company_id,
        "status": {"$ne": "deleted"}
    })

    categories = categories_collection.count_documents({
        "company_id": company_id,
        "status": {"$ne": "deleted"}
    })

    return {
        "company_id": company_id,
        "content": {
            "total_posts": total_posts,
            "published_posts": published_posts,
            "draft_posts": draft_posts,
            "sections": sections,
            "categories": categories
        },
        "my_content": {
            "total_posts": my_posts,
            "published_posts": my_published,
            "draft_posts": my_drafts
        }
    }


# Profile endpoints
@router.patch("/users/me/profile")
async def update_profile(
    name: str = Form(...),
    profile_image: Optional[UploadFile] = File(None),
    user=Depends(get_current_user)
):
    """
    Update user profile
    """
    if not name or not name.strip():
        raise HTTPException(status_code=400, detail="Name is required")

    update_data = {
        "name": name.strip(),
        "updated_at": datetime.utcnow()
    }

    # Handle profile image upload to Azure Blob Storage
    if profile_image and profile_image.filename:
        try:
            # Validate image type
            if profile_image.content_type not in ["image/jpeg", "image/png", "image/webp", "image/gif"]:
                raise HTTPException(
                    status_code=400, 
                    detail="Only JPEG, PNG, WEBP, and GIF images are allowed"
                )

            # Process image
            image_data = await process_profile_image(profile_image)
            
            if image_data:
                # Check if user already has an avatar
                current_user = users_collection.find_one({"_id": ObjectId(user["id"])})
                old_avatar_id = current_user.get("avatar_id")

                # Upload to Azure Blob Storage
                blob_name = f"avatars/{user['id']}/{datetime.utcnow().timestamp()}.jpg"
                
                upload_result = azure_storage.upload_file(
                    file_data=image_data["data"],
                    blob_name=blob_name,
                    content_type=image_data["content_type"],
                    metadata={
                        "user_id": user["id"],
                        "type": "avatar"
                    },
                    original_filename=profile_image.filename
                )

                # Create image metadata in database
                image_id = ObjectId()
                images_collection.insert_one({
                    "_id": image_id,
                    "blob_name": upload_result["blob_name"],
                    "url": upload_result["url"],
                    "company_id": user.get("company_id"),
                    "user_id": user["id"],
                    "type": "avatar",
                    "width": image_data["width"],
                    "height": image_data["height"],
                    "size": image_data["size"],
                    "hash": image_data["hash"],
                    "created_at": datetime.utcnow(),
                    "metadata": {
                        "content_type": image_data["content_type"]
                    }
                })

                # Delete old avatar if exists
                if old_avatar_id:
                    try:
                        old_avatar = images_collection.find_one({"_id": ObjectId(old_avatar_id)})
                        if old_avatar and old_avatar.get("blob_name"):
                            azure_storage.delete_file(old_avatar["blob_name"])
                        images_collection.delete_one({"_id": ObjectId(old_avatar_id)})
                    except Exception as e:
                        logger.error(f"Failed to delete old avatar: {str(e)}")

                # Update user with avatar info
                update_data["avatar_id"] = str(image_id)
                update_data["profile_image"] = {
                    "url": upload_result["url"],
                    "blob_name": upload_result["blob_name"],
                    "content_type": image_data["content_type"]
                }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to upload profile image: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to upload profile image")

    # Update user in database
    result = users_collection.update_one(
        {"_id": ObjectId(user["id"])},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    logger.info(f"Profile updated for user: {user.get('email', 'unknown')}")

    return {
        "message": "Profile updated successfully",
        "name": update_data["name"],
        "avatar_id": update_data.get("avatar_id"),
        "profile_image": update_data.get("profile_image")
    }


@router.get("/users/me")
def get_profile(user=Depends(get_current_user)):
    """
    Get current user profile
    """
    db_user = users_collection.find_one(
        {"_id": ObjectId(user["id"])},
        {
            "password": 0, 
            "otp": 0, 
            "otp_expiry": 0,
            "reset_otp": 0,
            "reset_otp_expiry": 0
        }
    )

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Convert ObjectId to string
    db_user["_id"] = str(db_user["_id"])

    # Add company name if available
    if db_user.get("company_id"):
        company = companies_collection.find_one(
            {"company_id": db_user["company_id"]},
            {"name": 1}
        )
        if company:
            db_user["company_name"] = company.get("name")

    # Get avatar URL if exists
    if db_user.get("avatar_id"):
        avatar = images_collection.find_one(
            {"_id": ObjectId(db_user["avatar_id"])},
            {"url": 1}
        )
        if avatar:
            db_user["avatar_url"] = avatar.get("url")

    return db_user


@router.patch("/users/me/password")
async def change_password(
    current_password: str = Form(...),
    new_password: str = Form(...),
    user=Depends(get_current_user)
):
    """
    Change user password
    """
    # Validate new password
    if len(new_password) < 8:
        raise HTTPException(
            status_code=400, 
            detail="Password must be at least 8 characters long"
        )
    
    if len(new_password) > 72:
        raise HTTPException(
            status_code=400, 
            detail="Password too long (max 72 chars)"
        )

    # Get user from database
    db_user = users_collection.find_one({"_id": ObjectId(user["id"])})

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify current password
    if not verify_password(current_password, db_user.get("password", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    # Check if new password is same as old
    if verify_password(new_password, db_user.get("password", "")):
        raise HTTPException(
            status_code=400, 
            detail="New password must be different from current password"
        )

    # Update password
    hashed_password = hash_password(new_password)

    users_collection.update_one(
        {"_id": db_user["_id"]},
        {
            "$set": {
                "password": hashed_password,
                "password_updated_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )

    logger.info(f"Password changed for user: {user.get('email', 'unknown')}")

    return {"message": "Password updated successfully"}


@router.get("/users/{user_id}")
def get_user(user_id: str, user=Depends(get_current_user)):
    """
    Get user by ID (with permissions check)
    """
    try:
        target = users_collection.find_one(
            {"_id": ObjectId(user_id)},
            {
                "password": 0, 
                "otp": 0, 
                "otp_expiry": 0,
                "reset_otp": 0,
                "reset_otp_expiry": 0
            }
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Check permissions
    if user["role"] == "super_admin":
        pass
    elif user["role"] == "company_admin":
        if target.get("company_id") != user.get("company_id"):
            raise HTTPException(status_code=403, detail="Cannot view user from another company")
    elif user["role"] == "editor":
        if str(target["_id"]) != user["id"]:
            raise HTTPException(status_code=403, detail="Can only view own profile")
    else:
        raise HTTPException(status_code=403, detail="Not allowed")

    # Convert ObjectId to string
    target["_id"] = str(target["_id"])

    # Add company name if available
    if target.get("company_id"):
        company = companies_collection.find_one(
            {"company_id": target["company_id"]},
            {"name": 1}
        )
        if company:
            target["company_name"] = company.get("name")

    return target