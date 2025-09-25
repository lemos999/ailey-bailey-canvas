/* --- Ailey & Bailey Canvas --- */
// File: 120_core_main_initializer.js
// Version: 12.1 (Header Toggle Logic)
// Description: Added logic to handle the header toggle button state and events.

function handlePanelMinimize(panel) {
    if (!panel) return;
    if (panel.classList.contains('maximized')) {
        panel.classList.remove('maximized');
        const maximizeBtn = panel.querySelector('.panel-maximize-btn');
        if (maximizeBtn) maximizeBtn.classList.remove('is-maximized');
    }
    panel.classList.toggle('minimized');
}

function handlePanelMaximize(panel) {
    if (!panel) return;
    if (panel.classList.contains('minimized')) {
        panel.classList.remove('minimized');
    }
    panel.classList.toggle('maximized');
    const maximizeBtn = panel.querySelector('.panel-maximize-btn');
    if (maximizeBtn) maximizeBtn.classList.toggle('is-maximized');
}

function openPromptManager() {
    if (promptManagerModalOverlay) promptManagerModalOverlay.style.display = 'flex';
    renderPromptManager();
}

function closePromptManager() {
    if (promptManagerModalOverlay) promptManagerModalOverlay.style.display = 'none';
}

function applyPanelStates() {
    if (userApiSettings.panelStates) {
        for (const panelId in userApiSettings.panelStates) {
            const panel = document.getElementById(panelId);
            const state = userApiSettings.panelStates[panelId];
            if (panel && state) {
                if (state.top) panel.style.top = state.top;
                if (state.left) panel.style.left = state.left;
                if (state.width) panel.style.width = state.width;
                if (state.height) panel.style.height = state.height;
            }
        }
    }
}

function initializeCoreFeatures() {
    temporarySession.messages = [];
    if (!body) { console.error("Core body element not found post-render."); return; }
    if (typeof katex_css_data !== 'undefined' && !document.getElementById('katex-style-injected')) {
        const style = document.createElement('style');
        style.id = 'katex-style-injected';
        style.textContent = katex_css_data;
        document.head.appendChild(style);
    }
    // Dynamically load brand font and handle FOUT
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);
    
    document.fonts.ready.then(() => {
        const brandLogo = document.querySelector('.brand-logo');
        if (brandLogo) {
            brandLogo.style.visibility = 'visible';
            brandLogo.style.opacity = '1';
        }
    });

    updateClock();
    setInterval(updateClock, 1000);
    setInterval(checkStreamCompletions, 500);
    createApiSettingsModal();
    debouncedSaveUserSettings = debounce(() => saveUserSettingsToFirebase(true), 1000);
    
    initializeFirebase().then(() => {
        setupUnifiedSettingsControl();
        // [MODIFIED] Initialize panels with new resizable functionality
        initializeDraggableAndResizablePanel(document.getElementById('chat-panel'));
        initializeDraggableAndResizablePanel(document.getElementById('live-debugger-panel'));
        handleNewChat(false);
        setupDebugger();
        applyPanelStates();
        
        // [PATCH] Load header toggle state from localStorage
        const isHeaderHidden = localStorage.getItem('headerHidden') === 'true';
        if (isHeaderHidden) {
            document.body.classList.add('header-toggled-off');
        }
        
        // Initialize Drawing Feature
        if (typeof DrawingCanvas !== 'undefined') DrawingCanvas.initialize();
        if (typeof DrawingToolbar !== 'undefined') DrawingToolbar.initialize();


        // [ADDED] Admin-only feature activation
        const ADMIN_UID = '16080536473701849787';
        if (currentUser && currentUser.uid === ADMIN_UID) {
            if (debuggerToggleBtn) {
                debuggerToggleBtn.style.display = 'flex';
                trace("System", "AdminVerified", { feature: "Debugger" });
            }
        }
    });
    attachEventListeners();
}

function attachEventListeners() {
    // Immersive Header Scroll Logic
    let lastScrollY = window.scrollY;
    body.classList.add('header-visible');
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        if (currentScrollY < lastScrollY || currentScrollY < 50) {
            body.classList.add('header-visible');
        } else {
            body.classList.remove('header-visible');
        }
        lastScrollY = currentScrollY;
    });

    document.addEventListener('click', (e) => {
        if (selectionPopover) handleTextSelection(e);
        const notesDropdown = document.getElementById('notes-dropdown-menu');
        if (notesDropdown && !e.target.closest('.more-options-container')) {
            notesDropdown.classList.remove('show');
        }
        if (settingsPopover && !e.target.closest('#settings-control-container')) {
            settingsPopover.classList.remove('show');
        }
    });

    // [REFACTORED] Global keyboard shortcuts for drawing mode and tools
    document.addEventListener('keydown', (e) => {
        const isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;

        if (e.key === '`' && !isTyping) {
            e.preventDefault();
            if (typeof DrawingCanvas !== 'undefined' && DrawingCanvas.toggleMode) {
                DrawingCanvas.toggleMode();
            }
            return;
        }

        if (isDrawingModeActive && !isTyping && typeof DrawingToolbar !== 'undefined' && typeof DrawingCanvas !== 'undefined') {
            let handled = true;
            switch (e.key.toLowerCase()) {
                case '1':
                    DrawingToolbar.setActiveTool('pen', { color: '#000000' });
                    break;
                case '2':
                    DrawingToolbar.setActiveTool('pen', { color: '#FFFFFF' });
                    break;
                case '3':
                    DrawingToolbar.setActiveTool('pen', { color: '#FF0000' });
                    break;
                case '4':
                    DrawingToolbar.setActiveTool('pen', { color: '#0000FF' });
                    break;
                case '5':
                    DrawingToolbar.setActiveTool('highlighter');
                    break;
                case '6':
                    DrawingCanvas.undo();
                    break;
                case '7':
                    DrawingCanvas.clearCanvas();
                    break;
                case 'e':
                    if (fabricCanvasInstance && fabricCanvasInstance.freeDrawingBrush) {
                        let newWidth = fabricCanvasInstance.freeDrawingBrush.width + 1;
                        newWidth = Math.min(newWidth, 50); // Clamp max
                        DrawingCanvas.setBrushWidth(newWidth);
                        if (typeof DrawingToolbar.updateBrushSizeUI === 'function') {
                            DrawingToolbar.updateBrushSizeUI(newWidth);
                        }
                    }
                    break;
                case 'q':
                    if (fabricCanvasInstance && fabricCanvasInstance.freeDrawingBrush) {
                        let newWidth = fabricCanvasInstance.freeDrawingBrush.width - 1;
                        newWidth = Math.max(newWidth, 1); // Clamp min
                        DrawingCanvas.setBrushWidth(newWidth);
                        if (typeof DrawingToolbar.updateBrushSizeUI === 'function') {
                            DrawingToolbar.updateBrushSizeUI(newWidth);
                        }
                    }
                    break;
                default:
                    handled = false;
                    break;
            }
            if (handled) {
                e.preventDefault();
            }
        }
    });

    if (popoverAskAi) popoverAskAi.addEventListener('click', () => handlePopoverAskAi(chatInput, chatPanel));
    if (popoverAddNote) popoverAddNote.addEventListener('click', handlePopoverAddNote);

    // [PATCH] Header Toggle Button Logic
    if (headerToggleBtn) {
        headerToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('header-toggled-off');
            const isHidden = document.body.classList.contains('header-toggled-off');
            localStorage.setItem('headerHidden', isHidden);
            trace("UI.Action", "HeaderToggled", { hidden: isHidden });
        });
    }
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            const newTheme = body.classList.contains('dark-mode') ? 'dark' : 'light';
            trace("UI.Action", "ThemeChanged", { to: newTheme });
            saveUserSettingsToFirebase();
            if (window.toastEditorInstance) {
                try {
                    window.toastEditorInstance.setTheme(newTheme);
                } catch (error) {
                    trace("UI.Error", "ToastThemeFail", { error: error.message }, {}, "ERROR");
                    console.error("Failed to set ToastUI editor theme:", error);
                }
            }
        });
    }
    if (chatToggleBtn) chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));
    if (debuggerToggleBtn) debuggerToggleBtn.addEventListener('click', () => togglePanel(debuggerPanel));

    // Panel Controls Event Listeners
    if (chatPanel) {
        chatPanel.addEventListener('mousedown', () => focusPanel(chatPanel));
        chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));
        chatPanel.querySelector('.panel-minimize-btn').addEventListener('click', () => handlePanelMinimize(chatPanel));
        chatPanel.querySelector('.panel-maximize-btn').addEventListener('click', () => handlePanelMaximize(chatPanel));
    }
    if (debuggerPanel) {
        debuggerPanel.addEventListener('mousedown', () => focusPanel(debuggerPanel));
        debuggerPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(debuggerPanel, false));
        debuggerPanel.querySelector('.panel-minimize-btn').addEventListener('click', () => handlePanelMinimize(debuggerPanel));
        debuggerPanel.querySelector('.panel-maximize-btn').addEventListener('click', () => handlePanelMaximize(debuggerPanel));
    }
    if (notesAppPanel) {
        notesAppPanel.addEventListener('mousedown', () => focusPanel(notesAppPanel));
    }
    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', () => {
            chatPanel.classList.toggle('sidebar-collapsed');
        });
    }
    if (notesAppToggleBtn) {
        notesAppToggleBtn.addEventListener('click', () => {
            togglePanel(notesAppPanel);
            if (notesAppPanel && notesAppPanel.style.display === 'flex') {
                ensureNotePanelHeader();
                switchView('list');
                renderNoteList();
            }
        });
    }
    if (noteListView) {
       noteListView.addEventListener('click', e => {
            const target = e.target;
            const dropdownAction = target.closest('.dropdown-item')?.dataset.action;
            if (dropdownAction) {
                if (dropdownAction === 'export-all') exportAllData();
                else if (dropdownAction === 'import-all') document.getElementById('file-importer')?.click();
                else if (dropdownAction === 'system-reset') handleSystemReset();
                document.getElementById('notes-dropdown-menu')?.classList.remove('show');
                return;
            }
            if (target.closest('#add-new-note-btn-dynamic')) { handleAddNewNote(); return; }
            if (target.closest('#add-new-note-project-btn-dynamic')) { createNewNoteProject(); return; }
            if (target.closest('#more-options-btn')) { document.getElementById('notes-dropdown-menu')?.classList.toggle('show'); return; }
            const noteItem = target.closest('.note-item'); if (noteItem) { openNoteEditor(noteItem.dataset.id); return; }
            const projectHeader = target.closest('.note-project-header'); if (projectHeader) { toggleNoteProjectExpansion(projectHeader.closest('.note-project-container').dataset.projectId); return; }
        });
        noteListView.addEventListener('contextmenu', handleNoteContextMenu);
        noteListView.addEventListener('input', debounce(e => { if (e.target.id === 'search-input-dynamic') renderNoteList(); }, 300));
    }
    if (fileImporter) fileImporter.addEventListener('change', importAllData);
    if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
    if (noteTitleInput) noteTitleInput.addEventListener('input', debounce(() => saveNote(), 1500));
    if (chatForm) chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend({ inputElement: chatInput }); });
    if (chatInput) {
        chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend({ inputElement: chatInput }); } });
        chatInput.addEventListener('input', () => autoResizeTextarea(chatInput));
    }
    if (quickQuerySendBtn) quickQuerySendBtn.addEventListener('click', () => handleQuickQuerySend());
    if (quickQueryInput) quickQueryInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuickQuerySend(); } });
    if (quickQueryTempToggle) {
        quickQueryTempToggle.addEventListener('click', () => {
            setTempChatMode(!isQuickQueryTempMode);
        });
    }
    if (tempSessionToggle) {
        tempSessionToggle.addEventListener('click', () => {
            const isActive = tempSessionToggle.classList.contains('active');
            setTempChatMode(!isActive);
        });
    }
    if (newChatBtn) newChatBtn.addEventListener('click', () => {
       handleNewChat(false);
    });
    if (newProjectBtn) newProjectBtn.addEventListener('click', createNewProject);
    if (searchSessionsInput) searchSessionsInput.addEventListener('input', debounce(renderSidebarContent, 300));
    if (sessionListContainer) {
         sessionListContainer.addEventListener('click', e => {
             const sessionItem = e.target.closest('.session-item'); if(sessionItem) { selectSession(sessionItem.dataset.sessionId); return; }
             const projectHeader = e.target.closest('.project-header');
             if(projectHeader) {
                const actionsBtn = e.target.closest('.project-actions-btn');
                if(actionsBtn) { showProjectContextMenu(projectHeader.closest('.project-container').dataset.projectId, e); }
                else { toggleProjectExpansion(projectHeader.closest('.project-container').dataset.projectId); }
                return;
             }
         });
         sessionListContainer.addEventListener('contextmenu', e => {
            const sessionItem = e.target.closest('.session-item');
            if(sessionItem) { showSessionContextMenu(sessionItem.dataset.sessionId, e); }
         });
        sessionListContainer.addEventListener('dragstart', handleDragStart);
        sessionListContainer.addEventListener('dragover', handleDragOver);
        sessionListContainer.addEventListener('dragleave', handleDragLeave);
        sessionListContainer.addEventListener('drop', handleDrop);
    }

    if (chatMessages) {
        chatMessages.addEventListener('mousemove', e => {
            const messageElement = e.target.closest('.chat-message');
            if (messageElement) {
                if (messageElement !== lastHoveredMessageElement) {
                    createMessageToolbar(messageElement);
                    lastHoveredMessageElement = messageElement;
                }
                updateToolbarPosition(e, messageElement);
            }
        });
        chatMessages.addEventListener('mouseleave', () => {
            removeToolbarWithDelay();
        });
        chatMessages.addEventListener('scroll', handleChatScroll);
    }
    if (chatAttachBtn) chatAttachBtn.addEventListener('click', handleFileAttachClick);
    if (chatFileInput) chatFileInput.addEventListener('change', handleFileSelected);

    if (manageApiSettingsBtn) manageApiSettingsBtn.addEventListener('click', openApiSettingsModal);
    if (promptSaveBtn) promptSaveBtn.addEventListener('click', saveCustomPrompt);
    if (promptCancelBtn) promptCancelBtn.addEventListener('click', closePromptModal);
    if (promptModalOverlay) {
        promptModalOverlay.addEventListener('click', (e) => {
            if (e.target.id === 'prompt-modal-overlay') {
                closePromptModal();
            }
        });
    }
    if (managePromptsBtn) managePromptsBtn.addEventListener('click', openPromptManager);
    if (promptManagerCloseBtn) promptManagerCloseBtn.addEventListener('click', closePromptManager);
    if (promptManagerModalOverlay) {
        promptManagerModalOverlay.addEventListener('click', e => {
            if (e.target.id === 'prompt-manager-modal-overlay') closePromptManager();
        });
    }
    if (templateListContainer) {
        templateListContainer.addEventListener('click', e => {
            const item = e.target.closest('.template-list-item');
            if (item) {
                selectTemplate(item.dataset.id);
            }
        });
    }
    if (addNewTemplateBtn) addNewTemplateBtn.addEventListener('click', handleAddNewTemplateClick);
    if (saveTemplateBtn) saveTemplateBtn.addEventListener('click', handleSaveTemplate);
    if (deleteTemplateBtn) deleteTemplateBtn.addEventListener('click', handleDeleteTemplate);
    if(apiSettingsSaveBtn) apiSettingsSaveBtn.addEventListener('click', () => saveApiSettings(true));
    if(apiSettingsCancelBtn) apiSettingsCancelBtn.addEventListener('click', closeApiSettingsModal);
    if(apiSettingsResetBtn) apiSettingsResetBtn.addEventListener('click', resetApiKeyInFirebase);
    if(verifyApiKeyBtn) verifyApiKeyBtn.addEventListener('click', handleVerifyApiKey);
    if(resetTokenUsageBtn) resetTokenUsageBtn.addEventListener('click', resetTokenUsage);
    if(apiSettingsModalOverlay) {
        apiSettingsModalOverlay.addEventListener('click', (e) => {
            if (e.target.id === 'api-settings-modal-overlay') {
                closeApiSettingsModal();
            }
        });
    }

    // [MODIFIED] Do not re-observe, as it's handled by the initializer
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("Core script (bundle/main.js) loaded. Waiting for render trigger.");
});