/*
--- Ailey & Bailey Canvas ---
File: script_notes_app.js
Version: 13.1 (Event Delegation Fix)
Architect: [Username] & System Architect Ailey
Description: Contains all business logic and UI rendering for the enhanced Notes App. Adds data-action attributes for robust event handling.
*/

// --- 3.1: Project/Folder Management ---
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

// --- 3.2: Main UI Rendering ---
function renderNoteList() { 
    if (!noteListView) return;
    
    // 1. Create Action Bar with data-action attributes for event delegation
    const actionBarHTML = `
        <div class="action-bar">
            <div class="action-bar-group left">
                <button id="add-new-note-btn-dynamic" class="notes-btn" title="새 메모" data-action="add-new-note"><svg viewBox="0 0 24 24"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg></button>
                <button id="add-new-note-project-btn-dynamic" class="notes-btn" title="새 폴더" data-action="add-new-project"><svg viewBox="0 0 24 24"><path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M13,13H11V10H8V8H11V5H13V8H16V10H13V13Z"/></svg></button>
            </div>
            <div class="action-bar-group center">
                <input type="text" id="search-input-dynamic" class="search-input-notes" placeholder="메모 검색...">
            </div>
            <div class="action-bar-group right">
                <div class="more-options-container">
                    <button id="more-options-btn" class="more-options-btn" title="더 보기" data-action="toggle-more-options"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" /></svg></button>
                    <div id="notes-dropdown-menu" class="dropdown-menu">
                        <button class="dropdown-item" data-action="export-all"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"></path></svg><span>데이터 백업</span></button>
                        <button class="dropdown-item" data-action="import-all"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M19.35,10.04C18.67,6.59 15.64,4 12,4C9.11,4 6.6,5.64 5.35,8.04C2.34,8.36 0,10.91 0,14A6,6 0 0,0 6,20H19A5,5 0 0,0 19.35,10.04Z"></path></svg><span>데이터 복원</span></button>
                        <div class="dropdown-separator"></div>
                        <button class="dropdown-item" data-action="system-reset" style="color: #d9534f;"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,4C14.12,4 16.16,4.73 17.89,6.03L16.83,7.09C15.5,6.07 13.83,5.5 12,5.5C8.96,5.5 6.5,7.96 6.5,11H8.5C8.5,9.07 10.07,7.5 12,7.5C12.86,7.5 13.65,7.81 14.29,8.34L13.23,9.4L17.5,10.5L16.4,6.23L15.34,7.29C14.37,6.46 13.23,6 12,6C9.24,6 7,8.24 7,11V11.5H5V11C5,7.13 8.13,4 12,4M12,18C9.88,18 7.84,17.27 6.11,15.97L7.17,14.91C8.5,15.93 10.17,16.5 12,16.5C15.04,16.5 17.5,14.04 17.5,11H15.5C15.5,12.93 13.93,14.5 12,14.5C11.14,14.5 10.35,14.19 9.71,13.66L10.77,12.6L6.5,11.5L7.6,15.77L8.66,14.71C9.63,15.54 10.77,16 12,16C14.76,16 17,13.76 17,11V10.5H19V11C19,14.87 15.87,18 12,18Z" /></svg><span>시스템 초기화</span></button>
                    </div>
                </div>
            </div>
        </div>
    `;
    const notesListHTML = `<div id="notes-list"></div>`;
    const currentSearchValue = noteListView.querySelector('#search-input-dynamic')?.value || '';
    noteListView.innerHTML = actionBarHTML + notesListHTML;
    
    const searchInput = document.getElementById('search-input-dynamic');
    searchInput.value = currentSearchValue;
    const term = currentSearchValue.toLowerCase();

    // 2. Filter & Sort Data
    const filteredNotes = localNotesCache.filter(n => term ? (n.title?.toLowerCase().includes(term) || n.content?.toLowerCase().includes(term)) : true);

    // 3. Render Projects
    const notesListContainer = document.getElementById('notes-list');
    const fragment = document.createDocumentFragment();
    localNoteProjectsCache
        .sort((a,b) => (a.name > b.name) ? 1 : -1)
        .forEach(project => {
            const notesInProject = filteredNotes.filter(n => n.projectId === project.id);
            if (term && !project.name.toLowerCase().includes(term) && notesInProject.length === 0) return;

            const projectContainer = document.createElement('div');
            projectContainer.className = 'note-project-container'; projectContainer.dataset.projectId = project.id;
            projectContainer.innerHTML = `
                <div class="note-project-header">
                    <span class="note-project-toggle-icon ${project.isExpanded ? 'expanded' : ''}"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" /></svg></span>
                    <span class="note-project-icon"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2Z" /></svg></span>
                    <span class="note-project-title">${project.name}</span>
                    <span class="note-count">(${notesInProject.length})</span>
                </div>
                <div class="notes-in-project ${project.isExpanded ? 'expanded' : ''}"></div>
            `;
            const notesContainer = projectContainer.querySelector('.notes-in-project');
            notesInProject.sort((a,b) => (b.isPinned - a.isPinned) || (b.updatedAt?.toMillis()||0) - (a.updatedAt?.toMillis()||0)).forEach(note => notesContainer.appendChild(createNoteItem(note)));
            fragment.appendChild(projectContainer);
        });

    // 4. Render Unassigned Notes
    const unassignedNotes = filteredNotes.filter(n => !n.projectId);
    if (unassignedNotes.length > 0) {
        const generalHeader = document.createElement('div');
        generalHeader.className = 'note-group-header'; generalHeader.textContent = '일반 메모';
        fragment.appendChild(generalHeader);
        unassignedNotes.sort((a,b) => (b.isPinned - a.isPinned) || (b.updatedAt?.toMillis()||0) - (a.updatedAt?.toMillis()||0)).forEach(note => fragment.appendChild(createNoteItem(note)));
    }
    
    if (fragment.children.length === 0 && term) {
        notesListContainer.innerHTML = `<div>"${term}"에 대한 검색 결과가 없습니다.</div>`;
    } else if (fragment.children.length === 0) {
        notesListContainer.innerHTML = '<div>표시할 메모가 없습니다.</div>';
    } else {
        notesListContainer.appendChild(fragment);
    }

    // 5. Re-attach listener for search input
    searchInput.addEventListener('input', renderNoteList);
}


function createNoteItem(noteData) {
    const item = document.createElement('div'); 
    item.className = 'note-item'; item.dataset.id = noteData.id; item.draggable = true;
    if (noteData.isPinned) item.classList.add('pinned'); 
    item.innerHTML = `
        <div class="note-item-content">
            <div class="note-item-title">${noteData.title||'무제'}</div>
            <div class="note-item-date">${noteData.updatedAt?.toDate().toLocaleString('ko-KR',{dateStyle:'short',timeStyle:'short'})||'날짜 없음'}</div>
        </div>
        <div class="note-item-actions">
            <button class="item-action-btn pin-btn" title="고정" data-action="pin-note"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg></button>
            <button class="item-action-btn delete-btn" title="삭제" data-action="delete-note"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z" /></svg></button>
        </div>
    `;
    if(noteData.isPinned) item.querySelector('.pin-btn').classList.add('pinned-active');
    return item;
}


// --- 3.3: Note CRUD & Other Functions ---
async function addNote(content = '') { 
    if (!notesCollectionRef) return; 
    try { 
        const activeProject = document.querySelector('.note-project-header.active-drop-target');
        const projectId = activeProject ? activeProject.closest('.note-project-container').dataset.projectId : null;
        const ref = await notesCollectionRef.add({ 
            title: '새 메모', content, projectId, isPinned: false, tags: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(), 
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
        }); 
        openNoteEditor(ref.id); 
    } catch (e) { console.error("새 메모 추가 실패:", e); } 
}

function saveNote() { 
    if (debounceTimer) clearTimeout(debounceTimer); 
    if (!currentNoteId || !notesCollectionRef) return; 
    const data = { 
        title: noteTitleInput.value, content: noteContentTextarea.value, 
        updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
    }; 
    notesCollectionRef.doc(currentNoteId).update(data)
        .then(() => {
            updateStatus('저장됨 ✓', true);
        })
        .catch(e => { console.error("메모 저장 실패:", e); updateStatus('저장 실패 ❌', false); }); 
}

function handleDeleteRequest(id) { showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => { if (notesCollectionRef) notesCollectionRef.doc(id).delete().catch(e => console.error("메모 삭제 실패:", e)); }); }
async function togglePin(id) { if (!notesCollectionRef) return; const note = localNotesCache.find(n => n.id === id); if (note) await notesCollectionRef.doc(id).update({ isPinned: !note.isPinned }); }
function switchView(view) { if (view === 'editor') { noteListView?.classList.remove('active'); noteEditorView?.classList.add('active'); } else { noteEditorView?.classList.remove('active'); noteListView?.classList.add('active'); currentNoteId = null; } }
function openNoteEditor(id) { const note = localNotesCache.find(n => n.id === id); if (note && noteTitleInput && noteContentTextarea) { currentNoteId = id; noteTitleInput.value = note.title || ''; noteContentTextarea.value = note.content || ''; switchView('editor'); } }
async function handleSystemReset() { showModal("정말로 이 캔버스의 모든 데이터를 영구적으로 삭제하시겠습니까?", async () => { if (!db || !currentUser) return; updateStatus("시스템 초기화 중...", true); const batch = db.batch(); try { const collections = [notesCollectionRef, noteProjectsCollectionRef, chatSessionsCollectionRef, projectsCollectionRef]; for (const ref of collections) { const snapshot = await ref.get(); snapshot.docs.forEach(doc => batch.delete(doc.ref)); } await batch.commit(); localStorage.clear(); alert("✅ 모든 데이터가 성공적으로 삭제되었습니다. 페이지를 새로고침합니다."); location.reload(); } catch (error) { console.error("❌ 시스템 초기화 실패:", error); } }); }
function exportAllData() { /* unchanged */ }
function handleRestoreClick() { if(fileImporter) fileImporter.click(); }
function importAllData(event) { /* unchanged */ }