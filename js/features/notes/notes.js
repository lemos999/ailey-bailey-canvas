import { state, setState } from '../../core/state.js';
import { dom } from '../../ui/dom.js';
import { showModal, updateStatus, togglePanel } from '../../core/utils.js';
import { renderNoteList, switchView, openNoteEditor, initializeNotesUI } from './ui.js';

export function listenToNotes() {
    return new Promise(resolve => {
        if (!state.notesCollection) return resolve();
        if (state.unsubscribeFromNotes) state.unsubscribeFromNotes();
        const unsub = state.notesCollection.orderBy("updatedAt", "desc").onSnapshot(s => {
            setState('localNotesCache', s.docs.map(d => ({ id: d.id, ...d.data() })));
            if (dom.notesAppPanel?.style.display === 'flex' && dom.noteListView?.classList.contains('active')) {
                renderNoteList();
            }
            resolve();
        }, e => { console.error("노트 수신 오류:", e); resolve(); });
        setState('unsubscribeFromNotes', unsub);
    });
}

export async function addNote(content = '') {
    if (!state.notesCollection) return;
    try {
        const ref = await state.notesCollection.add({
            title: '새 메모',
            content: content,
            isPinned: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        togglePanel(dom.notesAppPanel, true);
        openNoteEditor(ref.id);
    } catch (e) { console.error("새 메모 추가 실패:", e); }
}

export function saveNote() {
    if (state.debounceTimer) clearTimeout(state.debounceTimer);
    if (!state.currentNoteId || !state.notesCollection) return;
    const data = {
        title: dom.noteTitleInput.value || '무제',
        content: dom.noteContentTextarea.value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    state.notesCollection.doc(state.currentNoteId).update(data)
        .then(() => updateStatus('저장됨 ?', true))
        .catch(e => { console.error("메모 저장 실패:", e); updateStatus('저장 실패 ?', false); });
}

function handleDeleteRequest(id) {
    showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => {
        if (state.notesCollection) {
            state.notesCollection.doc(id).delete().catch(e => console.error("메모 삭제 실패:", e));
            if (id === state.currentNoteId) {
                switchView('list');
            }
        }
    });
}

async function togglePin(id) {
    if (!state.notesCollection) return;
    const note = state.localNotesCache.find(n => n.id === id);
    if (note) await state.notesCollection.doc(id).update({ isPinned: !note.isPinned });
}

function exportAllData() {
    if (state.localNotesCache.length === 0 && state.localChatSessionsCache.length === 0 && state.localProjectsCache.length === 0) {
        showModal("백업할 데이터가 없습니다.", () => {}); return;
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
    a.download = iley-canvas-backup-.json;
    a.click();
    URL.revokeObjectURL(url);
}

async function importAllData(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.backupVersion || data.backupVersion !== '2.0') { throw new Error("호환되지 않는 백업 파일 버전입니다."); }
            const message = 파일에서 개의 프로젝트, 개의 채팅, 개의 메모를 발견했습니다. 현재 데이터를 덮어씁니다. 계속하시겠습니까?;
            showModal(message, async () => {
                try {
                    updateStatus('복원 중...', true);
                    const batch = state.db.batch();
                    const toFirestoreTimestamp = ts => ts ? firebase.firestore.Timestamp.fromDate(new Date(ts)) : firebase.firestore.FieldValue.serverTimestamp();
                    
                    (data.notes || []).forEach(note => { const { id, ...dataToWrite } = note; dataToWrite.createdAt = toFirestoreTimestamp(note.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(note.updatedAt); batch.set(state.notesCollection.doc(id), dataToWrite); });
                    (data.chatSessions || []).forEach(session => { const { id, ...dataToWrite } = session; dataToWrite.createdAt = toFirestoreTimestamp(session.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(session.updatedAt); if(dataToWrite.messages) dataToWrite.messages.forEach(m=>m.timestamp=toFirestoreTimestamp(m.timestamp)); batch.set(state.chatSessionsCollectionRef.doc(id), dataToWrite); });
                    (data.projects || []).forEach(project => { const { id, ...dataToWrite } = project; dataToWrite.createdAt = toFirestoreTimestamp(project.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(project.updatedAt); batch.set(state.projectsCollectionRef.doc(id), dataToWrite); });
                    
                    await batch.commit();
                    updateStatus('복원 완료 ?', true);
                    showModal("데이터 복원이 완료되었습니다. 페이지를 새로고침합니다.", () => location.reload());
                } catch (error) { console.error("데이터 복원 실패:", error); updateStatus('복원 실패 ?', false); showModal(데이터 복원 중 오류: , () => {}); }
            });
        } catch (error) { console.error("File parsing error:", error); showModal(파일 읽기 오류: , () => {}); }
        finally { event.target.value = null; }
    };
    reader.readAsText(file);
}

async function handleSystemReset() {
    showModal("정말로 이 캔버스의 모든 데이터를 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.", async () => {
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
            
            alert("? 모든 데이터가 성공적으로 삭제되었습니다. 새로고침합니다.");
            location.reload();
        } catch (error) { console.error("? 시스템 초기화 실패:", error); alert(초기화 오류: ); }
    });
}


export function initializeNotesApp() {
    initializeNotesUI(handleDeleteRequest, togglePin, addNote);

    const handleInput = () => {
        updateStatus('입력 중...', true);
        if (state.debounceTimer) clearTimeout(state.debounceTimer);
        const timer = setTimeout(saveNote, 1000);
        setState('debounceTimer', timer);
    };

    if (dom.noteTitleInput) dom.noteTitleInput.addEventListener('input', handleInput);
    if (dom.noteContentTextarea) dom.noteContentTextarea.addEventListener('input', handleInput);

    // Backup & Restore
    if (dom.exportNotesBtn) dom.exportNotesBtn.addEventListener('click', exportAllData);
    if (dom.restoreDataBtn) dom.restoreDataBtn.addEventListener('click', () => dom.fileImporter.click());
    if (dom.fileImporter) dom.fileImporter.addEventListener('change', importAllData);
    if (dom.systemResetBtn) dom.systemResetBtn.addEventListener('click', handleSystemReset);
}
