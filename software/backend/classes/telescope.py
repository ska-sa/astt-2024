"""Telescope details and optional controller configuration."""

from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field

class CreateTelescope(BaseModel):
    """Details used to register a telescope."""

    name: str
    health_status: str
    metadata: dict[str, Any] = Field(default_factory=dict)

class Telescope(CreateTelescope):
    """Stored telescope details returned by the API."""

    id: int
    created_at: datetime

    class Config:
        from_attributes = True
