/*
--- Ailey & Bailey Canvas ---
File: js/ui/chat/state.js
Version: 11.0 (Modular)
Description: Manages state specifically for the chat UI and functionality.
*/

import { getState, setState, updateState } from '../../core/state.js';
import { showModal } from '../../utils/helpers.js';
import { renderSidebarContent, renderChatMessages } from './render.js';
import { chatWelcomeMessage, chatMessages, chatSessionTitle, deleteSessionBtn, chatInput, chatSendBtn } from '../../utils/domElements.js';

/**
 * Listens for real-time updates to chat sessions.
 */
export function listenToChatSessions() {
    const { chatSessionsCollectionRef } = getState();
    if (!chatSessionsCollectionRef) return;

    const unsubscribe = chatSessionsCollectionRef.onSnapshot(snapshot => {
        const { currentSessionId } = getState();
        const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateState('localChatSessionsCache', sessions);
        renderSidebarContent();
        
        if (currentSessionId) {
            const currentSessionData = sessions.find(s => s.id === currentSessionId);
            if (!currentSessionData) {
                // The active session was deleted by another client, reset view.
                handleNewChat();
            } else {
                renderChatMessages(currentSessionData);
            }
        }
    }, error => {
        console.error("Chat session listener error:", error);
    });
    updateState('unsubscribeFromChatSessions', unsubscribe);
}

/**
 * Listens for real-time updates to projects.
 */
export function listenToProjects() {
    const { projectsCollectionRef } = getState();
    if (!projectsCollectionRef) return;

    const unsubscribe = projectsCollectionRef.onSnapshot(snapshot => {
        let { localProjectsCache, newlyCreatedProjectId } = getState();
        const oldCache = [...localProjectsCache];
        const projects = snapshot.docs.map(doc => ({
            id: doc.id,
            isExpanded: oldCache.find(p => p.id === doc.id)?.isExpanded ?? true,
            ...doc.data()
        }));
        
        updateState('localProjectsCache', projects);
        renderSidebarContent();

        if (newlyCreatedProjectId) {
            const newProjectElement = document.querySelector(.project-container[data-project-id="\"]);
            if (newProjectElement) {
                startProjectRename(newlyCreatedProjectId);
                updateState('newlyCreatedProjectId', null);
            }
        }
    }, error => {
        console.error("Project listener error:", error);
    });
    updateState('unsubscribeFromProjects', unsubscribe);
}

/**
 * Selects a session to be displayed in the main chat view.
 * @param {string} sessionId The ID of the session to select.
 */
export function selectSession(sessionId) {
    if (!sessionId) return;
    
    const { localChatSessionsCache } = getState();
    const sessionData = localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionData) return;

    updateState('currentSessionId', sessionId);
    
    let { activeTimers } = getState();
    Object.values(activeTimers).forEach(timers => timers.forEach(clearInterval));
    updateState('activeTimers', {});
    
    renderSidebarContent();
    if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
    if (chatMessages) chatMessages.style.display = 'flex';
    renderChatMessages(sessionData);
    if (chatSessionTitle) chatSessionTitle.textContent = sessionData.title || '대화';
    if (deleteSessionBtn) deleteSessionBtn.style.display = 'inline-block';
    if (chatInput) chatInput.disabled = false;
    if (chatSendBtn) chatSendBtn.disabled = false;
    chatInput.focus();
}

/**
 * Resets the chat view to the welcome message.
 */
export function handleNewChat() {
    updateState('currentSessionId', null);
    
    let { activeTimers } = getState();
    Object.values(activeTimers).forEach(timers => timers.forEach(clearInterval));
    updateState('activeTimers', {});
    
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
    }
    if (chatSendBtn) chatSendBtn.disabled = false;
}

/**
 * Shows a confirmation modal and deletes a session if confirmed.
 * @param {string} sessionId The ID of the session to delete.
 */
export function handleDeleteSession(sessionId) {
    if (!sessionId) return;
    const { localChatSessionsCache, chatSessionsCollectionRef, currentSessionId } = getState();
    const sessionToDelete = localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionToDelete) return;

    showModal('\'를 삭제하시겠습니까?, () => {
        if (chatSessionsCollectionRef) {
            chatSessionsCollectionRef.doc(sessionId).delete().then(() => {
                console.log("Session deleted successfully");
                if (currentSessionId === sessionId) {
                    handleNewChat();
                }
            }).catch(e => console.error("세션 삭제 실패:", e));
        }
    });
}
