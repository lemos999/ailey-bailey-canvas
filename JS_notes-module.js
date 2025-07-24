/* --- JS_notes-module.js --- */
import { notesCollection } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_firebase-config.js';
import {
    getLocalNotesCache, setLocalNotesCache,
    getCurrentNoteId, setCurrentNoteId,
    getUnsubscribeFromNotes, setUnsubscribeFromNotes,
    getDebounceTimer, setDebounceTimer
} from 'https://lemos999.github.io/ailey-bailey-canvas/JS_state.js';
import { showModal, updateStatus } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_ui-helpers.js';

function getNotesDomElements() {
    return {
        notesAppPanel: document.getElementById('notes-app-panel'),
        noteListView: document.getElementById('note-list-view'),
        noteEditorView: document.getElementById('note-editor-view'),
        notesList: document.getElementById('notes-list'),
        searchInput: document.getElementById('search-input'),
        addNewNoteBtn: document.getElementById('add-new-note-btn'),
        backToListBtn: document.getElementById('back-to-list-btn'),
        noteTitleInput: document.getElementById('note-title-input'),
        noteContentTextarea: document.getElementById('note-content-textarea'),
        autoSaveStatus: document.getElementById('auto-save-status'),
        formatToolbar: document.querySelector('.format-toolbar'),
        linkTopicBtn: document.getElementById('link-topic-btn'),
    };
}

export function listenToNotes() {
    return new Promise(resolve => {
        if (!notesCollection) return resolve();
        let unsubscribe = getUnsubscribeFromNotes();
        if (unsubscribe) unsubscribe();

        unsubscribe = notesCollection.orderBy("updatedAt", "desc").onSnapshot(snapshot => {
            const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLocalNotesCache(notes);
            const dom = getNotesDomElements();
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

function renderNoteList() {
    const dom = getNotesDomElements();
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

function saveNote() {
    const dom = getNotesDomElements();
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
        .then(() => updateStatus(dom.autoSaveStatus, '저장됨 ?', true))
        .catch(e => {
            console.error("메모 저장 실패:", e);
            updateStatus(dom.autoSaveStatus, '저장 실패 ?', false);
        });
}

export function handleNoteInput() {
    const dom = getNotesDomElements();
    updateStatus(dom.autoSaveStatus, '입력 중...', true);
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

function switchView(view) {
    const dom = getNotesDomElements();
    if (view === 'editor') {
        if(dom.noteListView) dom.noteListView.classList.remove('active');
        if(dom.noteEditorView) dom.noteEditorView.classList.add('active');
    } else {
        if(dom.noteEditorView) dom.noteEditorView.classList.remove('active');
        if(dom.noteListView) dom.noteListView.classList.add('active');
        setCurrentNoteId(null);
    }
}

function openNoteEditor(noteId) {
    const dom = getNotesDomElements();
    const localNotesCache = getLocalNotesCache();
    const note = localNotesCache.find(n => n.id === noteId);
    if (note && dom.noteTitleInput && dom.noteContentTextarea) {
        setCurrentNoteId(noteId);
        dom.noteTitleInput.value = note.title || '';
        dom.noteContentTextarea.value = note.content || '';
        switchView('editor');
    }
}

export function handleNotePanelClick(event) {
    const item = event.target.closest('.note-item');
    if (!item) return;
    const id = item.dataset.id;
    if (event.target.closest('.delete-btn')) handleDeleteRequest(id);
    else if (event.target.closest('.pin-btn')) togglePin(id);
    else openNoteEditor(id);
}

export function handleFormatRequest(event) {
    const btn = event.target.closest('.format-btn');
    if (btn) {
        const dom = getNotesDomElements();
        const textarea = dom.noteContentTextarea;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        const marker = btn.dataset.format === 'bold' ? '**' : (btn.dataset.format === 'italic' ? '*' : '');
        const newText = \\\\\;
        textarea.value = newText;
        textarea.focus();
        textarea.setSelectionRange(start + marker.length, end + marker.length);
    }
}

export function handleLinkTopic() {
    const dom = getNotesDomElements();
    if(!dom.noteContentTextarea) return;
    const topicTitle = document.title || '현재 학습';
    const cursorPos = dom.noteContentTextarea.selectionStart;
    const textBefore = dom.noteContentTextarea.value.substring(0, cursorPos);
    const textAfter  = dom.noteContentTextarea.value.substring(cursorPos, dom.noteContentTextarea.value.length);
    dom.noteContentTextarea.value = \\n\n?? 연관 학습: [\]\n\n\;
    saveNote();
}

export function initializeNotes() {
    const dom = getNotesDomElements();
    dom.addNewNoteBtn?.addEventListener('click', () => addNote());
    dom.backToListBtn?.addEventListener('click', () => switchView('list'));
    dom.searchInput?.addEventListener('input', renderNoteList);
    dom.noteTitleInput?.addEventListener('input', handleNoteInput);
    dom.noteContentTextarea?.addEventListener('input', handleNoteInput);
    dom.notesList?.addEventListener('click', handleNotePanelClick);
    dom.formatToolbar?.addEventListener('click', handleFormatRequest);
    dom.linkTopicBtn?.addEventListener('click', handleLinkTopic);
}
