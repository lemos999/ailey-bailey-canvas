/*
--- Ailey & Bailey Canvas ---
File: script_notes_app.js
Version: 11.0 (Modular JS Structure)
Architect: [Username] & System Architect Ailey
Description: Contains all JavaScript logic for the Notes App panel, including CRUD operations (Create, Read, Update, Delete), UI rendering (note list, editor), view switching, search, and data import/export functions.
*/

// --- 3. Function Definitions (Notes App) ---

function renderNoteList() { 
    if (!notesList || !searchInput) return; 
    const term = searchInput.value.toLowerCase(); 
    const filtered = localNotesCache.filter(n => n.title?.toLowerCase().includes(term) || n.content?.toLowerCase().includes(term)); 
    filtered.sort((a,b) => (b.isPinned - a.isPinned) || (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0)); 
    notesList.innerHTML = filtered.length === 0 ? '<div>표시할 메모가 없습니다.</div>' : ''; 
    filtered.forEach(n => { 
        const i = document.createElement('div'); 
        i.className = 'note-item'; 
        i.dataset.id = n.id; 
        if (n.isPinned) i.classList.add('pinned'); 
        i.innerHTML = `<div class="note-item-content"><div class="note-item-title">${n.title||'무제'}</div><div class="note-item-date">${n.updatedAt?.toDate().toLocaleString('ko-KR')||'날짜 없음'}</div></div><div class="note-item-actions"><button class="item-action-btn pin-btn ${n.isPinned?'pinned-active':''}" title="고정"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg></button><button class="item-action-btn delete-btn" title="삭제"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z" /></svg></button></div>`; 
        notesList.appendChild(i); 
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
    const data = { 
        title: noteTitleInput.value, 
        content: noteContentTextarea.value, 
        updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
    }; 
    notesCollection.doc(currentNoteId).update(data)
        .then(() => updateStatus('저장됨 ✓', true))
        .catch(e => { 
            console.error("메모 저장 실패:", e); 
            updateStatus('저장 실패 ❌', false); 
        }); 
}

function handleDeleteRequest(id) { 
    showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => { 
        if (notesCollection) notesCollection.doc(id).delete().catch(e => console.error("메모 삭제 실패:", e)); 
    }); 
}

async function togglePin(id) { 
    if (!notesCollection) return; 
    const note = localNotesCache.find(n => n.id === id); 
    if (note) await notesCollection.doc(id).update({ isPinned: !note.isPinned }); 
}

function switchView(view) { 
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
    if (note && noteTitleInput && noteContentTextarea) { 
        currentNoteId = id; 
        noteTitleInput.value = note.title || ''; 
        noteContentTextarea.value = note.content || ''; 
        switchView('editor'); 
    } 
}

async function handleSystemReset() {
    const message = "정말로 이 캔버스의 모든 프로젝트, 채팅, 메모 기록을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.";
    showModal(message, async () => {
        if (!db || !currentUser) { alert("초기화 실패: DB 연결을 확인해주세요."); return; }
        updateStatus("시스템 초기화 중...", true);
        const batch = db.batch();
        try {
            const notesSnapshot = await notesCollection.get();
            notesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            const chatsSnapshot = await chatSessionsCollectionRef.get();
            chatsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            const projectsSnapshot = await projectsCollectionRef.get();
            projectsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            
            localStorage.removeItem('userApiSettings');
            localStorage.removeItem('selectedAiModel');

            alert("✅ 모든 데이터가 성공적으로 삭제되었습니다. 페이지를 새로고침하여 시스템을 다시 시작합니다.");
            location.reload();
        } catch (error) { console.error("❌ 시스템 초기화 실패:", error); alert(`시스템 초기화 중 오류가 발생했습니다: ${error.message}`); updateStatus("초기화 실패 ❌", false); }
    });
}

function exportAllData() { 
    if (localNotesCache.length === 0 && localChatSessionsCache.length === 0 && localProjectsCache.length === 0) { 
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
        notes: localNotesCache.map(processTimestamp), 
        chatSessions: localChatSessionsCache.map(processTimestamp), 
        projects: localProjectsCache.map(processTimestamp) 
    }; 
    const str = JSON.stringify(dataToExport, null, 2); 
    const blob = new Blob([str], { type: 'application/json' }); 
    const url = URL.createObjectURL(blob); 
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `ailey-canvas-backup-${new Date().toISOString().slice(0, 10)}.json`; 
    a.click(); 
    URL.revokeObjectURL(url); 
}

function handleRestoreClick() { 
    if (fileImporter) fileImporter.click(); 
}

async function importAllData(event) {
    const file = event.target.files[0]; 
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.backupVersion !== '2.0') { throw new Error("호환되지 않는 백업 파일 버전입니다."); }
            const message = `파일에서 ${data.projects?.length||0}개의 프로젝트, ${data.chatSessions?.length||0}개의 채팅, ${data.notes?.length||0}개의 메모를 발견했습니다. 현재 데이터를 덮어씁니다. 계속하시겠습니까?`;
            showModal(message, async () => {
                try {
                    updateStatus('복원 중...', true);
                    const batch = db.batch();
                    const toFirestoreTimestamp = ts => ts ? firebase.firestore.Timestamp.fromDate(new Date(ts)) : firebase.firestore.FieldValue.serverTimestamp();
                    (data.notes || []).forEach(note => { const { id, ...dataToWrite } = note; dataToWrite.createdAt = toFirestoreTimestamp(note.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(note.updatedAt); batch.set(notesCollection.doc(id), dataToWrite); });
                    (data.chatSessions || []).forEach(session => { const { id, ...dataToWrite } = session; dataToWrite.createdAt = toFirestoreTimestamp(session.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(session.updatedAt); if(dataToWrite.messages) dataToWrite.messages.forEach(m=>m.timestamp=toFirestoreTimestamp(m.timestamp)); batch.set(chatSessionsCollectionRef.doc(id), dataToWrite); });
                    (data.projects || []).forEach(project => { const { id, ...dataToWrite } = project; dataToWrite.createdAt = toFirestoreTimestamp(project.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(project.updatedAt); batch.set(projectsCollectionRef.doc(id), dataToWrite); });
                    await batch.commit();
                    updateStatus('복원 완료 ✓', true);
                    showModal("데이터 복원이 완료되었습니다. 페이지를 새로고침합니다.", () => location.reload());
                } catch (error) { console.error("데이터 복원 실패:", error); updateStatus('복원 실패 ❌', false); showModal(`데이터 복원 중 오류: ${error.message}`, () => {}); }
            });
        } catch (error) { console.error("File parsing error:", error); showModal(`파일 읽기 오류: ${error.message}`, () => {}); }
        finally { event.target.value = null; }
    };
    reader.readAsText(file);
}