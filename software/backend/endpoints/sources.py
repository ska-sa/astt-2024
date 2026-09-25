from datetime import datetime
from fastapi import HTTPException
from classes.source import CreateSource, Source
from classes import Database

table_name: str = 'source'

def get_source(source_id: int) -> Source:
    db = Database()
    _, db_select_source_outputs = db.read(table_name, criteria={'id': source_id})
    if db_select_source_outputs:
        id, name, m_1, m_2, c_1, c_2, T_ra, A, phi, D, T_dec, created_at = db_select_source_outputs[0]
        return Source(
            id=id,
            name=name,
            m_1=m_1,
            m_2=m_2,
            c_1=c_1,
            c_2=c_2,
            T_ra=T_ra,
            A=A,
            phi=phi,
            D=D,
            T_dec=T_dec,
            created_at=datetime.fromisoformat(created_at)
        )
    else:
        raise HTTPException(status_code=404, detail=f"Source with ID {source_id} not found.")

def get_sources() -> list[Source]:
    db = Database()
    _, db_select_source_outputs = db.read(table_name)
    sources = []
    for db_select_source_output in db_select_source_outputs:
        id, name, m_1, m_2, c_1, c_2, T_ra, A, phi, D, T_dec, created_at = db_select_source_output
        sources.append(Source(
            id=id,
            name=name,
            m_1=m_1,
            m_2=m_2,
            c_1=c_1,
            c_2=c_2,
            T_ra=T_ra,
            A=A,
            phi=phi,
            D=D,
            T_dec=T_dec,
            created_at=datetime.fromisoformat(created_at)
        ))
    return sources

def post_source(source: CreateSource) -> Source:
    db = Database()
    _, _ = db.insert(table_name, source.__dict__)
    _, db_select_source_outputs = db.read(table_name, criteria=source.__dict__)
    id, name, m_1, m_2, c_1, c_2, T_ra, A, phi, D, T_dec, created_at = db_select_source_outputs[-1]
    return Source(
        id=id,
        name=name,
        m_1=m_1,
        m_2=m_2,
        c_1=c_1,
        c_2=c_2,
        T_ra=T_ra,
        A=A,
        phi=phi,
        D=D,
        T_dec=T_dec,
        created_at=datetime.fromisoformat(created_at)
    )

def delete_source(source_id: int) -> Source:
    db = Database()
    _, db_select_source_outputs = db.read(table_name, criteria={'id': source_id})
    if db_select_source_outputs:
        id, name, m_1, m_2, c_1, c_2, T_ra, A, phi, D, T_dec, created_at = db_select_source_outputs[0]
        source = Source(
            id=id,
            name=name,
            m_1=m_1,
            m_2=m_2,
            c_1=c_1,
            c_2=c_2,
            T_ra=T_ra,
            A=A,
            phi=phi,
            D=D,
            T_dec=T_dec,
            created_at=datetime.fromisoformat(created_at)
        )
        success, _ = db.delete(table_name, criteria={'id': source_id})
        if success:
            return source
        else:
            raise HTTPException(status_code=500, detail="Failed to delete source.")
    else:
        raise HTTPException(status_code=404, detail=f"Source with ID {source_id} not found.")

def update_source(source_id: int, source: Source) -> Source:
    db = Database()
    success, _ = db.update(table_name, criteria={'id': source_id}, data=source.__dict__)
    if success:
        _, db_select_source_outputs = db.read(table_name, criteria={'id': source_id})
        id, name, m_1, m_2, c_1, c_2, T_ra, A, phi, D, T_dec, created_at = db_select_source_outputs[0]
        return Source(
            id=id,
            name=name,
            m_1=m_1,
            m_2=m_2,
            c_1=c_1,
            c_2=c_2,
            T_ra=T_ra,
            A=A,
            phi=phi,
            D=D,
            T_dec=T_dec,
            created_at=datetime.fromisoformat(created_at)
        )
    else:
        raise HTTPException(status_code=500, detail="Failed to update source.")
