/*
--- Ailey & Bailey Canvas ---
File: chat-ui.js
Version: 12.0.1 (Error Fix)
Architect: [Username & System Architect CodeMaster]
Description: This module is exclusively responsible for rendering all UI components of the chat system. It takes data from other modules and updates the DOM, handling everything from the sidebar and messages to context menus. **Fix: Added 'aiModelSelect' to variable declarations to resolve a ReferenceError during initialization.**
*/

import { state } from './state.js';
import { startSessionRename, startProjectRename } from './chat-events.js';
import { deleteProject, toggleChatPin, handleDeleteSession, moveSessionToProject } from './chat-data.js';

// --- Element Cache ---
let sessionListContainer, searchSessionsInput, chatMessages, aiModelSelector, tokenUsageDisplay,
    promptModalOverlay, customPromptInput, chatModeSelector, aiModelSelect; // [FIX] 'aiModelSelect' 변수 선언 추가

function queryElements() {
    sessionListContainer = document.getElementById('session-list-container');
    searchSessionsInput = document.getElementById('search-sessions-input');
    chatMessages = document.getElementById('chat-messages');
    aiModelSelect = document.getElementById('api-model-select');
    aiModelSelector = document.getElementById('ai-model-selector');
    tokenUsageDisplay = document.getElementById('token-usage-display');
    promptModalOverlay = document.getElementById('prompt-modal-overlay');
    customPromptInput = document.getElementById('custom-prompt-input');
    chatModeSelector = document.getElementById('chat-mode-selector');
}

export function initializeUI() {
    queryElements();
    setupChatModeSelector();
}


// --- Sidebar Rendering ---

export function renderSidebarContent() {
    if (!sessionListContainer || !searchSessionsInput) return;
    const searchTerm = searchSessionsInput.value.toLowerCase();
    sessionListContainer.innerHTML = ''; 

    const fragment = document.createDocumentFragment();

    const filteredProjects = state.localProjectsCache.filter(p => p.name?.toLowerCase().includes(searchTerm));
    const filteredSessions = state.localChatSessionsCache.filter(s => (s.title || '새 대화').toLowerCase().includes(searchTerm));

    // Render Projects
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

    // Render Unassigned Sessions
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
}

export function createProjectItem(project, sessionsInProject, searchTerm) {
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

export function createSessionItem(session) {
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

export function getRelativeDateGroup(timestamp, isPinned = false) {
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

// --- Message Rendering ---

export function renderChatMessages(sessionData) {
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
            const content = msg.content || "";
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
export function clearTimers(blockId) {
    if (state.activeTimers[blockId]) {
        state.activeTimers[blockId].forEach(timer => clearInterval(timer) || clearTimeout(timer));
        delete state.activeTimers[blockId];
    }
}

export function startSummaryAnimation(blockElement, reasoningSteps) {
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

export function typewriterEffect(element, text, onComplete) {
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

// --- Context Menus ---
export function removeContextMenu() {
    if (state.currentOpenContextMenu) {
        state.currentOpenContextMenu.remove();
        state.currentOpenContextMenu = null;
    }
}

export function showProjectContextMenu(projectId, buttonElement) {
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
        if (action === 'rename') startProjectRename(projectId);
        else if (action === 'delete') deleteProject(projectId);
        removeContextMenu();
    });
}

export function showSessionContextMenu(sessionId, x, y) {
    const session = state.localChatSessionsCache.find(s => s.id === sessionId);
    if (!session) return;
    removeContextMenu();
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
    const { offsetWidth, offsetHeight } = menu;
    menu.style.left = `${x + offsetWidth > window.innerWidth ? x - offsetWidth : x}px`;
    menu.style.top = `${y + offsetHeight > window.innerHeight ? y - offsetHeight : y}px`;
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

// --- API/Model Selectors ---
export function updateChatHeaderModelSelector(settings, isModal = false) {
    const selector = isModal ? aiModelSelect : aiModelSelector;
    if (!selector) return;

    const DEFAULT_MODELS = [
        { value: 'gemini-1.5-flash-latest', text: '⚡️ Gemini 1.5 Flash (최신)' },
        { value: 'gemini-pro', text: '💡 Gemini Pro (안정)' }
    ];
    selector.innerHTML = '';

    if (settings.provider && settings.apiKey) {
        const models_to_show = settings.availableModels || [];
        if (models_to_show.length === 0 && settings.selectedModel) {
            models_to_show.push(settings.selectedModel);
        }
        models_to_show.forEach(modelId => {
            const option = document.createElement('option');
            option.value = modelId;
            option.textContent = isModal ? modelId : `[개인] ${modelId}`;
            selector.appendChild(option);
        });
        if(settings.selectedModel) selector.value = settings.selectedModel;
        selector.title = `${settings.provider} 모델을 선택합니다. (개인 키 사용 중)`;
    } else {
        DEFAULT_MODELS.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.text;
            selector.appendChild(option);
        });
        const savedDefaultModel = localStorage.getItem('selectedAiModel') || 'gemini-1.5-flash-latest';
        selector.value = savedDefaultModel;
        selector.title = 'AI 모델을 선택합니다.';
    }
}

export function populateModelSelector(models, provider) {
    if (!aiModelSelect) return;
    aiModelSelect.innerHTML = '';
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
            aiModelSelect.appendChild(option);
        });
        aiModelSelect.disabled = false;
    } else {
        aiModelSelect.innerHTML = '<option>사용 가능한 모델 없음</option>';
        aiModelSelect.disabled = true;
    }
}

export function renderTokenUsage() {
    if (!tokenUsageDisplay) return;
    const { prompt, completion } = state.userApiSettings.tokenUsage;
    const total = prompt + completion;
    tokenUsageDisplay.innerHTML = `<span>입력: ${prompt.toLocaleString()}</span> | <span>출력: ${completion.toLocaleString()}</span> | <strong>총합: ${total.toLocaleString()}</strong>`;
}

// --- Other UI ---
export function setupChatModeSelector() {
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

export function openPromptModal() {
    if (customPromptInput) customPromptInput.value = state.customPrompt;
    if (promptModalOverlay) promptModalOverlay.style.display = 'flex';
}