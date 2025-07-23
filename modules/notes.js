/* --- Module: Notes App Feature --- */
import * as dom from 'https://lemos999.github.io/ailey-bailey-canvas/modules/dom.js';
import { db, notesCollection } from 'https://lemos999.github.io/ailey-bailey-canvas/modules/firebase.js';
import {
    getLocalNotesCache, setLocalNotesCache,
    getCurrentNoteId, setCurrentNoteId,
    getUnsubscribeFromNotes, setUnsubscribeFromNotes,
    getDebounceTimer, setDebounceTimer
} from 'https://lemos999.github.io/ailey-bailey-canvas/modules/state.js';
import { showModal, updateStatus } from 'https://lemos999.github.io/ailey-bailey-canvas/modules/ui.js';

export function listenToNotes() {
    return new Promise(resolve => {
        if (!notesCollection) return resolve();
        let unsubscribe = getUnsubscribeFromNotes();
        if (unsubscribe) unsubscribe();

        unsubscribe = notesCollection.orderBy("updatedAt", "desc").onSnapshot(snapshot => {
            const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLocalNotesCache(notes);
            if (dom.notesAppPanel?.style.display === 'flex') {
                renderNoteList();
            }
            resolve();
        }, error => {
            console.error("노트 데이터 수신 오류:", error);
            resolve();
        });
        setUnsubscribeFromNotes(unsubscribe);
    });
}

export function renderNoteList() {
    if (!dom.notesList || !dom.searchInput) return;
    const searchTerm = dom.searchInput.value.toLowerCase();
    const localNotesCache = getLocalNotesCache();
    const filteredNotes = localNotesCache.filter(note =>
        note.title?.toLowerCase().includes(searchTerm) || note.content?.toLowerCase().includes(searchTerm)
    );

    filteredNotes.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));

    dom.notesList.innerHTML = '';
    if (filteredNotes.length === 0) {
        dom.notesList.innerHTML = '<div>표시할 메모가 없습니다.</div>';
        return;
    }

    filteredNotes.forEach(note => {
        const item = document.createElement('div');
        item.className = 'note-item';
        item.dataset.id = note.id;
        if (note.isPinned) item.classList.add('pinned');

        const dateString = note.updatedAt?.toDate()?.toLocaleString('ko-KR', {
             year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit'
        }) || '날짜 없음';

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
            </div>;
        dom.notesList.appendChild(item);
    });
}

export async function addNote(content = '') {
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
        console.error("새 메모 추가 실패:", e);
    }
}

export function saveNote() {
    let debounceTimer = getDebounceTimer();
    clearTimeout(debounceTimer);
    const currentNoteId = getCurrentNoteId();
    if (!currentNoteId || !notesCollection) return;

    const dataToSave = {
        title: dom.noteTitleInput.value,
        content: dom.noteContentTextarea.value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    notesCollection.doc(currentNoteId).update(dataToSave)
        .then(() => updateStatus('저장됨 ?', true))
        .catch(e => {
            console.error("메모 저장 실패:", e);
            updateStatus('저장 실패 ?', false);
        });
}

export function handleNoteInput() {
    updateStatus('입력 중...', true);
    let debounceTimer = getDebounceTimer();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(saveNote, 1000);
    setDebounceTimer(debounceTimer);
}

export function handleDeleteRequest(noteId) {
    showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => {
        if (notesCollection) {
            notesCollection.doc(noteId).delete().catch(e => console.error("메모 삭제 실패:", e));
        }
    });
}

export async function togglePin(noteId) {
    if (!notesCollection) return;
    const localNotesCache = getLocalNotesCache();
    const note = localNotesCache.find(n => n.id === noteId);
    if (note) {
        await notesCollection.doc(noteId).update({ isPinned: !note.isPinned });
    }
}

export function switchView(view) {
    if (view === 'editor') {
        if(dom.noteListView) dom.noteListView.classList.remove('active');
        if(dom.noteEditorView) dom.noteEditorView.classList.add('active');
    } else {
        if(dom.noteEditorView) dom.noteEditorView.classList.remove('active');
        if(dom.noteListView) dom.noteListView.classList.add('active');
        setCurrentNoteId(null);
    }
}

export function openNoteEditor(noteId) {
    const localNotesCache = getLocalNotesCache();
    const note = localNotesCache.find(n => n.id === noteId);
    if (note && dom.noteTitleInput && dom.noteContentTextarea) {
        setCurrentNoteId(noteId);
        dom.noteTitleInput.value = note.title || '';
        dom.noteContentTextarea.value = note.content || '';
        switchView('editor');
    }
}

export function applyFormat(format) {
    if (!dom.noteContentTextarea) return;
    const start = dom.noteContentTextarea.selectionStart;
    const end = dom.noteContentTextarea.selectionEnd;
    const selectedText = dom.noteContentTextarea.value.substring(start, end);
    const marker = format === 'bold' ? '**' : (format === 'italic' ? '*' : '');
    const newText = \\\\\;
    dom.noteContentTextarea.value = newText;
    dom.noteContentTextarea.focus();
    dom.noteContentTextarea.setSelectionRange(start + marker.length, end + marker.length);
}

export function handleLinkTopic() {
    if(!dom.noteContentTextarea) return;
    const topicTitle = document.title || '현재 학습';
    const cursorPos = dom.noteContentTextarea.selectionStart;
    const textBefore = dom.noteContentTextarea.value.substring(0, cursorPos);
    const textAfter  = dom.noteContentTextarea.value.substring(cursorPos, dom.noteContentTextarea.value.length);
    dom.noteContentTextarea.value = \\n\n?? 연관 학습: [\]\n\n\;
    saveNote();
}
