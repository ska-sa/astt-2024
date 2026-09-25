from dataclasses import dataclass
from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from .source import CreateSource

class PointCommand(BaseModel):
    target_az_angle: float
    target_el_angle: float

class TrackCommand(BaseModel):
    source: CreateSource

class CreateCommand(BaseModel):
    user_id: int
    telescope_id: int
    command_type: str
    track : Optional[TrackCommand] = None
    point : Optional[PointCommand] = None

    def to_dict(self) -> dict:
        data = {
            "user_id": self.user_id,
            "telescope_id": self.telescope_id,
            "command_type": self.command_type
        }
        if self.track:
            data.update({
                "name": self.track.source.name,
                "m_1": self.track.source.m_1,
                "m_2": self.track.source.m_2,
                "c_1": self.track.source.c_1,
                "c_2": self.track.source.c_2,
                "T_ra": self.track.source.T_ra,
                "A": self.track.source.A,
                "phi": self.track.source.phi,
                "D": self.track.source.D,
                "T_dec": self.track.source.T_dec
            })
        elif self.point:
            data.update({
                "target_az_angle": self.point.target_az_angle,
                "target_el_angle": self.point.target_el_angle
            })
        return data

class Command(CreateCommand):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
