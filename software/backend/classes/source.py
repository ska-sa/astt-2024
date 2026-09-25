from datetime import datetime
from pydantic import BaseModel

class CreateSource(BaseModel):
    name: str
    m_1: float
    m_2: float
    c_1: float
    c_2: float
    T_ra: float
    A: float
    phi: float
    D: float
    T_dec: float

class Source(CreateSource):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
