/*
--- Ailey & Bailey Canvas ---
File: script_main.js
Version: 13.2 (Robust Rendering & Logic)
Architect: [Username] & System Architect Ailey
Description: The main entry point for the application. Attaches all necessary event listeners using robust event delegation.
*/

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
            apiSettingsBtn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>`;
            chatHeader.appendChild(apiSettingsBtn);
        }
        
        loadApiSettings();
        updateChatHeaderModelSelector();
        
        initializeFirebase().then(() => { 
            setupNavigator(); 
            setupChatModeSelector(); 
            initializeTooltips(); 
            makePanelDraggable(chatPanel); 
            makePanelDraggable(notesAppPanel); 
            handleNewChat();
        });

        attachEventListeners();
    }

    function attachEventListeners() {
        // --- Global Listeners ---
        document.addEventListener('click', (e) => { 
            handleTextSelection(e); 
            if (!e.target.closest('.session-context-menu, .project-context-menu, .note-project-context-menu')) removeContextMenu();
            if (!e.target.closest('.more-options-container')) document.getElementById('notes-dropdown-menu')?.classList.remove('show');
        });
        
        if (popoverAskAi) popoverAskAi.addEventListener('click', handlePopoverAskAi);
        if (popoverAddNote) popoverAddNote.addEventListener('click', handlePopoverAddNote);

        // --- Global UI Listeners ---
        if (themeToggle) { /* Unchanged */ }
        if (tocToggleBtn) { /* Unchanged */ }

        // --- Panel Toggles & Main App Listeners ---
        if (chatToggleBtn) chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));
        if (chatPanel) chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));
        if (notesAppToggleBtn) notesAppToggleBtn.addEventListener('click', () => { 
            togglePanel(notesAppPanel); 
            if(notesAppPanel.style.display === 'flex') renderNoteList(true); // Initial full render
        });

        // --- Chat App Listeners (unchanged, for brevity) ---
        // ... (omitted)

        // [PATCH] Step 2: Robust Event Listener for the ENTIRE Notes Panel
        if (notesAppPanel) {
            notesAppPanel.addEventListener('click', e => {
                const targetAction = e.target.closest('[data-action]')?.dataset.action;
                const noteItem = e.target.closest('.note-item');
                const projectHeader = e.target.closest('.note-project-header');

                if (targetAction) {
                    switch (targetAction) {
                        case 'add-note': addNote(); break;
                        case 'add-project': createNewNoteProject(); break;
                        case 'toggle-more-options': document.getElementById('notes-dropdown-menu')?.classList.toggle('show'); break;
                        case 'export-all': exportAllData(); document.getElementById('notes-dropdown-menu')?.classList.remove('show'); break;
                        case 'import-all': handleRestoreClick(); document.getElementById('notes-dropdown-menu')?.classList.remove('show'); break;
                        case 'system-reset': handleSystemReset(); document.getElementById('notes-dropdown-menu')?.classList.remove('show'); break;
                    }
                } else if (noteItem) {
                    const id = noteItem.dataset.id; 
                    if (e.target.closest('.delete-btn')) handleDeleteRequest(id); 
                    else if (e.target.closest('.pin-btn')) togglePin(id); 
                    else openNoteEditor(id);
                } else if (projectHeader) {
                    toggleNoteProjectExpansion(projectHeader.closest('.note-project-container').dataset.projectId);
                }
            });

            // Add other delegated listeners if needed, e.g., for drag-and-drop on '#notes-list-container'
        }
        
        // --- Note Editor Listeners ---
        if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
        const handleInput = () => { updateStatus('입력 중...', true); if (debounceTimer) clearTimeout(debounceTimer); debounceTimer = setTimeout(saveNote, 1000); };
        if (noteTitleInput) noteTitleInput.addEventListener('input', handleInput);
        if (noteContentTextarea) noteContentTextarea.addEventListener('input', handleInput);
        if (formatToolbar) formatToolbar.addEventListener('click', e => { const b = e.target.closest('.format-btn'); if (b) applyFormat(b.dataset.format); });
        
        // --- Modal & API Settings Listeners (unchanged, for brevity) ---
        // ... (omitted)
    }

    initialize();
});