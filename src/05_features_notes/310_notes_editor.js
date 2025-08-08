/*
--- Ailey & Bailey Canvas ---
File: 310_notes_editor.js
Version: 1.0 (Bundled)
Description: Manages the Toast UI Editor instance for the Notes App.
*/

let toastEditorInstance = null;

function openNoteEditor(noteId) {
    const note = localNotesCache.find(n => n.id === noteId);
    if (!note) return;
    
    switchView('editor');

    const editorEl = document.getElementById('toast-editor');
    if (!editorEl) {
        console.error("Toast editor container element not found!");
        return;
    }

    if (toastEditorInstance) {
        toastEditorInstance.destroy();
        toastEditorInstance = null;
    }

    toastEditorInstance = new toastui.Editor({
        el: editorEl,
        initialValue: note.content || '',
        initialEditType: 'wysiwyg',
        previewStyle: 'vertical',
        height: '100%',
        theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light',
        plugins: [toastui.Editor.plugin.codeSyntaxHighlight],
        events: {
            change: debounce(() => {
                updateStatus('입력 중...', true);
                saveNote();
            }, 1500)
        }
    });

    currentNoteId = noteId;
    if(noteTitleInput) noteTitleInput.value = note.title || '';
    if(noteTitleInput) noteTitleInput.focus();
}

function saveNote() {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (!currentNoteId || !notesCollectionRef || !toastEditorInstance) return;

    let titleValue = noteTitleInput.value.trim();
    const contentValue = toastEditorInstance.getMarkdown();

    if (titleValue === '' && contentValue.trim() !== '') {
        titleValue = generateTitleFromContent(contentValue);
    }
    
    if (titleValue === '' && contentValue.trim() === '') {
        titleValue = '무제 노트';
    }

    const dataToUpdate = {
        title: titleValue,
        content: contentValue,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    notesCollectionRef.doc(currentNoteId).update(dataToUpdate)
        .then(() => {
            updateStatus('저장됨 ✓', true);
        })
        .catch(e => {
            console.error("메모 저장 실패:", e);
            updateStatus('저장 실패 ❌', false);
        });
}

function generateTitleFromContent(content) {
    if (!content) return '무제 노트';
    const trimmedContent = content.trim();
    if (trimmedContent === '') {
        return '무제 노트';
    }
    const firstLine = trimmedContent.split('\n')[0].replace(/^[#->\s*]*/, '').trim();
    return firstLine.substring(0, 30) || '무제 노트';
}