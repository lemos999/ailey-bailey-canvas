/*
--- Ailey & Bailey Canvas ---
File: js/notes-manager.js
Version: 11.0 (Refactored)
Architect: [Username] & System Architect Ailey
Description: Manages all functionalities related to the Notes App, including CRUD operations, state management for the editor, and UI updates for the notes list.
*/

import * as state from './state.js';
import { showModal } from './ui-manager.js';

// --- Element Cache ---
let noteListView, noteEditorView, notesList, searchInput, backToListBtn,
    noteTitleInput, noteContentTextarea, autoSaveStatus, formatToolbar, linkTopicBtn;

export function initializeNotesManager() {
    noteListView = document.getElementById('note-list-view');
    noteEditorView = document.getElementById('note-editor-view');
    notesList = document.getElementById('notes-list');
    searchInput = document.getElementById('search-input');
    backToListBtn = document.getElementById('back-to-list-btn');
    noteTitleInput = document.getElementById('note-title-input');
    noteContentTextarea = document.getElementById('note-content-textarea');
    autoSaveStatus = document.getElementById('auto-save-status');
    formatToolbar = document.querySelector('.format-toolbar');
    linkTopicBtn = document.getElementById('link-topic-btn');
    
    // --- Event Listeners ---
    const addNewNoteBtn = document.getElementById('add-new-note-btn');
    if (addNewNoteBtn) addNewNoteBtn.addEventListener('click', () => addNote());
    if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
    if (searchInput) searchInput.addEventListener('input', renderNoteList);

    const handleInput = () => {
        updateStatus('입력 중...', true);
        if (state.debounceTimer) clearTimeout(state.debounceTimer);
        state.setDebounceTimer(setTimeout(saveNote, 1000));
    };

    if (noteTitleInput) noteTitleInput.addEventListener('input', handleInput);
    if (noteContentTextarea) noteContentTextarea.addEventListener('input', handleInput);

    if (notesList) {
        notesList.addEventListener('click', e => {
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
    }

    if (formatToolbar) {
        formatToolbar.addEventListener('click', e => {
            const btn = e.target.closest('.format-btn');
            if (btn) applyFormat(btn.dataset.format);
        });
    }

    if (linkTopicBtn) {
        linkTopicBtn.addEventListener('click', () => {
            if(!noteContentTextarea) return;
            const topicTitle = document.title || '현재 학습';
            noteContentTextarea.value += `\n\n🔗 연관 학습: [${topicTitle}]`;
            saveNote();
        });
    }
}

export function handleNotesUpdate(notes) {
    state.setLocalNotesCache(notes);
    const notesAppPanel = document.getElementById('notes-app-panel');
    if (notesAppPanel && notesAppPanel.style.display === 'flex' && noteListView.classList.contains('active')) {
        renderNoteList();
    }
}

export function renderNoteList() {
    if (!notesList || !searchInput) return;

    const searchTerm = searchInput.value.toLowerCase();
    const filteredNotes = state.localNotesCache.filter(note =>
        note.title?.toLowerCase().includes(searchTerm) || note.content?.toLowerCase().includes(searchTerm)
    );

    filteredNotes.sort((a, b) => (b.isPinned - a.isPinned) || (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));

    notesList.innerHTML = filteredNotes.length === 0 ? '<div>표시할 메모가 없습니다.</div>' : '';

    filteredNotes.forEach(note => {
        const item = document.createElement('div');
        item.className = 'note-item';
        item.dataset.id = note.id;
        if (note.isPinned) item.classList.add('pinned');
        
        const title = note.title || '무제';
        const date = note.updatedAt?.toDate().toLocaleString('ko-KR') || '날짜 없음';
        const pinClass = note.isPinned ? 'pinned-active' : '';

        item.innerHTML = `
            <div class="note-item-content">
                <div class="note-item-title">${title}</div>
                <div class="note-item-date">${date}</div>
            </div>
            <div class="note-item-actions">
                <button class="item-action-btn pin-btn ${pinClass}" title="고정">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>
                </button>
                <button class="item-action-btn delete-btn" title="삭제">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z" /></svg>
                </button>
            </div>`;
        notesList.appendChild(item);
    });
}

export async function addNote(content = '') {
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
    } catch (e) {
        console.error("Failed to add a new note:", e);
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
        .then(() => {
            updateStatus('저장됨 ✓', true);
        })
        .catch(e => {
            console.error("Failed to save note:", e);
            updateStatus('저장 실패 ❌', false);
        });
}

function handleDeleteRequest(id) {
    showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => {
        if (state.notesCollection) {
            state.notesCollection.doc(id).delete().catch(e => console.error("Failed to delete note:", e));
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
        if(noteListView) noteListView.classList.remove('active');
        if(noteEditorView) noteEditorView.classList.add('active');
    } else {
        if(noteEditorView) noteEditorView.classList.remove('active');
        if(noteListView) noteListView.classList.add('active');
        state.setCurrentNoteId(null);
    }
}

function openNoteEditor(id) {
    const note = state.localNotesCache.find(n => n.id === id);
    if (note && noteTitleInput && noteContentTextarea) {
        state.setCurrentNoteId(id);
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
}