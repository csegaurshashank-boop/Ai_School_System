/**
 * AI Report Page JavaScript
 */

// Global variables
let currentUser = null;
let currentToken = null;
let selectedStudentId = null;

// Initialize report page
document.addEventListener('DOMContentLoaded', async function() {
    // Get token from localStorage
    currentToken = localStorage.getItem('token');
    
    if (!currentToken) {
        // No token, redirect to login
        window.location.href = 'index.html';
        return;
    }
    
    // Initialize user info
    await initializeUser();
    
    // Setup based on user role
    if (currentUser.role === 'teacher') {
        await setupTeacherReport();
    } else {
        await setupStudentReport();
    }
    
    // Update datetime
    updateDateTime();
    setInterval(updateDateTime, 60000);
});

/**
 * Initialize user information
 */
async function initializeUser() {
    try {
        // Get user from localStorage
        const storedUser = JSON.parse(localStorage.getItem('user'));
        currentUser = storedUser;
        
        // Update UI with user info
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userRole').textContent = currentUser.role === 'teacher' ? 'Teacher' : 'Student';
        
    } catch (error) {
        console.error('Error initializing user:', error);
        showError('Failed to load user information');
    }
}

/**
 * Setup teacher report interface
 */
async function setupTeacherReport() {
    // Show teacher menu
    document.getElementById('teacherMenu').style.display = 'block';
    
    // Show student selection section
    document.getElementById('teacherReportSection').style.display = 'block';
    
    // Load students into dropdown
    await loadStudentsForReport();
    
    // Check if a student was selected from dashboard
    const storedStudentId = localStorage.getItem('selectedStudentId');
    if (storedStudentId) {
        document.getElementById('reportStudentSelect').value = storedStudentId;
        localStorage.removeItem('selectedStudentId');
        generateReportForSelectedStudent();
    }
    
    // Hide loading
    document.getElementById('loading').style.display = 'none';
}

/**
 * Setup student report interface
 */
async function setupStudentReport() {
    try {
        // Hide teacher section
        document.getElementById('teacherReportSection').style.display = 'none';
        
        // Get student ID from user profile
        const response = await fetch(`http://localhost:8000/api/students?token=${currentToken}`);
        
        if (response.ok) {
            const students = await response.json();
            if (students.length > 0) {
                selectedStudentId = students[0].id;
                
                // Update student info in UI
                const student = students[0];
                document.getElementById('reportStudentName').textContent = student.user.name;
                document.getElementById('reportStudentDetails').textContent = 
                    `${student.class_name} • Roll No: ${student.roll_no}`;
                
                // Generate report
                await generateReport();
            } else {
                showError('Student profile not found');
            }
        }
    } catch (error) {
        console.error('Error setting up student report:', error);
        showError('Failed to load student information');
    }
}

/**
 * Load students into dropdown for teacher selection
 */
async function loadStudentsForReport() {
    try {
        const response = await fetch(`http://localhost:8000/api/students?token=${currentToken}`);
        
        if (response.ok) {
            const students = await response.json();
            const dropdown = document.getElementById('reportStudentSelect');
            
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
        }
    } catch (error) {
        console.error('Error loading students:', error);
        showError('Failed to load students list');
    }
}

/**
 * Generate report for selected student (teacher)
 */
async function generateReportForSelectedStudent() {
    const studentId = document.getElementById('reportStudentSelect').value;
    
    if (!studentId) {
        showError('Please select a student first');
        return;
    }
    
    selectedStudentId = studentId;
    
    // Get student details
    try {
        const response = await fetch(`http://localhost:8000/api/students?token=${currentToken}`);
        
        if (response.ok) {
            const students = await response.json();
            const student = students.find(s => s.id == studentId);
            
            if (student) {
                document.getElementById('reportStudentName').textContent = student.user.name;
                document.getElementById('reportStudentDetails').textContent = 
                    `${student.class_name} • Roll No: ${student.roll_no}`;
                
                // Show report content area
                document.getElementById('teacherReportSection').style.display = 'none';
                document.getElementById('reportContent').style.display = 'block';
                
                // Generate AI report
                await generateReport();
            }
        }
    } catch (error) {
        console.error('Error loading student details:', error);
        showError('Failed to load student information');
    }
}

/**
 * Generate AI report
 */
async function generateReport() {
    if (!selectedStudentId) {
        showError('No student selected');
        return;
    }
    
    // Show loading state
    document.getElementById('loading').style.display = 'block';
    document.getElementById('reportContent').style.display = 'none';
    
    try {
        const response = await fetch(`http://localhost:8000/api/ai-report?token=${currentToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: parseInt(selectedStudentId) })
        });
        
        if (response.ok) {
            const report = await response.json();
            
            if (report.success) {
                updateReportUI(report);
                
                // Hide loading, show report
                document.getElementById('loading').style.display = 'none';
                document.getElementById('reportContent').style.display = 'block';
                
                // Show success message
                showSuccess('AI report generated successfully!');
            } else {
                throw new Error(report.message || 'Failed to generate report');
            }
        } else {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to generate report');
        }
    } catch (error) {
        console.error('Error generating report:', error);
        document.getElementById('loading').style.display = 'none';
        showError(error.message || 'Failed to generate AI report. Please try again.');
    }
}

/**
 * Update report UI with data
 */
function updateReportUI(report) {
    // Update weak subjects
    const weakSubjectsList = document.getElementById('weakSubjectsList');
    weakSubjectsList.innerHTML = '';
    
    if (report.weak_subjects && report.weak_subjects.length > 0) {
        report.weak_subjects.forEach(subject => {
            const li = document.createElement('li');
            li.textContent = subject;
            weakSubjectsList.appendChild(li);
        });
    } else {
        weakSubjectsList.innerHTML = '<li>No weak subjects identified</li>';
    }
    
    // Update improvement tips
    const tipsList = document.getElementById('improvementTipsList');
    tipsList.innerHTML = '';
    
    if (report.tips && report.tips.length > 0) {
        report.tips.forEach(tip => {
            const li = document.createElement('li');
            li.textContent = tip;
            tipsList.appendChild(li);
        });
    } else {
        tipsList.innerHTML = '<li>No specific tips available</li>';
    }
    
    // Update study plan
    const studyPlanContent = document.getElementById('studyPlanContent');
    if (report.study_plan) {
        studyPlanContent.innerHTML = `<p>${report.study_plan}</p>`;
    } else {
        studyPlanContent.innerHTML = '<p>Study plan not available</p>';
    }
    
    // Update summary
    const summaryContent = document.getElementById('summaryContent');
    if (report.summary) {
        summaryContent.innerHTML = `<p>${report.summary}</p>`;
    } else {
        summaryContent.innerHTML = '<p>Summary not available</p>';
    }
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
    document.getElementById('currentDateTime').textContent = now.toLocaleDateString('en-US', options);
}

/**
 * Show error message
 */
function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
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
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message success';
    messageDiv.textContent = message;
    
    // Insert at top of content area
    const contentArea = document.querySelector('.content-area');
    contentArea.insertBefore(messageDiv, contentArea.firstChild);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

/**
 * Go to specific section in dashboard
 */
function goToDashboardSection(section) {
    // Store section in localStorage and redirect
    localStorage.setItem('dashboardSection', section);
    window.location.href = 'dashboard.html';
}

/**
 * Logout function
 */
async function logout() {
    try {
        await fetch(`http://localhost:8000/api/logout?token=${currentToken}`);
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    // Clear localStorage and redirect
    localStorage.clear();
    window.location.href = 'index.html';
}

// Make functions available globally
window.generateReportForSelectedStudent = generateReportForSelectedStudent;
window.generateReport = generateReport;
window.goToDashboardSection = goToDashboardSection;
window.logout = logout;