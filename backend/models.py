"""
Database models
"""
from sqlalchemy import Column, Integer, String, ForeignKey, Date, Text, Float
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False)  # "teacher" or "student"
    
    # Relationships
    student_profile = relationship("Student", back_populates="user", uselist=False, foreign_keys="Student.user_id")
    created_students = relationship("Student", back_populates="teacher", foreign_keys="Student.teacher_id")

class Student(Base):
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    class_name = Column(String(50), nullable=False)
    roll_no = Column(String(20), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships - explicitly define foreign keys
    user = relationship("User", back_populates="student_profile", foreign_keys=[user_id])
    teacher = relationship("User", back_populates="created_students", foreign_keys=[teacher_id])
    marks = relationship("Mark", back_populates="student", cascade="all, delete-orphan")
    attendance = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")

class Mark(Base):
    __tablename__ = "marks"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    subject = Column(String(50), nullable=False)
    marks = Column(Float, nullable=False)
    
    # Relationships
    student = relationship("Student", back_populates="marks")

class Attendance(Base):
    __tablename__ = "attendance"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(String(10), nullable=False)  # "present" or "absent"
    
    # Relationships
    student = relationship("Student", back_populates="attendance")