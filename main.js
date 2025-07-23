/*
 * main.js: The main entry point for the Ailey & Bailey Canvas application.
 * This file imports all necessary modules, sets up event listeners,
 * and initializes the application.
 * Version: 11.0 (Full Modular Architecture)
 */

// --- Module Imports ---

// Core Modules
import { initializeFirebase } from './js_modules/core/firebase.js';

// UI Component Modules
import { makePanelDraggable, togglePanel } from './js_modules/ui/panels.js';
import { initializeTooltips, handleTextSelection, handlePopoverAskAi, handlePopoverAddNote } from './js_modules/ui/tooltips.js';
import { setupNavigator } from './js_modules/ui/toc.js';
import {
    openPromptModal,
    closePromptModal,
    saveCustomPrompt,
    startQuiz,
    handleSubmitQuiz
} from './js_modules/ui/modals.js';
import {
    createApiSettingsModal,
    openApiSettingsModal,
    closeApiSettingsModal,
    saveApiSettings,
    handleVerifyApiKey,
    resetTokenUsage
} from './js_modules/ui/apiSettings.js';

// Major Feature Modules
import {
    initializeNotes,
    handleNotePanelClick,
    handleNoteInput,
    renderNoteList,
    addNote,
    switchView,
    handleFormat,
    handleLinkTopic,
    exportAllData,
    handleRestoreClick,
    importAllData,
    handleSystemReset
} from './js_modules/ui/notes.js';
import {
    initializeChat,
    handleSidebarClick,
    handleSidebarContextMenu,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    chatEventHandlers,
    handleReasoningBlockClick
} from './js_modules/ui/chat/main.js';

// DOM Element and Helper Imports
import * as Dom from './js_modules/utils/domElements.js';
import { updateClock } from './js_modules/utils/helpers.js';

// --- Main Application Initialization ---
function initialize() {
    // 1. Initial UI setup
    if (!Dom.body || !Dom.wrapper) {
        console.error("Core layout elements not found. Initialization aborted.");
        return;
    }
    updateClock();
    setInterval(updateClock, 1000);
    createApiSettingsModal();
    initializeNotes();
    
    // 2. Firebase and data initialization
    initializeFirebase().then(() => {
        // These should run after data is potentially loaded
        setupNavigator();
        initializeTooltips();
        initializeChat();
        
        // Initial render calls
        renderNoteList();

        // Make panels draggable after they are certainly in the DOM
        makePanelDraggable(Dom.chatPanel);
        makePanelDraggable(Dom.notesAppPanel);
    });
    
    // 3. Setup all event listeners
    setupEventListeners();

    console.log("Ailey & Bailey Canvas (v11.0 - Modular) initialized.");
}

// --- Event Listener Setup ---
function setupEventListeners() {
    // Global Listeners
    document.addEventListener('click', (e) => {
        handleTextSelection(e);
        // Close context menu if clicked outside
        if (!e.target.closest('.session-context-menu, .project-context-menu, .project-actions-btn')) {
            const contextMenu = document.querySelector('.session-context-menu') || document.querySelector('.project-context-menu');
            if (contextMenu) {
                contextMenu.remove();
            }
        }
    });

    // Theme Toggle
    if (Dom.themeToggle) {
        if (localStorage.getItem('theme') === 'dark') Dom.body.classList.add('dark-mode');
        Dom.themeToggle.addEventListener('click', () => {
            Dom.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', Dom.body.classList.contains('dark-mode') ? 'dark' : 'light');
        });
    }

    // Fixed Tool Buttons
    if (Dom.tocToggleBtn) Dom.tocToggleBtn.addEventListener('click', () => {
        Dom.wrapper.classList.toggle('toc-hidden');
        Dom.systemInfoWidget?.classList.toggle('tucked');
    });
    if (Dom.chatToggleBtn) Dom.chatToggleBtn.addEventListener('click', () => togglePanel(Dom.chatPanel));
    if (Dom.notesAppToggleBtn) Dom.notesAppToggleBtn.addEventListener('click', () => togglePanel(Dom.notesAppPanel));
    if (Dom.startQuizBtn) Dom.startQuizBtn.addEventListener('click', startQuiz);

    // Selection Popover
    if (Dom.popoverAskAi) Dom.popoverAskAi.addEventListener('click', handlePopoverAskAi);
    if (Dom.popoverAddNote) Dom.popoverAddNote.addEventListener('click', handlePopoverAddNote);

    // Panel Close Buttons
    Dom.chatPanel?.querySelector('.close-btn').addEventListener('click', () => togglePanel(Dom.chatPanel, false));
    Dom.notesAppPanel?.querySelector('.panel-header .close-btn')?.addEventListener('click', () => togglePanel(Dom.notesAppPanel, false)); // More specific selector if needed

    // Chat Panel Listeners
    if (Dom.chatForm) Dom.chatForm.addEventListener('submit', (e) => { e.preventDefault(); chatEventHandlers.handleChatSend(); });
    if (Dom.chatInput) Dom.chatInput.addEventListener('keydown', chatEventHandlers.onChatKeydown);
    if (Dom.deleteSessionBtn) Dom.deleteSessionBtn.addEventListener('click', chatEventHandlers.onDeleteSession);
    if (Dom.newChatBtn) Dom.newChatBtn.addEventListener('click', chatEventHandlers.handleNewChat);
    if (Dom.newProjectBtn) Dom.newProjectBtn.addEventListener('click', chatEventHandlers.createNewProject);
    if (Dom.aiModelSelector) Dom.aiModelSelector.addEventListener('change', chatEventHandlers.onModelChange);
    if (Dom.chatMessages) Dom.chatMessages.addEventListener('click', handleReasoningBlockClick);

    // Chat Sidebar (Projects & Sessions) Listeners
    if (Dom.sessionListContainer) {
        Dom.sessionListContainer.addEventListener('click', handleSidebarClick);
        Dom.sessionListContainer.addEventListener('contextmenu', handleSidebarContextMenu);
        Dom.sessionListContainer.addEventListener('dragstart', handleDragStart);
        Dom.sessionListContainer.addEventListener('dragend', handleDragEnd);
        Dom.sessionListContainer.addEventListener('dragover', handleDragOver);
        Dom.sessionListContainer.addEventListener('drop', handleDrop);
    }
    if (Dom.searchSessionsInput) Dom.searchSessionsInput.addEventListener('input', () => import('./js_modules/ui/chat/render.js').then(m => m.renderSidebarContent()));

    // Notes App Listeners
    if (Dom.notesList) Dom.notesList.addEventListener('click', handleNotePanelClick);
    if (Dom.addNewNoteBtn) Dom.addNewNoteBtn.addEventListener('click', () => addNote());
    if (Dom.backToListBtn) Dom.backToListBtn.addEventListener('click', () => switchView('list'));
    if (Dom.searchInput) Dom.searchInput.addEventListener('input', renderNoteList);
    if (Dom.noteTitleInput) Dom.noteTitleInput.addEventListener('input', handleNoteInput);
    if (Dom.noteContentTextarea) Dom.noteContentTextarea.addEventListener('input', handleNoteInput);
    if (Dom.formatToolbar) Dom.formatToolbar.addEventListener('click', handleFormat);
    if (Dom.linkTopicBtn) Dom.linkTopicBtn.addEventListener('click', handleLinkTopic);

    // Backup & Restore & Reset Listeners
    if (Dom.exportNotesBtn) Dom.exportNotesBtn.addEventListener('click', exportAllData);
    if (Dom.restoreDataBtn) Dom.restoreDataBtn.addEventListener('click', handleRestoreClick);
    if (Dom.fileImporter) Dom.fileImporter.addEventListener('change', importAllData);
    if (Dom.systemResetBtn) Dom.systemResetBtn.addEventListener('click', handleSystemReset);

    // Modal Listeners
    if (Dom.quizModalOverlay) Dom.quizModalOverlay.addEventListener('click', (e) => { if (e.target === Dom.quizModalOverlay) Dom.quizModalOverlay.style.display = 'none'; });
    if (Dom.quizSubmitBtn) Dom.quizSubmitBtn.addEventListener('click', handleSubmitQuiz);
    
    if (Dom.promptSaveBtn) Dom.promptSaveBtn.addEventListener('click', saveCustomPrompt);
    if (Dom.promptCancelBtn) Dom.promptCancelBtn.addEventListener('click', closePromptModal);
    if (Dom.promptModalOverlay) Dom.promptModalOverlay.addEventListener('click', (e) => { if (e.target === Dom.promptModalOverlay) closePromptModal(); });

    // API Settings Modal Listeners
    const apiModalElements = Dom.getApiSettingsModalElements();
    if (apiModalElements.apiSettingsBtn) {
        // Need to add the button to the DOM first. Let's assume it's created and added in createApiSettingsModal
        const chatHeader = document.querySelector('#chat-main-view .panel-header > div > div'); // Adjust selector as needed
        if (chatHeader) {
            const btn = document.createElement('span');
            btn.id = 'api-settings-btn';
            btn.title = '개인 API 설정';
            btn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>`;
            chatHeader.appendChild(btn);
            btn.addEventListener('click', openApiSettingsModal);
        }
    }
    
    if (apiModalElements.apiSettingsCancelBtn) apiModalElements.apiSettingsCancelBtn.addEventListener('click', closeApiSettingsModal);
    if (apiModalElements.apiSettingsSaveBtn) apiModalElements.apiSettingsSaveBtn.addEventListener('click', () => saveApiSettings(true));
    if (apiModalElements.verifyApiKeyBtn) apiModalElements.verifyApiKeyBtn.addEventListener('click', handleVerifyApiKey);
    if (apiModalElements.resetTokenUsageBtn) apiModalElements.resetTokenUsageBtn.addEventListener('click', resetTokenUsage);
    if (apiModalElements.apiSettingsModalOverlay) apiModalElements.apiSettingsModalOverlay.addEventListener('click', (e) => { if (e.target === apiModalElements.apiSettingsModalOverlay) closeApiSettingsModal(); });
}

// --- Start the application ---
document.addEventListener('DOMContentLoaded', initialize);
