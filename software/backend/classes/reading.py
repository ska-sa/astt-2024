from dataclasses import dataclass
from datetime import datetime
from pydantic import BaseModel

class CreateReading(BaseModel):
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
    
class Reading(CreateReading):
    id: int
    created_at: datetime

    class Config:
        from_attribute = True

    
    