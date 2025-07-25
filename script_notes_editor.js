/*
--- Ailey & Bailey Canvas ---
File: script_notes_editor.js
Version: 16.0 (Notes UI Overhaul Complete)
Architect: [Username] & System Architect Ailey
Description: Manages the Toast UI Editor instance, including its creation, content handling, and saving logic for the Notes App.
*/

// --- Global variable for the editor instance ---
let toastEditorInstance = null;

// --- 3. Function Definitions (Notes Editor Management) ---

/**
 * 지정된 ID의 노트를 에디터 뷰에서 엽니다.
 * Toast UI Editor 인스턴스를 생성하고 설정합니다.
 * @param {string} noteId - 열람할 노트의 ID
 */
function openNoteEditor(noteId) {
    const note = localNotesCache.find(n => n.id === noteId);
    if (!note) return;
    
    // Ensure the view is switched to the editor first
    switchView('editor'); // This function is in _app.js

    const editorEl = document.getElementById('toast-editor');
    if (!editorEl) {
        console.error("Toast editor container element not found!");
        return;
    }

    // Always destroy the old instance before creating a new one to prevent memory leaks
    if (toastEditorInstance) {
        toastEditorInstance.destroy();
        toastEditorInstance = null;
    }

    // Initialize Toast UI Editor
    toastEditorInstance = new toastui.Editor({
        el: editorEl,
        initialValue: note.content || '',
        initialEditType: 'wysiwyg', // Start in WYSIWYG mode
        previewStyle: 'vertical',
        height: '100%', // Fill the container height
        theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light',
        plugins: [toastui.Editor.plugin.codeSyntaxHighlight],
        events: {
            // Use a debounced change event to trigger auto-save
            change: debounce(() => {
                updateStatus('입력 중...', true); // from _ui_helpers.js
                saveNote(); // This function below
            }, 1500) // 1.5-second debounce delay
        }
    });

    currentNoteId = noteId; // Update global state
    if(noteTitleInput) noteTitleInput.value = note.title || '';
    if(noteTitleInput) noteTitleInput.focus(); // Focus on title input for immediate editing
}

/**
 * 현재 에디터의 내용을 Firestore에 저장합니다.
 * 제목이 비어있으면 내용에서 자동으로 생성합니다.
 */
function saveNote() {
    if (debounceTimer) clearTimeout(debounceTimer); // Clear any pending saves
    if (!currentNoteId || !notesCollectionRef || !toastEditorInstance) return;

    let titleValue = noteTitleInput.value.trim();
    // Get content directly from the Toast UI Editor instance
    const contentValue = toastEditorInstance.getMarkdown();

    // If title is empty but content exists, generate a title
    if (titleValue === '' && contentValue.trim() !== '') {
        titleValue = generateTitleFromContent(contentValue);
        if (noteTitleInput) noteTitleInput.value = titleValue; // [MODIFIED] Sync generated title back to UI
    }
    
    // If both are still empty, assign a default title
    if (titleValue === '' && contentValue.trim() === '') {
        titleValue = '무제 노트';
        if (noteTitleInput) noteTitleInput.value = titleValue; // [MODIFIED] Sync generated title back to UI
    }

    const dataToUpdate = {
        title: titleValue,
        content: contentValue,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    notesCollectionRef.doc(currentNoteId).update(dataToUpdate)
        .then(() => {
            updateStatus('저장됨 ✓', true); // from _ui_helpers.js
        })
        .catch(e => {
            console.error("메모 저장 실패:", e);
            updateStatus('저장 실패 ❌', false); // from _ui_helpers.js
        });
}


/**
 * 노트 내용의 첫 줄을 기반으로 제목을 자동 생성합니다.
 * @param {string} content - 제목을 생성할 노트 내용
 * @returns {string} 생성된 제목
 */
function generateTitleFromContent(content) {
    if (!content) return '무제 노트';
    const trimmedContent = content.trim();
    if (trimmedContent === '') {
        return '무제 노트';
    }
    // Get the first line and remove markdown characters like #, >, *, - from the beginning
    const firstLine = trimmedContent.split('\n')[0].replace(/^[#->\s*]*/, '').trim();
    return firstLine.substring(0, 30) || '무제 노트'; // Limit title length
}