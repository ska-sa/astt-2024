from fastapi import HTTPException
from classes.source import CreateSource
from classes.command import CreateCommand, Command, PointCommand, TrackCommand
from classes import Database
from datetime import datetime

table_name: str = 'command'

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
