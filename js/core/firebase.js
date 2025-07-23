/*
--- Module: firebase.js ---
Description: Handles Firebase initialization and authentication.
*/
import { setDb, setAuth, setNotesCollection, setChatSessionsCollection, setProjectsCollection, getState, getDb, getAuth } from './state.js';

export async function initializeFirebase() {
    try {
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
        if (!firebaseConfig) {
            throw new Error("Firebase config not found. Make sure it's provided.");
        }

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        setDb(firebase.firestore());
        setAuth(firebase.auth());

        console.log("Firebase initialized successfully.");

    } catch (error) {
        console.error("Firebase Initialization Failed:", error);
        throw error; // Re-throw to be caught by the main initializer
    }
}

export function setupAuthListener() {
    return new Promise((resolve, reject) => {
        const auth = getAuth();
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            unsubscribe(); // We only need to know the initial auth state
            if (user) {
                console.log("User is signed in:", user.uid);
                setupCollections(user.uid);
                resolve(user);
            } else {
                try {
                    console.log("No user signed in, attempting anonymous sign-in.");
                    const userCredential = await auth.signInAnonymously();
                    setupCollections(userCredential.user.uid);
                    resolve(userCredential.user);
                } catch (error) {
                    console.error("Anonymous sign-in failed:", error);
                    reject(error);
                }
            }
        });
    });
}

function setupCollections(uid) {
    const state = getState();
    const db = getDb();
    const userPath = `artifacts/${state.appId}/users/${uid}`;
    const chatHistoryPath = `${userPath}/chatHistories/${state.canvasId}`;

    setNotesCollection(db.collection(`${userPath}/notes`));
    setChatSessionsCollection(db.collection(`${chatHistoryPath}/sessions`));
    setProjectsCollection(db.collection(`${chatHistoryPath}/projects`));

    console.log("Firestore collections configured for user:", uid);
}