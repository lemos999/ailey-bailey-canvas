/*
--- Ailey & Bailey Canvas ---
File: js/main.js
Version: 11.2 (Final Stable)
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
import { listenToChatSessions, listenToProjects, handleNewChat } from './ui/chat/state.js';
import { initializeChat } from './ui/chat/main.js';

async function initialize() {
    loadInitialState();
    updateClock();
    setInterval(updateClock, 1000);
    try {
        await initializeFirebase();
        listenToNotes();
        listenToChatSessions();
        listenToProjects();
    } catch (error) {
        console.error("Critical initialization failed.", error);
        if(DOM.notesList) DOM.notesList.innerHTML = '<div>Cloud connection failed.</div>';
        if(DOM.chatMessages) DOM.chatMessages.innerHTML = '<div>AI connection failed.</div>';
        return;
    }

    setupNavigator();
    initializeTooltips();
    makePanelDraggable(DOM.chatPanel);
    makePanelDraggable(DOM.notesAppPanel);
    initializeChat();

    // GLOBAL EVENT LISTENERS
    document.addEventListener('click', handleTextSelection);
    if (DOM.themeToggle) {
        DOM.themeToggle.addEventListener('click', () => {
            DOM.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', DOM.body.classList.contains('dark-mode') ? 'dark' : 'light');
        });
        if (localStorage.getItem('theme') === 'light') {
            DOM.body.classList.remove('dark-mode');
        } else {
            DOM.body.classList.add('dark-mode');
        }
    }
    if (DOM.tocToggleBtn) {
        DOM.tocToggleBtn.addEventListener('click', () => {
            DOM.wrapper.classList.toggle('toc-hidden');
            DOM.systemInfoWidget?.classList.toggle('tucked');
        });
    }
    if (DOM.chatToggleBtn) DOM.chatToggleBtn.addEventListener('click', () => togglePanel(DOM.chatPanel));
    if (DOM.chatPanel) DOM.chatPanel.querySelector('.close-btn')?.addEventListener('click', () => togglePanel(DOM.chatPanel, false));
    if (DOM.notesAppToggleBtn) {
        DOM.notesAppToggleBtn.addEventListener('click', () => {
            togglePanel(DOM.notesAppPanel);
            if (DOM.notesAppPanel.style.display === 'flex') renderNoteList();
        });
    }
    if (DOM.popoverAskAi) {
        DOM.popoverAskAi.addEventListener('click', () => {
            const { lastSelectedText } = getState();
            if (!lastSelectedText || !DOM.chatInput) return;
            togglePanel(DOM.chatPanel, true);
            handleNewChat();
            setTimeout(() => {
                DOM.chatInput.value = `"${lastSelectedText}"\n\n이 내용에 대해 더 자세히 설명해줄래?`;
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
            addNote(`> ${lastSelectedText}\n\n`);
            DOM.selectionPopover.style.display = 'none';
        });
    }
    if (DOM.promptSaveBtn) DOM.promptSaveBtn.addEventListener('click', saveCustomPrompt);
    if (DOM.promptCancelBtn) DOM.promptCancelBtn.addEventListener('click', closePromptModal);
    if (DOM.startQuizBtn) DOM.startQuizBtn.addEventListener('click', startQuiz);
    if (DOM.quizSubmitBtn) DOM.quizSubmitBtn.addEventListener('click', submitQuiz);
    if (DOM.quizModalOverlay) DOM.quizModalOverlay.addEventListener('click', e => { if (e.target === DOM.quizModalOverlay) DOM.quizModalOverlay.style.display = 'none'; });
    if (DOM.addNewNoteBtn) DOM.addNewNoteBtn.addEventListener('click', () => addNote());
    if (DOM.backToListBtn) DOM.backToListBtn.addEventListener('click', () => switchView('list'));
    if (DOM.searchInput) DOM.searchInput.addEventListener('input', renderNoteList);
    if (DOM.notesList) DOM.notesList.addEventListener('click', handleNotesListClick);
    if (DOM.noteTitleInput) DOM.noteTitleInput.addEventListener('input', handleNoteInput);
    if (DOM.noteContentTextarea) DOM.noteContentTextarea.addEventListener('input', handleNoteInput);
    if (DOM.formatToolbar) DOM.formatToolbar.addEventListener('click', e => { const btn = e.target.closest('.format-btn'); if (btn) applyFormat(btn.dataset.format); });
    if (DOM.linkTopicBtn) DOM.linkTopicBtn.addEventListener('click', linkTopicToNote);
}
document.addEventListener('DOMContentLoaded', initialize);
