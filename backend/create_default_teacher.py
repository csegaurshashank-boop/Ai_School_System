"""
Script to create default teacher account
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from database import engine, SessionLocal
from models import Base, User
import hashlib

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_default_teacher():
    """Create default teacher account if it doesn't exist"""
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Check if default teacher already exists
        existing = db.query(User).filter(User.email == "admin@school.com").first()
        
        if existing:
            print("Default teacher already exists.")
            return
        
        # Create default teacher
        default_teacher = User(
            name="Admin Teacher",
            email="admin@school.com",
            password=hash_password("admin123"),
            role="teacher"
        )
        
        db.add(default_teacher)
        db.commit()
        
        print("✅ Default teacher created successfully!")
        print("Email: admin@school.com")
        print("Password: admin123")
        
    except Exception as e:
        print(f"Error creating default teacher: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_default_teacher()