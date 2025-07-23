/* --- Module: Firebase Management --- */
import { getCanvasId } from 'https://lemos999.github.io/ailey-bailey-canvas/modules/state.js';
import { listenToNotes } from 'https://lemos999.github.io/ailey-bailey-canvas/modules/notes.js';
import { listenToChatSessions, listenToProjects } from 'https://lemos999.github.io/ailey-bailey-canvas/modules/chat.js';
import { setupSystemInfoWidget } from 'https://lemos999.github.io/ailey-bailey-canvas/modules/ui.js';

export let db;
export let auth;
export let currentUser;
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
        
        currentUser = auth.currentUser;

        if (currentUser) {
            const appId = 'AileyBailey_Global_Space';
            const canvasId = getCanvasId();
            const userPath = rtifacts/\/users/\;
            notesCollection = db.collection(\/notes);
            const chatHistoryPath = \/chatHistories/\;
            chatSessionsCollectionRef = db.collection(\/sessions);
            projectsCollectionRef = db.collection(\/projects);

            //순환 종속성 문제를 피하기 위해, 리스너 함수들을 초기화 후에 호출합니다.
            await Promise.all([
                listenToNotes(),
                listenToChatSessions(),
                listenToProjects()
            ]);
            
            setupSystemInfoWidget();
        }
    } catch (error) {
        console.error("Firebase 초기화 또는 인증 실패:", error);
        // 에러 발생 시 UI에 메시지를 표시하는 로직은 각 모듈에서 처리하도록 위임
        throw error; // 에러를 다시 던져서 초기화 실패를 알림
    }
}
