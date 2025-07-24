/* Module: Firebase Initialization and Listeners */

import * as state from './_state.js';
import * as ui from './_uiElements.js';
import { renderSidebarContent, handleNewChat, renderChatMessages } from './chat/_chatUI.js';
import { renderNoteList } from './_notesManager.js';
import { setupSystemInfoWidget } from './_uiSetup.js';

export async function initializeFirebase() {
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
            const canvasId = document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id';
            
            state.setNotesCollection(state.db.collection(`${userPath}/notes`));
            
            const chatHistoryPath = `${userPath}/chatHistories/${canvasId}`;
            state.setChatSessionsCollectionRef(state.db.collection(`${chatHistoryPath}/sessions`));
            state.setProjectsCollectionRef(state.db.collection(`${chatHistoryPath}/projects`));

            await Promise.all([
                listenToNotes(),
                listenToChatSessions(),
                listenToProjects()
            ]);
            
            setupSystemInfoWidget(canvasId, state.currentUser);
        }
    } catch (error) {
        console.error("Firebase 초기화 또는 인증 실패:", error);
        if (ui.notesList) ui.notesList.innerHTML = '<div>클라우드 메모장을 불러오는 데 실패했습니다.</div>';
        if (ui.chatMessages) ui.chatMessages.innerHTML = '<div>AI 러닝메이트 연결에 실패했습니다.</div>';
    }
}

function listenToProjects() {
    return new Promise((resolve) => {
        if (!state.projectsCollectionRef) return resolve();
        if (state.unsubscribeFromProjects) state.unsubscribeFromProjects();
        const newUnsubscribe = state.projectsCollectionRef.onSnapshot(snapshot => {
            const oldCache = [...state.localProjectsCache];
            const newCache = snapshot.docs.map(doc => ({
                id: doc.id,
                isExpanded: oldCache.find(p => p.id === doc.id)?.isExpanded ?? true,
                ...doc.data()
            }));
            state.setLocalProjectsCache(newCache);
            
            renderSidebarContent();

            if (state.newlyCreatedProjectId) {
                const newProjectElement = document.querySelector(`.project-container[data-project-id="${state.newlyCreatedProjectId}"]`);
                if (newProjectElement) {
                    const { startProjectRename } = require('./chat/_chatData.js'); // 동적 import
                    startProjectRename(state.newlyCreatedProjectId);
                    state.setNewlyCreatedProjectId(null);
                }
            }
            resolve();
        }, error => {
            console.error("Project listener error:", error);
            resolve();
        });
        state.setUnsubscribeFromProjects(newUnsubscribe);
    });
}

function listenToChatSessions() {
    return new Promise((resolve) => {
        if (!state.chatSessionsCollectionRef) return resolve();
        if (state.unsubscribeFromChatSessions) state.unsubscribeFromChatSessions();
        const newUnsubscribe = state.chatSessionsCollectionRef.onSnapshot(snapshot => {
            state.setLocalChatSessionsCache(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            renderSidebarContent();
            if (state.currentSessionId) {
                const currentSessionData = state.localChatSessionsCache.find(s => s.id === state.currentSessionId);
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
        state.setUnsubscribeFromChatSessions(newUnsubscribe);
    });
}

function listenToNotes() {
    return new Promise(resolve => {
        if (!state.notesCollection) return resolve();
        if (state.unsubscribeFromNotes) state.unsubscribeFromNotes();
        const newUnsubscribe = state.notesCollection.orderBy("updatedAt", "desc").onSnapshot(s => {
            state.setLocalNotesCache(s.docs.map(d => ({ id: d.id, ...d.data() })));
            if (ui.notesAppPanel?.style.display === 'flex') {
                renderNoteList();
            }
            resolve();
        }, e => {
            console.error("노트 수신 오류:", e);
            resolve();
        });
        state.setUnsubscribeFromNotes(newUnsubscribe);
    });
}