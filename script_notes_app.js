/*
--- Ailey & Bailey Canvas ---
File: script_notes_app.js
Version: 15.0 (Advanced Editor Features)
Architect: [Username] & System Architect Ailey
Description: Implements WYSIWYG default, color syntax plugin, and a custom interactive HTML block component.
*/

let toastEditorInstance = null;
let htmlBlockCounter = 0; // To create unique IDs for HTML blocks

// --- 3.0: Panel & View Management ---
function ensureNotePanelHeader() {
    if (!notesAppPanel) return;
    let header = notesAppPanel.querySelector('.panel-header');
    if (!header) {
        header = document.createElement('div');
        header.className = 'panel-header';
        header.innerHTML = `
            <span>🗒️ 지식 발전소</span>
            <button class="close-btn" title="패널 닫기"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg></button>
        `;
        header.querySelector('.close-btn').addEventListener('click', () => togglePanel(notesAppPanel, false));
        notesAppPanel.prepend(header);
        makePanelDraggable(notesAppPanel);
    }
}

function switchView(view) {
    if (view === 'editor') {
        noteListView?.classList.remove('active');
        noteEditorView?.classList.add('active');
    } else {
        if (noteTitleInput && noteTitleInput.value.trim() === '' && currentNoteId) {
            const newTitle = generateTitleFromContent();
            if (newTitle) {
                notesCollectionRef.doc(currentNoteId).update({ title: newTitle });
            }
        }
        if (toastEditorInstance) {
            toastEditorInstance.destroy();
            toastEditorInstance = null;
        }
        noteEditorView?.classList.remove('active');
        noteListView?.classList.add('active');
        currentNoteId = null;
    }
}


// --- 3.1: Project/Folder Management (CRUD) ---
function getNewNoteProjectDefaultName() {
    const baseName = "새 폴더"; let i = 1; let newName = baseName;
    const existingNames = new Set(localNoteProjectsCache.map(p => p.name));
    while (existingNames.has(newName)) { newName = `${baseName} ${++i}`; }
    return newName;
}

async function createNewNoteProject() {
    if (!noteProjectsCollectionRef) return;
    try {
        const newProjectRef = await noteProjectsCollectionRef.add({
            name: getNewNoteProjectDefaultName(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        newlyCreatedNoteProjectId = newProjectRef.id;
    } catch (error) { console.error("Error creating new note project:", error); }
}

async function renameNoteProject(projectId, newName) {
    if (!newName?.trim() || !projectId || !noteProjectsCollectionRef) return;
    try { await noteProjectsCollectionRef.doc(projectId).update({ name: newName.trim(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); }
    catch (error) { console.error("Error renaming note project:", error); }
}

async function deleteNoteProject(projectId) {
    const project = localNoteProjectsCache.find(p => p.id === projectId);
    if (!project) return;
    showModal(`폴더 '${project.name}'를 삭제하시겠습니까? 폴더 안의 모든 메모는 '일반 메모'로 이동됩니다.`, async () => {
        try {
            const batch = db.batch();
            localNotesCache.filter(n => n.projectId === projectId).forEach(note => {
                batch.update(notesCollectionRef.doc(note.id), { projectId: null });
            });
            batch.delete(noteProjectsCollectionRef.doc(projectId));
            await batch.commit();
        } catch (error) { console.error("Error deleting note project:", error); }
    });
}

function startNoteProjectRename(projectId) {
    const titleSpan = document.querySelector(`.note-project-container[data-project-id="${projectId}"] .note-project-title`);
    if (!titleSpan) return;
    const originalTitle = titleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text'; input.className = 'note-project-title-input'; input.value = originalTitle;
    titleSpan.replaceWith(input);
    input.focus(); input.select();
    const finish = () => {
        const newName = input.value.trim();
        if (newName && newName !== originalTitle) renameNoteProject(projectId, newName);
        else renderNoteList();
        input.removeEventListener('blur', finish);
    };
    input.addEventListener('blur', finish);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); }});
}

function toggleNoteProjectExpansion(projectId) {
    const project = localNoteProjectsCache.find(p => p.id === projectId);
    if (project) { project.isExpanded = !project.isExpanded; renderNoteList(); }
}

// --- 3.2: Note Management (CRUD & More) ---
async function addNote(content = '') {
    if (!notesCollectionRef) return;
    try {
        const activeProject = document.querySelector('.note-project-header.active-drop-target');
        const projectId = activeProject ? activeProject.closest('.note-project-container').dataset.projectId : null;
        const ref = await notesCollectionRef.add({
            title: '',
            content,
            projectId,
            isPinned: false,
            tags: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        openNoteEditor(ref.id);
        if(noteTitleInput) noteTitleInput.focus();
    } catch (e) { console.error("새 메모 추가 실패:", e); }
}

function saveNote() {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (!currentNoteId || !notesCollectionRef || !toastEditorInstance) return;

    let titleValue = noteTitleInput.value.trim();
    // [MODIFIED] Get content as HTML from the WYSIWYG editor
    const contentValue = toastEditorInstance.getHTML();

    if (titleValue === '' && toastEditorInstance.getMarkdown().trim() !== '') {
        titleValue = generateTitleFromContent(toastEditorInstance.getMarkdown());
    }
    
    if (titleValue === '' && toastEditorInstance.getMarkdown().trim() === '') {
        titleValue = '무제 노트';
    }

    const data = {
        title: titleValue,
        content: contentValue,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    notesCollectionRef.doc(currentNoteId).update(data)
        .then(() => updateStatus('저장됨 ✓', true))
        .catch(e => { console.error("메모 저장 실패:", e); updateStatus('저장 실패 ❌', false); });
}

function deleteNote(noteId) {
    showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => {
        if (notesCollectionRef && noteId) {
            notesCollectionRef.doc(noteId).delete().catch(e => console.error("메모 삭제 실패:", e));
            if (currentNoteId === noteId) {
                switchView('list');
            }
        }
    });
}

async function renameNote(noteId, newTitle) {
    if (!newTitle?.trim() || !noteId || !notesCollectionRef) return;
    try { await notesCollectionRef.doc(noteId).update({ title: newTitle.trim(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); }
    catch (error) { console.error("Error renaming note:", error); }
}

function startNoteRename(noteId) {
    const titleSpan = document.querySelector(`.note-item[data-id="${noteId}"] .note-item-title`);
    if (!titleSpan) return;
    const originalTitle = titleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text'; input.className = 'note-item-title-input'; input.value = originalTitle;
    titleSpan.replaceWith(input);
    input.focus(); input.select();
    const finish = () => {
        const newName = input.value.trim();
        if (newName && newName !== originalTitle) renameNote(noteId, newName);
        else renderNoteList();
        input.removeEventListener('blur', finish);
    };
    input.addEventListener('blur', finish);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); }});
}

async function togglePin(id) {
    if (!notesCollectionRef) return;
    const note = localNotesCache.find(n => n.id === id);
    if (note) await notesCollectionRef.doc(id).update({ isPinned: !note.isPinned });
}

async function moveNoteToProject(noteId, projectId) {
    if (!notesCollectionRef || !noteId) return;
    const targetProjectId = projectId === "null" ? null : projectId;
    try {
        await notesCollectionRef.doc(noteId).update({ projectId: targetProjectId, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    } catch (error) {
        console.error("Error moving note:", error);
    }
}

function openNoteEditor(id) {
    const note = localNotesCache.find(n => n.id === id);
    if (!note) return;
    
    switchView('editor');

    const editorEl = document.getElementById('toast-editor');
    if (!editorEl) { console.error("Toast editor container not found!"); return; }

    if (toastEditorInstance) { toastEditorInstance.destroy(); toastEditorInstance = null; }

    toastEditorInstance = new toastui.Editor({
        el: editorEl,
        initialValue: note.content || '',
        // [MODIFIED] WYSIWYG default and advanced features
        initialEditType: 'wysiwyg',
        previewStyle: 'vertical',
        height: '100%',
        theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light',
        plugins: [
            toastui.Editor.plugin.colorSyntax,
            toastui.Editor.plugin.codeSyntaxHighlight
        ],
        // [MODIFIED] Custom toolbar with HTML block inserter
        toolbarItems: [
            ['heading', 'bold', 'italic', 'strike'],
            ['hr', 'quote'],
            ['ul', 'ol', 'task', 'indent', 'outdent'],
            ['table', 'image', 'link'],
            ['code', 'codeblock'],
            [{
                name: 'customHTML',
                tooltip: 'HTML 블록 삽입',
                command: 'insertHTMLBlock',
                text: '</>',
                className: 'toastui-editor-toolbar-icons'
            }]
        ],
        // [NEW] Custom command definition
        commands: {
            insertHTMLBlock: () => {
                const uniqueId = `html-block-${htmlBlockCounter++}`;
                const template = `
                    <div id="${uniqueId}" class="custom-html-container view-code" data-html-block-id="${uniqueId}">
                        <textarea class="html-code-area" placeholder="여기에 HTML 코드를 입력하세요..."></textarea>
                        <div class="html-render-output"></div>
                        <div class="html-controls">
                            <button type="button" class="html-control-btn btn-render-html">렌더링</button>
                            <button type="button" class="html-control-btn btn-view-code">코드 보기</button>
                        </div>
                    </div>
                `;
                toastEditorInstance.insertText(template);
                return true;
            }
        },
        events: {
            change: debounce(() => {
                updateStatus('입력 중...', true);
                saveNote();
            }, 1500)
        }
    });

    // [NEW] Delegated event listener for custom HTML blocks
    const editorContainer = toastEditorInstance.getEditorElements().wwEditor;
    editorContainer.addEventListener('click', (e) => {
        const renderBtn = e.target.closest('.btn-render-html');
        const viewCodeBtn = e.target.closest('.btn-view-code');
        
        if (renderBtn) {
            const container = renderBtn.closest('.custom-html-container');
            const codeArea = container.querySelector('.html-code-area');
            const renderOutput = container.querySelector('.html-render-output');
            renderOutput.innerHTML = codeArea.value; // Full permission rendering
            container.classList.remove('view-code');
            container.classList.add('view-render');
        } else if (viewCodeBtn) {
            const container = viewCodeBtn.closest('.custom-html-container');
            container.classList.remove('view-render');
            container.classList.add('view-code');
        }
    });

    currentNoteId = id;
    if(noteTitleInput) noteTitleInput.value = note.title || '';
}

function generateTitleFromContent(markdownContent) {
    if (!markdownContent) return '무제 노트';
    const trimmedContent = markdownContent.trim();
    if (trimmedContent === '') {
        return '무제 노트';
    }
    const firstLine = trimmedContent.split('\n')[0].replace(/^[#->\s*]*/, '');
    return firstLine.substring(0, 30) || '무제 노트';
}

// --- 3.3: Main UI Rendering ---
function renderNoteList() {
    if (!noteListView) return;

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

    const searchInput = document.getElementById('search-input-dynamic');
    const term = searchInput.value.toLowerCase();
    const filteredNotes = localNotesCache.filter(n => term ? ((n.title||'').toLowerCase().includes(term) || (n.content||'').toLowerCase().includes(term)) : true);

    const notesListContainer = document.getElementById('notes-list');
    const fragment = document.createDocumentFragment();

    const pinnedNotes = filteredNotes.filter(n => n.isPinned);
    const unpinnedNotes = filteredNotes.filter(n => !n.isPinned);

    if (pinnedNotes.length > 0) {
        const pinnedHeader = document.createElement('div');
        pinnedHeader.className = 'note-group-header'; pinnedHeader.textContent = '📌 고정된 메모';
        fragment.appendChild(pinnedHeader);
        pinnedNotes.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0)).forEach(note => fragment.appendChild(createNoteItem(note)));
    }

    localNoteProjectsCache
        .sort((a,b) => a.name.localeCompare(b.name, 'ko'))
        .forEach(project => {
            const notesInProject = unpinnedNotes.filter(n => n.projectId === project.id);
            if (term && !project.name.toLowerCase().includes(term) && notesInProject.length === 0) return;

            const projectContainer = document.createElement('div');
            projectContainer.className = 'note-project-container'; projectContainer.dataset.projectId = project.id;
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
            notesInProject.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0)).forEach(note => notesContainer.appendChild(createNoteItem(note)));
            fragment.appendChild(projectContainer);
        });

    const unassignedNotes = unpinnedNotes.filter(n => !n.projectId);
    if (unassignedNotes.length > 0) {
        const generalHeader = document.createElement('div');
        generalHeader.className = 'note-group-header'; generalHeader.textContent = '일반 메모';
        fragment.appendChild(generalHeader);
        unassignedNotes.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0)).forEach(note => fragment.appendChild(createNoteItem(note)));
    }

    if (fragment.children.length === 0 && term) notesListContainer.innerHTML = '<div>검색 결과가 없습니다.</div>';
    else if (fragment.children.length === 0) notesListContainer.innerHTML = '<div>표시할 메모가 없습니다.</div>';
    else notesListContainer.appendChild(fragment);
}


function createNoteItem(noteData) {
    const item = document.createElement('div');
    item.className = 'note-item'; item.dataset.id = noteData.id; item.draggable = true;
    if (noteData.isPinned) item.classList.add('pinned');
    item.innerHTML = `
        <div class="note-item-content">
            <div class="note-item-title">${noteData.title || '무제 노트'}</div>
            <div class="note-item-date">${noteData.updatedAt?.toDate().toLocaleString('ko-KR',{dateStyle:'short',timeStyle:'short'})||'날짜 없음'}</div>
        </div>
    `;
    return item;
}

// --- 3.4: Context Menu Functions ---
function removeContextMenu() {
    currentOpenContextMenu?.remove();
    currentOpenContextMenu = null;
}

function showContextMenu(target, event) {
    event.preventDefault();
    removeContextMenu();

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
    const menuWidth = menu.offsetWidth; const menuHeight = menu.offsetHeight;
    const bodyWidth = document.body.clientWidth; const bodyHeight = document.body.clientHeight;
    menu.style.left = `${event.clientX + menuWidth > bodyWidth ? event.clientX - menuWidth : event.clientX}px`;
    menu.style.top = `${event.clientY + menuHeight > bodyHeight ? event.clientY - menuHeight : event.clientY}px`;
    menu.style.display = 'block';
    currentOpenContextMenu = menu;
}


function createNoteContextMenu(noteId) {
    const note = localNotesCache.find(n => n.id === noteId);
    if (!note) return;

    const menu = document.createElement('div');
    menu.className = 'note-context-menu';

    let moveToSubMenuHTML = localNoteProjectsCache
        .sort((a,b) => a.name.localeCompare(b.name, 'ko'))
        .map(p => `<button class="context-menu-item" data-action="move-to" data-project-id="${p.id}" ${note.projectId === p.id ? 'disabled' : ''}><span class="icon">📁</span><span>${p.name}</span></button>`).join('');

    if (note.projectId) {
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

    menu.addEventListener('click', e => {
        e.stopPropagation();
        const target = e.target.closest('.context-menu-item');
        if (!target || target.disabled) return;
        const action = target.dataset.action;
        if (action === 'rename') startNoteRename(noteId);
        else if (action === 'pin') togglePin(noteId);
        else if (action === 'delete') deleteNote(noteId);
        else if (action === 'move-to') moveNoteToProject(noteId, target.dataset.projectId);
        
        if (!target.closest('.context-submenu-container')) removeContextMenu();
    });
    return menu;
}

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
    
    menu.addEventListener('click', e => {
        e.stopPropagation();
        const target = e.target.closest('.context-menu-item');
        if (!target || target.disabled) return;
        const action = target.dataset.action;
        if (action === 'rename') startNoteProjectRename(projectId);
        else if (action === 'delete') deleteNoteProject(projectId);
        removeContextMenu();
    });
    return menu;
}


// --- 3.5: Data Management Functions ---
async function handleSystemReset() {
    const message = "정말로 이 캔버스의 모든 데이터를 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.";
    showModal(message, async () => {
        if (!db || !currentUser) { alert("초기화 실패: DB 연결을 확인해주세요."); return; }
        updateStatus("시스템 초기화 중...", true);
        
        const collectionsToDelete = [
            notesCollectionRef, noteProjectsCollectionRef, chatSessionsCollectionRef,
            projectsCollectionRef, tagsCollectionRef, noteTemplatesCollectionRef
        ];

        try {
            const batch = db.batch();
            for (const ref of collectionsToDelete) {
                if (ref) {
                    const snapshot = await ref.get();
                    snapshot.docs.forEach(doc => batch.delete(doc.ref));
                }
            }
            await batch.commit();
            localStorage.clear();
            alert("✅ 모든 데이터가 성공적으로 삭제되었습니다. 페이지를 새로고침하여 시스템을 다시 시작합니다.");
            location.reload();
        } catch (error) { 
            console.error("❌ 시스템 초기화 실패:", error); 
            alert(`시스템 초기화 중 오류가 발생했습니다: ${error.message}`); 
            updateStatus("초기화 실패 ❌", false); 
        }
    });
}

function exportAllData() {
    const allCaches = [localNotesCache, localNoteProjectsCache, localChatSessionsCache, localProjectsCache];
    if (allCaches.every(cache => cache.length === 0)) { 
        showModal("백업할 데이터가 없습니다.", () => {}); 
        return; 
    }

    const processTimestamp = (item) => { 
        const newItem = { ...item }; 
        if (newItem.createdAt?.toDate) newItem.createdAt = newItem.createdAt.toDate().toISOString(); 
        if (newItem.updatedAt?.toDate) newItem.updatedAt = newItem.updatedAt.toDate().toISOString(); 
        if (Array.isArray(newItem.messages)) { 
            newItem.messages = newItem.messages.map(msg => { 
                const newMsg = { ...msg }; 
                if (newMsg.timestamp?.toDate) newMsg.timestamp = newMsg.timestamp.toDate().toISOString(); 
                return newMsg; 
            }); 
        } 
        return newItem; 
    };

    const dataToExport = { 
        backupVersion: '4.0', 
        backupDate: new Date().toISOString(), 
        notes: localNotesCache.map(processTimestamp), 
        noteProjects: localNoteProjectsCache.map(processTimestamp),
        chatSessions: localChatSessionsCache.map(processTimestamp), 
        projects: localProjectsCache.map(processTimestamp) 
    };

    const str = JSON.stringify(dataToExport, null, 2); 
    const blob = new Blob([str], { type: 'application/json' }); 
    const url = URL.createObjectURL(blob); 
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `ailey-canvas-backup-${new Date().toISOString().slice(0, 10)}.json`; 
    document.body.appendChild(a);
    a.click(); 
    document.body.removeChild(a);
    URL.revokeObjectURL(url); 
}

function handleRestoreClick() { 
    if (fileImporter) fileImporter.click(); 
}

async function importAllData(event) {
    const file = event.target.files[0]; 
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            const supportedVersions = ['2.0', '3.0', '4.0'];
            if (!data.backupVersion || !supportedVersions.includes(data.backupVersion)) { 
                throw new Error(`호환되지 않는 백업 파일 버전입니다. (${supportedVersions.join(', ')} 지원)`); 
            }

            const message = `파일(${data.backupVersion}v)에서 채팅 폴더 ${data.projects?.length||0}개, 채팅 ${data.chatSessions?.length||0}개, 메모 폴더 ${data.noteProjects?.length||0}개, 메모 ${data.notes?.length||0}개를 발견했습니다. 현재 데이터를 덮어씁니다. 계속하시겠습니까?`;
            
            showModal(message, async () => {
                try {
                    updateStatus('복원 중...', true);
                    const batch = db.batch();
                    const toFirestoreTimestamp = ts => ts ? firebase.firestore.Timestamp.fromDate(new Date(ts)) : firebase.firestore.FieldValue.serverTimestamp();
                    
                    (data.notes || []).forEach(note => { const { id, ...dataToWrite } = note; dataToWrite.createdAt = toFirestoreTimestamp(note.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(note.updatedAt); batch.set(notesCollectionRef.doc(id), dataToWrite); });
                    (data.noteProjects || []).forEach(project => { const { id, ...dataToWrite } = project; dataToWrite.createdAt = toFirestoreTimestamp(project.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(project.updatedAt); batch.set(noteProjectsCollectionRef.doc(id), dataToWrite); });
                    (data.chatSessions || []).forEach(session => { const { id, ...dataToWrite } = session; dataToWrite.createdAt = toFirestoreTimestamp(session.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(session.updatedAt); if(dataToWrite.messages) dataToWrite.messages.forEach(m=>m.timestamp=toFirestoreTimestamp(m.timestamp)); batch.set(chatSessionsCollectionRef.doc(id), dataToWrite); });
                    (data.projects || []).forEach(project => { const { id, ...dataToWrite } = project; dataToWrite.createdAt = toFirestoreTimestamp(project.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(project.updatedAt); batch.set(projectsCollectionRef.doc(id), dataToWrite); });
                    
                    await batch.commit();
                    updateStatus('복원 완료 ✓', true);
                    showModal("데이터 복원이 완료되었습니다. 페이지를 새로고침합니다.", () => location.reload());
                } catch (error) { console.error("데이터 복원 실패:", error); updateStatus('복원 실패 ❌', false); showModal(`데이터 복원 중 오류: ${error.message}`, () => {}); }
            });
        } catch (error) { console.error("File parsing error:", error); showModal(`파일 읽기 오류: ${error.message}`, () => {}); }
        finally { event.target.value = null; }
    };
    reader.readAsText(file);
}