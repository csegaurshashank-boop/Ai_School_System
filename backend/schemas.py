"""
Pydantic schemas for data validation
"""
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from datetime import date

# User schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)

# Student schemas
class StudentBase(BaseModel):
    class_name: str
    roll_no: str

class StudentCreate(StudentBase):
    name: str
    email: EmailStr
    password: str

class StudentResponse(StudentBase):
    id: int
    user_id: int
    teacher_id: int
    user: UserResponse
    
    model_config = ConfigDict(from_attributes=True)

# Marks schemas
class MarkBase(BaseModel):
    subject: str
    marks: float

class MarkCreate(MarkBase):
    student_id: int

class MarkResponse(MarkBase):
    id: int
    student_id: int
    
    model_config = ConfigDict(from_attributes=True)

# Attendance schemas
class AttendanceBase(BaseModel):
    student_id: int
    date: date
    status: str

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceResponse(AttendanceBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)

# Dashboard schemas
class DashboardStats(BaseModel):
    total_students: int
    total_teachers: int
    recent_marks: List[MarkResponse]
    recent_attendance: List[AttendanceResponse]

# AI Report schemas
class AIReportRequest(BaseModel):
    student_id: int

class AIReportResponse(BaseModel):
    weak_subjects: List[str]
    tips: List[str]
    study_plan: str
    summary: str
    success: bool
    message: Optional[str] = None

# Login response
class LoginResponse(BaseModel):
    token: str
    user: UserResponse
    message: str