# routes/content_routes.py - Fixed version with proper error handling and author profiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Request, BackgroundTasks
from fastapi.responses import Response, JSONResponse
from datetime import datetime, timedelta
from bson import ObjectId
from bson.errors import InvalidId
from typing import Optional, List, Dict, Any, Union
import gridfs
from pymongo import ReturnDocument
import hashlib
import io
from PIL import Image
import logging
from enum import Enum
import random
import string

from database import (
    content_collection, sections_collection, 
    categories_collection, comments_collection,
     db, images_collection, users_collection, companies_collection
)
from routes.dependencies import get_current_user, resolve_company_scope, get_optional_user
from utils.blob_storage import AzureBlobStorage
from routes.subscribe import send_content_notification


azure_storage = AzureBlobStorage()

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

# ==================== CONFIGURATION ====================

class ContentStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    DELETED = "deleted"

class ImageType(str, Enum):
    COVER = "cover"
    CONTENT = "content"
    THUMBNAIL = "thumbnail"
    AVATAR = "avatar"

class BlockType(str, Enum):
    TEXT = "text"
    HEADING = "heading"
    SUBHEADING = "subheading"
    IMAGE = "image"
    VIDEO = "video"
    QUOTE = "quote"
    DIVIDER = "divider"
    EMBED = "embed"
    LIST = "list"
    CODE = "code"
    CTA = "cta"
    BULLET_LIST = "bullet-list"
    NUMBERED_LIST = "numbered-list"
    PULL_QUOTE = "pull-quote"
    CALLOUT = "callout"
    DOCUMENT = "document" 

# Configuration constants
ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif", "svg"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
MAX_IMAGE_DIMENSION = 4096  # Max width/height in pixels
IMAGE_QUALITY = 85  # JPEG quality for conversions
CACHE_MAX_AGE = 31536000  # 1 year for immutable images

# Block validation rules
BLOCK_REQUIREMENTS = {
    BlockType.TEXT: ["value"],
    BlockType.HEADING: ["value"],
    BlockType.SUBHEADING: ["value"],
    BlockType.QUOTE: ["value", "author"],
    BlockType.PULL_QUOTE: ["value"],
    BlockType.IMAGE: ["file_id"],
    BlockType.VIDEO: ["url", "platform"],  # Added platform field
    BlockType.EMBED: ["url", "platform"],  # Added platform field
    BlockType.CODE: ["value", "language"],
    BlockType.LIST: ["items", "type"],
    BlockType.BULLET_LIST: ["items"],
    BlockType.NUMBERED_LIST: ["items"],
    BlockType.CTA: ["label", "url"],
    BlockType.DIVIDER: [],
    BlockType.CALLOUT: ["value", "type"],
    BlockType.DOCUMENT: ["title"]  # Document requirements
}


# ==================== IMAGE STORAGE WITH METADATA COLLECTION ====================

# ==================== IMAGE STORAGE WITH AZURE BLOB STORAGE ====================

class ImageManager:
    """
    Comprehensive image management with Azure Blob Storage
    """
    
    @staticmethod
    async def save_image(
        file: UploadFile, 
        company_id: str, 
        uploaded_by: str = None, 
        image_type: ImageType = ImageType.CONTENT
    ) -> Dict[str, Any]:
        """
        Save image to Azure Blob Storage with rich metadata in separate collection
        """
        if not file or not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Read and validate file
        try:
            contents = await file.read()
        except Exception as e:
            logger.error(f"Failed to read file: {str(e)}")
            raise HTTPException(status_code=400, detail="Failed to read file")
        
        # Process image
        try:
            img = Image.open(io.BytesIO(contents))
            original_format = img.format.lower() if img.format else 'jpeg'
            width, height = img.size
            
            # Validate dimensions
            if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
                raise HTTPException(
                    status_code=400,
                    detail=f"Image dimensions too large. Max: {MAX_IMAGE_DIMENSION}x{MAX_IMAGE_DIMENSION}"
                )
            
            # Convert to RGB if necessary (for PNG with alpha)
            if img.mode in ('RGBA', 'LA', 'P'):
                rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img_bytes = io.BytesIO()
                rgb_img.save(img_bytes, format='JPEG', quality=IMAGE_QUALITY)
                contents = img_bytes.getvalue()
                format_name = 'jpeg'
            else:
                format_name = original_format
                
        except Exception as e:
            logger.error(f"Invalid image file: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")
        
        # Validate format
        if format_name not in ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid image type. Allowed: {ALLOWED_IMAGE_EXTENSIONS}"
            )
        
        # Calculate hash for duplicate detection
        file_hash = hashlib.md5(contents).hexdigest()
        
        # Check for existing image with same hash
        existing_metadata = images_collection.find_one({
            "company_id": company_id,
            "hash": file_hash,
            "is_deleted": {"$ne": True}
        })
        
        if existing_metadata:
            # Return existing image info
            return {
                "id": str(existing_metadata["_id"]),
                "blob_name": existing_metadata.get("blob_name"),
                "url": existing_metadata.get("url"),
                "filename": existing_metadata.get("original_filename", existing_metadata.get("filename", "unknown")),
                "width": existing_metadata.get("width", 0),
                "height": existing_metadata.get("height", 0),
                "size": existing_metadata.get("size", 0),
                "format": existing_metadata.get("format", "jpeg"),
                "exists": True,
                "uploaded_at": existing_metadata.get("created_at", datetime.utcnow()).isoformat() if isinstance(existing_metadata.get("created_at"), datetime) else datetime.utcnow().isoformat()
            }
        
        # Prepare metadata for new image
        image_id = ObjectId()
        blob_name = None
        
        try:
            # Upload to Azure Blob Storage
            upload_result = azure_storage.upload_file(
                file_data=contents,
                content_type=file.content_type or f"image/{format_name}",
                metadata={
                    "image_id": str(image_id),
                    "company_id": company_id,
                    "format": format_name,
                    "original_filename": file.filename
                },
                original_filename=file.filename
            )
            
            blob_name = upload_result["blob_name"]
            
            # Get user info for uploaded_by field
            user_info = None
            if uploaded_by:
                user = users_collection.find_one({"_id": ObjectId(uploaded_by)}, {"name": 1, "email": 1})
                if user:
                    user_info = {
                        "id": uploaded_by,
                        "name": user.get("name", "Unknown"),
                        "email": user.get("email")
                    }
            
            # Create metadata document
            metadata_doc = {
                "_id": image_id,
                "blob_name": blob_name,
                "url": upload_result["url"],
                "company_id": company_id,
                "original_filename": file.filename,
                "filename": f"{image_id}.{format_name}",
                "format": format_name,
                "width": width,
                "height": height,
                "size": len(contents),
                "hash": file_hash,
                "type": image_type,
                "uploaded_by": user_info,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "usage_count": 0,
                "used_in": [],  # List of content IDs
                "is_deleted": False,
                "deleted_at": None,
                "metadata": {
                    "content_type": file.content_type or f"image/{format_name}",
                    "original_format": original_format,
                    "etag": upload_result.get("etag"),
                    "last_modified": upload_result.get("last_modified")
                }
            }
            
            # Insert metadata
            images_collection.insert_one(metadata_doc)
            
            return {
                "id": str(image_id),
                "blob_name": blob_name,
                "url": upload_result["url"],
                "filename": file.filename,
                "width": width,
                "height": height,
                "size": len(contents),
                "format": format_name,
                "exists": False,
                "uploaded_at": metadata_doc["created_at"].isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to save image: {str(e)}")
            # Cleanup if partial save occurred
            if blob_name:
                try:
                    azure_storage.delete_file(blob_name)
                except:
                    pass
            raise HTTPException(status_code=500, detail="Failed to save image")
    
    @staticmethod
    def get_image(image_id: str):
        """
        Retrieve image from Azure Blob Storage by image_id
        Returns file data as bytes
        """
        try:
            # Get metadata
            metadata = images_collection.find_one({
                "$or": [
                    {"_id": ObjectId(image_id)},
                    {"blob_name": image_id}
                ],
                "is_deleted": {"$ne": True}
            })
            
            if not metadata:
                return None
            
            # Download from Azure
            file_data = azure_storage.download_file(metadata["blob_name"])
            
            # Create a file-like object
            return io.BytesIO(file_data)
            
        except Exception as e:
            logger.error(f"Failed to get image: {str(e)}")
            return None
    
    @staticmethod
    def get_image_data(image_id: str) -> Optional[bytes]:
        """
        Get raw image data
        """
        try:
            # Get metadata
            metadata = images_collection.find_one({
                "$or": [
                    {"_id": ObjectId(image_id)},
                    {"blob_name": image_id}
                ],
                "is_deleted": {"$ne": True}
            })
            
            if not metadata:
                return None
            
            # Download from Azure
            return azure_storage.download_file(metadata["blob_name"])
            
        except Exception as e:
            logger.error(f"Failed to get image data: {str(e)}")
            return None
    
    @staticmethod
    def get_image_metadata(image_id: str) -> Optional[Dict[str, Any]]:
        """
        Get image metadata by ID
        """
        try:
            metadata = images_collection.find_one({
                "$or": [
                    {"_id": ObjectId(image_id)},
                    {"blob_name": image_id}
                ],
                "is_deleted": {"$ne": True}
            })
            
            if not metadata:
                return None
            
            # Create a safe copy
            result = {}
            for key, value in metadata.items():
                if key == "_id":
                    result["id"] = str(value)
                elif key == "blob_name":
                    result["blob_name"] = value
                elif key == "uploaded_by" and isinstance(value, dict):
                    result["uploaded_by"] = value
                elif key == "created_at" and isinstance(value, datetime):
                    result["created_at"] = value.isoformat()
                elif key == "updated_at" and isinstance(value, datetime):
                    result["updated_at"] = value.isoformat()
                elif key == "deleted_at" and isinstance(value, datetime):
                    result["deleted_at"] = value.isoformat() if value else None
                else:
                    result[key] = value
            
            # Ensure URL is present
            if "url" not in result and result.get("blob_name"):
                result["url"] = azure_storage.get_public_url(result["blob_name"])
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to get image metadata: {str(e)}")
            return None
    
    @staticmethod
    def track_usage(image_id: str, content_id: str, action: str = "add"):
        """
        Track image usage in content
        """
        try:
            if action == "add":
                images_collection.update_one(
                    {"_id": ObjectId(image_id)},
                    {
                        "$addToSet": {"used_in": content_id},
                        "$inc": {"usage_count": 1},
                        "$set": {"updated_at": datetime.utcnow()}
                    }
                )
            elif action == "remove":
                images_collection.update_one(
                    {"_id": ObjectId(image_id)},
                    {
                        "$pull": {"used_in": content_id},
                        "$inc": {"usage_count": -1},
                        "$set": {"updated_at": datetime.utcnow()}
                    }
                )
        except Exception as e:
            logger.error(f"Failed to track image usage: {str(e)}")
    
    @staticmethod
    def delete_image(image_id: str, company_id: str) -> bool:
        """
        Soft delete image and optionally remove from Azure Blob Storage
        """
        try:
            # Check if image exists and belongs to company
            metadata = images_collection.find_one({
                "$or": [
                    {"_id": ObjectId(image_id)},
                    {"blob_name": image_id}
                ],
                "company_id": company_id,
                "is_deleted": {"$ne": True}
            })
            
            if not metadata:
                return False
            
            actual_id = metadata["_id"]
            blob_name = metadata.get("blob_name")
            
            # Check if used in any non-deleted content
            if metadata.get("usage_count", 0) > 0:
                # Soft delete only
                images_collection.update_one(
                    {"_id": actual_id},
                    {
                        "$set": {
                            "is_deleted": True,
                            "deleted_at": datetime.utcnow(),
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
            else:
                # Hard delete if not used
                try:
                    if blob_name:
                        azure_storage.delete_file(blob_name)
                except:
                    pass
                images_collection.delete_one({"_id": actual_id})
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete image: {str(e)}")
            return False
    
    @staticmethod
    def list_images(
        company_id: Optional[str] = None,
        skip: int = 0, 
        limit: int = 50, 
        image_type: Optional[ImageType] = None,
        include_deleted: bool = False
    ):
        """
        List images with pagination and filtering
        """
        query = {}
        
        # Only filter by company_id if provided
        if company_id:
            query["company_id"] = company_id
        
        if not include_deleted:
            query["is_deleted"] = {"$ne": True}
        
        if image_type:
            query["type"] = image_type
        
        # Get total count
        total = images_collection.count_documents(query)
        
        # Get paginated results
        cursor = images_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        
        images = []
        for doc in cursor:
            # Ensure URL exists
            url = doc.get("url")
            if not url and doc.get("blob_name"):
                url = azure_storage.get_public_url(doc["blob_name"])
            
            # Create a safe copy
            image_item = {
                "id": str(doc["_id"]),
                "blob_name": doc.get("blob_name"),
                "url": url,
                "company_id": doc.get("company_id"),
                "original_filename": doc.get("original_filename", doc.get("filename", "unknown")),
                "filename": doc.get("filename", f"{doc['_id']}.jpg"),
                "format": doc.get("format", "jpeg"),
                "width": doc.get("width", 0),
                "height": doc.get("height", 0),
                "size": doc.get("size", 0),
                "type": doc.get("type", "content"),
                "uploaded_by": doc.get("uploaded_by"),
                "created_at": doc.get("created_at").isoformat() if isinstance(doc.get("created_at"), datetime) else datetime.utcnow().isoformat(),
                "usage_count": doc.get("usage_count", 0),
                "is_deleted": doc.get("is_deleted", False)
            }
            images.append(image_item)
        
        return {
            "items": images,
            "total": total,
            "skip": skip,
            "limit": limit,
            "has_more": (skip + limit) < total
        }
        
        
# ==================== VIEW TRACKING ====================

class ViewTracker:
    """
    Track content views with deduplication and analytics
    """
    
    VIEW_WINDOW = 3600  # 1 hour in seconds
    
    @staticmethod
    def track_view(content_id: str, ip_address: str = None, user_id: str = None, user_agent: str = None):
        """
        Track a content view with deduplication
        """
        try:
            # Create view key for deduplication
            if user_id:
                # Authenticated user - one view per user per content
                view_key = f"user:{user_id}"
            else:
                # Anonymous user - use IP + UserAgent
                view_key = f"ip:{ip_address}:{user_agent}"
            
            # Check for recent view
            recent_view = db.content_views.find_one({
                "content_id": ObjectId(content_id),
                "view_key": view_key,
                "created_at": {"$gt": datetime.utcnow() - timedelta(seconds=ViewTracker.VIEW_WINDOW)}
            })
            
            if recent_view:
                return False  # Not a unique view
            
            # Record the view
            view_record = {
                "content_id": ObjectId(content_id),
                "view_key": view_key,
                "user_id": ObjectId(user_id) if user_id else None,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "created_at": datetime.utcnow()
            }
            
            db.content_views.insert_one(view_record)
            
            # Increment view count in content stats
            content_collection.update_one(
                {"_id": ObjectId(content_id)},
                {
                    "$inc": {"stats.views": 1},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            
            # Update daily stats
            date_str = datetime.utcnow().strftime("%Y-%m-%d")
            db.content_stats_daily.update_one(
                {
                    "content_id": ObjectId(content_id),
                    "date": date_str
                },
                {
                    "$inc": {"views": 1},
                    "$setOnInsert": {
                        "content_id": ObjectId(content_id),
                        "date": date_str,
                        "created_at": datetime.utcnow()
                    }
                },
                upsert=True
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to track view: {str(e)}")
            return False
    
    @staticmethod
    def get_view_stats(content_id: str, days: int = 30) -> Dict[str, Any]:
        """
        Get view statistics for content
        """
        try:
            # Get total views
            content = content_collection.find_one(
                {"_id": ObjectId(content_id)},
                {"stats.views": 1}
            )
            total_views = content.get("stats", {}).get("views", 0) if content else 0
            
            # Get daily breakdown
            start_date = datetime.utcnow() - timedelta(days=days)
            daily_stats = list(db.content_stats_daily.find(
                {
                    "content_id": ObjectId(content_id),
                    "created_at": {"$gte": start_date}
                },
                {"_id": 0, "date": 1, "views": 1}
            ).sort("date", -1))
            
            # Get unique viewers (by user_id)
            unique_viewers = db.content_views.count_documents({
                "content_id": ObjectId(content_id),
                "user_id": {"$ne": None}
            })
            
            return {
                "content_id": content_id,
                "total_views": total_views,
                "unique_viewers": unique_viewers,
                "daily_stats": daily_stats,
                "period_days": days
            }
            
        except Exception as e:
            logger.error(f"Failed to get view stats: {str(e)}")
            return {
                "content_id": content_id,
                "total_views": 0,
                "unique_viewers": 0,
                "daily_stats": [],
                "period_days": days,
                "error": str(e)
            }


# ==================== AUTHOR HELPER FUNCTIONS ====================

def get_author_info(user_id: str) -> Dict[str, Any]:
    """
    Get author information from users collection
    """
    if not user_id:
        return {
            "id": None,
            "name": "Unknown",
            "email": None,
            "avatar_id": None,
            "avatar_url": None
        }
    
    try:
        user = users_collection.find_one(
            {"_id": ObjectId(user_id)},
            {"name": 1, "email": 1, "profile_image": 1, "avatar_id": 1}
        )
        
        if not user:
            return {
                "id": user_id,
                "name": "Unknown",
                "email": None,
                "avatar_id": None,
                "avatar_url": None
            }
        
        avatar_url = None
        if user.get("profile_image"):
            # Handle base64 encoded profile image
            if isinstance(user["profile_image"], dict) and "data" in user["profile_image"]:
                avatar_url = f"data:{user['profile_image'].get('content_type', 'image/jpeg')};base64,{user['profile_image']['data']}"
            elif user.get("avatar_id"):
                avatar_url = f"/api/images/{user['avatar_id']}"
        
        return {
            "id": user_id,
            "name": user.get("name", "Unknown"),
            "email": user.get("email"),
            "avatar_id": user.get("avatar_id"),
            "avatar_url": avatar_url
        }
    except Exception as e:
        logger.error(f"Failed to get author info: {str(e)}")
        return {
            "id": user_id,
            "name": "Unknown",
            "email": None,
            "avatar_id": None,
            "avatar_url": None
        }


def enrich_author_info(content_item: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enrich content item with full author information
    """
    if not content_item:
        return content_item
    
    author = content_item.get("author", {})
    if isinstance(author, dict) and author.get("id"):
        author_info = get_author_info(author["id"])
        # Merge, preserving existing data
        author.update(author_info)
        content_item["author"] = author
    
    return content_item

# ==================== LIKE TRACKING ====================

class LikeManager:
    """
    Track content likes with deduplication
    """
    
    @staticmethod
    def toggle_like(content_id: str, user_id: str = None, ip_address: str = None, user_agent: str = None) -> Dict[str, Any]:
        """
        Toggle like for content
        Returns current like count and whether user liked
        """
        try:
            content_oid = ObjectId(content_id)
            
            # Create like key for deduplication
            if user_id:
                # Authenticated user
                like_key = f"user:{user_id}"
                like_filter = {
                    "content_id": content_oid,
                    "user_id": ObjectId(user_id)
                }
            else:
                # Anonymous user - use IP + UserAgent
                like_key = f"anon:{ip_address}:{user_agent}"
                like_filter = {
                    "content_id": content_oid,
                    "like_key": like_key,
                    "user_id": None
                }
            
            # Check if already liked
            existing_like = db.content_likes.find_one(like_filter)
            
            if existing_like:
                # Unlike
                db.content_likes.delete_one({"_id": existing_like["_id"]})
                
                # Decrement like count
                content_collection.update_one(
                    {"_id": content_oid},
                    {"$inc": {"stats.likes": -1}}
                )
                
                action = "unliked"
                liked = False
            else:
                # Like
                like_record = {
                    "content_id": content_oid,
                    "like_key": like_key,
                    "user_id": ObjectId(user_id) if user_id else None,
                    "ip_address": ip_address,
                    "user_agent": user_agent,
                    "created_at": datetime.utcnow()
                }
                
                db.content_likes.insert_one(like_record)
                
                # Increment like count
                content_collection.update_one(
                    {"_id": content_oid},
                    {"$inc": {"stats.likes": 1}}
                )
                
                action = "liked"
                liked = True
            
            # Get updated like count
            content = content_collection.find_one(
                {"_id": content_oid},
                {"stats.likes": 1}
            )
            
            like_count = content.get("stats", {}).get("likes", 0) if content else 0
            
            return {
                "action": action,
                "liked": liked,
                "like_count": like_count,
                "content_id": content_id
            }
            
        except Exception as e:
            logger.error(f"Failed to toggle like: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to process like")
    
    @staticmethod
    def get_like_stats(content_id: str) -> Dict[str, Any]:
        """
        Get like statistics for content
        """
        try:
            content_oid = ObjectId(content_id)
            
            # Get total likes
            content = content_collection.find_one(
                {"_id": content_oid},
                {"stats.likes": 1}
            )
            
            total_likes = content.get("stats", {}).get("likes", 0) if content else 0
            
            # Get breakdown by user type
            user_likes = db.content_likes.count_documents({
                "content_id": content_oid,
                "user_id": {"$ne": None}
            })
            
            anon_likes = db.content_likes.count_documents({
                "content_id": content_oid,
                "user_id": None
            })
            
            return {
                "content_id": content_id,
                "total_likes": total_likes,
                "user_likes": user_likes,
                "anonymous_likes": anon_likes
            }
            
        except Exception as e:
            logger.error(f"Failed to get like stats: {str(e)}")
            return {
                "content_id": content_id,
                "total_likes": 0,
                "user_likes": 0,
                "anonymous_likes": 0,
                "error": str(e)
            }
    
    @staticmethod
    def check_user_liked(content_id: str, user_id: str = None, ip_address: str = None, user_agent: str = None) -> bool:
        """
        Check if user has liked the content
        """
        try:
            content_oid = ObjectId(content_id)
            
            if user_id:
                # Check authenticated user
                like = db.content_likes.find_one({
                    "content_id": content_oid,
                    "user_id": ObjectId(user_id)
                })
            else:
                # Check anonymous user
                like_key = f"anon:{ip_address}:{user_agent}"
                like = db.content_likes.find_one({
                    "content_id": content_oid,
                    "like_key": like_key,
                    "user_id": None
                })
            
            return like is not None
            
        except Exception as e:
            logger.error(f"Failed to check like status: {str(e)}")
            return False
        
        
# ==================== COMMENT MANAGEMENT ====================

class CommentManager:
    """
    Comprehensive comment management with threading and moderation
    """
    
    @staticmethod
    def add_comment(
        content_id: str,
        user: Dict[str, Any],
        text: str,
        parent_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Add a comment to content with threading support
        """
        try:
            content_oid = ObjectId(content_id)
            
            # Check if content exists and allows comments
            content = content_collection.find_one({
                "_id": content_oid,
                "status": "published"
            })
            
            if not content:
                raise HTTPException(status_code=404, detail="Content not found")
            
            if not content.get("settings", {}).get("allow_comments", True):
                raise HTTPException(status_code=400, detail="Comments are disabled for this content")
            
            # Validate parent comment if provided
            parent_oid = None
            if parent_id:
                try:
                    parent_oid = ObjectId(parent_id)
                    parent = comments_collection.find_one({
                        "_id": parent_oid,
                        "content_id": content_oid
                    })
                    if not parent:
                        raise HTTPException(status_code=400, detail="Parent comment not found")
                except InvalidId:
                    raise HTTPException(status_code=400, detail="Invalid parent comment ID")
            
            # Get author info
            author_info = get_author_info(user.get("id"))
            
            # Create comment
            comment_id = ObjectId()
            comment = {
                "_id": comment_id,
                "content_id": content_oid,
                "company_id": content["company_id"],
                "parent_id": parent_oid,
                "text": text.strip(),
                "author": {
                    "id": user.get("id"),
                    "name": author_info.get("name", "Anonymous"),
                    "email": author_info.get("email"),
                    "avatar_id": author_info.get("avatar_id"),
                    "avatar_url": author_info.get("avatar_url")
                },
                "likes": 0,
                "liked_by": [],
                "replies_count": 0,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "status": "active",
                "is_edited": False
            }
            
            # Insert comment
            comments_collection.insert_one(comment)
            
            # Update parent comment's reply count if needed
            if parent_oid:
                comments_collection.update_one(
                    {"_id": parent_oid},
                    {"$inc": {"replies_count": 1}}
                )
            
            # Update content comment count
            content_collection.update_one(
                {"_id": content_oid},
                {"$inc": {"stats.comments": 1}}
            )
            
            # Format response
            comment["id"] = str(comment_id)
            comment["content_id"] = str(content_oid)
            if comment["parent_id"]:
                comment["parent_id"] = str(comment["parent_id"])
            del comment["_id"]
            
            return comment
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to add comment: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to add comment")
    
    @staticmethod
    def get_comments(
        content_id: str,
        skip: int = 0,
        limit: int = 50,
        sort_by: str = "created_at",
        sort_order: int = -1,
        include_replies: bool = True,
        parent_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get comments with pagination and threading
        """
        try:
            content_oid = ObjectId(content_id)
            
            # Build query
            query = {
                "content_id": content_oid,
                "status": "active"
            }
            
            if parent_id:
                try:
                    query["parent_id"] = ObjectId(parent_id)
                except InvalidId:
                    query["parent_id"] = None
            else:
                query["parent_id"] = None  # Top-level comments only
            
            # Get total count
            total = comments_collection.count_documents(query)
            
            # Get comments
            cursor = comments_collection.find(query).sort(sort_by, sort_order).skip(skip).limit(limit)
            
            comments = []
            for doc in cursor:
                # Enrich author info
                author = doc.get("author", {})
                if author.get("id"):
                    author_info = get_author_info(author["id"])
                    author.update(author_info)
                
                # Format comment
                comment = {
                    "id": str(doc["_id"]),
                    "content_id": str(doc["content_id"]),
                    "parent_id": str(doc["parent_id"]) if doc.get("parent_id") else None,
                    "text": doc["text"],
                    "author": author,
                    "likes": doc["likes"],
                    "replies_count": doc.get("replies_count", 0),
                    "created_at": doc["created_at"].isoformat() if isinstance(doc["created_at"], datetime) else doc["created_at"],
                    "updated_at": doc["updated_at"].isoformat() if isinstance(doc["updated_at"], datetime) else doc["updated_at"],
                    "is_edited": doc.get("is_edited", False)
                }
                
                # Include replies if requested and this is a top-level comment
                if include_replies and not parent_id and comment["replies_count"] > 0:
                    replies = CommentManager.get_comments(
                        content_id=content_id,
                        parent_id=comment["id"],
                        limit=10,
                        include_replies=False
                    )
                    comment["replies"] = replies["items"]
                
                comments.append(comment)
            
            return {
                "items": comments,
                "total": total,
                "skip": skip,
                "limit": limit,
                "has_more": (skip + limit) < total
            }
            
        except Exception as e:
            logger.error(f"Failed to get comments: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to get comments")
    
    @staticmethod
    def like_comment(comment_id: str, user_id: str) -> Dict[str, Any]:
        """
        Like/unlike a comment
        """
        try:
            comment_oid = ObjectId(comment_id)
            user_oid = ObjectId(user_id) if user_id else None
            
            # Check if user already liked
            comment = comments_collection.find_one({
                "_id": comment_oid,
                "liked_by": user_oid
            })
            
            if comment:
                # Unlike
                result = comments_collection.update_one(
                    {"_id": comment_oid},
                    {
                        "$pull": {"liked_by": user_oid},
                        "$inc": {"likes": -1},
                        "$set": {"updated_at": datetime.utcnow()}
                    }
                )
                action = "unliked"
            else:
                # Like
                result = comments_collection.update_one(
                    {"_id": comment_oid},
                    {
                        "$addToSet": {"liked_by": user_oid},
                        "$inc": {"likes": 1},
                        "$set": {"updated_at": datetime.utcnow()}
                    }
                )
                action = "liked"
            
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Comment not found")
            
            # Get updated comment
            updated = comments_collection.find_one({"_id": comment_oid})
            
            return {
                "action": action,
                "comment_id": comment_id,
                "likes": updated["likes"],
                "liked": not comment  # True if now liked
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to like comment: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to like comment")
    
    @staticmethod
    def delete_comment(comment_id: str, user_id: str, user_role: str) -> bool:
        """
        Soft delete a comment and its replies
        """
        try:
            comment_oid = ObjectId(comment_id)
            
            # Find comment
            comment = comments_collection.find_one({"_id": comment_oid})
            if not comment:
                return False
            
            # Check permissions
            if user_role != "super_admin" and str(comment["author"]["id"]) != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
            
            # Soft delete the comment
            comments_collection.update_one(
                {"_id": comment_oid},
                {
                    "$set": {
                        "status": "deleted",
                        "deleted_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Soft delete all replies
            result = comments_collection.update_many(
                {"parent_id": comment_oid},
                {
                    "$set": {
                        "status": "deleted",
                        "deleted_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # Update content comment count
            content_collection.update_one(
                {"_id": comment["content_id"]},
                {"$inc": {"stats.comments": -1 - result.modified_count}}
            )
            
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to delete comment: {str(e)}")
            return False


# ==================== CONTENT BLOCK VALIDATION ====================

def validate_content_blocks(blocks: List[Dict[str, Any]], company_id: str = None, is_draft: bool = False) -> List[str]:
    """
    Validate content blocks and return list of image IDs used
    - is_draft: If True, only validate structure, not required fields
    """
    if not isinstance(blocks, list):
        raise HTTPException(status_code=400, detail="blocks must be an array")
    
    image_ids = []
    
    for idx, block in enumerate(blocks):
        if not isinstance(block, dict):
            raise HTTPException(status_code=400, detail=f"Block {idx} must be an object")
        
        # Generate ID if not present
        if not block.get("id"):
            block["id"] = str(ObjectId())
        
        block_type = block.get("type")
        if not block_type:
            raise HTTPException(status_code=400, detail=f"Block {block['id']} missing type")
        
        try:
            block_type = BlockType(block_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid block type: {block_type}")
        
        data = block.get("data", {})
        if not isinstance(data, dict):
            raise HTTPException(status_code=400, detail=f"Block {block['id']} missing data object")
        
        # For drafts, only validate structure, not required fields
        if is_draft:
            continue
        
        # For publish, check required fields
        required_fields = BLOCK_REQUIREMENTS.get(block_type, [])
        for field in required_fields:
            if field not in data:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Block {block['id']} missing required field: {field}"
                )
        
        # Validate image file_id
        if block_type == BlockType.IMAGE and data.get("file_id"):
            file_id = data["file_id"]
            
            if not ObjectId.is_valid(file_id):
                raise HTTPException(status_code=400, detail=f"Invalid file_id format in block {block['id']}")
            
            if company_id:
                img_metadata = ImageManager.get_image_metadata(file_id)
                if not img_metadata:
                    raise HTTPException(status_code=400, detail=f"Image not found in block {block['id']}")
                
                if img_metadata.get("company_id") != company_id:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Image in block {block['id']} belongs to another company"
                    )
                
                image_ids.append(file_id)
        
        # Validate video/embed URLs with platform detection (only on publish)
        if block_type in [BlockType.VIDEO, BlockType.EMBED] and data.get("url"):
            url = data["url"]
            platform = data.get("platform")
            
            validation_result = validate_media_url(url, platform)
            
            if not validation_result["valid"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid URL in block {block['id']}: {validation_result['error']}"
                )
            
            # Store enriched data
            data["platform"] = validation_result["platform"]
            data["embed_url"] = validation_result.get("embed_url")
            data["thumbnail_url"] = validation_result.get("thumbnail_url")
            data["video_id"] = validation_result.get("video_id")
            data["is_embeddable"] = validation_result.get("is_embeddable", False)
        
        # Validate document (only on publish)
        if block_type == BlockType.DOCUMENT:
            has_file_id = data.get("file_id") and ObjectId.is_valid(data.get("file_id", ""))
            has_url = data.get("url") and data["url"].startswith(("http://", "https://"))
            
            if not (has_file_id or has_url):
                raise HTTPException(
                    status_code=400,
                    detail=f"Document block {block['id']} requires either file_id or url"
                )
            
            if has_url:
                validation_result = validate_pdf_url(data["url"])
                if not validation_result["valid"]:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid PDF URL in block {block['id']}: {validation_result['error']}"
                    )
                data["file_type"] = validation_result["file_type"]
            
            # Add optional fields with defaults
            if "description" not in data:
                data["description"] = ""
            if "size" not in data:
                data["size"] = None
            if "page_count" not in data:
                data["page_count"] = None
    
    return image_ids

def validate_media_url(url: str, platform: str = None) -> Dict[str, Any]:
    """
    Validate and extract info from video/embed URLs
    Returns platform info and embed URL
    """
    if not url:
        return {"valid": False, "error": "URL is required"}
    
    # Normalize URL
    url = url.strip()
    
    # Supported platforms
    platforms = {
        "youtube": {
            "domains": ["youtube.com", "youtu.be", "m.youtube.com"],
            "patterns": [
                r"(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)",
                r"(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)"
            ],
            "embed_template": "https://www.youtube.com/embed/{video_id}",
            "thumbnail_template": "https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
        },
        "vimeo": {
            "domains": ["vimeo.com", "player.vimeo.com"],
            "patterns": [r"(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)"],
            "embed_template": "https://player.vimeo.com/video/{video_id}",
            "thumbnail_template": None  # Vimeo requires API for thumbnails
        },
        "dailymotion": {
            "domains": ["dailymotion.com", "dai.ly"],
            "patterns": [r"(?:dailymotion\.com\/video\/|dai\.ly\/)([a-zA-Z0-9]+)"],
            "embed_template": "https://www.dailymotion.com/embed/video/{video_id}",
            "thumbnail_template": "https://www.dailymotion.com/thumbnail/video/{video_id}"
        },
        "twitter": {
            "domains": ["twitter.com", "x.com"],
            "patterns": [r"(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)"],
            "embed_template": "https://platform.twitter.com/embed/Tweet.html?id={tweet_id}",
            "is_social": True
        },
        "linkedin": {
            "domains": ["linkedin.com"],
            "patterns": [r"linkedin\.com\/feed\/update\/urn:li:activity:(\d+)"],
            "is_social": True
        },
        "tiktok": {
            "domains": ["tiktok.com"],
            "patterns": [r"tiktok\.com\/@[\w.-]+\/video\/(\d+)"],
            "embed_template": "https://www.tiktok.com/embed/v2/{video_id}",
            "is_social": True
        },
        "instagram": {
            "domains": ["instagram.com"],
            "patterns": [r"instagram\.com\/p\/([a-zA-Z0-9_-]+)"],
            "embed_template": "https://www.instagram.com/p/{post_id}/embed",
            "is_social": True
        },
        "facebook": {
            "domains": ["facebook.com", "fb.watch"],
            "patterns": [
                r"facebook\.com\/\w+\/videos\/(\d+)",
                r"fb\.watch\/([a-zA-Z0-9]+)"
            ],
            "is_social": True
        }
    }
    
    # If platform is specified, use that
    if platform and platform in platforms:
        detected_platform = platform
    else:
        # Auto-detect platform
        detected_platform = None
        for plat, config in platforms.items():
            if any(domain in url.lower() for domain in config["domains"]):
                detected_platform = plat
                break
    
    if not detected_platform:
        # Generic URL validation
        if url.startswith(("http://", "https://")):
            return {
                "valid": True,
                "platform": "generic",
                "original_url": url,
                "embed_url": url,
                "is_embeddable": False
            }
        return {"valid": False, "error": "Invalid URL format"}
    
    config = platforms[detected_platform]
    video_id = None
    
    # Extract ID using patterns
    for pattern in config["patterns"]:
        import re
        match = re.search(pattern, url)
        if match:
            video_id = match.group(1)
            break
    
    if not video_id and detected_platform == "generic":
        video_id = url
    
    # Generate embed URL if template exists
    embed_url = None
    if config.get("embed_template") and video_id:
        embed_url = config["embed_template"].format(video_id=video_id, tweet_id=video_id, post_id=video_id)
    
    thumbnail_url = None
    if config.get("thumbnail_template") and video_id:
        thumbnail_url = config["thumbnail_template"].format(video_id=video_id)
    
    return {
        "valid": True,
        "platform": detected_platform,
        "video_id": video_id,
        "original_url": url,
        "embed_url": embed_url or url,
        "thumbnail_url": thumbnail_url,
        "is_social": config.get("is_social", False),
        "is_embeddable": embed_url is not None
    }


def validate_pdf_url(url: str) -> Dict[str, Any]:
    """
    Validate PDF URL
    """
    if not url:
        return {"valid": False, "error": "URL is required"}
    
    url = url.strip().lower()
    
    # Check if it's a PDF URL
    is_pdf = url.endswith('.pdf') or '/pdf/' in url or 'pdf' in url.split('?')[0]
    
    if url.startswith(("http://", "https://")):
        return {
            "valid": True,
            "original_url": url,
            "is_pdf": is_pdf,
            "file_type": "pdf" if is_pdf else "unknown"
        }
    
    return {"valid": False, "error": "Invalid URL format"}



def calculate_read_time(blocks: List[Dict[str, Any]]) -> int:
    """
    Calculate estimated read time in minutes
    """
    words_per_minute = 200
    total_words = 0
    
    for block in blocks:
        block_type = block.get("type")
        data = block.get("data", {})
        
        if block_type in ["text", "heading", "subheading", "quote", "pull-quote", "callout"]:
            total_words += len(data.get("value", "").split())
        elif block_type in ["list", "bullet-list", "numbered-list"]:
            for item in data.get("items", []):
                total_words += len(item.split())
        elif block_type == "code":
            # Code blocks count less
            total_words += len(data.get("value", "").split()) // 2
    
    return max(1, round(total_words / words_per_minute))


# ==================== CONTENT CRUD OPERATIONS ====================

class ContentManager:
    """
    Manage content CRUD operations with proper relationships
    """
    
    @staticmethod
    def create(payload: dict, user: dict) -> Dict[str, Any]:
        """
        Create new content with validation
        """
        company_id = resolve_company_scope(user, payload.get("company_id"))
        user_id = user.get("id")
        
        # Validate required fields
        title = payload.get("title", "").strip()
        if not title:
            raise HTTPException(status_code=400, detail="Title is required")
        
        cover_image_id = payload.get("cover_image_id")
        blocks = payload.get("blocks", [])
        status = payload.get("status", ContentStatus.DRAFT)
        
        # For published content, validate required fields
        if status == ContentStatus.PUBLISHED:
            if not cover_image_id:
                raise HTTPException(status_code=400, detail="Cover image is required for published content")
            
            if not blocks:
                raise HTTPException(status_code=400, detail="Content blocks are required for published content")
            
            # Validate cover image
            cover_image = ImageManager.get_image_metadata(cover_image_id)
            if not cover_image:
                raise HTTPException(status_code=400, detail="Cover image not found")
            
            if cover_image.get("company_id") != company_id:
                raise HTTPException(
                    status_code=400, 
                    detail="Cover image belongs to another company"
                )
        
        # Validate blocks (draft mode for drafts, strict for published)
        is_draft = status != ContentStatus.PUBLISHED
        image_ids = validate_content_blocks(blocks, company_id, is_draft=is_draft)
        
        # Get or create section (only if section_slug provided, otherwise use default)
        section_slug = payload.get("section_slug", "uncategorized")
        section = sections_collection.find_one_and_update(
            {
                "company_id": company_id,
                "$or": [
                    {"slug": section_slug},
                    {"name": "Uncategorized"}
                ]
            },
            {"$setOnInsert": {
                "company_id": company_id,
                "name": "Uncategorized",
                "slug": "uncategorized",
                "description": "Default section",
                "status": "active",
                "order": 999,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }},
            upsert=True,
            return_document=ReturnDocument.AFTER
        )
        
        # Get or create category
        category_slug = payload.get("category_slug", "general")
        category = categories_collection.find_one_and_update(
            {
                "company_id": company_id,
                "section_slug": section["slug"],
                "$or": [
                    {"slug": category_slug},
                    {"name": "General"}
                ]
            },
            {"$setOnInsert": {
                "company_id": company_id,
                "section_slug": section["slug"],
                "name": "General",
                "slug": "general",
                "description": "Default category",
                "status": "active",
                "order": 999,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }},
            upsert=True,
            return_document=ReturnDocument.AFTER
        )
        
        # Get author info
        author_info = get_author_info(user_id)
        
        # Prepare content document
        content_id = ObjectId()
        now = datetime.utcnow()
        
        content_doc = {
            "_id": content_id,
            "company_id": company_id,
            "title": title,
            "subtitle": payload.get("subtitle", "").strip(),
            "slug": payload.get("slug", ContentManager.generate_slug(title)),
            "cover_image_id": cover_image_id,
            "section": {
                "slug": section["slug"],
                "name": section.get("name"),
                "id": str(section["_id"])
            },
            "category": {
                "slug": category["slug"],
                "name": category.get("name"),
                "id": str(category["_id"])
            },
            "blocks": blocks,
            "tags": payload.get("tags", []),
            "seo": {
                "meta_title": payload.get("seo", {}).get("meta_title", title)[:60],
                "meta_description": payload.get("seo", {}).get(
                    "meta_description", 
                    payload.get("subtitle", title)
                )[:160],
                "meta_image": payload.get("seo", {}).get("meta_image", cover_image_id),
                "keywords": payload.get("seo", {}).get("keywords", [])
            },
            "status": status,
            "author": {
                "id": user_id,
                "name": author_info.get("name", "Unknown"),
                "email": author_info.get("email"),
                "avatar_id": author_info.get("avatar_id"),
                "avatar_url": author_info.get("avatar_url")
            },
            "created_at": now,
            "updated_at": now,
            "published_at": now if status == ContentStatus.PUBLISHED else None,
            "stats": {
                "views": 0,
                "unique_views": 0,
                "comments": 0,
                "likes": 0,
                "shares": 0,
                "read_time": calculate_read_time(blocks) if blocks else 1
            },
            "settings": {
                "allow_comments": payload.get("settings", {}).get("allow_comments", True),
                "is_featured": payload.get("settings", {}).get("is_featured", False),
                "is_pinned": payload.get("settings", {}).get("is_pinned", False),
                "password": payload.get("settings", {}).get("password"),
                "expires_at": payload.get("settings", {}).get("expires_at")
            },
            "version": 1,
            "history": [{
                "version": 1,
                "updated_at": now,
                "updated_by": user_id,
                "changes": ["created"]
            }]
        }
        
        # Add cover image info only if cover_image_id exists
        if cover_image_id:
            cover_image = ImageManager.get_image_metadata(cover_image_id)
            if cover_image:
                content_doc["cover_image_info"] = {
                    "id": cover_image_id,
                    "filename": cover_image.get("original_filename", cover_image.get("filename", "unknown")),
                    "width": cover_image.get("width", 0),
                    "height": cover_image.get("height", 0),
                    "size": cover_image.get("size", 0),
                    "format": cover_image.get("format", "jpeg")
                }
                content_doc["images_used"] = [cover_image_id] + image_ids
            else:
                content_doc["images_used"] = image_ids
        else:
            content_doc["images_used"] = image_ids
        
        # Insert content
        content_collection.insert_one(content_doc)
        
        # Track image usage (only for published content)
        if status == ContentStatus.PUBLISHED and content_doc.get("images_used"):
            for img_id in content_doc["images_used"]:
                ImageManager.track_usage(img_id, str(content_id), "add")
        
        # Prepare response
        content_doc["id"] = str(content_id)
        del content_doc["_id"]
        
        return content_doc
    
    @staticmethod
    def update(content_id: str, payload: dict, user: dict) -> Dict[str, Any]:
        """
        Update existing content with validation and history tracking
        """
        try:
            oid = ObjectId(content_id)
        except InvalidId:
            raise HTTPException(status_code=400, detail="Invalid content ID")
        
        # Find existing content
        query = {"_id": oid}
        if user.get("role") != "super_admin":
            query["company_id"] = user.get("company_id")
        
        existing = content_collection.find_one(query)
        if not existing:
            raise HTTPException(status_code=404, detail="Content not found")
        
        company_id = existing["company_id"]
        user_id = user.get("id")
        now = datetime.utcnow()
        
        # Track changes
        changes = []
        update_data = {
            "updated_at": now,
            "version": existing["version"] + 1
        }
        
        # Track image changes
        old_images = set(existing.get("images_used", []))
        new_images = set()
        
        # Update basic fields
        for field in ["title", "subtitle", "tags", "section_slug", "category_slug"]:
            if field in payload and payload[field] != existing.get(field):
                update_data[field] = payload[field]
                changes.append(field)
        
        # Update status
        if "status" in payload and payload["status"] != existing.get("status"):
            new_status = payload["status"]
            update_data["status"] = new_status
            changes.append(f"status:{new_status}")
            
            if new_status == ContentStatus.PUBLISHED and not existing.get("published_at"):
                update_data["published_at"] = now
        
        # Update settings
        if "settings" in payload:
            settings = existing.get("settings", {})
            settings.update(payload["settings"])
            update_data["settings"] = settings
            changes.append("settings")
        
        # Update cover image
        if "cover_image_id" in payload:
            new_cover = payload["cover_image_id"]
            if new_cover != existing.get("cover_image_id"):
                # Validate new cover
                img = ImageManager.get_image_metadata(new_cover)
                if not img:
                    raise HTTPException(status_code=400, detail="Cover image not found")
                
                if img.get("company_id") != company_id:
                    raise HTTPException(
                        status_code=400, 
                        detail="Cover image belongs to another company"
                    )
                
                update_data["cover_image_id"] = new_cover
                update_data["cover_image_info"] = {
                    "id": new_cover,
                    "filename": img.get("original_filename", img.get("filename", "unknown")),
                    "width": img.get("width", 0),
                    "height": img.get("height", 0),
                    "size": img.get("size", 0),
                    "format": img.get("format", "jpeg")
                }
                changes.append("cover_image")
                new_images.add(new_cover)
                old_images.discard(existing["cover_image_id"])
        
        # Update blocks
        if "blocks" in payload:
            new_blocks = payload["blocks"]
            block_image_ids = validate_content_blocks(new_blocks, company_id)
            
            update_data["blocks"] = new_blocks
            update_data["stats.read_time"] = calculate_read_time(new_blocks)
            changes.append("blocks")
            
            new_images.update(block_image_ids)
            # Find old block images
            old_blocks = existing.get("blocks", [])
            for block in old_blocks:
                if block.get("type") == "image" and block.get("data", {}).get("file_id"):
                    old_images.add(block["data"]["file_id"])
        
        # Update SEO
        if "seo" in payload:
            seo = existing.get("seo", {})
            seo.update(payload["seo"])
            update_data["seo"] = seo
            changes.append("seo")
        
        # Update author info if needed
        if "author" in payload:
            author_info = get_author_info(payload["author"].get("id", user_id))
            update_data["author"] = author_info
            changes.append("author")
        
        # Update images_used
        update_data["images_used"] = list(new_images.union(
            set([update_data.get("cover_image_id", existing["cover_image_id"])])
        ))
        
        # Add history entry
        history_entry = {
            "version": update_data["version"],
            "updated_at": now,
            "updated_by": user_id,
            "changes": changes
        }
        
        update_data["history"] = existing.get("history", []) + [history_entry]
        
        # Perform update
        result = content_collection.find_one_and_update(
            {"_id": oid},
            {"$set": update_data},
            return_document=ReturnDocument.AFTER
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="Content not found")
        
        # Update image usage counts
        images_to_add = new_images - old_images
        images_to_remove = old_images - new_images
        
        for img_id in images_to_add:
            ImageManager.track_usage(img_id, content_id, "add")
        
        for img_id in images_to_remove:
            ImageManager.track_usage(img_id, content_id, "remove")
        
        # Format response
        result["id"] = str(result["_id"])
        del result["_id"]
        
        return result
    
    @staticmethod
    def generate_slug(title: str) -> str:
        """
        Generate URL-friendly slug from title
        """
        # Remove special characters and convert to lowercase
        slug = ''.join(c.lower() if c.isalnum() or c.isspace() else '-' 
                      for c in title)
        slug = '-'.join(slug.split())  # Replace spaces with hyphens
        slug = '-'.join(filter(None, slug.split('-')))  # Remove empty segments
        
        # Add random suffix for uniqueness
        suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
        
        return f"{slug}-{suffix}"
    
    @staticmethod
    def get_with_stats(content_id: str, include_stats: bool = True) -> Optional[Dict]:
        """
        Get content with optional view statistics
        """
        try:
            oid = ObjectId(content_id)
        except InvalidId:
            return None
        
        doc = content_collection.find_one({"_id": oid})
        if not doc:
            return None
        
        # Enrich author info
        doc = enrich_author_info(doc)
        
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        
        if include_stats:
            doc["view_stats"] = ViewTracker.get_view_stats(content_id)
        
        return doc



# Add this class for document management
class DocumentManager:
    """
    Manage document uploads and storage with Azure Blob Storage
    """
    
    @staticmethod
    async def save_document(
        file: UploadFile,
        company_id: str,
        uploaded_by: str = None
    ) -> Dict[str, Any]:
        """
        Save document to Azure Blob Storage with metadata
        """
        if not file or not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Check file type
        if file.content_type != 'application/pdf':
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Read file
        try:
            contents = await file.read()
        except Exception as e:
            logger.error(f"Failed to read file: {str(e)}")
            raise HTTPException(status_code=400, detail="Failed to read file")
        
        # Check file size (max 100MB for PDFs)
        max_size = 100 * 1024 * 1024
        if len(contents) > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Max size: {max_size // (1024 * 1024)}MB"
            )
        
        # Calculate hash for duplicate detection
        file_hash = hashlib.md5(contents).hexdigest()
        
        # Check for existing document
        existing = db.documents.find_one({
            "company_id": company_id,
            "hash": file_hash,
            "is_deleted": {"$ne": True}
        })
        
        if existing:
            return {
                "id": str(existing["_id"]),
                "blob_name": existing["blob_name"],
                "url": existing["url"],
                "filename": existing["original_filename"],
                "size": existing["size"],
                "exists": True
            }
        
        # Create document ID
        doc_id = ObjectId()
        
        try:
            # Upload to Azure Blob Storage
            upload_result = azure_storage.upload_file(
                file_data=contents,
                content_type=file.content_type,
                metadata={
                    "document_id": str(doc_id),
                    "company_id": company_id,
                    "type": "document",
                    "original_filename": file.filename
                },
                original_filename=file.filename
            )
            
            # Create metadata document
            metadata_doc = {
                "_id": doc_id,
                "blob_name": upload_result["blob_name"],
                "url": upload_result["url"],
                "company_id": company_id,
                "original_filename": file.filename,
                "filename": f"{doc_id}.pdf",
                "size": len(contents),
                "hash": file_hash,
                "uploaded_by": uploaded_by,
                "created_at": datetime.utcnow(),
                "usage_count": 0,
                "used_in": [],
                "is_deleted": False,
                "metadata": {
                    "etag": upload_result.get("etag"),
                    "last_modified": upload_result.get("last_modified")
                }
            }
            
            db.documents.insert_one(metadata_doc)
            
            return {
                "id": str(doc_id),
                "blob_name": upload_result["blob_name"],
                "url": upload_result["url"],
                "filename": file.filename,
                "size": len(contents),
                "exists": False
            }
            
        except Exception as e:
            logger.error(f"Failed to save document: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to save document")
        
        
# Add document upload endpoint
@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    company_id: Optional[str] = Query(None, description="Company ID for super admin"),
    user: dict = Depends(get_current_user)
):
    """
    Upload a PDF document
    """
    role = user.get("role")
    
    # Determine which company_id to use
    target_company_id = None
    
    if role == "super_admin":
        if not company_id:
            raise HTTPException(status_code=400, detail="company_id is required for super admin")
        target_company_id = company_id
    elif role in ["company_admin", "editor"]:
        target_company_id = user.get("company_id")
        if not target_company_id:
            raise HTTPException(status_code=403, detail="User has no company assigned")
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        result = await DocumentManager.save_document(file, target_company_id, user.get("id"))
        return {
            "file_id": result["id"],
            "url": result["url"],
            "filename": result.get("filename"),
            "size": result.get("size"),
            "exists": result.get("exists", False)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Document upload failed")

# Add document retrieval endpoint
@router.get("/documents/{document_id}")
async def get_document(document_id: str):
    """
    Retrieve a document from Azure Blob Storage
    """
    try:
        # Find document metadata
        doc_metadata = db.documents.find_one({
            "$or": [
                {"_id": ObjectId(document_id)},
                {"blob_name": document_id}
            ],
            "is_deleted": {"$ne": True}
        })
        
        if not doc_metadata:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Download from Azure
        file_data = azure_storage.download_file(doc_metadata["blob_name"])
        
        # Create response
        return Response(
            content=file_data,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'inline; filename="{doc_metadata["original_filename"]}"',
                "Content-Length": str(len(file_data))
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get document: {str(e)}")
        raise HTTPException(status_code=404, detail="Document not found")
    
    
# ==================== API ENDPOINTS ====================

# Image endpoints
@router.post("/images/upload")
async def upload_image(
    file: UploadFile = File(...),
    image_type: ImageType = Query(ImageType.CONTENT),
    company_id: Optional[str] = Query(None, description="Company ID for super admin"),
    user: dict = Depends(get_current_user)
):
    """
    Upload an image to the system
    """
    role = user.get("role")
    
    # Determine which company_id to use
    target_company_id = None
    
    if role == "super_admin":
        # Super admin must provide company_id
        if not company_id:
            raise HTTPException(status_code=400, detail="company_id is required for super admin")
        target_company_id = company_id
    elif role in ["company_admin", "editor"]:
        # Company admins and editors use their company
        target_company_id = user.get("company_id")
        if not target_company_id:
            raise HTTPException(status_code=403, detail="User has no company assigned")
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    user_id = user.get("id")
    
    try:
        result = await ImageManager.save_image(file, target_company_id, user_id, image_type)

        return {
            "file_id": result["id"],
            "url": result["url"],
            "filename": result.get("filename"),
            "width": result.get("width"),
            "height": result.get("height"),
            "size": result.get("size"),
            "format": result.get("format")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Image upload failed")


@router.get("/images/{image_id}")
async def get_image(image_id: str, request: Request):
    """
    Serve an image with proper caching headers
    """
    # Get image data
    image_data = ImageManager.get_image_data(image_id)
    
    if not image_data:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Get metadata for headers
    metadata = ImageManager.get_image_metadata(image_id)
    
    # Create ETag
    etag = hashlib.md5(image_data).hexdigest()
    
    # Check If-None-Match header
    if_none_match = request.headers.get("if-none-match")
    if if_none_match and if_none_match.strip('"') == etag:
        return Response(status_code=304)
    
    # Get content type
    content_type = f"image/{metadata.get('format', 'jpeg')}"
    
    # Create response
    response = Response(
        content=image_data,
        media_type=content_type,
        headers={
            "Cache-Control": f"public, max-age={CACHE_MAX_AGE}, immutable",
            "ETag": f'"{etag}"',
            "Accept-Ranges": "bytes",
            "Content-Disposition": f'inline; filename="{metadata.get("original_filename", "image")}"'
        }
    )
    
    return response


@router.get("/images/{image_id}/info")
async def get_image_info(
    image_id: str, 
    user: dict = Depends(get_current_user)
):
    """
    Get image metadata
    """
    metadata = ImageManager.get_image_metadata(image_id)
    
    if not metadata:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Check permissions
    if user["role"] != "super_admin" and metadata.get("company_id") != user.get("company_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return metadata


@router.get("/images")
async def list_images(
    user: dict = Depends(get_current_user),
    company_id: Optional[str] = Query(None, description="Company ID for super admin"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    image_type: Optional[ImageType] = None,
    include_deleted: bool = False
):
    """
    List images with pagination
    - Super Admin: Can specify company_id, otherwise returns all images
    - Company Admin/Editor: Automatically filtered to their company
    """
    role = user.get("role")
    
    # Determine which company_id to use
    target_company_id = None
    
    if role == "super_admin":
        # Super admin can specify company_id or see all
        if company_id:
            target_company_id = company_id
        # If no company_id, return all images (super admin view)
    elif role in ["company_admin", "editor"]:
        # Company admins and editors are bound to their company
        target_company_id = user.get("company_id")
        if not target_company_id:
            raise HTTPException(status_code=403, detail="User has no company assigned")
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # If target_company_id is None (super admin viewing all), we need to modify the list_images method
    # to handle company_id=None
    return ImageManager.list_images(
        company_id=target_company_id,
        skip=skip,
        limit=limit,
        image_type=image_type,
        include_deleted=include_deleted
    )


@router.delete("/images/{image_id}")
async def delete_image(
    image_id: str, 
    user: dict = Depends(get_current_user),
    force: bool = Query(False, description="Force delete even if used")
):
    """
    Delete an image
    """
    company_id = user.get("company_id")
    
    # Check if image exists and get metadata
    metadata = ImageManager.get_image_metadata(image_id)
    if not metadata:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Check permissions
    if user["role"] != "super_admin" and metadata.get("company_id") != company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if used in content
    if metadata.get("usage_count", 0) > 0 and not force:
        # Get content titles where used
        used_in = []
        for content_id in metadata.get("used_in", [])[:5]:  # Limit to 5
            content = content_collection.find_one(
                {"_id": ObjectId(content_id)},
                {"title": 1}
            )
            if content:
                used_in.append({
                    "id": content_id,
                    "title": content.get("title", "Unknown")
                })
        
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Image is used in content",
                "usage_count": metadata["usage_count"],
                "used_in": used_in
            }
        )
    
    success = ImageManager.delete_image(image_id, company_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Image not found or access denied")
    
    return {"message": "Image deleted successfully"}


# Content endpoints
@router.post("/content", response_model=Dict[str, Any])
async def create_content(
    payload: dict,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """
    Create new content
    """
    try:
        # Use manager to handle validation and insertion
        content = ContentManager.create(payload, user)

        # 🚀 TRIGGER EMAIL if published
        if content.get("status") == ContentStatus.PUBLISHED:
            # Ensure _id is available for notification function (Manager returned 'id')
            if "id" in content and "_id" not in content:
                content["_id"] = content["id"]
                
            send_content_notification(content, background_tasks)

        return content
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Content creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/content")
def list_content(
    user: dict = Depends(get_current_user),
    company_id: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[ContentStatus] = None,
    section: Optional[str] = None,
    category: Optional[str] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("created_at", pattern="^(created_at|published_at|title|views)$"),
    sort_order: int = Query(-1, ge=-1, le=1)
):
    """
    List content with filters and pagination
    """
    # Build query
    query = {}
    
    role = user.get("role")

    # 🔹 SUPER ADMIN
        # 🔹 SUPER ADMIN
    if role == "super_admin":
        # Apply filter only if explicitly provided
        if company_id is not None:
            if company_id.strip() != "":
                query["company_id"] = company_id.strip()

    # 🔹 COMPANY ADMIN
    elif role == "company_admin":
        query["company_id"] = user.get("company_id")

    # 🔹 EDITOR
    elif role == "editor":
        query["company_id"] = user.get("company_id")
        # optional: restrict to own posts
        # query["author_id"] = user.get("id")

    else:
        raise HTTPException(403, "Not allowed")
    
    if status:
        query["status"] = status
    else:
        query["status"] = {"$ne": ContentStatus.DELETED}
    
    if section:
        query["section.slug"] = section
    
    if category:
        query["category.slug"] = category
    
    if tag:
        query["tags"] = tag
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"subtitle": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}}
        ]
    
    # Get total count
    total = content_collection.count_documents(query)
    
    # Get paginated results
    cursor = content_collection.find(
        query,
        {
            "title": 1,
            "subtitle": 1,
            "slug": 1,
            "cover_image_id": 1,
            "cover_image_info": 1,
            "section": 1,
            "category": 1,
            "status": 1,
            "author": 1,
            "created_at": 1,
            "published_at": 1,
            "stats": 1,
            "tags": 1
        }
    ).sort(sort_by, sort_order).skip(skip).limit(limit)

    docs = list(cursor)

    items = []
    for doc in docs:
        doc = enrich_author_info(doc)
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        items.append(doc)
    
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit,
        "has_more": (skip + limit) < total
    }


@router.get("/content/{content_id}")
def get_content(
    content_id: str,
    include_stats: bool = Query(False),
    user: dict = Depends(get_current_user)
):
    """
    Get single content by ID
    """
    content = ContentManager.get_with_stats(content_id, include_stats)
    
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # Check permissions
    if user["role"] != "super_admin" and content.get("company_id") != user.get("company_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {"item": content}


@router.put("/content/{content_id}")
def update_content(
    content_id: str,
    payload: dict,
    user: dict = Depends(get_current_user)
):
    """
    Update existing content
    """
    try:
        content = ContentManager.update(content_id, payload, user)
        return {"item": content, "message": "Content updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Content update failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Content update failed")



@router.patch("/content/{content_id}/publish")
def publish_content(
    content_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    scheduled_at: Optional[datetime] = None
):
    """
    Publish content immediately or schedule for later
    """

    try:
        oid = ObjectId(content_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid content ID")

    query = {"_id": oid}

    if user["role"] != "super_admin":
        query["company_id"] = user.get("company_id")

    doc = content_collection.find_one(query)

    if not doc:
        raise HTTPException(status_code=404, detail="Content not found")

    if doc["status"] == ContentStatus.PUBLISHED:
        raise HTTPException(status_code=400, detail="Content already published")

    # validate required fields
    if not doc.get("cover_image_id") or not doc.get("blocks") or not doc.get("title"):
        raise HTTPException(status_code=400, detail="Missing required fields for publishing")

    now = datetime.utcnow()
    publish_time = scheduled_at or now

    update_data = {
        "status": ContentStatus.PUBLISHED,
        "published_at": publish_time,
        "updated_at": now
    }

    if scheduled_at and scheduled_at > now:
        update_data["status"] = ContentStatus.DRAFT
        update_data["scheduled_publish"] = scheduled_at

    result = content_collection.find_one_and_update(
        {"_id": oid},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER
    )

    # 🚀 TRIGGER EMAIL
    # Ensure _id is present (though it should be in 'result')
    send_content_notification(result, background_tasks)

    return {
        "message": "Content published" if not scheduled_at else "Content scheduled",
        "published_at": result["published_at"].isoformat() if result.get("published_at") else None,
        "scheduled_at": scheduled_at.isoformat() if scheduled_at else None
    }


@router.patch("/content/{content_id}/unpublish")
def unpublish_content(
    content_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Unpublish content (move to draft)
    """
    try:
        oid = ObjectId(content_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid content ID")
    
    query = {"_id": oid}
    if user["role"] != "super_admin":
        query["company_id"] = user.get("company_id")
    
    result = content_collection.find_one_and_update(
        query,
        {
            "$set": {
                "status": ContentStatus.DRAFT,
                "updated_at": datetime.utcnow()
            }
        },
        return_document=ReturnDocument.AFTER
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Content not found")
    
    return {"message": "Content unpublished"}


@router.delete("/content/{content_id}")
def delete_content(
    content_id: str,
    user: dict = Depends(get_current_user),
    permanent: bool = Query(False)
):
    """
    Soft delete or permanently delete content
    """
    try:
        oid = ObjectId(content_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid content ID")
    
    query = {"_id": oid}
    if user["role"] != "super_admin":
        query["company_id"] = user.get("company_id")
    
    content = content_collection.find_one(query)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    if permanent:
        # Check if user has permission for permanent delete
        if user["role"] not in ["super_admin", "admin"]:
            raise HTTPException(status_code=403, detail="Not authorized for permanent deletion")
        
        # Remove image usage tracking
        for img_id in content.get("images_used", []):
            ImageManager.track_usage(img_id, content_id, "remove")
        
        # Delete comments
        comments_collection.delete_many({"content_id": oid})
        
        # Delete view stats
        db.content_views.delete_many({"content_id": oid})
        db.content_stats_daily.delete_many({"content_id": oid})
        
        # Delete the content
        content_collection.delete_one({"_id": oid})
        
        return {"message": "Content permanently deleted"}
    else:
        # Soft delete
        content_collection.update_one(
            {"_id": oid},
            {
                "$set": {
                    "status": ContentStatus.DELETED,
                    "deleted_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {"message": "Content moved to trash"}


# Public endpoints (no authentication required)

@router.get("/public/companies")
async def get_public_companies():
    """
    Public endpoint to list all active companies
    No authentication required
    """
    try:
        # Get all active companies with only public fields
        companies = list(companies_collection.find(
            {"status": "active"},  # Only active companies
            {
                "_id": 0,  # Exclude MongoDB _id
                "company_id": 1,
                "name": 1,
                "description": 1,
                "industry": 1,
                "website": 1,
                "logo": 1,
                "logo_id": 1,
                "created_at": 1,
                "address": 1,
                "phone": 1,
                "email": 1,
                "social_media": 1
            }
        ).sort("name", 1))  # Sort by name

        # Get content counts for each company
        for company in companies:
            # Count published content for this company
            content_count = content_collection.count_documents({
                "company_id": company["company_id"],
                "status": "published"
            })
            company["content_count"] = content_count

        return {
            "companies": companies,
            "total": len(companies)
        }

    except Exception as e:
        logger.error(f"Failed to fetch public companies: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch companies")


@router.get("/public/company/{company_id}")
async def get_public_company_info(company_id: str):
    """
    Get public company information
    """
    from database import companies_collection
    
    try:
        company = companies_collection.find_one(
            {"company_id": company_id, "status": "active"},
            {
                "name": 1,
                "description": 1,
                "logo": 1,
                "website": 1,
                "created_at": 1
            }
        )
        
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        # Format response
        company["id"] = str(company["_id"])
        del company["_id"]
        
        return company
        
    except Exception as e:
        logger.error(f"Failed to get company info: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get company info")


@router.get("/public/{company_id}/sections")
async def get_public_sections(company_id: str):
    """
    Get public sections for a company
    """
    sections = list(sections_collection.find(
        {"company_id": company_id, "status": "active"},
        {"name": 1, "slug": 1, "description": 1, "order": 1}
    ).sort("order", 1))
    
    for section in sections:
        section["id"] = str(section["_id"])
        del section["_id"]
    
    return {"sections": sections}


@router.get("/public/{company_id}/categories")
async def get_public_categories(company_id: str, section_slug: Optional[str] = None):
    """
    Get public categories for a company, optionally filtered by section
    """
    query = {"company_id": company_id, "status": "active"}
    
    if section_slug:
        query["section_slug"] = section_slug
    
    categories = list(categories_collection.find(
        query,
        {"name": 1, "slug": 1, "description": 1, "section_slug": 1, "order": 1}
    ).sort("order", 1))
    
    for cat in categories:
        cat["id"] = str(cat["_id"])
        del cat["_id"]
    
    return {"categories": categories}


@router.get("/public/{company_id}/content")
def public_content_list(
    company_id: str,
    section_slug: Optional[str] = None,
    category_slug: Optional[str] = None,
    tag: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    search: Optional[str] = None,
    request: Request = None,
    user: dict = Depends(get_optional_user)
):
    """
    Public content listing endpoint with like counts
    """
    query = {
        "company_id": company_id,
        "status": ContentStatus.PUBLISHED
    }
    
    if section_slug:
        query["section.slug"] = section_slug
    
    if category_slug:
        query["category.slug"] = category_slug
    
    if tag:
        query["tags"] = tag
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"subtitle": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}}
        ]
    
    total = content_collection.count_documents(query)
    
    cursor = content_collection.find(
        query,
        {
            "title": 1,
            "subtitle": 1,
            "slug": 1,
            "cover_image_id": 1,
            "cover_image_info": 1,
            "author.name": 1,
            "author.avatar_id": 1,
            "created_at": 1,
            "published_at": 1,
            "section.name": 1,
            "category.name": 1,
            "stats.read_time": 1,
            "stats.views": 1,
            "stats.likes": 1,
            "tags": 1
        }
    ).sort("published_at", -1).skip(skip).limit(limit)
    
    items = []
    for doc in cursor:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        doc["like_count"] = doc.get("stats", {}).get("likes", 0)
        items.append(doc)
    
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit,
        "has_more": (skip + limit) < total
    }


@router.get("/public/content/{content_id}")
async def public_get_content(
    content_id: str,
    request: Request,
    user: dict = Depends(get_optional_user)
):
    """
    Public endpoint to get published content with like status
    """
    try:
        oid = ObjectId(content_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid content ID")
    
    # Get content with view tracking
    doc = content_collection.find_one_and_update(
        {"_id": oid, "status": ContentStatus.PUBLISHED},
        {"$inc": {"stats.views": 1}},
        return_document=ReturnDocument.AFTER
    )
    
    if not doc:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # Track view for analytics
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    ViewTracker.track_view(
        content_id=content_id,
        ip_address=client_ip,
        user_id=user.get("id") if user else None,
        user_agent=user_agent
    )
    
    # Check if current user liked this content
    liked = False
    if user:
        liked = LikeManager.check_user_liked(
            content_id=content_id,
            user_id=user.get("id"),
            ip_address=client_ip,
            user_agent=user_agent
        )
    else:
        liked = LikeManager.check_user_liked(
            content_id=content_id,
            ip_address=client_ip,
            user_agent=user_agent
        )
    
    # Format response
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    
    # Remove sensitive data
    if "history" in doc:
        del doc["history"]
    
    # Add like info
    doc["liked_by_user"] = liked
    doc["like_count"] = doc.get("stats", {}).get("likes", 0)
    
    return {"item": doc}

# ==================== PUBLIC ENDPOINTS ====================

@router.get("/public/{company_id}/sections")
def public_sections(company_id: str):
    """Public sections"""
    sections = list(sections_collection.find(
        {"company_id": company_id, "status": "active"},
        {"name": 1, "slug": 1, "description": 1}
    ).sort("order", 1))
    
    for s in sections:
        s["id"] = str(s["_id"])
        s.pop("_id")
    
    return {"sections": sections}


@router.get("/public/{company_id}/categories")
def public_categories(company_id: str, section_slug: str):
    """Public categories"""
    cats = list(categories_collection.find(
        {"company_id": company_id, "section_slug": section_slug, "status": "active"},
        {"name": 1, "slug": 1, "description": 1}
    ).sort("order", 1))
    
    for c in cats:
        c["id"] = str(c["_id"])
        c.pop("_id")
    
    return {"categories": cats}


@router.get("/public/{company_id}/content")
def public_content(
    company_id: str,
    section_slug: Optional[str] = None,
    category_slug: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None
):
    """Public content listing"""
    query = {"company_id": company_id, "status": "published"}
    
    if section_slug:
        query["section_slug"] = section_slug
    if category_slug:
        query["category_slug"] = category_slug
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"subtitle": {"$regex": search, "$options": "i"}},
            {"tags": search}
        ]
    
    total = content_collection.count_documents(query)
    cursor = content_collection.find(
        query,
        {
            "title": 1, "subtitle": 1, "cover_image_id": 1, "author": 1,
            "created_at": 1, "published_at": 1, "section_name": 1,
            "category_name": 1, "stats": 1, "tags": 1
        }
    ).sort("published_at", -1).skip(skip).limit(limit)
    
    items = []
    for doc in cursor:
        doc["id"] = str(doc["_id"])
        doc.pop("_id")
        items.append(doc)
    
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/public/content/{content_id}")
def public_single_content(content_id: str):
    """Public single content"""
    try:
        oid = ObjectId(content_id)
    except InvalidId:
        raise HTTPException(400, "Invalid ID")
    
    doc = content_collection.find_one_and_update(
        {"_id": oid, "status": "published"},
        {"$inc": {"stats.views": 1}},
        return_document=True
    )
    
    if not doc:
        raise HTTPException(404, "Content not found")
    
    doc["id"] = str(doc["_id"])
    doc.pop("_id")
    
    return {"item": doc}


# ==================== PUBLIC LIKE ENDPOINTS ====================

@router.post("/public/content/{content_id}/like")
async def public_toggle_like(
    content_id: str,
    request: Request,
    user: dict = Depends(get_optional_user)  # You'll need to create this dependency
):
    """
    Public endpoint to like/unlike content
    Works for both authenticated and anonymous users
    """
    try:
        # Check if content exists and is published
        content = content_collection.find_one({
            "_id": ObjectId(content_id),
            "status": ContentStatus.PUBLISHED
        })
        
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")
        
        # Get client info
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        # Toggle like
        result = LikeManager.toggle_like(
            content_id=content_id,
            user_id=user.get("id") if user else None,
            ip_address=client_ip,
            user_agent=user_agent
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to toggle like: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process like")


@router.get("/public/content/{content_id}/like-status")
async def public_get_like_status(
    content_id: str,
    request: Request,
    user: dict = Depends(get_optional_user)
):
    """
    Check if current user has liked the content
    """
    try:
        # Check if content exists
        content = content_collection.find_one({
            "_id": ObjectId(content_id),
            "status": ContentStatus.PUBLISHED
        })
        
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")
        
        # Get client info
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        # Check like status
        liked = LikeManager.check_user_liked(
            content_id=content_id,
            user_id=user.get("id") if user else None,
            ip_address=client_ip,
            user_agent=user_agent
        )
        
        # Get total likes
        like_stats = LikeManager.get_like_stats(content_id)
        
        return {
            "content_id": content_id,
            "liked": liked,
            "total_likes": like_stats["total_likes"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get like status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get like status")


# ==================== AUTHENTICATED LIKE ENDPOINTS ====================

@router.post("/content/{content_id}/like")
async def toggle_like(
    content_id: str,
    request: Request,
    user: dict = Depends(get_current_user)
):
    """
    Authenticated endpoint to like/unlike content
    """
    try:
        # Check if content exists and user has access
        content = content_collection.find_one({
            "_id": ObjectId(content_id),
            "company_id": user.get("company_id") if user["role"] != "super_admin" else {"$exists": True},
            "status": {"$in": [ContentStatus.PUBLISHED, ContentStatus.DRAFT]}
        })
        
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")
        
        # Get client info
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        # Toggle like
        result = LikeManager.toggle_like(
            content_id=content_id,
            user_id=user.get("id"),
            ip_address=client_ip,
            user_agent=user_agent
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to toggle like: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process like")


@router.get("/content/{content_id}/like-status")
async def get_like_status(
    content_id: str,
    request: Request,
    user: dict = Depends(get_current_user)
):
    """
    Check if current authenticated user has liked the content
    """
    try:
        # Check if content exists
        content = content_collection.find_one({
            "_id": ObjectId(content_id),
            "company_id": user.get("company_id") if user["role"] != "super_admin" else {"$exists": True}
        })
        
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")
        
        # Get client info
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        # Check like status
        liked = LikeManager.check_user_liked(
            content_id=content_id,
            user_id=user.get("id"),
            ip_address=client_ip,
            user_agent=user_agent
        )
        
        # Get total likes
        like_stats = LikeManager.get_like_stats(content_id)
        
        return {
            "content_id": content_id,
            "liked": liked,
            "total_likes": like_stats["total_likes"],
            "breakdown": {
                "user_likes": like_stats["user_likes"],
                "anonymous_likes": like_stats["anonymous_likes"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get like status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get like status")


@router.get("/analytics/content/{content_id}/likes")
async def get_content_like_stats(
    content_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Get detailed like statistics for content (Admin only)
    """
    # Check permissions
    content = content_collection.find_one({"_id": ObjectId(content_id)})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    if user["role"] != "super_admin" and content.get("company_id") != user.get("company_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get like stats
    like_stats = LikeManager.get_like_stats(content_id)
    
    # Get recent likes (last 10)
    recent_likes = list(db.content_likes.find(
        {"content_id": ObjectId(content_id)},
        {"user_id": 1, "ip_address": 1, "created_at": 1}
    ).sort("created_at", -1).limit(10))
    
    # Format recent likes
    formatted_likes = []
    for like in recent_likes:
        like_info = {
            "created_at": like["created_at"].isoformat(),
            "type": "authenticated" if like.get("user_id") else "anonymous"
        }
        
        if like.get("user_id"):
            user_info = users_collection.find_one(
                {"_id": like["user_id"]},
                {"name": 1, "email": 1}
            )
            if user_info:
                like_info["user"] = {
                    "id": str(user_info["_id"]),
                    "name": user_info.get("name"),
                    "email": user_info.get("email")
                }
        
        formatted_likes.append(like_info)
    
    return {
        **like_stats,
        "recent_likes": formatted_likes
    }

# Comment endpoints
@router.post("/content/{content_id}/comments")
def add_comment(
    content_id: str,
    payload: dict,
    user: dict = Depends(get_current_user)
):
    """
    Add a comment to content
    """
    text = payload.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Comment text is required")
    
    parent_id = payload.get("parent_id")
    
    comment = CommentManager.add_comment(content_id, user, text, parent_id)
    
    return {"comment": comment, "message": "Comment added successfully"}


@router.get("/content/{content_id}/comments")
def get_comments(
    content_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    sort_by: str = Query("created_at", pattern="^(created_at|likes)$"),
    sort_order: int = Query(-1, ge=-1, le=1)
):
    """
    Get comments for content
    """
    result = CommentManager.get_comments(
        content_id=content_id,
        skip=skip,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    return result


@router.post("/comments/{comment_id}/like")
def like_comment(
    comment_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Like or unlike a comment
    """
    result = CommentManager.like_comment(comment_id, user.get("id"))
    return result


@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Delete a comment
    """
    success = CommentManager.delete_comment(
        comment_id=comment_id,
        user_id=user.get("id"),
        user_role=user.get("role")
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    return {"message": "Comment deleted successfully"}


# Analytics endpoints
@router.get("/analytics/content/{content_id}/views")
def get_content_view_stats(
    content_id: str,
    days: int = Query(30, ge=1, le=365),
    user: dict = Depends(get_current_user)
):
    """
    Get view statistics for content
    """
    # Check permissions
    content = content_collection.find_one({"_id": ObjectId(content_id)})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    if user["role"] != "super_admin" and content.get("company_id") != user.get("company_id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    stats = ViewTracker.get_view_stats(content_id, days)
    return stats


@router.get("/analytics/dashboard")
def get_dashboard_stats(
    user: dict = Depends(get_current_user),
    days: int = Query(30, ge=1, le=365)
):
    """
    Get dashboard statistics
    """
    company_id = user.get("company_id") if user["role"] != "super_admin" else None
    
    # Build query
    match_stage = {}
    if company_id:
        match_stage["company_id"] = company_id
    
    # Get content stats
    pipeline = [
        {"$match": match_stage},
        {"$group": {
            "_id": None,
            "total_content": {"$sum": 1},
            "published_content": {
                "$sum": {"$cond": [{"$eq": ["$status", "published"]}, 1, 0]}
            },
            "draft_content": {
                "$sum": {"$cond": [{"$eq": ["$status", "draft"]}, 1, 0]}
            },
            "total_views": {"$sum": "$stats.views"},
            "total_comments": {"$sum": "$stats.comments"}
        }}
    ]
    
    result = list(content_collection.aggregate(pipeline))
    content_stats = result[0] if result else {
        "total_content": 0,
        "published_content": 0,
        "draft_content": 0,
        "total_views": 0,
        "total_comments": 0
    }
    
    # Get recent activity
    recent_content = list(content_collection.find(
        match_stage,
        {"title": 1, "status": 1, "created_at": 1, "stats.views": 1}
    ).sort("created_at", -1).limit(10))
    
    for item in recent_content:
        item["id"] = str(item["_id"])
        del item["_id"]
    
    return {
        "summary": content_stats,
        "recent_content": recent_content,
        "period_days": days
    }


