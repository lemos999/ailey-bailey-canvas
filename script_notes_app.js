/*
--- Ailey & Bailey Canvas ---
File: script_notes_app.js
Version: 12.0 (Modular JS Refactor)
Architect: [Username] & System Architect Ailey
Description: Acts as the main controller for the Notes App. It orchestrates the data, UI, editor, and utility modules, and handles view switching and event listening.
*/

// --- 3.0: Panel & View Management (Controller) ---

/**
 * 노트 패널에 헤더가 없으면 생성하고 드래그 기능을 활성화합니다.
 * 패널이 처음 열릴 때 한 번만 호출됩니다.
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
        // [MODIFIED] Add a listener that resets the view to 'list' when the panel is closed.
        header.querySelector('.close-btn').addEventListener('click', () => {
            togglePanel(notesAppPanel, false);
            switchView('list'); // Reset the view to 'list' when closing the panel to prevent UI conflicts.
        });
        notesAppPanel.prepend(header);
        makePanelDraggable(notesAppPanel); // from _ui_helpers.js
    }
}

/**
 * 노트 앱의 뷰를 'list' 또는 'editor'로 전환합니다.
 * @param {'list' | 'editor'} view - 전환할 뷰의 이름
 */
function switchView(view) {
    if (view === 'editor') {
        noteListView?.classList.remove('active');
        noteEditorView?.classList.add('active');
    } else { // Switching back to 'list'
        // If the title was left blank in the editor, auto-generate it from content before leaving
        if (noteTitleInput && noteTitleInput.value.trim() === '' && currentNoteId && toastEditorInstance) {
            const content = toastEditorInstance.getMarkdown();
            const newTitle = generateTitleFromContent(content); // from _editor.js
            if (newTitle && newTitle !== '무제 노트') {
                notesCollectionRef.doc(currentNoteId).update({ title: newTitle });
            }
        }
        
        // Destroy the editor instance on view switch to prevent memory leaks and ensure clean state
        if (toastEditorInstance) {
            toastEditorInstance.destroy();
            toastEditorInstance = null;
        }

        noteEditorView?.classList.remove('active');
        noteListView?.classList.add('active');
        currentNoteId = null; // Clear active note ID
    }
}


// --- 3.1: Project/Folder Management (Controller) ---

/**
 * 로컬 캐시를 기반으로 새 노트 폴더의 기본 이름을 생성합니다.
 * @returns {string} 생성된 기본 이름 (예: "새 폴더 2")
 */
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

/**
 * 지정된 노트 프로젝트의 확장/축소 상태를 토글합니다.
 * @param {string} projectId - 상태를 변경할 프로젝트의 ID
 */
function toggleNoteProjectExpansion(projectId) {
    const project = localNoteProjectsCache.find(p => p.id === projectId);
    if (project) {
        project.isExpanded = !project.isExpanded; // Update local state
        renderNoteList(); // Re-render UI
    }
}


/**
 * 노트 프로젝트 이름 변경을 위한 UI 상태로 전환합니다.
 * @param {string} projectId - 이름을 변경할 프로젝트의 ID
 */
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
            renameNoteProject(projectId, newName); // from _data.js
        } else {
            renderNoteList(); // Restore original name
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


// --- 3.2: Note Management (Controller) ---

/**
 * 노트 이름 변경을 위한 UI 상태로 전환합니다.
 * @param {string} noteId - 이름을 변경할 노트의 ID
 */
function startNoteRename(noteId) {
    const titleSpan = document.querySelector(`.note-item[data-id="${noteId}"] .note-item-title`);
    if (!titleSpan) return;
    const originalTitle = titleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'note-item-title-input'; // Reuse class
    input.value = originalTitle;
    titleSpan.replaceWith(input);
    input.focus();
    input.select();
    const finish = () => {
        const newName = input.value.trim();
        if (newName && newName !== originalTitle) {
            renameNote(noteId, newName); // from _data.js
        } else {
            renderNoteList(); // Restore original name
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

/**
 * '새 노트 추가' 버튼 클릭을 처리하는 핸들러.
 * 새 노트를 생성하고 에디터 뷰로 전환합니다.
 */
async function handleAddNewNote() {
    const newNoteId = await addNote(); // from _data.js
    if (newNoteId) {
        openNoteEditor(newNoteId); // from _editor.js
    }
}