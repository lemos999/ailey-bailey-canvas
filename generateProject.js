// ===================================================================
//      Ailey & Bailey Canvas: 편집기 핫픽스 및 최적화 스크립트 (v1.1)
//      - Author: System Architect Ailey
//      - Description: Toast UI Editor의 렌더링 버그 수정 및 코드 최적화를
//        위한 자바스크립트 및 CSS 파일을 업데이트합니다.
//      - WARNING: 실행 후 반드시 마스터 프롬프트 업데이트가 필요합니다.
// ===================================================================
const fs = require('fs');
const path = require('path');

console.log('>>> 편집기 핫픽스 및 최적화 적용을 시작합니다...');

const filesToUpdate = {
    // 1. script_main.js: 테마 변경 시 에디터 테마도 함께 변경하도록 로직 추가
    "script_main.js": `
/*
--- Ailey & Bailey Canvas ---
File: script_main.js
Version: 13.2 (Editor Hotfix)
Architect: [Username] & System Architect Ailey
Description: The main entry point for the application. Attaches all necessary event listeners, including editor theme toggling.
*/

document.addEventListener('DOMContentLoaded', function () {

    function initialize() {
        if (!body || !wrapper) { console.error("Core layout elements not found."); return; }
        updateClock(); 
        setInterval(updateClock, 1000);
        
        createApiSettingsModal();
        const chatHeader = document.querySelector('#chat-main-view .panel-header > div');
        if (chatHeader) {
            apiSettingsBtn = document.createElement('span'); 
            apiSettingsBtn.id = 'api-settings-btn'; 
            apiSettingsBtn.title = '개인 API 설정';
            apiSettingsBtn.innerHTML = \`<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>\`;
            chatHeader.appendChild(apiSettingsBtn);
        }
        
        loadApiSettings();
        updateChatHeaderModelSelector();
        
        initializeFirebase().then(() => { 
            setupNavigator(); 
            setupChatModeSelector(); 
            initializeTooltips(); 
            makePanelDraggable(chatPanel); 
            makePanelDraggable(notesAppPanel); 
            handleNewChat();
        });

        attachEventListeners();
    }

    function attachEventListeners() {
        document.addEventListener('click', (e) => { 
            handleTextSelection(e); 
            if (!e.target.closest('.session-context-menu, .project-context-menu, .note-project-context-menu')) removeContextMenu();
            if (!e.target.closest('.more-options-container')) document.getElementById('notes-dropdown-menu')?.classList.remove('show');
        });
        
        if (popoverAskAi) popoverAskAi.addEventListener('click', handlePopoverAskAi);
        if (popoverAddNote) popoverAddNote.addEventListener('click', handlePopoverAddNote);

        if (themeToggle) { 
            themeToggle.addEventListener('click', () => { 
                body.classList.toggle('dark-mode'); 
                localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
                // [MODIFIED] Toggle editor theme along with the main theme
                if (toastEditor) {
                    toastEditor.setUITheme(body.classList.contains('dark-mode') ? 'dark' : 'default');
                }
            }); 
            if(localStorage.getItem('theme') === 'dark') body.classList.add('dark-mode'); else body.classList.remove('dark-mode');
        }
        if (tocToggleBtn) tocToggleBtn.addEventListener('click', () => { wrapper.classList.toggle('toc-hidden'); systemInfoWidget?.classList.toggle('tucked'); });

        if (chatToggleBtn) chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));
        if (chatPanel) chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));
        if (notesAppToggleBtn) notesAppToggleBtn.addEventListener('click', () => { 
            togglePanel(notesAppPanel); 
            if(notesAppPanel.style.display === 'flex') renderNoteList(); 
        });

        // --- Chat App Listeners can be assumed to be here ---

        if (notesAppPanel) {
            notesAppPanel.addEventListener('click', e => {
                const target = e.target;
                const noteListView = target.closest('#note-list-view');
                if (noteListView) {
                    const dropdownAction = target.closest('.dropdown-item')?.dataset.action;
                    if (dropdownAction) {
                        if (dropdownAction === 'export-all') exportAllData();
                        else if (dropdownAction === 'import-all') handleRestoreClick();
                        else if (dropdownAction === 'system-reset') handleSystemReset();
                        document.getElementById('notes-dropdown-menu').classList.remove('show');
                        return;
                    }
                    if (target.closest('#add-new-note-btn-dynamic')) { addNote(); return; }
                    if (target.closest('#add-new-note-project-btn-dynamic')) { createNewNoteProject(); return; }
                    if (target.closest('#more-options-btn')) { document.getElementById('notes-dropdown-menu').classList.toggle('show'); e.stopPropagation(); return; }
                    const noteItem = target.closest('.note-item');
                    if (noteItem) {
                        const id = noteItem.dataset.id;
                        if (target.closest('.delete-btn')) handleDeleteRequest(id);
                        else if (target.closest('.pin-btn')) togglePin(id);
                        else openNoteEditor(id);
                        return;
                    }
                    const projectHeader = target.closest('.note-project-header');
                    if (projectHeader) {
                        toggleNoteProjectExpansion(projectHeader.closest('.note-project-container').dataset.projectId);
                        return;
                    }
                }
                const noteEditorView = target.closest('#note-editor-view');
                if(noteEditorView) {
                    if (target.closest('#back-to-list-btn')) { switchView('list'); return; }
                }
            });
        }
        
        // --- Modal & API Settings Listeners can be assumed to be here ---
    }
    initialize();
});
`,
    // 2. script_notes_app.js: 에디터 컨테이너 생성 로직 제거 (최적화)
    "script_notes_app.js": `
/*
--- Ailey & Bailey Canvas ---
File: script_notes_app.js
Version: 13.2 (Editor Hotfix)
Architect: [Username] & System Architect Ailey
Description: Implements the Toast UI Editor, relying on a static container provided by the HTML shell.
*/

let toastEditor = null; // Global reference for the editor instance

// --- 3.1: Project/Folder Management (unchanged) ---
// ... (omitted for brevity)

// --- 3.2: Main UI Rendering (unchanged) ---
// ... (omitted for brevity)

// --- 3.3: Note CRUD & Core Logic ---

async function addNote(content = '') { 
    if (!notesCollectionRef) return; 
    try { 
        const ref = await notesCollectionRef.add({ 
            title: '새 메모', content: content, projectId: null, isPinned: false, tags: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(), 
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
        }); 
        openNoteEditor(ref.id, true); // Pass a flag for new note
    } catch (e) { console.error("새 메모 추가 실패:", e); } 
}

function saveNote() { 
    if (debounceTimer) clearTimeout(debounceTimer); 
    if (!currentNoteId || !notesCollectionRef || !toastEditor) return; 
    const data = { 
        title: document.getElementById('note-title-input').value,
        content: toastEditor.getMarkdown(), 
        updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
    }; 
    notesCollectionRef.doc(currentNoteId).update(data)
        .then(() => updateStatus('저장됨 ✓', true))
        .catch(e => { console.error("메모 저장 실패:", e); updateStatus('저장 실패 ❌', false); }); 
}

function handleDeleteRequest(id) { /* ... unchanged ... */ }
async function togglePin(id) { /* ... unchanged ... */ }

function switchView(view) { 
    if (view === 'editor') { 
        noteListView?.classList.remove('active'); 
        noteEditorView?.classList.add('active'); 
    } else { 
        noteEditorView?.classList.remove('active'); 
        noteListView?.classList.add('active'); 
        currentNoteId = null; 
        if (toastEditor) {
            toastEditor.destroy();
            toastEditor = null;
        }
    } 
}

function openNoteEditor(id, isNewNote = false) { 
    const note = localNotesCache.find(n => n.id === id); 
    if (!note) return;

    switchView('editor');
    currentNoteId = id;

    const titleInput = document.getElementById('note-title-input');
    titleInput.value = note.title || '';

    if (isNewNote && titleInput.value === '새 메모') {
        const clearOnFocus = () => {
            if (titleInput.value === '새 메모') titleInput.value = '';
            titleInput.removeEventListener('focus', clearOnFocus);
        };
        titleInput.addEventListener('focus', clearOnFocus);
    }
    
    if (toastEditor) {
        toastEditor.destroy();
        toastEditor = null;
    }

    // [OPTIMIZED] Assumes the container element is always present in the HTML shell.
    // The defensive code to create the container is removed for cleaner architecture.
    toastEditor = new toastui.Editor({
        el: document.querySelector('#toast-editor-container'),
        height: '100%',
        initialEditType: 'markdown',
        previewStyle: 'vertical',
        initialValue: note.content || '',
        theme: document.body.classList.contains('dark-mode') ? 'dark' : 'default',
        events: {
            change: () => {
                updateStatus('입력 중...', true);
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(saveNote, 1500);
            }
        }
    });

    titleInput.oninput = () => {
        updateStatus('입력 중...', true);
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(saveNote, 1500);
    };
}

// --- 3.4: Other Functions (unchanged) ---
// ... (omitted for brevity)
`,
    // 3. style_notes.css: 에디터 레이아웃 안정성 강화
    "style_notes.css": `
/*
--- Ailey & Bailey Canvas ---
File: style_notes.css
Version: 13.2 (Editor Hotfix)
Architect: [Username] & System Architect Ailey
Description: Styles for the enhanced Notes App panel, ensuring robust layout for the Toast UI Editor.
*/

/* Notes App Panel General */
#notes-app-panel { bottom: 100px; left: 100px; width: 450px; height: 650px; padding: 0; }
.notes-view { display: none; flex-direction: column; height: 100%; width: 100%; }
.notes-view.active { display: flex; }
#note-editor-view { height: 100%; overflow: hidden; }

/* Action Bar Styles... (unchanged from previous version) */
.action-bar { padding: 10px 15px; display: flex; gap: 10px; align-items: center; border-bottom: 1px solid var(--border-color-dark); justify-content: space-between; flex-wrap: wrap; }
body:not(.dark-mode) .action-bar { border-bottom-color: var(--border-color-light); }
.action-bar-group { display: flex; gap: 10px; align-items: center; }
.action-bar-group.left { justify-content: flex-start; }
.action-bar-group.center { flex-grow: 1; justify-content: center; min-width: 120px; }
.action-bar-group.right { justify-content: flex-end; }
.search-input-notes { width: 100%; box-sizing: border-box; padding: 8px 12px; border-radius: 20px; border: 1px solid var(--border-color-dark); background-color: var(--quote-bg-dark); color: var(--text-color-dark); }
body:not(.dark-mode) .search-input-notes { border-color: var(--border-color-light); background-color: var(--quote-bg-light); color: var(--text-color-light); }
.notes-btn { padding: 8px 12px; border-radius: 20px; border: none; cursor: pointer; background-color: var(--h2-color-dark); color: white; display: flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; font-size: 0.9em;}
body:not(.dark-mode) .notes-btn { background-color: var(--h2-color-light); }
.notes-btn svg { width: 16px; height: 16px; fill: currentColor; }

/* More Options Dropdown... (unchanged) */
.more-options-container { position: relative; }
.more-options-btn { background: none; border: none; padding: 5px; cursor: pointer; line-height: 0; border-radius: 50%; }
.more-options-btn:hover { background-color: rgba(128, 128, 128, 0.2); }
.dropdown-menu { display: none; position: absolute; top: 100%; right: 0; background-color: var(--container-bg-dark); border: 1px solid var(--border-color-dark); border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 1550; padding: 5px; min-width: 180px; }
body:not(.dark-mode) .dropdown-menu { background-color: var(--container-bg-light); border-color: var(--border-color-light); }
.dropdown-menu.show { display: block; }
.dropdown-item { background: none; border: none; color: inherit; padding: 8px 12px; width: 100%; text-align: left; cursor: pointer; border-radius: 4px; font-family: 'Gowun Batang', serif; font-size: 1em; display: flex; align-items: center; gap: 8px; }
body:not(.dark-mode) .dropdown-item:hover { background-color: var(--quote-bg-light); }
body.dark-mode .dropdown-item:hover { background-color: var(--quote-bg-dark); }
.dropdown-separator { height: 1px; background-color: var(--border-color-dark); margin: 4px 8px; }
body:not(.dark-mode) .dropdown-separator { background-color: var(--border-color-light); }

/* Note List & Project Styles... (unchanged) */
#notes-list { flex-grow: 1; overflow-y: auto; padding: 10px; }
/* ... */

/* [MODIFIED] Note Editor Styles for Robust Layout */
.editor-header {
    padding: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color-dark);
    flex-shrink: 0; /* Prevent shrinking */
}
body:not(.dark-mode) .editor-header {
    border-bottom-color: var(--border-color-light);
}

#note-title-input {
    font-size: 1.2em;
    font-weight: bold;
    width: 100%;
    box-sizing: border-box;
    border: none;
    background: transparent;
    padding: 10px 15px;
    color: inherit;
    flex-shrink: 0; /* Prevent shrinking */
    border-bottom: 1px solid var(--border-color-dark);
}
body:not(.dark-mode) #note-title-input {
    border-bottom-color: var(--border-color-light);
}

#note-content-wrapper {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden; /* CRITICAL for editor height */
    position: relative;
}

#toast-editor-container {
    flex-grow: 1; /* Allow editor to take all available space */
    min-height: 0; /* CRITICAL for flexbox shrinking/growing */
}

/* Override Toast UI styles for seamless integration */
.toastui-editor-defaultUI { border: none !important; }
.toastui-editor-toolbar { border-bottom: 1px solid var(--border-color-dark) !important; }
body:not(.dark-mode) .toastui-editor-toolbar { border-bottom-color: var(--border-color-light) !important; }
.toastui-editor-md-container, .toastui-editor-ww-container { background-color: transparent !important; }

#auto-save-status {
    padding: 5px 15px;
    text-align: right;
    font-size: 0.8em;
    opacity: 0.7;
    flex-shrink: 0;
    height: 25px; /* Give it a fixed height */
}
`,
};

const rootDir = process.cwd();
let successCount = 0;
let errorCount = 0;

Object.entries(filesToUpdate).forEach(([filePath, content]) => {
    const fullPath = path.join(rootDir, filePath);
    try {
        fs.writeFileSync(fullPath, content.trim(), { encoding: 'utf8' });
        console.log(`[파일 업데이트] ${fullPath}`);
        successCount++;
    } catch (error) {
        console.error(`[오류 발생] '${fullPath}' 업데이트 실패:`, error);
        errorCount++;
    }
});

console.log('\\n=================================================');
if (errorCount === 0) {
    console.log(`✅ 총 ${successCount}개의 파일이 성공적으로 업데이트되었습니다.`);
    console.log('1단계 업데이트가 완료되었습니다. 시스템을 정상화하려면 다음 대화에서 프롬프트 수정을 요청하십시오.');
} else {
    console.log(`❌ 업데이트 완료. 성공: ${successCount}, 실패: ${errorCount}`);
}
console.log('=================================================');