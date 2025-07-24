/*
--- Ailey & Bailey Canvas ---
File: script_firebase.js
Version: 12.0 (Memo Projects Feature)
Architect: [Username] & System Architect Ailey
Description: Handles all Firebase-related initialization and sets up real-time listeners for notes, chat sessions, and projects. This script defines the connection to the backend.
*/

// --- 3. Function Definitions (Firebase & Listeners) ---

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
            noteProjectsCollectionRef = db.collection(`${userPath}/noteProjects`); // NEW

            // Chat App refs
            const chatHistoryPath = `${userPath}/chatHistories/${canvasId}`;
            chatSessionsCollectionRef = db.collection(`${chatHistoryPath}/sessions`);
            projectsCollectionRef = db.collection(`${chatHistoryPath}/projects`);

            await Promise.all([
                listenToNotes(),
                listenToNoteProjects(), // NEW
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
    if (isPinned) {
        return { key: 0, label: '📌 고정됨' };
    }

    if (!timestamp) {
        return { key: 99, label: '날짜 정보 없음' };
    }

    const now = new Date();
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    
    now.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const diffTime = now.getTime() - date.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays < 1) return { key: 1, label: '오늘' };
    if (diffDays < 2) return { key: 2, label: '어제' };
    if (diffDays < 7) return { key: 3, label: '지난 7일' };

    const nowMonth = now.getMonth();
    const dateMonth = date.getMonth();
    const nowYear = now.getFullYear();
    const dateYear = date.getFullYear();

    if (nowYear === dateYear && nowMonth === dateMonth) {
        return { key: 4, label: '이번 달' };
    }

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    if (dateYear === lastMonth.getFullYear() && dateMonth === lastMonth.getMonth()) {
         return { key: 5, label: '지난 달' };
    }

    return { key: 6 + (nowYear - dateYear) * 12 + (nowMonth - dateMonth), label: `${dateYear}년 ${dateMonth + 1}월` };
}

// NEW: Listener for Note Projects
function listenToNoteProjects() {
    return new Promise((resolve) => {
        if (!noteProjectsCollectionRef) return resolve();
        if (unsubscribeFromNoteProjects) unsubscribeFromNoteProjects();
        unsubscribeFromNoteProjects = noteProjectsCollectionRef.onSnapshot(snapshot => {
            const oldCache = [...localNoteProjectsCache];
            localNoteProjectsCache = snapshot.docs.map(doc => ({
                id: doc.id,
                isExpanded: oldCache.find(p => p.id === doc.id)?.isExpanded ?? true,
                ...doc.data()
            }));
            
            if (document.getElementById('notes-app-panel')?.style.display === 'flex') {
                renderNoteList();
            }

            if (newlyCreatedNoteProjectId) {
                const newProjectElement = document.querySelector(`.note-project-container[data-project-id="${newlyCreatedNoteProjectId}"]`);
                if (newProjectElement) {
                    startNoteProjectRename(newlyCreatedNoteProjectId);
                    newlyCreatedNoteProjectId = null;
                }
            }
            resolve();
        }, error => {
            console.error("Note Project listener error:", error);
            resolve();
        });
    });
}

function listenToProjects() {
    return new Promise((resolve) => {
        if (!projectsCollectionRef) return resolve();
        if (unsubscribeFromProjects) unsubscribeFromProjects();
        unsubscribeFromProjects = projectsCollectionRef.onSnapshot(snapshot => {
            const oldCache = [...localProjectsCache];
            localProjectsCache = snapshot.docs.map(doc => ({
                id: doc.id,
                isExpanded: oldCache.find(p => p.id === doc.id)?.isExpanded ?? true,
                ...doc.data()
            }));
            
            renderSidebarContent();

            if (newlyCreatedProjectId) {
                const newProjectElement = document.querySelector(`.project-container[data-project-id="${newlyCreatedProjectId}"]`);
                if (newProjectElement) {
                    startProjectRename(newlyCreatedProjectId);
                    newlyCreatedProjectId = null;
                }
            }
            resolve();
        }, error => {
            console.error("Project listener error:", error);
            resolve();
        });
    });
}

function listenToChatSessions() {
    return new Promise((resolve) => {
        if (!chatSessionsCollectionRef) return resolve();
        if (unsubscribeFromChatSessions) unsubscribeFromChatSessions();
        unsubscribeFromChatSessions = chatSessionsCollectionRef.onSnapshot(snapshot => {
            localChatSessionsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderSidebarContent();
            if (currentSessionId) {
                const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId);
                if (!currentSessionData) {
                    handleNewChat();
                } else {
                    renderChatMessages(currentSessionData);
                }
            }
            resolve();
        }, error => {
            console.error("Chat session listener error:", error);
            resolve();
        });
    });
}

function listenToNotes() { 
    return new Promise(resolve => { 
        if (!notesCollectionRef) return resolve(); 
        if (unsubscribeFromNotes) unsubscribeFromNotes(); 
        unsubscribeFromNotes = notesCollectionRef.orderBy("updatedAt", "desc").onSnapshot(s => { 
            localNotesCache = s.docs.map(d => ({ id: d.id, ...d.data() })); 
            if (document.getElementById('notes-app-panel')?.style.display === 'flex') renderNoteList(); 
            resolve(); 
        }, e => {
            console.error("노트 수신 오류:", e); 
            resolve();
        }); 
    }); 
}