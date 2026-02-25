"""
AI module using Google Gemini API
"""

import os
import json
import google.generativeai as genai
from typing import Dict, Any
from sqlalchemy.orm import Session
from crud import get_marks_by_student, get_attendance_by_student


# ---------------- CONFIGURE GEMINI ---------------- #

def configure_gemini():
    """Configure Gemini API with environment variable"""

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")

    genai.configure(api_key=api_key)


# ---------------- MAIN AI FUNCTION ---------------- #

def generate_student_report(student_id: int, db: Session) -> Dict[str, Any]:
    """Generate AI report for a student"""

    # Fetch data safely
    marks = get_marks_by_student(db, student_id) or []
    attendance = get_attendance_by_student(db, student_id) or []

    # If no marks → return early
    if len(marks) == 0:
        return {
            "weak_subjects": [],
            "tips": ["No marks data available for analysis"],
            "study_plan": "Please add marks data to generate a study plan",
            "summary": "Insufficient data for analysis",
            "success": False,
            "message": "No marks data found"
        }

    # ---------------- CALCULATIONS ---------------- #

    # Total + Average marks (safe)
    total_marks = sum(
        m.marks for m in marks if m.marks is not None
    )

    average_marks = (
        total_marks / len(marks)
        if len(marks) > 0 else 0
    )

    # Attendance stats
    total_days = len(attendance)

    present_days = len([
        a for a in attendance
        if a.status and a.status.lower() == "present"
    ])

    attendance_percentage = (
        (present_days / total_days) * 100
        if total_days > 0 else 0
    )

    # Weak subjects
    weak_subjects = [
        m.subject
        for m in marks
        if m.marks is not None and m.marks < 70
    ]

    # Prepare marks data for AI
    marks_data = [
        {
            "subject": m.subject,
            "marks": m.marks
        }
        for m in marks
    ]


    # ---------------- AI GENERATION ---------------- #

    try:

        # Setup Gemini
        configure_gemini()

        model = genai.GenerativeModel("gemini-pro")

        # Prompt
        prompt = f"""
Analyze the student's academic performance and generate a detailed report.

Student ID: {student_id}

Marks:
{marks_data}

Statistics:
- Average Marks: {average_marks:.2f}%
- Attendance: {attendance_percentage:.1f}% ({present_days}/{total_days})

Give response in JSON format with keys:
weak_subjects, tips, study_plan, summary
"""

        # Generate
        response = model.generate_content(prompt)

        text = response.text.strip()

        # Try to extract JSON
        try:

            start = text.find("{")
            end = text.rfind("}") + 1

            if start == -1 or end == -1:
                raise ValueError("JSON not found")

            json_text = text[start:end]

            result = json.loads(json_text)

        except Exception:
            # If AI JSON fails → manual parse
            result = parse_ai_response(text)

        result["success"] = True
        result["message"] = "Report generated successfully"

        return result


    # ---------------- FALLBACK ---------------- #

    except Exception:

        return generate_fallback_report(
            marks,
            weak_subjects,
            average_marks,
            attendance_percentage
        )


# ---------------- TEXT PARSER ---------------- #

def parse_ai_response(text: str) -> Dict[str, Any]:
    """Parse non-JSON AI response"""

    result = {
        "weak_subjects": [],
        "tips": [],
        "study_plan": "",
        "summary": ""
    }

    lines = text.split("\n")

    section = None

    for line in lines:

        line = line.strip()

        low = line.lower()

        if "weak" in low:
            section = "weak_subjects"

        elif "tip" in low:
            section = "tips"

        elif "study plan" in low:
            section = "study_plan"

        elif "summary" in low:
            section = "summary"

        elif line and section:

            if section in ["weak_subjects", "tips"]:

                clean = line.lstrip("*-0123456789. ")

                if clean:
                    result[section].append(clean)

            else:

                result[section] += line + " "


    # Clean strings
    for key in result:
        if isinstance(result[key], str):
            result[key] = result[key].strip()

    return result


# ---------------- FALLBACK REPORT ---------------- #

def generate_fallback_report(
    marks,
    weak_subjects,
    average_marks,
    attendance_percentage
):
    """Rule-based report when AI fails"""

    tips = [
        "Study daily with a fixed schedule",
        "Revise weak subjects regularly",
        "Practice previous year questions",
        "Ask teachers when confused",
        "Take short breaks while studying"
    ]

    if weak_subjects:

        study_plan = (
            f"Focus on {', '.join(weak_subjects[:3])}. "
            "Study each weak subject 1 hour daily."
        )

    else:

        study_plan = (
            "Maintain performance and focus on advanced topics."
        )


    if average_marks >= 80:

        summary = (
            f"Excellent performance. "
            f"Average: {average_marks:.1f}%, "
            f"Attendance: {attendance_percentage:.1f}%."
        )

    elif average_marks >= 70:

        summary = (
            f"Good performance. "
            f"Average: {average_marks:.1f}%. "
            "Needs slight improvement."
        )

    else:

        summary = (
            f"Needs improvement. "
            f"Average: {average_marks:.1f}%. "
            "Focus on basics."
        )


    return {
        "weak_subjects": weak_subjects,
        "tips": tips,
        "study_plan": study_plan,
        "summary": summary,
        "success": True,
        "message": "Report generated using fallback analysis"
    }