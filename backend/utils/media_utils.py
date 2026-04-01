# utils/media_utils.py
import gridfs
import base64
import io
import re
import httpx
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from fastapi import HTTPException
from bson import ObjectId
from PIL import Image
import json

# Import your database connections
from database import fs, embeds_cache


async def save_file_to_gridfs(file_data: bytes, filename: str, content_type: str, metadata: dict = None) -> str:
    """
    Save file to GridFS and return file ID
    """
    if metadata is None:
        metadata = {}
    
    file_id = fs.put(
        file_data,
        filename=filename,
        content_type=content_type,
        metadata=metadata
    )
    
    return str(file_id)


async def get_file_from_gridfs(file_id: str):
    """
    Retrieve file from GridFS by ID
    """
    try:
        grid_out = fs.get(ObjectId(file_id))
        return grid_out
    except:
        raise HTTPException(404, "File not found")


def get_file_url(file_id: str) -> str:
    """
    Generate URL for file
    """
    return f"/api/files/{file_id}"


async def fetch_embed_data(url: str) -> Dict[str, Any]:
    """
    Fetch embed data from various platforms
    """
    # Check cache first
    cached = embeds_cache.find_one({"url": url, "expires_at": {"$gt": datetime.utcnow()}})
    if cached:
        return cached["data"]
    
    embed_data = {
        "url": url,
        "type": "link",
        "title": "",
        "description": "",
        "thumbnail": None,
        "html": None,
        "provider": None
    }
    
    # YouTube
    youtube_patterns = [
        r"(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)",
        r"(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)"
    ]
    
    for pattern in youtube_patterns:
        match = re.search(pattern, url)
        if match:
            video_id = match.group(1)
            embed_data.update({
                "type": "youtube",
                "provider": "YouTube",
                "html": f'<iframe width="560" height="315" src="https://www.youtube.com/embed/{video_id}" frameborder="0" allowfullscreen></iframe>',
                "thumbnail": f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg",
                "video_id": video_id
            })
            break
    
    # Vimeo
    vimeo_pattern = r"(?:vimeo\.com\/)(\d+)"
    match = re.search(vimeo_pattern, url)
    if match:
        video_id = match.group(1)
        embed_data.update({
            "type": "vimeo",
            "provider": "Vimeo",
            "html": f'<iframe src="https://player.vimeo.com/video/{video_id}" width="560" height="315" frameborder="0" allowfullscreen></iframe>',
            "video_id": video_id
        })
        
        # Try to fetch Vimeo thumbnail
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"https://vimeo.com/api/v2/video/{video_id}.json")
                if response.status_code == 200:
                    data = response.json()
                    if data and len(data) > 0:
                        embed_data["thumbnail"] = data[0].get("thumbnail_large")
        except:
            pass
    
    # General URL preview (Open Graph)
    if embed_data["type"] == "link":
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, follow_redirects=True, timeout=10)
                if response.status_code == 200:
                    html = response.text
                    
                    # Extract title
                    title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
                    if title_match:
                        embed_data["title"] = title_match.group(1)
                    
                    # Extract Open Graph data
                    og_title = re.search(r'<meta property="og:title" content="(.*?)"', html)
                    if og_title:
                        embed_data["title"] = og_title.group(1)
                    
                    og_description = re.search(r'<meta property="og:description" content="(.*?)"', html)
                    if og_description:
                        embed_data["description"] = og_description.group(1)
                    
                    og_image = re.search(r'<meta property="og:image" content="(.*?)"', html)
                    if og_image:
                        embed_data["thumbnail"] = og_image.group(1)
                    
                    og_type = re.search(r'<meta property="og:type" content="(.*?)"', html)
                    if og_type:
                        embed_data["type"] = og_type.group(1)
        except:
            pass
    
    # Cache the result
    embeds_cache.insert_one({
        "url": url,
        "data": embed_data,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(days=7)
    })
    
    return embed_data


def extract_video_id(url: str) -> Optional[str]:
    """
    Extract video ID from various platform URLs
    """
    # YouTube
    youtube_match = re.search(r"(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)", url)
    if youtube_match:
        return youtube_match.group(1)
    
    # Vimeo
    vimeo_match = re.search(r"(?:vimeo\.com\/)(\d+)", url)
    if vimeo_match:
        return vimeo_match.group(1)
    
    return None