/*
--- Ailey & Bailey Canvas ---
File: js/ui/notes.js
Version: 11.0 (Modular)
Description: Handles all logic for the Notes App panel, including Firestore integration.
*/

import { getState, setState, updateState } from '../core/state.js';
import { noteListView, noteEditorView, notesList, searchInput, noteTitleInput, noteContentTextarea } from '../utils/domElements.js';
import { showModal, updateStatus } from '../utils/helpers.js';

/**
 * Listens for real-time updates to the notes collection in Firestore.
 */
export function listenToNotes() {
    const { notesCollection } = getState();
    if (!notesCollection) return;

    const unsubscribe = notesCollection.orderBy("updatedAt", "desc").onSnapshot(snapshot => {
        const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setState({ localNotesCache: notes });
        
        // Only re-render if the notes panel is currently visible
        const notesAppPanel = document.getElementById('notes-app-panel');
        if (notesAppPanel?.style.display === 'flex') {
            renderNoteList();
        }
    }, error => {
        console.error("Error listening to notes:", error);
    });
    
    updateState('unsubscribeFromNotes', unsubscribe);
}

/**
 * Renders the list of notes based on the local cache and search term.
 */
export function renderNoteList() {
    if (!notesList || !searchInput) return;

    const { localNotesCache } = getState();
    const searchTerm = searchInput.value.toLowerCase();

    const filtered = localNotesCache.filter(note => 
        note.title?.toLowerCase().includes(searchTerm) || 
        note.content?.toLowerCase().includes(searchTerm)
    );

    // Sort by pinned status first, then by date
    filtered.sort((a, b) => (b.isPinned - a.isPinned) || (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));

    notesList.innerHTML = filtered.length === 0 ? '<div>표시할 메모가 없습니다.</div>' : '';

    filtered.forEach(note => {
        const item = document.createElement('div');
        item.className = 'note-item';
        item.dataset.id = note.id;
        if (note.isPinned) item.classList.add('pinned');

        const dateString = note.updatedAt?.toDate().toLocaleString('ko-KR') || '날짜 정보 없음';

        item.innerHTML = 
            <div class="note-item-content">
                <div class="note-item-title">\</div>
                <div class="note-item-date">\</div>
            </div>
            <div class="note-item-actions">
                <button class="item-action-btn pin-btn \" title="고정">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>
                </button>
                <button class="item-action-btn delete-btn" title="삭제">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z" /></svg>
                </button>
            </div>
        ;
        notesList.appendChild(item);
    });
}

/**
 * Adds a new note to Firestore and opens the editor.
 * @param {string} [content=''] - Initial content for the new note.
 */
export async function addNote(content = '') {
    const { notesCollection } = getState();
    if (!notesCollection) return;
    try {
        const newNoteRef = await notesCollection.add({
            title: '새 메모',
            content: content,
            isPinned: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        openNoteEditor(newNoteRef.id);
    } catch (e) {
        console.error("Failed to add new note:", e);
    }
}

/**
 * Saves the currently edited note to Firestore.
 */
function saveNote() {
    let { debounceTimer, currentNoteId, notesCollection } = getState();
    if (debounceTimer) clearTimeout(debounceTimer);
    if (!currentNoteId || !notesCollection) return;

    const data = {
        title: noteTitleInput.value,
        content: noteContentTextarea.value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    notesCollection.doc(currentNoteId).update(data)
        .then(() => updateStatus('저장됨 ?', true))
        .catch(e => {
            console.error("Note save failed:", e);
            updateStatus('저장 실패 ?', false);
        });
}

/**
 * Debounces the save note function.
 */
export function handleNoteInput() {
    let { debounceTimer } = getState();
    updateStatus('입력 중...', true);
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(saveNote, 1000);
    updateState('debounceTimer', debounceTimer);
}

/**
 * Shows a confirmation modal before deleting a note.
 * @param {string} id - The ID of the note to delete.
 */
function handleDeleteRequest(id) {
    const { notesCollection } = getState();
    showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => {
        if (notesCollection) {
            notesCollection.doc(id).delete().catch(e => console.error("Note deletion failed:", e));
        }
    });
}

/**
 * Toggles the pinned status of a note.
 * @param {string} id - The ID of the note to pin/unpin.
 */
async function togglePin(id) {
    const { notesCollection, localNotesCache } = getState();
    if (!notesCollection) return;
    const note = localNotesCache.find(n => n.id === id);
    if (note) {
        await notesCollection.doc(id).update({ isPinned: !note.isPinned });
    }
}

/**
 * Switches between the note list and editor views.
 * @param {'list'|'editor'} view - The view to switch to.
 */
export function switchView(view) {
    if (view === 'editor') {
        if(noteListView) noteListView.classList.remove('active');
        if(noteEditorView) noteEditorView.classList.add('active');
    } else {
        if(noteEditorView) noteEditorView.classList.remove('active');
        if(noteListView) noteListView.classList.add('active');
        updateState('currentNoteId', null);
    }
}

/**
 * Opens the note editor for a specific note.
 * @param {string} id - The ID of the note to edit.
 */
export function openNoteEditor(id) {
    const { localNotesCache } = getState();
    const note = localNotesCache.find(n => n.id === id);
    if (note && noteTitleInput && noteContentTextarea) {
        updateState('currentNoteId', id);
        noteTitleInput.value = note.title || '';
        noteContentTextarea.value = note.content || '';
        switchView('editor');
    }
}

/**
 * Handles clicks within the notes list for editing, deleting, or pinning.
 * @param {Event} e - The click event.
 */
export function handleNotesListClick(e) {
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
}

/**
 * Applies markdown formatting to the selected text in the note content textarea.
 * @param {'bold'|'italic'|'code'} format - The format to apply.
 */
export function applyFormat(format) {
    if (!noteContentTextarea) return;
    
    const start = noteContentTextarea.selectionStart;
    const end = noteContentTextarea.selectionEnd;
    const selectedText = noteContentTextarea.value.substring(start, end);
    const marker = format === 'bold' ? '**' : (format === 'italic' ? '*' : '');
    
    noteContentTextarea.value = 
        \\\\\;
    
    noteContentTextarea.focus();
    noteContentTextarea.selectionEnd = end + (2 * marker.length);
}

/**
 * Links the current learning topic to the note.
 */
export function linkTopicToNote() {
    if(!noteContentTextarea) return;
    const topicTitle = document.title || '현재 학습';
    const linkMarkdown = \n\n?? 연관 학습: [\];
    noteContentTextarea.value += linkMarkdown;
    saveNote();
}
