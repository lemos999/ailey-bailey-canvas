
/*
--- Ailey & Bailey Canvas ---
File: script_notes_editor.js
Version: 13.0 (Editor UI Overhaul)
Architect: [Username] & System Architect Ailey
Description: Manages the Toast UI Editor instance, including its creation, content handling, and saving logic for the Notes App, with a new document-centric UI.
*/

// --- Global variable for the editor instance ---
let toastEditorInstance = null;

// --- 3. Function Definitions (Notes Editor Management) ---

/**
 * 지정된 ID의 노트를 새로운 에디터 뷰에서 엽니다.
 * UI를 동적으로 생성하고 Toast UI Editor 인스턴스를 설정합니다.
 * @param {string} noteId - 열람할 노트의 ID
 */
function openNoteEditor(noteId) {
    const note = localNotesCache.find(n => n.id === noteId);
    if (!note) return;

    // 1. Switch to the editor view container
    switchView('editor'); // from _app.js
    currentNoteId = noteId; // Set the current note ID immediately

    const editorView = document.getElementById('note-editor-view');
    if (!editorView) return;

    // 2. Build the new editor UI dynamically
    editorView.innerHTML = `
        <div id="note-editor-main">
            <div class="editor-header-actions">
                <button id="editor-back-btn" class="editor-action-btn" title="목록으로 돌아가기"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" /></svg></button>
                <button id="editor-meta-toggle-btn" class="editor-action-btn" title="정보 보기"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z" /></svg></button>
                <button id="editor-delete-btn" class="editor-action-btn" title="메모 삭제"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" /></svg></button>
            </div>
            <input type="text" id="note-title-input" placeholder="제목을 입력하세요...">
            <div id="toast-editor"></div>
        </div>
        <aside id="editor-meta-sidebar">
            <div class="meta-sidebar-header">메모 정보</div>
            <div class="meta-sidebar-content">
                <div class="meta-item">
                    <span class="label">생성일</span>
                    <span class="value" id="meta-created-date"></span>
                </div>
                <div class="meta-item">
                    <span class="label">최종 수정일</span>
                    <span class="value" id="meta-updated-date"></span>
                </div>
                <div class="meta-item">
                    <span class="label">문자/단어 수</span>
                    <span class="value" id="word-count-display">0자 / 0단어</span>
                </div>
                <!-- Tags will go here in a future update -->
            </div>
            <div id="auto-save-status"></div>
        </aside>
    `;

    // 3. Get references to the newly created elements and update global state
    const noteTitleInput = document.getElementById('note-title-input');
    const editorEl = document.getElementById('toast-editor');
    const metaSidebar = document.getElementById('editor-meta-sidebar');
    const wordCountDisplay = document.getElementById('word-count-display');
    autoSaveStatus = document.getElementById('auto-save-status'); // Update global reference

    // 4. Populate initial data and attach event listeners
    noteTitleInput.value = note.title || '';
    noteTitleInput.addEventListener('input', debounce(() => { updateStatus('입력 중...', true); saveNote(); }, 1500));
    noteTitleInput.focus();

    document.getElementById('editor-back-btn').addEventListener('click', () => switchView('list'));
    document.getElementById('editor-meta-toggle-btn').addEventListener('click', () => metaSidebar.classList.toggle('visible'));
    document.getElementById('editor-delete-btn').addEventListener('click', () => deleteNote(noteId));

    const updateWordCount = (content = "") => {
        const charCount = content.length;
        const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
        if(wordCountDisplay) wordCountDisplay.textContent = `${charCount.toLocaleString()}자 / ${wordCount.toLocaleString()}단어`;
    };

    document.getElementById('meta-created-date').textContent = note.createdAt?.toDate().toLocaleString('ko-KR') || '정보 없음';
    document.getElementById('meta-updated-date').textContent = note.updatedAt?.toDate().toLocaleString('ko-KR') || '정보 없음';
    updateWordCount(note.content);

    // 5. Initialize Toast UI Editor
    if (toastEditorInstance) toastEditorInstance.destroy();
    toastEditorInstance = new toastui.Editor({
        el: editorEl,
        initialValue: note.content || '',
        initialEditType: 'wysiwyg',
        previewStyle: 'vertical',
        height: '100%',
        theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light',
        plugins: [[toastui.Editor.plugin.codeSyntaxHighlight, { highlighter: Prism }]],
        events: {
            change: debounce(() => {
                updateStatus('입력 중...', true);
                const content = toastEditorInstance.getMarkdown();
                updateWordCount(content);
                saveNote();
            }, 1500)
        }
    });
}


/**
 * 현재 에디터의 내용을 Firestore에 저장합니다.
 * 제목이 비어있으면 내용에서 자동으로 생성합니다.
 */
function saveNote() {
    if (!currentNoteId || !notesCollectionRef || !toastEditorInstance) return;

    const noteTitleInput = document.getElementById('note-title-input');
    let titleValue = noteTitleInput ? noteTitleInput.value.trim() : '';
    const contentValue = toastEditorInstance.getMarkdown();

    if (titleValue === '' && contentValue.trim() !== '') {
        titleValue = generateTitleFromContent(contentValue);
        if (noteTitleInput) noteTitleInput.value = titleValue; // Update the UI as well
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
            // Update the last modified date in the sidebar
            const metaUpdatedDate = document.getElementById('meta-updated-date');
            if (metaUpdatedDate) metaUpdatedDate.textContent = new Date().toLocaleString('ko-KR');
        })
        .catch(e => {
            console.error("메모 저장 실패:", e);
            updateStatus('저장 실패 ❌', false);
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
    const firstLine = trimmedContent.split('\n')[0].replace(/^[#->\s*]*/, '').trim();
    return firstLine.substring(0, 50) || '무제 노트'; // Limit title length
}
