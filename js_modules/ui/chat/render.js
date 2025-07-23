/*
 * chat/render.js: Handles rendering for the chat panel, including messages and the sidebar.
 */
import * as Dom from '../../utils/domElements.js';
import * as State from '../../core/state.js';
import { getRelativeDateGroup, typewriterEffect } from '../../utils/helpers.js';

function clearTimers(blockId) {
    if (State.activeTimers[blockId]) {
        State.activeTimers[blockId].forEach(clearInterval);
        delete State.activeTimers[blockId];
    }
}

function startSummaryAnimation(blockElement, reasoningSteps) {
    const blockId = blockElement.id;
    clearTimers(blockId);
    State.activeTimers[blockId] = [];

    const summaryElement = blockElement.querySelector('.reasoning-summary');
    if (!summaryElement || !reasoningSteps || reasoningSteps.length === 0) return;

    let stepIndex = 0;
    const cycleSummary = () => {
        if (!reasoningSteps[stepIndex] || !reasoningSteps[stepIndex].summary) return;
        const summaryText = reasoningSteps[stepIndex].summary;
        typewriterEffect(summaryElement, summaryText, () => {
            const waitTimer = setTimeout(() => {
                summaryElement.style.opacity = '0';
                const fadeTimer = setTimeout(() => {
                    stepIndex = (stepIndex + 1) % reasoningSteps.length;
                    summaryElement.style.opacity = '1';
                }, 500);
                 if (!State.activeTimers[blockId]) State.activeTimers[blockId] = [];
                 State.activeTimers[blockId].push(fadeTimer);
            }, 2000);
             if (!State.activeTimers[blockId]) State.activeTimers[blockId] = [];
             State.activeTimers[blockId].push(waitTimer);
        });
    };
    
    cycleSummary();
    const summaryInterval = setInterval(cycleSummary, 4000); 
    if (!State.activeTimers[blockId]) State.activeTimers[blockId] = [];
    State.activeTimers[blockId].push(summaryInterval);
}

export function renderChatMessages(sessionData) {
    if (!Dom.chatMessages || !sessionData) return;
    const messages = sessionData.messages || [];
    Dom.chatMessages.innerHTML = '';

    messages.forEach((msg, index) => {
        if (msg.role === 'user') {
            const d = document.createElement('div');
            d.className = +'chat-message user'+;
            d.textContent = msg.content;
            Dom.chatMessages.appendChild(d);

        } else if (msg.role === 'ai') {
            if (msg.status === 'loading') {
                const loadingBlock = document.createElement('div');
                loadingBlock.className = 'reasoning-block loading';
                loadingBlock.id = msg.id;
                loadingBlock.innerHTML = +'
                    <div class="reasoning-header">
                        <span class="toggle-icon">▶</span>
                        <span class="reasoning-summary blinking-cursor">AI가 생각하는 중...</span>
                    </div>
                +';
                Dom.chatMessages.appendChild(loadingBlock);
                return;
            }

            const aiContainer = document.createElement('div');
            aiContainer.className = 'ai-response-container';
            const content = msg.content;
            const reasoningRegex = /\[REASONING_START\]([\s\S]*?)\[REASONING_END\]/;
            const match = content.match(reasoningRegex);

            if (match) {
                const reasoningBlockId = +'easoning--'+;
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
                rBlock.innerHTML = +'
                    <div class="reasoning-header">
                        <span class="toggle-icon">▶</span>
                        <span>AI의 추론 과정...</span>
                        <span class="reasoning-summary"></span>
                    </div>
                    <div class="reasoning-content"></div>
                +';
                aiContainer.appendChild(rBlock);
                startSummaryAnimation(rBlock, reasoningSteps);

                if (finalAnswer) {
                    const finalAnswerDiv = document.createElement('div');
                    finalAnswerDiv.className = 'chat-message ai';
                    finalAnswerDiv.innerHTML = finalAnswer.replace(/\*\*(.*?)\*\*/g, '<strong></strong>').replace(/\n/g, '<br>');
                    aiContainer.appendChild(finalAnswerDiv);
                }
            } else {
                const d = document.createElement('div');
                d.className = 'chat-message ai';
                d.innerHTML = content.replace(/\*\*(.*?)\*\*/g, '<strong></strong>').replace(/\n/g, '<br>');
                aiContainer.appendChild(d);
            }

            if (msg.duration) {
                const metaDiv = document.createElement('div');
                metaDiv.className = 'ai-response-meta';
                metaDiv.innerHTML = +'
                    <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" /></svg>
                    <span>응답 생성: 초</span>
                +';
                aiContainer.appendChild(metaDiv);
            }
            Dom.chatMessages.appendChild(aiContainer);
        }
    });
    Dom.chatMessages.scrollTop = Dom.chatMessages.scrollHeight;
}

export function renderSidebarContent() {
    if (!Dom.sessionListContainer) return;
    const searchTerm = Dom.searchSessionsInput.value.toLowerCase();
    Dom.sessionListContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();

    // Filter projects and sessions based on search term
    const filteredProjects = State.localProjectsCache.filter(p => p.name?.toLowerCase().includes(searchTerm));
    const filteredSessions = State.localChatSessionsCache.filter(s => (s.title || '새 대화').toLowerCase().includes(searchTerm));

    // Render projects
    if (filteredProjects.length > 0 || State.localProjectsCache.length > 0) {
        const projectGroupHeader = document.createElement('div');
        projectGroupHeader.className = 'session-group-header';
        projectGroupHeader.textContent = '📁 프로젝트';
        fragment.appendChild(projectGroupHeader);

        const sortedProjects = [...(searchTerm ? filteredProjects : State.localProjectsCache)].sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));

        sortedProjects.forEach(project => {
            const sessionsInProject = State.localChatSessionsCache.filter(s => s.projectId === project.id).sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
            if (searchTerm && !project.name.toLowerCase().includes(searchTerm) && sessionsInProject.filter(s => (s.title || '').toLowerCase().includes(searchTerm)).length === 0) {
                return;
            }
            fragment.appendChild(createProjectItem(project, sessionsInProject, searchTerm));
        });
    }

    // Render unassigned sessions
    const unassignedSessions = filteredSessions.filter(s => !s.projectId);
    if (unassignedSessions.length > 0) {
        const generalGroupHeader = document.createElement('div');
        generalGroupHeader.className = 'session-group-header';
        generalGroupHeader.textContent = '💬 일반 대화';
        fragment.appendChild(generalGroupHeader);
        
        unassignedSessions.forEach(session => session.dateGroup = getRelativeDateGroup(session.updatedAt || session.createdAt, session.isPinned));
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
    Dom.sessionListContainer.appendChild(fragment);
}

function createProjectItem(project, sessionsInProject, searchTerm) {
    const projectContainer = document.createElement('div');
    projectContainer.className = 'project-container';
    projectContainer.dataset.projectId = project.id;
    const createdAt = project.createdAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) || '정보 없음';
    const updatedAt = project.updatedAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) || createdAt;
    projectContainer.innerHTML = +'
        <div class="project-header" title="생성: \n최종 수정: ">
            <span class="project-toggle-icon ">
                <svg viewBox="0 0 24 24" width="16" height="16"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" /></svg>
            </span>
            <span class="project-icon">
                <svg viewBox="0 0 24 24" width="18" height="18"><path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2Z" /></svg>
            </span>
            <span class="project-title"></span>
            <button class="project-actions-btn" title="프로젝트 메뉴">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" /></svg>
            </button>
        </div>
        <div class="sessions-in-project "></div>
    +';
    const sessionsContainer = projectContainer.querySelector('.sessions-in-project');
    sessionsInProject.forEach(session => {
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
    if (session.id === State.currentSessionId) item.classList.add('active');
    const createdAt = session.createdAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) || '정보 없음';
    const updatedAt = session.updatedAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) || createdAt;
    item.title = +'생성: \n최종 수정: '+;
    item.innerHTML = +'
        <div class="session-item-title"></div>
        <button class="session-pin-btn " title="">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>
        </button>
    +';
    return item;
}

export function handleReasoningBlockClick(e) {
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
        typewriterEffect(content, fullText);
    } else {
        content.innerHTML = '';
        const steps = JSON.parse(block.dataset.steps);
        startSummaryAnimation(block, steps);
    }
}
