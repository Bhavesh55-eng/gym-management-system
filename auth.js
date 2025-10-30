// Authentication Functions

// Check if user is logged in
function checkAuth() {
    auth.onAuthStateChanged(user => {
        const currentPage = window.location.pathname.split('/').pop();
        
        if (!user && currentPage !== 'index.html' && currentPage !== '') {
            // User not logged in, redirect to login
            window.location.href = 'index.html';
        } else if (user && (currentPage === 'index.html' || currentPage === '')) {
            // User logged in, redirect to dashboard
            window.location.href = 'dashboard.html';
        }
    });
}

// Login function
function login(email, password) {
    return auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            console.log('Login successful:', userCredential.user);
            return { success: true, user: userCredential.user };
        })
        .catch(error => {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        });
}

// Logout function
function logout() {
    auth.signOut()
        .then(() => {
            console.log('Logout successful');
            window.location.href = 'index.html';
        })
        .catch(error => {
            console.error('Logout error:', error);
        });
}

// Get current user
function getCurrentUser() {
    return auth.currentUser;
}

// Initialize auth check on page load
document.addEventListener('DOMContentLoaded', checkAuth);
