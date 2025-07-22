/*
--- Ailey & Bailey Canvas ---
File: js/chat-ui.js
Version: 11.0 (Refactored)
Architect: [Username] & System Architect Ailey
Description: Manages the UI/UX aspects of the chat panel, including rendering the session list, handling drag-and-drop, context menus, and animations for the reasoning block.
*/

import * as state from './state.js';
import { toggleChatPin, renameProject, deleteProject, handleDeleteSession, moveSessionToProject, renameSession, getRelativeDateGroup } from './chat-session.js';

// --- Element Cache ---
let sessionListContainer, chatMessages, chatWelcomeMessage, chatSessionTitle,
    deleteSessionBtn, chatInput, chatSendBtn, searchSessionsInput;

export function initializeChatUI() {
    sessionListContainer = document.getElementById('session-list-container');
    chatMessages = document.getElementById('chat-messages');
    chatWelcomeMessage = document.getElementById('chat-welcome-message');
    chatSessionTitle = document.getElementById('chat-session-title');
    deleteSessionBtn = document.getElementById('delete-session-btn');
    chatInput = document.getElementById('chat-input');
    chatSendBtn = document.getElementById('chat-send-btn');
    searchSessionsInput = document.getElementById('search-sessions-input');

    // --- Event Listeners ---
    if (deleteSessionBtn) deleteSessionBtn.addEventListener('click', () => handleDeleteSession(state.currentSessionId));

    if (sessionListContainer) {
        setupSessionListEventListeners();
    }
}

export function handleNewChat() {
    state.setCurrentSessionId(null);
    Object.values(state.activeTimers).forEach(timers => timers.forEach(clearInterval));
    renderSidebarContent();
    if (chatMessages) {
        chatMessages.innerHTML = '';
        chatMessages.style.display = 'none';
    }
    if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'flex';
    if (chatSessionTitle) chatSessionTitle.textContent = 'AI 러닝메이트';
    if (deleteSessionBtn) deleteSessionBtn.style.display = 'none';
    if (chatInput) {
        chatInput.disabled = false;
        chatInput.value = '';
    }
    if (chatSendBtn) chatSendBtn.disabled = false;
}

export async function selectSession(sessionId) {
    removeContextMenu();
    if (!sessionId) return;
    const sessionData = state.localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionData) return;

    state.setCurrentSessionId(sessionId);
    Object.values(state.activeTimers).forEach(timers => timers.forEach(clearInterval));
    renderSidebarContent();

    if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
    if (chatMessages) chatMessages.style.display = 'flex';
    
    const { renderChatMessages } = await import('./chat-core.js');
    renderChatMessages(sessionData);

    if (chatSessionTitle) chatSessionTitle.textContent = sessionData.title || '대화';
    if (deleteSessionBtn) deleteSessionBtn.style.display = 'inline-block';
    if (chatInput) chatInput.disabled = false;
    if (chatSendBtn) chatSendBtn.disabled = false;
    chatInput.focus();
}

export function renderSidebarContent() {
    if (!sessionListContainer) return;
    const searchTerm = searchSessionsInput.value.toLowerCase();
    sessionListContainer.innerHTML = ''; 

    const filteredProjects = state.localProjectsCache.filter(p => p.name?.toLowerCase().includes(searchTerm));
    const filteredSessions = state.localChatSessionsCache.filter(s => (s.title || '새 대화').toLowerCase().includes(searchTerm));

    const fragment = document.createDocumentFragment();

    // Render Projects
    if (filteredProjects.length > 0 || state.localProjectsCache.length > 0) {
        const projectGroupHeader = document.createElement('div');
        projectGroupHeader.className = 'session-group-header';
        projectGroupHeader.textContent = '📁 프로젝트';
        fragment.appendChild(projectGroupHeader);

        const sortedProjects = [...(searchTerm ? filteredProjects : state.localProjectsCache)].sort((a, b) => {
             const timeA = a.updatedAt?.toMillis() || 0;
             const timeB = b.updatedAt?.toMillis() || 0;
             return timeB - timeA;
        });

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
        </button>`;
    
    return item;
}

export function removeContextMenu() {
    if(state.currentOpenContextMenu) state.currentOpenContextMenu.remove();
    state.setCurrentOpenContextMenu(null);
}

function showProjectContextMenu(projectId, buttonElement) {
    removeContextMenu();
    const rect = buttonElement.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'project-context-menu';
    menu.style.top = `${rect.bottom + 2}px`;
    menu.style.right = '5px';
    menu.innerHTML = `
        <button class="context-menu-item" data-action="rename">이름 변경</button>
        <button class="context-menu-item" data-action="delete">삭제</button>
    `;
    sessionListContainer.appendChild(menu);
    menu.style.display = 'block';
    state.setCurrentOpenContextMenu(menu);

    menu.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = e.target.closest('.context-menu-item').dataset.action;
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

    let moveToSubMenuHTML = state.localProjectsCache
        .map(p => `<button class="context-menu-item" data-project-id="${p.id}" ${session.projectId === p.id ? 'disabled' : ''}>${p.name}</button>`).join('');

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
    const menuRect = menu.getBoundingClientRect();
    menu.style.left = `${x + menuRect.width > window.innerWidth ? x - menuRect.width : x}px`;
    menu.style.top = `${y + menuRect.height > window.innerHeight ? y - menuRect.height : y}px`;
    menu.style.display = 'block';
    state.setCurrentOpenContextMenu(menu);

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

function toggleProjectExpansion(projectId) {
    const project = state.localProjectsCache.find(p => p.id === projectId);
    if (project) {
        project.isExpanded = !project.isExpanded;
        renderSidebarContent();
    }
}

export function startProjectRename(projectId) {
    const projectHeader = document.querySelector(`.project-container[data-project-id="${projectId}"] .project-header`);
    if (!projectHeader) return;
    const titleSpan = projectHeader.querySelector('.project-title');
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
             renderSidebarContent(); // Re-render to restore original title
        }
    };

    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); }
    });
}

export function startSessionRename(sessionId) {
    const sessionItem = document.querySelector(`.session-item[data-session-id="${sessionId}"]`);
    if (!sessionItem) return;
    const titleSpan = sessionItem.querySelector('.session-item-title');
    if (!titleSpan) return;
    const originalTitle = titleSpan.textContent;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'project-title-input'; // Reuse class for similar styling
    input.value = originalTitle;
    
    titleSpan.innerHTML = '';
    titleSpan.appendChild(input);
    input.focus();
    input.select();

    const finishEditing = () => {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== originalTitle) {
            renameSession(sessionId, newTitle);
        } else {
            renderSidebarContent(); // Restore original if empty or unchanged
        }
    };
    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); }
    });
}

function setupSessionListEventListeners() {
    sessionListContainer.addEventListener('click', (e) => {
        if (!e.target.closest('.project-context-menu, .session-context-menu')) {
            removeContextMenu();
        }
        const sessionItem = e.target.closest('.session-item');
        if (sessionItem) {
            const pinButton = e.target.closest('.session-pin-btn');
            if (pinButton) {
                e.stopPropagation();
                toggleChatPin(sessionItem.dataset.sessionId);
            } else if (!e.target.closest('input')) {
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
        }
    });

    sessionListContainer.addEventListener('contextmenu', (e) => {
        const sessionItem = e.target.closest('.session-item');
        if (sessionItem) {
            e.preventDefault();
            removeContextMenu();
            showSessionContextMenu(sessionItem.dataset.sessionId, e.clientX, e.clientY);
        }
    });

    // Drag and Drop Logic
    let draggedItem = null;
    sessionListContainer.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('session-item')) {
            draggedItem = e.target;
            setTimeout(() => e.target.classList.add('is-dragging'), 0);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedItem.dataset.sessionId);
        } else {
            e.preventDefault();
        }
    });

    sessionListContainer.addEventListener('dragend', () => {
        if (draggedItem) {
            draggedItem.classList.remove('is-dragging');
            draggedItem = null;
        }
        document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => {
            el.classList.remove('drag-over', 'drag-target-area');
        });
    });

    sessionListContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        const targetProjectHeader = e.target.closest('.project-header');
        document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => el.classList.remove('drag-over', 'drag-target-area'));

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
    });

    sessionListContainer.addEventListener('dragleave', (e) => {
        if (e.target === sessionListContainer) {
            sessionListContainer.classList.remove('drag-target-area');
        }
    });

    sessionListContainer.addEventListener('drop', async (e) => {
        e.preventDefault();
        document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => el.classList.remove('drag-over', 'drag-target-area'));
        if (!draggedItem) return;

        const sessionId = e.dataTransfer.getData('text/plain');
        const targetProjectHeader = e.target.closest('.project-header');
        let targetProjectId = null;
        let shouldUpdate = false;

        const sourceSession = state.localChatSessionsCache.find(s => s.id === sessionId);
        if (!sourceSession) return;

        if (targetProjectHeader) {
            targetProjectId = targetProjectHeader.closest('.project-container').dataset.projectId;
            if (sourceSession.projectId !== targetProjectId) shouldUpdate = true;
        } else {
            if (sourceSession.projectId) {
                targetProjectId = null;
                shouldUpdate = true;
            }
        }

        if (shouldUpdate) {
            moveSessionToProject(sessionId, targetProjectId);
        }
    });
}