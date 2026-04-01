# from fastapi import APIRouter, UploadFile, File, HTTPException
# from fastapi.responses import JSONResponse
# from pathlib import Path
# from datetime import datetime
# import shutil
# import uuid

# router = APIRouter()

# UPLOAD_DIR = Path("uploads")
# UPLOAD_DIR.mkdir(exist_ok=True)

# ALLOWED_TYPES = {
#     "image": [".png", ".jpg", ".jpeg", ".webp", ".gif"],
#     "video": [".mp4", ".webm", ".ogg"],
#     "document": [".pdf"],
# }

# def resolve_type(ext: str):
#     for t, exts in ALLOWED_TYPES.items():
#         if ext in exts:
#             return t
#     return "other"

# @router.post("/media/upload")
# async def upload_media(file: UploadFile = File(...)):

#     ext = Path(file.filename).suffix.lower()

#     media_type = resolve_type(ext)

#     if media_type == "other":
#         raise HTTPException(400, f"Unsupported file type: {ext}")

#     unique_name = f"{uuid.uuid4().hex}{ext}"
#     file_path = UPLOAD_DIR / unique_name

#     with file_path.open("wb") as buffer:
#         shutil.copyfileobj(file.file, buffer)

#     return JSONResponse({
#         "url": f"http://localhost:5000/uploads/{unique_name}",
#         "type": media_type,
#         "name": file.filename,
#         "uploaded_at": datetime.utcnow()
#     })