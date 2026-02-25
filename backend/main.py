"""
FastAPI application main file
"""
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from fastapi import FastAPI, Depends, HTTPException, Query, status
from database import get_db
from database import engine
from models import Base, User, Student, Mark, Attendance
from schemas import (
    LoginResponse,
    UserLogin,
    UserCreate,
    UserResponse,
    StudentCreate,
    StudentResponse,
    MarkCreate,
    MarkResponse,
    AttendanceCreate,
    AttendanceResponse,
    AIReportRequest,
    AIReportResponse
)

from crud import (
    get_user_by_email,
    get_all_teachers,
    get_all_students,
    get_student_by_id,
    get_students_by_teacher,
    get_marks_by_student,
    get_attendance_by_student,
    get_dashboard_stats,
    verify_password,
    hash_password
)
from auth import TokenManager
import ai


# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI School Management System")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependency to validate token
# Dependency to validate token
def get_current_user(token: str = Query(...), db: Session = Depends(get_db)):
    """Validate token and return user"""
    print(f"\n🔐 Validating token: {token[:20]}...")
    
    token_data = TokenManager.validate_token(token)
    if not token_data:
        print("❌ Token validation failed")
        TokenManager.list_tokens()
        raise HTTPException(
            status_code=401, 
            detail="Invalid or expired token. Please login again."
        )
    
    user_id = token_data["user_id"]
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        print(f"❌ User not found for ID: {user_id}")
        raise HTTPException(status_code=404, detail="User not found")
    
    print(f"✅ Token valid for user: {user.name} ({user.role})")
    return user

def require_teacher(user: User = Depends(get_current_user)):
    """Check if user is a teacher"""

    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    return user

# API Endpoints

@app.post("/api/login", response_model=LoginResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login endpoint"""
    user = get_user_by_email(db, credentials.email)
    
    if not user or not verify_password(credentials.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate token
    token = TokenManager.create_token(user.id, user.role)
    
    return {
        "token": token,
        "user": user,
        "message": "Login successful"
    }

@app.post("/api/logout")
def logout(token: str = Query(...)):
    """Logout endpoint"""
    if TokenManager.remove_token(token):
        return {"message": "Logout successful"}
    return {"message": "Token not found"}

# Teacher endpoints
@app.post("/api/teachers", response_model=UserResponse)
def create_teacher(
    user_data: UserCreate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """Create a new teacher"""

    # Check if email already exists
    existing = get_user_by_email(db, user_data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # ✅ Create teacher manually (no wrong function call)
    new_teacher = User(
        name=user_data.name,
        email=user_data.email,
        password=user_data.password,
        role="teacher"
    )

    db.add(new_teacher)
    db.commit()
    db.refresh(new_teacher)

    return new_teacher

@app.get("/api/teachers", response_model=List[UserResponse])
def get_teachers(
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """Get all teachers"""
    return get_all_teachers(db)

# Student endpoints
@app.post("/api/students")
def create_student(
    student: StudentCreate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """Create student (Only Teacher)"""

    # ✅ Check if email already exists
    existing = get_user_by_email(db, student.email)
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Create user for student
    new_user = User(
        name=student.name,
        email=student.email,
        password=student.password,
        role="student"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create student profile
    new_student = Student(
        user_id=new_user.id,
        class_name=student.class_name,
        roll_no=student.roll_no,
        teacher_id=current_user.id
    )

    db.add(new_student)
    db.commit()

    return {
        "message": "Student created successfully",
        "student": {
            "id": new_student.id,
            "name": new_user.name,
            "email": new_user.email,
            "class_name": new_student.class_name,
            "roll_no": new_student.roll_no
        }
    }

@app.get("/api/students", response_model=List[StudentResponse])
def get_students(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all students (teachers see all, students see only themselves)"""
    if current_user.role == "teacher":
        return get_all_students(db)
    else:
        # Students can only see their own profile
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        return [student] if student else []

# Marks endpoints
@app.post("/api/marks", response_model=MarkResponse)
def create_mark(
    mark_data: MarkCreate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """Create marks for a student"""

    # ✅ Use mark_data, not db
    student = get_student_by_id(db, mark_data.student_id)

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # ✅ Create mark
    new_mark = Mark(
        student_id=mark_data.student_id,
        subject=mark_data.subject,
        marks=mark_data.marks
    )

    db.add(new_mark)
    db.commit()
    db.refresh(new_mark)

    return new_mark


@app.get("/api/marks/{student_id}", response_model=List[MarkResponse])
def get_marks(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get marks for a student"""
    # Authorization check
    if current_user.role == "student":
        # Students can only see their own marks
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student or student.id != student_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    marks = get_marks_by_student(db, student_id)
    return marks

# Attendance endpoints
@app.post("/api/attendance", response_model=AttendanceResponse)
def create_attendance(
    attendance_data: AttendanceCreate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """Create attendance record"""

    # ✅ Use attendance_data, not db
    student = get_student_by_id(db, attendance_data.student_id)

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # ✅ Create attendance
    new_attendance = Attendance(
        student_id=attendance_data.student_id,
        date=attendance_data.date,
        status=attendance_data.status
    )

    db.add(new_attendance)
    db.commit()
    db.refresh(new_attendance)

    return new_attendance


@app.get("/api/attendance/{student_id}", response_model=List[AttendanceResponse])
def get_attendance(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get attendance for a student"""
    # Authorization check
    if current_user.role == "student":
        # Students can only see their own attendance
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student or student.id != student_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    attendance = get_attendance_by_student(db, student_id)
    return attendance

# Dashboard endpoint
@app.get("/api/dashboard")
def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dashboard data"""
    stats = get_dashboard_stats(db)
    
    # For teachers, add their student count
    if current_user.role == "teacher":
        my_students = get_students_by_teacher(db, current_user.id)
        stats["my_students_count"] = len(my_students)
        stats["my_students"] = my_students
    
    return stats

# AI Report endpoint
@app.post("/api/ai-report", response_model=AIReportResponse)
def generate_ai_report(
    report_request: AIReportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate AI report for a student"""
    # Authorization check
    if current_user.role == "student":
        # Students can only generate reports for themselves
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student or student.id != report_request.student_id:
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        # Teachers can generate reports for any student
        student = get_student_by_id(db, report_request.student_id)
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
    
    # Generate AI report
    report = ai.generate_student_report(report_request.student_id, db)
    return report
@app.get("/api/debug/students")
def debug_students(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug endpoint to check students"""
    try:
        # Get all users
        users = db.query(User).all()
        users_list = []
        for user in users:
            users_list.append({
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role
            })
        
        # Get all students
        students = db.query(Student).all()
        students_list = []
        for student in students:
            students_list.append({
                "id": student.id,
                "user_id": student.user_id,
                "class": student.class_name,
                "roll_no": student.roll_no,
                "teacher_id": student.teacher_id
            })
        
        return {
            "users": users_list,
            "students": students_list,
            "user_count": len(users_list),
            "student_count": len(students_list)
        }
    except Exception as e:
        return {"error": str(e)}
@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "AI School Management System API",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/api/debug/token")
def debug_token(token: str = Query(...)):
    """Debug endpoint to check token status"""
    token_data = TokenManager.validate_token(token)
    
    if token_data:
        TokenManager.list_tokens()
        return {
            "valid": True,
            "user_id": token_data["user_id"],
            "role": token_data["role"],
            "created_at": token_data["created_at"].isoformat(),
            "expires_at": token_data["expires_at"].isoformat(),
            "total_tokens": len(token)
        }
    else:
        TokenManager.list_tokens()
        return {
            "valid": False,
            "message": "Token not found or expired",
            "total_tokens": len(token)
        }
    
@app.put("/api/students/{student_id}")
def update_student(
    student_id: int,
    student: StudentCreate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """Update student details"""

    db_student = db.query(Student).filter(Student.id == student_id).first()

    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Update User table
    user = db.query(User).filter(User.id == db_student.user_id).first()

    user.name = student.name
    user.email = student.email
    user.password = student.password

    # Update Student table
    db_student.class_name = student.class_name
    db_student.roll_no = student.roll_no

    db.commit()

    return {"message": "Student updated successfully"}

@app.delete("/api/students/{student_id}")
def delete_student(
    student_id: int,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """Delete student"""

    student = db.query(Student).filter(Student.id == student_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Delete related user also
    user = db.query(User).filter(User.id == student.user_id).first()

    db.delete(student)
    db.delete(user)

    db.commit()

    return {"message": "Student deleted successfully"}


@app.put("/api/teachers/{teacher_id}")
def update_teacher(
    teacher_id: int,
    teacher: UserCreate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):

    # Only self update OR admin logic
    if current_user.id != teacher_id:
        raise HTTPException(403, "You can only edit your profile")

    db_teacher = db.query(User).filter(
        User.id == teacher_id,
        User.role == "teacher"
    ).first()

    if not db_teacher:
        raise HTTPException(404, "Teacher not found")

    db_teacher.name = teacher.name
    db_teacher.email = teacher.email
    db_teacher.password = teacher.password

    db.commit()

    return {"message": "Teacher updated"}


@app.delete("/api/teachers/{teacher_id}")
def delete_teacher(
    teacher_id: int,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):

    if current_user.id == teacher_id:
        raise HTTPException(400, "Cannot delete yourself")

    teacher = db.query(User).filter(
        User.id == teacher_id,
        User.role == "teacher"
    ).first()

    if not teacher:
        raise HTTPException(404, "Teacher not found")

    db.delete(teacher)
    db.commit()

    return {"message": "Teacher deleted"}
