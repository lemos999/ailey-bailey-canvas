/*
--- Ailey & Bailey Canvas ---
File: js/core/firebase.js
Version: 11.2 (Final Stable)
Description: Handles Firebase initialization and authentication.
*/

import { setState } from './state.js';

export async function initializeFirebase() {
    try {
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (!firebaseConfig) { throw new Error("Firebase config not found."); }
        if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
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
            const userPath = `artifacts/${appId}/users/${currentUser.uid}`;
            const notesCollection = db.collection(`${userPath}/notes`);
            const chatHistoryPath = `${userPath}/chatHistories/${canvasId}`;
            const chatSessionsCollectionRef = db.collection(`${chatHistoryPath}/sessions`);
            const projectsCollectionRef = db.collection(`${chatHistoryPath}/projects`);

            setState({ db, currentUser, notesCollection, chatSessionsCollectionRef, projectsCollectionRef });
        } else {
            throw new Error("Firebase authentication failed.");
        }
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        throw error;
    }
}
