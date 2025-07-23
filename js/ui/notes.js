// js/ui/notes.js
// 노트 앱의 모든 기능을 관리합니다: CRUD, 렌더링, 이벤트 처리 등.

import * as DOM from '../utils/domElements.js';
import * as State from '../core/state.js';
import { showModal, updateStatus } from './modals.js';

/**
 * 노트 앱의 모든 이벤트 리스너를 설정합니다.
 */
export function initializeNotes() {
    if (DOM.addNewNoteBtn) DOM.addNewNoteBtn.addEventListener('click', () => addNote());
    if (DOM.backToListBtn) DOM.backToListBtn.addEventListener('click', () => switchView('list'));
    if (DOM.searchInput) DOM.searchInput.addEventListener('input', renderNoteList);
    
    const handleInput = () => {
        updateStatus('입력 중...', true);
        if (State.debounceTimer) clearTimeout(State.debounceTimer);
        const timer = setTimeout(saveNote, 1000);
        State.setDebounceTimer(timer);
    };

    if (DOM.noteTitleInput) DOM.noteTitleInput.addEventListener('input', handleInput);
    if (DOM.noteContentTextarea) DOM.noteContentTextarea.addEventListener('input', handleInput);

    if (DOM.notesList) {
        DOM.notesList.addEventListener('click', e => {
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
    
    if (DOM.formatToolbar) {
        DOM.formatToolbar.addEventListener('click', e => {
            const btn = e.target.closest('.format-btn');
            if (btn) applyFormat(btn.dataset.format);
        });
    }

    if (DOM.linkTopicBtn) {
        DOM.linkTopicBtn.addEventListener('click', () => {
            if(!DOM.noteContentTextarea) return;
            const title = document.title || '현재 학습';
            DOM.noteContentTextarea.value += \n\n?? 연관 학습: [];
            saveNote();
        });
    }
}

/**
 * Firestore에서 노트 목록을 실시간으로 수신 대기합니다.
 * @returns {Promise<void>}
 */
export function listenToNotes() {
    return new Promise(resolve => {
        if (!State.notesCollection) return resolve();
        if (State.unsubscribeFromNotes) State.unsubscribeFromNotes();
        
        const unsub = State.notesCollection.orderBy("updatedAt", "desc").onSnapshot(snapshot => {
            const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            State.setLocalNotesCache(notes);
            if (document.getElementById('notes-app-panel')?.style.display === 'flex') {
                renderNoteList();
            }
            resolve();
        }, error => {
            console.error("노트 수신 오류:", error);
            resolve();
        });
        
        State.setUnsubscribers({ ...State, unsubscribeFromNotes: unsub });
    });
}

/**
 * 노트 목록을 화면에 렌더링합니다. 검색어와 고정 상태를 반영합니다.
 */
export function renderNoteList() {
    if (!DOM.notesList || !DOM.searchInput) return;

    const searchTerm = DOM.searchInput.value.toLowerCase();
    const filteredNotes = State.localNotesCache.filter(note => 
        note.title?.toLowerCase().includes(searchTerm) || 
        note.content?.toLowerCase().includes(searchTerm)
    );

    filteredNotes.sort((a, b) => (b.isPinned - a.isPinned) || (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));

    DOM.notesList.innerHTML = filteredNotes.length === 0 ? '<div>표시할 메모가 없습니다.</div>' : '';

    filteredNotes.forEach(note => {
        const item = document.createElement('div');
        item.className = 'note-item';
        item.dataset.id = note.id;
        if (note.isPinned) item.classList.add('pinned');

        item.innerHTML = 
            <div class="note-item-content">
                <div class="note-item-title"></div>
                <div class="note-item-date"></div>
            </div>
            <div class="note-item-actions">
                <button class="item-action-btn pin-btn " title="고정">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>
                </button>
                <button class="item-action-btn delete-btn" title="삭제">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z" /></svg>
                </button>
            </div>;
        DOM.notesList.appendChild(item);
    });
}

/**
 * 새 노트를 생성하고 에디터 뷰를 엽니다.
 * @param {string} content - 새 노트의 초기 콘텐츠
 */
async function addNote(content = '') {
    if (!State.notesCollection) return;
    try {
        const newNoteRef = await State.notesCollection.add({
            title: '새 메모',
            content: content,
            isPinned: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        openNoteEditor(newNoteRef.id);
    } catch (error) {
        console.error("새 메모 추가 실패:", error);
    }
}

/**
 * 현재 노트의 변경사항을 Firestore에 저장합니다.
 */
function saveNote() {
    if (State.debounceTimer) clearTimeout(State.debounceTimer);
    if (!State.currentNoteId || !State.notesCollection) return;

    const dataToSave = {
        title: DOM.noteTitleInput.value,
        content: DOM.noteContentTextarea.value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    State.notesCollection.doc(State.currentNoteId).update(dataToSave)
        .then(() => updateStatus('저장됨 ?', true))
        .catch(error => {
            console.error("메모 저장 실패:", error);
            updateStatus('저장 실패 ?', false);
        });
}

/**
 * 노트 삭제 확인 모달을 띄웁니다.
 * @param {string} id - 삭제할 노트 ID
 */
function handleDeleteRequest(id) {
    showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => {
        if (State.notesCollection) {
            State.notesCollection.doc(id).delete().catch(e => console.error("메모 삭제 실패:", e));
        }
    });
}

/**
 * 노트의 고정 상태를 토글합니다.
 * @param {string} id - 고정 상태를 변경할 노트 ID
 */
async function togglePin(id) {
    if (!State.notesCollection) return;
    const note = State.localNotesCache.find(n => n.id === id);
    if (note) {
        await State.notesCollection.doc(id).update({ isPinned: !note.isPinned });
    }
}

/**
 * 노트 앱의 뷰를 전환합니다 (목록 ↔ 에디터).
 * @param {'list' | 'editor'} view - 전환할 뷰
 */
function switchView(view) {
    if (view === 'editor') {
        if(DOM.noteListView) DOM.noteListView.classList.remove('active');
        if(DOM.noteEditorView) DOM.noteEditorView.classList.add('active');
    } else {
        if(DOM.noteEditorView) DOM.noteEditorView.classList.remove('active');
        if(DOM.noteListView) DOM.noteListView.classList.add('active');
        State.setCurrentNoteId(null);
    }
}

/**
 * 특정 노트를 에디터 뷰에서 엽니다.
 * @param {string} id - 열 노트의 ID
 */
function openNoteEditor(id) {
    const note = State.localNotesCache.find(n => n.id === id);
    if (note && DOM.noteTitleInput && DOM.noteContentTextarea) {
        State.setCurrentNoteId(id);
        DOM.noteTitleInput.value = note.title || '';
        DOM.noteContentTextarea.value = note.content || '';
        switchView('editor');
    }
}

/**
 * 노트 에디터에서 텍스트 서식을 적용합니다.
 * @param {'bold' | 'italic' | 'code'} format - 적용할 서식
 */
function applyFormat(format) {
    if (!DOM.noteContentTextarea) return;
    const start = DOM.noteContentTextarea.selectionStart;
    const end = DOM.noteContentTextarea.selectionEnd;
    const selectedText = DOM.noteContentTextarea.value.substring(start, end);
    const marker = format === 'bold' ? '**' : (format === 'italic' ? '*' : '');
    const newText = ${DOM.noteContentTextarea.value.substring(0, start)};
    DOM.noteContentTextarea.value = newText;
    DOM.noteContentTextarea.focus();
}
