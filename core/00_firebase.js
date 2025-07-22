/* --- FILE: /scripts/core/00_firebase.js --- */
async function initializeFirebase() {
    try {
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (!firebaseConfig) { throw new Error("Firebase config not found."); }
        if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
        
        const auth = firebase.auth();
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
            const userPath = `artifacts/${appId}/users/${currentUser.uid}`;
            notesCollection = db.collection(`${userPath}/notes`);
            const chatHistoryPath = `${userPath}/chatHistories/${canvasId}`;
            chatSessionsCollectionRef = db.collection(`${chatHistoryPath}/sessions`);
            projectsCollectionRef = db.collection(`${chatHistoryPath}/projects`);

            await Promise.all([
                listenToNotes(),
                listenToChatSessions(),
                listenToProjects()
            ]);
            
            setupSystemInfoWidget();
        }
    } catch (error) {
        console.error("Firebase 초기화 또는 인증 실패:", error);
        if (notesList) notesList.innerHTML = '<div>클라우드 메모장을 불러오는 데 실패했습니다.</div>';
        if (chatMessages) chatMessages.innerHTML = '<div>AI 러닝메이트 연결에 실패했습니다.</div>';
    }
}