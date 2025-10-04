// Import Firebase modules from CDN (works without npm install)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Your Firebase configuration (from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyDyB8rR_KAnddrS6y7X9aB1rZWr53TbPXc",
  authDomain: "gym-management-system-2c01c.firebaseapp.com",
  projectId: "gym-management-system-2c01c",
  storageBucket: "gym-management-system-2c01c.firebasestorage.app",
  messagingSenderId: "315848533791",
  appId: "1:315848533791:web:654819f3b71d4d445eb22a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Test connection (you'll see this in browser console)
console.log("🔥 Firebase initialized successfully!");
console.log("✅ Project ID:", firebaseConfig.projectId);
console.log("✅ Auth Domain:", firebaseConfig.authDomain);

// Simple logging system
export const logger = {
    info: (message, data = null) => {
        console.log(`[INFO] ${new Date().toLocaleTimeString()}: ${message}`, data || '');
    },
    error: (message, error = null) => {
        console.error(`[ERROR] ${new Date().toLocaleTimeString()}: ${message}`, error || '');
    },
    success: (message, data = null) => {
        console.log(`[SUCCESS] ${new Date().toLocaleTimeString()}: ${message}`, data || '');
    }
};

// Export app for other modules that might need it
export default app;
