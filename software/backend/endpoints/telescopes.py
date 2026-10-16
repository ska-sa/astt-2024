"""Existing telescope CRUD operations, including JSON controller metadata."""

from datetime import datetime
import json
from typing import Any

from fastapi import HTTPException
from classes.telescope import CreateTelescope, Telescope
from classes import Database

table_name: str = 'telescope'


def metadata_to_json(metadata: dict[str, Any]) -> str:
    """Reject values that cannot be stored as standard JSON."""
    try:
        return json.dumps(metadata, allow_nan=False)
    except (TypeError, ValueError) as error:
        raise HTTPException(status_code=400, detail="Telescope metadata must contain valid JSON values.") from error


def telescope_from_row(row: tuple[Any, ...]) -> Telescope:
    """Decode controller metadata when returning a stored telescope."""
    id, name, health_status, created_at, metadata = row
    return Telescope(
        id=int(id),
        name=str(name),
        health_status=str(health_status),
        created_at=datetime.fromisoformat(str(created_at)),
        metadata=json.loads(metadata)
    )


def get_telescopes() -> list[Telescope]:
    """Return all registered telescopes."""
    db = Database()
    _, rows = db.read(table_name)
    return [telescope_from_row(row) for row in rows]


def post_telescope(telescope: CreateTelescope) -> Telescope:
    """Register a telescope and store its metadata as JSON."""
    db = Database()
    data = telescope.model_dump()
    data['metadata'] = metadata_to_json(telescope.metadata)
    success, _ = db.insert(table_name, data)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to create telescope. Check its name.")

    _, rows = db.read(table_name, criteria={'id': db.cur.lastrowid})
    return telescope_from_row(rows[0])


def get_telescope(telescope_id: int) -> Telescope | None:
    """Return one telescope when its ID exists."""
    db = Database()
    _, rows = db.read(table_name, criteria={'id': telescope_id})
    return telescope_from_row(rows[0]) if rows else None


def delete_telescope(telescope_id: int) -> Telescope:
    """Delete a telescope and return its previous details."""
    db = Database()
    _, rows = db.read(table_name, criteria={'id': telescope_id})
    if not rows:
        raise HTTPException(status_code=404, detail=f"Telescope with ID {telescope_id} not found.")

    telescope = telescope_from_row(rows[0])
    success, _ = db.delete(table_name, criteria={'id': telescope_id})
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete telescope.")
    return telescope


def update_telescope(telescope_id: int, telescope: Telescope) -> Telescope:
    """Update telescope details using the existing endpoint."""
    db = Database()
    data = telescope.model_dump(exclude={'id', 'created_at'})
    if 'metadata' in telescope.model_fields_set:
        data['metadata'] = metadata_to_json(telescope.metadata)
    else:
        data.pop('metadata')
    success, _ = db.update(table_name, criteria={'id': telescope_id}, data=data)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update telescope.")

    _, rows = db.read(table_name, criteria={'id': telescope_id})
    if not rows:
        raise HTTPException(status_code=404, detail=f"Telescope with ID {telescope_id} not found.")
    return telescope_from_row(rows[0])
