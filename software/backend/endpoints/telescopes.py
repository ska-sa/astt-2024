from fastapi import HTTPException
from classes.telescope import CreateTelescope, Telescope
from datetime import datetime
from classes import Database

table_name: str = 'telescope'


def get_telescopes() -> list[Telescope]:
    # Read telescopes from db
    db = Database()
    _, db_select_telescope_outputs = db.read(table_name)
    telescopes = []
    for db_select_telescope_output in db_select_telescope_outputs:
        id, name, health_status, created_at = db_select_telescope_output
        telescopes.append(Telescope(id=int(id), name=str(name), health_status=str(health_status), created_at=datetime.fromisoformat(str(created_at))))

    return telescopes

def post_telescope(telescope: CreateTelescope) -> Telescope:
    # Insert new telescope data
    db = Database()
    _, _ = db.insert(table_name, telescope.__dict__)

    # Read newly inserted telescope from db
    _, db_select_telescope_outputs = db.read(table_name, criteria=telescope.__dict__)
    id, name, health_status, created_at = db_select_telescope_outputs[-1]
    return Telescope(id=int(id), name=str(name), health_status=str(health_status), created_at=datetime.fromisoformat(str(created_at)))

def get_telescope(telescope_id: int) -> Telescope:
    # Read telescope from db by id
    db = Database()
    _, db_select_telescope_outputs = db.read(table_name, criteria={'id': telescope_id})
    if db_select_telescope_outputs:
        id, name, health_status, created_at = db_select_telescope_outputs[0]
        return Telescope(id=int(id), name=str(name), health_status=str(health_status), created_at=datetime.fromisoformat(str(created_at)))
    else:
        return None

def delete_telescope(telescope_id: int) -> Telescope:
    # Delete telescope from db by id
    db = Database()
    _, db_select_telescope_outputs = db.read(table_name, criteria={'id': telescope_id})
    if db_select_telescope_outputs:
        id, name, health_status, created_at= db_select_telescope_outputs[0]
        telescope = Telescope(id=int(id), name=str(name), health_status=str(health_status), created_at=datetime.fromisoformat(str(created_at)))
        success, _ = db.delete(table_name, criteria={'id': telescope_id})
        if success:
            return telescope
        else:
            raise HTTPException(status_code=500, detail="Failed to delete telescope.")
    else:
        raise HTTPException(status_code=404, detail=f"Telescope with ID {telescope_id} not found.")

def update_telescope(telescope_id: int, telescope: Telescope) -> Telescope:
    # Update telescope in db by id
    db = Database()
    success, _ = db.update(table_name, criteria={'id': telescope_id}, data=telescope.__dict__)
    if success:
        _, db_select_telescope_outputs = db.read(table_name, criteria={'id': telescope_id})
        id, name, health_status, created_at = db_select_telescope_outputs[0]
        return Telescope(id=int(id), name=str(name), health_status=str(health_status), created_at=datetime.fromisoformat(str(created_at)))
    else:
        return None