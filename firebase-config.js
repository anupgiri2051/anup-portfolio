// Firebase Configuration
// Note: these keys are NOT secret. Every Firebase website sends them to the browser.
// What protects your data is firestore.rules + the console settings in SECURITY.md.
const firebaseConfig = {
    apiKey: "AIzaSyA-wcUPYUWfGq7eTE6gGwKTna-R4lWUrso",
    authDomain: "portfolio-db-9dbc4.firebaseapp.com",
    projectId: "portfolio-db-9dbc4",
    storageBucket: "portfolio-db-9dbc4.firebasestorage.app",
    messagingSenderId: "1045956750924",
    appId: "1:1045956750924:web:6ce3908234d64bbd2d8ee9"
};

// App Check (blocks bots and scripts that talk to your database directly).
// Paste your reCAPTCHA v3 SITE key here to switch it on (see SECURITY.md, step 4).
// The site key is public, so it is safe to put here. Never paste the SECRET key.
const APP_CHECK_SITE_KEY = "";

// Initialize Firebase using global Compat API
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

if (APP_CHECK_SITE_KEY && typeof firebase.appCheck === "function") {
    try { firebase.appCheck().activate(APP_CHECK_SITE_KEY, true); }
    catch (e) { console.warn("App Check could not start:", e); }
}

// Global Firebase Instances
const db = firebase.firestore();
// Authentication is only loaded on the admin page
const auth = typeof firebase.auth === "function" ? firebase.auth() : null;

// Offline cache for instant loading, but ONLY on the public website.
// The admin portal is never cached, so private messages are not left on the device after you sign out.
const IS_ADMIN_PAGE = /^\/admin(\/|\.html|$)/.test(location.pathname);
if (IS_ADMIN_PAGE) {
    // remove any copy cached by older versions of this site
    db.clearPersistence().catch(() => {});
} else {
    db.enablePersistence({ synchronizeTabs: true }).catch(err => {
        if (err.code === 'failed-precondition') {
            console.warn('Firestore persistence failed: Multiple tabs open.');
        } else if (err.code === 'unimplemented') {
            console.warn('Firestore persistence not supported by browser.');
        }
    });
}
