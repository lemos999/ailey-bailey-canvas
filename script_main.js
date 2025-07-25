
/*
--- Ailey & Bailey Canvas ---
File: script_main.js
Version: 13.3 (Toast UI Editor Integration)
Architect: [Username] & System Architect Ailey
Description: The main entry point for the application, adapted for Toast UI Editor.
*/
/*
--- Ailey & Bailey Canvas ---
File: script_main.js
Version: 13.3 (Toast UI Editor Integration)
Architect: [Username] & System Architect Ailey
Description: The main entry point for the application, adapted for Toast UI Editor.
*/

// --- Utility Functions ---
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

document.addEventListener('DOMContentLoaded', function () {

    function initialize() {
        if (!body || !wrapper) { console.error("Core layout elements not found."); return; }
        updateClock(); 
        setInterval(updateClock, 1000);
        
        createApiSettingsModal();
        const chatHeader = document.querySelector('#chat-main-view .panel-header > div');
        if (chatHeader) {
            apiSettingsBtn = document.createElement('span'); 
            apiSettingsBtn.id = 'api-settings-btn'; 
            apiSettingsBtn.title = '개인 API 설정';
            apiSettingsBtn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>`;
            chatHeader.appendChild(apiSettingsBtn);
        }
        
        loadApiSettings();
        updateChatHeaderModelSelector();
        
        initializeFirebase().then(() => { 
            setupNavigator(); 
            setupChatModeSelector(); 
            initializeTooltips(); 
            makePanelDraggable(chatPanel);
            handleNewChat();
        });

        attachEventListeners();
    }

    function attachEventListeners() {
        // --- Global Listeners ---
        document.addEventListener('click', (e) => { 
            handleTextSelection(e); 
            if (!e.target.closest('.note-context-menu, .session-context-menu, .project-context-menu')) removeContextMenu();
            if (!e.target.closest('.more-options-container')) document.getElementById('notes-dropdown-menu')?.classList.remove('show');
        });
        
        if (popoverAskAi) popoverAskAi.addEventListener('click', handlePopoverAskAi);
        if (popoverAddNote) popoverAddNote.addEventListener('click', handlePopoverAddNote);

        // --- Global UI Listeners ---
        if (themeToggle) { 
            themeToggle.addEventListener('click', () => { 
                body.classList.toggle('dark-mode'); 
                localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
                // [NEW] Update editor theme on toggle
                if (toastEditor) {
                    toastEditor.setUITheme(body.classList.contains('dark-mode') ? 'dark' : 'default');
                }
            }); 
            if(localStorage.getItem('theme') === 'dark') body.classList.add('dark-mode'); else body.classList.remove('dark-mode');
        }
        if (tocToggleBtn) tocToggleBtn.addEventListener('click', () => { wrapper.classList.toggle('toc-hidden'); systemInfoWidget?.classList.toggle('tucked'); });

        // --- Panel Toggles ---
        if (chatToggleBtn) chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));
        if (chatPanel) chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));
        if (notesAppToggleBtn) {
            notesAppToggleBtn.addEventListener('click', () => { 
                togglePanel(notesAppPanel);
                if (notesAppPanel.style.display === 'flex') {
                    ensureNotePanelHeader();
                    renderNoteList();
                } else {
                    // When closing, destroy the editor instance to save resources
                    if (toastEditor) {
                        toastEditor.destroy();
                        toastEditor = null;
                    }
                }
            });
        }
        
        // --- Notes App Event Delegation (Unchanged) ---
        // Drag/drop, context menu, and other list view listeners remain the same.
        // ...

        if (fileImporter) fileImporter.addEventListener('change', importAllData);
        
        // --- Note Editor Listeners (Simplified) ---
        if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
        if (noteTitleInput) {
            const debouncedSave = debounce(saveNote, 1500);
            noteTitleInput.addEventListener('input', () => {
                updateStatus('입력 중...', true);
                debouncedSave();
            });
        }
        // [REMOVED] formatToolbar and linkTopicBtn listeners are no longer needed.
        
        // --- Chat and other listeners (unchanged) ---
        // ...
    }

    initialize();
});