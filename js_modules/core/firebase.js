/*
 * firebase.js: Handles Firebase initialization and authentication.
 */
import * as State from './state.js';
import * as Dom from '../utils/domElements.js';
import { listenToNotes, renderNoteList } from '../ui/notes.js';
import { listenToChatSessions, listenToProjects, handleNewChat, renderChatMessages } from '../ui/chat/main.js';
import { setupSystemInfoWidget } from '../ui/tooltips.js';

export async function initializeFirebase() {
    try {
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (!firebaseConfig) { throw new Error("Firebase config not found."); }
        if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
        
        const auth = firebase.auth();
        State.setDb(firebase.firestore());
        
        if (initialAuthToken) {
            await auth.signInWithCustomToken(initialAuthToken).catch(async (err) => {
               console.warn("Custom token sign-in failed, trying anonymous.", err);
               await auth.signInAnonymously();
            });
        } else {
            await auth.signInAnonymously();
        }
        
        State.setCurrentUser(auth.currentUser);

        if (State.currentUser) {
            const userPath = +'rtifacts//users/'+;
            State.setNotesCollection(State.db.collection(+'${userPath}/notes'+));
            
            const chatHistoryPath = +'${userPath}/chatHistories/'+;
            State.setChatSessionsCollectionRef(State.db.collection(+'${chatHistoryPath}/sessions'+));
            State.setProjectsCollectionRef(State.db.collection(+'${chatHistoryPath}/projects'+));

            await Promise.all([
                listenToNotes(),
                listenToChatSessions(),
                listenToProjects()
            ]);
            
            setupSystemInfoWidget();
        }
    } catch (error) {
        console.error("Firebase 초기화 또는 인증 실패:", error);
        if (Dom.notesList) Dom.notesList.innerHTML = '<div>클라우드 메모장을 불러오는 데 실패했습니다.</div>';
        if (Dom.chatMessages) Dom.chatMessages.innerHTML = '<div>AI 러닝메이트 연결에 실패했습니다.</div>';
    }
}
