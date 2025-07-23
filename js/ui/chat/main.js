/*
--- Ailey & Bailey Canvas ---
File: js/ui/chat/main.js
Version: 11.0 (Modular)
Description: Orchestrator for all chat-related functionalities and event listeners.
*/

import { getState, updateState } from '../../core/state.js';
import * as ChatState from './state.js';
import * as ChatActions from './actions.js';
import { renderSidebarContent, startProjectRename } from './render.js';
import { newChatBtn, newProjectBtn, chatForm, chatInput, deleteSessionBtn, searchSessionsInput, sessionListContainer, aiModelSelector } from '../../utils/domElements.js';

/**
 * Initializes all event listeners related to the chat panel.
 */
export function initializeChat() {
    if (newChatBtn) newChatBtn.addEventListener('click', ChatState.handleNewChat);
    if (newProjectBtn) newProjectBtn.addEventListener('click', ChatActions.createNewProject);
    
    if (chatForm) chatForm.addEventListener('submit', (e) => { e.preventDefault(); ChatActions.handleChatSend(); });
    if (chatInput) chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ChatActions.handleChatSend(); } });
    
    if (deleteSessionBtn) deleteSessionBtn.addEventListener('click', () => {
        const { currentSessionId } = getState();
        ChatState.handleDeleteSession(currentSessionId);
    });

    if (searchSessionsInput) searchSessionsInput.addEventListener('input', renderSidebarContent);

    if (sessionListContainer) {
        sessionListContainer.addEventListener('click', (e) => {
            const sessionItem = e.target.closest('.session-item');
            if (sessionItem) {
                if (e.target.closest('.session-pin-btn')) {
                    e.stopPropagation();
                    ChatActions.toggleChatPin(sessionItem.dataset.sessionId);
                } else {
                    ChatState.selectSession(sessionItem.dataset.sessionId);
                }
                return;
            }

            const projectHeader = e.target.closest('.project-header');
            if (projectHeader) {
                const projectId = projectHeader.closest('.project-container').dataset.projectId;
                if (e.target.closest('.project-actions-btn')) {
                    // Context menu logic can be added here
                } else if (!e.target.closest('input')) {
                    toggleProjectExpansion(projectId);
                }
            }
        });
    }

    if (aiModelSelector) {
        aiModelSelector.addEventListener('change', () => {
            const { userApiSettings } = getState();
            const selectedValue = aiModelSelector.value;
            if (userApiSettings.provider && userApiSettings.apiKey) {
                userApiSettings.selectedModel = selectedValue;
                updateState('userApiSettings', userApiSettings);
                localStorage.setItem('userApiSettings', JSON.stringify(userApiSettings));
            } else {
                updateState('defaultModel', selectedValue);
                localStorage.setItem('selectedAiModel', selectedValue);
            }
        });
    }
}

function toggleProjectExpansion(projectId) {
    const { localProjectsCache } = getState();
    const project = localProjectsCache.find(p => p.id === projectId);
    if (project) {
        project.isExpanded = !project.isExpanded;
        updateState('localProjectsCache', localProjectsCache);
        renderSidebarContent();
    }
}
