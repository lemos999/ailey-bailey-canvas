/*
--- Ailey & Bailey Canvas ---
File: js/notes-manager.js
Version: 11.0 (Refactored)
Description: Manages all functionalities related to the Notes App feature,
including CRUD operations, rendering the note list, and handling editor interactions.
*/

import * as state from './state.js';
import { showModal } from './ui-manager.js';

// Element references for this module
let notesAppPanel, noteListView, noteEditorView, notesList, searchInput,
    addNewNoteBtn, backToListBtn, noteTitleInput, noteContentTextarea,
    autoSaveStatus, formatToolbar, linkTopicBtn, exportNotesBtn,
    systemResetBtn, restoreDataBtn, fileImporter;

export function initializeNotesManager() {
    // Query elements once on initialization
    notesAppPanel = document.getElementById('notes-app-panel');
    noteListView = document.getElementById('note-list-view');
    noteEditorView = document.getElementById('note-editor-view');
    notesList = document.getElementById('notes-list');
    searchInput = document.getElementById('search-input');
    addNewNoteBtn = document.getElementById('add-new-note-btn');
    backToListBtn = document.getElementById('back-to-list-btn');
    noteTitleInput = document.getElementById('note-title-input');
    noteContentTextarea = document.getElementById('note-content-textarea');
    autoSaveStatus = document.getElementById('auto-save-status');
    formatToolbar = document.querySelector('.format-toolbar');
    linkTopicBtn = document.getElementById('link-topic-btn');
    exportNotesBtn = document.getElementById('export-notes-btn');
    systemResetBtn = document.getElementById('system-reset-btn');
    restoreDataBtn = document.getElementById('restore-data-btn');
    fileImporter = document.getElementById('file-importer');

    // Attach event listeners for notes functionality
    if (addNewNoteBtn) addNewNoteBtn.addEventListener('click', () => addNote());
    if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
    if (searchInput) searchInput.addEventListener('input', renderNoteList);
    if (notesList) notesList.addEventListener('click', handleNoteListClick);

    const handleInput = () => {
        updateStatus('입력 중...', true);
        if (state.debounceTimer) clearTimeout(state.debounceTimer);
        state.setDebounceTimer(setTimeout(saveNote, 1000));
    };

    if (noteTitleInput) noteTitleInput.addEventListener('input', handleInput);
    if (noteContentTextarea) noteContentTextarea.addEventListener('input', handleInput);

    if (formatToolbar) formatToolbar.addEventListener('click', handleFormatToolbarClick);
    if (linkTopicBtn) linkTopicBtn.addEventListener('click', handleLinkTopic);
    
    // Backup, Restore, Reset listeners
    if (exportNotesBtn) exportNotesBtn.addEventListener('click', exportAllData);
    if (restoreDataBtn) restoreDataBtn.addEventListener('click', () => fileImporter?.click());
    if (fileImporter) fileImporter.addEventListener('change', importAllData);
    if (systemResetBtn) systemResetBtn.addEventListener('click', handleSystemReset);
}

export function handlePopoverAddNote() {
    if (!state.lastSelectedText) return;
    addNote(`> ${state.lastSelectedText}\n\n`);
    const selectionPopover = document.getElementById('selection-popover');
    if (selectionPopover) selectionPopover.style.display = 'none';
}

function handleNoteListClick(event) {
    const noteItem = event.target.closest('.note-item');
    if (!noteItem) return;

    const noteId = noteItem.dataset.id;
    if (event.target.closest('.delete-btn')) {
        handleDeleteRequest(noteId);
    } else if (event.target.closest('.pin-btn')) {
        togglePin(noteId);
    } else {
        openNoteEditor(noteId);
    }
}

export function renderNoteList() {
    if (!notesList || !searchInput) return;

    const searchTerm = searchInput.value.toLowerCase();
    const filteredNotes = state.localNotesCache.filter(note =>
        note.title?.toLowerCase().includes(searchTerm) ||
        note.content?.toLowerCase().includes(searchTerm)
    );

    filteredNotes.sort((a, b) => (b.isPinned - a.isPinned) || (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));

    notesList.innerHTML = ''; // Clear previous list
    if (filteredNotes.length === 0) {
        notesList.innerHTML = '<div>표시할 메모가 없습니다.</div>';
        return;
    }

    filteredNotes.forEach(note => {
        const item = document.createElement('div');
        item.className = 'note-item';
        item.dataset.id = note.id;
        if (note.isPinned) item.classList.add('pinned');

        const dateString = note.updatedAt?.toDate().toLocaleString('ko-KR') || '날짜 없음';
        const title = note.title || '무제';

        item.innerHTML = `
            <div class="note-item-content">
                <div class="note-item-title">${title}</div>
                <div class="note-item-date">${dateString}</div>
            </div>
            <div class="note-item-actions">
                <button class="item-action-btn pin-btn ${note.isPinned ? 'pinned-active' : ''}" title="고정">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>
                </button>
                <button class="item-action-btn delete-btn" title="삭제">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z" /></svg>
                </button>
            </div>
        `;
        notesList.appendChild(item);
    });
}

async function addNote(content = '') {
    if (!state.notesCollection) return;
    try {
        const newNoteRef = await state.notesCollection.add({
            title: '새 메모',
            content: content,
            isPinned: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        openNoteEditor(newNoteRef.id);
    } catch (error) {
        console.error("Failed to add new note:", error);
    }
}

function saveNote() {
    if (state.debounceTimer) clearTimeout(state.debounceTimer);
    if (!state.currentNoteId || !state.notesCollection) return;

    const dataToSave = {
        title: noteTitleInput.value,
        content: noteContentTextarea.value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    state.notesCollection.doc(state.currentNoteId).update(dataToSave)
        .then(() => updateStatus('저장됨 ✓', true))
        .catch(error => {
            console.error("Failed to save note:", error);
            updateStatus('저장 실패 ❌', false);
        });
}

function handleDeleteRequest(noteId) {
    showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => {
        if (state.notesCollection) {
            state.notesCollection.doc(noteId).delete().catch(e => console.error("메모 삭제 실패:", e));
        }
    });
}

async function togglePin(noteId) {
    if (!state.notesCollection) return;
    const note = state.localNotesCache.find(n => n.id === noteId);
    if (note) {
        await state.notesCollection.doc(noteId).update({ isPinned: !note.isPinned });
    }
}

function switchView(view) {
    if (view === 'editor') {
        if (noteListView) noteListView.classList.remove('active');
        if (noteEditorView) noteEditorView.classList.add('active');
    } else {
        if (noteEditorView) noteEditorView.classList.remove('active');
        if (noteListView) noteListView.classList.add('active');
        state.setCurrentNoteId(null);
    }
}

function openNoteEditor(noteId) {
    const note = state.localNotesCache.find(n => n.id === noteId);
    if (note && noteTitleInput && noteContentTextarea) {
        state.setCurrentNoteId(noteId);
        noteTitleInput.value = note.title || '';
        noteContentTextarea.value = note.content || '';
        switchView('editor');
    }
}

function updateStatus(message, isSuccess) {
    if (!autoSaveStatus) return;
    autoSaveStatus.textContent = message;
    autoSaveStatus.style.color = isSuccess ? 'lightgreen' : 'lightcoral';
    setTimeout(() => {
        autoSaveStatus.textContent = '';
    }, 3000);
}

function handleFormatToolbarClick(event) {
    const button = event.target.closest('.format-btn');
    if (button) {
        applyFormat(button.dataset.format);
    }
}

function applyFormat(format) {
    if (!noteContentTextarea) return;
    const start = noteContentTextarea.selectionStart;
    const end = noteContentTextarea.selectionEnd;
    const selectedText = noteContentTextarea.value.substring(start, end);

    const marker = format === 'bold' ? '**' : (format === 'italic' ? '*' : '`');
    const newText = `${marker}${selectedText}${marker}`;

    noteContentTextarea.value = `${noteContentTextarea.value.substring(0, start)}${newText}${noteContentTextarea.value.substring(end)}`;
    noteContentTextarea.focus();
}

function handleLinkTopic() {
    if (!noteContentTextarea) return;
    const topicTitle = document.title || '현재 학습';
    const linkText = `\n\n🔗 연관 학습: [${topicTitle}]`;
    noteContentTextarea.value += linkText;
    saveNote();
}

// --- System Reset, Backup, Restore ---
async function handleSystemReset() {
    const message = "정말로 이 캔버스의 모든 프로젝트, 채팅, 메모 기록을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.";
    showModal(message, async () => {
        if (!state.db || !state.currentUser) { alert("초기화 실패: DB 연결을 확인해주세요."); return; }
        updateStatus("시스템 초기화 중...", true);
        const batch = state.db.batch();
        try {
            const notesSnapshot = await state.notesCollection.get();
            notesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            const chatsSnapshot = await state.chatSessionsCollectionRef.get();
            chatsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            const projectsSnapshot = await state.projectsCollectionRef.get();
            projectsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            
            localStorage.removeItem('userApiSettings');
            localStorage.removeItem('selectedAiModel');

            alert("✅ 모든 데이터가 성공적으로 삭제되었습니다. 페이지를 새로고침하여 시스템을 다시 시작합니다.");
            location.reload();
        } catch (error) { 
            console.error("❌ 시스템 초기화 실패:", error); 
            alert(`시스템 초기화 중 오류가 발생했습니다: ${error.message}`); 
            updateStatus("초기화 실패 ❌", false); 
        }
    });
}

function exportAllData() { 
    if (state.localNotesCache.length === 0 && state.localChatSessionsCache.length === 0 && state.localProjectsCache.length === 0) { 
        showModal("백업할 데이터가 없습니다.", () => {}); 
        return; 
    } 
    const processTimestamp = (item) => { 
        const newItem = { ...item }; 
        if (newItem.createdAt?.toDate) newItem.createdAt = newItem.createdAt.toDate().toISOString(); 
        if (newItem.updatedAt?.toDate) newItem.updatedAt = newItem.updatedAt.toDate().toISOString(); 
        if (Array.isArray(newItem.messages)) { 
            newItem.messages = newItem.messages.map(msg => { 
                const newMsg = { ...msg }; 
                if (newMsg.timestamp?.toDate) newMsg.timestamp = newMsg.timestamp.toDate().toISOString(); 
                return newMsg; 
            }); 
        } 
        return newItem; 
    }; 
    const dataToExport = { 
        backupVersion: '2.0', 
        backupDate: new Date().toISOString(), 
        notes: state.localNotesCache.map(processTimestamp), 
        chatSessions: state.localChatSessionsCache.map(processTimestamp), 
        projects: state.localProjectsCache.map(processTimestamp) 
    }; 
    const str = JSON.stringify(dataToExport, null, 2); 
    const blob = new Blob([str], { type: 'application/json' }); 
    const url = URL.createObjectURL(blob); 
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `ailey-canvas-backup-${new Date().toISOString().slice(0, 10)}.json`; 
    a.click(); 
    URL.revokeObjectURL(url); 
}

async function importAllData(event) {
    const file = event.target.files[0]; 
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.backupVersion !== '2.0') { throw new Error("호환되지 않는 백업 파일 버전입니다."); }
            const message = `파일에서 ${data.projects?.length||0}개의 프로젝트, ${data.chatSessions?.length||0}개의 채팅, ${data.notes?.length||0}개의 메모를 발견했습니다. 현재 데이터를 덮어씁니다. 계속하시겠습니까?`;
            showModal(message, async () => {
                try {
                    updateStatus('복원 중...', true);
                    const batch = state.db.batch();
                    const toFirestoreTimestamp = ts => ts ? firebase.firestore.Timestamp.fromDate(new Date(ts)) : firebase.firestore.FieldValue.serverTimestamp();
                    (data.notes || []).forEach(note => { const { id, ...dataToWrite } = note; dataToWrite.createdAt = toFirestoreTimestamp(note.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(note.updatedAt); batch.set(state.notesCollection.doc(id), dataToWrite); });
                    (data.chatSessions || []).forEach(session => { const { id, ...dataToWrite } = session; dataToWrite.createdAt = toFirestoreTimestamp(session.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(session.updatedAt); if(dataToWrite.messages) dataToWrite.messages.forEach(m=>m.timestamp=toFirestoreTimestamp(m.timestamp)); batch.set(state.chatSessionsCollectionRef.doc(id), dataToWrite); });
                    (data.projects || []).forEach(project => { const { id, ...dataToWrite } = project; dataToWrite.createdAt = toFirestoreTimestamp(project.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(project.updatedAt); batch.set(state.projectsCollectionRef.doc(id), dataToWrite); });
                    await batch.commit();
                    updateStatus('복원 완료 ✓', true);
                    showModal("데이터 복원이 완료되었습니다. 페이지를 새로고침합니다.", () => location.reload());
                } catch (error) { console.error("데이터 복원 실패:", error); updateStatus('복원 실패 ❌', false); showModal(`데이터 복원 중 오류: ${error.message}`, () => {}); }
            });
        } catch (error) { console.error("File parsing error:", error); showModal(`파일 읽기 오류: ${error.message}`, () => {}); }
        finally { event.target.value = null; }
    };
    reader.readAsText(file);
}