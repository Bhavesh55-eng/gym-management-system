// Firebase Configuration
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Initialize Firebase
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Logging configuration
const logActions = true; // Set to false in production

export const logger = {
    info: (message, data = null) => {
        if (logActions) {
            console.log(`[INFO] ${new Date().toISOString()}: ${message}`, data);
        }
    },
    error: (message, error = null) => {
        if (logActions) {
            console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error);
        }
    },
    warn: (message, data = null) => {
        if (logActions) {
            console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, data);
        }
    }
};
