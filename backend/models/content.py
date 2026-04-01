from pydantic import BaseModel
from typing import Dict

class Content(BaseModel):
    title: str
    content_type: str
    company_id: str
    body: str
    metadata: Dict = {}
    status: str = "draft"