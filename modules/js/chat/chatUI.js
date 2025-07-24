/* Module: Chat UI Manager */
import * as ui from '../_uiElements.js';
import * as state from '../_state.js';
import { getRelativeDateGroup, togglePanel } from '../_utils.js';
import { selectSession, startSessionRename, startProjectRename, toggleProjectExpansion } from './_chatData.js';
import { handleDeleteSession, toggleChatPin, moveSessionToProject } from './_chatData.js';

export function handleNewChat() {
    state.setCurrentSessionId(null);
    Object.values(state.activeTimers).forEach(timers => timers.forEach(clearInterval));
    renderSidebarContent();
    if (ui.chatMessages) {
        ui.chatMessages.innerHTML = '';
        ui.chatMessages.style.display = 'none';
    }
    if (ui.chatWelcomeMessage) ui.chatWelcomeMessage.style.display = 'flex';
    if (ui.chatSessionTitle) ui.chatSessionTitle.textContent = 'AI 러닝메이트';
    if (ui.deleteSessionBtn) ui.deleteSessionBtn.style.display = 'none';
    if (ui.chatInput) {
        ui.chatInput.disabled = false;
        ui.chatInput.value = '';
    }
    if (ui.chatSendBtn) ui.chatSendBtn.disabled = false;
}

export function renderSidebarContent() {
    if (!ui.sessionListContainer) return;
    const searchTerm = ui.searchSessionsInput.value.toLowerCase();
    ui.sessionListContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();

    const filteredProjects = state.localProjectsCache.filter(p => p.name?.toLowerCase().includes(searchTerm));
    const filteredSessions = state.localChatSessionsCache.filter(s => (s.title || '새 대화').toLowerCase().includes(searchTerm));

    if (filteredProjects.length > 0 || state.localProjectsCache.length > 0) {
        const projectGroupHeader = document.createElement('div');
        projectGroupHeader.className = 'session-group-header';
        projectGroupHeader.textContent = '📁 프로젝트';
        fragment.appendChild(projectGroupHeader);

        const sortedProjects = [...(searchTerm ? filteredProjects : state.localProjectsCache)].sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
        sortedProjects.forEach(project => {
            const sessionsInProject = state.localChatSessionsCache.filter(s => s.projectId === project.id).sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
            if (searchTerm && !project.name.toLowerCase().includes(searchTerm) && sessionsInProject.filter(s => (s.title || '').toLowerCase().includes(searchTerm)).length === 0) return;
            fragment.appendChild(createProjectItem(project, sessionsInProject, searchTerm));
        });
    }

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
    ui.sessionListContainer.appendChild(fragment);
    setupSidebarEventListeners();
}

function createProjectItem(project, sessions, searchTerm) {
    const projectContainer = document.createElement('div');
    projectContainer.className = 'project-container';
    projectContainer.dataset.projectId = project.id;
    
    const createdAt = project.createdAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) || '정보 없음';
    const updatedAt = project.updatedAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) || createdAt;
    
    projectContainer.innerHTML = `
        <div class="project-header" title="생성: ${createdAt}\n최종 수정: ${updatedAt}">
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
        </div>
        <div class="sessions-in-project ${project.isExpanded ? 'expanded' : ''}"></div>
    `;

    const sessionsContainer = projectContainer.querySelector('.sessions-in-project');
    sessions.forEach(session => {
        if (!searchTerm || (session.title || '새 대화').toLowerCase().includes(searchTerm)) {
            sessionsContainer.appendChild(createSessionItem(session));
        }
    });

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
    
    item.innerHTML = `
        <div class="session-item-title" title="생성: ${createdAt}\n최종 수정: ${updatedAt}">${session.title || '새 대화'}</div>
        <button class="session-pin-btn ${session.isPinned ? 'pinned-active' : ''}" title="${session.isPinned ? '고정 해제' : '고정하기'}">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>
        </button>
    `;
    return item;
}

export function renderChatMessages(sessionData) {
    if (!ui.chatMessages || !sessionData) return;
    const messages = sessionData.messages || [];
    ui.chatMessages.innerHTML = '';

    messages.forEach((msg, index) => {
        if (msg.role === 'user') {
            const d = document.createElement('div');
            d.className = 'chat-message user';
            d.textContent = msg.content;
            ui.chatMessages.appendChild(d);
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
                ui.chatMessages.appendChild(loadingBlock);
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
                const reasoningSteps = reasoningRaw.split('SUMMARY:').filter(s => s.trim() !== '').map(step => {
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
                metaDiv.innerHTML = `
                    <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" /></svg>
                    <span>응답 생성: ${msg.duration}초</span>
                `;
                aiContainer.appendChild(metaDiv);
            }
            ui.chatMessages.appendChild(aiContainer);
        }
    });
    ui.chatMessages.scrollTop = ui.chatMessages.scrollHeight;
}

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
    const summaryInterval = setInterval(cycleSummary, 4000);
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

export function showSessionContextMenu(sessionId, x, y) {
    const session = state.localChatSessionsCache.find(s => s.id === sessionId);
    if (!session) return;
    state.setCurrentOpenContextMenu(null);
    const menu = document.createElement('div');
    menu.className = 'session-context-menu';
    let moveToSubMenuHTML = state.localProjectsCache.map(p => `<button class="context-menu-item" data-project-id="${p.id}" ${session.projectId === p.id ? 'disabled' : ''}>${p.name}</button>`).join('');
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
    const createdAt = session.createdAt?.toDate()?.toLocaleString('ko-KR') || 'N/A';
    const updatedAt = session.updatedAt?.toDate()?.toLocaleString('ko-KR') || 'N/A';
    menu.innerHTML = `
        <button class="context-menu-item" data-action="rename">이름 변경</button>
        ${moveToMenu}
        <button class="context-menu-item" data-action="pin">${session.isPinned ? '고정 해제' : '고정하기'}</button>
        <div class="context-menu-separator"></div>
        <button class="context-menu-item" data-action="delete">삭제</button>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item disabled">생성: ${createdAt}</div>
        <div class="context-menu-item disabled">수정: ${updatedAt}</div>
    `;
    document.body.appendChild(menu);
    const menuWidth = menu.offsetWidth; const menuHeight = menu.offsetHeight;
    const bodyWidth = document.body.clientWidth; const bodyHeight = document.body.clientHeight;
    menu.style.left = `${x + menuWidth > bodyWidth ? x - menuWidth : x}px`;
    menu.style.top = `${y + menuHeight > bodyHeight ? y - menuHeight : y}px`;
    menu.style.display = 'block';
    state.setCurrentOpenContextMenu(menu);
}

export function updateChatHeaderModelSelector() {
    if (!ui.aiModelSelector) return;
    const DEFAULT_MODELS = [
        { value: 'gemini-2.5-flash-preview-04-17', text: '⚡️ Gemini 2.5 Flash (최신)' },
        { value: 'gemini-2.0-flash', text: '💡 Gemini 2.0 Flash (안정)' }
    ];
    ui.aiModelSelector.innerHTML = '';
    if (state.userApiSettings.provider && state.userApiSettings.apiKey) {
        const models_to_show = state.userApiSettings.availableModels || [];
        if(models_to_show.length === 0 && state.userApiSettings.selectedModel) {
            models_to_show.push(state.userApiSettings.selectedModel);
        }
        models_to_show.forEach(modelId => {
            const option = document.createElement('option');
            option.value = modelId;
            option.textContent = `[개인] ${modelId}`;
            ui.aiModelSelector.appendChild(option);
        });
        ui.aiModelSelector.value = state.userApiSettings.selectedModel;
        ui.aiModelSelector.title = `${state.userApiSettings.provider} 모델을 선택합니다. (개인 키 사용 중)`;
    } else {
        DEFAULT_MODELS.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.text;
            ui.aiModelSelector.appendChild(option);
        });
        const savedDefaultModel = localStorage.getItem('selectedAiModel') || state.defaultModel;
        ui.aiModelSelector.value = savedDefaultModel;
        ui.aiModelSelector.title = 'AI 모델을 선택합니다.';
    }
}

function setupSidebarEventListeners() {
    if (!ui.sessionListContainer) return;

    ui.sessionListContainer.addEventListener('click', (e) => {
        if (!e.target.closest('.project-context-menu')) {
            if (state.currentOpenContextMenu) state.currentOpenContextMenu.remove();
            state.setCurrentOpenContextMenu(null);
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
            const { showProjectContextMenu } = require('./chatData.js');
            if (actionsButton) { e.stopPropagation(); showProjectContextMenu(projectId, actionsButton); }
            else if (!e.target.closest('input')) { toggleProjectExpansion(projectId); }
            return;
        }
    });

    let draggedItem = null;
    ui.sessionListContainer.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('session-item')) {
            draggedItem = e.target;
            setTimeout(() => e.target.classList.add('is-dragging'), 0);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedItem.dataset.sessionId);
        } else { e.preventDefault(); }
    });

    ui.sessionListContainer.addEventListener('dragend', () => {
        if(draggedItem) { draggedItem.classList.remove('is-dragging'); draggedItem = null; }
        document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => el.classList.remove('drag-over', 'drag-target-area'));
    });

    ui.sessionListContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        const targetProjectHeader = e.target.closest('.project-header');
        document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => el.classList.remove('drag-over', 'drag-target-area'));
        if (!draggedItem) return;
        const sourceSessionId = draggedItem.dataset.sessionId;
        const sourceSession = state.localChatSessionsCache.find(s => s.id === sourceSessionId);
        if (targetProjectHeader) { 
            const targetProjectId = targetProjectHeader.closest('.project-container').dataset.projectId;
            if (sourceSession && sourceSession.projectId !== targetProjectId) { e.dataTransfer.dropEffect = 'move'; targetProjectHeader.classList.add('drag-over'); }
            else { e.dataTransfer.dropEffect = 'none'; }
        } else { 
             if (sourceSession && sourceSession.projectId) { e.dataTransfer.dropEffect = 'move'; ui.sessionListContainer.classList.add('drag-target-area'); }
             else { e.dataTransfer.dropEffect = 'none'; }
        }
    });
    
    ui.sessionListContainer.addEventListener('dragleave', (e) => { if (e.target === ui.sessionListContainer) { ui.sessionListContainer.classList.remove('drag-target-area'); } });

    ui.sessionListContainer.addEventListener('drop', async (e) => {
        e.preventDefault();
        document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => el.classList.remove('drag-over', 'drag-target-area'));
        if (!draggedItem) return;
        const sessionId = e.dataTransfer.getData('text/plain');
        const targetProjectHeader = e.target.closest('.project-header');
        let targetProjectId = null;
        if (targetProjectHeader) {
            targetProjectId = targetProjectHeader.closest('.project-container').dataset.projectId;
        }
        moveSessionToProject(sessionId, targetProjectId);
    });
}