"""Command storage and Point validation against configured mechanical limits."""

import math
from fastapi import HTTPException
from classes.source import CreateSource
from classes.command import CreateCommand, Command, PointCommand, TrackCommand
from classes import Database
from datetime import datetime
from endpoints.telescopes import get_telescope

table_name: str = 'command'


def validate_point_limits(command: CreateCommand) -> None:
    """Reject Point targets outside a telescope's configured encoder range."""
    if command.command_type != 'point':
        return

    telescope = get_telescope(command.telescope_id)
    if telescope is None:
        return

    keys = ('az_encoder_min', 'az_encoder_max', 'az_encoder_offset')
    metadata = telescope.metadata
    if not any(key in metadata for key in keys):
        return

    values = [metadata.get(key) for key in keys]
    if any(isinstance(value, bool) or not isinstance(value, (int, float))
           or (isinstance(value, float) and not math.isfinite(value)) for value in values):
        raise HTTPException(status_code=400, detail="Telescope AZ limits are invalid. Check its metadata.")

    minimum, maximum, offset = values
    if not (0 <= minimum < 360 and 0 <= maximum < 360 and 0 <= offset < 360):
        raise HTTPException(status_code=400, detail="Telescope AZ limits are invalid. Check its metadata.")

    if command.point is None or not math.isfinite(command.point.target_az_angle):
        raise HTTPException(status_code=400, detail="Point requires a finite AZ angle.")

    target = command.point.target_az_angle
    encoder_target = (target - offset) % 360
    position = (encoder_target - minimum) % 360
    allowed_travel = (maximum - minimum) % 360
    if not (0 <= target <= 360 and position <= allowed_travel):
        ui_minimum = (minimum + offset) % 360
        ui_maximum = (maximum + offset) % 360
        route = " through 0°" if ui_minimum > ui_maximum else ""
        raise HTTPException(
            status_code=400,
            detail=f"AZ target is outside the allowed range {ui_minimum:.1f}° to {ui_maximum:.1f}°{route}."
        )


def get_command(command_id: int) -> Command:
    db = Database()
    _, db_select_command_outputs = db.read(table_name, criteria={'id': command_id})
    if db_select_command_outputs:
        id, user_id, telescope_id, command_type, target_az_angle, target_el_angle, name, m_1, m_2, c_1, c_2, T_ra, A, phi, D, T_dec, created_at = db_select_command_outputs[0]
        return Command(
            id=int(id),
            user_id=str(user_id),
            telescope_id=str(telescope_id),
            command_type=str(command_type),
            point=PointCommand(
                target_az_angle=float(target_az_angle), target_el_angle=float(target_el_angle)
            ) if target_az_angle is not None and target_el_angle is not None else None,
            track=TrackCommand(source=CreateSource(
                name=str(name),
                m_1=float(m_1),
                m_2=float(m_2),
                c_1=float(c_1),
                c_2=float(c_2),
                T_ra=float(T_ra),
                A=float(A),
                phi=float(phi),
                D=float(D),
                T_dec=float(T_dec)
            )) if name is not None else None,
            created_at=datetime.fromisoformat(str(created_at))
        )
    else:
        raise HTTPException(status_code=404, detail=f"Command with ID {command_id} not found.")

def get_commands() -> list[Command]:
    db = Database()
    _, db_select_command_outputs = db.read(table_name)
    commands = []
    for db_select_command_output in db_select_command_outputs:
        id, user_id, telescope_id,command_type, target_az_angle, target_el_angle, name, m_1, m_2, c_1, c_2, T_ra, A, phi, D, T_dec, created_at = db_select_command_output
        commands.append(Command(
            id=int(id),
            user_id=str(user_id),
            telescope_id=str(telescope_id),
            command_type=str(command_type),
            point=PointCommand(
                target_az_angle=float(target_az_angle),
                target_el_angle=float(target_el_angle)
            ) if target_az_angle is not None and target_el_angle is not None else None,
            track=TrackCommand(source=CreateSource(
                name=str(name),
                m_1=float(m_1),
                m_2=float(m_2),
                c_1=float(c_1),
                c_2=float(c_2),
                T_ra=float(T_ra),
                A=float(A),
                phi=float(phi),
                D=float(D),
                T_dec=float(T_dec)
            )) if name is not None else None,
            created_at=datetime.fromisoformat(str(created_at))
        ))
    return commands

def get_latest_command(telescope_id: int) -> Command:
    db = Database()
    _, db_select_command_outputs = db.read(table_name, criteria={'telescope_id': telescope_id})
    if db_select_command_outputs:
        id, user_id, telescope_id, command_type, target_az_angle, target_el_angle, name, m_1, m_2, c_1, c_2, T_ra, A, phi, D, T_dec, created_at  = db_select_command_outputs[-1]
        return Command(
            id=int(id),
            user_id=str(user_id),
            telescope_id=str(telescope_id),
            command_type=str(command_type),
            point=PointCommand(
                target_az_angle=float(target_az_angle),
                target_el_angle=float(target_el_angle)
            ) if target_az_angle is not None and target_el_angle is not None else None,
            track=TrackCommand(source=CreateSource(
                name=str(name),
                m_1=float(m_1),
                m_2=float(m_2),
                c_1=float(c_1),
                c_2=float(c_2),
                T_ra=float(T_ra),
                A=float(A),
                phi=float(phi),
                D=float(D),
                T_dec=float(T_dec)
            )) if name is not None else None,
            created_at=datetime.fromisoformat(str(created_at))
        )
    else:
        raise HTTPException(status_code=404, detail=f"No commands found for telescope ID {telescope_id}.")

def post_command(command: CreateCommand) -> Command:
    """Store a command after checking any configured Point limits."""
    validate_point_limits(command)
    db = Database()
    _, _ = db.insert(table_name, command.to_dict())
    _, db_select_command_outputs = db.read(table_name, criteria=command.to_dict())
    id, user_id, telescope_id, command_type, target_az_angle, target_el_angle, name, m_1, m_2, c_1, c_2, T_ra, A, phi, D, T_dec, created_at = db_select_command_outputs[-1]
    return Command(
        id=int(id),
        user_id=str(user_id),
        telescope_id=str(telescope_id),
        command_type=str(command_type),
        point=PointCommand(
            target_az_angle=float(target_az_angle),
            target_el_angle=float(target_el_angle)
        ) if target_az_angle is not None and target_el_angle is not None else None,
        track=TrackCommand(source=CreateSource(
            name=str(name),
            m_1=float(m_1),
            m_2=float(m_2),
            c_1=float(c_1),
            c_2=float(c_2),
            T_ra=float(T_ra),
            A=float(A),
            phi=float(phi),
            D=float(D),
            T_dec=float(T_dec)
        )) if name is not None else None,
        created_at=datetime.fromisoformat(str(created_at))
    )

def delete_command(command_id: int) -> Command:
    db = Database()
    _, db_select_command_outputs = db.read(table_name, criteria={'id': command_id})
    if db_select_command_outputs:
        id, user_id, telescope_id, command_type, target_az_angle, target_el_angle, name, m_1, m_2, c_1, c_2, T_ra, A, phi, D, T_dec, created_at  = db_select_command_outputs[0]
        command = Command(
            id=int(id),
            user_id=str(user_id),
            telescope_id=str(telescope_id),
            command_type=str(command_type),
            point=PointCommand(
                target_az_angle=float(target_az_angle),
                target_el_angle=float(target_el_angle)
            ) if target_az_angle is not None and target_el_angle is not None else None,
            track=TrackCommand(source=CreateSource(
                name=str(name),
                m_1=float(m_1),
                m_2=float(m_2),
                c_1=float(c_1),
                c_2=float(c_2),
                T_ra=float(T_ra),
                A=float(A),
                phi=float(phi),
                D=float(D),
                T_dec=float(T_dec)
            )) if name is not None else None,
            created_at=datetime.fromisoformat(str(created_at))
        )
        success, _ = db.delete(table_name, criteria={'id': command_id})
        if success:
            return command
        else:
            raise HTTPException(status_code=500, detail="Failed to delete command.")
    else:
        raise HTTPException(status_code=404, detail=f"Command with ID {command_id} not found.")

def update_command(command_id: int, command: Command) -> Command:
    """Update a command after checking any configured Point limits."""
    validate_point_limits(command)
    db = Database()
    success, _ = db.update(table_name, criteria={'id': command_id}, data=command.to_dict())
    if success:
        _, db_select_command_outputs = db.read(table_name, criteria={'id': command_id})
        id, user_id, telescope_id, command_type, target_az_angle, target_el_angle, name, m_1, m_2, c_1, c_2, T_ra, A, phi, D, T_dec, created_at = db_select_command_outputs[0]
        return Command(
            id=int(id),
            user_id=str(user_id),
            telescope_id=str(telescope_id),
            command_type=str(command_type),
            point=PointCommand(
                target_az_angle=float(target_az_angle),
                target_el_angle=float(target_el_angle)
            ) if target_az_angle is not None and target_el_angle is not None else None,
            track=TrackCommand(source=CreateSource(
                name=str(name),
                m_1=float(m_1),
                m_2=float(m_2),
                c_1=float(c_1),
                c_2=float(c_2),
                T_ra=float(T_ra),
                A=float(A),
                phi=float(phi),
                D=float(D),
                T_dec=float(T_dec)
            )) if name is not None else None,
            created_at=datetime.fromisoformat(str(created_at))
        )
    else:
        raise HTTPException(status_code=500, detail="Failed to update command.")
