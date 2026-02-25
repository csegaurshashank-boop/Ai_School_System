/**
 * Login Page JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
        // Validate token by fetching user info
        fetch(`http://localhost:8000/api/dashboard?token=${token}`)
            .then(response => {
                if (response.ok) {
                    // Token is valid, redirect to dashboard
                    window.location.href = 'dashboard.html';
                } else {
                    // Token is invalid, clear it
                    localStorage.removeItem('token');
                }
            })
            .catch(() => {
                localStorage.removeItem('token');
            });
    }

    // Form submission handler
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Show loading state
        messageDiv.className = 'message';
        messageDiv.textContent = 'Logging in...';
        messageDiv.style.display = 'block';
        
        try {
            const response = await fetch('http://localhost:8000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Store token in localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Show success message
                messageDiv.className = 'message success';
                messageDiv.textContent = data.message;
                
                // Redirect to dashboard after short delay
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                // Show error message
                messageDiv.className = 'message error';
                messageDiv.textContent = data.detail || 'Login failed';
            }
        } catch (error) {
            console.error('Login error:', error);
            messageDiv.className = 'message error';
            messageDiv.textContent = 'Connection error. Please check if backend is running.';
        }
    });

    // Set default credentials for demo
    document.getElementById('email').value = 'admin@school.com';
    document.getElementById('password').value = 'admin123';
});