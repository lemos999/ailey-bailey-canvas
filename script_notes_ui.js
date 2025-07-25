/*
--- Ailey & Bailey Canvas ---
File: script_notes_ui.js
Version: 15.0 (UI/UX Revamp)
Architect: [Username] & System Architect Ailey
Description: Handles all UI rendering logic for the Notes App, including the new card-based list/grid view.
*/

/**
 * Generates a short text snippet from note content, stripping HTML.
 * @param {string} content - The HTML content of the note.
 * @param {number} length - The desired length of the snippet.
 * @returns {string} A plain text snippet.
 */
function generateSnippet(content, length = 100) {
    if (!content) return '';
    // Strip HTML tags and decode HTML entities
    const text = content.replace(/<[^>]*>/g, ' ');
    const decodedText = new DOMParser().parseFromString(text, 'text/html').documentElement.textContent;
    return decodedText.trim().substring(0, length) + (decodedText.length > length ? '...' : '');
}


/**
 * [REWRITTEN] Renders the entire note list view, including the new action bar and card-based layout.
 */
function renderNoteList() {
    if (!noteListView) return;

    const searchInputValue = noteListView.querySelector('#search-input-dynamic')?.value || '';

    // Build the new action bar
    const actionBarHTML = `
        <div class="action-bar">
            <div class="action-bar-group">
                <button id="add-new-note-btn-dynamic" class="notes-btn" title="새 메모"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg></button>
                <button id="add-new-note-project-btn-dynamic" class="notes-btn" title="새 폴더"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M13,13H11V10H8V8H11V5H13V8H16V10H13V13Z"/></svg></button>
            </div>
            <div class="action-bar-group center">
                <input type="text" id="search-input-dynamic" class="search-input-notes" placeholder="메모 검색..." value="${searchInputValue}">
            </div>
            <div class="action-bar-group">
                <button class="view-toggle-btn ${currentNoteViewMode === 'grid' ? 'active' : ''}" data-view="grid" title="그리드 뷰">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3,11H11V3H3M3,21H11V13H3M13,21H21V13H13M13,3V11H21V3" /></svg>
                </button>
                <button class="view-toggle-btn ${currentNoteViewMode === 'list' ? 'active' : ''}" data-view="list" title="리스트 뷰">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3,4H21V6H3V4M3,11H21V13H3V11M3,18H21V20H3V18Z" /></svg>
                </button>
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
    const notesListContainerHTML = `<div id="notes-list-container"></div>`;
    noteListView.innerHTML = actionBarHTML + notesListContainerHTML;

    // Populate the dynamic list part
    const term = noteListView.querySelector('#search-input-dynamic').value.toLowerCase();
    const filteredNotes = localNotesCache.filter(n => term ? ((n.title||'').toLowerCase().includes(term) || (n.content||'').toLowerCase().includes(term)) : true);
    
    const container = noteListView.querySelector('#notes-list-container');
    const fragment = document.createDocumentFragment();

    const pinnedNotes = filteredNotes.filter(n => n.isPinned);
    const unpinnedNotes = filteredNotes.filter(n => !n.isPinned);
    
    const notesInProjects = {};
    localNoteProjectsCache.forEach(p => {
        notesInProjects[p.id] = unpinnedNotes.filter(n => n.projectId === p.id);
    });
    const unassignedNotes = unpinnedNotes.filter(n => !n.projectId);
    
    // Helper to render a group of notes
    const renderNoteGroup = (notes) => {
        const listEl = document.createElement('div');
        listEl.className = `notes-list ${currentNoteViewMode}-view`;
        notes.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0))
             .forEach(note => listEl.appendChild(createNoteCard(note)));
        return listEl;
    };

    // Render pinned notes first
    if (pinnedNotes.length > 0) {
        const header = document.createElement('div');
        header.className = 'note-group-header';
        header.textContent = '📌 고정된 메모';
        fragment.appendChild(header);
        fragment.appendChild(renderNoteGroup(pinnedNotes));
    }

    // Render projects and notes within them
    localNoteProjectsCache
        .sort((a,b) => a.name.localeCompare(b.name, 'ko'))
        .forEach(project => {
            const notesInProject = notesInProjects[project.id] || [];
            if (term && !project.name.toLowerCase().includes(term) && notesInProject.length === 0) return;

            const projectContainer = document.createElement('div');
            projectContainer.className = 'note-project-container';
            projectContainer.dataset.projectId = project.id;
            projectContainer.innerHTML = `
                <div class="note-project-header">
                    <span class="note-project-toggle-icon ${project.isExpanded !== false ? 'expanded' : ''}"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" /></svg></span>
                    <span class="note-project-title">${project.name}</span>
                    <span class="note-count">(${localNotesCache.filter(n => n.projectId === project.id).length})</span>
                </div>
                <div class="notes-in-project ${project.isExpanded !== false ? 'expanded' : ''}"></div>
            `;
            const notesContainer = projectContainer.querySelector('.notes-in-project');
            if (notesInProject.length > 0) {
                notesContainer.appendChild(renderNoteGroup(notesInProject));
            }
            fragment.appendChild(projectContainer);
        });

    // Render unassigned notes
    if (unassignedNotes.length > 0) {
        const header = document.createElement('div');
        header.className = 'note-group-header';
        header.textContent = '일반 메모';
        fragment.appendChild(header);
        fragment.appendChild(renderNoteGroup(unassignedNotes));
    }
    
    if (!fragment.hasChildNodes()) {
        container.innerHTML = `<div style="text-align:center; padding: 40px; opacity: 0.7;">${term ? '검색 결과가 없습니다.' : '표시할 메모가 없습니다.'}</div>`;
    } else {
        container.appendChild(fragment);
    }
}


/**
 * [NEW] Creates a single note card DOM element.
 * @param {object} noteData - The data object for the note.
 * @returns {HTMLElement} The generated note card element.
 */
function createNoteCard(noteData) {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.dataset.id = noteData.id;
    card.draggable = true;
    if (noteData.isPinned) card.classList.add('pinned');
    
    const pinIconSVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>';
    const deleteIconSVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z" /></svg>';

    const tagsHTML = (noteData.tags || []).map(tag => `<span class="note-tag">${tag}</span>`).join('');

    card.innerHTML = `
        <div class="note-card-content">
            <h4 class="note-card-title">${noteData.title || '무제 노트'}</h4>
            <p class="note-card-snippet">${generateSnippet(noteData.content)}</p>
        </div>
        <div class="note-card-footer">
            <div class="note-card-tags">${tagsHTML}</div>
            <span class="note-card-date">${noteData.updatedAt?.toDate().toLocaleString('ko-KR',{dateStyle:'short'}) || ''}</span>
        </div>
        <div class="note-card-actions">
            <button class="action-btn pin-btn ${noteData.isPinned ? 'pinned-active' : ''}" title="${noteData.isPinned ? '고정 해제' : '고정하기'}">${pinIconSVG}</button>
            <button class="action-btn delete-btn" title="삭제">${deleteIconSVG}</button>
        </div>
    `;
    return card;
}


/**
 * Shows the context menu for a given target (only projects are supported now).
 * @param {HTMLElement} target - The element that triggered the context menu.
 * @param {MouseEvent} event - The context menu event object.
 */
function showContextMenu(target, event) {
    event.preventDefault();
    removeContextMenu();

    const projectHeader = target.closest('.note-project-header');
    if (!projectHeader) return;
    
    const menu = createProjectContextMenu(projectHeader.closest('.note-project-container').dataset.projectId);
    if (!menu) return;

    document.body.appendChild(menu);
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const bodyWidth = document.body.clientWidth;
    const bodyHeight = document.body.clientHeight;
    menu.style.left = `${event.clientX + menuWidth > bodyWidth ? event.clientX - menuWidth : event.clientX}px`;
    menu.style.top = `${event.clientY + menuHeight > bodyHeight ? event.clientY - menuHeight : event.clientY}px`;
    menu.style.display = 'block';
    currentOpenContextMenu = menu;
}


/**
 * Creates the context menu DOM element for a note project.
 * @param {string} projectId - The ID of the project to create the menu for.
 * @returns {HTMLElement|undefined} The created menu element or undefined if project not found.
 */
function createProjectContextMenu(projectId) {
    const project = localNoteProjectsCache.find(p => p.id === projectId);
    if (!project) return;

    const menu = document.createElement('div');
    menu.className = 'note-context-menu';
    menu.innerHTML = `
        <button class="context-menu-item" data-action="rename-project"><span class="icon">✏️</span><span>이름 변경</span></button>
        <div class="context-menu-separator"></div>
        <button class="context-menu-item" data-action="delete-project" style="color: #d9534f;"><span class="icon">🗑️</span><span>삭제</span></button>
    `;
    
    menu.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = e.target.closest('.context-menu-item')?.dataset.action;
        if (action === 'rename-project') startNoteProjectRename(projectId);
        else if (action === 'delete-project') deleteNoteProject(projectId);
        removeContextMenu();
    });

    return menu;
}