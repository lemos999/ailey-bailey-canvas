/*
 * notes.js: Handles all logic for the Notes App panel.
 */
import * as Dom from '../utils/domElements.js';
import * as State from '../core/state.js';
import { showModal, updateStatus, debounce } from '../utils/helpers.js';

let noteSaveHandler;

export function initializeNotes() {
    noteSaveHandler = debounce(() => saveNote(), 1000);
}

// --- Event Handlers ---
export function handleNotePanelClick(e) {
    const noteItem = e.target.closest('.note-item');
    if (!noteItem) return;
    const id = noteItem.dataset.id;
    if (e.target.closest('.delete-btn')) {
        handleDeleteRequest(id);
    } else if (e.target.closest('.pin-btn')) {
        togglePin(id);
    } else {
        openNoteEditor(id);
    }
}

export function handleNoteInput() {
    updateStatus(Dom.autoSaveStatus, '입력 중...', true);
    noteSaveHandler();
}

export function handleFormat(e) {
    const button = e.target.closest('.format-btn');
    if (button) {
        applyFormat(button.dataset.format);
    }
}

export function handleLinkTopic() {
    if (!Dom.noteContentTextarea) return;
    const topicTitle = document.title || '현재 학습';
    Dom.noteContentTextarea.value += +'\n\n🔗 연관 학습: []'+;
    saveNote();
}


// --- Core Logic ---
export function listenToNotes() {
    return new Promise(resolve => {
        if (!State.notesCollection) return resolve();
        if (State.unsubscribeFromNotes) State.unsubscribeFromNotes();
        const unsubscribe = State.notesCollection.orderBy("updatedAt", "desc").onSnapshot(snapshot => {
            State.setLocalNotesCache(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            if (Dom.notesAppPanel?.style.display === 'flex') {
                renderNoteList();
            }
            resolve();
        }, error => {
            console.error("노트 수신 오류:", error);
            resolve();
        });
        State.setUnsubscribeFromNotes(unsubscribe);
    });
}

export function renderNoteList() {
    if (!Dom.notesList || !Dom.searchInput) return;
    const searchTerm = Dom.searchInput.value.toLowerCase();
    const filteredNotes = State.localNotesCache.filter(note =>
        note.title?.toLowerCase().includes(searchTerm) || note.content?.toLowerCase().includes(searchTerm)
    );
    filteredNotes.sort((a, b) => (b.isPinned - a.isPinned) || (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
    
    Dom.notesList.innerHTML = filteredNotes.length === 0 ? '<div>표시할 메모가 없습니다.</div>' : '';
    
    filteredNotes.forEach(note => {
        const item = document.createElement('div');
        item.className = 'note-item';
        item.dataset.id = note.id;
        if (note.isPinned) item.classList.add('pinned');
        const dateString = note.updatedAt?.toDate().toLocaleString('ko-KR') || '날짜 없음';
        item.innerHTML = +'
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
            </div>
        +';
        Dom.notesList.appendChild(item);
    });
}

export async function addNote(content = '') {
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
    } catch (e) {
        console.error("새 메모 추가 실패:", e);
    }
}

function saveNote() {
    if (!State.currentNoteId || !State.notesCollection) return;
    const dataToSave = {
        title: Dom.noteTitleInput.value,
        content: Dom.noteContentTextarea.value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    State.notesCollection.doc(State.currentNoteId).update(dataToSave)
        .then(() => updateStatus(Dom.autoSaveStatus, '저장됨 ✓', true))
        .catch(e => {
            console.error("메모 저장 실패:", e);
            updateStatus(Dom.autoSaveStatus, '저장 실패 ❌', false);
        });
}

function handleDeleteRequest(id) {
    showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => {
        if (State.notesCollection) {
            State.notesCollection.doc(id).delete().catch(e => console.error("메모 삭제 실패:", e));
        }
    });
}

async function togglePin(id) {
    if (!State.notesCollection) return;
    const note = State.localNotesCache.find(n => n.id === id);
    if (note) {
        await State.notesCollection.doc(id).update({ isPinned: !note.isPinned });
    }
}

export function switchView(view) {
    if (view === 'editor') {
        if (Dom.noteListView) Dom.noteListView.classList.remove('active');
        if (Dom.noteEditorView) Dom.noteEditorView.classList.add('active');
    } else {
        if (Dom.noteEditorView) Dom.noteEditorView.classList.remove('active');
        if (Dom.noteListView) Dom.noteListView.classList.add('active');
        State.setCurrentNoteId(null);
    }
}

function openNoteEditor(id) {
    const note = State.localNotesCache.find(n => n.id === id);
    if (note && Dom.noteTitleInput && Dom.noteContentTextarea) {
        State.setCurrentNoteId(id);
        Dom.noteTitleInput.value = note.title || '';
        Dom.noteContentTextarea.value = note.content || '';
        switchView('editor');
    }
}

function applyFormat(format) {
    if (!Dom.noteContentTextarea) return;
    const start = Dom.noteContentTextarea.selectionStart;
    const end = Dom.noteContentTextarea.selectionEnd;
    const selectedText = Dom.noteContentTextarea.value.substring(start, end);
    const marker = format === 'bold' ? '**' : (format === 'italic' ? '*' : '');
    Dom.noteContentTextarea.value = +'${Dom.noteContentTextarea.value.substring(0, start)}'+;
    Dom.noteContentTextarea.focus();
}

// Backup & Restore
export function exportAllData() {
    if (State.localNotesCache.length === 0 && State.localChatSessionsCache.length === 0 && State.localProjectsCache.length === 0) {
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
        notes: State.localNotesCache.map(processTimestamp),
        chatSessions: State.localChatSessionsCache.map(processTimestamp),
        projects: State.localProjectsCache.map(processTimestamp)
    };
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = +'iley-canvas-backup-.json'+;
    a.click();
    URL.revokeObjectURL(url);
}

export function handleRestoreClick() {
    if (Dom.fileImporter) Dom.fileImporter.click();
}

export async function importAllData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.backupVersion !== '2.0') {
                throw new Error("호환되지 않는 백업 파일 버전입니다.");
            }
            const message = +'파일에서 개의 프로젝트, 개의 채팅, 개의 메모를 발견했습니다. 현재 데이터를 덮어씁니다. 계속하시겠습니까?'+;
            showModal(message, async () => {
                try {
                    updateStatus(Dom.autoSaveStatus, '복원 중...', true);
                    const batch = State.db.batch();
                    const toFirestoreTimestamp = ts => ts ? firebase.firestore.Timestamp.fromDate(new Date(ts)) : firebase.firestore.FieldValue.serverTimestamp();
                    
                    (data.notes || []).forEach(note => { const { id, ...dataToWrite } = note; dataToWrite.createdAt = toFirestoreTimestamp(note.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(note.updatedAt); batch.set(State.notesCollection.doc(id), dataToWrite); });
                    (data.chatSessions || []).forEach(session => { const { id, ...dataToWrite } = session; dataToWrite.createdAt = toFirestoreTimestamp(session.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(session.updatedAt); if (dataToWrite.messages) dataToWrite.messages.forEach(m => m.timestamp = toFirestoreTimestamp(m.timestamp)); batch.set(State.chatSessionsCollectionRef.doc(id), dataToWrite); });
                    (data.projects || []).forEach(project => { const { id, ...dataToWrite } = project; dataToWrite.createdAt = toFirestoreTimestamp(project.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(project.updatedAt); batch.set(State.projectsCollectionRef.doc(id), dataToWrite); });
                    
                    await batch.commit();
                    updateStatus(Dom.autoSaveStatus, '복원 완료 ✓', true);
                    showModal("데이터 복원이 완료되었습니다. 페이지를 새로고침합니다.", () => location.reload());
                } catch (error) {
                    console.error("데이터 복원 실패:", error);
                    updateStatus(Dom.autoSaveStatus, '복원 실패 ❌', false);
                    showModal(+'데이터 복원 중 오류: '+, () => {});
                }
            });
        } catch (error) {
            console.error("File parsing error:", error);
            showModal(+'파일 읽기 오류: '+, () => {});
        } finally {
            event.target.value = null;
        }
    };
    reader.readAsText(file);
}

export async function handleSystemReset() {
    const message = "정말로 이 캔버스의 모든 프로젝트, 채팅, 메모 기록을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.";
    showModal(message, async () => {
        if (!State.db || !State.currentUser) {
            alert("초기화 실패: DB 연결을 확인해주세요.");
            return;
        }
        updateStatus(Dom.autoSaveStatus, "시스템 초기화 중...", true);
        const batch = State.db.batch();
        try {
            const notesSnapshot = await State.notesCollection.get();
            notesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            const chatsSnapshot = await State.chatSessionsCollectionRef.get();
            chatsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            const projectsSnapshot = await State.projectsCollectionRef.get();
            projectsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            
            localStorage.removeItem('userApiSettings');
            localStorage.removeItem('selectedAiModel');

            alert("✅ 모든 데이터가 성공적으로 삭제되었습니다. 페이지를 새로고침하여 시스템을 다시 시작합니다.");
            location.reload();
        } catch (error) {
            console.error("❌ 시스템 초기화 실패:", error);
            alert(+'시스템 초기화 중 오류가 발생했습니다: '+);
            updateStatus(Dom.autoSaveStatus, "초기화 실패 ❌", false);
        }
    });
}
