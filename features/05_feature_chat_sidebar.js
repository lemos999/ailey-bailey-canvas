/* --- FILE: /scripts/features/05_feature_chat_sidebar.js --- */
function listenToProjects() {
    return new Promise((resolve) => {
        if (!projectsCollectionRef) return resolve();
        if (unsubscribeFromProjects) unsubscribeFromProjects();
        unsubscribeFromProjects = projectsCollectionRef.onSnapshot(snapshot => {
            const oldCache = [...localProjectsCache];
            localProjectsCache = snapshot.docs.map(doc => ({
                id: doc.id,
                isExpanded: oldCache.find(p => p.id === doc.id)?.isExpanded ?? true,
                ...doc.data()
            }));
            
            renderSidebarContent();

            if (newlyCreatedProjectId) {
                const newProjectElement = document.querySelector(`.project-container[data-project-id="${newlyCreatedProjectId}"]`);
                if (newProjectElement) {
                    startProjectRename(newlyCreatedProjectId);
                    newlyCreatedProjectId = null;
                }
            }

            resolve();
        }, error => {
            console.error("Project listener error:", error);
            resolve();
        });
    });
}

function getNewProjectDefaultName() {
    const baseName = "새 프로젝트";
    const existingNames = new Set(localProjectsCache.map(p => p.name));
    if (!existingNames.has(baseName)) {
        return baseName;
    }
    let i = 2;
    while (existingNames.has(`${baseName} ${i}`)) {
        i++;
    }
    return `${baseName} ${i}`;
}

async function createNewProject() {
    const newName = getNewProjectDefaultName();
    try {
        const newProjectRef = await projectsCollectionRef.add({
            name: newName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        newlyCreatedProjectId = newProjectRef.id;
    } catch (error) {
        console.error("Error creating new project:", error);
        alert("프로젝트 생성에 실패했습니다.");
    }
}

async function renameProject(projectId, newName) {
    if (!newName || !newName.trim() || !projectId) return;
    try {
        await projectsCollectionRef.doc(projectId).update({ 
            name: newName.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error renaming project:", error);
        alert("프로젝트 이름 변경에 실패했습니다.");
    }
}

async function deleteProject(projectId) {
    const project = localProjectsCache.find(p => p.id === projectId);
    if (!project) return;

    const message = `프로젝트 '${project.name}'를 삭제하시겠습니까? 프로젝트 안의 모든 대화는 '일반 대화'로 이동됩니다.`;
    showModal(message, async () => {
        try {
            const batch = db.batch();
            
            const sessionsToMove = localChatSessionsCache.filter(s => s.projectId === projectId);
            sessionsToMove.forEach(session => {
                const sessionRef = chatSessionsCollectionRef.doc(session.id);
                batch.update(sessionRef, { projectId: null });
            });

            const projectRef = projectsCollectionRef.doc(projectId);
            batch.delete(projectRef);

            await batch.commit();
        } catch (error) {
            console.error("Error deleting project:", error);
            alert("프로젝트 삭제에 실패했습니다.");
        }
    });
}

function toggleProjectExpansion(projectId) {
    const project = localProjectsCache.find(p => p.id === projectId);
    if (project) {
        project.isExpanded = !project.isExpanded;
        renderSidebarContent();
    }
}

function removeContextMenu() {
    currentOpenContextMenu?.remove();
    currentOpenContextMenu = null;
}

function showProjectContextMenu(projectId, buttonElement) {
    removeContextMenu();
    const rect = buttonElement.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'project-context-menu'; 
    menu.style.position = 'absolute';
    menu.style.top = `${rect.bottom + 2}px`;
    menu.style.right = '5px';
    menu.innerHTML = `
        <button data-action="rename">이름 변경</button>
        <button data-action="delete">삭제</button>
    `;
    
    sessionListContainer.appendChild(menu);
    menu.style.display = 'block';
    currentOpenContextMenu = menu;

    menu.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = e.target.dataset.action;
        if (action === 'rename') {
            startProjectRename(projectId);
        } else if (action === 'delete') {
            deleteProject(projectId);
        }
        removeContextMenu();
    });
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
        }
         renderSidebarContent();
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

function renderSidebarContent() {
    if (!sessionListContainer) return;
    const searchTerm = searchSessionsInput.value.toLowerCase();
    sessionListContainer.innerHTML = ''; 

    const filteredProjects = localProjectsCache.filter(p => p.name?.toLowerCase().includes(searchTerm));
    const filteredSessions = localChatSessionsCache.filter(s => (s.title || '새 대화').toLowerCase().includes(searchTerm));

    const fragment = document.createDocumentFragment();

    if (filteredProjects.length > 0 || localProjectsCache.length > 0) {
        const projectGroupHeader = document.createElement('div');
        projectGroupHeader.className = 'session-group-header';
        projectGroupHeader.textContent = '📁 프로젝트';
        fragment.appendChild(projectGroupHeader);

        const sortedProjects = [...(searchTerm ? filteredProjects : localProjectsCache)].sort((a, b) => {
             const timeA = a.updatedAt?.toMillis() || 0;
             const timeB = b.updatedAt?.toMillis() || 0;
             return timeB - timeA;
        });

        sortedProjects.forEach(project => {
            const sessionsInProject = localChatSessionsCache
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

    sessionListContainer.appendChild(fragment);
}

function createSessionItem(session) {
    const item = document.createElement('div');
    item.className = 'session-item';
    item.dataset.sessionId = session.id;
    item.draggable = true;
    if (session.id === currentSessionId) item.classList.add('active');
    
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

function showSessionContextMenu(sessionId, x, y) {
    const session = localChatSessionsCache.find(s => s.id === sessionId);
    if (!session) return;
    removeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'session-context-menu'; 
    let moveToSubMenuHTML = localProjectsCache.map(p => `<button class="context-menu-item" data-project-id="${p.id}" ${session.projectId === p.id ? 'disabled' : ''}>${p.name}</button>`).join('');
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
    currentOpenContextMenu = menu;
    menu.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = e.target.closest('.context-menu-item');
        if (!target || target.disabled) return;
        const action = target.dataset.action;
        const projectId = target.dataset.projectId;
        if (action === 'rename') { startSessionRename(sessionId); }
        else if (action === 'pin') { toggleChatPin(sessionId); }
        else if (action === 'delete') { handleDeleteSession(sessionId); }
        else if (projectId !== undefined) { moveSessionToProject(sessionId, projectId === 'null' ? null : projectId); }
        removeContextMenu();
    });
}