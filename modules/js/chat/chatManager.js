/* Module: chatManager.js - Main controller for the chat panel and its sub-components. */
import * as State from '../state.js';
import * as UI from '../ui.js';
import * as ChatData from './chatData.js';
import * as ChatUI from './chatUI.js';
import { getRelativeDateGroup } from '../utils.js';

export function createSessionItem(session) {
    const item = document.createElement('div');
    item.className = 'session-item';
    item.dataset.sessionId = session.id;
    item.draggable = true;
    if (session.id === State.currentSessionId) item.classList.add('active');

    const createdAt = session.createdAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) || '정보 없음';
    const updatedAt = session.updatedAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) || createdAt;
    item.title = `생성: ${createdAt}\n최종 수정: ${updatedAt}`;

    const pinIconSVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>`;

    const titleSpan = document.createElement('div');
    titleSpan.className = 'session-item-title';
    titleSpan.textContent = session.title || '새 대화';

    const pinButton = document.createElement('button');
    pinButton.className = `session-pin-btn ${session.isPinned ? 'pinned-active' : ''}`;
    pinButton.title = session.isPinned ? '고정 해제' : '고정하기';
    pinButton.innerHTML = pinIconSVG;

    item.appendChild(titleSpan);
    item.appendChild(pinButton);

    return item;
}

export function renderSidebarContent() {
    if (!UI.sessionListContainer) return;
    const searchTerm = UI.searchSessionsInput.value.toLowerCase();
    UI.sessionListContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();

    const filteredProjects = State.localProjectsCache.filter(p => p.name?.toLowerCase().includes(searchTerm));
    const filteredSessions = State.localChatSessionsCache.filter(s => (s.title || '새 대화').toLowerCase().includes(searchTerm));

    if (filteredProjects.length > 0 || State.localProjectsCache.length > 0) {
        const projectGroupHeader = document.createElement('div');
        projectGroupHeader.className = 'session-group-header';
        projectGroupHeader.textContent = '📁 프로젝트';
        fragment.appendChild(projectGroupHeader);

        const sortedProjects = [...(searchTerm ? filteredProjects : State.localProjectsCache)].sort((a, b) => {
             const timeA = a.updatedAt?.toMillis() || 0;
             const timeB = b.updatedAt?.toMillis() || 0;
             return timeB - timeA;
        });

        sortedProjects.forEach(project => {
            const sessionsInProject = State.localChatSessionsCache
                .filter(s => s.projectId === project.id)
                .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
            if (searchTerm && !project.name.toLowerCase().includes(searchTerm) && sessionsInProject.filter(s => (s.title || '').toLowerCase().includes(searchTerm)).length === 0) {
                return;
            }
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
            fragment.appendChild(projectContainer);
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
    UI.sessionListContainer.appendChild(fragment);
}


export function selectSession(sessionId) {
    State.setCurrentOpenContextMenu(null);
    if (!sessionId) return;
    const sessionData = State.localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionData) return;
    State.setCurrentSessionId(sessionId);
    Object.values(State.activeTimers).forEach(timers => timers.forEach(clearInterval));
    renderSidebarContent();
    if (UI.chatWelcomeMessage) UI.chatWelcomeMessage.style.display = 'none';
    if (UI.chatMessages) UI.chatMessages.style.display = 'flex';
    ChatUI.renderChatMessages(sessionData);
    if (UI.chatSessionTitle) UI.chatSessionTitle.textContent = sessionData.title || '대화';
    if (UI.deleteSessionBtn) UI.deleteSessionBtn.style.display = 'inline-block';
    if (UI.chatInput) UI.chatInput.disabled = false;
    if (UI.chatSendBtn) UI.chatSendBtn.disabled = false;
    UI.chatInput.focus();
}

export function handleNewChat() {
    State.setCurrentSessionId(null);
    Object.values(State.activeTimers).forEach(timers => timers.forEach(clearInterval));
    renderSidebarContent();
    if (UI.chatMessages) { UI.chatMessages.innerHTML = ''; UI.chatMessages.style.display = 'none'; }
    if (UI.chatWelcomeMessage) UI.chatWelcomeMessage.style.display = 'flex';
    if (UI.chatSessionTitle) UI.chatSessionTitle.textContent = 'AI 러닝메이트';
    if (UI.deleteSessionBtn) UI.deleteSessionBtn.style.display = 'none';
    if (UI.chatInput) { UI.chatInput.disabled = false; UI.chatInput.value = ''; }
    if (UI.chatSendBtn) UI.chatSendBtn.disabled = false;
}

export function toggleProjectExpansion(projectId) {
    const project = State.localProjectsCache.find(p => p.id === projectId);
    if (project) {
        project.isExpanded = !project.isExpanded;
        renderSidebarContent();
    }
}
export { renderChatMessages } from './chatUI.js';