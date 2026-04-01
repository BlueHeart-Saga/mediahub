import os
from pymongo import MongoClient
from dotenv import load_dotenv


load_dotenv()

from utils.blob_storage import AzureBlobStorage

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "podcast")

if not MONGO_URI:
    raise Exception("MONGO_URI not found in environment")

client = MongoClient(
    MONGO_URI,
    maxPoolSize=5,
    minPoolSize=1,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=5000
)

db = client[DB_NAME]

# ✅ Collections
users_collection = db["users"]
companies_collection = db["companies"]
sections_collection = db["sections"]
categories_collection = db["categories"]
content_collection = db["content"]
content_likes_collection = db["content_likes"]
comments_collection = db["comments"]
images_collection = db["images"]
documents_collection = db["documents"]  # For document metadata
content_views_collection = db["content_views"]
content_stats_daily_collection = db["content_stats_daily"]
subscribers_collection = db["subscribers"]
subscription_logs = db["subscription_logs"]

# Create unique index for subscribers
subscribers_collection.create_index(
    [("email", 1), ("company_id", 1)],
    unique=True
)

# Azure Blob Storage instance
azure_storage = AzureBlobStorage()

