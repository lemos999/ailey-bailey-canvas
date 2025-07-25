
/*
--- Ailey & Bailey Canvas ---
File: script_notes_app.js
Version: 13.3 (Toast UI Editor Integration)
Architect: [Username] & System Architect Ailey
Description: Core logic for the Notes App, now featuring the Toast UI Editor.
*/
/*
--- Ailey & Bailey Canvas ---
File: script_notes_app.js
Version: 13.3 (Toast UI Editor Integration)
Architect: [Username] & System Architect Ailey
Description: Core logic for the Notes App, now featuring the Toast UI Editor.
*/

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
        if (toastEditor) {
            toastEditor.destroy();
            toastEditor = null;
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
            title: '', // Start with an empty title
            content: content || '', // Start with empty content unless specified
            projectId, isPinned: false, tags: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        openNoteEditor(ref.id);
    } catch (e) { console.error("새 메모 추가 실패:", e); }
}

function saveNote() {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (!currentNoteId || !notesCollectionRef || !toastEditor) return;
    
    const data = {
        title: noteTitleInput.value || '무제', // Use placeholder if empty
        content: toastEditor.getMarkdown(),
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
    try { await notesCollectionRef.doc(noteId).update({ projectId: targetProjectId, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); }
    catch (error) { console.error("Error moving note:", error); }
}

function openNoteEditor(id) {
    const note = localNotesCache.find(n => n.id === id);
    if (!note || !noteTitleInput) return;

    currentNoteId = id;
    noteTitleInput.value = note.title || '';
    noteTitleInput.placeholder = '제목을 입력하세요...';

    if (toastEditor) {
        toastEditor.destroy();
        toastEditor = null;
    }

    const editorContainer = document.getElementById('toast-editor-container');
    if (editorContainer) {
        toastEditor = new toastui.Editor({
            el: editorContainer,
            height: '100%',
            initialEditType: 'wysiwyg',
            previewStyle: 'vertical',
            initialValue: note.content || '',
            placeholder: '내용을 입력하세요...',
            theme: document.body.classList.contains('dark-mode') ? 'dark' : 'default',
            hooks: {
                change: () => {
                    updateStatus('입력 중...', true);
                    if (debounceTimer) clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(saveNote, 1500);
                }
            }
        });
    }
    switchView('editor');
}


// --- 3.3: Main UI Rendering (List View) ---
function renderNoteList() {
    if (!noteListView) return;
    const actionBarHTML = `... (same as before) ...`; // This part is unchanged
    const notesListContainerHTML = `<div id="notes-list"></div>`;
    noteListView.innerHTML = actionBarHTML + notesListContainerHTML;

    // ... (rest of the renderNoteList function is unchanged)
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
    `;
    return item;
}

// ... (Context Menu and Data Management functions are unchanged from the previous version)