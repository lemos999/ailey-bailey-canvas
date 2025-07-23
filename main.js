/*
 * main.js: The main entry point for the Ailey & Bailey Canvas application.
 * This file imports all necessary modules, sets up event listeners,
 * and initializes the application.
 * Version: 11.0 (Full Modular Architecture)
 */

// --- Module Imports ---

// Core Modules
import { initializeFirebase } from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/core/firebase.js';

// UI Component Modules
import { makePanelDraggable, togglePanel } from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/ui/panels.js';
import { initializeTooltips, handleTextSelection, handlePopoverAskAi, handlePopoverAddNote } from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/ui/tooltips.js';
import { setupNavigator } from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/ui/toc.js';
import {
    openPromptModal,
    closePromptModal,
    saveCustomPrompt,
    startQuiz,
    handleSubmitQuiz
} from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/ui/modals.js';
import {
    createApiSettingsModal,
    openApiSettingsModal,
    closeApiSettingsModal,
    saveApiSettings,
    handleVerifyApiKey,
    resetTokenUsage
} from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/ui/apiSettings.js';

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
} from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/ui/notes.js';
import {
    initializeChat,
    handleSidebarClick,
    handleSidebarContextMenu,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    chatEventHandlers,
    handleReasoningBlockClick // Assuming this should be exposed from a chat module
} from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/ui/chat/main.js';

// DOM Element and Helper Imports
import * as Dom from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/utils/domElements.js';
import { updateClock } from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/utils/helpers.js';

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
    document.addEventListener('click', handleTextSelection);

    // Theme Toggle
    if (Dom.themeToggle) {
        if (localStorage.getItem('theme') === 'dark') Dom.body.classList.add('dark-mode');
        Dom.themeToggle.addEventListener('click', () => {
            Dom.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
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
    Dom.notesAppPanel?.querySelector('.close-btn')?.addEventListener('click', () => togglePanel(Dom.notesAppPanel, false));

    // Chat Panel Listeners
    if (Dom.chatForm) Dom.chatForm.addEventListener('submit', (e) => { e.preventDefault(); chatEventHandlers.handleChatSend(); });
    if (Dom.chatInput) Dom.chatInput.addEventListener('keydown', chatEventHandlers.onChatKeydown);
    if (Dom.deleteSessionBtn) Dom.deleteSessionBtn.addEventListener('click', chatEventHandlers.onDeleteSession);
    if (Dom.newChatBtn) Dom.newChatBtn.addEventListener('click', chatEventHandlers.handleNewChat);
    if (Dom.newProjectBtn) Dom.newProjectBtn.addEventListener('click', chatEventHandlers.createNewProject);
    if (Dom.aiModelSelector) Dom.aiModelSelector.addEventListener('change', chatEventHandlers.onModelChange);
    if (Dom.chatMessages) Dom.chatMessages.addEventListener('click', handleReasoningBlockClick);

    // Chat Sidebar (Projects & Sessions) Listeners (using event delegation)
    if (Dom.sessionListContainer) {
        Dom.sessionListContainer.addEventListener('click', handleSidebarClick);
        Dom.sessionListContainer.addEventListener('contextmenu', handleSidebarContextMenu);
        Dom.sessionListContainer.addEventListener('dragstart', handleDragStart);
        Dom.sessionListContainer.addEventListener('dragend', handleDragEnd);
        Dom.sessionListContainer.addEventListener('dragover', handleDragOver);
        Dom.sessionListContainer.addEventListener('drop', handleDrop);
    }
    if (Dom.searchSessionsInput) Dom.searchSessionsInput.addEventListener('input', () => import('https://lemos999.github.io/ailey-bailey-canvas/js_modules/ui/chat/render.js').then(m => m.renderSidebarContent()));


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
    if (apiModalElements.apiSettingsBtn) apiModalElements.apiSettingsBtn.addEventListener('click', openApiSettingsModal);
    if (apiModalElements.apiSettingsCancelBtn) apiModalElements.apiSettingsCancelBtn.addEventListener('click', closeApiSettingsModal);
    if (apiModalElements.apiSettingsSaveBtn) apiModalElements.apiSettingsSaveBtn.addEventListener('click', () => saveApiSettings(true));
    if (apiModalElements.verifyApiKeyBtn) apiModalElements.verifyApiKeyBtn.addEventListener('click', handleVerifyApiKey);
    if (apiModalElements.resetTokenUsageBtn) apiModalElements.resetTokenUsageBtn.addEventListener('click', resetTokenUsage);
    if (apiModalElements.apiSettingsModalOverlay) apiModalElements.apiSettingsModalOverlay.addEventListener('click', (e) => { if (e.target === apiModalElements.apiSettingsModalOverlay) closeApiSettingsModal(); });
}


// --- Start the application ---
document.addEventListener('DOMContentLoaded', initialize);
