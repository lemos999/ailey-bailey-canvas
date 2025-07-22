/*
--- Ailey & Bailey Canvas ---
File: chat-module.js (Orchestrator)
Version: 12.0 (Chat Module Refactor)
Architect: [Username] & System Architect CodeMaster
Description: This module now acts as an orchestrator for the entire chat system. Its sole responsibility is to import and initialize all specialized chat-related sub-modules in the correct order.
*/

import { initializeApiSettings } from './api-settings.js';
import { initializeApiHandler } from './api-handler.js';
import { initializeDataLayer } from './chat-data.js';
import { initializeUI, openPromptModal, setupChatModeSelector } from './chat-ui.js';
import { handleSidebarClick, handleSidebarContextMenu, handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop, handleReasoningBlockClick, handlePopoverAskAi } from './chat-events.js';
import { initializeSystemData } from './system-data.js';
import { initializeQuiz } from './quiz.js';
import { state } from './state.js';

let chatPanel, chatForm, newChatBtn, newProjectBtn, searchSessionsInput,
    sessionListContainer, promptSaveBtn, promptCancelBtn, popoverAskAi;

function queryElements() {
    chatPanel = document.getElementById('chat-panel');
    chatForm = document.getElementById('chat-form');
    newChatBtn = document.getElementById('new-chat-btn');
    newProjectBtn = document.getElementById('new-project-btn');
    searchSessionsInput = document.getElementById('search-sessions-input');
    sessionListContainer = document.getElementById('session-list-container');
    promptSaveBtn = document.getElementById('prompt-save-btn');
    promptCancelBtn = document.getElementById('prompt-cancel-btn');
    popoverAskAi = document.getElementById('popover-ask-ai');
}

export function initializeChatModule() {
    queryElements();

    if (!chatPanel) {
        console.warn("Chat panel element not found, skipping chat module initialization.");
        return false;
    }

    // Initialize all sub-modules in a logical order
    initializeUI();
    initializeDataLayer();
    initializeApiHandler();
    initializeApiSettings();
    initializeSystemData();
    initializeQuiz();

    // Setup main event listeners that orchestrate actions between modules
    setupOrchestrationEventListeners();
    
    return true;
}

function setupOrchestrationEventListeners() {
    if (chatForm) chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        import('./api-handler.js').then(module => module.handleChatSend());
    });
    if (chatInput) chatInput.addEventListener('keydown', e => { 
        if (e.key === 'Enter' && !e.shiftKey) { 
            e.preventDefault(); 
            import('./api-handler.js').then(module => module.handleChatSend());
        } 
    });

    if (newChatBtn) newChatBtn.addEventListener('click', () => {
        import('./chat-data.js').then(module => module.handleNewChat());
    });
    if (newProjectBtn) newProjectBtn.addEventListener('click', () => {
        import('./chat-data.js').then(module => module.createNewProject());
    });
    if (searchSessionsInput) searchSessionsInput.addEventListener('input', () => {
        import('./chat-ui.js').then(module => module.renderSidebarContent());
    });

    if (sessionListContainer) {
        sessionListContainer.addEventListener('click', handleSidebarClick);
        sessionListContainer.addEventListener('contextmenu', handleSidebarContextMenu);
        sessionListContainer.addEventListener('dragstart', handleDragStart);
        sessionListContainer.addEventListener('dragend', handleDragEnd);
        sessionListContainer.addEventListener('dragover', handleDragOver);
        sessionListContainer.addEventListener('dragleave', handleDragLeave);
        sessionListContainer.addEventListener('drop', handleDrop);
    }

    if (chatMessages) {
        chatMessages.addEventListener('click', handleReasoningBlockClick);
    }
    
    if (popoverAskAi) popoverAskAi.addEventListener('click', handlePopoverAskAi);

    // Custom prompt modal requires functions from both UI and state
    if (promptSaveBtn) promptSaveBtn.addEventListener('click', saveCustomPrompt);
    if (promptCancelBtn) promptCancelBtn.addEventListener('click', closePromptModal);
}

// These functions are called from the UI module event listeners
function saveCustomPrompt() {
    const customPromptInput = document.getElementById('custom-prompt-input');
    if (customPromptInput) {
        state.customPrompt = customPromptInput.value;
        localStorage.setItem('customTutorPrompt', state.customPrompt);
        closePromptModal();
    }
}

function closePromptModal() {
    const promptModalOverlay = document.getElementById('prompt-modal-overlay');
    if (promptModalOverlay) {
        promptModalOverlay.style.display = 'none';
    }
}