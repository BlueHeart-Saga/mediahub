from fastapi import APIRouter, HTTPException,  Depends, BackgroundTasks
from datetime import datetime, timedelta
import random
import logging
from bson import ObjectId
from typing import Optional

from database import users_collection, companies_collection, registration_requests_collection
from core.security import hash_password, verify_password, create_token
from core.mailer import send_email
from core.templates.otp_email import build_otp_email
from core.templates.reset_password_email import build_reset_password_email
from core.templates.super_admin_invite import build_super_admin_invite_email
from routes.dependencies import get_current_user

from core.config import FRONTEND_URL

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return str(random.randint(100000, 999999))

def validate_email(email: str) -> bool:
    """Basic email validation"""
    import re
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return re.match(pattern, email) is not None

def validate_password(password: str) -> tuple:
    """
    Validate password strength
    Returns (is_valid, message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if len(password) > 72:
        return False, "Password too long (max 72 chars)"
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number"
    return True, "Password is valid"

# ✅ Super Admin Registration
@router.post("/register-super-admin")
def register_super_admin(payload: dict):
    """
    Register the first super admin (only one allowed)
    """
    try:
        name = payload.get("name", "").strip()
        email = payload.get("email", "").strip().lower()
        password = payload.get("password", "")

        # Validate required fields
        if not name:
            raise HTTPException(status_code=400, detail="Name is required")
        
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
        
        if not validate_email(email):
            raise HTTPException(status_code=400, detail="Invalid email format")

        if not password:
            raise HTTPException(status_code=400, detail="Password required")

        # Validate password strength
        is_valid, msg = validate_password(password)
        if not is_valid:
            raise HTTPException(status_code=400, detail=msg)

        # Check if super admin already exists
        # existing = users_collection.find_one({"role": "super_admin"})
        # if existing:
        #     raise HTTPException(
        #         status_code=400, 
        #         detail="Super Admin already exists"
        #     )

        # Check if email already used
        email_exists = users_collection.find_one({"email": email})
        if email_exists:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )

        # Create super admin
        user_data = {
            "name": name,
            "email": email,
            "password": hash_password(password),
            "role": "super_admin",
            "company_id": None,
            "status": "active",  # Super admin is auto-activated
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_login": None,
            "profile_image": None,
            "avatar_id": None,
            "metadata": {
                "registration_ip": None,  # Add if you have request object
                "user_agent": None
            }
        }

        result = users_collection.insert_one(user_data)

        logger.info(f"Super Admin created: {email}")

        return {
            "message": "Super Admin created successfully",
            "user_id": str(result.inserted_id)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Super admin registration failed: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Registration failed. Please try again."
        )
    


@router.post("/invite-super-admin")
def invite_super_admin(payload: dict):
    """
    Invite a new super admin (Only callable when no super admin exists)
    This should be protected or only used during initial setup
    """
    try:
        # Check if super admin already exists (optional - can be removed for initial setup)
        # existing_super_admin = users_collection.find_one({"role": "super_admin"})
        # if existing_super_admin:
        #     # If you want to allow multiple super admins, remove this check
        #     # and add proper authorization
        #     raise HTTPException(
        #         status_code=400,
        #         detail="Super Admin already exists. Use create-super-admin endpoint for additional super admins."
        #     )

        name = payload.get("name", "").strip()
        email = payload.get("email", "").strip().lower()

        if not name:
            raise HTTPException(status_code=400, detail="Name required")
        
        if not email:
            raise HTTPException(status_code=400, detail="Email required")

        if not validate_email(email):
            raise HTTPException(status_code=400, detail="Invalid email format")

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
                            "role": "super_admin",
                            "company_id": None,
                            "name": name,
                            "otp": otp,
                            "otp_expiry": expiry,
                            "status": "pending",
                            "updated_at": datetime.utcnow(),
                            "deleted_at": None,
                            "invited_by": None  # Could store who invited
                        }
                    }
                )
                message = "User reactivated and invitation sent successfully"
            else:
                raise HTTPException(
                    status_code=409, 
                    detail="User with this email already exists"
                )
        else:
            # Create new super admin
            otp = generate_otp()
            expiry = datetime.utcnow() + timedelta(minutes=10)

            users_collection.insert_one({
                "email": email,
                "name": name,
                "role": "super_admin",
                "company_id": None,
                "password": None,
                "otp": otp,
                "otp_expiry": expiry,
                "status": "pending",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "created_by": None,  # Could store who invited
                "profile_image": None,
                "avatar_id": None,
                "metadata": {
                    "invited_at": datetime.utcnow().isoformat()
                }
            })
            message = "Super Admin invited successfully"

        # Send invitation email
        if not send_email(
            to_email=email,
            subject="Welcome to Mediahub - Super Admin Access",
            body=build_super_admin_invite_email(
                name=name,
                otp=otp,
                frontend_url=FRONTEND_URL
            )
        ):
            logger.error(f"Failed to send invitation email to {email}")
            raise HTTPException(
                status_code=500,
                detail="Failed to send invitation email. Please try again."
            )

        logger.info(f"Super Admin invited: {email}")

        return {
            "message": message,
            "success": True,
            "email": email
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Super admin invitation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to send invitation. Please try again."
        )
        
        
# Protected version for existing super admins

@router.post("/create-super-admin")
def create_super_admin(
    payload: dict,
    current_user: dict = Depends(get_current_user)  # Requires authentication
):
    """
    Create a new super admin (Existing Super Admin only)
    """
    # Check if current user is super admin
    if current_user.get("role") != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Only super admins can create new super admins"
        )

    name = payload.get("name", "").strip()
    email = payload.get("email", "").strip().lower()

    if not name:
        raise HTTPException(status_code=400, detail="Name required")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email required")

    if not validate_email(email):
        raise HTTPException(status_code=400, detail="Invalid email format")

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
                        "role": "super_admin",
                        "company_id": None,
                        "name": name,
                        "otp": otp,
                        "otp_expiry": expiry,
                        "status": "pending",
                        "updated_at": datetime.utcnow(),
                        "deleted_at": None,
                        "invited_by": current_user.get("id"),
                        "invited_by_email": current_user.get("email")
                    }
                }
            )
            message = "User reactivated and invitation sent successfully"
        else:
            raise HTTPException(
                status_code=409, 
                detail="User with this email already exists"
            )
    else:
        # Create new super admin
        otp = generate_otp()
        expiry = datetime.utcnow() + timedelta(minutes=10)

        users_collection.insert_one({
            "email": email,
            "name": name,
            "role": "super_admin",
            "company_id": None,
            "password": None,
            "otp": otp,
            "otp_expiry": expiry,
            "status": "pending",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": current_user.get("id"),
            "invited_by": current_user.get("id"),
            "invited_by_email": current_user.get("email"),
            "profile_image": None,
            "avatar_id": None,
            "metadata": {
                "invited_at": datetime.utcnow().isoformat()
            }
        })
        message = "Super Admin invited successfully"

    # Send invitation email
    if not send_email(
        to_email=email,
        subject="Welcome to Mediahub - Super Admin Access",
        body=build_super_admin_invite_email(
            name=name,
            otp=otp,
            frontend_url=FRONTEND_URL
        )
    ):
        logger.error(f"Failed to send invitation email to {email}")
        raise HTTPException(
            status_code=500,
            detail="Failed to send invitation email. Please try again."
        )

    logger.info(f"Super Admin invited by {current_user.get('email')}: {email}")

    return {
        "message": message,
        "success": True,
        "email": email
    }
    
# Add to your auth router

@router.get("/super-admins")
def get_super_admins(
    skip: int = 0,
    limit: int = 10,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all super admins"""
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    query = {"role": "super_admin", "status": {"$ne": "deleted"}}
    
    if status:
        query["status"] = status
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    total = users_collection.count_documents(query)
    
    cursor = users_collection.find(
        query,
        {"password": 0, "otp": 0, "reset_otp": 0}
    ).skip(skip).limit(limit)
    
    admins = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        admins.append(doc)
    
    return {
        "super_admins": admins,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.patch("/admin/users/{user_id}/suspend")
def suspend_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Suspend a user (Super Admin only)"""
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Not allowed")
        
    try:
        target = users_collection.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if target.get("status") == "suspended":
        raise HTTPException(status_code=400, detail="User is already suspended")

    # Cannot suspend self
    if str(target["_id"]) == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot suspend yourself")

    users_collection.update_one(
        {"_id": target["_id"]},
        {
            "$set": {
                "status": "suspended",
                "updated_at": datetime.utcnow(),
                "suspended_at": datetime.utcnow(),
                "suspended_by": current_user["id"]
            }
        }
    )
    
    logger.info(f"User suspended: {target['email']} by {current_user['email']}")
    return {"message": "User suspended successfully", "success": True}

@router.patch("/admin/users/{user_id}/activate")
def activate_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Activate a suspended user (Super Admin only)"""
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Not allowed")
        
    try:
        target = users_collection.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if target.get("status") != "suspended":
        raise HTTPException(status_code=400, detail="User is not suspended")

    users_collection.update_one(
        {"_id": target["_id"]},
        {
            "$set": {
                "status": "active",
                "updated_at": datetime.utcnow(),
                "activated_at": datetime.utcnow(),
                "activated_by": current_user["id"]
            }
        }
    )
    
    logger.info(f"User activated: {target['email']} by {current_user['email']}")
    return {"message": "User activated successfully", "success": True}

@router.delete("/admin/users/{user_id}")
def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Soft delete a user (Super Admin only)"""
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Not allowed")
        
    try:
        target = users_collection.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if target.get("status") == "deleted":
        raise HTTPException(status_code=400, detail="User already deleted")

    # Cannot delete self
    if str(target["_id"]) == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    users_collection.update_one(
        {"_id": target["_id"]},
        {
            "$set": {
                "status": "deleted",
                "updated_at": datetime.utcnow(),
                "deleted_at": datetime.utcnow(),
                "deleted_by": current_user["id"]
            }
        }
    )
    
    logger.info(f"User deleted: {target['email']} by {current_user['email']}")
    return {"message": "User deleted successfully", "success": True}
    
#  Resend super admin invite

@router.post("/super-admins/{admin_id}/resend-invite")
def resend_super_admin_invite(
    admin_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Resend invitation to a pending super admin (Super Admin only)
    """
    if current_user.get("role") != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Only super admins can resend invitations"
        )

    try:
        target = users_collection.find_one({"_id": ObjectId(admin_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid admin ID")

    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if target.get("role") != "super_admin":
        raise HTTPException(
            status_code=400, 
            detail="User is not a super admin"
        )

    if target.get("status") != "pending":
        raise HTTPException(
            status_code=400, 
            detail="Only pending users can be re-invited"
        )

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

    # Send invitation email
    if not send_email(
        to_email=target["email"],
        subject="Welcome to Mediahub - Super Admin Access",
        body=build_super_admin_invite_email(
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

    logger.info(f"Super admin invitation resent to: {target['email']}")

    return {
        "message": "Invitation resent successfully", 
        "success": True
    }

@router.post("/developer-login")
def developer_login(payload: dict):
    """Special login for developers with hardcoded credentials"""
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")

    if email == "developer@mediahub.com" and password == "developerme":
        # Check if developer user exists in DB
        user = users_collection.find_one({"email": email})
        if not user:
            # Create developer user
            user_data = {
                "name": "Platform Developer",
                "email": email,
                "password": hash_password(password),
                "role": "super_admin",
                "status": "active",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            res = users_collection.insert_one(user_data)
            user_id = str(res.inserted_id)
        else:
            user_id = str(user["_id"])
            # Ensure it has super_admin role
            if user.get("role") != "super_admin":
                users_collection.update_one({"_id": user["_id"]}, {"$set": {"role": "super_admin"}})

        token_data = {
            "id": user_id,
            "email": email,
            "role": "super_admin"
        }
        token = create_token(token_data)

        return {
            "token": token,
            "user": {
                "id": user_id,
                "name": "Platform Developer",
                "email": email,
                "role": "super_admin"
            }
        }
    
    raise HTTPException(status_code=401, detail="Invalid developer credentials")

@router.get("/developer/overview")
def get_developer_overview(current_user: dict = Depends(get_current_user)):
    """Get all users and all companies for developer overview (Super Admin only)"""
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Not allowed")

    # 1. Fetch all companies
    companies = list(companies_collection.find({}, {"_id": 0}))

    # 2. Fetch all users (excluding sensitive data)
    users_cursor = users_collection.find(
        {}, 
        {"password": 0, "otp": 0, "reset_otp": 0, "otp_expiry": 0}
    ).sort("created_at", -1)

    users = []
    # Create a mapping of company_id to company_name for fast lookup
    company_map = {c["company_id"]: c["name"] for c in companies}

    for u in users_cursor:
        u["_id"] = str(u["_id"])
        u["company_name"] = company_map.get(u.get("company_id"), "N/A")
        users.append(u)

    return {
        "users": users,
        "companies": companies
    }

# ✅ Login (All Roles)
@router.post("/login")
def login(payload: dict):
    """
    Authenticate user and return JWT token
    """
    try:
        email = payload.get("email", "").strip().lower()
        password = payload.get("password", "")

        if not email or not password:
            raise HTTPException(
                status_code=400, 
                detail="Email and password are required"
            )

        # Find user
        user = users_collection.find_one({"email": email})

        if not user:
            # Use generic message to prevent user enumeration
            raise HTTPException(
                status_code=401, 
                detail="Invalid email or password"
            )

        # Check account status
        if user.get("status") == "pending":
            raise HTTPException(
                status_code=403, 
                detail="Account not activated. Please verify OTP."
            )

        if user.get("status") == "suspended":
            raise HTTPException(
                status_code=403, 
                detail="Account suspended. Contact support."
            )

        if user.get("status") == "deleted":
            raise HTTPException(
                status_code=401, 
                detail="Invalid email or password"
            )

        # Check password
        if not user.get("password"):
            raise HTTPException(
                status_code=403, 
                detail="Password not set. Please reset your password."
            )

        if not verify_password(password, user["password"]):
            # Track failed attempts (optional)
            users_collection.update_one(
                {"_id": user["_id"]},
                {
                    "$inc": {"login_attempts": 1},
                    "$set": {"last_failed_login": datetime.utcnow()}
                }
            )
            raise HTTPException(
                status_code=401, 
                detail="Invalid email or password"
            )

        # Update login info
        users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "last_login": datetime.utcnow(),
                    "last_login_ip": None,  # Add if you have request object
                },
                "$unset": {"login_attempts": ""}
            }
        )

        # Create token
        token_data = {
            "id": str(user["_id"]),
            "email": user["email"],
            "role": user["role"],
            "company_id": user.get("company_id")
        }
        
        # Add company name if available
        if user.get("company_id"):
            company = companies_collection.find_one(
                {"company_id": user["company_id"]},
                {"name": 1}
            )
            if company:
                token_data["company_name"] = company.get("name")

        token = create_token(token_data)

        logger.info(f"User logged in: {email}")

        return {
            "token": token,
            "user": {
                "id": str(user["_id"]),
                "name": user.get("name"),
                "email": user["email"],
                "role": user["role"],
                "company_id": user.get("company_id"),
                "profile_image": user.get("profile_image"),
                "avatar_id": user.get("avatar_id")
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login failed: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Login failed. Please try again."
        )

# ✅ Verify OTP for new accounts
@router.post("/verify-otp")
def verify_otp(payload: dict):
    """
    Verify OTP and activate user account
    """
    try:
        email = payload.get("email", "").strip().lower()
        otp = payload.get("otp", "").strip()
        password = payload.get("password", "")

        if not email or not otp or not password:
            raise HTTPException(
                status_code=400, 
                detail="Email, OTP, and password are required"
            )

        # Validate password
        is_valid, msg = validate_password(password)
        if not is_valid:
            raise HTTPException(status_code=400, detail=msg)

        # Find user
        user = users_collection.find_one({"email": email})

        if not user:
            raise HTTPException(
                status_code=404, 
                detail="User not found"
            )

        # Check if already active
        if user.get("status") == "active":
            raise HTTPException(
                status_code=400, 
                detail="Account already activated"
            )

        # Verify OTP
        stored_otp = user.get("otp")
        expiry = user.get("otp_expiry")

        if not stored_otp or not expiry:
            raise HTTPException(
                status_code=400, 
                detail="OTP not found or already used"
            )

        # Check expiry
        if datetime.utcnow() > expiry:
            raise HTTPException(
                status_code=401, 
                detail="OTP expired"
            )

        # Compare OTP
        if str(stored_otp).strip() != str(otp).strip():
            raise HTTPException(
                status_code=401, 
                detail="Invalid OTP"
            )

        # Activate account
        users_collection.update_one(
            {"email": email},
            {
                "$set": {
                    "password": hash_password(password),
                    "otp": None,
                    "otp_expiry": None,
                    "status": "active",
                    "activated_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )

        logger.info(f"Account activated: {email}")

        return {
            "message": "Account activated successfully",
            "email": email
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OTP verification failed: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Verification failed. Please try again."
        )

# ✅ Resend OTP
@router.post("/resend-otp")
def resend_otp(payload: dict):
    """
    Resend OTP for account activation
    """
    try:
        email = payload.get("email", "").strip().lower()

        if not email:
            raise HTTPException(
                status_code=400, 
                detail="Email is required"
            )

        # Find user
        user = users_collection.find_one({"email": email})

        if not user:
            # Don't reveal user existence
            return {
                "message": "If account exists, OTP will be sent"
            }

        # Check if already active
        if user.get("status") == "active":
            raise HTTPException(
                status_code=400, 
                detail="Account already active"
            )

        if user.get("status") != "pending":
            raise HTTPException(
                status_code=400, 
                detail="Cannot resend OTP for this account"
            )

        # Rate limiting
        last_update = user.get("updated_at")
        if last_update and datetime.utcnow() - last_update < timedelta(seconds=30):
            raise HTTPException(
                status_code=429, 
                detail="Please wait 30 seconds before requesting another OTP"
            )

        # Generate new OTP
        otp = generate_otp()
        expiry = datetime.utcnow() + timedelta(minutes=10)

        # Update user
        users_collection.update_one(
            {"email": email},
            {
                "$set": {
                    "otp": otp,
                    "otp_expiry": expiry,
                    "updated_at": datetime.utcnow(),
                    "otp_resend_count": user.get("otp_resend_count", 0) + 1
                }
            }
        )

        # Send email
        company_name = "Mediahub"
        if user.get("company_id"):
            company = companies_collection.find_one(
                {"company_id": user["company_id"]},
                {"name": 1}
            )
            if company:
                company_name = company.get("name")

        email_sent = send_email(
            to_email=email,
            subject=f"Your New OTP Code - {company_name}",
            body=build_otp_email(otp, company_name)
        )

        if not email_sent:
            logger.error(f"Failed to send OTP email to {email}")
            raise HTTPException(
                status_code=500,
                detail="Failed to send OTP email. Please try again."
            )

        return {
            "message": "OTP sent successfully",
            "success": True
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resend OTP failed: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to resend OTP. Please try again."
        )

# ✅ Forgot Password
@router.post("/forgot-password")
def forgot_password(payload: dict):
    """
    Request password reset OTP
    """
    try:
        email = payload.get("email", "").strip().lower()

        if not email:
            raise HTTPException(
                status_code=400, 
                detail="Email is required"
            )

        # Find user
        user = users_collection.find_one({"email": email})

        if not user:
            # Don't reveal user existence
            return {
                "message": "If account exists, password reset OTP will be sent"
            }

        # Check if account is active
        if user.get("status") != "active":
            return {
                "message": "If account exists, password reset OTP will be sent"
            }

        # Rate limiting
        last_request = user.get("reset_requested_at")
        if last_request and datetime.utcnow() - last_request < timedelta(seconds=60):
            return {
                "message": "If account exists, password reset OTP will be sent"
            }

        # Generate OTP
        otp = generate_otp()
        expiry = datetime.utcnow() + timedelta(minutes=10)

        # Update user
        users_collection.update_one(
            {"email": email},
            {
                "$set": {
                    "reset_otp": otp,
                    "reset_otp_expiry": expiry,
                    "reset_otp_attempts": 0,
                    "reset_requested_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # Send email
        company_name = "Mediahub"
        if user.get("company_id"):
            company = companies_collection.find_one(
                {"company_id": user["company_id"]},
                {"name": 1}
            )
            if company:
                company_name = company.get("name")

        email_sent = send_email(
            to_email=email,
            subject=f"Password Reset OTP - {company_name}",
            body=build_reset_password_email(otp, company_name)
        )

        if not email_sent:
            logger.error(f"Failed to send reset email to {email}")
            raise HTTPException(
                status_code=500,
                detail="Failed to send password reset email"
            )

        return {
            "message": "If account exists, password reset OTP will be sent"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Forgot password failed: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to process request. Please try again."
        )

# ✅ Reset Password
@router.post("/reset-password")
def reset_password(payload: dict):
    """
    Reset password using OTP
    """
    try:
        email = payload.get("email", "").strip().lower()
        otp = payload.get("otp", "").strip()
        new_password = payload.get("password", "")

        if not email or not otp or not new_password:
            raise HTTPException(
                status_code=400, 
                detail="Email, OTP, and new password are required"
            )

        # Validate password
        is_valid, msg = validate_password(new_password)
        if not is_valid:
            raise HTTPException(status_code=400, detail=msg)

        # Find user
        user = users_collection.find_one({"email": email})

        if not user:
            raise HTTPException(
                status_code=400, 
                detail="Invalid request"
            )

        # Check if account is active
        if user.get("status") != "active":
            raise HTTPException(
                status_code=400, 
                detail="Account is not active"
            )

        # Verify OTP
        if user.get("reset_otp") != otp:
            # Track failed attempts
            users_collection.update_one(
                {"email": email},
                {"$inc": {"reset_otp_attempts": 1}}
            )
            raise HTTPException(
                status_code=401, 
                detail="Invalid OTP"
            )

        # Check expiry
        expiry = user.get("reset_otp_expiry")
        if not expiry or datetime.utcnow() > expiry:
            raise HTTPException(
                status_code=401, 
                detail="OTP expired"
            )

        # Reset password
        users_collection.update_one(
            {"email": email},
            {
                "$set": {
                    "password": hash_password(new_password),
                    "reset_otp": None,
                    "reset_otp_expiry": None,
                    "reset_otp_attempts": 0,
                    "password_updated_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )

        logger.info(f"Password reset successful: {email}")

        return {
            "message": "Password reset successful"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password failed: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to reset password. Please try again."
        )

# ✅ Change Password (Authenticated)
@router.post("/change-password")
def change_password(
    payload: dict,
    current_user: dict = Depends(get_current_user)  # You'll need to add this dependency
):
    """
    Change password for authenticated user
    """
    try:
        old_password = payload.get("old_password")
        new_password = payload.get("new_password")

        if not old_password or not new_password:
            raise HTTPException(
                status_code=400, 
                detail="Old password and new password are required"
            )

        # Validate new password
        is_valid, msg = validate_password(new_password)
        if not is_valid:
            raise HTTPException(status_code=400, detail=msg)

        # Get user
        user = users_collection.find_one({"_id": ObjectId(current_user["id"])})

        if not user:
            raise HTTPException(
                status_code=404, 
                detail="User not found"
            )

        # Verify old password
        if not verify_password(old_password, user["password"]):
            raise HTTPException(
                status_code=401, 
                detail="Current password is incorrect"
            )

        # Update password
        users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "password": hash_password(new_password),
                    "password_updated_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )

        logger.info(f"Password changed: {user['email']}")

        return {
            "message": "Password changed successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Change password failed: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to change password. Please try again."
        )

# ✅ Registration Requests
@router.post("/registration-requests")
def submit_registration_request(payload: dict):
    """Submit a request to join the platform"""
    name = payload.get("name", "").strip()
    email = payload.get("email", "").strip().lower()
    company_name = payload.get("company_name", "").strip()
    message = payload.get("message", "").strip()

    if not name or not email or not company_name:
        raise HTTPException(status_code=400, detail="Name, email, and company name are required")

    if not validate_email(email):
        raise HTTPException(status_code=400, detail="Invalid email format")

    # Check if request already exists
    existing = registration_requests_collection.find_one({"email": email, "status": "pending"})
    if existing:
        raise HTTPException(status_code=409, detail="A pending request already exists for this email")

    request_data = {
        "name": name,
        "email": email,
        "company_name": company_name,
        "message": message,
        "status": "pending",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    registration_requests_collection.insert_one(request_data)
    return {"message": "Request submitted successfully", "success": True}

@router.get("/registration-requests")
def get_registration_requests(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all registration requests (Super Admin only)"""
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Not allowed")

    query = {}
    if status:
        query["status"] = status

    total = registration_requests_collection.count_documents(query)
    cursor = registration_requests_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)

    requests = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        requests.append(doc)

    return {
        "requests": requests,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.patch("/registration-requests/{request_id}")
def update_registration_request(
    request_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update status of a registration request (Super Admin only)"""
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Not allowed")

    status = payload.get("status")
    if status not in ["approved", "rejected", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    try:
        result = registration_requests_collection.update_one(
            {"_id": ObjectId(request_id)},
            {"$set": {
                "status": status,
                "updated_at": datetime.utcnow(),
                "handled_by": current_user["id"]
            }}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Request not found")
        
        return {"message": f"Request {status} successfully", "success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))