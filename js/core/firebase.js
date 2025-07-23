/*
--- Ailey & Bailey Canvas ---
File: js/core/firebase.js
Version: 11.0 (Modular)
Description: Handles Firebase initialization and authentication.
*/

import { getState, setState } from './state.js';

/**
 * Initializes the Firebase app and sets up authentication and Firestore references.
 * @returns {Promise<void>}
 */
export async function initializeFirebase() {
    try {
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        
        if (!firebaseConfig) {
            throw new Error("Firebase config not found.");
        }
        
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        const auth = firebase.auth();
        const db = firebase.firestore();

        if (initialAuthToken) {
            await auth.signInWithCustomToken(initialAuthToken).catch(async (err) => {
                console.warn("Custom token sign-in failed, trying anonymous.", err);
                await auth.signInAnonymously();
            });
        } else {
            await auth.signInAnonymously();
        }

        const currentUser = auth.currentUser;

        if (currentUser) {
            const appId = 'AileyBailey_Global_Space';
            const canvasId = document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id';
            const userPath = rtifacts/\/users/\;
            const notesCollection = db.collection(\/notes);
            const chatHistoryPath = \/chatHistories/\;
            const chatSessionsCollectionRef = db.collection(\/sessions);
            const projectsCollectionRef = db.collection(\/projects);

            setState({
                db,
                currentUser,
                notesCollection,
                chatSessionsCollectionRef,
                projectsCollectionRef,
            });

        } else {
             throw new Error("Firebase authentication failed.");
        }
    } catch (error) {
        console.error("Firebase initialization or authentication failed:", error);
        // We can't use domElements here as they might not be initialized.
        // The main script will handle displaying the error message.
        throw error; // Re-throw to be caught by the main initializer
    }
}
