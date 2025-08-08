/*
--- Ailey & Bailey Canvas ---
File: 120_core_main_initializer.js
Version: 1.3 (Live AI Pipeline Enabled)
Description: The main entry point for the application. Initializes the app and attaches all primary event listeners.
*/

document.addEventListener('DOMContentLoaded', function () {

    /** 
     * [UPDATED] Fetches REAL content from the AI and injects it.
     * This function now determines the topic and makes a simulated call.
     */
    async function fetchAndInjectContent(topic = '정조') {
        const contentRoot = document.getElementById('content-root');
        if (!contentRoot) {
            console.error("Fatal: Content injection point #content-root not found in shell.html.");
            return;
        }

        console.log(`[PIPELINE] Requesting content for topic: ${topic}`);
        contentRoot.innerHTML = '<div class="loading-indicator">AI가 학습 콘텐츠를 생성하는 중... 🧠</div>';
        
        try {
            // In a real scenario, this would be a fetch call to the AI endpoint.
            // We simulate this by creating a mock AI response.
            const aiResponseFragment = await getAiContentFragment(topic);

            contentRoot.innerHTML = aiResponseFragment;
            console.log(`[PIPELINE] Successfully injected AI content for topic: ${topic}`);
            
            // After injecting new content, we need to re-initialize components that depend on it.
            setupNavigator();
            initializeTooltips();
        } catch (error) {
            console.error(`[PIPELINE-ERROR] Failed to fetch or inject content:`, error);
            contentRoot.innerHTML = '<div class="error-message">콘텐츠 로딩에 실패했습니다. 😥</div>';
        }
    }

    /** 
     * Mocks a call to the AI to get the content fragment. 
     * This simulates the AI generating content based on the updated prompt.
     */
    function getAiContentFragment(topic) {
        console.log('[AI-SIMULATION] Generating content fragment for: ', topic);
        // This is a mock response that the AI would generate based on the Phase 3 prompt.
        const mockResponse = `
            <div class="wrapper">
                <nav class="scroll-nav" id="scroll-nav"></nav>
                <div class="container" id="learning-content">
                    <div class="header">
                        <h1>${topic}</h1>
                        <p class="subtitle">개혁 군주의 빛과 그림자</p>
                    </div>
                    <div id="section-1" class="content-section">
                        <h2>🎯 오늘의 학습 목표</h2>
                        <blockquote>아버지의 비극을 딛고, 할아버지의 뒤를 이어 강력한 왕권을 통해 조선의 르네상스를 이끌었던 개혁 군주, 정조의 삶과 업적을 심층적으로 이해합니다.</blockquote>
                    </div>
                    <div id="section-2" class="content-section">
                        <h2>🔑 핵심 키워드</h2>
                        <div class="keyword-list">
                           <span class="keyword-chip" data-tooltip="정조가 자신의 학문과 정책을 뒷받침하기 위해 설치한 왕립 학술 연구 기관이자 도서관입니다.">규장각</span>
                           <span class="keyword-chip" data-tooltip="정조가 자신의 친위 부대로 창설한 군영으로, 강력한 왕권의 상징이었습니다.">장용영</span>
                           <span class="keyword-chip" data-tooltip="정조가 아버지 사도세자의 묘를 옮기면서 건설한 신도시이자, 그의 개혁 정치의 상징적인 장소입니다.">수원 화성</span>
                        </div>
                    </div>
                    <div id="section-3" class="content-section">
                        <h2>📖 핵심 원리와 개념</h2>
                        <p>정조의 통치는 <strong data-tooltip="신하들의 의견을 널리 듣고 옳은 것을 따른다는 뜻으로, 탕평책의 핵심 정신입니다.">탕평책</strong>을 계승하면서도, 자신만의 강력한 리더십으로 국가를 운영한 것이 특징이야.</p>
                    </div>
                </div>
            </div>
        `;
        return new Promise(resolve => setTimeout(() => resolve(mockResponse), 1500)); // Simulate network delay
    }

    /** 
     * 애플리케이션을 초기화합니다.
     */
    function initialize() {
        if (!body) { console.error("Core layout elements not found."); return; }
        
        // Basic UI setup
        updateClock(); 
        setInterval(updateClock, 1000);
        
        // Dynamically create and inject the API settings modal and its trigger button
        createApiSettingsModal();
        const chatHeader = document.querySelector('#chat-main-view .panel-header > div');
        if (chatHeader) {
            apiSettingsBtn = document.createElement('span'); 
            apiSettingsBtn.id = 'api-settings-btn'; 
            apiSettingsBtn.title = '개인 API 설정';
            apiSettingsBtn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>`;
            const deleteBtn = chatHeader.querySelector('#delete-session-btn');
            if (deleteBtn) {
                deleteBtn.insertAdjacentElement('beforebegin', apiSettingsBtn);
            } else {
                 chatHeader.appendChild(apiSettingsBtn);
            }
        }
        
        // Load settings and initialize Firebase
        loadApiSettings();
        updateChatHeaderModelSelector();
        
        initializeFirebase().then(() => { 
            // Initialize UI components that depend on data
            // setupNavigator and initializeTooltips are now called AFTER content injection
            setupChatModeSelector(); 
            makePanelDraggable(chatPanel); 
            // Note: Notes panel is made draggable dynamically when first opened
            handleNewChat(); // Start with a clean chat slate
            
            // [UPDATED] Call the content injection engine after core systems are ready.
            // The topic can be passed from URL params or other logic in a real app.
            fetchAndInjectContent("정조 대왕"); // Example topic
        });

        attachEventListeners();
    }

    /** 
     * 애플리케이션의 모든 주요 이벤트 리스너를 첨부합니다.
     */
    function attachEventListeners() {
        // --- Global Listeners ---
        document.addEventListener('click', (e) => { 
            handleTextSelection(e); 
            // Close context menus if clicked outside
            if (!e.target.closest('.note-context-menu, .session-context-menu, .project-context-menu')) {
                removeContextMenu();
            }
            // Close notes dropdown if clicked outside
            if (!e.target.closest('.more-options-container')) {
                document.getElementById('notes-dropdown-menu')?.classList.remove('show');
            }
        });
        
        if (popoverAskAi) popoverAskAi.addEventListener('click', handlePopoverAskAi);
        if (popoverAddNote) popoverAddNote.addEventListener('click', handlePopoverAddNote);

        // --- Global UI Listeners ---
        if (themeToggle) { 
            themeToggle.addEventListener('click', () => { 
                body.classList.toggle('dark-mode'); 
                localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
                // Also update editor theme if it's open
                if (toastEditorInstance) {
                    toastEditorInstance.setTheme(body.classList.contains('dark-mode') ? 'dark' : 'default');
                }
            }); 
            if(localStorage.getItem('theme') === 'dark') body.classList.add('dark-mode'); else body.classList.remove('dark-mode');
        }
        // The wrapper class toggle now happens inside fetchAndInjectContent or setupNavigator
        if (tocToggleBtn) tocToggleBtn.addEventListener('click', () => {
             const wrapper = document.querySelector('.wrapper');
             if(wrapper) wrapper.classList.toggle('toc-hidden'); 
             systemInfoWidget?.classList.toggle('tucked'); 
        });

        // --- Panel Toggles ---
        if (chatToggleBtn) chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));
        if (chatPanel) chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));
        if (notesAppToggleBtn) {
            notesAppToggleBtn.addEventListener('click', () => { 
                togglePanel(notesAppPanel);
                if (notesAppPanel.style.display === 'flex') {
                    ensureNotePanelHeader(); // Ensure header exists for dragging
                    renderNoteList();
                }
            });
        }
        
        // --- Notes App Event Delegation ---
        if (noteListView) {
            noteListView.addEventListener('click', e => {
                const target = e.target;
                const dropdownAction = target.closest('.dropdown-item')?.dataset.action;
                if (dropdownAction) {
                    if (dropdownAction === 'export-all') exportAllData();
                    else if (dropdownAction === 'import-all') handleRestoreClick();
                    else if (dropdownAction === 'system-reset') handleSystemReset();
                    document.getElementById('notes-dropdown-menu')?.classList.remove('show');
                    return;
                }
                
                const noteItem = target.closest('.note-item');
                if (noteItem) { openNoteEditor(noteItem.dataset.id); return; }

                const projectHeader = target.closest('.note-project-header');
                if (projectHeader) { toggleNoteProjectExpansion(projectHeader.closest('.note-project-container').dataset.projectId); return; }
                
                if (target.closest('#add-new-note-btn-dynamic')) { handleAddNewNote(); return; }
                if (target.closest('#add-new-note-project-btn-dynamic')) { createNewNoteProject(); return; }
                if (target.closest('#more-options-btn')) { document.getElementById('notes-dropdown-menu')?.classList.toggle('show'); return; }
            });

            noteListView.addEventListener('contextmenu', e => showContextMenu(e.target, e));

            const debouncedRender = debounce(renderNoteList, 300);
            noteListView.addEventListener('input', e => {
                if (e.target.id === 'search-input-dynamic') {
                    debouncedRender();
                }
            });

            // Drag and Drop listeners
            noteListView.addEventListener('dragstart', e => {
                const noteItem = e.target.closest('.note-item');
                if (noteItem) {
                    draggedNoteId = noteItem.dataset.id;
                    e.dataTransfer.effectAllowed = 'move';
                    setTimeout(() => noteItem.classList.add('is-dragging'), 0);
                }
            });

            noteListView.addEventListener('dragover', e => {
                e.preventDefault();
                const projectHeader = e.target.closest('.note-project-header');
                document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
                if (projectHeader) {
                    e.dataTransfer.dropEffect = 'move';
                    projectHeader.classList.add('drag-over');
                } else {
                    e.dataTransfer.dropEffect = 'none';
                }
            });
            
            noteListView.addEventListener('dragleave', e => {
                const projectHeader = e.target.closest('.note-project-header');
                if (projectHeader) projectHeader.classList.remove('drag-over');
            });

            noteListView.addEventListener('drop', e => {
                e.preventDefault();
                const projectHeader = e.target.closest('.note-project-header');
                if (projectHeader && draggedNoteId) {
                    const projectId = projectHeader.closest('.note-project-container').dataset.projectId;
                    moveNoteToProject(draggedNoteId, projectId);
                }
                document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
                draggedNoteId = null;
            });
            
            noteListView.addEventListener('dragend', () => {
                document.querySelectorAll('.is-dragging').forEach(el => el.classList.remove('is-dragging'));
                draggedNoteId = null;
            });
        }
        
        if (fileImporter) fileImporter.addEventListener('change', importAllData);
        
        // --- Note Editor Listeners ---
        if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
        const handleNoteTitleEdit = debounce(() => saveNote(), 1500);
        if (noteTitleInput) noteTitleInput.addEventListener('input', () => { updateStatus('입력 중...', true); handleNoteTitleEdit(); });

        // --- Chat App Event Delegation ---
        if (chatForm) chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });
        if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } });
        if (newChatBtn) newChatBtn.addEventListener('click', handleNewChat);
        if (newProjectBtn) newProjectBtn.addEventListener('click', createNewProject);
        if (searchSessionsInput) searchSessionsInput.addEventListener('input', debounce(renderSidebarContent, 300));

        if (sessionListContainer) {
             sessionListContainer.addEventListener('click', e => {
                 const sessionItem = e.target.closest('.session-item');
                 if(sessionItem) { selectSession(sessionItem.dataset.sessionId); return; }

                 const pinBtn = e.target.closest('.session-pin-btn');
                 if(pinBtn) { toggleChatPin(pinBtn.closest('.session-item').dataset.sessionId); return; }
                 
                 const projectHeader = e.target.closest('.project-header');
                 if(projectHeader) {
                    const actionsBtn = e.target.closest('.project-actions-btn');
                    if(actionsBtn) { showProjectContextMenu(projectHeader.closest('.project-container').dataset.projectId, actionsBtn); }
                    else { toggleProjectExpansion(projectHeader.closest('.project-container').dataset.projectId); }
                    return;
                 }
             });
             sessionListContainer.addEventListener('contextmenu', e => {
                const sessionItem = e.target.closest('.session-item');
                if(sessionItem) { e.preventDefault(); showSessionContextMenu(sessionItem.dataset.sessionId, e.clientX, e.clientY); }
             });
        }

        // --- API & Modal Listeners ---
        // This listener needs to be attached to the body because the button is created dynamically.
        document.body.addEventListener('click', e => {
            if (e.target.closest('#api-settings-btn')) {
                openApiSettingsModal();
            }
        });
    }

    initialize();
});