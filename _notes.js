/*
--- Ailey & Bailey Canvas ---
File: _notes.js
Version: 10.0 (Split)
Description: Handles all logic for the notes application module.
*/

// Note State
let localNotesCache = [];
let currentNoteId = null;
let unsubscribeFromNotes = null;
let debounceTimer = null;


function listenToNotes() {
    return new Promise(resolve => {
        if (!notesCollection) return resolve();
        if (unsubscribeFromNotes) unsubscribeFromNotes();
        unsubscribeFromNotes = notesCollection.orderBy("updatedAt", "desc").onSnapshot(snapshot => {
            localNotesCache = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            if (document.getElementById('notes-app-panel')?.style.display === 'flex') {
                renderNoteList();
            }
            resolve();
        }, error => {
            console.error("노트 수신 오류:", error);
            resolve();
        });
    });
}

function renderNoteList() {
    const notesList = document.getElementById('notes-list');
    const searchInput = document.getElementById('search-input');
    if (!notesList || !searchInput) return;

    const term = searchInput.value.toLowerCase();
    const filtered = localNotesCache.filter(n =>
        n.title?.toLowerCase().includes(term) || n.content?.toLowerCase().includes(term)
    );

    filtered.sort((a,b) => (b.isPinned - a.isPinned) || (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));

    notesList.innerHTML = filtered.length === 0 ? '<div>표시할 메모가 없습니다.</div>' : '';

    filtered.forEach(n => {
        const item = document.createElement('div');
        item.className = 'note-item';
        item.dataset.id = n.id;
        if (n.isPinned) item.classList.add('pinned');
        item.innerHTML = `
            <div class="note-item-content">
                <div class="note-item-title">${n.title||'무제'}</div>
                <div class="note-item-date">${n.updatedAt?.toDate().toLocaleString('ko-KR')||'날짜 없음'}</div>
            </div>
            <div class="note-item-actions">
                <button class="item-action-btn pin-btn ${n.isPinned ? 'pinned-active' : ''}" title="고정">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>
                </button>
                <button class="item-action-btn delete-btn" title="삭제">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z" /></svg>
                </button>
            </div>`;
        notesList.appendChild(item);
    });
}

async function addNote(content = '') {
    if (!notesCollection) return;
    try {
        const ref = await notesCollection.add({
            title: '새 메모',
            content: content,
            isPinned: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        openNoteEditor(ref.id);
    } catch (e) {
        console.error("새 메모 추가 실패:", e);
    }
}

function saveNote() {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (!currentNoteId || !notesCollection) return;

    const noteTitleInput = document.getElementById('note-title-input');
    const noteContentTextarea = document.getElementById('note-content-textarea');
    const autoSaveStatus = document.getElementById('auto-save-status');

    const data = {
        title: noteTitleInput.value,
        content: noteContentTextarea.value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    notesCollection.doc(currentNoteId).update(data)
        .then(() => updateStatus(autoSaveStatus, '저장됨 ✓', true))
        .catch(e => {
            console.error("메모 저장 실패:", e);
            updateStatus(autoSaveStatus, '저장 실패 ❌', false);
        });
}

function handleDeleteRequest(id) {
    showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => {
        if (notesCollection) {
            notesCollection.doc(id).delete().catch(e => console.error("메모 삭제 실패:", e));
        }
    });
}

async function togglePin(id) {
    if (!notesCollection) return;
    const note = localNotesCache.find(n => n.id === id);
    if (note) {
        await notesCollection.doc(id).update({ isPinned: !note.isPinned });
    }
}

function switchView(view) {
    const noteListView = document.getElementById('note-list-view');
    const noteEditorView = document.getElementById('note-editor-view');

    if (view === 'editor') {
        if(noteListView) noteListView.classList.remove('active');
        if(noteEditorView) noteEditorView.classList.add('active');
    } else {
        if(noteEditorView) noteEditorView.classList.remove('active');
        if(noteListView) noteListView.classList.add('active');
        currentNoteId = null;
    }
}

function openNoteEditor(id) {
    const note = localNotesCache.find(n => n.id === id);
    const noteTitleInput = document.getElementById('note-title-input');
    const noteContentTextarea = document.getElementById('note-content-textarea');

    if (note && noteTitleInput && noteContentTextarea) {
        currentNoteId = id;
        noteTitleInput.value = note.title || '';
        noteContentTextarea.value = note.content || '';
        switchView('editor');
    }
}

function applyFormat(fmt) {
    const noteContentTextarea = document.getElementById('note-content-textarea');
    if (!noteContentTextarea) return;
    const s = noteContentTextarea.selectionStart;
    const e = noteContentTextarea.selectionEnd;
    const t = noteContentTextarea.value.substring(s, e);
    const m = fmt === 'bold' ? '**' : (fmt === 'italic' ? '*' : '`');
    noteContentTextarea.value = `${noteContentTextarea.value.substring(0,s)}${m}${t}${m}${noteContentTextarea.value.substring(e)}`;
    noteContentTextarea.focus();
}
