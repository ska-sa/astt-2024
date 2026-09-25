from fastapi import HTTPException
from classes.user import CreateUser, User
from datetime import datetime
from classes import Database

table_name: str = 'user'

def get_users() -> list[User]:
    db = Database()
    _, db_select_user_outputs = db.read(table_name)
    users = []
    for db_select_user_output in db_select_user_outputs:
        id, email_address, password, created_at = db_select_user_output
        users.append(User(id=int(id), email_address=str(email_address), password=str(password), created_at=datetime.fromisoformat(str(created_at))))

    return users

def post_user(user: CreateUser) -> User:
    # Insert new user data
    db = Database()
    _, _ = db.insert(table_name, user.__dict__)
    # Read newly inserted user from db
    _, db_select_user_outputs = db.read(table_name, criteria=user.__dict__)
    id, email_address, password, created_at = db_select_user_outputs[-1]
    return User(id=int(id), email_address=str(email_address), password=str(password), created_at=datetime.fromisoformat(str(created_at)))

def get_user(user_id: int) -> User:
    # Read user from db by id
    db = Database()
    _, db_select_user_outputs = db.read(table_name, criteria={'id': user_id})
    if db_select_user_outputs:
        id, email_address, password, created_at = db_select_user_outputs[0]
        return User(id=int(id), email_address=str(email_address), password=str(password), created_at=datetime.fromisoformat(str(created_at)))
    else:
        return None

def auth_user(user: CreateUser) -> User:
    # Authenticate user by email and password
    db = Database()
    _, db_select_user_outputs = db.read(table_name, criteria={'email_address': user.email_address, 'password': user.password})
    if db_select_user_outputs:
        id, email_address, password, created_at = db_select_user_outputs[0]
        return User(id=int(id), email_address=str(email_address), password=str(password), created_at=datetime.fromisoformat(str(created_at)))
    else:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

def delete_user(user_id: int) -> User:
    # Delete user from db by id
    db = Database()
    _, db_select_user_outputs = db.read(table_name, criteria={'id': user_id})
    if db_select_user_outputs:
        id, email_address, password, created_at = db_select_user_outputs[0]
        user = User(id=int(id), email_address=str(email_address), password=str(password), created_at=datetime.fromisoformat(str(created_at)))
        success, _ = db.delete(table_name, criteria={'id': user_id})
        if success:
            return user
        else:
            raise HTTPException(status_code=500, detail="Failed to delete user.")
    else:
        raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found.")

def update_user(user_id: int, user: User) -> User:
    # Update user in db by id
    db = Database()
    success, _ = db.update(table_name, criteria={'id': user_id}, data=user.__dict__)
    if success:
        _, db_select_user_outputs = db.read(table_name, criteria={'id': user_id})
        id, email_address, password, created_at = db_select_user_outputs[0]
        return User(id=int(id), email_address=str(email_address), password=str(password), created_at=datetime.fromisoformat(str(created_at)))
    else:
        return None