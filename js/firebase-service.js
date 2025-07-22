/*
--- Ailey & Bailey Canvas ---
File: js/firebase-service.js
Version: 11.0 (Refactored)
Architect: [Username] & System Architect Ailey
Description: Handles all communication with Firebase services, including initialization, authentication, and Firestore data listeners. Decouples Firebase logic from UI logic.
*/

import * as state from './state.js';

export async function initializeFirebase(onNotesUpdate, onSessionsUpdate, onProjectsUpdate) {
    try {
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (!firebaseConfig) { throw new Error("Firebase config not found."); }
        if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }

        const auth = firebase.auth();
        state.setDb(firebase.firestore());

        if (initialAuthToken) {
            await auth.signInWithCustomToken(initialAuthToken).catch(async (err) => {
               console.warn("Custom token sign-in failed, trying anonymous.", err);
               await auth.signInAnonymously();
            });
        } else {
            await auth.signInAnonymously();
        }

        state.setCurrentUser(auth.currentUser);

        if (state.currentUser) {
            const userPath = `artifacts/${state.appId}/users/${state.currentUser.uid}`;
            state.setNotesCollection(state.db.collection(`${userPath}/notes`));
            
            const chatHistoryPath = `${userPath}/chatHistories/${document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id'}`;
            state.setChatSessionsCollectionRef(state.db.collection(`${chatHistoryPath}/sessions`));
            state.setProjectsCollectionRef(state.db.collection(`${chatHistoryPath}/projects`));

            await Promise.all([
                listenTo(state.notesCollection, "updatedAt", "desc", onNotesUpdate, state.setUnsubscribeFromNotes),
                listenTo(state.chatSessionsCollectionRef, null, null, onSessionsUpdate, state.setUnsubscribeFromChatSessions),
                listenTo(state.projectsCollectionRef, null, null, onProjectsUpdate, state.setUnsubscribeFromProjects)
            ]);
            
            return true; // Initialization successful
        }
        return false; // User not found
    } catch (error) {
        console.error("Firebase initialization or authentication failed:", error);
        // Propagate the error or handle it as needed
        throw error;
    }
}

// Generic listener function
async function listenTo(collectionRef, orderByField, orderDirection, callback, setUnsubscribe) {
    return new Promise((resolve, reject) => {
        if (!collectionRef) return resolve();
        
        // Clear previous listener
        if (typeof setUnsubscribe === 'function' && state[setUnsubscribe.name.replace('set', 'get')]) {
            state[setUnsubscribe.name.replace('set', 'get')]();
        }

        let query = collectionRef;
        if (orderByField && orderDirection) {
            query = query.orderBy(orderByField, orderDirection);
        }

        const unsubscribe = query.onSnapshot(snapshot => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(data);
            resolve();
        }, error => {
            console.error("Firestore listener error:", error);
            reject(error);
        });

        if (typeof setUnsubscribe === 'function') {
            setUnsubscribe(unsubscribe);
        }
    });
}