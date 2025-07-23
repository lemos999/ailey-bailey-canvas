// js/core/firebase.js
// Firebase 초기화, 인증 및 Firestore 참조 생성 로직을 캡슐화합니다.
import * as State from './state.js';

/**
 * Firebase를 초기화하고 사용자 인증을 수행합니다.
 * 성공 시 Firestore 참조를 설정합니다.
 * @returns {Promise<boolean>} 성공 여부
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
            const userPath = rtifacts//users/;
            const notesCollection = db.collection(${userPath}/notes);
            const chatHistoryPath = ${userPath}/chatHistories/;
            const chatSessionsCollectionRef = db.collection(${chatHistoryPath}/sessions);
            const projectsCollectionRef = db.collection(${chatHistoryPath}/projects);
            
            State.setDbHandles({
                db,
                notesCollection,
                chatSessionsCollectionRef,
                projectsCollectionRef,
                currentUser
            });

            return true;
        }
        return false;
    } catch (error) {
        console.error("Firebase 초기화 또는 인증 실패:", error);
        return false;
    }
}
