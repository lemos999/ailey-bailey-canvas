/*
--- Ailey & Bailey Canvas ---
File: js/firebase-service.js
Version: 11.0 (Refactored)
Description: Handles all communication with Firebase, including initialization, authentication,
and real-time data listeners for notes, chat sessions, and projects.
*/

import * as state from './state.js';
import { renderSidebarContent } from './chat-session.js';
import { renderChatMessages, handleNewChat, startProjectRename } from './chat-core.js';
import { renderNoteList } from './notes-manager.js';

// This function will be called from main.js
export async function initializeFirebase() {
    try {
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (!firebaseConfig) { throw new Error("Firebase config not found."); }
        if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }

        const auth = firebase.auth();
        const db = firebase.firestore();

        let currentUser;
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
            const userPath = `artifacts/${state.appId}/users/${currentUser.uid}`;
            const chatHistoryPath = `${userPath}/chatHistories/${state.canvasId}`;
            
            state.setFirebaseInstances({
                db: db,
                currentUser: currentUser,
                notesCollection: db.collection(`${userPath}/notes`),
                chatSessionsCollectionRef: db.collection(`${chatHistoryPath}/sessions`),
                projectsCollectionRef: db.collection(`${chatHistoryPath}/projects`),
            });
            
            // Start listening to data changes
            await Promise.all([
                listenToNotes(),
                listenToChatSessions(),
                listenToProjects()
            ]);
            
            return true; // Indicate success
        }
        return false; // Indicate failure
    } catch (error) {
        console.error("Firebase initialization or authentication failed:", error);
        // We can't use UI managers here as they might not be initialized.
        // main.js will handle showing the error message to the user.
        return false;
    }
}

function listenToNotes() {
    return new Promise((resolve) => {
        if (!state.notesCollection) return resolve();
        if (state.unsubscribeFromNotes) state.unsubscribeFromNotes();

        const unsub = state.notesCollection.orderBy("updatedAt", "desc").onSnapshot(snapshot => {
            state.setLocalNotesCache(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            const notesPanel = document.getElementById('notes-app-panel');
            if (notesPanel && notesPanel.style.display === 'flex') {
                renderNoteList();
            }
            resolve();
        }, error => {
            console.error("Note listener error:", error);
            resolve();
        });
        state.setUnsubscribers({ notes: unsub });
    });
}

function listenToChatSessions() {
    return new Promise((resolve) => {
        if (!state.chatSessionsCollectionRef) return resolve();
        if (state.unsubscribeFromChatSessions) state.unsubscribeFromChatSessions();
        
        const unsub = state.chatSessionsCollectionRef.onSnapshot(snapshot => {
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
        state.setUnsubscribers({ chat: unsub });
    });
}

function listenToProjects() {
    return new Promise((resolve) => {
        if (!state.projectsCollectionRef) return resolve();
        if (state.unsubscribeFromProjects) state.unsubscribeFromProjects();
        
        const unsub = state.projectsCollectionRef.onSnapshot(snapshot => {
            const oldCache = [...state.localProjectsCache];
            state.setLocalProjectsCache(snapshot.docs.map(doc => ({
                id: doc.id,
                isExpanded: oldCache.find(p => p.id === doc.id)?.isExpanded ?? true,
                ...doc.data()
            })));
            
            renderSidebarContent();

            if (state.newlyCreatedProjectId) {
                const newProjectElement = document.querySelector(`.project-container[data-project-id="${state.newlyCreatedProjectId}"]`);
                if (newProjectElement) {
                    startProjectRename(state.newlyCreatedProjectId);
                    state.setNewlyCreatedProjectId(null);
                }
            }
            resolve();
        }, error => {
            console.error("Project listener error:", error);
            resolve();
        });
        state.setUnsubscribers({ projects: unsub });
    });
}

export function getRelativeDateGroup(timestamp, isPinned = false) {
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