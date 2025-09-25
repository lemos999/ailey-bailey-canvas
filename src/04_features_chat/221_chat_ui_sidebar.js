/* --- Ailey & Bailey Canvas --- */
// File: 221_chat_ui_sidebar.js
// Version: 4.3 (Temporary Chat in Panel)
// Description: Renders the temporary chat session item in the sidebar.

function renderSidebarContent() {
    if (!sessionListContainer) return;
    const searchTerm = searchSessionsInput.value.toLowerCase();
    sessionListContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();

    // [NEW] Render Temporary Chat session if it's the current one
    if (currentSessionId === 'temporary-chat') {
        fragment.appendChild(createSessionItem({ id: 'temporary-chat', title: '임시 채팅' }));
    }

    const projectsToDisplay = localProjectsCache
        .filter(p => searchTerm ? p.name?.toLowerCase().includes(searchTerm) || localChatSessionsCache.some(s => s.projectId === p.id && (s.title || '').toLowerCase().includes(searchTerm)) : true)
        .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
    if (projectsToDisplay.length > 0) {
        const projectGroupHeader = document.createElement('div');
        projectGroupHeader.className = 'session-group-header';
        projectGroupHeader.textContent = '📁 프로젝트';
        fragment.appendChild(projectGroupHeader);
        projectsToDisplay.forEach(project => {
            fragment.appendChild(createProjectContainer(project, searchTerm));
        });
    }
    const unassignedSessions = localChatSessionsCache
        .filter(s => !s.projectId)
        .filter(s => searchTerm ? (s.title || '새 대화').toLowerCase().includes(searchTerm) : true);
    if (unassignedSessions.length > 0) {
        const generalGroupHeader = document.createElement('div');
        generalGroupHeader.className = 'session-group-header';
        generalGroupHeader.textContent = '💬 일반 대화';
        fragment.appendChild(generalGroupHeader);
        const groupedSessions = unassignedSessions.reduce((acc, session) => {
            const groupInfo = getRelativeDateGroup(session.updatedAt || session.createdAt, session.isPinned);
            if (!acc[groupInfo.label]) {
                acc[groupInfo.label] = { key: groupInfo.key, items: [] };
            }
            acc[groupInfo.label].items.push(session);
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

function createProjectContainer(project, searchTerm) {
    const projectContainer = document.createElement('div');
    projectContainer.className = 'project-container';
    projectContainer.dataset.projectId = project.id;
    const projectHeader = document.createElement('div');
    projectHeader.className = 'project-header';
    const createdAt = project.createdAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) || '정보 없음';
    const updatedAt = project.updatedAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) || createdAt;
    projectHeader.title = `생성: ${createdAt}\n최종 수정: ${updatedAt}`;
    projectHeader.innerHTML = `
        <svg class="project-toggle-icon ${project.isExpanded ? 'expanded' : ''}" viewBox="0 0 24 24" width="16" height="16"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" /></svg>
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
    localChatSessionsCache
        .filter(s => s.projectId === project.id)
        .filter(s => searchTerm ? (s.title || '새 대화').toLowerCase().includes(searchTerm) : true)
        .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0))
        .forEach(session => sessionsContainer.appendChild(createSessionItem(session)));
    projectContainer.appendChild(projectHeader);
    projectContainer.appendChild(sessionsContainer);
    return projectContainer;
}

function createSessionItem(session) {
    const item = document.createElement('div');
    item.className = 'session-item';
    item.dataset.sessionId = session.id;

    if (session.id === 'temporary-chat') {
        item.classList.add('temporary');
    } else {
        item.draggable = true;
    }

    if (session.id === currentSessionId) item.classList.add('active');

    if (session.createdAt) {
      const createdAt = session.createdAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) || '정보 없음';
      const updatedAt = session.updatedAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) || createdAt;
      item.title = `생성: ${createdAt}\n최종 수정: ${updatedAt}`;
    }
    
    const titleSpan = document.createElement('div');
    titleSpan.className = 'session-item-title';
    titleSpan.textContent = session.title || '새 대화';
    item.appendChild(titleSpan);

    if (pendingResponses.has(session.id) || (activeStreams[session.id] && !activeStreams[session.id].isComplete)) {
        const indicator = document.createElement('span');
        indicator.className = 'status-indicator';
        item.appendChild(indicator);
    } else if (completedButUnseenResponses.has(session.id)) {
        const indicator = document.createElement('span');
        indicator.className = 'status-indicator-complete';
        item.appendChild(indicator);
    }

    return item;
}