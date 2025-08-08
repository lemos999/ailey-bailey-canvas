/*
--- Ailey & Bailey Canvas ---
File: 340_notes_app.js
Version: 1.0 (Bundled)
Description: Acts as the main controller for the Notes App, handling view switching and event listening.
*/

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

        noteEditorView?.classList.remove('active');
        noteListView?.classList.add('active');
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