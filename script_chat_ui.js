/*
--- Ailey & Bailey Canvas ---
File: script_chat_ui.js
Version: 12.0 (Modular JS Refactor)
Architect: [Username] & System Architect Ailey
Description: Handles all UI rendering logic for the chat application's sidebar, including projects, sessions, and context menus.
*/

// --- 3. Function Definitions (Chat UI Management) ---

/**
 * 프로젝트와 세션 목록을 포함하는 전체 사이드바를 렌더링합니다.
 * 검색어와 정렬 순서를 고려하여 동적으로 UI를 생성합니다.
 */
export function renderSidebarContent() {
    if (!sessionListContainer) return;
    const searchTerm = searchSessionsInput.value.toLowerCase();
    sessionListContainer.innerHTML = ''; 
    const fragment = document.createDocumentFragment();

    // Filter and sort projects
    const projectsToDisplay = localProjectsCache
        .filter(p => searchTerm ? p.name?.toLowerCase().includes(searchTerm) || localChatSessionsCache.some(s => s.projectId === p.id && (s.title || '').toLowerCase().includes(searchTerm)) : true)
        .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));

    // Render projects if any exist
    if (projectsToDisplay.length > 0) {
        const projectGroupHeader = document.createElement('div');
        projectGroupHeader.className = 'session-group-header';
        projectGroupHeader.textContent = '📁 프로젝트';
        fragment.appendChild(projectGroupHeader);

        projectsToDisplay.forEach(project => {
            fragment.appendChild(createProjectContainer(project, searchTerm));
        });
    }

    // Filter unassigned sessions
    const unassignedSessions = localChatSessionsCache
        .filter(s => !s.projectId)
        .filter(s => searchTerm ? (s.title || '새 대화').toLowerCase().includes(searchTerm) : true);

    // Render unassigned sessions if any exist
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

/**
 * 단일 프로젝트 컨테이너 DOM 요소를 생성합니다.
 * @param {object} project - 프로젝트 데이터 객체
 * @param {string} searchTerm - 현재 검색어 (내부 세션 필터링용)
 * @returns {HTMLElement} 생성된 프로젝트 컨테이너 요소
 */
export function createProjectContainer(project, searchTerm) {
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
    
    localChatSessionsCache
        .filter(s => s.projectId === project.id)
        .filter(s => searchTerm ? (s.title || '새 대화').toLowerCase().includes(searchTerm) : true)
        .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0))
        .forEach(session => sessionsContainer.appendChild(createSessionItem(session)));

    projectContainer.appendChild(projectHeader);
    projectContainer.appendChild(sessionsContainer);
    return projectContainer;
}


/**
 * 단일 세션 아이템 DOM 요소를 생성합니다.
 * @param {object} session - 세션 데이터 객체
 * @returns {HTMLElement} 생성된 세션 아이템 요소
 */
export function createSessionItem(session) {
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

/**
 * 모든 컨텍스트 메뉴를 닫습니다.
 */
export function removeContextMenu() {
    currentOpenContextMenu?.remove();
    currentOpenContextMenu = null;
}

/**
 * 프로젝트에 대한 컨텍스트 메뉴를 표시합니다.
 * @param {string} projectId - 컨텍스트 메뉴를 표시할 프로젝트의 ID
 * @param {HTMLElement} buttonElement - 메뉴를 트리거한 버튼 요소
 */
export function showProjectContextMenu(projectId, buttonElement) {
    removeContextMenu();
    const rect = buttonElement.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'project-context-menu'; 
    menu.style.position = 'absolute';
    menu.style.top = `${rect.bottom + 2}px`;
    menu.style.right = '5px';
    menu.innerHTML = `
        <button class="context-menu-item" data-action="rename">이름 변경</button>
        <button class="context-menu-item" data-action="delete">삭제</button>
    `;
    
    if (sessionListContainer) {
        sessionListContainer.appendChild(menu);
        menu.style.display = 'block';
        currentOpenContextMenu = menu;

        // Use a one-time event listener for actions
        menu.addEventListener('click', (e) => {
            e.stopPropagation();
            const target = e.target.closest('button');
            if(!target) return;
            const action = target.dataset.action;
            if (action === 'rename') {
                startProjectRename(projectId); // This function is in _app.js as it deals with UI state change
            } else if (action === 'delete') {
                deleteProject(projectId); // This function is in _data.js
            }
            removeContextMenu();
        }, { once: true });
    }
}

/**
 * 세션에 대한 컨텍스트 메뉴를 표시합니다.
 * @param {string} sessionId - 컨텍스트 메뉴를 표시할 세션의 ID
 * @param {number} x - 메뉴를 표시할 x 좌표
 * @param {number} y - 메뉴를 표시할 y 좌표
 */
export function showSessionContextMenu(sessionId, x, y) {
    const session = localChatSessionsCache.find(s => s.id === sessionId);
    if (!session) return;
    removeContextMenu();
    
    const menu = document.createElement('div');
    menu.className = 'session-context-menu';
    
    let moveToSubMenuHTML = localProjectsCache
        .sort((a,b) => (a.name > b.name) ? 1 : -1)
        .map(p => `<button class="context-menu-item" data-project-id="${p.id}" ${session.projectId === p.id ? 'disabled' : ''}>${p.name}</button>`).join('');
    
    const moveToMenu = `
        <div class="context-submenu-container">
            <button class="context-menu-item" data-action="move-to"><span>프로젝트로 이동</span><span class="submenu-arrow">▶</span></button>
            <div class="context-submenu">
                <button class="context-menu-item" data-project-id="null" ${!session.projectId ? 'disabled' : ''}>[일반 대화로 이동]</button>
                ${moveToSubMenuHTML ? '<div class="context-menu-separator"></div>' + moveToSubMenuHTML : ''}
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
        <div class="context-menu-item disabled" style="font-size:0.8em; opacity: 0.6;">생성: ${createdAt}</div>
        <div class="context-menu-item disabled" style="font-size:0.8em; opacity: 0.6;">수정: ${updatedAt}</div>
    `;
    
    document.body.appendChild(menu);
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const bodyWidth = document.body.clientWidth;
    const bodyHeight = document.body.clientHeight;
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
        
        // Don't close if hovering over a submenu container that has its own submenu
        if (!target.closest('.context-submenu-container')) {
            removeContextMenu();
        }
    });
}

/**
 * AI 모델 선택 드롭다운 메뉴를 현재 API 설정에 맞게 업데이트합니다.
 */
export function updateChatHeaderModelSelector() {
    if (!aiModelSelector) return;
    const DEFAULT_MODELS = [
        { value: 'gemini-2.5-flash-preview-04-17', text: '⚡️ Gemini 2.5 Flash (최신)' },
        { value: 'gemini-2.0-flash', text: '💡 Gemini 2.0 Flash (안정)' }
    ];
    aiModelSelector.innerHTML = '';

    // If using a personal API key
    if (userApiSettings.provider && userApiSettings.apiKey) {
        const models_to_show = userApiSettings.availableModels || [];
        // Ensure the currently selected model is in the list even if `availableModels` is empty
        if(models_to_show.length === 0 && userApiSettings.selectedModel) {
            models_to_show.push(userApiSettings.selectedModel);
        }
        
        models_to_show.forEach(modelId => {
            const option = document.createElement('option');
            option.value = modelId;
            option.textContent = `[개인] ${modelId}`;
            aiModelSelector.appendChild(option);
        });
        
        aiModelSelector.value = userApiSettings.selectedModel;
        aiModelSelector.title = `${userApiSettings.provider} 모델을 선택합니다. (개인 키 사용 중)`;
    } else { // If using default models
        DEFAULT_MODELS.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.text;
            aiModelSelector.appendChild(option);
        });
        const savedDefaultModel = localStorage.getItem('selectedAiModel') || defaultModel;
        aiModelSelector.value = savedDefaultModel;
        aiModelSelector.title = 'AI 모델을 선택합니다.';
    }
}