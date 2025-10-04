import { auth, db, logger } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail 
} from 'firebase/auth';
import { 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    addDoc 
} from 'firebase/firestore';

// Authentication state management
let currentUser = null;

// Initialize auth state listener
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        logger.info('User authenticated', { uid: user.uid, email: user.email });
        redirectToDashboard(user);
    } else {
        logger.info('User logged out');
        currentUser = null;
    }
});

// Modal management
function openLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
    logger.info('Login modal opened');
}

function openSignupModal() {
    document.getElementById('signupModal').style.display = 'block';
    logger.info('Signup modal opened');
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    logger.info('Modal closed', { modalId });
}

function switchModal(fromModal, toModal) {
    closeModal(fromModal);
    document.getElementById(toModal).style.display = 'block';
    logger.info('Modal switched', { from: fromModal, to: toModal });
}

// User registration
async function registerUser(userData) {
    try {
        logger.info('Starting user registration', { email: userData.email });
        
        const userCredential = await createUserWithEmailAndPassword(
            auth, 
            userData.email, 
            userData.password
        );
        
        const user = userCredential.user;
        
        // Create user profile in Firestore
        const userProfile = {
            uid: user.uid,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            phone: userData.phone,
            role: 'member', // Default role
            joinDate: new Date(),
            membershipStatus: 'inactive',
            membershipPlan: null,
            profileComplete: false
        };
        
        await setDoc(doc(db, 'users', user.uid), userProfile);
        
        logger.info('User registered successfully', { uid: user.uid });
        
        // Log registration activity
        await logUserActivity(user.uid, 'registration', 'User registered successfully');
        
        closeModal('signupModal');
        showNotification('Registration successful! Welcome to GymFlex!', 'success');
        
        return user;
    } catch (error) {
        logger.error('Registration failed', error);
        showNotification(`Registration failed: ${error.message}`, 'error');
        throw error;
    }
}

// User login
async function loginUser(email, password) {
    try {
        logger.info('Starting user login', { email });
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Log login activity
        await logUserActivity(user.uid, 'login', 'User logged in successfully');
        
        closeModal('loginModal');
        showNotification('Login successful!', 'success');
        
        logger.info('User logged in successfully', { uid: user.uid });
        
        return user;
    } catch (error) {
        logger.error('Login failed', error);
        showNotification(`Login failed: ${error.message}`, 'error');
        throw error;
    }
}

// User logout
async function logoutUser() {
    try {
        if (currentUser) {
            await logUserActivity(currentUser.uid, 'logout', 'User logged out');
        }
        
        await signOut(auth);
        logger.info('User logged out successfully');
        showNotification('Logged out successfully!', 'success');
        
        // Redirect to home page
        window.location.href = '/public/index.html';
    } catch (error) {
        logger.error('Logout failed', error);
        showNotification(`Logout failed: ${error.message}`, 'error');
    }
}

// Get user role
async function getUserRole(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            return userDoc.data().role || 'member';
        }
        return 'member';
    } catch (error) {
        logger.error('Failed to get user role', error);
        return 'member';
    }
}

// Redirect to appropriate dashboard
async function redirectToDashboard(user) {
    const role = await getUserRole(user.uid);
    
    switch (role) {
        case 'admin':
            window.location.href = '/admin/admin-dashboard.html';
            break;
        case 'member':
            window.location.href = '/member/member-dashboard.html';
            break;
        case 'user':
            window.location.href = '/user/user-dashboard.html';
            break;
        default:
            logger.warn('Unknown user role', { role });
            window.location.href = '/member/member-dashboard.html';
    }
}

// Log user activity
async function logUserActivity(uid, action, description) {
    try {
        const activityLog = {
            uid: uid,
            action: action,
            description: description,
            timestamp: new Date(),
            ip: await getUserIP(), // You'll need to implement this
            userAgent: navigator.userAgent
        };
        
        await addDoc(collection(db, 'activityLogs'), activityLog);
        logger.info('Activity logged', { action, uid });
    } catch (error) {
        logger.error('Failed to log activity', error);
    }
}

// Get user IP (simplified version)
async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        logger.error('Failed to get user IP', error);
        return 'unknown';
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Form event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            try {
                await loginUser(email, password);
            } catch (error) {
                // Error already handled in loginUser function
            }
        });
    }
    
    // Signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (password !== confirmPassword) {
                showNotification('Passwords do not match!', 'error');
                return;
            }
            
            const userData = {
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                email: document.getElementById('signupEmail').value,
                phone: document.getElementById('phone').value,
                password: password
            };
            
            try {
                await registerUser(userData);
            } catch (error) {
                // Error already handled in registerUser function
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

// Plan selection
function selectPlan(planName, price) {
    if (!currentUser) {
        openSignupModal();
        showNotification('Please sign up to select a membership plan.', 'info');
        return;
    }
    
    // Store selected plan in localStorage temporarily
    localStorage.setItem('selectedPlan', JSON.stringify({
        name: planName,
        price: price,
        timestamp: new Date()
    }));
    
    // Redirect to payment or membership page
    window.location.href = '/member/membership-payment.html';
    
    logger.info('Plan selected', { planName, price, uid: currentUser.uid });
}

// Pricing toggle
function togglePlan(type) {
    const buttons = document.querySelectorAll('.toggle-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    event.target.classList.add('active');
    
    // Update pricing based on selection
    const basicPrice = document.getElementById('basic-price');
    const premiumPrice = document.getElementById('premium-price');
    const vipPrice = document.getElementById('vip-price');
    
    if (type === 'annually') {
        // Apply 20% discount for annual plans
        basicPrice.textContent = '19,190'; // 1999 * 12 * 0.8
        premiumPrice.textContent = '40,310'; // 4199 * 12 * 0.8
        vipPrice.textContent = '71,990'; // 7499 * 12 * 0.8
    } else {
        basicPrice.textContent = '1,999';
        premiumPrice.textContent = '4,199';
        vipPrice.textContent = '7,499';
    }
    
    logger.info('Pricing toggle changed', { type });
}

// Export functions for global access
window.openLoginModal = openLoginModal;
window.openSignupModal = openSignupModal;
window.closeModal = closeModal;
window.switchModal = switchModal;
window.selectPlan = selectPlan;
window.togglePlan = togglePlan;
window.logoutUser = logoutUser;
