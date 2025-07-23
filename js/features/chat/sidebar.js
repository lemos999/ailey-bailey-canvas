import { state, setState } from '../../core/state.js';
import { dom } from '../../ui/dom.js';
import { selectSession, toggleChatPin, moveSessionToProject, handleDeleteSession, startSessionRename } from './session.js';
import { toggleProjectExpansion, startProjectRename, deleteProject } from './project.js';

function getRelativeDateGroup(timestamp, isPinned = false) {
    if (isPinned) return { key: 0, label: '?? 고정됨' };
    if (!timestamp) return { key: 99, label: '날짜 정보 없음' };
    const now = new Date(); const date = timestamp.toDate();
    now.setHours(0, 0, 0, 0); date.setHours(0, 0, 0, 0);
    const diffDays = (now.getTime() - date.getTime()) / 86400000;
    if (diffDays < 1) return { key: 1, label: '오늘' };
    if (diffDays < 2) return { key: 2, label: '어제' };
    if (diffDays < 7) return { key: 3, label: '지난 7일' };
    const nowMonth = now.getMonth(), dateMonth = date.getMonth(), nowYear = now.getFullYear(), dateYear = date.getFullYear();
    if (nowYear === dateYear && nowMonth === dateMonth) return { key: 4, label: '이번 달' };
    return { key: 6 + (nowYear - dateYear) * 12 + (nowMonth - dateMonth), label: ${dateYear}년 월 };
}

export function renderSidebarContent() {
    if (!dom.sessionListContainer) return;
    const searchTerm = dom.searchSessionsInput.value.toLowerCase();
    dom.sessionListContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();

    const sortedProjects = [...state.localProjectsCache].sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
    const unassignedSessions = state.localChatSessionsCache.filter(s => !s.projectId && (!searchTerm || (s.title || '새 대화').toLowerCase().includes(searchTerm)));

    if (sortedProjects.length > 0) {
        const projectGroupHeader = document.createElement('div');
        projectGroupHeader.className = 'session-group-header';
        projectGroupHeader.textContent = '?? 프로젝트';
        fragment.appendChild(projectGroupHeader);

        sortedProjects.forEach(project => {
            const sessionsInProject = state.localChatSessionsCache.filter(s => s.projectId === project.id).sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
            if (searchTerm && !project.name.toLowerCase().includes(searchTerm) && sessionsInProject.filter(s => (s.title || '').toLowerCase().includes(searchTerm)).length === 0) return;
            fragment.appendChild(createProjectItem(project, sessionsInProject, searchTerm));
        });
    }

    if (unassignedSessions.length > 0) {
        const generalGroupHeader = document.createElement('div');
        generalGroupHeader.className = 'session-group-header';
        generalGroupHeader.textContent = '?? 일반 대화';
        fragment.appendChild(generalGroupHeader);
        unassignedSessions.forEach(s => { s.dateGroup = getRelativeDateGroup(s.updatedAt || s.createdAt, s.isPinned); });
        const grouped = unassignedSessions.reduce((acc, s) => { (acc[s.dateGroup.label] = acc[s.dateGroup.label] || { key: s.dateGroup.key, items: [] }).items.push(s); return acc; }, {});
        Object.keys(grouped).sort((a, b) => grouped[a].key - grouped[b].key).forEach(label => {
            const header = document.createElement('div'); header.className = 'date-group-header'; header.textContent = label; fragment.appendChild(header);
            grouped[label].items.forEach(session => fragment.appendChild(createSessionItem(session)));
        });
    }
    dom.sessionListContainer.appendChild(fragment);
}

function createProjectItem(project, sessions, searchTerm) {
    const container = document.createElement('div'); container.className = 'project-container'; container.dataset.projectId = project.id;
    const header = document.createElement('div'); header.className = 'project-header';
    header.innerHTML = 
        <span class="project-toggle-icon "><svg viewBox="0 0 24 24" width="16" height="16"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" /></svg></span>
        <span class="project-icon"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2Z" /></svg></span>
        <span class="project-title"></span>
        <button class="project-actions-btn" title="프로젝트 메뉴"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" /></svg></button>
    ;
    const sessionsContainer = document.createElement('div'); sessionsContainer.className = sessions-in-project ;
    sessions.forEach(session => { if (!searchTerm || (session.title || '새 대화').toLowerCase().includes(searchTerm)) sessionsContainer.appendChild(createSessionItem(session)); });
    container.append(header, sessionsContainer);
    return container;
}

function createSessionItem(session) {
    const item = document.createElement('div');
    item.className = 'session-item'; item.dataset.sessionId = session.id; item.draggable = true;
    if (session.id === state.currentSessionId) item.classList.add('active');
    item.innerHTML = 
        <div class="session-item-title"></div>
        <button class="session-pin-btn " title="고정"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg></button>
    ;
    return item;
}

function showContextMenu(type, id, event) {
    if (state.currentOpenContextMenu) state.currentOpenContextMenu.remove();
    event.preventDefault();
    const menu = document.createElement('div');
    menu.className = ${type}-context-menu;
    let content = '';

    if (type === 'project') {
        content = <button class="context-menu-item" data-action="rename">이름 변경</button><button class="context-menu-item" data-action="delete">삭제</button>;
    } else { // session
        const session = state.localChatSessionsCache.find(s => s.id === id);
        if(!session) return;
        let moveToSubMenuHTML = state.localProjectsCache.map(p => <button class="context-menu-item" data-project-id="" ></button>).join('');
        content = 
            <button class="context-menu-item" data-action="rename">이름 변경</button>
            <div class="context-submenu-container">
                <button class="context-menu-item"><span>프로젝트로 이동</span><span class="submenu-arrow">▶</span></button>
                <div class="context-submenu">
                    <button class="context-menu-item" data-project-id="null" >[일반 대화로 이동]</button>
                    
                </div>
            </div>
            <button class="context-menu-item" data-action="pin"></button>
            <div class="context-menu-separator"></div>
            <button class="context-menu-item" data-action="delete">삭제</button>
        ;
    }
    menu.innerHTML = content;
    document.body.appendChild(menu);
    const rect = dom.body.getBoundingClientRect();
    menu.style.top = ${Math.min(event.clientY, rect.height - menu.offsetHeight)}px;
    menu.style.left = ${Math.min(event.clientX, rect.width - menu.offsetWidth)}px;
    menu.style.display = 'block';

    menu.addEventListener('click', e => {
        e.stopPropagation();
        const target = e.target.closest('.context-menu-item');
        if (!target || target.disabled) return;
        const action = target.dataset.action;
        const projectId = target.dataset.projectId;
        
        if (type === 'project') {
            if (action === 'rename') startProjectRename(id);
            if (action === 'delete') deleteProject(id);
        } else {
            if (action === 'rename') startSessionRename(id);
            else if (action === 'pin') toggleChatPin(id);
            else if (action === 'delete') handleDeleteSession(id);
            else if (projectId !== undefined) moveSessionToProject(id, projectId === 'null' ? null : projectId);
        }
        if (state.currentOpenContextMenu) state.currentOpenContextMenu.remove();
    });
    setState('currentOpenContextMenu', menu);
}


export function initializeSidebar() {
    dom.searchSessionsInput.addEventListener('input', renderSidebarContent);
    dom.sessionListContainer.addEventListener('click', e => {
        const sessionItem = e.target.closest('.session-item');
        if (sessionItem && !e.target.closest('.session-pin-btn')) { selectSession(sessionItem.dataset.sessionId); return; }
        if (e.target.closest('.session-pin-btn')) { toggleChatPin(sessionItem.dataset.sessionId); return; }
        
        const projectHeader = e.target.closest('.project-header');
        if (projectHeader) {
            const projectId = projectHeader.closest('.project-container').dataset.projectId;
            if (e.target.closest('.project-actions-btn')) { showContextMenu('project', projectId, e); }
            else if (!e.target.closest('input')) { toggleProjectExpansion(projectId); }
        }
    });

    dom.sessionListContainer.addEventListener('contextmenu', e => {
        const sessionItem = e.target.closest('.session-item');
        if (sessionItem) showContextMenu('session', sessionItem.dataset.sessionId, e);
    });

    document.addEventListener('click', e => {
        if (!e.target.closest('.project-context-menu, .session-context-menu')) {
            if (state.currentOpenContextMenu) state.currentOpenContextMenu.remove();
        }
    });

    // Drag and Drop
    let draggedItem = null;
    dom.sessionListContainer.addEventListener('dragstart', e => {
        if (e.target.classList.contains('session-item')) {
            draggedItem = e.target;
            setTimeout(() => e.target.classList.add('is-dragging'), 0);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedItem.dataset.sessionId);
        } else { e.preventDefault(); }
    });
    dom.sessionListContainer.addEventListener('dragend', () => { if(draggedItem) { draggedItem.classList.remove('is-dragging'); draggedItem = null; } document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => el.classList.remove('drag-over', 'drag-target-area')); });
    dom.sessionListContainer.addEventListener('dragover', e => {
        e.preventDefault();
        const targetProjectHeader = e.target.closest('.project-header');
        document.querySelectorAll('.project-header.drag-over').forEach(el => el.classList.remove('drag-over'));
        if (!draggedItem) return;
        if(targetProjectHeader) { targetProjectHeader.classList.add('drag-over'); e.dataTransfer.dropEffect = 'move'; } else { e.dataTransfer.dropEffect = 'none'; }
    });
    dom.sessionListContainer.addEventListener('drop', async e => {
        e.preventDefault();
        document.querySelectorAll('.project-header.drag-over').forEach(el => el.classList.remove('drag-over'));
        if (!draggedItem) return;
        const sessionId = e.dataTransfer.getData('text/plain');
        const targetProjectHeader = e.target.closest('.project-header');
        if (targetProjectHeader) {
            const targetProjectId = targetProjectHeader.closest('.project-container').dataset.projectId;
            await moveSessionToProject(sessionId, targetProjectId);
        }
    });
}
