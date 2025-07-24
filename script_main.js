/*
--- Ailey & Bailey Canvas ---
File: script_main.js
Version: 11.0 (Modular JS Structure)
Architect: [Username] & System Architect Ailey
Description: The main entry point for the application. It waits for the DOM to be fully loaded, then calls the master initialize() function and attaches all necessary event listeners to the UI elements. This script must be loaded last.
*/

document.addEventListener('DOMContentLoaded', function () {

    // --- 4. Global Initialization Function ---
    function initialize() {
        if (!body || !wrapper) { 
            console.error("Core layout elements not found."); 
            return; 
        }
        
        // Initial UI setup
        updateClock(); 
        setInterval(updateClock, 1000);
        
        // Dynamically create and inject API settings elements
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
        
        // Connect to backend and then set up UI that depends on data
        initializeFirebase().then(() => { 
            setupNavigator(); 
            setupChatModeSelector(); 
            initializeTooltips(); 
            makePanelDraggable(chatPanel); 
            makePanelDraggable(notesAppPanel); 
        });

        // Attach all event listeners
        attachEventListeners();

        // Start a new chat session automatically on load
        handleNewChat();
    }

    // --- 5. Event Listener Attachment Function ---
    function attachEventListeners() {
        // Global Listeners
        document.addEventListener('click', (e) => { 
            handleTextSelection(e); 
            if (!e.target.closest('.session-context-menu, .project-context-menu')) { 
                removeContextMenu(); 
            } 
        });
        
        // Tooltip Popover Listeners
        if (popoverAskAi) popoverAskAi.addEventListener('click', handlePopoverAskAi);
        if (popoverAddNote) popoverAddNote.addEventListener('click', handlePopoverAddNote);

        // Fixed Tools & Global UI Listeners
        if (themeToggle) { 
            themeToggle.addEventListener('click', () => { 
                body.classList.toggle('dark-mode'); 
                localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light'); 
            }); 
            if(localStorage.getItem('theme') === 'dark') {
                body.classList.add('dark-mode');
            } else {
                body.classList.remove('dark-mode');
            }
        }
        if (tocToggleBtn) tocToggleBtn.addEventListener('click', () => { 
            wrapper.classList.toggle('toc-hidden'); 
            systemInfoWidget?.classList.toggle('tucked'); 
        });

        // Panel Toggles
        if (chatToggleBtn) chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));
        if (chatPanel) chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));
        if (notesAppToggleBtn) notesAppToggleBtn.addEventListener('click', () => { 
            togglePanel(notesAppPanel); 
            if(notesAppPanel.style.display === 'flex') renderNoteList(); 
        });

        // Chat App Listeners
        if (chatForm) chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });
        if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } });
        if (deleteSessionBtn) deleteSessionBtn.addEventListener('click', () => handleDeleteSession(currentSessionId));
        if (newChatBtn) newChatBtn.addEventListener('click', handleNewChat);
        if (newProjectBtn) newProjectBtn.addEventListener('click', createNewProject);
        if (searchSessionsInput) searchSessionsInput.addEventListener('input', renderSidebarContent);
        if (aiModelSelector) {
            aiModelSelector.addEventListener('change', () => {
                const selectedValue = aiModelSelector.value;
                if (userApiSettings.provider && userApiSettings.apiKey) {
                    userApiSettings.selectedModel = selectedValue;
                    localStorage.setItem('userApiSettings', JSON.stringify(userApiSettings));
                } else {
                    defaultModel = selectedValue;
                    localStorage.setItem('selectedAiModel', defaultModel);
                }
            });
        }
        if (sessionListContainer) {
            sessionListContainer.addEventListener('click', (e) => {
                if (!e.target.closest('.project-context-menu, .session-context-menu')) { removeContextMenu(); }
                const sessionItem = e.target.closest('.session-item');
                if (sessionItem) {
                    const pinButton = e.target.closest('.session-pin-btn');
                    if (pinButton) { e.stopPropagation(); toggleChatPin(sessionItem.dataset.sessionId); }
                    else { selectSession(sessionItem.dataset.sessionId); }
                    return;
                }
                const projectHeader = e.target.closest('.project-header');
                if (projectHeader) {
                    const actionsButton = e.target.closest('.project-actions-btn');
                    const projectId = projectHeader.closest('.project-container').dataset.projectId;
                    if (actionsButton) { e.stopPropagation(); showProjectContextMenu(projectId, actionsButton); }
                    else if (!e.target.closest('input')) { toggleProjectExpansion(projectId); }
                    return;
                }
            });
            sessionListContainer.addEventListener('contextmenu', (e) => {
                const sessionItem = e.target.closest('.session-item');
                if (sessionItem) { e.preventDefault(); removeContextMenu(); showSessionContextMenu(sessionItem.dataset.sessionId, e.clientX, e.clientY); }
            });
            let draggedItem = null;
            sessionListContainer.addEventListener('dragstart', (e) => {
                const target = e.target.closest('.session-item');
                if (target) {
                    draggedItem = target;
                    setTimeout(() => target.classList.add('is-dragging'), 0);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', draggedItem.dataset.sessionId);
                } else { e.preventDefault(); }
            });
            sessionListContainer.addEventListener('dragend', () => {
                if(draggedItem) { draggedItem.classList.remove('is-dragging'); draggedItem = null; }
                document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => { el.classList.remove('drag-over', 'drag-target-area'); });
            });
            sessionListContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                const targetProjectHeader = e.target.closest('.project-header');
                document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => { el.classList.remove('drag-over', 'drag-target-area'); });
                if (!draggedItem) return;
                const sourceSessionId = draggedItem.dataset.sessionId;
                const sourceSession = localChatSessionsCache.find(s => s.id === sourceSessionId);
                if (targetProjectHeader) { 
                    const targetProjectId = targetProjectHeader.closest('.project-container').dataset.projectId;
                    if (sourceSession && sourceSession.projectId !== targetProjectId) { e.dataTransfer.dropEffect = 'move'; targetProjectHeader.classList.add('drag-over'); }
                    else { e.dataTransfer.dropEffect = 'none'; }
                } else if(e.target.closest('#session-list-container')){ 
                     if (sourceSession && sourceSession.projectId) { e.dataTransfer.dropEffect = 'move'; sessionListContainer.classList.add('drag-target-area'); }
                     else { e.dataTransfer.dropEffect = 'none'; }
                }
            });
            sessionListContainer.addEventListener('dragleave', (e) => {
                 const related = e.relatedTarget;
                 if (!related || !e.currentTarget.contains(related)) {
                     e.currentTarget.classList.remove('drag-target-area');
                     document.querySelectorAll('.project-header.drag-over').forEach(el => el.classList.remove('drag-over'));
                 }
            });
            sessionListContainer.addEventListener('drop', async (e) => {
                e.preventDefault();
                 document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => { el.classList.remove('drag-over', 'drag-target-area'); });
                if (!draggedItem) return;
                const sessionId = e.dataTransfer.getData('text/plain');
                const targetProjectHeader = e.target.closest('.project-header');
                let targetProjectId = null; let shouldUpdate = false;
                const sourceSession = localChatSessionsCache.find(s => s.id === sessionId);
                if (!sourceSession) return;
                if (targetProjectHeader) { 
                    targetProjectId = targetProjectHeader.closest('.project-container').dataset.projectId; 
                    if (sourceSession.projectId !== targetProjectId) { shouldUpdate = true; } 
                } else if (e.target.closest('#session-list-container')) { 
                    if (sourceSession.projectId) { 
                        targetProjectId = null; 
                        shouldUpdate = true; 
                    } 
                }
                if (shouldUpdate) {
                    try {
                        const updates = { projectId: targetProjectId, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
                        await chatSessionsCollectionRef.doc(sessionId).update(updates);
                        if (targetProjectId) { await projectsCollectionRef.doc(targetProjectId).update({ updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); }
                    } catch (error) { console.error("Failed to move session:", error); }
                }
            });
        }
        if (chatMessages) {
            chatMessages.addEventListener('click', (e) => {
                const header = e.target.closest('.reasoning-header');
                if (!header) return;
                const block = header.closest('.reasoning-block');
                if (block.classList.contains('loading')) return;
                const content = block.querySelector('.reasoning-content');
                const isExpanded = block.classList.toggle('expanded');
                content.classList.toggle('expanded');
                const blockId = block.id;
                clearTimers(blockId);
                block.dispatchEvent(new Event('toggle'));
                if (isExpanded) {
                    const steps = JSON.parse(block.dataset.steps);
                    const fullText = steps.map(s => `<strong>${s.summary}</strong><br>${s.detail.replace(/
/g, '<br>')}`).join('<br><br>');
                    content.innerHTML = '';
                    typewriterEffect(content, fullText.replace(/<br>/g, '
'));
                } else {
                    const steps = JSON.parse(block.dataset.steps);
                    startSummaryAnimation(block, steps);
                }
            });
        }

        // Notes App Listeners
        if (addNewNoteBtn) addNewNoteBtn.addEventListener('click', () => addNote());
        if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
        if (searchInput) searchInput.addEventListener('input', renderNoteList);
        if (exportNotesBtn) exportNotesBtn.addEventListener('click', exportAllData);
        if (restoreDataBtn) restoreDataBtn.addEventListener('click', handleRestoreClick);
        if (fileImporter) fileImporter.addEventListener('change', importAllData);
        if (systemResetBtn) systemResetBtn.addEventListener('click', handleSystemReset);
        const handleInput = () => { updateStatus('입력 중...', true); if (debounceTimer) clearTimeout(debounceTimer); debounceTimer = setTimeout(saveNote, 1000); };
        if (noteTitleInput) noteTitleInput.addEventListener('input', handleInput);
        if (noteContentTextarea) noteContentTextarea.addEventListener('input', handleInput);
        if (notesList) notesList.addEventListener('click', e => { 
            const i = e.target.closest('.note-item'); 
            if (!i) return; 
            const id = i.dataset.id; 
            if (e.target.closest('.delete-btn')) handleDeleteRequest(id); 
            else if (e.target.closest('.pin-btn')) togglePin(id); 
            else openNoteEditor(id); 
        });
        if (formatToolbar) formatToolbar.addEventListener('click', e => { const b = e.target.closest('.format-btn'); if (b) applyFormat(b.dataset.format); });
        if (linkTopicBtn) linkTopicBtn.addEventListener('click', () => { if(!noteContentTextarea) return; const t = document.title || '현재 학습'; noteContentTextarea.value += `

🔗 연관 학습: [${t}]`; saveNote(); });

        // Modal Listeners
        if (promptSaveBtn) promptSaveBtn.addEventListener('click', saveCustomPrompt);
        if (promptCancelBtn) promptCancelBtn.addEventListener('click', closePromptModal);
        if (startQuizBtn) startQuizBtn.addEventListener('click', startQuiz);
        if (quizSubmitBtn) quizSubmitBtn.addEventListener('click', () => { 
            if (!currentQuizData || !quizResults) return; 
            let score = 0; 
            if (currentQuizData.questions.some((q, i) => !document.querySelector(`input[name="q-${i}"]:checked`))) { 
                quizResults.textContent = "모든 문제에 답해주세요!"; return; 
            } 
            currentQuizData.questions.forEach((q, i) => { 
                if(document.querySelector(`input[name="q-${i}"]:checked`).value === q.a) score++; 
            }); 
            quizResults.textContent = `결과: ${currentQuizData.questions.length} 중 ${score} 정답!`; 
        });
        if(quizModalOverlay) quizModalOverlay.addEventListener('click', e => { if (e.target === quizModalOverlay) quizModalOverlay.style.display = 'none'; });
        
        // API Settings Modal Listeners
        if (apiSettingsBtn) apiSettingsBtn.addEventListener('click', openApiSettingsModal);
        if (apiSettingsCancelBtn) apiSettingsCancelBtn.addEventListener('click', closeApiSettingsModal);
        if (apiSettingsSaveBtn) apiSettingsSaveBtn.addEventListener('click', () => saveApiSettings(true));
        if (verifyApiKeyBtn) verifyApiKeyBtn.addEventListener('click', handleVerifyApiKey);
        if (resetTokenUsageBtn) resetTokenUsageBtn.addEventListener('click', resetTokenUsage);
        if (apiSettingsModalOverlay) apiSettingsModalOverlay.addEventListener('click', (e) => { if (e.target === apiSettingsModalOverlay) closeApiSettingsModal(); });
    }

    // --- 6. Run Initialization ---
    initialize();
});
