// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyA-wCUPYUwfGq7eTE6ggwKTna-R4lWUrso",
    authDomain: "portfolio-db-9dbc4.firebaseapp.com",
    projectId: "portfolio-db-9dbc4",
    storageBucket: "portfolio-db-9dbc4.firebasestorage.app",
    messagingSenderId: "1045956750924",
    appId: "1:1045956750924:web:6ce3908234d64bbd2d8ee9"
};

// Initialize Firebase using global Compat API
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Global Firebase Instances
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

// Enable Firestore Local Cache for Instant Data Loading
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
    if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence failed: Multiple tabs open.');
    } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence not supported by browser.');
    }
});