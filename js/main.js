/*
--- Ailey & Bailey Canvas ---
File: js/main.js
Version: 11.0 (Modular)
Description: Main entry point for all JavaScript. Initializes all modules and sets up global event listeners.
*/

// Core Imports
import { initializeFirebase } from './core/firebase.js';
import { loadInitialState, getState, updateState } from './core/state.js';

// DOM Element Imports
import * as DOM from './utils/domElements.js';

// Helper Imports
import { updateClock } from './utils/helpers.js';

// UI Module Imports
import { makePanelDraggable, togglePanel } from './ui/panels.js';
import { startQuiz, submitQuiz, openPromptModal, closePromptModal, saveCustomPrompt } from './ui/modals.js';
import { initializeTooltips, handleTextSelection } from './ui/tooltips.js';
import { setupNavigator } from './ui/toc.js';
import { listenToNotes, renderNoteList, addNote, switchView, handleNotesListClick, handleNoteInput, applyFormat, linkTopicToNote } from './ui/notes.js';
import { listenToChatSessions, listenToProjects } from './ui/chat/state.js';
import { initializeChat } from './ui/chat/main.js';
import { handleChatSend } from './ui/chat/actions.js';

/**
 * Main initialization function for the entire application.
 */
async function initialize() {
    // 1. Load initial state from localStorage
    loadInitialState();

    // 2. Setup recurring tasks
    updateClock();
    setInterval(updateClock, 1000);

    // 3. Initialize Firebase and dependent listeners
    try {
        await initializeFirebase();
        // These listeners depend on Firebase being initialized
        listenToNotes();
        listenToChatSessions();
        listenToProjects();
    } catch (error) {
        console.error("Critical initialization failed. Some features may not work.", error);
        if(DOM.notesList) DOM.notesList.innerHTML = '<div>클라우드 메모장을 불러오는 데 실패했습니다.</div>';
        if(DOM.chatMessages) DOM.chatMessages.innerHTML = '<div>AI 러닝메이트 연결에 실패했습니다.</div>';
        return; // Stop further initialization if Firebase fails
    }

    // 4. Initialize UI components
    setupNavigator();
    initializeTooltips();
    makePanelDraggable(DOM.chatPanel);
    makePanelDraggable(DOM.notesAppPanel);
    
    // 5. Initialize Chat System
    initializeChat();

    // 6. Setup global event listeners
    document.addEventListener('click', handleTextSelection);

    if (DOM.themeToggle) {
        DOM.themeToggle.addEventListener('click', () => {
            DOM.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', DOM.body.classList.contains('dark-mode') ? 'dark' : 'light');
        });
        if (localStorage.getItem('theme') === 'dark') {
            DOM.body.classList.add('dark-mode');
        }
    }

    if (DOM.tocToggleBtn) {
        DOM.tocToggleBtn.addEventListener('click', () => {
            DOM.wrapper.classList.toggle('toc-hidden');
            DOM.systemInfoWidget?.classList.toggle('tucked');
        });
    }
    
    // Panel Toggles
    if (DOM.chatToggleBtn) DOM.chatToggleBtn.addEventListener('click', () => togglePanel(DOM.chatPanel));
    if (DOM.chatPanel) DOM.chatPanel.querySelector('.close-btn')?.addEventListener('click', () => togglePanel(DOM.chatPanel, false));
    if (DOM.notesAppToggleBtn) {
        DOM.notesAppToggleBtn.addEventListener('click', () => {
            togglePanel(DOM.notesAppPanel);
            if (DOM.notesAppPanel.style.display === 'flex') {
                renderNoteList();
            }
        });
    }

    // Popover Actions
    if (DOM.popoverAskAi) {
        DOM.popoverAskAi.addEventListener('click', () => {
            const { lastSelectedText } = getState();
            if (!lastSelectedText || !DOM.chatInput) return;
            togglePanel(DOM.chatPanel, true);
            // handleNewChat(); // Decide if a new chat should start
            setTimeout(() => {
                DOM.chatInput.value = "\"\n\n이 내용에 대해 더 자세히 설명해줄래?;
                DOM.chatInput.style.height = (DOM.chatInput.scrollHeight) + 'px';
                DOM.chatInput.focus();
            }, 100);
            DOM.selectionPopover.style.display = 'none';
        });
    }
    if (DOM.popoverAddNote) {
        DOM.popoverAddNote.addEventListener('click', () => {
            const { lastSelectedText } = getState();
            if (!lastSelectedText) return;
            addNote(> \\n\n);
            DOM.selectionPopover.style.display = 'none';
        });
    }
    
    // Modals
    if (DOM.promptSaveBtn) DOM.promptSaveBtn.addEventListener('click', saveCustomPrompt);
    if (DOM.promptCancelBtn) DOM.promptCancelBtn.addEventListener('click', closePromptModal);
    if (DOM.startQuizBtn) DOM.startQuizBtn.addEventListener('click', startQuiz);
    if (DOM.quizSubmitBtn) DOM.quizSubmitBtn.addEventListener('click', submitQuiz);
    if (DOM.quizModalOverlay) DOM.quizModalOverlay.addEventListener('click', e => { if (e.target === DOM.quizModalOverlay) DOM.quizModalOverlay.style.display = 'none'; });

    // Notes App
    if (DOM.addNewNoteBtn) DOM.addNewNoteBtn.addEventListener('click', () => addNote());
    if (DOM.backToListBtn) DOM.backToListBtn.addEventListener('click', () => switchView('list'));
    if (DOM.searchInput) DOM.searchInput.addEventListener('input', renderNoteList);
    if (DOM.notesList) DOM.notesList.addEventListener('click', handleNotesListClick);
    if (DOM.noteTitleInput) DOM.noteTitleInput.addEventListener('input', handleNoteInput);
    if (DOM.noteContentTextarea) DOM.noteContentTextarea.addEventListener('input', handleNoteInput);
    if (DOM.formatToolbar) DOM.formatToolbar.addEventListener('click', e => { const btn = e.target.closest('.format-btn'); if (btn) applyFormat(btn.dataset.format); });
    if (DOM.linkTopicBtn) DOM.linkTopicBtn.addEventListener('click', linkTopicToNote);
}

// --- Start the application ---
document.addEventListener('DOMContentLoaded', initialize);
