from datetime import datetime
import os
from dotenv import load_dotenv, set_key
import sqlite3

class Database:
    def __init__(self) -> None:
        load_dotenv()
        env = os.getenv('ENV', 'development')
        self.name = f"databases/{env}.db"
        self.conn = sqlite3.connect(self.name, check_same_thread=False)
        self.cur = self.conn.cursor()
        self.create_tables()
    def create_tables(self) -> None:
        self.cur.executescript("""
        CREATE TABLE IF NOT EXISTS user(
            `id` INTEGER PRIMARY KEY AUTOINCREMENT,
            `email_address` VARCHAR(255) UNIQUE,
            `password` VARCHAR(255),
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS telescope(
            `id` INTEGER PRIMARY KEY AUTOINCREMENT,
            `name` VARCHAR(255) UNIQUE,
            `health_status` VARCHAR(50),
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS reading(
            `id` INTEGER PRIMARY KEY AUTOINCREMENT,
            `telescope_id` INTEGER,
            `azimuth_angle` DOUBLE,
            `elevation_angle` DOUBLE,
            `latitude` DOUBLE,
            `longitude` DOUBLE,
            `altitude` DOUBLE,
            `gyroscope_x` DOUBLE,
            `gyroscope_y` DOUBLE,
            `gyroscope_z` DOUBLE,
            `acceleration_x` DOUBLE,
            `acceleration_y` DOUBLE,
            `acceleration_z` DOUBLE,
            `magnetic_field_x` DOUBLE,
            `magnetic_field_y` DOUBLE,
            `magnetic_field_z` DOUBLE,
            `health_status` VARCHAR(50),
            `movement_status` VARCHAR(50),
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS position(
            `id` INTEGER PRIMARY KEY AUTOINCREMENT,
            `datetime` DATETIME,
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS command(
            `id` INTEGER PRIMARY KEY AUTOINCREMENT,
            `user_id` INTEGER NOT NULL,
            `telescope_id` INTEGER NOT NULL,
            `command_type` VARCHAR(50) NOT NULL,
            `target_az_angle` DOUBLE DEFAULT NULL,
            `target_el_angle` DOUBLE DEFAULT NULL,
            `name` TEXT UNIQUE DEFAULT NULL,
            `m_1` REAL DEFAULT NULL,
            `m_2` REAL DEFAULT NULL,
            `c_1` REAL DEFAULT NULL,
            `c_2` REAL DEFAULT NULL,
            `T_ra` REAL DEFAULT NULL,
            `A` REAL DEFAULT NULL,
            `phi` REAL DEFAULT NULL,
            `D` REAL DEFAULT NULL,
            `T_dec` REAL DEFAULT NULL,
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
        );
                               
        CREATE TABLE IF NOT EXISTS source (
            `id` INTEGER PRIMARY KEY AUTOINCREMENT,
            `name` TEXT UNIQUE NOT NULL,
            `m_1` REAL NOT NULL,
            `m_2` REAL NOT NULL,
            `c_1` REAL NOT NULL,
            `c_2` REAL NOT NULL,
            `T_ra` REAL NOT NULL,
            `A` REAL NOT NULL,
            `phi` REAL NOT NULL,
            `D` REAL NOT NULL,
            `T_dec` REAL NOT NULL,
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)
        self.migrate_command_table()
        self.migrate_source_table()
        self.conn.commit()

    def migrate_command_table(self) -> None:
        columns = self.cur.execute("PRAGMA table_info(command)").fetchall()
        column_names = [column[1] for column in columns]

        if "command_type" in column_names:
            return

        self.cur.executescript("""
        ALTER TABLE command RENAME TO old_command;

        CREATE TABLE command(
            `id` INTEGER PRIMARY KEY AUTOINCREMENT,
            `user_id` INTEGER NOT NULL,
            `telescope_id` INTEGER NOT NULL,
            `command_type` VARCHAR(50) NOT NULL,
            `target_az_angle` DOUBLE DEFAULT NULL,
            `target_el_angle` DOUBLE DEFAULT NULL,
            `name` TEXT UNIQUE DEFAULT NULL,
            `m_1` REAL DEFAULT NULL,
            `m_2` REAL DEFAULT NULL,
            `c_1` REAL DEFAULT NULL,
            `c_2` REAL DEFAULT NULL,
            `T_ra` REAL DEFAULT NULL,
            `A` REAL DEFAULT NULL,
            `phi` REAL DEFAULT NULL,
            `D` REAL DEFAULT NULL,
            `T_dec` REAL DEFAULT NULL,
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        INSERT INTO command (
            id,
            user_id,
            telescope_id,
            command_type,
            target_az_angle,
            target_el_angle,
            created_at
        )
        SELECT
            id,
            user_id,
            telescope_id,
            'point',
            target_az_angle,
            target_el_angle,
            created_at
        FROM old_command;

        DROP TABLE old_command;
        """)

    def migrate_source_table(self) -> None:
        columns = self.cur.execute("PRAGMA table_info(source)").fetchall()
        column_names = [column[1] for column in columns]

        if "m_1" in column_names:
            return

        self.cur.executescript("""
        ALTER TABLE source RENAME TO old_source;

        CREATE TABLE source (
            `id` INTEGER PRIMARY KEY AUTOINCREMENT,
            `name` TEXT UNIQUE NOT NULL,
            `m_1` REAL NOT NULL,
            `m_2` REAL NOT NULL,
            `c_1` REAL NOT NULL,
            `c_2` REAL NOT NULL,
            `T_ra` REAL NOT NULL,
            `A` REAL NOT NULL,
            `phi` REAL NOT NULL,
            `D` REAL NOT NULL,
            `T_dec` REAL NOT NULL,
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        INSERT INTO source (
            id,
            name,
            m_1,
            m_2,
            c_1,
            c_2,
            T_ra,
            A,
            phi,
            D,
            T_dec
        )
        SELECT
            id,
            name,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0
        FROM old_source;

        DROP TABLE old_source;
        """)

    def insert(self, table_name: str, data: dict) -> tuple[bool, list]:
        try:
            columns = ', '.join([f"`{key}`" for key in data.keys()])
            placeholders = ', '.join(['?' for _ in data])
            sql = f"INSERT INTO `{table_name}` ({columns}) VALUES ({placeholders})"
            self.cur.execute(sql, list(data.values()))
            self.conn.commit()
            return (True, [data])
        except sqlite3.IntegrityError as e:
            print(f"Error inserting data: {e}")
            return (False, [])

    def delete(self, table_name: str, criteria: dict) -> tuple[bool, list]:
        try:
            where_clause = ' AND '.join([f"`{key}` = ?" for key in criteria])
            sql = f"DELETE FROM `{table_name}` WHERE {where_clause}"
            self.cur.execute(sql, list(criteria.values()))
            self.conn.commit()
            return (True, [criteria])
        except sqlite3.Error as e:
            print(f"Error deleting data: {e}")
            return (False, [])

    def read(self, table_name: str, criteria: dict = None, limit: int = None, offset: int = None) -> tuple[bool, list]:
        try:
            where_clause = ' AND '.join([f"`{key}` = ?" for key in criteria]) if criteria else ""
            limit_clause = f"LIMIT {limit}" if limit else ""
            offset_clause = f"OFFSET {offset}" if offset else ""
            sql = f"SELECT * FROM `{table_name}` " + \
                  (f"WHERE {where_clause} " if where_clause else "") + \
                  (f"{limit_clause} " if limit_clause else "") + \
                  (f"{offset_clause}" if offset_clause else "")
            self.cur.execute(sql, list(criteria.values()) if criteria else [])
            return (True, self.cur.fetchall())
        except sqlite3.Error as e:
            print(f"Error reading data: {e}")
            return (False, [])

    def read_range(self, table_name: str, min_id: int, max_id: int) -> tuple[bool, list]:
        try:
            sql = f"SELECT * FROM `{table_name}` WHERE `id` BETWEEN ? AND ?"
            self.cur.execute(sql, (min_id, max_id))
            return (True, self.cur.fetchall())
        except sqlite3.Error as e:
            print(f"Error reading data: {e}")
            return (False, [])

    def update(self, table_name: str, data: dict, criteria: dict) -> tuple[bool, list]:
        try:
            set_clause = ', '.join([f"`{key}` = ?" for key in data])
            where_clause = ' AND '.join([f"`{key}` = ?" for key in criteria])
            sql = f"UPDATE `{table_name}` SET {set_clause} WHERE {where_clause}"
            self.cur.execute(sql, list(data.values()) + list(criteria.values()))
            self.conn.commit()
            return (True, [data])
        except sqlite3.Error as e:
            print(f"Error updating data: {e}")
            return (False, [])

    def clear(self) -> tuple[bool, list]:
        if self.name not in ['production', 'development']:
            try:
                # Drop all tables
                self.cur.executescript("""
                    DROP TABLE IF EXISTS `user`;
                """)
                self.conn.commit()
                # Recreate tables
                self.create_tables()
                return (True, [])
            except sqlite3.Error as e:
                print(f"Error clearing the database: {e}")
                return (False, [])
        return (False, [])

def main() -> None:
    from user import User
    from reading import Reading
    #load_dotenv()
    #set_key("", "testing")
    db = Database()
    print()

    # Insert new data
    db_insert_status, db_insert_output = db.insert('user', {'email_address': 'shlabisa@sa', 'password': 'pass'})
    print("Insert", db_insert_status, db_insert_output)
    print()
    
    # Read users from db
    db_read_status, db_read_output = db.read('user')
    print("Read", db_read_status, db_read_output)
    print(*db_read_output[0])
    id, email_address, password, created_at = db_read_output[0]
    print(User(id=1,
                email_address="snyide@gmail.com",
                password="snyide",
                created_at=datetime.now()))
    user = User(id= int(id), email_address =str(email_address), password=str(password), created_at= datetime.strptime(str(created_at), "%Y-%m-%d %H:%M:%S"))

    # Update user
    user_dict: dict = user.__dict__
    user_dict["password"] = "pass-updated"
    db_update_status, db_update_output = db.update('user', user_dict, {'id': user.id})
    print("Update", db_update_status, db_update_output)
    print()
    
    db_delete_status, db_delete_output = db.delete('user', {'id': user.id})
    print("Delete", db_delete_status, db_delete_output)
    print()

# Example usage:
if __name__ == "__main__":
    main()
