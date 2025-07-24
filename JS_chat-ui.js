/* --- JS_chat-ui.js --- */
import * as state from 'https://lemos999.github.io/ailey-bailey-canvas/JS_state.js';
import { typewriterEffect, clearTimers } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_ui-helpers.js';

export function getChatDomElements() {
    return {
        chatPanel: document.getElementById('chat-panel'),
        chatForm: document.getElementById('chat-form'),
        chatInput: document.getElementById('chat-input'),
        chatMessages: document.getElementById('chat-messages'),
        chatSendBtn: document.getElementById('chat-send-btn'),
        chatModeSelector: document.getElementById('chat-mode-selector'),
        newChatBtn: document.getElementById('new-chat-btn'),
        newProjectBtn: document.getElementById('new-project-btn'),
        sessionListContainer: document.getElementById('session-list-container'),
        chatSessionTitle: document.getElementById('chat-session-title'),
        deleteSessionBtn: document.getElementById('delete-session-btn'),
        chatWelcomeMessage: document.getElementById('chat-welcome-message'),
        searchSessionsInput: document.getElementById('search-sessions-input'),
        aiModelSelector: document.getElementById('ai-model-selector')
    };
}

function getRelativeDateGroup(timestamp, isPinned = false) {
    if (isPinned) return { key: 0, label: '?? 고정됨' };
    if (!timestamp) return { key: 99, label: '날짜 정보 없음' };
    const now = new Date();
    const date = timestamp instanceof Date ? timestamp : timestamp;
    now.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 1) return { key: 1, label: '오늘' };
    if (diffDays < 2) return { key: 2, label: '어제' };
    if (diffDays < 7) return { key: 3, label: '지난 7일' };
    const nowMonth = now.getMonth(), dateMonth = date.getMonth(), nowYear = now.getFullYear(), dateYear = date.getFullYear();
    if (nowYear === dateYear && nowMonth === dateMonth) return { key: 4, label: '이번 달' };
    return { key: 5, label: \년 \월 };
}

export function renderSidebarContent() {
    const dom = getChatDomElements();
    if (!dom.sessionListContainer) return;
    const searchTerm = dom.searchSessionsInput.value.toLowerCase();
    dom.sessionListContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();

    const localProjectsCache = state.getLocalProjectsCache();
    const localChatSessionsCache = state.getLocalChatSessionsCache();
    
    const filteredProjects = localProjectsCache.filter(p => p.name?.toLowerCase().includes(searchTerm));
    const filteredSessions = localChatSessionsCache.filter(s => (s.title || '새 대화').toLowerCase().includes(searchTerm));

    const sortedProjects = [...(searchTerm ? filteredProjects : localProjectsCache)].sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
    if (sortedProjects.length > 0) {
        const projectGroupHeader = document.createElement('div');
        projectGroupHeader.className = 'session-group-header';
        projectGroupHeader.textContent = '?? 프로젝트';
        fragment.appendChild(projectGroupHeader);

        sortedProjects.forEach(project => {
            const sessionsInProject = localChatSessionsCache.filter(s => s.projectId === project.id).sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
            if (searchTerm && !project.name.toLowerCase().includes(searchTerm) && sessionsInProject.filter(s => (s.title || '').toLowerCase().includes(searchTerm)).length === 0) {
                return;
            }
            fragment.appendChild(createProjectItem(project, sessionsInProject, searchTerm));
        });
    }

    const unassignedSessions = filteredSessions.filter(s => !s.projectId);
    if (unassignedSessions.length > 0) {
        const generalGroupHeader = document.createElement('div');
        generalGroupHeader.className = 'session-group-header';
        generalGroupHeader.textContent = '?? 일반 대화';
        fragment.appendChild(generalGroupHeader);
        
        unassignedSessions.forEach(session => {
            const timestamp = session.updatedAt || session.createdAt;
            session.dateGroup = getRelativeDateGroup(timestamp?.toDate(), session.isPinned);
        });

        const groupedSessions = unassignedSessions.reduce((acc, session) => {
            const label = session.dateGroup.label;
            if (!acc[label]) acc[label] = { key: session.dateGroup.key, items: [] };
            acc[label].items.push(session);
            return acc;
        }, {});

        Object.keys(groupedSessions).sort((a, b) => groupedSessions[a].key - groupedSessions[b].key).forEach(label => {
            const header = document.createElement('div');
            header.className = 'date-group-header';
            header.textContent = label;
            fragment.appendChild(header);
            const group = groupedSessions[label];
            group.items.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
            group.items.forEach(session => fragment.appendChild(createSessionItem(session)));
        });
    }

    dom.sessionListContainer.appendChild(fragment);
}

function createProjectItem(project, sessions, searchTerm) {
    const projectContainer = document.createElement('div');
    projectContainer.className = 'project-container';
    projectContainer.dataset.projectId = project.id;
    const projectHeader = document.createElement('div');
    projectHeader.className = 'project-header';
    projectHeader.innerHTML = 
        <span class="project-toggle-icon \"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" /></svg></span>
        <span class="project-icon"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2Z" /></svg></span>
        <span class="project-title">\</span>
        <button class="project-actions-btn" title="프로젝트 메뉴"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" /></svg></button>
    ;
    const sessionsContainer = document.createElement('div');
    sessionsContainer.className = sessions-in-project \;
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
    if (session.id === state.getCurrentSessionId()) item.classList.add('active');
    
    item.innerHTML = 
        <div class="session-item-title">\</div>
        <button class="session-pin-btn \" title="\">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>
        </button>
    ;
    return item;
}

export function renderChatMessages(sessionData) {
    const dom = getChatDomElements();
    if (!dom.chatMessages || !sessionData) return;
    const messages = sessionData.messages || [];
    dom.chatMessages.innerHTML = '';
    
    messages.forEach((msg, index) => {
        if (msg.role === 'user') {
            const d = document.createElement('div');
            d.className = 'chat-message user';
            d.textContent = msg.content;
            dom.chatMessages.appendChild(d);
        } else if (msg.role === 'ai') {
            if (msg.status === 'loading') {
                const loadingBlock = document.createElement('div');
                loadingBlock.className = 'reasoning-block loading';
                loadingBlock.id = msg.id;
                loadingBlock.innerHTML = <div class="reasoning-header"><span class="toggle-icon">▶</span><span class="reasoning-summary blinking-cursor">AI가 생각하는 중...</span></div>;
                dom.chatMessages.appendChild(loadingBlock);
                return;
            }
            
            const aiContainer = document.createElement('div');
            aiContainer.className = 'ai-response-container';
            const reasoningRegex = /\[REASONING_START\]([\s\S]*?)\[REASONING_END\]/;
            const match = msg.content.match(reasoningRegex);

            if (match) {
                const rBlock = document.createElement('div');
                rBlock.className = 'reasoning-block';
                rBlock.id = easoning-\-\;
                rBlock.dataset.steps = JSON.stringify(match[1].split('SUMMARY:').filter(s => s).map(step => ({ summary: step.split('|||DETAIL:')[0]?.trim(), detail: step.split('|||DETAIL:')[1]?.trim() })));
                rBlock.innerHTML = <div class="reasoning-header"><span class="toggle-icon">▶</span><span>AI의 추론 과정...</span><span class="reasoning-summary"></span></div><div class="reasoning-content"></div>;
                aiContainer.appendChild(rBlock);
                startSummaryAnimation(rBlock, JSON.parse(rBlock.dataset.steps));
                
                const finalAnswer = msg.content.replace(reasoningRegex, '').trim();
                if (finalAnswer) {
                    const finalDiv = document.createElement('div');
                    finalDiv.className = 'chat-message ai';
                    finalDiv.innerHTML = finalAnswer.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>\</strong>').replace(/\\n/g, '<br>');
                    aiContainer.appendChild(finalDiv);
                }
            } else {
                const d = document.createElement('div');
                d.className = 'chat-message ai';
                d.innerHTML = msg.content.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>\</strong>').replace(/\\n/g, '<br>');
                aiContainer.appendChild(d);
            }

            if (msg.duration) {
                const metaDiv = document.createElement('div');
                metaDiv.className = 'ai-response-meta';
                metaDiv.innerHTML = <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" /></svg><span>응답 생성: \초</span>;
                aiContainer.appendChild(metaDiv);
            }
            dom.chatMessages.appendChild(aiContainer);
        }
    });
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
}

function startSummaryAnimation(block, steps) {
    const blockId = block.id;
    clearTimers(blockId);
    const activeTimers = state.getActiveTimers();
    activeTimers[blockId] = [];
    const summaryEl = block.querySelector('.reasoning-summary');
    if (!summaryEl || !steps?.length) return;
    let index = 0;
    const cycle = () => {
        if (!steps[index]?.summary) return;
        typewriterEffect(summaryEl, steps[index].summary, () => {
            const wait = setTimeout(() => {
                summaryEl.style.opacity = '0';
                const fade = setTimeout(() => { index = (index + 1) % steps.length; summaryEl.style.opacity = '1'; }, 500);
                activeTimers[blockId].push(fade);
            }, 2000);
            activeTimers[blockId].push(wait);
        });
    };
    cycle();
    const interval = setInterval(cycle, 4000);
    activeTimers[blockId].push(interval);
}
