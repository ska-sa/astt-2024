from dataclasses import dataclass
from datetime import datetime
from pydantic import BaseModel

class CreateUser(BaseModel):
    email_address: str
    password: str

class User(CreateUser):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
