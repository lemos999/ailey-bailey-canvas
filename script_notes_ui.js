/*
--- Ailey & Bailey Canvas ---
File: script_notes_ui.js
Version: 16.0 (Notes UI Overhaul Complete)
Architect: [Username] & System Architect Ailey
Description: Handles all UI rendering logic for the Notes App, including the dynamic action bar, note lists, and context menus.
*/

// --- 3. Function Definitions (Notes UI Management) ---

/**
 * 노트 목록 전체 뷰를 렌더링합니다. 액션 바, 검색창, 그리고 노트와 폴더 목록을 포함합니다.
 */
function renderNoteList() {
    if (!noteListView) return;

    // Build the static action bar and list container structure
    const actionBarHTML = `
        <div class="action-bar">
            <div class="action-bar-group left">
                <button id="add-new-note-btn-dynamic" class="notes-btn" title="새 메모"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg></button>
                <button id="add-new-note-project-btn-dynamic" class="notes-btn" title="새 폴더"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M13,13H11V10H8V8H11V5H13V8H16V10H13V13Z"/></svg></button>
            </div>
            <div class="action-bar-group center">
                <input type="text" id="search-input-dynamic" class="search-input-notes" placeholder="메모 검색...">
            </div>
            <div class="action-bar-group right">
                <div class="more-options-container">
                    <button id="more-options-btn" class="more-options-btn" title="더 보기"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" /></svg></button>
                    <div id="notes-dropdown-menu" class="dropdown-menu">
                        <button class="dropdown-item" data-action="export-all"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"></path></svg><span>데이터 백업</span></button>
                        <button class="dropdown-item" data-action="import-all"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19.35,10.04C18.67,6.59 15.64,4 12,4C9.11,4 6.6,5.64 5.35,8.04C2.34,8.36 0,10.91 0,14A6,6 0 0,0 6,20H19A5,5 0 0,0 19.35,10.04Z"></path></svg><span>데이터 복원</span></button>
                        <div class="dropdown-separator"></div>
                        <button class="dropdown-item" data-action="system-reset" style="color: #d9534f;"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,4C14.12,4 16.16,4.73 17.89,6.03L16.83,7.09C15.5,6.07 13.83,5.5 12,5.5C8.96,5.5 6.5,7.96 6.5,11H8.5C8.5,9.07 10.07,7.5 12,7.5C12.86,7.5 13.65,7.81 14.29,8.34L13.23,9.4L17.5,10.5L16.4,6.23L15.34,7.29C14.37,6.46 13.23,6 12,6C9.24,6 7,8.24 7,11V11.5H5V11C5,7.13 8.13,4 12,4M12,18C9.88,18 7.84,17.27 6.11,15.97L7.17,14.91C8.5,15.93 10.17,16.5 12,16.5C15.04,16.5 17.5,14.04 17.5,11H15.5C15.5,12.93 13.93,14.5 12,14.5C11.14,14.5 10.35,14.19 9.71,13.66L10.77,12.6L6.5,11.5L7.6,15.77L8.66,14.71C9.63,15.54 10.77,16 12,16C14.76,16 17,13.76 17,11V10.5H19V11C19,14.87 15.87,18 12,18Z" /></svg><span>시스템 초기화</span></button>
                    </div>
                </div>
            </div>
        </div>
    `;
    const notesListContainerHTML = `<div id="notes-list"></div>`;
    noteListView.innerHTML = actionBarHTML + notesListContainerHTML;

    // Populate the dynamic list part
    const searchInput = document.getElementById('search-input-dynamic');
    const term = searchInput.value.toLowerCase();
    const filteredNotes = localNotesCache.filter(n => term ? ((n.title||'').toLowerCase().includes(term) || (n.content||'').toLowerCase().includes(term)) : true);

    const notesListContainer = document.getElementById('notes-list');
    const fragment = document.createDocumentFragment();

    const pinnedNotes = filteredNotes.filter(n => n.isPinned);
    const unpinnedNotes = filteredNotes.filter(n => !n.isPinned);

    // Render pinned notes first
    if (pinnedNotes.length > 0) {
        const pinnedHeader = document.createElement('div');
        pinnedHeader.className = 'note-group-header';
        pinnedHeader.textContent = '📌 고정된 메모';
        fragment.appendChild(pinnedHeader);
        pinnedNotes
            .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0))
            .forEach(note => fragment.appendChild(createNoteItem(note)));
    }

    // Render projects and notes within them
    localNoteProjectsCache
        .sort((a,b) => a.name.localeCompare(b.name, 'ko'))
        .forEach(project => {
            const notesInProject = unpinnedNotes.filter(n => n.projectId === project.id);
            // If searching, hide empty projects unless the project name itself matches
            if (term && !project.name.toLowerCase().includes(term) && notesInProject.length === 0) return;

            const projectContainer = document.createElement('div');
            projectContainer.className = 'note-project-container';
            projectContainer.dataset.projectId = project.id;
            projectContainer.innerHTML = `
                <div class="note-project-header">
                    <span class="note-project-toggle-icon ${project.isExpanded !== false ? 'expanded' : ''}"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" /></svg></span>
                    <span class="note-project-icon"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2Z" /></svg></span>
                    <span class="note-project-title">${project.name}</span>
                    <span class="note-count">(${localNotesCache.filter(n => n.projectId === project.id).length})</span>
                </div>
                <div class="notes-in-project ${project.isExpanded !== false ? 'expanded' : ''}"></div>
            `;
            const notesContainer = projectContainer.querySelector('.notes-in-project');
            notesInProject
                .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0))
                .forEach(note => notesContainer.appendChild(createNoteItem(note)));
            fragment.appendChild(projectContainer);
        });

    // Render unassigned notes
    const unassignedNotes = unpinnedNotes.filter(n => !n.projectId);
    if (unassignedNotes.length > 0) {
        const generalHeader = document.createElement('div');
        generalHeader.className = 'note-group-header';
        generalHeader.textContent = '일반 메모';
        fragment.appendChild(generalHeader);
        unassignedNotes
            .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0))
            .forEach(note => fragment.appendChild(createNoteItem(note)));
    }

    if (fragment.children.length === 0 && term) {
        notesListContainer.innerHTML = '<div>검색 결과가 없습니다.</div>';
    } else if (fragment.children.length === 0) {
        notesListContainer.innerHTML = '<div>표시할 메모가 없습니다.</div>';
    } else {
        notesListContainer.appendChild(fragment);
    }
}

/**
 * 단일 노트 아이템 DOM 요소를 생성합니다.
 * @param {object} noteData - 생성할 노트의 데이터 객체
 * @returns {HTMLElement} 생성된 노트 아이템 요소
 */
function createNoteItem(noteData) {
    const item = document.createElement('div');
    item.className = 'note-item';
    item.dataset.id = noteData.id;
    item.draggable = true;
    if (noteData.isPinned) item.classList.add('pinned');

    item.innerHTML = `
        <div class="note-item-title">${noteData.title || '무제 노트'}</div>
        <div class="note-item-date">${noteData.updatedAt?.toDate().toLocaleString('ko-KR',{dateStyle:'short',timeStyle:'short'})||'날짜 없음'}</div>
    `;
    return item;
}

/**
 * 지정된 타겟에 대한 컨텍스트 메뉴를 표시합니다.
 * @param {HTMLElement} target - 컨텍스트 메뉴를 트리거한 요소
 * @param {MouseEvent} event - 컨텍스트 메뉴 이벤트 객체
 */
function showContextMenu(target, event) {
    event.preventDefault();
    removeContextMenu(); // Close any existing menu

    const noteItem = target.closest('.note-item');
    const projectHeader = target.closest('.note-project-header');
    
    let menu;
    if (noteItem) {
        menu = createNoteContextMenu(noteItem.dataset.id);
    } else if (projectHeader) {
        menu = createProjectContextMenu(projectHeader.closest('.note-project-container').dataset.projectId);
    } else {
        return;
    }

    document.body.appendChild(menu);
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const bodyWidth = document.body.clientWidth;
    const bodyHeight = document.body.clientHeight;
    // Position menu intelligently within viewport
    menu.style.left = `${event.clientX + menuWidth > bodyWidth ? event.clientX - menuWidth : event.clientX}px`;
    menu.style.top = `${event.clientY + menuHeight > bodyHeight ? event.clientY - menuHeight : event.clientY}px`;
    menu.style.display = 'block';
    currentOpenContextMenu = menu;
}


/**
 * 노트에 대한 컨텍스트 메뉴 DOM 요소를 생성합니다.
 * @param {string} noteId - 컨텍스트 메뉴를 생성할 노트의 ID
 * @returns {HTMLElement|undefined} 생성된 메뉴 요소 또는 노트가 없을 경우 undefined
 */
function createNoteContextMenu(noteId) {
    const note = localNotesCache.find(n => n.id === noteId);
    if (!note) return;

    const menu = document.createElement('div');
    menu.className = 'note-context-menu';

    // Build submenu for moving the note
    let moveToSubMenuHTML = localNoteProjectsCache
        .sort((a,b) => a.name.localeCompare(b.name, 'ko'))
        .map(p => `<button class="context-menu-item" data-action="move-to" data-project-id="${p.id}" ${note.projectId === p.id ? 'disabled' : ''}><span class="icon">📁</span><span>${p.name}</span></button>`).join('');

    if (note.projectId) { // If note is in a project, add an option to move it out
        moveToSubMenuHTML = `<button class="context-menu-item" data-action="move-to" data-project-id="null"><span class="icon">⏏️</span><span>[일반 메모로 이동]</span></button><div class="context-menu-separator"></div>${moveToSubMenuHTML}`;
    }

    menu.innerHTML = `
        <button class="context-menu-item" data-action="rename"><span class="icon">✏️</span><span>이름 변경</span></button>
        <button class="context-menu-item" data-action="pin"><span class="icon">${note.isPinned ? '📌' : '📌'}</span><span>${note.isPinned ? '고정 해제' : '고정하기'}</span></button>
        <div class="context-submenu-container">
            <button class="context-menu-item"><span class="icon">📂</span><span>폴더로 이동</span><span class="submenu-arrow">▶</span></button>
            <div class="context-submenu">${moveToSubMenuHTML}</div>
        </div>
        <div class="context-menu-separator"></div>
        <button class="context-menu-item" data-action="delete" style="color: #d9534f;"><span class="icon">🗑️</span><span>삭제</span></button>
        <div class="context-menu-separator"></div>
        <div class="context-meta-info">수정: ${note.updatedAt?.toDate().toLocaleDateString('ko-KR') || 'N/A'}</div>
    `;
    
    // Actions are handled by the controller in _app.js
    return menu;
}

/**
 * 노트 프로젝트(폴더)에 대한 컨텍스트 메뉴 DOM 요소를 생성합니다.
 * @param {string} projectId - 컨텍스트 메뉴를 생성할 프로젝트의 ID
 * @returns {HTMLElement|undefined} 생성된 메뉴 요소 또는 프로젝트가 없을 경우 undefined
 */
function createProjectContextMenu(projectId) {
    const project = localNoteProjectsCache.find(p => p.id === projectId);
    if (!project) return;

    const menu = document.createElement('div');
    menu.className = 'note-context-menu';
    menu.innerHTML = `
        <button class="context-menu-item" data-action="rename"><span class="icon">✏️</span><span>이름 변경</span></button>
        <div class="context-menu-separator"></div>
        <button class="context-menu-item" data-action="delete" style="color: #d9534f;"><span class="icon">🗑️</span><span>삭제</span></button>
    `;
    
    // Actions are handled by the controller in _app.js
    return menu;
}