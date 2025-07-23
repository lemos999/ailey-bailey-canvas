import { state, setState } from './state.js';
import { listenToNotes } from '../features/notes/notes.js';
import { listenToChatSessions } from '../features/chat/session.js';
import { listenToProjects } from '../features/chat/project.js';
import { setupSystemInfoWidget } from './utils.js';

export async function initializeFirebase() {
    try {
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (!firebaseConfig) { throw new Error("Firebase config not found."); }
        if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
        
        const auth = firebase.auth();
        setState('db', firebase.firestore());
        
        if (initialAuthToken) {
            await auth.signInWithCustomToken(initialAuthToken).catch(async (err) => {
               console.warn("Custom token sign-in failed, trying anonymous.", err);
               await auth.signInAnonymously();
            });
        } else {
            await auth.signInAnonymously();
        }
        
        setState('currentUser', auth.currentUser);

        if (state.currentUser) {
            const userPath = rtifacts//users/;
            const notesCollection = state.db.collection(${userPath}/notes);
            const chatHistoryPath = ${userPath}/chatHistories/;
            const chatSessionsCollectionRef = state.db.collection(${chatHistoryPath}/sessions);
            const projectsCollectionRef = state.db.collection(${chatHistoryPath}/projects);
            
            setState({ notesCollection, chatSessionsCollectionRef, projectsCollectionRef });

            await Promise.all([
                listenToNotes(),
                listenToChatSessions(),
                listenToProjects()
            ]);
            
            setupSystemInfoWidget();
        }
    } catch (error) {
        console.error("Firebase 초기화 또는 인증 실패:", error);
        // DOM 요소는 dom.js에서 관리하므로 직접 참조하지 않음
    }
}
