/*
--- Ailey & Bailey Canvas ---
File: script_main.js
Version: 13.2 (UX Enhancement)
Architect: [Username] & System Architect Ailey
Description: The main entry point for the application. Attaches all necessary event listeners using robust patterns.
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
        if (themeToggle) { 
            themeToggle.addEventListener('click', () => { 
                body.classList.toggle('dark-mode'); 
                localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light'); 
            }); 
            if(localStorage.getItem('theme') === 'dark') body.classList.add('dark-mode'); else body.classList.remove('dark-mode');
        }
        if (tocToggleBtn) tocToggleBtn.addEventListener('click', () => { wrapper.classList.toggle('toc-hidden'); systemInfoWidget?.classList.toggle('tucked'); });

        // --- Panel Toggles ---
        if (chatToggleBtn) chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));
        if (chatPanel) chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));
        if (notesAppToggleBtn) notesAppToggleBtn.addEventListener('click', () => { 
            // [FIXED] Changed from force 'true' to a proper toggle
            togglePanel(notesAppPanel);
            if(notesAppPanel.style.display === 'flex') renderNoteList();
        });

        // --- Notes App Listeners (REVISED with Event Delegation) ---
        if (noteListView) {
            // --- Click Event Delegation ---
            noteListView.addEventListener('click', e => {
                const dropdownAction = e.target.closest('.dropdown-item')?.dataset.action;
                if(dropdownAction) {
                    if (dropdownAction === 'export-all') exportAllData();
                    else if (dropdownAction === 'import-all') handleRestoreClick();
                    else if (dropdownAction === 'system-reset') handleSystemReset();
                    document.getElementById('notes-dropdown-menu')?.classList.remove('show');
                    return;
                }

                const noteItem = e.target.closest('.note-item');
                if (noteItem) {
                    const id = noteItem.dataset.id; 
                    if (e.target.closest('.delete-btn')) { handleDeleteRequest(id); return; }
                    if (e.target.closest('.pin-btn')) { togglePin(id); return; }
                    openNoteEditor(id);
                    return;
                }

                const projectHeader = e.target.closest('.note-project-header');
                if(projectHeader && !e.target.closest('input')) {
                    toggleNoteProjectExpansion(projectHeader.closest('.note-project-container').dataset.projectId);
                    return;
                }
                
                const newNoteBtn = e.target.closest('#add-new-note-btn-dynamic');
                if (newNoteBtn) { addNote(); return; }
                const newProjectBtn = e.target.closest('#add-new-note-project-btn-dynamic');
                if (newProjectBtn) { createNewNoteProject(); return; }
                const moreOptionsBtn = e.target.closest('#more-options-btn');
                if (moreOptionsBtn) { document.getElementById('notes-dropdown-menu')?.classList.toggle('show'); return; }
            });

            // --- Context Menu (Right-click) Delegation ---
            noteListView.addEventListener('contextmenu', e => {
                const projectHeader = e.target.closest('.note-project-header');
                if (projectHeader) {
                    e.preventDefault();
                    showNoteProjectContextMenu(projectHeader.closest('.note-project-container').dataset.projectId, e);
                }
            });

            // --- Drag and Drop Delegation ---
            let draggedNoteId = null;
            noteListView.addEventListener('dragstart', e => {
                const noteItem = e.target.closest('.note-item');
                if (noteItem) {
                    draggedNoteId = noteItem.dataset.id;
                    e.dataTransfer.setData('text/plain', draggedNoteId);
                    // Use a timeout to allow the browser to create its drag image before we apply our class
                    setTimeout(() => noteItem.classList.add('is-dragging'), 0);
                }
            });

            noteListView.addEventListener('dragover', e => {
                e.preventDefault(); // Necessary to allow dropping
                const projectHeader = e.target.closest('.note-project-header');
                if (projectHeader) {
                    projectHeader.classList.add('drag-over');
                }
            });

            noteListView.addEventListener('dragleave', e => {
                const projectHeader = e.target.closest('.note-project-header');
                if (projectHeader) {
                    projectHeader.classList.remove('drag-over');
                }
            });

            noteListView.addEventListener('drop', e => {
                e.preventDefault();
                const projectHeader = e.target.closest('.note-project-header');
                if (projectHeader && draggedNoteId) {
                    const projectId = projectHeader.closest('.note-project-container').dataset.projectId;
                    moveNoteToProject(draggedNoteId, projectId);
                    projectHeader.classList.remove('drag-over');
                }
            });

            noteListView.addEventListener('dragend', e => {
                 const noteItem = document.querySelector(`.note-item[data-id='${draggedNoteId}']`);
                 if(noteItem) noteItem.classList.remove('is-dragging');
                 draggedNoteId = null;
            });


            // --- Search Input ---
            noteListView.addEventListener('input', e => {
                if (e.target.id === 'search-input-dynamic') {
                    renderNoteList();
                }
            });
        }
        if (fileImporter) fileImporter.addEventListener('change', importAllData);
        
        // --- Note Editor Listeners ---
        if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
        const handleInput = () => { updateStatus('입력 중...', true); if (debounceTimer) clearTimeout(debounceTimer); debounceTimer = setTimeout(saveNote, 1000); };
        if (noteTitleInput) noteTitleInput.addEventListener('input', handleInput);
        if (noteContentTextarea) noteContentTextarea.addEventListener('input', handleInput);
        if (formatToolbar) formatToolbar.addEventListener('click', e => { const b = e.target.closest('.format-btn'); if (b) applyFormat(b.dataset.format); });
        if (linkTopicBtn) linkTopicBtn.addEventListener('click', () => { if(!noteContentTextarea) return; const t = document.title || '현재 학습'; noteContentTextarea.value += `\n\n🔗 연관 학습: [${t}]`; saveNote(); });
        
        // --- Other Listeners (Chat, Modals, API settings, etc.) ---
        if (chatForm) chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });
        if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } });
        if (deleteSessionBtn) deleteSessionBtn.addEventListener('click', () => handleDeleteSession(currentSessionId));
        if (newChatBtn) newChatBtn.addEventListener('click', handleNewChat);
        if (newProjectBtn) newProjectBtn.addEventListener('click', createNewProject);
        if (searchSessionsInput) searchSessionsInput.addEventListener('input', renderSidebarContent);
        if (apiSettingsBtn) apiSettingsBtn.addEventListener('click', openApiSettingsModal);
    }

    initialize();
});