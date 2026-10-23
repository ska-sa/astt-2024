"""Sensor readings and an optional one-line firmware diagnostic."""

from datetime import datetime
from pydantic import BaseModel, Field

class CreateReading(BaseModel):
    """Telemetry posted by current and older firmware versions."""

    telescope_id: int
    azimuth_angle: float
    elevation_angle: float
    latitude: float
    longitude: float
    altitude: float
    gyroscope_x: float
    gyroscope_y: float
    gyroscope_z: float
    acceleration_x: float
    acceleration_y: float
    acceleration_z: float
    magnetic_field_x: float
    magnetic_field_y: float
    magnetic_field_z: float
    health_status: str
    movement_status: str
    serial_log: str | None = Field(default=None, max_length=2048)
    
class Reading(CreateReading):
    """A persisted telemetry sample returned by the existing API."""

    id: int
    created_at: datetime

    class Config:
        from_attribute = True
