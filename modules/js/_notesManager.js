/* Module: Notes App Manager */
import * as ui from './_uiElements.js';
import * as state from './_state.js';
import { showModal, updateStatus } from './_utils.js';

export function initializeNotesApp() {
    if (ui.addNewNoteBtn) ui.addNewNoteBtn.addEventListener('click', () => addNote());
    if (ui.backToListBtn) ui.backToListBtn.addEventListener('click', () => switchView('list'));
    if (ui.searchInput) ui.searchInput.addEventListener('input', renderNoteList);
    
    const handleInput = () => {
        updateStatus('입력 중...', true);
        if (state.debounceTimer) clearTimeout(state.debounceTimer);
        const { setDebounceTimer } = require('./_state.js');
        setDebounceTimer(setTimeout(saveNote, 1000));
    };
    
    if (ui.noteTitleInput) ui.noteTitleInput.addEventListener('input', handleInput);
    if (ui.noteContentTextarea) ui.noteContentTextarea.addEventListener('input', handleInput);

    if (ui.notesList) {
        ui.notesList.addEventListener('click', e => {
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

    if (ui.formatToolbar) {
        ui.formatToolbar.addEventListener('click', e => {
            const btn = e.target.closest('.format-btn');
            if (btn) applyFormat(btn.dataset.format);
        });
    }

    if (ui.linkTopicBtn) {
        ui.linkTopicBtn.addEventListener('click', () => {
            if(!ui.noteContentTextarea) return;
            const topicTitle = document.title || '현재 학습';
            ui.noteContentTextarea.value += `\n\n🔗 연관 학습: [${topicTitle}]`;
            saveNote();
        });
    }
}

export function renderNoteList() {
    if (!ui.notesList || !ui.searchInput) return;
    const searchTerm = ui.searchInput.value.toLowerCase();
    const filteredNotes = state.localNotesCache.filter(note =>
        note.title?.toLowerCase().includes(searchTerm) || note.content?.toLowerCase().includes(searchTerm)
    );
    
    filteredNotes.sort((a,b) => (b.isPinned - a.isPinned) || (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));

    ui.notesList.innerHTML = filteredNotes.length === 0 ? '<div>표시할 메모가 없습니다.</div>' : '';
    
    filteredNotes.forEach(note => {
        const item = document.createElement('div');
        item.className = 'note-item';
        item.dataset.id = note.id;
        if (note.isPinned) item.classList.add('pinned');
        item.innerHTML = `
            <div class="note-item-content">
                <div class="note-item-title">${note.title || '무제'}</div>
                <div class="note-item-date">${note.updatedAt?.toDate().toLocaleString('ko-KR') || '날짜 없음'}</div>
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
        ui.notesList.appendChild(item);
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
        console.error("새 메모 추가 실패:", e);
    }
}

function saveNote() {
    if (state.debounceTimer) clearTimeout(state.debounceTimer);
    if (!state.currentNoteId || !state.notesCollection) return;
    
    const dataToSave = {
        title: ui.noteTitleInput.value,
        content: ui.noteContentTextarea.value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    state.notesCollection.doc(state.currentNoteId).update(dataToSave)
        .then(() => updateStatus('저장됨 ✓', true))
        .catch(e => {
            console.error("메모 저장 실패:", e);
            updateStatus('저장 실패 ❌', false);
        });
}

function handleDeleteRequest(id) {
    showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => {
        if (state.notesCollection) {
            state.notesCollection.doc(id).delete().catch(e => console.error("메모 삭제 실패:", e));
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
        if(ui.noteListView) ui.noteListView.classList.remove('active');
        if(ui.noteEditorView) ui.noteEditorView.classList.add('active');
    } else {
        if(ui.noteEditorView) ui.noteEditorView.classList.remove('active');
        if(ui.noteListView) ui.noteListView.classList.add('active');
        state.setCurrentNoteId(null);
    }
}

function openNoteEditor(id) {
    const note = state.localNotesCache.find(n => n.id === id);
    if (note && ui.noteTitleInput && ui.noteContentTextarea) {
        state.setCurrentNoteId(id);
        ui.noteTitleInput.value = note.title || '';
        ui.noteContentTextarea.value = note.content || '';
        switchView('editor');
    }
}

function applyFormat(format) {
    if (!ui.noteContentTextarea) return;
    const start = ui.noteContentTextarea.selectionStart;
    const end = ui.noteContentTextarea.selectionEnd;
    const selectedText = ui.noteContentTextarea.value.substring(start, end);
    const markup = format === 'bold' ? '**' : (format === 'italic' ? '*' : '`');
    const newText = `${ui.noteContentTextarea.value.substring(0, start)}${markup}${selectedText}${markup}${ui.noteContentTextarea.value.substring(end)}`;
    ui.noteContentTextarea.value = newText;
    ui.noteContentTextarea.focus();
}