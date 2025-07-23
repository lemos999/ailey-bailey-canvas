/*
--- Module: chat.ui.js ---
Description: Manages all UI rendering and interactions for the chat panel.
*/
import { getState, getElements, setCurrentSessionId, setCurrentOpenContextMenu, setChatSessionsCache, setProjectsCache, setNewlyCreatedProjectId, setActiveTimers } from '../../core/state.js';
import { typewriterEffect } from '../../utils/helpers.js';
import { selectSession, toggleChatPin, showSessionContextMenu, startSessionRename, moveSessionToProject } from './chat.sessions.js';
import { getRelativeDateGroup } from '../../utils/helpers.js';

let uiState = {
    draggedItem: null
};

export function initChatUI(elements, onChatSend, onModeSelect, onModelSelect) {
    elements.chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        onChatSend();
    });

    elements.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onChatSend();
        }
    });

    elements.newChatBtn.addEventListener('click', handleNewChatUI);

    // Chat Mode Selector
    const modes = [
        { id: 'ailey_coaching', t: '기본 코칭', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M20,16H5.17L4,17.17V4H20V16Z" /></svg>' },
        { id: 'deep_learning', t: '심화 학습', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4M12,14A4,4 0 0,1 8,10H10A2,2 0 0,0 12,12A2,2 0 0,0 14,10H16A4,4 0 0,1 12,14M7.5,15.6C8.8,17.2 10.3,18 12,18C13.7,18 15.2,17.2 16.5,15.6C15.2,14.8 13.7,14 12,14C10.3,14 8.8,14.8 7.5,15.6Z" /></svg>' },
        { id: 'custom', t: '커스텀', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>' }
    ];
    modes.forEach(m => {
        const b = document.createElement('button');
        b.dataset.mode = m.id;
        b.innerHTML = `${m.i}<span>${m.t}</span>`;
        b.addEventListener('click', () => {
            elements.chatModeSelector.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            b.classList.add('active');
            onModeSelect(m.id, openPromptModal);
        });
        elements.chatModeSelector.appendChild(b);
    });
    elements.chatModeSelector.querySelector('button')?.classList.add('active');

    // AI Model Selector
    elements.aiModelSelector.addEventListener('change', (e) => onModelSelect(e.target.value));

    // Session/Project Sidebar interactions
    elements.sessionListContainer.addEventListener('click', handleSidebarClick);
    elements.sessionListContainer.addEventListener('contextmenu', handleSidebarContextMenu);

    // Drag and Drop for sessions
    elements.sessionListContainer.addEventListener('dragstart', handleDragStart);
    elements.sessionListContainer.addEventListener('dragend', handleDragEnd);
    elements.sessionListContainer.addEventListener('dragover', handleDragOver);
    elements.sessionListContainer.addEventListener('dragleave', handleDragLeave);
    elements.sessionListContainer.addEventListener('drop', handleDrop);

    // Reasoning block interaction
    elements.chatMessages.addEventListener('click', handleReasoningBlockClick);
}

function openPromptModal(currentPrompt, onSave) {
    const { promptModalOverlay } = getElements();
    const customPromptInput = document.getElementById('custom-prompt-input');
    const promptSaveBtn = document.getElementById('prompt-save-btn');
    const promptCancelBtn = document.getElementById('prompt-cancel-btn');

    if (customPromptInput) customPromptInput.value = currentPrompt;
    if (promptModalOverlay) promptModalOverlay.style.display = 'flex';

    promptSaveBtn.onclick = () => {
        if (customPromptInput) {
            onSave(customPromptInput.value);
        }
        if (promptModalOverlay) promptModalOverlay.style.display = 'none';
    };
    promptCancelBtn.onclick = () => {
        if (promptModalOverlay) promptModalOverlay.style.display = 'none';
    };
}

export function handleNewChatUI() {
    const { chatMessages, chatWelcomeMessage, chatSessionTitle, deleteSessionBtn, chatInput, chatSendBtn } = getElements();
    const state = getState();

    setCurrentSessionId(null);
    Object.values(state.activeTimers).forEach(timers => timers.forEach(clearInterval));
    setActiveTimers({});

    updateSidebar();

    if (chatMessages) { chatMessages.innerHTML = ''; chatMessages.style.display = 'none'; }
    if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'flex';
    if (chatSessionTitle) chatSessionTitle.textContent = 'AI 러닝메이트';
    if (deleteSessionBtn) deleteSessionBtn.style.display = 'none';
    if (chatInput) { chatInput.disabled = false; chatInput.value = ''; }
    if (chatSendBtn) chatSendBtn.disabled = false;
}

export function updateSidebar() {
    const { sessionListContainer, searchSessionsInput } = getElements();
    const state = getState();
    if (!sessionListContainer) return;

    const searchTerm = searchSessionsInput.value.toLowerCase();
    sessionListContainer.innerHTML = ''; 

    const filteredProjects = state.projectsCache.filter(p => p.name?.toLowerCase().includes(searchTerm));
    const filteredSessions = state.chatSessionsCache.filter(s => (s.title || '새 대화').toLowerCase().includes(searchTerm));

    const fragment = document.createDocumentFragment();

    // Render Projects
    if (filteredProjects.length > 0 || state.projectsCache.length > 0) {
        const projectGroupHeader = document.createElement('div');
        projectGroupHeader.className = 'session-group-header';
        projectGroupHeader.textContent = '📁 프로젝트';
        fragment.appendChild(projectGroupHeader);

        const sortedProjects = [...(searchTerm ? filteredProjects : state.projectsCache)].sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));

        sortedProjects.forEach(project => {
            const sessionsInProject = state.chatSessionsCache.filter(s => s.projectId === project.id).sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));

            if (searchTerm && !project.name.toLowerCase().includes(searchTerm) && sessionsInProject.filter(s => (s.title || '').toLowerCase().includes(searchTerm)).length === 0) {
                return;
            }

            const projectContainer = createProjectContainer(project, sessionsInProject, searchTerm);
            fragment.appendChild(projectContainer);
        });
    }

    // Render Unassigned Sessions
    const unassignedSessions = filteredSessions.filter(s => !s.projectId);
    if (unassignedSessions.length > 0) {
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
            if (!acc[label]) acc[label] = { key: session.dateGroup.key, items: [] };
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

    // Handle rename focus if a new project was just created
    if (state.newlyCreatedProjectId) {
        const newProjectElement = document.querySelector(`.project-container[data-project-id="${state.newlyCreatedProjectId}"]`);
        if (newProjectElement) {
            startProjectRename(state.newlyCreatedProjectId);
            setNewlyCreatedProjectId(null);
        }
    }
}

function createProjectContainer(project, sessions, searchTerm) {
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
    sessions.forEach(session => {
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
    if (session.id === getState().currentSessionId) item.classList.add('active');

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

export function renderChatMessages(sessionData) {
    const { chatMessages } = getElements();
    const state = getState();
    if (!chatMessages || !sessionData) return;

    const messages = sessionData.messages || [];
    chatMessages.innerHTML = '';

    messages.forEach((msg, index) => {
        if (msg.role === 'user') {
            const d = document.createElement('div');
            d.className = `chat-message user`;
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
                    </div>`;
                chatMessages.appendChild(loadingBlock);
                return;
            }

            const aiContainer = document.createElement('div');
            aiContainer.className = 'ai-response-container';

            const content = msg.content;
            const reasoningRegex = /^\[REASONING_START\]([\s\S]*?)\[REASONING_END\]/;
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
                        <span>AI의 추론 과정...</span>
                        <span class="reasoning-summary"></span>
                    </div>
                    <div class="reasoning-content"></div>`;
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
                metaDiv.innerHTML = `
                    <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" /></svg>
                    <span>응답 생성: ${msg.duration}초</span>`;
                aiContainer.appendChild(metaDiv);
            }

            chatMessages.appendChild(aiContainer);
        }
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- Event Handlers for UI interactions ---

function handleSidebarClick(e) {
    const state = getState();
    if (state.currentOpenContextMenu && !e.target.closest('.project-context-menu, .session-context-menu')) {
        state.currentOpenContextMenu.remove();
        setCurrentOpenContextMenu(null);
    }

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
}

function handleSidebarContextMenu(e) {
    const sessionItem = e.target.closest('.session-item');
    if (sessionItem) {
        e.preventDefault();
        showSessionContextMenu(sessionItem.dataset.sessionId, e.clientX, e.clientY);
    }
}

function handleDragStart(e) {
    if (e.target.classList.contains('session-item')) {
        uiState.draggedItem = e.target;
        setTimeout(() => e.target.classList.add('is-dragging'), 0);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', uiState.draggedItem.dataset.sessionId);
    } else {
        e.preventDefault();
    }
}

function handleDragEnd() {
    if (uiState.draggedItem) {
        uiState.draggedItem.classList.remove('is-dragging');
        uiState.draggedItem = null;
    }
    document.querySelectorAll('.project-header.drag-over, #session-list-container.drag-target-area').forEach(el => {
        el.classList.remove('drag-over', 'drag-target-area');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    const targetProjectHeader = e.target.closest('.project-header');
    document.querySelectorAll('.project-header.drag-over, #session-list-container.drag-target-area').forEach(el => {
        el.classList.remove('drag-over', 'drag-target-area');
    });
    if (!uiState.draggedItem) return;

    const sourceSessionId = uiState.draggedItem.dataset.sessionId;
    const sourceSession = getState().chatSessionsCache.find(s => s.id === sourceSessionId);

    if (targetProjectHeader) { 
        const targetProjectId = targetProjectHeader.closest('.project-container').dataset.projectId;
        if (sourceSession && sourceSession.projectId !== targetProjectId) {
            e.dataTransfer.dropEffect = 'move';
            targetProjectHeader.classList.add('drag-over');
        } else {
            e.dataTransfer.dropEffect = 'none';
        }
    } else if (e.target.closest('#session-list-container')) {
         if (sourceSession && sourceSession.projectId) {
             e.dataTransfer.dropEffect = 'move';
             document.getElementById('session-list-container').classList.add('drag-target-area');
         } else {
             e.dataTransfer.dropEffect = 'none';
         }
    }
}

function handleDragLeave(e) {
    if (e.target.id === 'session-list-container') {
        e.target.classList.remove('drag-target-area');
    }
}

async function handleDrop(e) {
    e.preventDefault();
    document.querySelectorAll('.project-header.drag-over, #session-list-container.drag-target-area').forEach(el => {
        el.classList.remove('drag-over', 'drag-target-area');
    });
    if (!uiState.draggedItem) return;

    const sessionId = e.dataTransfer.getData('text/plain');
    const targetProjectHeader = e.target.closest('.project-header');

    let targetProjectId = null;
    if (targetProjectHeader) {
        targetProjectId = targetProjectHeader.closest('.project-container').dataset.projectId;
    }

    await moveSessionToProject(sessionId, targetProjectId);
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
        const fullText = steps.map(s => s.detail).filter(Boolean).join('\n\n');
        content.innerHTML = '';
        const interval = typewriterEffect(content, fullText);
        addTimer(blockId, interval);
    } else {
        content.innerHTML = '';
        const steps = JSON.parse(block.dataset.steps);
        startSummaryAnimation(block, steps);
    }
}

function clearTimers(blockId) {
    const state = getState();
    if (state.activeTimers[blockId]) {
        state.activeTimers[blockId].forEach(clearInterval);
        delete state.activeTimers[blockId];
    }
}

function addTimer(blockId, timerId) {
    const state = getState();
    if (!state.activeTimers[blockId]) {
        state.activeTimers[blockId] = [];
    }
    state.activeTimers[blockId].push(timerId);
}

function startSummaryAnimation(blockElement, reasoningSteps) {
    const blockId = blockElement.id;
    clearTimers(blockId);

    const summaryElement = blockElement.querySelector('.reasoning-summary');
    if (!summaryElement || !reasoningSteps || reasoningSteps.length === 0) return;

    let stepIndex = 0;
    const cycleSummary = () => {
        if (!reasoningSteps[stepIndex] || !reasoningSteps[stepIndex].summary) return;
        const summaryText = reasoningSteps[stepIndex].summary;

        const typingTimer = typewriterEffect(summaryElement, summaryText, () => {
            const waitTimer = setTimeout(() => {
                summaryElement.style.opacity = '0';
                const fadeTimer = setTimeout(() => {
                    stepIndex = (stepIndex + 1) % reasoningSteps.length;
                    summaryElement.style.opacity = '1';
                }, 500); 
                 addTimer(blockId, fadeTimer);
            }, 2000); 
             addTimer(blockId, waitTimer);
        });
        addTimer(blockId, typingTimer);
    };

    cycleSummary();
    const summaryInterval = setInterval(cycleSummary, 4000 + 2500); // Wait for type + fade
    addTimer(blockId, summaryInterval);
}