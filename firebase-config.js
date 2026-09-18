import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA-wcUPYUWfGq7eTE6gGwKTna-R4lWUrso",
    authDomain: "portfolio-db-9dbc4.firebaseapp.com",
    projectId: "portfolio-db-9dbc4",
    storageBucket: "portfolio-db-9dbc4.firebasestorage.app",
    messagingSenderId: "1045956750924",
    appId: "1:1045956750924:web:6ce3908234d64bbd2d8ee9",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);