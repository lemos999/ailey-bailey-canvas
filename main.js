/*
--- Ailey & Bailey Canvas ---
File: main.js (Entry Point)
Version: 11.0 (JS Module Structure)
Architect: [Username] & System Architect CodeMaster
Description: This is the main entry point for the application. It imports all feature modules, initializes them, and sets up global event listeners, orchestrating the entire system.
*/

import { initializeFirebase, getDb, getAuth } from './firebase-config.js';
import { initializeNotesModule } from './notes-module.js';
import { initializeChatModule } from './chat-module.js';
import { 
    updateClock, 
    setupSystemInfoWidget, 
    initializeTooltips, 
    makePanelDraggable, 
    setupNavigator, 
    handleTextSelection,
    showModal
} from './ui-helpers.js';
import { state } from './state.js';

document.addEventListener('DOMContentLoaded', async function () {
    // --- 0. Pre-Initialization ---
    const body = document.body;
    if (!body) {
        console.error("CRITICAL: Body element not found. Application cannot start.");
        return;
    }

    // --- 1. Core System Initialization ---
    try {
        await initializeFirebase();
        state.db = getDb();
        state.auth = getAuth();
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        showModal("시스템의 핵심 기능(DB)을 불러오는 데 실패했습니다. 일부 기능이 작동하지 않을 수 있습니다.", () => {});
        // Proceed with non-DB dependent functionalities
    }

    // --- 2. UI & System Components Initialization ---
    
    // Non-DB dependent UI setup
    updateClock();
    setInterval(updateClock, 1000);

    const chatPanel = document.getElementById('chat-panel');
    const notesAppPanel = document.getElementById('notes-app-panel');
    if (chatPanel) makePanelDraggable(chatPanel);
    if (notesAppPanel) makePanelDraggable(notesAppPanel);

    // Setup that can run even if DB fails but is better with it
    setupNavigator();
    initializeTooltips();

    // DB-dependent initialization
    if (state.db && state.auth.currentUser) {
        setupSystemInfoWidget(state.auth.currentUser);
        
        const notesModuleInitialized = initializeNotesModule();
        const chatModuleInitialized = initializeChatModule();

        if (!notesModuleInitialized) {
             console.error("Notes Module initialization failed.");
        }
        if (!chatModuleInitialized) {
             console.error("Chat Module initialization failed.");
        }
    } else {
        console.warn("Skipping DB-dependent module initializations.");
    }

    // --- 3. Global Event Listeners ---
    document.addEventListener('click', (e) => {
        handleTextSelection(e);
        const openedContextMenu = document.querySelector('.project-context-menu, .session-context-menu');
        if (openedContextMenu && !e.target.closest('.project-context-menu, .session-context-menu, .project-actions-btn')) {
            openedContextMenu.remove();
        }
    });

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
        });
        // Initial theme set
        if (localStorage.getItem('theme') === 'dark') {
            body.classList.add('dark-mode');
        }
    }
    
    const tocToggleBtn = document.getElementById('toc-toggle-btn');
    const wrapper = document.querySelector('.wrapper');
    const systemInfoWidget = document.getElementById('system-info-widget');
    if (tocToggleBtn && wrapper) {
        tocToggleBtn.addEventListener('click', () => {
            wrapper.classList.toggle('toc-hidden');
            systemInfoWidget?.classList.toggle('tucked');
        });
    }

    console.log("Ailey & Bailey Canvas System Initialized.");
});