/*
--- Ailey & Bailey Canvas ---
File: 100_core_firebase.js
Version: 1.0 (Bundled)
Description: Handles all Firebase-related initialization and sets up real-time listeners for all data collections.
*/

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
            
            // Note App refs
            notesCollectionRef = db.collection(`${userPath}/notes`);
            noteProjectsCollectionRef = db.collection(`${userPath}/noteProjects`);
            tagsCollectionRef = db.collection(`${userPath}/noteTags`); // NEW
            noteTemplatesCollectionRef = db.collection(`${userPath}/noteTemplates`); // NEW

            // Chat App refs
            const chatHistoryPath = `${userPath}/chatHistories/${canvasId}`;
            chatSessionsCollectionRef = db.collection(`${chatHistoryPath}/sessions`);
            projectsCollectionRef = db.collection(`${chatHistoryPath}/projects`);

            await Promise.all([
                listenToNotes(),
                listenToNoteProjects(),
                listenToTags(), // NEW
                listenToNoteTemplates(), // NEW
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

function getRelativeDateGroup(timestamp, isPinned = false) {
    if (isPinned) return { key: 0, label: '📌 고정됨' };
    if (!timestamp) return { key: 99, label: '날짜 정보 없음' };
    const now = new Date();
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    now.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diffTime = now.getTime() - date.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    if (diffDays < 1) return { key: 1, label: '오늘' };
    if (diffDays < 2) return { key: 2, label: '어제' };
    if (diffDays < 7) return { key: 3, label: '지난 7일' };
    const nowMonth = now.getMonth(), dateMonth = date.getMonth(), nowYear = now.getFullYear(), dateYear = date.getFullYear();
    if (nowYear === dateYear && nowMonth === dateMonth) return { key: 4, label: '이번 달' };
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    if (dateYear === lastMonth.getFullYear() && dateMonth === lastMonth.getMonth()) return { key: 5, label: '지난 달' };
    return { key: 6 + (nowYear - dateYear) * 12 + (nowMonth - dateMonth), label: `${dateYear}년 ${dateMonth + 1}월` };
}