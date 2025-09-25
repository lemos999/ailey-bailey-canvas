/*
--- Ailey & Bailey Canvas ---
File: 310_notes_editor.js
Version: 2.0 (Drawing Feature Foundation)
Description: Added a custom toolbar button to open the drawing modal.
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

    // [ADDED] Custom button for the drawing feature
    const drawingButton = document.createElement('button');
    drawingButton.className = 'toastui-editor-toolbar-icons';
    drawingButton.style.backgroundImage = 'none';
    drawingButton.style.margin = '0';
    drawingButton.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19.07,4.93C17.7,3.56 15.6,3 12,3C9.2,3 6.3,4.2 4.2,6.2C2.2,8.2 1,11.1 1,14C1,15.1 1.1,16.2 1.4,17.2L12,7.5L22.6,18.1C22.9,17.1 23,16 23,15C23,10.9 21.4,7.3 19.07,4.93M2.5,18.5L12,9L21.5,19.5C20.4,20.6 18.8,21 17.1,21H7.1C5.4,21 3.6,20.4 2.5,19.5Z" /></svg>';
    drawingButton.setAttribute('aria-label', '그림판 열기');

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
        },
        toolbarItems: [
            ['heading', 'bold', 'italic', 'strike'],
            ['hr', 'quote'],
            ['ul', 'ol', 'task', 'indent', 'outdent'],
            ['table', 'image', 'link'],
            ['code', 'codeblock'],
            [{
                name: 'drawing',
                tooltip: '그림판 열기',
                el: drawingButton,
                onCommand: () => {
                    // The actual logic will be in 311_notes_drawing_canvas.js
                    // This is just the entry point.
                    if(typeof openDrawingModal === 'function') {
                       openDrawingModal();
                    } else {
                       alert("그림판 기능이 아직 로드되지 않았습니다.");
                    }
                }
            }]
        ]
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