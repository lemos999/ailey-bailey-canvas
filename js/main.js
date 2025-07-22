/*
--- Ailey & Bailey Canvas ---
File: js/main.js
Version: 11.2 (Final Patch)
Description: The main entry point for the application. Resending the complete file
to fix the critical truncation-related SyntaxError. This is the final, verified version.
*/

// Import initializers and specific functions from all other modules
import { initializeFirebase } from './firebase-service.js';
import { initializeUIManager, setupNavigator, togglePanel, handlePopoverAskAi } from './ui-manager.js';
import { initializeNotesManager, handlePopoverAddNote, renderNoteList } from './notes-manager.js';
import { initializeApiManager } from './api-manager.js';
import { initializeChatSessionManager } from './chat-session.js';
import { initializeChatUI } from './chat-ui.js';
import { initializeChatCore } from './chat-core.js';


// --- Main Application Initialization Flow ---

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Ailey & Bailey Canvas Initializing...");

    // 1. Initialize Firebase first, as other modules depend on it.
    const firebaseReady = await initializeFirebase();
    
    // Get essential elements for event listeners
    const body = document.body;
    const wrapper = document.querySelector('.wrapper');
    const systemInfoWidget = document.getElementById('system-info-widget');
    const themeToggle = document.getElementById('theme-toggle');
    const tocToggleBtn = document.getElementById('toc-toggle-btn');
    const popoverAskAi = document.getElementById('popover-ask-ai');
    const popoverAddNote = document.getElementById('popover-add-note');
    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    const notesAppToggleBtn = document.getElementById('notes-app-toggle-btn');
    const chatPanel = document.getElementById('chat-panel');
    const notesAppPanel = document.getElementById('notes-app-panel');

    // 2. If Firebase fails, halt initialization and show an error.
    if (!firebaseReady) {
        document.body.innerHTML = '<div style="text-align: center; padding: 50px; font-size: 1.2em; color: lightcoral;">시스템 초기화에 실패했습니다. Firebase 연결을 확인해주세요.</div>';
        return;
    }

    // 3. Initialize all feature managers
    initializeUIManager();
    initializeNotesManager();
    initializeApiManager();
    initializeChatSessionManager();
    initializeChatUI();
    initializeChatCore();

    // 4. Setup components that depend on dynamic content
    setupNavigator();

    // 5. Attach global event listeners managed by main.js
    if (themeToggle) {
        // Set initial theme from localStorage
        if (localStorage.getItem('theme') === 'dark') {
            body.classList.add('dark-mode');
        } else {
            body.classList.remove('dark-mode'); // Ensure light mode if not specified
        }
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
        });
    }

    if (tocToggleBtn) {
        tocToggleBtn.addEventListener('click', () => {
            wrapper?.classList.toggle('toc-hidden');
            systemInfoWidget?.classList.toggle('tucked');
        });
    }
    
    if (popoverAskAi) popoverAskAi.addEventListener('click', handlePopoverAskAi);
    if (popoverAddNote) popoverAddNote.addEventListener('click', handlePopoverAddNote);

    if (chatToggleBtn && chatPanel) {
        chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));
        const closeBtn = chatPanel.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => togglePanel(chatPanel, false));
        }
    }

    if (notesAppToggleBtn && notesAppPanel) {
        notesAppToggleBtn.addEventListener('click', () => {
            togglePanel(notesAppPanel);
            // [FIXED] If opening the panel, render the list using the directly imported function
            if (notesAppPanel.style.display === 'flex') {
                renderNoteList();
            }
        });
        // Note: The notes panel's internal buttons like "back-to-list" are handled within notes-manager.js
        // A general close button for the entire panel could be added here if the HTML structure supported it.
    }

    console.log("System Ready.");
});

// SCRIPT END VERIFIED
