/*
--- Ailey & Bailey Canvas ---
File: chat-module.js
Version: 11.3 (Critical Bugfix Release 2)
Architect: [Username] & System Architect CodeMaster
Description: This is a critical bugfix release that addresses two major issues.
- Fixed the non-functional API settings button by correctly adding the event listener after the button's dynamic creation.
- Corrected the fatal error in the default API call logic by removing the reference to a non-existent `__google_api_key` variable and restoring the direct API call method, ensuring the chatbot can respond.
*/

import { state } from './state.js';
import { showModal, togglePanel } from './ui-helpers.js';

// --- Element Declarations ---
let popoverAskAi, popoverAddNote, selectionPopover, chatPanel, chatToggleBtn, chatForm, chatInput, chatMessages, chatSendBtn,
    newChatBtn, newProjectBtn, sessionListContainer, chatSessionTitle, deleteSessionBtn, chatWelcomeMessage,
    searchSessionsInput, aiModelSelector, promptModalOverlay, customPromptInput, promptSaveBtn, promptCancelBtn,
    chatModeSelector, apiSettingsBtn, apiSettingsModalOverlay, apiKeyInput, verifyApiKeyBtn, apiKeyStatus,
    apiModelSelect, maxOutputTokensInput, tokenUsageDisplay, resetTokenUsageBtn, apiSettingsSaveBtn, apiSettingsCancelBtn,
    systemResetBtn, exportNotesBtn, restoreDataBtn, fileImporter, quizModalOverlay, startQuizBtn, quizContainer, quizSubmitBtn, quizResults;

function queryElements() {
    selectionPopover = document.getElementById('selection-popover');
    popoverAskAi = document.getElementById('popover-ask-ai');
    popoverAddNote = document.getElementById('popover-add-note');
    chatPanel = document.getElementById('chat-panel');
    chatToggleBtn = document.getElementById('chat-toggle-btn');
    chatForm = document.getElementById('chat-form');
    chatInput = document.getElementById('chat-input');
    chatMessages = document.getElementById('chat-messages');
    chatSendBtn = document.getElementById('chat-send-btn');
    newChatBtn = document.getElementById('new-chat-btn');
    newProjectBtn = document.getElementById('new-project-btn');
    sessionListContainer = document.getElementById('session-list-container');
    chatSessionTitle = document.getElementById('chat-session-title');
    deleteSessionBtn = document.getElementById('delete-session-btn');
    chatWelcomeMessage = document.getElementById('chat-welcome-message');
    searchSessionsInput = document.getElementById('search-sessions-input');
    aiModelSelector = document.getElementById('ai-model-selector');
    promptModalOverlay = document.getElementById('prompt-modal-overlay');
    customPromptInput = document.getElementById('custom-prompt-input');
    promptSaveBtn = document.getElementById('prompt-save-btn');
    promptCancelBtn = document.getElementById('prompt-cancel-btn');
    chatModeSelector = document.getElementById('chat-mode-selector');
    apiSettingsModalOverlay = document.getElementById('api-settings-modal-overlay');
    apiKeyInput = document.getElementById('api-key-input');
    verifyApiKeyBtn = document.getElementById('verify-api-key-btn');
    apiKeyStatus = document.getElementById('api-key-status');
    apiModelSelect = document.getElementById('api-model-select');
    maxOutputTokensInput = document.getElementById('max-output-tokens-input');
    tokenUsageDisplay = document.getElementById('token-usage-display');
    resetTokenUsageBtn = document.getElementById('reset-token-usage-btn');
    apiSettingsSaveBtn = document.getElementById('api-settings-save-btn');
    apiSettingsCancelBtn = document.getElementById('api-settings-cancel-btn');
    systemResetBtn = document.getElementById('system-reset-btn');
    exportNotesBtn = document.getElementById('export-notes-btn');
    restoreDataBtn = document.getElementById('restore-data-btn');
    fileImporter = document.getElementById('file-importer');
    quizModalOverlay = document.getElementById('quiz-modal-overlay');
    startQuizBtn = document.getElementById('start-quiz-btn');
    quizContainer = document.getElementById('quiz-container');
    quizSubmitBtn = document.getElementById('quiz-submit-btn');
    quizResults = document.getElementById('quiz-results');
}


export function initializeChatModule() {
    queryElements();
    
    if (!chatPanel) return false;

    const chatHeader = document.querySelector('#chat-main-view .panel-header > div');
    if (chatHeader && !document.getElementById('api-settings-btn')) {
        apiSettingsBtn = document.createElement('span'); 
        apiSettingsBtn.id = 'api-settings-btn'; 
        apiSettingsBtn.title = '개인 API 설정';
        apiSettingsBtn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>`;
        chatHeader.appendChild(apiSettingsBtn);
        apiSettingsBtn = document.getElementById('api-settings-btn');
    }

    const canvasId = document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id';
    const userPath = `artifacts/${state.appId}/users/${state.auth.currentUser.uid}`;
    const chatHistoryPath = `${userPath}/chatHistories/${canvasId}`;
    state.chatSessionsCollectionRef = state.db.collection(`${chatHistoryPath}/sessions`);
    state.projectsCollectionRef = state.db.collection(`${chatHistoryPath}/projects`);

    loadApiSettings();
    updateChatHeaderModelSelector();
    setupEventListeners();
    
    listenToProjects();
    listenToChatSessions();
    setupChatModeSelector();

    return true;
}

function setupEventListeners() {
    if (chatToggleBtn) chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));
    if (chatPanel) chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));
    if (chatForm) chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });
    if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } });
    if (deleteSessionBtn) deleteSessionBtn.addEventListener('click', () => handleDeleteSession(state.currentSessionId));
    if (newChatBtn) newChatBtn.addEventListener('click', handleNewChat);
    if (newProjectBtn) newProjectBtn.addEventListener('click', createNewProject);
    if (promptSaveBtn) promptSaveBtn.addEventListener('click', saveCustomPrompt);
    if (promptCancelBtn) promptCancelBtn.addEventListener('click', closePromptModal);
    if (searchSessionsInput) searchSessionsInput.addEventListener('input', renderSidebarContent);
    if (popoverAskAi) popoverAskAi.addEventListener('click', handlePopoverAskAi);
    
    if (aiModelSelector) {
        aiModelSelector.addEventListener('change', () => {
            const selectedValue = aiModelSelector.value;
            if (state.userApiSettings.provider && state.userApiSettings.apiKey) {
                state.userApiSettings.selectedModel = selectedValue;
                localStorage.setItem('userApiSettings', JSON.stringify(state.userApiSettings));
            }
        });
    }

    // [FIXED] API Settings button event listener is now correctly added after the element is created.
    if (apiSettingsBtn) apiSettingsBtn.addEventListener('click', openApiSettingsModal);
    if (apiSettingsCancelBtn) apiSettingsCancelBtn.addEventListener('click', closeApiSettingsModal);
    if (apiSettingsSaveBtn) apiSettingsSaveBtn.addEventListener('click', () => saveApiSettings(true));
    if (verifyApiKeyBtn) verifyApiKeyBtn.addEventListener('click', handleVerifyApiKey);
    if (resetTokenUsageBtn) resetTokenUsageBtn.addEventListener('click', resetTokenUsage);
    if (apiSettingsModalOverlay) apiSettingsModalOverlay.addEventListener('click', (e) => { if (e.target === apiSettingsModalOverlay) closeApiSettingsModal(); });

    if (systemResetBtn) systemResetBtn.addEventListener('click', handleSystemReset);
    if (exportNotesBtn) exportNotesBtn.addEventListener('click', exportAllData);
    if (restoreDataBtn) restoreDataBtn.addEventListener('click', () => fileImporter?.click());
    if (fileImporter) fileImporter.addEventListener('change', importAllData);

    if (sessionListContainer) {
        sessionListContainer.addEventListener('click', handleSidebarClick);
        sessionListContainer.addEventListener('contextmenu', handleSidebarContextMenu);
        sessionListContainer.addEventListener('dragstart', handleDragStart);
        sessionListContainer.addEventListener('dragend', handleDragEnd);
        sessionListContainer.addEventListener('dragover', handleDragOver);
        sessionListContainer.addEventListener('dragleave', handleDragLeave);
        sessionListContainer.addEventListener('drop', handleDrop);
    }
    
    if (chatMessages) {
        chatMessages.addEventListener('click', handleReasoningBlockClick);
    }

    if(startQuizBtn) startQuizBtn.addEventListener('click', startQuiz);
    if(quizSubmitBtn) quizSubmitBtn.addEventListener('click', handleQuizSubmit);
    if(quizModalOverlay) quizModalOverlay.addEventListener('click', e => { if (e.target === quizModalOverlay) quizModalOverlay.style.display = 'none'; });
}

function handleSidebarClick(e) {
    if (!e.target.closest('.project-context-menu')) {
        removeContextMenu();
    }
    const sessionItem = e.target.closest('.session-item');
    if (sessionItem) {
        const pinButton = e.target.closest('.session-pin-btn');
        if (pinButton) {
            e.stopPropagation();
            toggleChatPin(sessionItem.dataset.sessionId);
        } else {
            selectSession(sessionItem.dataset.sessionId);
        }
        return;
    }
    const projectHeader = e.target.closest('.project-header');
    if (projectHeader) {
        const actionsButton = e.target.closest('.project-actions-btn');
        const projectId = projectHeader.closest('.project-container').dataset.projectId;
        if (actionsButton) {
            e.stopPropagation();
            showProjectContextMenu(projectId, actionsButton);
        } else if (!e.target.closest('input')) {
            toggleProjectExpansion(projectId);
        }
        return;
    }
}

function handleSidebarContextMenu(e) {
    const sessionItem = e.target.closest('.session-item');
    if (sessionItem) {
        e.preventDefault();
        removeContextMenu();
        showSessionContextMenu(sessionItem.dataset.sessionId, e.clientX, e.clientY);
    }
}

let draggedItem = null;
function handleDragStart(e) {
    if (e.target.classList.contains('session-item')) {
        draggedItem = e.target;
        setTimeout(() => e.target.classList.add('is-dragging'), 0);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedItem.dataset.sessionId);
    } else {
        e.preventDefault();
    }
}

function handleDragEnd() {
    if (draggedItem) {
        draggedItem.classList.remove('is-dragging');
        draggedItem = null;
    }
    document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => {
        el.classList.remove('drag-over', 'drag-target-area');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    const targetProjectHeader = e.target.closest('.project-header');
    document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => {
        el.classList.remove('drag-over', 'drag-target-area');
    });
    if (!draggedItem) return;

    const sourceSessionId = draggedItem.dataset.sessionId;
    const sourceSession = state.localChatSessionsCache.find(s => s.id === sourceSessionId);

    if (targetProjectHeader) {
        const targetProjectId = targetProjectHeader.closest('.project-container').dataset.projectId;
        if (sourceSession && sourceSession.projectId !== targetProjectId) {
            e.dataTransfer.dropEffect = 'move';
            targetProjectHeader.classList.add('drag-over');
        } else {
            e.dataTransfer.dropEffect = 'none';
        }
    } else {
        if (sourceSession && sourceSession.projectId) {
            e.dataTransfer.dropEffect = 'move';
            sessionListContainer.classList.add('drag-target-area');
        } else {
            e.dataTransfer.dropEffect = 'none';
        }
    }
}

function handleDragLeave(e) {
    if (e.target.isSameNode(sessionListContainer)) {
        sessionListContainer.classList.remove('drag-target-area');
    }
}

async function handleDrop(e) {
    e.preventDefault();
    document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => {
        el.classList.remove('drag-over', 'drag-target-area');
    });
    if (!draggedItem) return;

    const sessionId = e.dataTransfer.getData('text/plain');
    const targetProjectHeader = e.target.closest('.project-header');
    let targetProjectId = null;
    let shouldUpdate = false;
    const sourceSession = state.localChatSessionsCache.find(s => s.id === sessionId);

    if (!sourceSession) return;

    if (targetProjectHeader) {
        targetProjectId = targetProjectHeader.closest('.project-container').dataset.projectId;
        if (sourceSession.projectId !== targetProjectId) {
            shouldUpdate = true;
        }
    } else {
        if (sourceSession.projectId) {
            targetProjectId = null;
            shouldUpdate = true;
        }
    }

    if (shouldUpdate) {
        await moveSessionToProject(sessionId, targetProjectId);
    }
}

function handleReasoningBlockClick(e) {
    const header = e.target.closest('.reasoning-header');
    if (!header) return;

    const block = header.closest('.reasoning-block');
    if (block.classList.contains('loading')) return;

    const content = block.querySelector('.reasoning-content');
    const blockId = block.id;
    
    clearTimers(blockId);
    block.classList.toggle('expanded');
    content.classList.toggle('expanded');
    
    if (block.classList.contains('expanded')) {
        const steps = JSON.parse(block.dataset.steps);
        const fullText = steps.map(s => `**${s.summary}**\n${s.detail}`).filter(Boolean).join('\n\n');
        content.innerHTML = '';
        typewriterEffect(content, fullText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'));
    } else {
        content.innerHTML = '';
        const steps = JSON.parse(block.dataset.steps);
        startSummaryAnimation(block, steps);
    }
}


function listenToProjects() {
    if (!state.projectsCollectionRef) return;
    if (state.unsubscribeFromProjects) state.unsubscribeFromProjects();
    
    state.unsubscribeFromProjects = state.projectsCollectionRef.orderBy("updatedAt", "desc").onSnapshot(snapshot => {
        const oldCache = [...state.localProjectsCache];
        state.localProjectsCache = snapshot.docs.map(doc => ({
            id: doc.id,
            isExpanded: oldCache.find(p => p.id === doc.id)?.isExpanded ?? true,
            ...doc.data()
        }));
        
        renderSidebarContent();

        if (state.newlyCreatedProjectId) {
            const newProjectElement = document.querySelector(`.project-container[data-project-id="${state.newlyCreatedProjectId}"]`);
            if (newProjectElement) {
                startProjectRename(state.newlyCreatedProjectId);
                state.newlyCreatedProjectId = null;
            }
        }
    }, error => {
        console.error("Project listener error:", error);
    });
}

function listenToChatSessions() {
    if (!state.chatSessionsCollectionRef) return;
    if (state.unsubscribeFromChatSessions) state.unsubscribeFromChatSessions();

    state.unsubscribeFromChatSessions = state.chatSessionsCollectionRef.onSnapshot(snapshot => {
        state.localChatSessionsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSidebarContent();
        if (state.currentSessionId) {
            const currentSessionData = state.localChatSessionsCache.find(s => s.id === state.currentSessionId);
            if (!currentSessionData) {
                handleNewChat();
            } else {
                renderChatMessages(currentSessionData);
            }
        }
    }, error => {
        console.error("Chat session listener error:", error);
    });
}


function renderSidebarContent() {
    if (!sessionListContainer || !searchSessionsInput) return;
    const searchTerm = searchSessionsInput.value.toLowerCase();
    sessionListContainer.innerHTML = ''; 

    const fragment = document.createDocumentFragment();

    const filteredProjects = state.localProjectsCache.filter(p => p.name?.toLowerCase().includes(searchTerm));
    const filteredSessions = state.localChatSessionsCache.filter(s => (s.title || '새 대화').toLowerCase().includes(searchTerm));

    if (state.localProjectsCache.length > 0) {
        const projectGroupHeader = document.createElement('div');
        projectGroupHeader.className = 'session-group-header';
        projectGroupHeader.textContent = '📁 프로젝트';
        fragment.appendChild(projectGroupHeader);

        const sortedProjects = [...(searchTerm ? filteredProjects : state.localProjectsCache)];
        sortedProjects.forEach(project => {
            const sessionsInProject = state.localChatSessionsCache
                .filter(s => s.projectId === project.id)
                .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
            
            if (searchTerm && !project.name.toLowerCase().includes(searchTerm) && sessionsInProject.filter(s => (s.title || '').toLowerCase().includes(searchTerm)).length === 0) {
                return;
            }
            fragment.appendChild(createProjectItem(project, sessionsInProject, searchTerm));
        });
    }

    const unassignedSessions = filteredSessions.filter(s => !s.projectId);
    if (unassignedSessions.length > 0 || (searchTerm.length === 0 && state.localChatSessionsCache.filter(s => !s.projectId).length > 0)) {
        const generalGroupHeader = document.createElement('div');
        generalGroupHeader.className = 'session-group-header';
        generalGroupHeader.textContent = '💬 일반 대화';
        fragment.appendChild(generalGroupHeader);

        unassignedSessions.forEach(session => {
            const timestamp = session.updatedAt || session.createdAt;
            session.dateGroup = getRelativeDateGroup(timestamp, session.isPinned);
        });

        const groupedSessions = unassignedSessions.reduce((acc, session) => {
            const label = session.dateGroup.label;
            if (!acc[label]) {
                acc[label] = { key: session.dateGroup.key, items: [] };
            }
            acc[label].items.push(session);
            return acc;
        }, {});

        const sortedGroupLabels = Object.keys(groupedSessions).sort((a, b) => groupedSessions[a].key - groupedSessions[b].key);

        sortedGroupLabels.forEach(label => {
            const header = document.createElement('div');
            header.className = 'date-group-header';
            header.textContent = label;
            fragment.appendChild(header);

            const group = groupedSessions[label];
            group.items.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
            group.items.forEach(session => fragment.appendChild(createSessionItem(session)));
        });
    }

    sessionListContainer.appendChild(fragment);
}

function createProjectItem(project, sessionsInProject, searchTerm) {
    const projectContainer = document.createElement('div');
    projectContainer.className = 'project-container';
    projectContainer.dataset.projectId = project.id;

    const projectHeader = document.createElement('div');
    projectHeader.className = 'project-header';
    const createdAt = project.createdAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) || '정보 없음';
    const updatedAt = project.updatedAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) || createdAt;
    projectHeader.title = `생성: ${createdAt}\n최종 수정: ${updatedAt}`;

    projectHeader.innerHTML = `
        <span class="project-toggle-icon ${project.isExpanded ? 'expanded' : ''}">
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" /></svg>
        </span>
        <span class="project-icon">
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2Z" /></svg>
        </span>
        <span class="project-title">${project.name}</span>
        <button class="project-actions-btn" title="프로젝트 메뉴">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" /></svg>
        </button>
    `;

    const sessionsContainer = document.createElement('div');
    sessionsContainer.className = `sessions-in-project ${project.isExpanded ? 'expanded' : ''}`;
    sessionsInProject.forEach(session => {
        if (!searchTerm || (session.title || '새 대화').toLowerCase().includes(searchTerm)) {
             sessionsContainer.appendChild(createSessionItem(session));
        }
    });

    projectContainer.appendChild(projectHeader);
    projectContainer.appendChild(sessionsContainer);
    return projectContainer;
}

function createSessionItem(session) {
    const item = document.createElement('div');
    item.className = 'session-item';
    item.dataset.sessionId = session.id;
    item.draggable = true;
    if (session.id === state.currentSessionId) item.classList.add('active');
    
    const createdAt = session.createdAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) || '정보 없음';
    const updatedAt = session.updatedAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) || createdAt;
    item.title = `생성: ${createdAt}\n최종 수정: ${updatedAt}`;
    
    item.innerHTML = `
        <div class="session-item-title">${session.title || '새 대화'}</div>
        <button class="session-pin-btn ${session.isPinned ? 'pinned-active' : ''}" title="${session.isPinned ? '고정 해제' : '고정하기'}">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>
        </button>
    `;
    
    return item;
}

function getRelativeDateGroup(timestamp, isPinned = false) {
    if (isPinned) return { key: 0, label: '📌 고정됨' };
    if (!timestamp) return { key: 99, label: '날짜 정보 없음' };

    const now = new Date();
    const date = timestamp.toDate();
    now.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays < 1) return { key: 1, label: '오늘' };
    if (diffDays < 2) return { key: 2, label: '어제' };
    if (diffDays < 7) return { key: 3, label: '지난 7일' };
    if (now.getFullYear() === date.getFullYear() && now.getMonth() === date.getMonth()) return { key: 4, label: '이번 달' };
    
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    if (date.getFullYear() === lastMonth.getFullYear() && date.getMonth() === lastMonth.getMonth()) return { key: 5, label: '지난 달' };
    
    return { key: 6 + (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth()), label: `${date.getFullYear()}년 ${date.getMonth() + 1}월` };
}

function renderChatMessages(sessionData) {
    if (!chatMessages || !sessionData) return;
    
    const messages = sessionData.messages || [];
    chatMessages.innerHTML = '';

    messages.forEach((msg, index) => {
        if (msg.role === 'user') {
            const d = document.createElement('div');
            d.className = 'chat-message user';
            d.textContent = msg.content;
            chatMessages.appendChild(d);
        } else if (msg.role === 'ai') {
            if (msg.status === 'loading') {
                const loadingBlock = document.createElement('div');
                loadingBlock.className = 'reasoning-block loading';
                loadingBlock.id = msg.id;
                loadingBlock.innerHTML = `
                    <div class="reasoning-header">
                        <span class="toggle-icon">▶</span>
                        <span class="reasoning-summary blinking-cursor">AI가 생각하는 중...</span>
                    </div>
                `;
                chatMessages.appendChild(loadingBlock);
                return;
            }

            const aiContainer = document.createElement('div');
            aiContainer.className = 'ai-response-container';

            const content = msg.content;
            const reasoningRegex = /\[REASONING_START\]([\s\S]*?)\[REASONING_END\]/;
            const match = content.match(reasoningRegex);

            if (match) {
                const reasoningBlockId = `reasoning-${state.currentSessionId}-${index}`;
                const reasoningRaw = match[1];
                const finalAnswer = content.replace(reasoningRegex, '').trim();

                const reasoningSteps = reasoningRaw.split('SUMMARY:')
                    .filter(s => s.trim() !== '')
                    .map(step => {
                        const parts = step.split('|||DETAIL:');
                        return { summary: parts[0]?.trim(), detail: parts[1]?.trim() };
                    });
                
                const rBlock = document.createElement('div');
                rBlock.className = 'reasoning-block';
                rBlock.id = reasoningBlockId;
                rBlock.dataset.steps = JSON.stringify(reasoningSteps);
                rBlock.innerHTML = `
                    <div class="reasoning-header">
                        <span class="toggle-icon">▶</span>
                        <span class="reasoning-summary">AI의 추론 과정...</span>
                    </div>
                    <div class="reasoning-content"></div>
                `;
                aiContainer.appendChild(rBlock);
                
                startSummaryAnimation(rBlock, reasoningSteps);

                if (finalAnswer) {
                    const finalAnswerDiv = document.createElement('div');
                    finalAnswerDiv.className = 'chat-message ai';
                    finalAnswerDiv.innerHTML = finalAnswer.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                    aiContainer.appendChild(finalAnswerDiv);
                }
            } else {
                const d = document.createElement('div');
                d.className = 'chat-message ai';
                d.innerHTML = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                aiContainer.appendChild(d);
            }

            if (msg.duration) {
                const metaDiv = document.createElement('div');
                metaDiv.className = 'ai-response-meta';
                metaDiv.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" /></svg><span>응답 생성: ${msg.duration}초</span>`;
                aiContainer.appendChild(metaDiv);
            }
            chatMessages.appendChild(aiContainer);
        }
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


// --- Animation & UI Effects ---
function clearTimers(blockId) {
    if (state.activeTimers[blockId]) {
        state.activeTimers[blockId].forEach(clearInterval);
        delete state.activeTimers[blockId];
    }
}

function startSummaryAnimation(blockElement, reasoningSteps) {
    const blockId = blockElement.id;
    clearTimers(blockId);
    state.activeTimers[blockId] = [];

    const summaryElement = blockElement.querySelector('.reasoning-summary');
    if (!summaryElement || !reasoningSteps || reasoningSteps.length === 0) return;

    let stepIndex = 0;
    const cycleSummary = () => {
        if (!reasoningSteps[stepIndex] || !reasoningSteps[stepIndex].summary) return;
        typewriterEffect(summaryElement, reasoningSteps[stepIndex].summary, () => {
            const waitTimer = setTimeout(() => {
                summaryElement.style.opacity = '0';
                const fadeTimer = setTimeout(() => {
                    stepIndex = (stepIndex + 1) % reasoningSteps.length;
                    summaryElement.style.opacity = '1';
                }, 500);
                if (!state.activeTimers[blockId]) state.activeTimers[blockId] = [];
                 state.activeTimers[blockId].push(fadeTimer);
            }, 2000);
            if (!state.activeTimers[blockId]) state.activeTimers[blockId] = [];
             state.activeTimers[blockId].push(waitTimer);
        });
    };
    
    cycleSummary();
    const summaryInterval = setInterval(cycleSummary, 4500);
    if (!state.activeTimers[blockId]) state.activeTimers[blockId] = [];
    state.activeTimers[blockId].push(summaryInterval);
}

function typewriterEffect(element, text, onComplete) {
    if (!element || !text) { if (onComplete) onComplete(); return; }
    element.innerHTML = '';
    element.classList.add('blinking-cursor');
    let i = 0;
    const blockId = element.closest('.reasoning-block')?.id;
    
    const typingInterval = setInterval(() => {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
        } else {
            clearInterval(typingInterval);
            element.classList.remove('blinking-cursor');
            if (onComplete) onComplete();
        }
    }, 30);

    if (blockId && state.activeTimers[blockId]) {
        state.activeTimers[blockId].push(typingInterval);
    }
}


// --- Core Logic ---
async function handleChatSend() {
    if (!chatInput || chatInput.disabled) return;
    const query = chatInput.value.trim();
    if (!query) return;

    chatInput.value = '';
    chatInput.style.height = 'auto';
    chatInput.disabled = true;
    chatSendBtn.disabled = true;

    const userMessage = { role: 'user', content: query, timestamp: firebase.firestore.FieldValue.serverTimestamp() };
    const loadingMessage = { role: 'ai', status: 'loading', id: `loading-${Date.now()}` };
    let sessionRef;
    let isNewSession = false;

    if (!state.currentSessionId) {
        isNewSession = true;
        const activeProject = document.querySelector('.project-header.active-drop-target');
        const newSessionProjectId = activeProject ? activeProject.closest('.project-container').dataset.projectId : null;
        if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
        if (chatMessages) chatMessages.style.display = 'flex';
        renderChatMessages({ messages: [userMessage, loadingMessage] });
        
        const newSessionData = {
            title: query.substring(0, 40) + (query.length > 40 ? '...' : ''),
            messages: [userMessage],
            mode: state.selectedMode,
            projectId: newSessionProjectId,
            isPinned: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        sessionRef = await state.chatSessionsCollectionRef.add(newSessionData);
        state.currentSessionId = sessionRef.id;
    } else {
        sessionRef = state.chatSessionsCollectionRef.doc(state.currentSessionId);
        const currentSessionData = state.localChatSessionsCache.find(s => s.id === state.currentSessionId);
        const temporaryMessages = (currentSessionData.messages || []).map(m=>({...m, timestamp: m.timestamp?.toDate()}));
        temporaryMessages.push({role: 'user', content: query, timestamp: new Date()});
        temporaryMessages.push(loadingMessage);

        renderChatMessages({ messages: temporaryMessages });
        
        await sessionRef.update({
            messages: firebase.firestore.FieldValue.arrayUnion(userMessage),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
    
    const startTime = performance.now();
    try {
        const currentSessionData = state.localChatSessionsCache.find(s => s.id === state.currentSessionId);
        const historyForApi = (currentSessionData?.messages || [userMessage])
                                .map(m => ({ role: m.role, content: m.content }));

        let aiRes, usageData;
        
        if (state.userApiSettings.provider && state.userApiSettings.apiKey && state.userApiSettings.selectedModel) {
            const requestDetails = buildApiRequest(state.userApiSettings.provider, state.userApiSettings.selectedModel, historyForApi, state.userApiSettings.maxOutputTokens);
            const res = await fetch(requestDetails.url, requestDetails.options);
            if (!res.ok) { const errorBody = await res.text(); throw new Error(`API Error ${res.status}: ${errorBody}`); }
            const result = await res.json();
            const parsed = parseApiResponse(state.userApiSettings.provider, result);
            aiRes = parsed.content;
            usageData = parsed.usage;
            if (usageData) { 
                state.userApiSettings.tokenUsage.prompt += usageData.prompt;
                state.userApiSettings.tokenUsage.completion += usageData.completion;
                saveApiSettings(false); 
            }
        } else {
            // [FIXED] API call logic corrected to use a direct key string and single default model
            const prompt = `Based on the following query, provide a step-by-step reasoning process if it is complex. The reasoning must be encapsulated within [REASONING_START] and [REASONING_END] tags. Each step must follow the format: SUMMARY:{one-line summary}|||DETAIL:{detailed explanation}. For simple queries, omit the reasoning part. The final answer should be in a friendly, informal Korean tone. Query: "${query}"`;
            const apiMessages = [{ role: 'user', parts: [{ text: prompt }] }];
            const selectedDefaultModel = 'gemini-2.0-flash';
            
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedDefaultModel}:generateContent?key=`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: apiMessages })
            });
            if (!res.ok) throw new Error(`Google API Error ${res.status}`);
            const result = await res.json();
            aiRes = result.candidates?.[0]?.content?.parts?.[0]?.text || "답변을 가져올 수 없습니다.";
        }
        
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        const aiMessage = { role: 'ai', content: aiRes, timestamp: firebase.firestore.FieldValue.serverTimestamp(), duration: duration };
        
        await sessionRef.update({
            messages: firebase.firestore.FieldValue.arrayUnion(aiMessage),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

    } catch (e) {
        console.error("Chat send error:", e);
        const errorMessage = { role: 'ai', content: `API 오류가 발생했습니다: ${e.message}`, timestamp: firebase.firestore.FieldValue.serverTimestamp() };
        await sessionRef.update({ messages: firebase.firestore.FieldValue.arrayUnion(errorMessage) });
    } finally {
        chatInput.disabled = false;
        chatSendBtn.disabled = false;
        chatInput.focus();
        if (isNewSession) {
            renderSidebarContent();
        }
    }
}


// --- API & Helper Functions ---
function buildApiRequest(provider, model, messages, maxTokens) {
    const history = messages.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.content
    }));

    if (provider === 'openai') {
        return { url: 'https://api.openai.com/v1/chat/completions', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.userApiSettings.apiKey}` }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) } };
    } else if (provider === 'anthropic') {
         return { url: 'https://api.anthropic.com/v1/messages', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': state.userApiSettings.apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) } };
    } else if (provider === 'google_paid') {
        const googleHistory = messages.map(msg => ({ role: msg.role === 'ai' ? 'model' : 'user', parts: [{ text: msg.content }] }));
        return { url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${state.userApiSettings.apiKey}`, options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: googleHistory, generationConfig: { maxOutputTokens: Number(maxTokens) || 2048 } }) } };
    }
    throw new Error(`Unsupported provider: ${provider}`);
}

function parseApiResponse(provider, result) {
    try {
        if (provider === 'openai') { return { content: result.choices[0].message.content, usage: { prompt: result.usage.prompt_tokens, completion: result.usage.completion_tokens } }; }
        else if (provider === 'anthropic') { return { content: result.content[0].text, usage: { prompt: result.usage.input_tokens, completion: result.usage.output_tokens } }; }
        else if (provider === 'google_paid') { return { content: result.candidates[0].content.parts[0].text, usage: null }; }
    } catch (error) {
        console.error(`Error parsing ${provider} response:`, error, result);
        return { content: 'API 응답을 파싱하는 중 오류가 발생했습니다.', usage: null };
    }
    return { content: '알 수 없는 제공사입니다.', usage: null };
}

// --- Session & Project Management ---
function selectSession(sessionId) {
    removeContextMenu();
    if (!sessionId) return;
    const sessionData = state.localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionData) return;
    state.currentSessionId = sessionId;
    Object.values(state.activeTimers).forEach(timers => timers.forEach(clearInterval));
    renderSidebarContent();
    if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
    if (chatMessages) chatMessages.style.display = 'flex';
    renderChatMessages(sessionData);
    if (chatSessionTitle) chatSessionTitle.textContent = sessionData.title || '새 대화';
    if (deleteSessionBtn) deleteSessionBtn.style.display = 'inline-block';
    if (chatInput) chatInput.disabled = false;
    if (chatSendBtn) chatSendBtn.disabled = false;
    chatInput.focus();
}

function handleNewChat() {
    state.currentSessionId = null;
    Object.values(state.activeTimers).forEach(timers => timers.forEach(clearInterval));
    renderSidebarContent();
    if (chatMessages) { chatMessages.innerHTML = ''; chatMessages.style.display = 'none'; }
    if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'flex';
    if (chatSessionTitle) chatSessionTitle.textContent = 'AI 러닝메이트';
    if (deleteSessionBtn) deleteSessionBtn.style.display = 'none';
    if (chatInput) { chatInput.disabled = false; chatInput.value = ''; chatInput.style.height = 'auto'; }
    if (chatSendBtn) chatSendBtn.disabled = false;
}

function getNewProjectDefaultName() {
    const baseName = "새 프로젝트";
    const existingNames = new Set(state.localProjectsCache.map(p => p.name));
    if (!existingNames.has(baseName)) return baseName;
    let i = 2;
    while (existingNames.has(`${baseName} ${i}`)) i++;
    return `${baseName} ${i}`;
}

async function createNewProject() {
    if (!state.projectsCollectionRef) return;
    const newName = getNewProjectDefaultName();
    try {
        const newProjectRef = await state.projectsCollectionRef.add({
            name: newName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        state.newlyCreatedProjectId = newProjectRef.id;
    } catch (error) {
        console.error("Error creating new project:", error);
        alert("프로젝트 생성에 실패했습니다.");
    }
}

async function renameProject(projectId, newName) {
    if (!newName || !newName.trim() || !projectId || !state.projectsCollectionRef) return;
    try {
        await state.projectsCollectionRef.doc(projectId).update({ 
            name: newName.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error renaming project:", error);
        alert("프로젝트 이름 변경에 실패했습니다.");
    }
}

async function deleteProject(projectId) {
    const project = state.localProjectsCache.find(p => p.id === projectId);
    if (!project || !state.projectsCollectionRef || !state.chatSessionsCollectionRef) return;

    const message = `프로젝트 '${project.name}'를 삭제하시겠습니까? 프로젝트 안의 모든 대화는 '일반 대화'로 이동됩니다.`;
    showModal(message, async () => {
        try {
            const batch = state.db.batch();
            
            const sessionsToMove = state.localChatSessionsCache.filter(s => s.projectId === projectId);
            sessionsToMove.forEach(session => {
                const sessionRef = state.chatSessionsCollectionRef.doc(session.id);
                batch.update(sessionRef, { projectId: null });
            });

            const projectRef = state.projectsCollectionRef.doc(projectId);
            batch.delete(projectRef);

            await batch.commit();
        } catch (error) {
            console.error("Error deleting project:", error);
            alert("프로젝트 삭제에 실패했습니다.");
        }
    });
}

function toggleProjectExpansion(projectId) {
    const project = state.localProjectsCache.find(p => p.id === projectId);
    if (project) {
        project.isExpanded = !project.isExpanded;
        renderSidebarContent();
    }
}

function startProjectRename(projectId) {
    const projectContainer = document.querySelector(`.project-container[data-project-id="${projectId}"]`);
    if (!projectContainer) return;
    const titleSpan = projectContainer.querySelector('.project-title');
    if (!titleSpan) return;

    const originalTitle = titleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'project-title-input';
    input.value = originalTitle;

    titleSpan.replaceWith(input);
    input.focus();
    input.select();

    const finishEditing = () => {
        const newName = input.value.trim();
        if (newName && newName !== originalTitle) {
             renameProject(projectId, newName);
        } else {
             renderSidebarContent();
        }
    };

    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
            input.value = originalTitle;
            input.blur();
        }
    });
}

function handleDeleteSession(sessionId) {
    if (!sessionId || !state.chatSessionsCollectionRef) return;
    const sessionToDelete = state.localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionToDelete) return;
    
    showModal(`'${sessionToDelete?.title || '이 대화'}'를 삭제하시겠습니까?`, () => {
        state.chatSessionsCollectionRef.doc(sessionId).delete().then(() => {
            if (state.currentSessionId === sessionId) {
                handleNewChat();
            }
        }).catch(e => console.error("세션 삭제 실패:", e));
    });
}

async function toggleChatPin(sessionId) {
    if (!state.chatSessionsCollectionRef || !sessionId) return;
    const sessionRef = state.chatSessionsCollectionRef.doc(sessionId);
    const currentSession = state.localChatSessionsCache.find(s => s.id === sessionId);
    if (!currentSession) return;
    try {
        await sessionRef.update({ 
            isPinned: !(currentSession.isPinned || false),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
        });
    } catch (error) { console.error("Error toggling pin status:", error); }
}

async function moveSessionToProject(sessionId, newProjectId) {
    const session = state.localChatSessionsCache.find(s => s.id === sessionId);
    if (!session || session.projectId === newProjectId || !state.chatSessionsCollectionRef || !state.projectsCollectionRef) return;
    try {
        const updates = { projectId: newProjectId, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
        await state.chatSessionsCollectionRef.doc(sessionId).update(updates);
        if (newProjectId) {
            await state.projectsCollectionRef.doc(newProjectId).update({ updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        }
    } catch (error) {
        console.error("Error moving session:", error);
        alert("세션 이동에 실패했습니다.");
    }
}

async function renameSession(sessionId, newTitle) {
    if (!newTitle || !sessionId || !state.chatSessionsCollectionRef) return;
    try {
        await state.chatSessionsCollectionRef.doc(sessionId).update({
            title: newTitle,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error renaming session:", error);
        alert("세션 이름 변경에 실패했습니다.");
    }
}

function startSessionRename(sessionId) {
    const sessionItem = document.querySelector(`.session-item[data-session-id="${sessionId}"]`);
    if (!sessionItem) return;
    const titleSpan = sessionItem.querySelector('.session-item-title');
    if (!titleSpan) return;
    const originalTitle = titleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'project-title-input';
    input.value = originalTitle;
    titleSpan.replaceWith(input);
    input.focus();
    input.select();
    const finishEditing = () => {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== originalTitle) {
            renameSession(sessionId, newTitle);
        } else {
            renderSidebarContent();
        }
    };
    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); }
    });
}


// --- Context Menus ---
function removeContextMenu() {
    if (state.currentOpenContextMenu) {
        state.currentOpenContextMenu.remove();
        state.currentOpenContextMenu = null;
    }
}

function showProjectContextMenu(projectId, buttonElement) {
    removeContextMenu();
    const rect = buttonElement.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'project-context-menu'; 
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 2}px`;
    menu.style.left = `${rect.left}px`;
    menu.innerHTML = `
        <button class="context-menu-item" data-action="rename">이름 변경</button>
        <button class="context-menu-item" data-action="delete">삭제</button>
    `;
    
    document.body.appendChild(menu);
    menu.style.display = 'block';
    state.currentOpenContextMenu = menu;

    menu.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (action === 'rename') {
            startProjectRename(projectId);
        } else if (action === 'delete') {
            deleteProject(projectId);
        }
        removeContextMenu();
    });
}

function showSessionContextMenu(sessionId, x, y) {
    const session = state.localChatSessionsCache.find(s => s.id === sessionId);
    if (!session) return;
    removeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'session-context-menu'; 
    
    let moveToSubMenuHTML = state.localProjectsCache.map(p => 
        `<button class="context-menu-item" data-project-id="${p.id}" ${session.projectId === p.id ? 'disabled' : ''}>${p.name}</button>`
    ).join('');
    
    const moveToMenu = `
        <div class="context-submenu-container">
            <button class="context-menu-item" data-action="move-to"><span>프로젝트로 이동</span><span class="submenu-arrow">▶</span></button>
            <div class="context-submenu">
                <button class="context-menu-item" data-project-id="null" ${!session.projectId ? 'disabled' : ''}>[일반 대화로 이동]</button>
                <div class="context-menu-separator"></div>
                ${moveToSubMenuHTML}
            </div>
        </div>
    `;
    
    const createdAt = session.createdAt?.toDate()?.toLocaleString('ko-KR', {dateStyle: 'short', timeStyle: 'short'}) || 'N/A';
    const updatedAt = session.updatedAt?.toDate()?.toLocaleString('ko-KR', {dateStyle: 'short', timeStyle: 'short'}) || 'N/A';
    
    menu.innerHTML = `
        <button class="context-menu-item" data-action="rename">이름 변경</button>
        ${moveToMenu}
        <button class="context-menu-item" data-action="pin">${session.isPinned ? '고정 해제' : '고정하기'}</button>
        <div class="context-menu-separator"></div>
        <button class="context-menu-item" data-action="delete">삭제</button>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item disabled" style="font-size:0.8em; opacity:0.6;">생성: ${createdAt}</div>
        <div class="context-menu-item disabled" style="font-size:0.8em; opacity:0.6;">수정: ${updatedAt}</div>
    `;
    
    document.body.appendChild(menu);
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const bodyWidth = document.body.clientWidth;
    const bodyHeight = document.body.clientHeight;
    menu.style.left = `${x + menuWidth > bodyWidth ? x - menuWidth : x}px`;
    menu.style.top = `${y + menuHeight > bodyHeight ? y - menuHeight : y}px`;
    menu.style.display = 'block';
    state.currentOpenContextMenu = menu;

    menu.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = e.target.closest('.context-menu-item');
        if (!target || target.disabled) return;
        const action = target.dataset.action;
        const projectId = target.dataset.projectId;

        if (action === 'rename') startSessionRename(sessionId);
        else if (action === 'pin') toggleChatPin(sessionId);
        else if (action === 'delete') handleDeleteSession(sessionId);
        else if (projectId !== undefined) moveSessionToProject(sessionId, projectId === 'null' ? null : projectId);
        
        removeContextMenu();
    });
}


// --- API Settings UI ---
function openApiSettingsModal() {
    loadApiSettings();
    if (!apiSettingsModalOverlay) return;
    apiKeyInput.value = state.userApiSettings.apiKey;
    maxOutputTokensInput.value = state.userApiSettings.maxOutputTokens;
    populateModelSelector(state.userApiSettings.availableModels, state.userApiSettings.provider, state.userApiSettings.selectedModel);
    if (state.userApiSettings.apiKey && state.userApiSettings.provider) {
         apiKeyStatus.textContent = `✅ [${state.userApiSettings.provider}] 키가 활성화되어 있습니다.`;
         apiKeyStatus.className = 'status-success';
    } else {
         apiKeyStatus.textContent = '';
         apiKeyStatus.className = '';
    }
    renderTokenUsage();
    apiSettingsModalOverlay.style.display = 'flex';
}

function closeApiSettingsModal() {
    if (!apiSettingsModalOverlay) return;
    apiSettingsModalOverlay.style.display = 'none';
    loadApiSettings(); 
    updateChatHeaderModelSelector();
}

function loadApiSettings() {
    const savedSettings = localStorage.getItem('userApiSettings');
    if (savedSettings) {
        state.userApiSettings = JSON.parse(savedSettings);
        if (!state.userApiSettings.tokenUsage) state.userApiSettings.tokenUsage = { prompt: 0, completion: 0 };
        if (!state.userApiSettings.availableModels) state.userApiSettings.availableModels = [];
    }
}

function saveApiSettings(closeModal = true) {
    const key = apiKeyInput.value.trim();
    if (key) {
        state.userApiSettings.apiKey = key;
        state.userApiSettings.selectedModel = apiModelSelect.value;
        state.userApiSettings.maxOutputTokens = Number(maxOutputTokensInput.value) || 2048;
        if (apiModelSelect && apiModelSelect.options.length > 0 && !apiModelSelect.disabled) {
             state.userApiSettings.availableModels = Array.from(apiModelSelect.options).map(opt => opt.value);
        }
    } else {
        state.userApiSettings = { provider: null, apiKey: '', selectedModel: '', availableModels: [], maxOutputTokens: 2048, tokenUsage: { prompt: 0, completion: 0 } };
    }
    localStorage.setItem('userApiSettings', JSON.stringify(state.userApiSettings));
    updateChatHeaderModelSelector();
    if (closeModal) {
        closeApiSettingsModal();
    }
}

function detectProvider(key) {
    if (key.startsWith('sk-ant-api')) return 'anthropic';
    if (key.startsWith('sk-')) return 'openai';
    if (key.length > 35 && key.startsWith('AIza')) return 'google_paid';
    return null;
}

async function handleVerifyApiKey() {
    const key = apiKeyInput.value.trim();
    if (!key) { apiKeyStatus.textContent = 'API 키를 입력해주세요.'; apiKeyStatus.className = 'status-error'; return; }
    
    const provider = detectProvider(key);
    if (!provider) { apiKeyStatus.textContent = '알 수 없는 형식의 API 키입니다. (OpenAI, Anthropic, Google 지원)'; apiKeyStatus.className = 'status-error'; return; }
    
    state.userApiSettings.provider = provider;
    apiKeyStatus.textContent = `[${provider}] 키 검증 및 모델 목록 로딩 중...`;
    apiKeyStatus.className = 'status-loading';
    verifyApiKeyBtn.disabled = true;
    
    try {
        const models = await fetchAvailableModels(provider, key);
        state.userApiSettings.availableModels = models;
        populateModelSelector(models, provider);
        apiKeyStatus.textContent = `✅ [${provider}] 키 검증 완료! 모델을 선택하고 저장하세요.`;
        apiKeyStatus.className = 'status-success';
        apiModelSelect.disabled = false;
    } catch (error) {
        console.error("API Key Verification Error:", error);
        apiKeyStatus.textContent = `❌ [${provider}] 키 검증 실패: ${error.message}`;
        apiKeyStatus.className = 'status-error';
        apiModelSelect.innerHTML = '<option>키 검증에 실패했습니다</option>';
        apiModelSelect.disabled = true;
    } finally {
        verifyApiKeyBtn.disabled = false;
    }
}

async function fetchAvailableModels(provider, key) {
    if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', { headers: { 'Authorization': `Bearer ${key}` } });
        if (!response.ok) throw new Error('OpenAI 서버에서 모델 목록을 가져올 수 없습니다.');
        const data = await response.json();
        return data.data.filter(m => m.id.includes('gpt')).map(m => m.id).sort().reverse();
    } else if (provider === 'anthropic') {
        return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-2.1'];
    } else if (provider === 'google_paid') {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (!response.ok) throw new Error('Google 서버에서 모델 목록을 가져올 수 없습니다.');
        const data = await response.json();
        return data.models.map(m => m.name.replace('models/', '')).filter(m => m.includes('gemini'));
    }
    return [];
}

function populateModelSelector(models, provider, selectedModel = null) {
    apiModelSelect.innerHTML = '';
    const effectiveModels = models || [];
    
    if (provider && effectiveModels.length === 0) {
        if (provider === 'anthropic') {
            effectiveModels.push('claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307');
        }
    }

    if (effectiveModels.length > 0) {
        effectiveModels.forEach(modelId => {
            const option = document.createElement('option');
            option.value = modelId;
            option.textContent = modelId;
            if (modelId === selectedModel) {
                option.selected = true;
            }
            apiModelSelect.appendChild(option);
        });
        apiModelSelect.disabled = false;
    } else {
        apiModelSelect.innerHTML = '<option>사용 가능한 모델 없음</option>';
        apiModelSelect.disabled = true;
    }
}

function updateChatHeaderModelSelector() {
    if (!aiModelSelector) return;
    aiModelSelector.innerHTML = '';

    if (state.userApiSettings.provider && state.userApiSettings.apiKey) {
        const models_to_show = state.userApiSettings.availableModels || [];
        if (models_to_show.length === 0 && state.userApiSettings.selectedModel) {
            models_to_show.push(state.userApiSettings.selectedModel);
        }
        models_to_show.forEach(modelId => {
            const option = document.createElement('option');
            option.value = modelId;
            option.textContent = `[개인] ${modelId}`;
            aiModelSelector.appendChild(option);
        });
        if(state.userApiSettings.selectedModel) aiModelSelector.value = state.userApiSettings.selectedModel;
        aiModelSelector.title = `${state.userApiSettings.provider} 모델을 선택합니다. (개인 키 사용 중)`;
        aiModelSelector.disabled = false;
    } else {
        // [FIXED] UI updated for single default model
        const option = document.createElement('option');
        option.value = 'gemini-2.0-flash';
        option.textContent = '💡 Gemini 2.0 Flash (기본)';
        aiModelSelector.appendChild(option);
        aiModelSelector.title = '기본 제공 모델 사용 중';
        aiModelSelector.disabled = true;
    }
}

function renderTokenUsage() {
    if (!tokenUsageDisplay) return;
    const { prompt, completion } = state.userApiSettings.tokenUsage;
    const total = prompt + completion;
    tokenUsageDisplay.innerHTML = `<span>입력: ${prompt.toLocaleString()}</span> | <span>출력: ${completion.toLocaleString()}</span> | <strong>총합: ${total.toLocaleString()}</strong>`;
}

function resetTokenUsage() {
    showModal('누적 토큰 사용량을 정말로 초기화하시겠습니까?', () => {
        state.userApiSettings.tokenUsage = { prompt: 0, completion: 0 };
        saveApiSettings(false);
        renderTokenUsage();
    });
}

// --- Other UI actions ---
function handlePopoverAskAi() {
    if (!state.lastSelectedText || !chatInput) return;
    togglePanel(chatPanel, true);
    handleNewChat();
    setTimeout(() => {
        chatInput.value = `"${state.lastSelectedText}"\n\n이 내용에 대해 더 자세히 설명해줄래?`;
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
        chatInput.focus();
    }, 100);
    selectionPopover.style.display = 'none';
}

function setupChatModeSelector() {
    if (!chatModeSelector) return;
    chatModeSelector.innerHTML = '';
    const modes = [
        { id: 'ailey_coaching', t: '기본 코칭', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M20,16H5.17L4,17.17V4H20V16Z" /></svg>' },
        { id: 'deep_learning', t: '심화 학습', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4M12,14A4,4 0 0,1 8,10H10A2,2 0 0,0 12,12A2,2 0 0,0 14,10H16A4,4 0 0,1 12,14M7.5,15.6C8.8,17.2 10.3,18 12,18C13.7,18 15.2,17.2 16.5,15.6C15.2,14.8 13.7,14 12,14C10.3,14 8.8,14.8 7.5,15.6Z" /></svg>' },
        { id: 'custom', t: '커스텀', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>' }
    ];
    modes.forEach(m => {
        const b = document.createElement('button');
        b.dataset.mode = m.id;
        b.innerHTML = `${m.i}<span>${m.t}</span>`;
        if (m.id === state.selectedMode) b.classList.add('active');
        b.addEventListener('click', () => {
            state.selectedMode = m.id;
            chatModeSelector.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            b.classList.add('active');
            if (state.selectedMode === 'custom') openPromptModal();
        });
        chatModeSelector.appendChild(b);
    });
}

function openPromptModal() {
    if (customPromptInput) customPromptInput.value = state.customPrompt;
    if (promptModalOverlay) promptModalOverlay.style.display = 'flex';
}

function closePromptModal() {
    if (promptModalOverlay) promptModalOverlay.style.display = 'none';
}

function saveCustomPrompt() {
    if (customPromptInput) {
        state.customPrompt = customPromptInput.value;
        localStorage.setItem('customTutorPrompt', state.customPrompt);
        closePromptModal();
    }
}

async function startQuiz() {
    if (!quizModalOverlay) return;
    const keywords = Array.from(document.querySelectorAll('.keyword-chip')).map(c => c.textContent.trim()).join(', ');
    if (!keywords) {
        showModal("퀴즈를 생성할 핵심 키워드가 없습니다.", () => {});
        return;
    }
    if (quizContainer) quizContainer.innerHTML = '<div>퀴즈 생성 중...</div>';
    if (quizResults) quizResults.innerHTML = '';
    quizModalOverlay.style.display = 'flex';

    try {
        const simulatedQuestion = {
            q: `"${keywords.split(',')[0]}"와(과) 관련된 설명으로 올바른 것은?`,
            o: ["예시 선택지 1", "예시 선택지 2", "예시 선택지 3", "예시 선택지 4"],
            a: "예시 선택지 1"
        };
        state.currentQuizData = { questions: [simulatedQuestion] };
        
        renderQuiz(state.currentQuizData);
    } catch (e) {
        if(quizContainer) quizContainer.innerHTML = '퀴즈 생성에 실패했습니다.';
    }
}

function renderQuiz(data) {
    if (!quizContainer || !data.questions) return;
    quizContainer.innerHTML = '';
    data.questions.forEach((q, i) => {
        const block = document.createElement('div');
        block.className = 'quiz-question-block';
        const p = document.createElement('p');
        p.textContent = `${i + 1}. ${q.q}`;
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'quiz-options';
        q.o.forEach(opt => {
            const label = document.createElement('label');
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `q-${i}`;
            radio.value = opt;
            label.append(radio, ` ${opt}`);
            optionsDiv.appendChild(label);
        });
        block.append(p, optionsDiv);
        quizContainer.appendChild(block);
    });
}


function handleQuizSubmit() {
    if (!state.currentQuizData || !quizResults || !quizContainer) return;

    let score = 0;
    let allAnswered = true;
    state.currentQuizData.questions.forEach((q, i) => {
        const checked = quizContainer.querySelector(`input[name="q-${i}"]:checked`);
        if (!checked) {
            allAnswered = false;
        } else if (checked.value === q.a) {
            score++;
        }
    });

    if (!allAnswered) {
        quizResults.textContent = "모든 문제에 답해주세요!";
        quizResults.style.color = 'orange';
        return;
    }

    const total = state.currentQuizData.questions.length;
    quizResults.textContent = `결과: ${total}개 중 ${score}개 정답!`;
    quizResults.style.color = score === total ? 'lightgreen' : 'lightcoral';
}

// --- System Data Management ---
async function handleSystemReset() {
    const message = "정말로 이 캔버스의 모든 프로젝트, 채팅, 메모 기록을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.";
    showModal(message, async () => {
        if (!state.db || !state.auth.currentUser) {
            alert("초기화 실패: DB 연결을 확인해주세요.");
            return;
        }
        
        try {
            const batch = state.db.batch();
            
            const notesSnapshot = await state.notesCollection.get();
            notesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            
            const chatsSnapshot = await state.chatSessionsCollectionRef.get();
            chatsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

            const projectsSnapshot = await state.projectsCollectionRef.get();
            projectsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            
            await batch.commit();
            
            localStorage.removeItem('userApiSettings');
            localStorage.removeItem('selectedAiModel');
            localStorage.removeItem('customTutorPrompt');

            alert("✅ 모든 데이터가 성공적으로 삭제되었습니다. 페이지를 새로고침하여 시스템을 다시 시작합니다.");
            location.reload();
        } catch (error) {
            console.error("❌ 시스템 초기화 실패:", error);
            alert(`시스템 초기화 중 오류가 발생했습니다: ${error.message}`);
        }
    });
}

function exportAllData() {
    if (state.localNotesCache.length === 0 && state.localChatSessionsCache.length === 0 && state.localProjectsCache.length === 0) {
        showModal("백업할 데이터가 없습니다.", () => {});
        return;
    }

    const processTimestamp = (item) => {
        const newItem = { ...item };
        if (newItem.createdAt?.toDate) newItem.createdAt = newItem.createdAt.toDate().toISOString();
        if (newItem.updatedAt?.toDate) newItem.updatedAt = newItem.updatedAt.toDate().toISOString();
        if (Array.isArray(newItem.messages)) {
            newItem.messages = newItem.messages.map(msg => {
                const newMsg = { ...msg };
                if (newMsg.timestamp?.toDate) newMsg.timestamp = newMsg.timestamp.toDate().toISOString();
                return newMsg;
            });
        }
        return newItem;
    };

    const dataToExport = {
        backupVersion: '2.0',
        backupDate: new Date().toISOString(),
        notes: state.localNotesCache.map(processTimestamp),
        chatSessions: state.localChatSessionsCache.map(processTimestamp),
        projects: state.localProjectsCache.map(processTimestamp)
    };

    const str = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ailey-canvas-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

async function importAllData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.backupVersion || data.backupVersion !== '2.0') {
                throw new Error("호환되지 않는 백업 파일 버전입니다. (v2.0 필요)");
            }
            const message = `파일에서 ${data.projects?.length||0}개의 프로젝트, ${data.chatSessions?.length||0}개의 채팅, ${data.notes?.length||0}개의 메모를 발견했습니다. 현재 데이터를 덮어쓰고 복원하시겠습니까?`;
            
            showModal(message, async () => {
                try {
                    const batch = state.db.batch();
                    const toFirestoreTimestamp = ts => ts ? firebase.firestore.Timestamp.fromDate(new Date(ts)) : firebase.firestore.FieldValue.serverTimestamp();
                    
                    (data.notes || []).forEach(note => {
                        const { id, ...dataToWrite } = note;
                        dataToWrite.createdAt = toFirestoreTimestamp(note.createdAt);
                        dataToWrite.updatedAt = toFirestoreTimestamp(note.updatedAt);
                        batch.set(state.notesCollection.doc(id), dataToWrite);
                    });

                    (data.chatSessions || []).forEach(session => {
                        const { id, ...dataToWrite } = session;
                        dataToWrite.createdAt = toFirestoreTimestamp(session.createdAt);
                        dataToWrite.updatedAt = toFirestoreTimestamp(session.updatedAt);
                        if(dataToWrite.messages) {
                            dataToWrite.messages.forEach(m => m.timestamp = toFirestoreTimestamp(m.timestamp));
                        }
                        batch.set(state.chatSessionsCollectionRef.doc(id), dataToWrite);
                    });

                    (data.projects || []).forEach(project => {
                        const { id, ...dataToWrite } = project;
                        dataToWrite.createdAt = toFirestoreTimestamp(project.createdAt);
                        dataToWrite.updatedAt = toFirestoreTimestamp(project.updatedAt);
                        batch.set(state.projectsCollectionRef.doc(id), dataToWrite);
                    });
                    
                    await batch.commit();
                    showModal("데이터 복원이 완료되었습니다. 페이지를 새로고침합니다.", () => location.reload());

                } catch (error) {
                    console.error("데이터 복원 실패:", error);
                    showModal(`데이터 복원 중 오류: ${error.message}`, () => {});
                }
            });
        } catch (error) {
            console.error("File parsing error:", error);
            showModal(`파일 읽기 오류: ${error.message}`, () => {});
        } finally {
            event.target.value = null;
        }
    };
    reader.readAsText(file);
}
