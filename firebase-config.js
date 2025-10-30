// Firebase Configuration
// Replace with your Firebase project credentials from Firebase Console

const firebaseConfig = {
  apiKey: "AIzaSyDyB8rR_KAnddrS6y7X9aB1rZWr53TbPXc",
  authDomain: "gym-management-system-2c01c.firebaseapp.com",
  projectId: "gym-management-system-2c01c",
  storageBucket: "gym-management-system-2c01c.firebasestorage.app",
  messagingSenderId: "315848533791",
  appId: "1:315848533791:web:654819f3b71d4d445eb22a"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Initialize Auth
const auth = firebase.auth();

// Collection references
const membersRef = db.collection('members');
const trainersRef = db.collection('trainers');
const paymentsRef = db.collection('payments');
const attendanceRef = db.collection('attendance');
const equipmentRef = db.collection('equipment');

// Helper function to generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Helper function to format date
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}

// Helper function to calculate expiry date
function calculateExpiryDate(joinDate, durationMonths) {
    const date = new Date(joinDate);
    date.setMonth(date.getMonth() + parseInt(durationMonths));
    return formatDate(date);
}
