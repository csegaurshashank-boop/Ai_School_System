/**
 * Dashboard JavaScript
 */

// Global variables
let currentUser = null;
let currentToken = null;
let allStudents = [];

// Token management functions
function getToken() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No token found in localStorage');
        logout();
        return null;
    }
    return token;
}

function validateToken() {
    const token = getToken();
    if (!token) {
        return false;
    }

    // Check if we have user data
    const user = localStorage.getItem('user');
    if (!user) {
        console.error('No user data found');
        return false;
    }

    return true;
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function () {
    console.log('Dashboard loading...');

    // Validate token
    if (!validateToken()) {
        window.location.href = 'index.html';
        return;
    }

    currentToken = getToken();
    console.log('Token retrieved:', currentToken ? 'Yes' : 'No');

    try {
        // Initialize user info and dashboard
        await initializeUser();
        await loadDashboard();

        // Update datetime every minute
        updateDateTime();
        setInterval(updateDateTime, 60000);

        // Setup form handlers
        setupFormHandlers();

        // Setup section switching
        setupSectionNavigation();

    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize dashboard. Please login again.');
        setTimeout(() => logout(), 2000);
    }
});

/**
 * Initialize user information
 */
async function initializeUser() {
    try {
        console.log('Initializing user...');

        const response = await fetch(`http://localhost:8000/api/dashboard?token=${currentToken}`);

        if (!response.ok) {
            if (response.status === 401) {
                console.log('Token expired, redirecting to login');
                logout();
                return;
            }
            throw new Error(`HTTP ${response.status}: Failed to load user data`);
        }

        const data = await response.json();

        // Get user from localStorage
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (!storedUser) {
            throw new Error('User data not found in localStorage');
        }

        currentUser = storedUser;

        // Update UI with user info
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userRole').textContent = currentUser.role === 'teacher' ? 'Teacher' : 'Student';
        document.getElementById('welcomeMessage').textContent = `Welcome back, ${currentUser.name}!`;

        // Show/hide menu based on role
        if (currentUser.role === 'teacher') {
            document.getElementById('teacherMenu').style.display = 'block';
        } else {
            document.getElementById('studentMenu').style.display = 'block';
        }

        console.log('User initialized:', currentUser.name, currentUser.role);

    } catch (error) {
        console.error('Error initializing user:', error);
        throw error;
    }
}

/**
 * Load dashboard data
 */
async function loadDashboard() {
    try {
        console.log('Loading dashboard data...');

        const response = await fetch(`http://localhost:8000/api/dashboard?token=${currentToken}`);

        if (!response.ok) {
            if (response.status === 401) {
                logout();
                return;
            }
            throw new Error(`HTTP ${response.status}: Failed to load dashboard`);
        }

        const data = await response.json();
        console.log('Dashboard data received:', data);

        // Update stats
        document.getElementById('totalStudents').textContent = data.total_students || 0;
        document.getElementById('totalTeachers').textContent = data.total_teachers || 0;

        // Teacher-specific stats
        if (currentUser.role === 'teacher') {
            document.getElementById('myStudentsCard').style.display = 'flex';
            document.getElementById('myStudentsCount').textContent = data.my_students_count || 0;
            allStudents = data.my_students || [];
        }

        // Update recent marks table
        updateRecentMarksTable(data.recent_marks || []);

        // Update recent attendance table
        updateRecentAttendanceTable(data.recent_attendance || []);

        // Hide loading, show content
        document.getElementById('loading').style.display = 'none';
        document.getElementById('dashboardContent').style.display = 'block';

        console.log('Dashboard loaded successfully');

    } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('loading').style.display = 'none';
        showError('Failed to load dashboard data. Please refresh the page.');
    }
}

/**
 * Update recent marks table
 */
function updateRecentMarksTable(marks) {
    const tbody = document.querySelector('#recentMarksTable tbody');
    tbody.innerHTML = '';

    if (!marks || marks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">No marks data available</td></tr>';
        return;
    }

    marks.forEach(mark => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>Student ${mark.student_id}</td>
            <td>${mark.subject}</td>
            <td><strong>${mark.marks}</strong></td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Update recent attendance table
 */
function updateRecentAttendanceTable(attendance) {
    const tbody = document.querySelector('#recentAttendanceTable tbody');
    tbody.innerHTML = '';

    if (!attendance || attendance.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">No attendance data available</td></tr>';
        return;
    }

    attendance.forEach(record => {
        const date = new Date(record.date);
        const formattedDate = date.toLocaleDateString();

        const row = document.createElement('tr');
        const statusClass = record.status === 'present' ? 'success' : 'error';
        row.innerHTML = `
            <td>Student ${record.student_id}</td>
            <td>${formattedDate}</td>
            <td><span class="${statusClass}">${record.status}</span></td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Update current date and time
 */
function updateDateTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    const dateTimeString = now.toLocaleDateString('en-US', options);
    document.getElementById('currentDateTime').textContent = dateTimeString;
}

/**
 * Show error message
 */
function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    errorDiv.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

/**
 * Show success message
 */
function showSuccess(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message success';
    messageDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;

    // Insert at top of content area
    const contentArea = document.querySelector('.content-area');
    contentArea.insertBefore(messageDiv, contentArea.firstChild);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

/**
 * Setup form handlers
 */
function setupFormHandlers() {
    console.log('Setting up form handlers...');

    // Add Teacher Form
    const addTeacherForm = document.getElementById('addTeacherForm');
    if (addTeacherForm) {
        addTeacherForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            await handleAddTeacher();
        });
    }

    // Add Student Form
    const addStudentForm = document.getElementById('addStudentForm');
    if (addStudentForm) {
        addStudentForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            await handleAddStudent();
        });
    }

    // Add Marks Form
    const addMarksForm = document.getElementById('addMarksForm');
    if (addMarksForm) {
        // Load students into dropdown
        loadStudentsDropdown('marksStudent');

        addMarksForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            await handleAddMarks();
        });
    }

    // Add Attendance Form
    const addAttendanceForm = document.getElementById('addAttendanceForm');
    if (addAttendanceForm) {
        // Load students into dropdown
        loadStudentsDropdown('attendanceStudent');

        // Set today's date as default
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('attendanceDate').value = today;

        addAttendanceForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            await handleAddAttendance();
        });
    }
}

/**
 * Handle add teacher form submission
 */
async function handleAddTeacher() {
    const name = document.getElementById('teacherName').value;
    const email = document.getElementById('teacherEmail').value;
    const password = document.getElementById('teacherPassword').value;

    const submitBtn = document.querySelector('#addTeacherForm button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`http://localhost:8000/api/teachers?token=${currentToken}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                name,
                email,
                password,
                role: 'teacher'
            })
        });

        console.log('Add teacher response:', response.status);

        if (response.ok) {
            const data = await response.json();
            showSuccess(`Teacher "${data.name}" added successfully!`);
            document.getElementById('addTeacherForm').reset();
            await loadTeachersTable();
        } else {
            const error = await response.json();
            showError(error.detail || 'Failed to add teacher');
        }
    } catch (error) {
        console.error('Add teacher error:', error);
        showError('Connection error. Please check backend is running.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * Handle add student form submission
 */
async function handleAddStudent() {
    const name = document.getElementById('studentName').value;
    const email = document.getElementById('studentEmail').value;
    const className = document.getElementById('studentClass').value;
    const rollNo = document.getElementById('studentRollNo').value;
    const password = document.getElementById('studentPassword').value;

    console.log('Adding student:', { name, email, class_name: className, roll_no: rollNo });

    const submitBtn = document.querySelector('#addStudentForm button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`http://localhost:8000/api/students?token=${currentToken}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                name,
                email,
                class_name: className,
                roll_no: rollNo,
                password
            })
        });

        console.log('Add student response status:', response.status);

        if (response.ok) {
            const student = await response.json();
            showSuccess(`Student "${student.user.name}" added successfully!`);
            document.getElementById('addStudentForm').reset();

            // Refresh data
            await loadStudentsTable();
            await loadDashboard();
            await loadStudentsDropdown('marksStudent');
            await loadStudentsDropdown('attendanceStudent');

        } else {
            const error = await response.json();
            console.error('Add student error response:', error);
            showError(error.detail || `Failed to add student (Status: ${response.status})`);
        }
    } catch (error) {
        console.error('Add student error:', error);
        showError('Connection error. Please check: 1) Backend is running on port 8000, 2) No CORS errors');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * Handle add marks form submission
 */
async function handleAddMarks() {
    const studentId = document.getElementById('marksStudent').value;
    const subject = document.getElementById('marksSubject').value;
    const marks = parseFloat(document.getElementById('marksValue').value);

    if (!studentId) {
        showError('Please select a student');
        return;
    }

    const submitBtn = document.querySelector('#addMarksForm button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`http://localhost:8000/api/marks?token=${currentToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: parseInt(studentId),
                subject,
                marks
            })
        });

        if (response.ok) {
            showSuccess('Marks added successfully!');
            document.getElementById('addMarksForm').reset();
            await loadDashboard();
        } else {
            const error = await response.json();
            showError(error.detail || 'Failed to add marks');
        }
    } catch (error) {
        showError('Connection error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * Handle add attendance form submission
 */
async function handleAddAttendance() {
    const studentId = document.getElementById('attendanceStudent').value;
    const date = document.getElementById('attendanceDate').value;
    const status = document.getElementById('attendanceStatus').value;

    if (!studentId) {
        showError('Please select a student');
        return;
    }

    const submitBtn = document.querySelector('#addAttendanceForm button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`http://localhost:8000/api/attendance?token=${currentToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: parseInt(studentId),
                date,
                status
            })
        });

        if (response.ok) {
            showSuccess('Attendance recorded successfully!');
            document.getElementById('addAttendanceForm').reset();
            // Set date back to today
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('attendanceDate').value = today;
            await loadDashboard();
        } else {
            const error = await response.json();
            showError(error.detail || 'Failed to record attendance');
        }
    } catch (error) {
        showError('Connection error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * Load students into dropdown
 */
async function loadStudentsDropdown(dropdownId) {
    try {
        const response = await fetch(`http://localhost:8000/api/students?token=${currentToken}`);

        if (response.ok) {
            const students = await response.json();
            const dropdown = document.getElementById(dropdownId);

            // Clear existing options except first
            while (dropdown.options.length > 1) {
                dropdown.remove(1);
            }

            // Add student options
            students.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = `${student.user.name} (${student.class_name} - ${student.roll_no})`;
                dropdown.appendChild(option);
            });

            console.log(`Loaded ${students.length} students into ${dropdownId}`);
        }
    } catch (error) {
        console.error('Error loading students dropdown:', error);
    }
}

/**
 * Load teachers table
 */
async function loadTeachersTable() {
    try {
        const response = await fetch(`http://localhost:8000/api/teachers?token=${currentToken}`);

        if (response.ok) {
            const teachers = await response.json();
            const tbody = document.querySelector('#teachersTable tbody');
            tbody.innerHTML = '';

            teachers.forEach(teacher => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${teacher.id}</td>
                    <td>${teacher.name}</td>
                    <td>${teacher.email}</td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="viewTeacher(${teacher.id})">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="editTeacher(${teacher.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteTeacher(${teacher.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading teachers:', error);
    }
}

/**
 * Load students table
 */
async function loadStudentsTable() {
    try {
        const response = await fetch(`http://localhost:8000/api/students?token=${currentToken}`);

        if (response.ok) {
            const students = await response.json();
            const tbody = document.querySelector('#studentsTable tbody');
            tbody.innerHTML = '';

            students.forEach(student => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${student.id}</td>
                    <td>${student.user.name}</td>
                    <td>${student.class_name}</td>
                    <td>${student.roll_no}</td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="viewStudent(${student.id})">
                            <i class="fas fa-eye"></i>
                        </button>

                        <button class="btn btn-secondary btn-sm" onclick="editStudent(${student.id})">
                            <i class="fas fa-edit"></i>
                        </button>


                        <button class="btn btn-primary btn-sm" onclick="generateReport(${student.id})">
                            <i class="fas fa-robot"></i>
                        </button>

                        <button class="btn btn-danger btn-sm" onclick="deleteStudent(${student.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            console.log(`Loaded ${students.length} students into table`);
        }

    } catch (error) {
        console.error('Error loading students:', error);
    }
}


/**
 * Load student marks
 */
async function loadStudentMarks() {
    if (currentUser.role !== 'student') return;

    try {
        // Get student ID from user
        const response = await fetch(`http://localhost:8000/api/students?token=${currentToken}`);

        if (response.ok) {
            const students = await response.json();
            if (students.length > 0) {
                const studentId = students[0].id;

                // Fetch marks
                const marksResponse = await fetch(`http://localhost:8000/api/marks/${studentId}?token=${currentToken}`);

                if (marksResponse.ok) {
                    const marks = await marksResponse.json();
                    const tbody = document.querySelector('#myMarksTable tbody');
                    tbody.innerHTML = '';

                    marks.forEach(mark => {
                        const grade = getGrade(mark.marks);
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${mark.subject}</td>
                            <td><strong>${mark.marks}</strong></td>
                            <td><span class="${grade.class}">${grade.letter}</span></td>
                        `;
                        tbody.appendChild(row);
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error loading marks:', error);
    }
}

/**
 * Load student attendance
 */
async function loadStudentAttendance() {
    if (currentUser.role !== 'student') return;

    try {
        // Get student ID from user
        const response = await fetch(`http://localhost:8000/api/students?token=${currentToken}`);

        if (response.ok) {
            const students = await response.json();
            if (students.length > 0) {
                const studentId = students[0].id;

                // Fetch attendance
                const attendanceResponse = await fetch(`http://localhost:8000/api/attendance/${studentId}?token=${currentToken}`);

                if (attendanceResponse.ok) {
                    const attendance = await attendanceResponse.json();
                    const tbody = document.querySelector('#myAttendanceTable tbody');
                    tbody.innerHTML = '';

                    attendance.forEach(record => {
                        const date = new Date(record.date);
                        const formattedDate = date.toLocaleDateString();

                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${formattedDate}</td>
                            <td><span class="${record.status === 'present' ? 'success' : 'error'}">${record.status}</span></td>
                        `;
                        tbody.appendChild(row);
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
    }
}

/**
 * Calculate grade from marks
 */
function getGrade(marks) {
    if (marks >= 90) return { letter: 'A+', class: 'success' };
    if (marks >= 80) return { letter: 'A', class: 'success' };
    if (marks >= 70) return { letter: 'B', class: 'info' };
    if (marks >= 60) return { letter: 'C', class: 'warning' };
    if (marks >= 50) return { letter: 'D', class: 'warning' };
    return { letter: 'F', class: 'error' };
}

/**
 * Setup section navigation
 */
function setupSectionNavigation() {
    // Set dashboard home as default
    showSection('dashboardHome');
}

/**
 * Show specific section
 */
function showSection(sectionId) {
    console.log('Showing section:', sectionId);

    // Hide all sections
    const sections = document.querySelectorAll('.dashboard-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    // Show selected section
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.style.display = 'block';

        // Load data for the section
        switch (sectionId) {
            case 'manageTeachers':
                loadTeachersTable();
                break;
            case 'manageStudents':
                loadStudentsTable();
                break;
            case 'viewMarks':
                loadStudentMarks();
                break;
            case 'viewAttendance':
                loadStudentAttendance();
                break;
        }
    }
}

/**
 * View teacher details
 */
function viewTeacher(teacherId) {
    showSuccess(`Teacher ID ${teacherId} selected`);
}

/**
 * View student details
 */
function viewStudent(studentId) {
    showSuccess(`Student ID ${studentId} selected`);
}

/**
 * Generate AI report for student
 */
function generateReport(studentId) {
    // Store student ID and redirect to report page
    if (studentId) {
        localStorage.setItem('selectedStudentId', studentId.toString());
    }
    window.location.href = 'report.html';
}

/**
 * Logout function
 */
async function logout() {
    console.log('Logging out...');

    try {
        if (currentToken) {
            await fetch(`http://localhost:8000/api/logout?token=${currentToken}`, {
                method: 'POST'
            });
        }
    } catch (error) {
        console.error('Logout API error:', error);
    } finally {
        // Clear localStorage and redirect
        localStorage.clear();
        window.location.href = 'index.html';
    }
}

async function deleteStudent(studentId) {

    if (!confirm("Are you sure you want to delete this student?")) {
        return;
    }

    try {

        const response = await fetch(
            `http://localhost:8000/api/students/${studentId}?token=${currentToken}`,
            {
                method: "DELETE"
            }
        );

        const data = await response.json();

        if (response.ok) {

            showSuccess("Student deleted successfully ✅");

            await loadStudentsTable();
            await loadDashboard();

        } else {

            showError(data.detail || "Delete failed ❌");

        }

    } catch (error) {

        console.error("Delete Error:", error);
        showError("Server error while deleting student");

    }
}
async function editStudent(id) {

    const name = prompt("Enter new name:");
    const email = prompt("Enter new email:");
    const className = prompt("Enter class:");
    const roll = prompt("Enter roll:");
    const pass = prompt("Enter password:");

    if (!name || !email) return;

    const data = {
        name,
        email,
        class_name: className,
        roll_no: roll,
        password: pass
    };

    try {
        const res = await fetch(
            `http://localhost:8000/api/students/${id}?token=${currentToken}`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            }
        );

        if (res.ok) {
            showSuccess("Student updated");
            loadStudentsTable();
        } else {
            const err = await res.json();
            showError(err.detail);
        }

    } catch {
        showError("Update failed");
    }
}
// ================= DELETE TEACHER =================

async function deleteTeacher(teacherId) {

    if (!confirm("Are you sure you want to delete this teacher?")) {
        return;
    }

    try {

        const response = await fetch(
            `http://localhost:8000/api/teachers/${teacherId}?token=${currentToken}`,
            {
                method: "DELETE"
            }
        );

        if (response.ok) {

            showSuccess("Teacher deleted successfully!");

            // Reload table
            await loadTeachersTable();

        } else {

            const error = await response.json();
            showError(error.detail || "Failed to delete teacher");

        }

    } catch (error) {

        console.error("Delete error:", error);
        showError("Connection error");

    }
}

// ================= UPDATE TEACHER =================

async function updateTeacher(teacherId) {

    // Get new values
    const name = prompt("Enter new name:");
    const email = prompt("Enter new email:");
    const password = prompt("Enter new password:");

    if (!name || !email || !password) {
        showError("All fields are required!");
        return;
    }

    try {

        const response = await fetch(
            `http://localhost:8000/api/teachers/${teacherId}?token=${currentToken}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: password,
                    role: "teacher"
                })
            }
        );

        if (response.ok) {

            showSuccess("Teacher updated successfully!");
            await loadTeachersTable();

        } else {

            const error = await response.json();
            showError(error.detail || "Update failed");

        }

    } catch (error) {

        console.error("Update error:", error);
        showError("Connection error");

    }
}
// =======================
// EDIT TEACHER
// =======================
function editTeacher(id, name, email) {

    const newName = prompt("Enter New Name:", name);
    if (!newName) return;

    const newEmail = prompt("Enter New Email:", email);
    if (!newEmail) return;

    const newPassword = prompt("Enter New Password:");
    if (!newPassword) return;

    updateTeacher(id, newName, newEmail, newPassword);
}


// =======================
// UPDATE TEACHER API CALL
// =======================
async function updateTeacher(id, name, email, password) {

    try {
        const response = await fetch(
            `http://localhost:8000/api/teachers/${id}?token=${currentToken}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    role: "teacher"
                })
            }
        );

        if (response.ok) {
            showSuccess("Teacher updated successfully!");
            loadTeachersTable();
        } else {
            const error = await response.json();
            showError(error.detail || "Update failed");
        }

    } catch (err) {
        console.error(err);
        showError("Connection error");
    }
}


// =======================
// DELETE TEACHER
// =======================
async function deleteTeacher(id) {

    if (!confirm("Are you sure you want to delete this teacher?")) {
        return;
    }

    try {
        const response = await fetch(
            `http://localhost:8000/api/teachers/${id}?token=${currentToken}`,
            {
                method: "DELETE"
            }
        );

        if (response.ok) {
            showSuccess("Teacher deleted successfully!");
            loadTeachersTable();
        } else {
            const error = await response.json();
            showError(error.detail || "Delete failed");
        }

    } catch (err) {
        console.error(err);
        showError("Connection error");
    }
}



window.editTeacher = editTeacher;
window.updateTeacher = updateTeacher;
window.deleteTeacher = deleteTeacher;




// Make functions available globally
window.showSection = showSection;
window.viewTeacher = viewTeacher;
window.viewStudent = viewStudent;
window.generateReport = generateReport;
window.deleteStudent = deleteStudent;
window.logout = logout;
window.deleteStudent = deleteStudent;
window.editStudent = editStudent;
window.deleteTeacher = deleteTeacher;
window.updateTeacher = updateTeacher;

