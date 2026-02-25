"""
CRUD operations for database
"""
from sqlalchemy.orm import Session
from models import User, Student, Mark, Attendance
import hashlib

def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return hash_password(plain_password) == hashed_password

# User operations
def get_user_by_email(db: Session, email: str):
    """Get user by email"""
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, name: str, email: str, password: str, role: str):
    """Create a new user"""
    hashed_pw = hash_password(password)
    
    db_user = User(
        name=name,
        email=email,
        password=hashed_pw,
        role=role
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_all_teachers(db: Session):
    """Get all teachers"""
    return db.query(User).filter(User.role == "teacher").all()

# Student operations
def create_student(db: Session, student_data, teacher_id: int):
    """Create a new student"""
    print(f"Creating student: name={student_data.name}, email={student_data.email}, teacher_id={teacher_id}")
    
    # First create user account
    user = create_user(
        db=db,
        name=student_data.name,
        email=student_data.email,
        password=student_data.password,
        role="student"
    )
    
    print(f"User created: id={user.id}")
    
    # Then create student profile
    db_student = Student(
        user_id=user.id,
        class_name=student_data.class_name,
        roll_no=student_data.roll_no,
        teacher_id=teacher_id
    )
    
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    
    print(f"Student profile created: id={db_student.id}")
    
    # Fetch complete student with user info
    complete_student = db.query(Student).filter(Student.id == db_student.id).first()
    
    if complete_student and complete_student.user:
        print(f"Complete student loaded: id={complete_student.id}, user_name={complete_student.user.name}")
    
    return complete_student

def get_student_by_id(db: Session, student_id: int):
    """Get student by ID"""
    return db.query(Student).filter(Student.id == student_id).first()

def get_students_by_teacher(db: Session, teacher_id: int):
    """Get all students created by a teacher"""
    return db.query(Student).filter(Student.teacher_id == teacher_id).all()

def get_all_students(db: Session):
    """Get all students"""
    return db.query(Student).all()

# Marks operations
def create_mark(db: Session, mark_data):
    """Create new marks entry"""
    db_mark = Mark(
        student_id=mark_data.student_id,
        subject=mark_data.subject,
        marks=mark_data.marks
    )
    
    db.add(db_mark)
    db.commit()
    db.refresh(db_mark)
    return db_mark

def get_marks_by_student(db: Session, student_id: int):
    """Get all marks for a student"""
    return db.query(Mark).filter(Mark.student_id == student_id).all()

# Attendance operations
def create_attendance(db: Session, attendance_data):
    """Create new attendance entry"""
    db_attendance = Attendance(
        student_id=attendance_data.student_id,
        date=attendance_data.date,
        status=attendance_data.status
    )
    
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance

def get_attendance_by_student(db: Session, student_id: int):
    """Get all attendance for a student"""
    return db.query(Attendance).filter(Attendance.student_id == student_id).all()

# Dashboard operations
def get_dashboard_stats(db: Session):
    """Get dashboard statistics"""
    total_students = db.query(Student).count()
    total_teachers = db.query(User).filter(User.role == "teacher").count()
    
    # Get recent marks (last 10)
    recent_marks = db.query(Mark).order_by(Mark.id.desc()).limit(10).all()
    
    # Get recent attendance (last 10)
    recent_attendance = db.query(Attendance).order_by(Attendance.date.desc()).limit(10).all()
    
    return {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "recent_marks": recent_marks,
        "recent_attendance": recent_attendance
    }

def update_teacher(db, teacher_id: int, name: str, email: str, password: str):
    teacher = db.query(User).filter(
        User.id == teacher_id,
        User.role == "teacher"
    ).first()

    if not teacher:
        return None

    teacher.name = name
    teacher.email = email
    teacher.password = password

    db.commit()
    db.refresh(teacher)
    return teacher


def delete_teacher(db, teacher_id: int):
    teacher = db.query(User).filter(
        User.id == teacher_id,
        User.role == "teacher"
    ).first()

    if not teacher:
        return False

    db.delete(teacher)
    db.commit()
    return True


def update_student(
    db,
    student_id: int,
    name: str,
    email: str,
    password: str,
    class_name: str,
    roll_no: str
):
    student = db.query(Student).filter(Student.id == student_id).first()

    if not student:
        return None

    user = db.query(User).filter(User.id == student.user_id).first()

    # Update user table
    user.name = name
    user.email = email
    user.password = password

    # Update student table
    student.class_name = class_name
    student.roll_no = roll_no

    db.commit()
    db.refresh(student)
    return student


def delete_student(db, student_id: int):
    student = db.query(Student).filter(Student.id == student_id).first()

    if not student:
        return False

    user = db.query(User).filter(User.id == student.user_id).first()

    db.delete(student)
    db.delete(user)
    db.commit()
    return True
