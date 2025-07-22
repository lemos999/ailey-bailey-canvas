/*
--- Ailey & Bailey Canvas ---
File: firebase-config.js
Version: 11.0 (JS Module Structure)
Architect: [Username] & System Architect CodeMaster
Description: Handles the initialization of the Firebase application and authentication. It exports the necessary Firebase service instances for other modules to use.
*/

let db;
let auth;

export async function initializeFirebase() {
    try {
        // These variables are expected to be globally available in the final HTML, injected by the server or another script.
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

        if (!firebaseConfig) {
            throw new Error("Firebase config object (__firebase_config) not found.");
        }

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        auth = firebase.auth();
        db = firebase.firestore();
        
        if (initialAuthToken) {
            await auth.signInWithCustomToken(initialAuthToken).catch(async (err) => {
               console.warn("Custom token sign-in failed, falling back to anonymous sign-in.", err);
               await auth.signInAnonymously();
            });
        } else {
            console.warn("No initial auth token provided, using anonymous sign-in.");
            await auth.signInAnonymously();
        }

        console.log("Firebase initialized and user signed in:", auth.currentUser ? auth.currentUser.uid : 'No user');

    } catch (error) {
        console.error("CRITICAL: Firebase initialization failed.", error);
        // Re-throw the error to be caught by the main initializer
        throw error;
    }
}

export function getDb() {
    return db;
}

export function getAuth() {
    return auth;
}