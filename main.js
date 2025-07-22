/*
--- Ailey & Bailey Canvas ---
File: main.js (Entry Point)
Version: 12.0.1 (Error Fix & Stability Improvement)
Architect: [Username] & System Architect CodeMaster
Description: This is the main entry point for the application. It imports all primary feature modules (chat, notes), initializes them, and sets up global event listeners. **Fix: Ensured Firebase initialization and logging occurs only once to prevent duplicate logs and improve stability.**
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
import { openApiSettingsModal, createApiSettingsModal } from './api-settings.js'; // [NEW] Import API settings functions
import { state } from './state.js';

// --- Main Application Start ---
document.addEventListener('DOMContentLoaded', async function () {
    // --- 0. Pre-Initialization ---
    const body = document.body;
    if (!body) {
        console.error("CRITICAL: Body element not found. Application cannot start.");
        return;
    }

    // --- 1. Core System Initialization ---
    try {
        // [FIX] Ensure Firebase initialization logic runs only once.
        if (!state.auth) { 
            await initializeFirebase();
            state.db = getDb();
            state.auth = getAuth();
            console.log("Firebase initialized and user signed in:", state.auth.currentUser ? state.auth.currentUser.uid : 'No user');
        }
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

    setupNavigator();
    initializeTooltips();
    createApiSettingsModal(); // [NEW] Call to create the API settings modal HTML

    // DB-dependent initialization
    if (state.db && state.auth.currentUser) {
        setupSystemInfoWidget(state.auth.currentUser);
        
        // Initialize primary modules
        const notesModuleInitialized = initializeNotesModule();
        const chatModuleInitialized = initializeChatModule(); // This now initializes all chat sub-modules

        if (!notesModuleInitialized) {
             console.error("Notes Module initialization failed.");
        }
        if (!chatModuleInitialized) {
             console.error("Chat Module initialization failed.");
        }
    } else {
        console.warn("Skipping DB-dependent module initializations. Core features like notes and chat will be disabled.");
        // Disable interactive elements that require a database connection
        document.querySelectorAll('#chat-toggle-btn, #notes-app-toggle-btn').forEach(btn => {
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.disabled = true;
        });
    }

    // --- [NEW] Dynamic API Settings Button Creation and Event Listener ---
    const chatHeaderContentDiv = document.querySelector('#chat-main-view .panel-header > div');
    if (chatHeaderContentDiv) {
        const apiSettingsBtn = document.createElement('span');
        apiSettingsBtn.id = 'api-settings-btn';
        apiSettingsBtn.title = '개인 API 설정';
        apiSettingsBtn.style.cursor = 'pointer'; // Ensure cursor style
        apiSettingsBtn.style.marginLeft = '10px'; // Add some spacing
        apiSettingsBtn.style.lineHeight = '0'; // Align SVG
        apiSettingsBtn.style.transition = 'transform 0.2s ease-in-out'; // Add transition for hover effect
        apiSettingsBtn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>`;
        chatHeaderContentDiv.appendChild(apiSettingsBtn); // Append to the div that contains title and model selector
        apiSettingsBtn.addEventListener('click', openApiSettingsModal); // Attach the event listener
    }


    // --- 3. Global Event Listeners ---
    document.addEventListener('click', (e) => {
        handleTextSelection(e);
        const openedContextMenu = document.querySelector('.project-context-menu, .session-context-menu');
        if (openedContextMenu && !e.target.closest('.project-context-menu, .session-context-menu, .project-actions-btn, .session-item')) {
            const uiModule = import('./chat-ui.js');
            uiModule.then(ui => ui.removeContextMenu());
        }
    });

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
        });
        // Initial theme set
        if (localStorage.getItem('theme') !== 'light') { // Default to dark
            body.classList.add('dark-mode');
        } else {
            body.classList.remove('dark-mode');
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