"""Sensor readings and an optional one-line firmware diagnostic."""

from datetime import datetime
import re
from typing import Any
from pydantic import BaseModel, Field, model_validator

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
    el_encoder_angle: float | None = Field(default=None, ge=0, lt=360, allow_inf_nan=False)

    @model_validator(mode='before')
    @classmethod
    def read_legacy_encoder_log(cls, data: Any) -> Any:
        """Expose raw EL from the first reading-only firmware until it is upgraded."""
        if not isinstance(data, dict) or data.get('el_encoder_angle') is not None:
            return data
        log = data.get('serial_log')
        if not isinstance(log, str):
            return data
        match = re.search(r'(?:^|\s)elEnc=(\d+(?:\.\d+)?)\s+EL_ENC=OK(?:\s|$)', log)
        if match and 0 <= float(match[1]) < 360:
            return {**data, 'el_encoder_angle': float(match[1])}
        return data
    
class Reading(CreateReading):
    """A persisted telemetry sample returned by the existing API."""

    id: int
    created_at: datetime

    class Config:
        from_attribute = True
