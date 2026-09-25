"""This file is responsible for testing the insert function from database class"""
from classes import Database


def test_database_insert() -> None:
    """This function tests the functionality of the insert to database function"""
    db = Database()
    user_dict = {
        "id": 1,
        "email_address": "test@astt.com",
        "type": 2
    }
    
    assert "testing" in db.name
    assert db.insert("user", user_dict)

            self.id: int = id
        self.email: str = email
        self.password: str = password
        created_at: datetime = created_at