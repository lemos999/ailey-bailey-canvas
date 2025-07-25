/*
--- Ailey & Bailey Canvas ---
File: script_main.js
Version: 13.2 (Note App UX Enhancement)
Architect: [Username] & System Architect Ailey
Description: The main entry point for the application. Attaches all necessary event listeners using robust, delegated patterns.
*/

// --- Utility Functions ---
function debounce(func, delay = 300) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

function removeContextMenu() {
    currentOpenContextMenu?.remove();
    currentOpenContextMenu = null;
}

function positionContextMenu(menu, event) {
    const { clientX: mouseX, clientY: mouseY } = event;
    const { innerWidth, innerHeight } = window;
    const menuRect = menu.getBoundingClientRect();
    let x = mouseX, y = mouseY;
    if (mouseX + menuRect.width > innerWidth) x -= menuRect.width;
    if (mouseY + menuRect.height > innerHeight) y -= menuRect.height;
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.display = 'block';
}


document.addEventListener('DOMContentLoaded', function () {

    function initialize() {
        if (!body || !wrapper) { console.error("Core layout elements not found."); return; }
        updateClock(); 
        setInterval(updateClock, 1000);
        
        createApiSettingsModal();
        
        // [NEW] Dynamically add a permanent header to the notes panel for dragging
        if (notesAppPanel) {
            const notesHeader = document.createElement('div');
            notesHeader.className = 'panel-header';
            notesHeader.innerHTML = `<span class="panel-title">지식 발전소</span><span class="close-btn"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg></span>`;
            notesAppPanel.prepend(notesHeader);
        }

        loadApiSettings();
        updateChatHeaderModelSelector();
        
        initializeFirebase().then(() => { 
            setupNavigator(); 
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
            if (!e.target.closest('.note-context-menu, .session-context-menu')) removeContextMenu();
            if (!e.target.closest('.more-options-container')) document.getElementById('notes-dropdown-menu')?.classList.remove('show');
        });
        document.addEventListener('contextmenu', e => {
            if (e.target.closest('.note-item') || e.target.closest('.note-project-header')) {
                e.preventDefault();
            }
        });

        if (popoverAskAi) popoverAskAi.addEventListener('click', handlePopoverAskAi);
        if (popoverAddNote) popoverAddNote.addEventListener('click', handlePopoverAddNote);

        // --- Global UI Listeners ---
        if (themeToggle) themeToggle.addEventListener('click', () => { body.classList.toggle('dark-mode'); localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light'); }); 
        if(localStorage.getItem('theme') === 'dark') body.classList.add('dark-mode'); else body.classList.remove('dark-mode');
        if (tocToggleBtn) tocToggleBtn.addEventListener('click', () => { wrapper.classList.toggle('toc-hidden'); systemInfoWidget?.classList.toggle('tucked'); });

        // --- Panel Toggles & Close Buttons ---
        if (chatToggleBtn) chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));
        if (chatPanel) chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));
        if (notesAppToggleBtn) notesAppToggleBtn.addEventListener('click', () => { 
            const isOpening = notesAppPanel.style.display !== 'flex';
            togglePanel(notesAppPanel);
            if(isOpening) renderNoteList(); // Only render when opening
        });
        if (notesAppPanel) {
            // Listener for the new dynamically created close button
            notesAppPanel.querySelector('.panel-header .close-btn').addEventListener('click', () => togglePanel(notesAppPanel, false));
        }

        // --- Notes App Listeners (Heavily Revised with Delegation) ---
        if (noteListView) {
            // LEFT CLICK Delegation
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
                if (noteItem) { openNoteEditor(noteItem.dataset.id); return; }

                const projectHeader = e.target.closest('.note-project-header');
                if(projectHeader) { toggleNoteProjectExpansion(projectHeader.closest('.note-project-container').dataset.projectId); return; }
                
                if (e.target.closest('#add-new-note-btn-dynamic')) { addNote(); return; }
                if (e.target.closest('#add-new-note-project-btn-dynamic')) { createNewNoteProject(); return; }
                if (e.target.closest('#more-options-btn')) { document.getElementById('notes-dropdown-menu')?.classList.toggle('show'); return; }
            });

            // RIGHT CLICK (CONTEXT MENU) Delegation
            noteListView.addEventListener('contextmenu', e => {
                const noteItem = e.target.closest('.note-item');
                if (noteItem) { showNoteContextMenu(noteItem.dataset.id, e); return; }

                const projectHeader = e.target.closest('.note-project-header');
                if(projectHeader) { showNoteProjectContextMenu(projectHeader.closest('.note-project-container').dataset.projectId, e); return; }
            });

            // SEARCH INPUT (with Debounce)
            const debouncedRender = debounce(renderNoteList, 300);
            noteListView.addEventListener('input', e => {
                if (e.target.id === 'search-input-dynamic') {
                    debouncedRender();
                }
            });

            // DRAG & DROP Delegation
            noteListView.addEventListener('dragstart', e => {
                const noteItem = e.target.closest('.note-item');
                if(noteItem) {
                    draggedNoteId = noteItem.dataset.id;
                    e.dataTransfer.effectAllowed = 'move';
                    setTimeout(() => noteItem.classList.add('is-dragging'), 0);
                }
            });
            noteListView.addEventListener('dragend', e => {
                const noteItem = e.target.closest('.note-item');
                if(noteItem) noteItem.classList.remove('is-dragging');
                draggedNoteId = null;
            });
            noteListView.addEventListener('dragover', e => {
                e.preventDefault();
                const targetProject = e.target.closest('.note-project-header');
                document.querySelectorAll('.note-project-header.drag-over').forEach(el => el.classList.remove('drag-over'));
                if(targetProject) {
                    targetProject.classList.add('drag-over');
                    e.dataTransfer.dropEffect = 'move';
                } else {
                    e.dataTransfer.dropEffect = 'none';
                }
            });
            noteListView.addEventListener('dragleave', e => {
                 e.target.closest('.note-project-header')?.classList.remove('drag-over');
            });
            noteListView.addEventListener('drop', e => {
                e.preventDefault();
                document.querySelectorAll('.note-project-header.drag-over').forEach(el => el.classList.remove('drag-over'));
                const targetProject = e.target.closest('.note-project-header');
                if (targetProject && draggedNoteId) {
                    const projectId = targetProject.closest('.note-project-container').dataset.projectId;
                    moveNoteToProject(draggedNoteId, projectId);
                }
            });
        }
        if (fileImporter) fileImporter.addEventListener('change', importAllData);
        
        // --- Note Editor Listeners ---
        if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
        const handleNoteInput = () => { updateStatus('입력 중...', true); if (debounceTimer) clearTimeout(debounceTimer); debounceTimer = setTimeout(saveNote, 1000); };
        if (noteTitleInput) noteTitleInput.addEventListener('input', handleNoteInput);
        if (noteContentTextarea) noteContentTextarea.addEventListener('input', handleNoteInput);
        
        // --- Chat App Event Listeners (assumed correct, omitted for brevity) ---
        // (Existing chat listeners...)
    }

    initialize();
});