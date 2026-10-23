"""Existing reading CRUD and history routes, including optional diagnostics."""

from fastapi import HTTPException
from classes.reading import CreateReading, Reading
from datetime import datetime
from classes import Database

table_name: str = "reading"


def get_reading(reading_id: int) -> Reading:
    """Return one persisted sample with its optional firmware log."""
    db = Database()
    _, db_select_reading_outputs = db.read(table_name, criteria={"id": reading_id})
    if db_select_reading_outputs:
        (
            id,
            telescope_id,
            azimuth_angle,
            elevation_angle,
            latitude,
            longitude,
            altitude,
            gyroscope_x,
            gyroscope_y,
            gyroscope_z,
            acceleration_x,
            acceleration_y,
            acceleration_z,
            magnetic_field_x,
            magnetic_field_y,
            magnetic_field_z,
            health_status,
            movement_status,
            created_at,
            serial_log,
        ) = db_select_reading_outputs[0]
        return Reading(
            id=id,
            telescope_id=telescope_id,
            azimuth_angle=azimuth_angle,
            elevation_angle=elevation_angle,
            latitude=latitude,
            altitude=altitude,
            longitude=longitude,
            gyroscope_x=gyroscope_x,
            gyroscope_y=gyroscope_y,
            gyroscope_z=gyroscope_z,
            acceleration_x=acceleration_x,
            acceleration_y=acceleration_y,
            acceleration_z=acceleration_z,
            magnetic_field_x=magnetic_field_x,
            magnetic_field_y=magnetic_field_y,
            magnetic_field_z=magnetic_field_z,
            health_status=health_status,
            movement_status=movement_status,
            created_at=datetime.fromisoformat(str(created_at)),
            serial_log=serial_log,
        )
    else:
        return None


def get_readings() -> list[Reading]:
    """Return sensor samples and their original diagnostics."""
    db = Database()
    _, db_select_reading_outputs = db.read(table_name)
    readings = []
    for db_select_reading_output in db_select_reading_outputs:
        (
            id,
            telescope_id,
            azimuth_angle,
            elevation_angle,
            latitude,
            longitude,
            altitude,
            gyroscope_x,
            gyroscope_y,
            gyroscope_z,
            acceleration_x,
            acceleration_y,
            acceleration_z,
            magnetic_field_x,
            magnetic_field_y,
            magnetic_field_z,
            health_status,
            movement_status,
            created_at,
            serial_log,
        ) = db_select_reading_output
        
        readings.append(
            Reading(
                id=id,
                telescope_id=telescope_id,
                azimuth_angle=azimuth_angle,
                elevation_angle=elevation_angle,
                latitude=latitude,
                longitude=longitude,
                altitude=altitude,
                gyroscope_x=(gyroscope_x),
                gyroscope_y=(gyroscope_y),
                gyroscope_z=(gyroscope_z),
                acceleration_x=(acceleration_x),
                acceleration_y=(acceleration_y),
                acceleration_z=(acceleration_z),
                magnetic_field_x=magnetic_field_x,
                magnetic_field_y=magnetic_field_y,
                magnetic_field_z=magnetic_field_z,
                health_status=health_status,
                movement_status=movement_status,
                created_at=datetime.fromisoformat(str(created_at)),
                serial_log=serial_log,
            )
        )
    return readings


def get_latest_reading(telescope_id: int) -> Reading:
    """Return the latest sample and diagnostic for a telescope."""
    db = Database()
    _, db_select_reading_outputs = db.read(
        table_name, criteria={"telescope_id": telescope_id}
    )
    if db_select_reading_outputs:
        (
            id,
            telescope_id,
            azimuth_angle,
            elevation_angle,
            latitude,
            longitude,
            altitude,
            gyroscope_x,
            gyroscope_y,
            gyroscope_z,
            acceleration_x,
            acceleration_y,
            acceleration_z,
            magnetic_field_x,
            magnetic_field_y,
            magnetic_field_z,
            health_status,
            movement_status,
            created_at,
            serial_log,
        ) = db_select_reading_outputs[-1]
        return Reading(
            id=id,
            telescope_id=telescope_id,
            azimuth_angle=azimuth_angle,
            elevation_angle=elevation_angle,
            latitude=latitude,
            longitude=longitude,
            altitude=altitude,
            gyroscope_x=gyroscope_x,
            gyroscope_y=gyroscope_y,
            gyroscope_z=gyroscope_z,
            acceleration_x=acceleration_x,
            acceleration_y=acceleration_y,
            acceleration_z=acceleration_z,
            magnetic_field_x=magnetic_field_x,
            magnetic_field_y=magnetic_field_y,
            magnetic_field_z=magnetic_field_z,
            health_status=health_status,
            movement_status=movement_status,
            created_at=datetime.fromisoformat(str(created_at)),
            serial_log=serial_log,
        )
    else:
        raise HTTPException(
            status_code=404,
            detail=f"No readings found for telescope ID {telescope_id}.",
        )

def get_readings_in_range(telescope_id: int, start: str, end: str) -> list[Reading]:
    """Return dated samples without dropping their firmware diagnostics."""
    db = Database()
    sql = "SELECT * FROM `reading` WHERE `telescope_id` = ? AND `created_at` BETWEEN ? AND ? ORDER BY `created_at` ASC"
    db.cur.execute(sql, (telescope_id, start, end))
    db_select_reading_outputs = db.cur.fetchall()

    readings = []
    for db_select_reading_output in db_select_reading_outputs:
        (
            id,
            telescope_id,
            azimuth_angle,
            elevation_angle,
            latitude,
            longitude,
            altitude,
            gyroscope_x,
            gyroscope_y,
            gyroscope_z,
            acceleration_x,
            acceleration_y,
            acceleration_z,
            magnetic_field_x,
            magnetic_field_y,
            magnetic_field_z,
            health_status,
            movement_status,
            created_at,
            serial_log,
        ) = db_select_reading_output

        readings.append(
            Reading(
                id=id,
                telescope_id=telescope_id,
                azimuth_angle=azimuth_angle,
                elevation_angle=elevation_angle,
                latitude=latitude,
                longitude=longitude,
                altitude=altitude,
                gyroscope_x=gyroscope_x,
                gyroscope_y=gyroscope_y,
                gyroscope_z=gyroscope_z,
                acceleration_x=acceleration_x,
                acceleration_y=acceleration_y,
                acceleration_z=acceleration_z,
                magnetic_field_x=magnetic_field_x,
                magnetic_field_y=magnetic_field_y,
                magnetic_field_z=magnetic_field_z,
                health_status=health_status,
                movement_status=movement_status,
                created_at=datetime.fromisoformat(str(created_at)),
                serial_log=serial_log,
            )
        )
    return readings

def post_reading(reading: CreateReading) -> Reading:
    """Store a sample; older payloads default to a null diagnostic."""
    db = Database()
    success, _ = db.insert(table_name, reading.model_dump())
    if not success:
        raise HTTPException(status_code=500, detail="Failed to create reading.")
    _, db_select_reading_outputs = db.read(table_name, criteria={"id": db.cur.lastrowid})
    (
        id,
        telescope_id,
        azimuth_angle,
        elevation_angle,
        latitude,
        longitude,
        altitude,
        gyroscope_x,
        gyroscope_y,
        gyroscope_z,
        acceleration_x,
        acceleration_y,
        acceleration_z,
        magnetic_field_x,
        magnetic_field_y,
        magnetic_field_z,
        health_status,
        movement_status,
        created_at,
        serial_log,
    ) = db_select_reading_outputs[-1]

    return Reading(
        id=id,
        telescope_id=telescope_id,
        azimuth_angle=azimuth_angle,
        elevation_angle=elevation_angle,
        latitude=latitude,
        longitude=longitude,
        altitude=altitude,
        gyroscope_x=gyroscope_x,
        gyroscope_y=gyroscope_y,
        gyroscope_z=gyroscope_z,
        acceleration_x=acceleration_x,
        acceleration_y=acceleration_y,
        acceleration_z=acceleration_z,
        magnetic_field_x=magnetic_field_x,
        magnetic_field_y=magnetic_field_y,
        magnetic_field_z=magnetic_field_z,
        health_status=health_status,
        movement_status=movement_status,
        created_at=datetime.fromisoformat(str(created_at)),
        serial_log=serial_log,
    )


def delete_reading(reading_id: int) -> Reading:
    """Delete a sample and return its complete previous representation."""
    db = Database()
    _, db_select_reading_outputs = db.read(table_name, criteria={"id": reading_id})
    if db_select_reading_outputs:
        (
            id,
            telescope_id,
            azimuth_angle,
            elevation_angle,
            latitude,
            longitude,
            altitude,
            gyroscope_x,
            gyroscope_y,
            gyroscope_z,
            acceleration_x,
            acceleration_y,
            acceleration_z,
            magnetic_field_x,
            magnetic_field_y,
            magnetic_field_z,
            health_status,
            movement_status,
            created_at,
            serial_log,
        ) = db_select_reading_outputs[0]
        reading = Reading(
            id=id,
            telescope_id=telescope_id,
            azimuth_angle=azimuth_angle,
            elevation_angle=elevation_angle,
            latitude=latitude,
            longitude=longitude,
            altitude=altitude,
            gyroscope_x=gyroscope_x,
            gyroscope_y=gyroscope_y,
            gyroscope_z=gyroscope_z,
            acceleration_x=acceleration_x,
            acceleration_y=acceleration_y,
            acceleration_z=acceleration_z,
            magnetic_field_x=magnetic_field_x,
            magnetic_field_y=magnetic_field_y,
            magnetic_field_z=magnetic_field_z,
            health_status=health_status,
            movement_status=movement_status,
            created_at=datetime.fromisoformat(str(created_at)),
            serial_log=serial_log,
        )
        success, _ = db.delete(table_name, criteria={"id": reading_id})
        if success:
            return reading
        else:
            return HTTPException(status_code=500, detail="Failed to delete reading.")
    else:
        raise HTTPException(
            status_code=404, detail=f"Reading with ID {reading_id} not found."
        )


def update_reading(reading_id: int, reading: Reading) -> Reading:
    """Update a sample, including an explicitly supplied diagnostic."""
    db = Database()
    success, _ = db.update(
        table_name, criteria={"id": reading_id}, data=reading.__dict__
    )
    if success:
        _, db_select_reading_outputs = db.read(table_name, criteria={"id": reading_id})
        (
            id,
            telescope_id,
            azimuth_angle,
            elevation_angle,
            latitude,
            longitude,
            altitude,
            gyroscope_x,
            gyroscope_y,
            gyroscope_z,
            acceleration_x,
            acceleration_y,
            acceleration_z,
            magnetic_field_x,
            magnetic_field_y,
            magnetic_field_z,
            health_status,
            movement_status,
            created_at,
            serial_log,
        ) = db_select_reading_outputs[0]
        return Reading(
            id=id,
            telescope_id=telescope_id,
            azimuth_angle=azimuth_angle,
            elevation_angle=elevation_angle,
            latitude=latitude,
            longitude=longitude,
            altitude=altitude,
            gyroscope_x=gyroscope_x,
            gyroscope_y=gyroscope_y,
            gyroscope_z=gyroscope_z,
            acceleration_x=acceleration_x,
            acceleration_y=acceleration_y,
            acceleration_z=acceleration_z,
            magnetic_field_x=magnetic_field_x,
            magnetic_field_y=magnetic_field_y,
            magnetic_field_z=magnetic_field_z,
            health_status=health_status,
            movement_status=movement_status,
            created_at=datetime.fromisoformat(str(created_at)),
            serial_log=serial_log,
        )
    else:
        return None
    
