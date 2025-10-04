// Import Firebase functions with correct CDN links
import { auth, db, logger } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    doc, 
    setDoc, 
    getDoc,
    collection,
    addDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Global variable to track current user
let currentUser = null;

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        logger.success("User logged in", user.email);
        // Don't redirect immediately, let user stay on current page
        updateUIForLoggedInUser(user);
    } else {
        logger.info("User logged out");
        updateUIForLoggedOutUser();
    }
});

// Update UI based on login status
function updateUIForLoggedInUser(user) {
    // Hide login/signup buttons if they exist
    const loginBtn = document.querySelector('.btn-login');
    const signupBtn = document.querySelector('.btn-signup');
    
    if (loginBtn && signupBtn) {
        loginBtn.style.display = 'none';
        signupBtn.textContent = 'Dashboard';
        signupBtn.onclick = () => redirectToDashboard();
    }
}

function updateUIForLoggedOutUser() {
    // Show login/signup buttons if they exist
    const loginBtn = document.querySelector('.btn-login');
    const signupBtn = document.querySelector('.btn-signup');
    
    if (loginBtn && signupBtn) {
        loginBtn.style.display = 'block';
        signupBtn.textContent = 'Sign Up';
        signupBtn.onclick = () => openSignupModal();
    }
}

// Redirect to appropriate dashboard
async function redirectToDashboard() {
    if (!currentUser) {
        logger.error("No user logged in");
        return;
    }
    
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const role = userData.role || 'member';
            
            switch (role) {
                case 'admin':
                    window.location.href = '../admin/admin-dashboard.html';
                    break;
                case 'member':
                    window.location.href = '../member/member-dashboard.html';
                    break;
                default:
                    window.location.href = '../member/member-dashboard.html';
            }
        }
    } catch (error) {
        logger.error("Error getting user data", error);
        // Default to member dashboard
        window.location.href = '../member/member-dashboard.html';
    }
}

// Sign up new user
async function signUpUser(email, password, firstName, lastName, phone) {
    try {
        logger.info("Starting user registration", email);
        
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Save additional user data to Firestore
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            firstName: firstName,
            lastName: lastName,
            email: email,
            phone: phone,
            role: 'member',
            joinDate: new Date(),
            membershipStatus: 'inactive',
            membershipPlan: null,
            profileComplete: true
        });
        
        logger.success("User registered successfully", user.email);
        showNotification("Account created successfully! Welcome to GymFlex!", "success");
        closeModal('signupModal');
        
        return user;
        
    } catch (error) {
        logger.error("Registration failed", error.message);
        showNotification("Registration failed: " + error.message, "error");
        throw error;
    }
}

// Login existing user
async function loginUser(email, password) {
    try {
        logger.info("Attempting login", email);
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        logger.success("Login successful", user.email);
        showNotification("Login successful! Welcome back!", "success");
        closeModal('loginModal');
        
        // Small delay before redirect
        setTimeout(() => {
            redirectToDashboard();
        }, 1000);
        
        return user;
        
    } catch (error) {
        logger.error("Login failed", error.message);
        
        // Provide user-friendly error messages
        let errorMessage = "Login failed: ";
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage += "No account found with this email.";
                break;
            case 'auth/wrong-password':
                errorMessage += "Incorrect password.";
                break;
            case 'auth/invalid-email':
                errorMessage += "Invalid email address.";
                break;
            case 'auth/too-many-requests':
                errorMessage += "Too many failed attempts. Please try again later.";
                break;
            default:
                errorMessage += error.message;
        }
        
        showNotification(errorMessage, "error");
        throw error;
    }
}

// Logout user
async function logoutUser() {
    try {
        await signOut(auth);
        logger.success("User logged out");
        showNotification("Logged out successfully!", "success");
        
        // Redirect to home page
        window.location.href = '../public/index.html';
        
    } catch (error) {
        logger.error("Logout failed", error);
        showNotification("Logout failed: " + error.message, "error");
    }
}

// Show notification to user
function showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;
    
    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#10B981';
            break;
        case 'error':
            notification.style.backgroundColor = '#EF4444';
            break;
        case 'warning':
            notification.style.backgroundColor = '#F59E0B';
            break;
        default:
            notification.style.backgroundColor = '#3B82F6';
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Modal functions
function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'block';
        logger.info("Login modal opened");
    }
}

function openSignupModal() {
    const modal = document.getElementById('signupModal');
    if (modal) {
        modal.style.display = 'block';
        logger.info("Signup modal opened");
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        logger.info("Modal closed", modalId);
    }
}

function switchModal(fromModal, toModal) {
    closeModal(fromModal);
    const toModalElement = document.getElementById(toModal);
    if (toModalElement) {
        toModalElement.style.display = 'block';
        logger.info("Modal switched", `${fromModal} -> ${toModal}`);
    }
}

// Form event listeners
document.addEventListener('DOMContentLoaded', function() {
    logger.info("Auth.js loaded successfully");
    
    // Login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            if (!email || !password) {
                showNotification("Please fill in all fields", "error");
                return;
            }
            
            try {
                await loginUser(email, password);
            } catch (error) {
                // Error already handled in loginUser function
            }
        });
    }
    
    // Signup form handler
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const phone = document.getElementById('phone').value;
            
            // Validation
            if (!email || !password || !firstName || !lastName || !phone) {
                showNotification("Please fill in all fields", "error");
                return;
            }
            
            if (password !== confirmPassword) {
                showNotification("Passwords do not match!", "error");
                return;
            }
            
            if (password.length < 6) {
                showNotification("Password must be at least 6 characters", "error");
                return;
            }
            
            try {
                await signUpUser(email, password, firstName, lastName, phone);
            } catch (error) {
                // Error already handled in signUpUser function
            }
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const loginModal = document.getElementById('loginModal');
        const signupModal = document.getElementById('signupModal');
        
        if (event.target === loginModal) {
            closeModal('loginModal');
        }
        if (event.target === signupModal) {
            closeModal('signupModal');
        }
    });
});

// Export functions for global access
window.openLoginModal = openLoginModal;
window.openSignupModal = openSignupModal;
window.closeModal = closeModal;
window.switchModal = switchModal;
window.logoutUser = logoutUser;
window.redirectToDashboard = redirectToDashboard;
