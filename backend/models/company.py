from pydantic import BaseModel
from typing import List

class Company(BaseModel):
    name: str
    slug: str
    business_type: str
    enabled_modules: List[str]