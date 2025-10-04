// Import Firebase functions
import { auth, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js';
import { 
    doc, 
    setDoc, 
    getDoc 
} from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js';

// Check if user is logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is logged in:", user.email);
    } else {
        console.log("User is not logged in");
    }
});

// Sign Up Function
async function signUpUser(email, password, firstName, lastName, phone) {
    try {
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Save user data to database
        await setDoc(doc(db, 'users', user.uid), {
            firstName: firstName,
            lastName: lastName,
            email: email,
            phone: phone,
            role: 'member',
            joinDate: new Date(),
            membershipStatus: 'inactive'
        });
        
        alert("Account created successfully!");
        closeModal('signupModal');
        
    } catch (error) {
        alert("Error: " + error.message);
    }
}

// Login Function
async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        alert("Login successful!");
        closeModal('loginModal');
        
        // Redirect to dashboard
        window.location.href = 'member/member-dashboard.html';
        
    } catch (error) {
        alert("Error: " + error.message);
    }
}

// Logout Function
async function logoutUser() {
    try {
        await signOut(auth);
        alert("Logged out successfully!");
        window.location.href = 'index.html';
    } catch (error) {
        alert("Error: " + error.message);
    }
}

// Modal Functions
function openLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

function openSignupModal() {
    document.getElementById('signupModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function switchModal(fromModal, toModal) {
    closeModal(fromModal);
    document.getElementById(toModal).style.display = 'block';
}

// Form Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            loginUser(email, password);
        });
    }
    
    // Signup Form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const phone = document.getElementById('phone').value;
            
            signUpUser(email, password, firstName, lastName, phone);
        });
    }
});

// Make functions available globally
window.openLoginModal = openLoginModal;
window.openSignupModal = openSignupModal;
window.closeModal = closeModal;
window.switchModal = switchModal;
window.logoutUser = logoutUser;
