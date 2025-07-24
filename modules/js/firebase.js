/* Module: firebase.js - Handles all Firebase initialization and data listeners. */
import { appId } from './config.js';
import * as State from './state.js';
import { setupSystemInfoWidget } from './ui.js';
import { handleNewChat, renderSidebarContent, renderChatMessages } from './chat/chatManager.js';
import { renderNoteList } from './notesManager.js';

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
            const userPath = `artifacts/${appId}/users/${State.currentUser.uid}`;
            State.setNotesCollection(State.db.collection(`${userPath}/notes`));

            const chatHistoryPath = `${userPath}/chatHistories/${State.canvasId}`;
            State.setChatSessionsCollectionRef(State.db.collection(`${chatHistoryPath}/sessions`));
            State.setProjectsCollectionRef(State.db.collection(`${chatHistoryPath}/projects`));

            await Promise.all([
                listenToNotes(),
                listenToChatSessions(),
                listenToProjects()
            ]);
            
            setupSystemInfoWidget(State.canvasId, State.currentUser);
        }
    } catch (error) {
        console.error("Firebase 초기화 또는 인증 실패:", error);
        const notesListEl = document.getElementById('notes-list');
        const chatMessagesEl = document.getElementById('chat-messages');
        if (notesListEl) notesListEl.innerHTML = '<div>클라우드 메모장을 불러오는 데 실패했습니다.</div>';
        if (chatMessagesEl) chatMessagesEl.innerHTML = '<div>AI 러닝메이트 연결에 실패했습니다.</div>';
    }
}

function listenToNotes() {
    return new Promise(resolve => {
        if (!State.notesCollection) return resolve();
        const unsubscribe = State.notesCollection.orderBy("updatedAt", "desc").onSnapshot(snapshot => {
            State.setLocalNotesCache(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            if (document.getElementById('notes-app-panel')?.style.display === 'flex') {
                renderNoteList();
            }
            resolve();
        }, error => {
            console.error("노트 수신 오류:", error);
            resolve();
        });
        State.setUnsubscribeFromNotes(unsubscribe);
    });
}

function listenToProjects() {
    return new Promise((resolve) => {
        if (!State.projectsCollectionRef) return resolve();
        const unsubscribe = State.projectsCollectionRef.onSnapshot(snapshot => {
            const oldCache = [...State.localProjectsCache];
            const newCache = snapshot.docs.map(doc => ({
                id: doc.id,
                isExpanded: oldCache.find(p => p.id === doc.id)?.isExpanded ?? true,
                ...doc.data()
            }));
            State.setLocalProjectsCache(newCache);
            
            renderSidebarContent();

            if (State.newlyCreatedProjectId) {
                const newProjectElement = document.querySelector(`.project-container[data-project-id="${State.newlyCreatedProjectId}"]`);
                if (newProjectElement) {
                    // This is tricky. startProjectRename is in chatData.js. We need to avoid circular dependencies.
                    // For now, let's just re-render. A better solution might involve custom events.
                    State.setNewlyCreatedProjectId(null);
                }
            }
            resolve();
        }, error => {
            console.error("Project listener error:", error);
            resolve();
        });
        State.setUnsubscribeFromProjects(unsubscribe);
    });
}

function listenToChatSessions() {
    return new Promise((resolve) => {
        if (!State.chatSessionsCollectionRef) return resolve();
        const unsubscribe = State.chatSessionsCollectionRef.onSnapshot(snapshot => {
            State.setLocalChatSessionsCache(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            renderSidebarContent();
            if (State.currentSessionId) {
                const currentSessionData = State.localChatSessionsCache.find(s => s.id === State.currentSessionId);
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
        State.setUnsubscribeFromChatSessions(unsubscribe);
    });
}