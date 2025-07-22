/*
--- Ailey & Bailey Canvas ---
File: notes-module.js
Version: 11.1 (Critical Bugfix Release)
Architect: [Username] & System Architect CodeMaster
Description: This version fixes a critical bug where the notes database collection was not being properly initialized within this module, causing all note-related functionalities to fail. The initialization logic has been correctly placed.
*/

import { state } from './state.js';
import { showModal, togglePanel } from './ui-helpers.js';

// --- Element Declarations ---
let notesAppPanel, notesAppToggleBtn, noteListView, noteEditorView, notesList, searchInput,
    addNewNoteBtn, backToListBtn, noteTitleInput, noteContentTextarea,
    autoSaveStatus, formatToolbar, linkTopicBtn, popoverAddNote;

function queryElements() {
    notesAppPanel = document.getElementById('notes-app-panel');
    notesAppToggleBtn = document.getElementById('notes-app-toggle-btn');
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
    popoverAddNote = document.getElementById('popover-add-note');
}

export function initializeNotesModule() {
    queryElements();

    if (!notesAppPanel) return false;

    // [FIXED] Correctly initialize the notes collection reference within its own module.
    const userPath = `artifacts/${state.appId}/users/${state.auth.currentUser.uid}`;
    state.notesCollection = state.db.collection(`${userPath}/notes`);

    setupEventListeners();
    listenToNotes();

    return true;
}

function setupEventListeners() {
    if (notesAppToggleBtn) notesAppToggleBtn.addEventListener('click', () => {
        togglePanel(notesAppPanel);
        if (notesAppPanel.style.display === 'flex') {
            renderNoteList();
        }
    });

    if (addNewNoteBtn) addNewNoteBtn.addEventListener('click', () => addNote());
    if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
    if (searchInput) searchInput.addEventListener('input', renderNoteList);
    if (popoverAddNote) popoverAddNote.addEventListener('click', handlePopoverAddNote);

    const handleInput = () => {
        updateStatus('입력 중...', true);
        if (state.debounceTimer) clearTimeout(state.debounceTimer);
        state.debounceTimer = setTimeout(saveNote, 1000);
    };

    if (noteTitleInput) noteTitleInput.addEventListener('input', handleInput);
    if (noteContentTextarea) noteContentTextarea.addEventListener('input', handleInput);

    if (notesList) notesList.addEventListener('click', e => {
        const item = e.target.closest('.note-item');
        if (!item) return;
        const id = item.dataset.id;
        if (e.target.closest('.delete-btn')) {
            handleDeleteRequest(id);
        } else if (e.target.closest('.pin-btn')) {
            togglePin(id);
        } else {
            openNoteEditor(id);
        }
    });
    
    if (formatToolbar) formatToolbar.addEventListener('click', e => {
        const btn = e.target.closest('.format-btn');
        if (btn) applyFormat(btn.dataset.format);
    });

    if (linkTopicBtn) linkTopicBtn.addEventListener('click', () => {
        if (!noteContentTextarea) return;
        const topicTitle = document.title || '현재 학습';
        const linkText = `\n\n🔗 연관 학습: [${topicTitle}]`;
        noteContentTextarea.value += linkText;
        saveNote();
    });
}

function listenToNotes() {
    if (!state.notesCollection) return;
    if (state.unsubscribeFromNotes) state.unsubscribeFromNotes();

    state.unsubscribeFromNotes = state.notesCollection.orderBy("updatedAt", "desc").onSnapshot(snapshot => {
        state.localNotesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (document.getElementById('notes-app-panel')?.style.display === 'flex' && noteListView?.classList.contains('active')) {
            renderNoteList();
        }
    }, error => {
        console.error("Notes listener error:", error);
    });
}

function renderNoteList() {
    if (!notesList || !searchInput) return;

    const searchTerm = searchInput.value.toLowerCase();
    const filteredNotes = state.localNotesCache.filter(note =>
        note.title?.toLowerCase().includes(searchTerm) || note.content?.toLowerCase().includes(searchTerm)
    );

    filteredNotes.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));

    notesList.innerHTML = filteredNotes.length === 0 ? '<div>표시할 메모가 없습니다.</div>' : '';
    
    const fragment = document.createDocumentFragment();
    filteredNotes.forEach(note => {
        const item = document.createElement('div');
        item.className = 'note-item';
        item.dataset.id = note.id;
        if (note.isPinned) item.classList.add('pinned');

        const dateString = note.updatedAt?.toDate().toLocaleString('ko-KR') || '날짜 없음';

        item.innerHTML = `
            <div class="note-item-content">
                <div class="note-item-title">${note.title || '무제'}</div>
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
        fragment.appendChild(item);
    });
    notesList.appendChild(fragment);
}

async function addNote(content = '') {
    if (!state.notesCollection) {
        alert("노트 기능을 사용할 수 없습니다. DB 연결을 확인해주세요.");
        return;
    }
    try {
        const newNoteRef = await state.notesCollection.add({
            title: '새 메모',
            content: content,
            isPinned: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        togglePanel(notesAppPanel, true);
        openNoteEditor(newNoteRef.id);
    } catch (e) {
        console.error("Failed to add new note:", e);
        alert("새 메모 추가에 실패했습니다.");
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
        .catch(e => {
            console.error("Failed to save note:", e);
            updateStatus('저장 실패 ❌', false);
        });
}

function handleDeleteRequest(id) {
    showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => {
        if (state.notesCollection) {
            state.notesCollection.doc(id).delete().catch(e => {
                console.error("Failed to delete note:", e);
                alert("메모 삭제에 실패했습니다.");
            });
        }
    });
}

async function togglePin(id) {
    if (!state.notesCollection) return;
    const note = state.localNotesCache.find(n => n.id === id);
    if (note) {
        await state.notesCollection.doc(id).update({ isPinned: !note.isPinned });
    }
}

function switchView(view) {
    if (view === 'editor') {
        if (noteListView) noteListView.classList.remove('active');
        if (noteEditorView) noteEditorView.classList.add('active');
    } else {
        if (noteEditorView) noteEditorView.classList.remove('active');
        if (noteListView) noteListView.classList.add('active');
        state.currentNoteId = null;
        renderNoteList(); // Switch back to list and re-render
    }
}

function openNoteEditor(id) {
    const note = state.localNotesCache.find(n => n.id === id);
    if (note && noteTitleInput && noteContentTextarea) {
        state.currentNoteId = id;
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

function applyFormat(format) {
    if (!noteContentTextarea) return;
    const start = noteContentTextarea.selectionStart;
    const end = noteContentTextarea.selectionEnd;
    const selectedText = noteContentTextarea.value.substring(start, end);

    const marker = format === 'bold' ? '**' : (format === 'italic' ? '*' : '`');

    noteContentTextarea.value = 
        `${noteContentTextarea.value.substring(0, start)}` +
        `${marker}${selectedText}${marker}` +
        `${noteContentTextarea.value.substring(end)}`;
    
    noteContentTextarea.focus();
    noteContentTextarea.selectionEnd = end + (2 * marker.length);
}

function handlePopoverAddNote() {
    if (!state.lastSelectedText) return;
    const contentToAdd = `> ${state.lastSelectedText}\n\n`;
    addNote(contentToAdd);
    if (document.getElementById('selection-popover')) {
         document.getElementById('selection-popover').style.display = 'none';
    }
}
