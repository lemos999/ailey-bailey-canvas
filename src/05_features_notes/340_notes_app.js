/* --- Ailey & Bailey Canvas --- */
// File: 340_notes_app.js
// Version: 2.0 (Custom Resizable Panel)
// Description: Replaced makePanelDraggable with the new initializer to add custom resize handles.

function ensureNotePanelHeader() {
    if (!notesAppPanel) return;
    let header = notesAppPanel.querySelector('.panel-header');
    if (!header) {
        header = document.createElement('div');
        header.className = 'panel-header';
        header.innerHTML = `
            <span><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="margin-right: 8px; vertical-align: -3px;"><path d="M17,4V10L15,8L13,10V4H6A2,2 0 0,0 4,6V18A2,2 0 0,0 6,20H18A2,2 0 0,0 20,18V6A2,2 0 0,0 18,4H17Z"></path></svg>Ailey's Note</span>
            <div class="panel-controls">
                <button class="panel-control-btn panel-minimize-btn" title="최소화"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M20,14H4V10H20" /></svg></button>
                <button class="panel-control-btn panel-maximize-btn" title="최대화">
                    <span class="icon-maximize"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M4,4H20V20H4V4M6,8V18H18V8H6Z"/></svg></span>
                    <span class="icon-restore"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M4,8H8V4H20V16H16V20H4V8M16,8V14H18V6H10V8H16M6,10V18H14V10H6Z"/></svg></span>
                </button>
                <button class="panel-control-btn close-btn" title="닫기"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg></button>
            </div>
        `;
        header.querySelector('.close-btn').addEventListener('click', () => togglePanel(notesAppPanel, false));
        header.querySelector('.panel-minimize-btn').addEventListener('click', () => handlePanelMinimize(notesAppPanel));
        header.querySelector('.panel-maximize-btn').addEventListener('click', () => handlePanelMaximize(notesAppPanel));
        notesAppPanel.prepend(header);
        // [MODIFIED] Use the new unified initializer for drag and resize
        initializeDraggableAndResizablePanel(notesAppPanel);
    }
}

function switchView(view) {
    trace("UI", "note.switchView", { view });
    if (view === 'editor') {
        if(noteListView) noteListView.classList.remove('active');
        if(noteEditorView) noteEditorView.classList.add('active');
    } else { // Assuming 'list' view
        if (noteTitleInput && noteTitleInput.value.trim() === '' && currentNoteId && toastEditorInstance) {
            const content = toastEditorInstance.getMarkdown();
            const newTitle = generateTitleFromContent(content);
            if (newTitle && newTitle !== '무제 노트') {
                notesCollectionRef.doc(currentNoteId).update({ title: newTitle });
            }
        }
        
        if (toastEditorInstance) {
            toastEditorInstance.destroy();
            toastEditorInstance = null;
        }

        if(noteEditorView) noteEditorView.classList.remove('active');
        if(noteListView) noteListView.classList.add('active');
        currentNoteId = null;
    }
}

function getNewNoteProjectDefaultName() {
    const baseName = "새 폴더";
    let i = 1;
    let newName = baseName;
    const existingNames = new Set(localNoteProjectsCache.map(p => p.name));
    while (existingNames.has(newName)) {
        newName = `${baseName} ${++i}`;
    }
    return newName;
}

function toggleNoteProjectExpansion(projectId) {
    const project = localNoteProjectsCache.find(p => p.id === projectId);
    if (project) {
        project.isExpanded = !project.isExpanded;
        renderNoteList();
    }
}

function startNoteProjectRename(projectId) {
    const titleSpan = document.querySelector(`.note-project-container[data-project-id="${projectId}"] .note-project-title`);
    if (!titleSpan) return;
    const originalTitle = titleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'note-project-title-input';
    input.value = originalTitle;
    titleSpan.replaceWith(input);
    input.focus();
    input.select();
    const finish = () => {
        const newName = input.value.trim();
        if (newName && newName !== originalTitle) {
            renameNoteProject(projectId, newName);
        } else {
            renderNoteList();
        }
        input.removeEventListener('blur', finish);
        input.removeEventListener('keydown', onKeydown);
    };
    const onKeydown = (e) => {
        if (e.key === 'Enter') input.blur();
        else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); }
    };
    input.addEventListener('blur', finish);
    input.addEventListener('keydown', onKeydown);
}

function startNoteRename(noteId) {
    const titleSpan = document.querySelector(`.note-item[data-id="${noteId}"] .note-item-title`);
    if (!titleSpan) return;
    const originalTitle = titleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'note-item-title-input';
    input.value = originalTitle;
    titleSpan.replaceWith(input);
    input.focus();
    input.select();
    const finish = () => {
        const newName = input.value.trim();
        if (newName && newName !== originalTitle) {
            renameNote(noteId, newName);
        } else {
            renderNoteList();
        }
        input.removeEventListener('blur', finish);
        input.removeEventListener('keydown', onKeydown);
    };
    const onKeydown = (e) => {
        if (e.key === 'Enter') input.blur();
        else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); }
    };
    input.addEventListener('blur', finish);
    input.addEventListener('keydown', onKeydown);
}

async function handleAddNewNote() {
    const newNoteId = await addNote();
    if (newNoteId) {
        openNoteEditor(newNoteId);
    }
}
