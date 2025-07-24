/*
--- Ailey & Bailey Canvas ---
File: script_main.js
Version: 14.0 (Smart Editor)
Architect: [Username] & System Architect Ailey
Description: The main entry point for the application. Attaches all necessary event listeners using delegation.
*/

document.addEventListener('DOMContentLoaded', function () {
    function initialize() {
        // ... (initialization code like updateClock, createApiSettingsModal, etc. is unchanged) ...
        
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
        // --- Global Listeners (unchanged) ---
        document.addEventListener('click', (e) => { 
            // ... (logic for text selection, context menu closing, dropdown closing) ...
        });
        
        // ... (other global listeners like themeToggle, tocToggleBtn are unchanged) ...

        // --- Panel Toggles (unchanged) ---
        // ... (chatToggleBtn, notesAppToggleBtn listeners are unchanged) ...

        // --- Chat App Listeners (unchanged) ---
        // ... (All chat listeners are unchanged) ...

        // --- [MODIFIED] Notes App Listeners using EVENT DELEGATION ---
        if (notesAppPanel) {
            notesAppPanel.addEventListener('click', e => {
                const target = e.target;
                
                // Actions within the list view
                const listView = target.closest('#note-list-view');
                if(listView) {
                    const dropdownAction = target.closest('.dropdown-item')?.dataset.action;
                    if (dropdownAction) {
                        if (dropdownAction === 'export-all') exportAllData();
                        else if (dropdownAction === 'import-all') handleRestoreClick();
                        else if (dropdownAction === 'system-reset') handleSystemReset();
                        document.getElementById('notes-dropdown-menu')?.classList.remove('show');
                        return;
                    }
                    const noteItem = target.closest('.note-item');
                    if (noteItem) {
                        const id = noteItem.dataset.id;
                        if (target.closest('.delete-btn')) handleDeleteRequest(id);
                        else if (target.closest('.pin-btn')) togglePin(id);
                        else openNoteEditor(id);
                        return;
                    }
                    const projectHeader = target.closest('.note-project-header');
                    if (projectHeader) {
                        toggleNoteProjectExpansion(projectHeader.closest('.note-project-container').dataset.projectId);
                        return;
                    }
                }
                
                // Actions within the editor view
                const editorView = target.closest('#note-editor-view');
                if(editorView) {
                    if (target.closest('#back-to-list-btn')) {
                        switchView('list');
                        return;
                    }
                    if (target.closest('#link-topic-btn')) {
                        if (quillEditor) {
                            const range = quillEditor.getSelection(true);
                            const topicLink = `\n<p><a href="#">🔗 연관 학습: ${document.title || '현재 학습'}</a></p>`;
                            quillEditor.clipboard.dangerouslyPasteHTML(range.index, topicLink);
                            saveNote();
                        }
                        return;
                    }
                }
            });
        }
        
        // --- Note Title Input Listener (remains direct) ---
        if (noteTitleInput) noteTitleInput.addEventListener('input', () => {
            updateStatus('입력 중...', true);
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(saveNote, 1500);
        });

        // ... (Modal & API Settings Listeners are unchanged) ...
    }

    initialize();
});