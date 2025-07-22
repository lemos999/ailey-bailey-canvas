/*
--- Ailey & Bailey Canvas ---
File: chat-data.js
Version: 12.0.2 (Critical Fix)
Architect: [Username] & System Architect CodeMaster
Description: This module manages all data interactions with Firebase Firestore for the chat functionality. **Fix: Added missing collection reference initializations in 'initializeDataLayer' to resolve a critical 'TypeError: Cannot read properties of null (reading 'add')' when creating a new chat.**
*/

import { state } from './state.js';
import { renderSidebarContent, renderChatMessages } from './chat-ui.js';
import { showModal } from './ui-helpers.js';
import { startProjectRename } from './chat-events.js';

let chatWelcomeMessage, chatMessages, chatSessionTitle, deleteSessionBtn, chatInput, chatSendBtn;

function queryElements() {
    chatWelcomeMessage = document.getElementById('chat-welcome-message');
    chatMessages = document.getElementById('chat-messages');
    chatSessionTitle = document.getElementById('chat-session-title');
    deleteSessionBtn = document.getElementById('delete-session-btn');
    chatInput = document.getElementById('chat-input');
    chatSendBtn = document.getElementById('chat-send-btn');
}

export function initializeDataLayer() {
    queryElements();

    // [FIX] CRITICAL: Initialize Firestore collection references. This was the cause of the TypeError.
    const canvasId = document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id';
    const userPath = `artifacts/${state.appId}/users/${state.auth.currentUser.uid}`;
    const chatHistoryPath = `${userPath}/chatHistories/${canvasId}`;
    state.chatSessionsCollectionRef = state.db.collection(`${chatHistoryPath}/sessions`);
    state.projectsCollectionRef = state.db.collection(`${chatHistoryPath}/projects`);
    
    listenToProjects();
    listenToChatSessions();
}

// --- Firebase Listeners ---
function listenToProjects() {
    if (!state.projectsCollectionRef) return;
    if (state.unsubscribeFromProjects) state.unsubscribeFromProjects();
    
    state.unsubscribeFromProjects = state.projectsCollectionRef.orderBy("updatedAt", "desc").onSnapshot(snapshot => {
        const oldCache = [...state.localProjectsCache];
        state.localProjectsCache = snapshot.docs.map(doc => ({
            id: doc.id,
            isExpanded: oldCache.find(p => p.id === doc.id)?.isExpanded ?? true,
            ...doc.data()
        }));
        
        renderSidebarContent();

        if (state.newlyCreatedProjectId) {
            const newProjectElement = document.querySelector(`.project-container[data-project-id="${state.newlyCreatedProjectId}"]`);
            if (newProjectElement) {
                startProjectRename(state.newlyCreatedProjectId);
                state.newlyCreatedProjectId = null;
            }
        }
    }, error => {
        console.error("Project listener error:", error);
    });
}

function listenToChatSessions() {
    if (!state.chatSessionsCollectionRef) return;
    if (state.unsubscribeFromChatSessions) state.unsubscribeFromChatSessions();

    state.unsubscribeFromChatSessions = state.chatSessionsCollectionRef.onSnapshot(snapshot => {
        state.localChatSessionsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSidebarContent();
        
        if (state.currentSessionId) {
            const currentSessionData = state.localChatSessionsCache.find(s => s.id === state.currentSessionId);
            if (!currentSessionData) {
                // The current session was deleted by another client or action
                handleNewChat();
            } else {
                // Re-render messages to reflect updates from the listener
                renderChatMessages(currentSessionData);
            }
        }
    }, error => {
        console.error("Chat session listener error:", error);
    });
}

// --- Session Management ---
export function selectSession(sessionId) {
    if (!sessionId) return;
    const sessionData = state.localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionData) return;
    
    state.currentSessionId = sessionId;
    Object.values(state.activeTimers).forEach(timers => timers.forEach(clearInterval));
    
    renderSidebarContent();
    
    if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
    if (chatMessages) chatMessages.style.display = 'flex';
    
    renderChatMessages(sessionData);
    
    if (chatSessionTitle) chatSessionTitle.textContent = sessionData.title || '새 대화';
    if (deleteSessionBtn) deleteSessionBtn.style.display = 'inline-block';
    if (chatInput) chatInput.disabled = false;
    if (chatSendBtn) chatSendBtn.disabled = false;
    chatInput.focus();
}

export function handleNewChat() {
    state.currentSessionId = null;
    Object.values(state.activeTimers).forEach(timers => timers.forEach(clearInterval));
    
    renderSidebarContent();
    
    if (chatMessages) {
        chatMessages.innerHTML = '';
        chatMessages.style.display = 'none';
    }
    if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'flex';
    if (chatSessionTitle) chatSessionTitle.textContent = 'AI 러닝메이트';
    if (deleteSessionBtn) deleteSessionBtn.style.display = 'none';
    if (chatInput) {
        chatInput.disabled = false;
        chatInput.value = '';
        chatInput.style.height = 'auto';
    }
    if (chatSendBtn) chatSendBtn.disabled = false;
}

export async function renameSession(sessionId, newTitle) {
    if (!newTitle || !sessionId || !state.chatSessionsCollectionRef) return;
    try {
        await state.chatSessionsCollectionRef.doc(sessionId).update({
            title: newTitle,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error renaming session:", error);
        alert("세션 이름 변경에 실패했습니다.");
    }
}

export async function toggleChatPin(sessionId) {
    if (!state.chatSessionsCollectionRef || !sessionId) return;
    const sessionRef = state.chatSessionsCollectionRef.doc(sessionId);
    const currentSession = state.localChatSessionsCache.find(s => s.id === sessionId);
    if (!currentSession) return;
    try {
        await sessionRef.update({ 
            isPinned: !(currentSession.isPinned || false),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
        });
    } catch (error) {
        console.error("Error toggling pin status:", error);
    }
}

export function handleDeleteSession(sessionId) {
    if (!sessionId || !state.chatSessionsCollectionRef) return;
    const sessionToDelete = state.localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionToDelete) return;
    
    showModal(`'${sessionToDelete?.title || '이 대화'}'를 삭제하시겠습니까?`, () => {
        state.chatSessionsCollectionRef.doc(sessionId).delete().then(() => {
            if (state.currentSessionId === sessionId) {
                handleNewChat();
            }
        }).catch(e => {
            console.error("세션 삭제 실패:", e);
            alert("세션 삭제에 실패했습니다.");
        });
    });
}

// --- Project Management ---
export function getNewProjectDefaultName() {
    const baseName = "새 프로젝트";
    const existingNames = new Set(state.localProjectsCache.map(p => p.name));
    if (!existingNames.has(baseName)) return baseName;
    let i = 2;
    while (existingNames.has(`${baseName} ${i}`)) i++;
    return `${baseName} ${i}`;
}

export async function createNewProject() {
    if (!state.projectsCollectionRef) return;
    const newName = getNewProjectDefaultName();
    try {
        const newProjectRef = await state.projectsCollectionRef.add({
            name: newName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        state.newlyCreatedProjectId = newProjectRef.id;
    } catch (error) {
        console.error("Error creating new project:", error);
        alert("프로젝트 생성에 실패했습니다.");
    }
}

export async function renameProject(projectId, newName) {
    if (!newName || !newName.trim() || !projectId || !state.projectsCollectionRef) return;
    try {
        await state.projectsCollectionRef.doc(projectId).update({ 
            name: newName.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error renaming project:", error);
        alert("프로젝트 이름 변경에 실패했습니다.");
    }
}

export async function deleteProject(projectId) {
    const project = state.localProjectsCache.find(p => p.id === projectId);
    if (!project || !state.projectsCollectionRef || !state.chatSessionsCollectionRef) return;

    const message = `프로젝트 '${project.name}'를 삭제하시겠습니까? 프로젝트 안의 모든 대화는 '일반 대화'로 이동됩니다.`;
    showModal(message, async () => {
        try {
            const batch = state.db.batch();
            
            const sessionsToMove = state.localChatSessionsCache.filter(s => s.projectId === projectId);
            sessionsToMove.forEach(session => {
                const sessionRef = state.chatSessionsCollectionRef.doc(session.id);
                batch.update(sessionRef, { projectId: null });
            });

            const projectRef = state.projectsCollectionRef.doc(projectId);
            batch.delete(projectRef);

            await batch.commit();
        } catch (error) {
            console.error("Error deleting project:", error);
            alert("프로젝트 삭제에 실패했습니다.");
        }
    });
}

export function toggleProjectExpansion(projectId) {
    const project = state.localProjectsCache.find(p => p.id === projectId);
    if (project) {
        project.isExpanded = !project.isExpanded;
        renderSidebarContent();
    }
}

export async function moveSessionToProject(sessionId, newProjectId) {
    const session = state.localChatSessionsCache.find(s => s.id === sessionId);
    if (!session || session.projectId === newProjectId || !state.chatSessionsCollectionRef || !state.projectsCollectionRef) return;
    try {
        const updates = { projectId: newProjectId, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
        await state.chatSessionsCollectionRef.doc(sessionId).update(updates);
        if (newProjectId) {
            await state.projectsCollectionRef.doc(newProjectId).update({ updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        }
    } catch (error) {
        console.error("Error moving session:", error);
        alert("세션 이동에 실패했습니다.");
    }
}