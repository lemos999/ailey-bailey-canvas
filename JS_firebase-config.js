/* --- JS_firebase-config.js --- */
import { getCanvasId, setCurrentUser } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_state.js';
import { listenToNotes } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_notes-module.js';
import { listenToChatSessions, listenToProjects } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_chat-module.js';
import { setupSystemInfoWidget } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_ui-helpers.js';

export let db;
export let auth;
export let notesCollection;
export let chatSessionsCollectionRef;
export let projectsCollectionRef;

export async function initializeFirebase() {
    try {
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (!firebaseConfig) { throw new Error("Firebase config not found."); }
        if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
        
        auth = firebase.auth();
        db = firebase.firestore();
        
        if (initialAuthToken) {
            await auth.signInWithCustomToken(initialAuthToken).catch(async (err) => {
               console.warn("Custom token sign-in failed, trying anonymous.", err);
               await auth.signInAnonymously();
            });
        } else {
            await auth.signInAnonymously();
        }
        
        setCurrentUser(auth.currentUser);
        const currentUser = auth.currentUser;

        if (currentUser) {
            const appId = 'AileyBailey_Global_Space';
            const canvasId = getCanvasId();
            const userPath = rtifacts/\/users/\;
            notesCollection = db.collection(\/notes);
            const chatHistoryPath = \/chatHistories/\;
            chatSessionsCollectionRef = db.collection(\/sessions);
            projectsCollectionRef = db.collection(\/projects);

            await Promise.all([
                listenToNotes(),
                listenToChatSessions(),
                listenToProjects()
            ]);
            
            setupSystemInfoWidget();
        }
    } catch (error) {
        console.error("Firebase 초기화 또는 인증 실패:", error);
        throw error;
    }
}
