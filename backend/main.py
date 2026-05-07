from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
# from database import init_indexes
from routes import auth_routes, company_routes, content_routes, user_routes, section_routes, category_routes, integration_routes
import os
import uuid
from dotenv import load_dotenv
from pathlib import Path
from routes import subscribe

load_dotenv()


app = FastAPI()

@app.on_event("startup")
def on_startup():
    print("\n🚀 FASTAPI STARTED")
    print("PID:", os.getpid())

    # Initialize DB indexes once on startup
    # init_indexes()

@app.on_event("shutdown")
def on_shutdown():
    print("\n🛑 FASTAPI SHUTDOWN")
    print("PID:", os.getpid())
   
   

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

 
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# -----------------------------
# CORS Setup
# -----------------------------
origins = [
    "http://localhost:5171",
    "http://localhost:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://mediahub-ejewfmgfawbab3dz.southindia-01.azurewebsites.net",
    "https://devopsmedia-bugtg0d9a5ame6fq.southindia-01.azurewebsites.net",
    "https://devopstrio.co.uk",
    "https://devopstrio-c7aqc5ccfudrh2ec.southindia-01.azurewebsites.net",
    "https://chalkyinfo.com",
    "https://chalkyinfotech-ctftb6dmg9fgchbe.southindia-01.azurewebsites.net"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# init_indexes()

# ✅ Register Routers
app.include_router(auth_routes.router, prefix="/api")
app.include_router(company_routes.router, prefix="/api")
app.include_router(content_routes.router, prefix="/api")
app.include_router(user_routes.router, prefix="/api")
app.include_router(section_routes.router, prefix="/api")
app.include_router(category_routes.router, prefix="/api")
app.include_router(subscribe.router, prefix="/api")
app.include_router(integration_routes.router, prefix="/api")


# -----------------------------
# Root endpoint
# -----------------------------
@app.get("/")
def root():
    return {"message": "Hello from podcast!"}

@app.get("/healthz")
def health():
    return {"status": "ok"}
