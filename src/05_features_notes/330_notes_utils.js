/*
--- Ailey & Bailey Canvas ---
File: 330_notes_utils.js
Version: 1.0 (Bundled)
Description: Provides utility functions for the Notes App, such as data backup and restoration.
*/

function exportAllData() {
    const allCaches = [localNotesCache, localNoteProjectsCache, localChatSessionsCache, localProjectsCache];
    if (allCaches.every(cache => cache.length === 0)) { 
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
        backupVersion: '4.0',
        backupDate: new Date().toISOString(), 
        notes: localNotesCache.map(processTimestamp), 
        noteProjects: localNoteProjectsCache.map(processTimestamp),
        chatSessions: localChatSessionsCache.map(processTimestamp), 
        projects: localProjectsCache.map(processTimestamp) 
    };

    const str = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([str], { type: 'application/json' }); 
    const url = URL.createObjectURL(blob); 
    
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `ailey-canvas-backup-${new Date().toISOString().slice(0, 10)}.json`; 
    document.body.appendChild(a);
    a.click(); 
    document.body.removeChild(a);
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
            const supportedVersions = ['2.0', '3.0', '4.0'];
            if (!data.backupVersion || !supportedVersions.includes(data.backupVersion)) { 
                throw new Error(`호환되지 않는 백업 파일 버전입니다. (${supportedVersions.join(', ')} 지원)`); 
            }

            const message = `파일(${data.backupVersion}v)에서 채팅 폴더 ${data.projects?.length||0}개, 채팅 ${data.chatSessions?.length||0}개, 메모 폴더 ${data.noteProjects?.length||0}개, 메모 ${data.notes?.length||0}개를 발견했습니다. 현재 데이터를 덮어씁니다. 계속하시겠습니까?`;
            
            showModal(message, async () => {
                try {
                    updateStatus('복원 중...', true);
                    const batch = db.batch();
                    const toFirestoreTimestamp = ts => ts ? firebase.firestore.Timestamp.fromDate(new Date(ts)) : firebase.firestore.FieldValue.serverTimestamp();
                    
                    (data.notes || []).forEach(note => { const { id, ...dataToWrite } = note; dataToWrite.createdAt = toFirestoreTimestamp(note.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(note.updatedAt); batch.set(notesCollectionRef.doc(id), dataToWrite); });
                    (data.noteProjects || []).forEach(project => { const { id, ...dataToWrite } = project; dataToWrite.createdAt = toFirestoreTimestamp(project.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(project.updatedAt); batch.set(noteProjectsCollectionRef.doc(id), dataToWrite); });
                    (data.chatSessions || []).forEach(session => { const { id, ...dataToWrite } = session; dataToWrite.createdAt = toFirestoreTimestamp(session.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(session.updatedAt); if(dataToWrite.messages) dataToWrite.messages.forEach(m=>m.timestamp=toFirestoreTimestamp(m.timestamp)); batch.set(chatSessionsCollectionRef.doc(id), dataToWrite); });
                    (data.projects || []).forEach(project => { const { id, ...dataToWrite } = project; dataToWrite.createdAt = toFirestoreTimestamp(project.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(project.updatedAt); batch.set(projectsCollectionRef.doc(id), dataToWrite); });
                    
                    await batch.commit();
                    updateStatus('복원 완료 ✓', true);
                    showModal("데이터 복원이 완료되었습니다. 페이지를 새로고침합니다.", () => location.reload());
                } catch (error) { 
                    console.error("데이터 복원 실패:", error); 
                    updateStatus('복원 실패 ❌', false); 
                    showModal(`데이터 복원 중 오류: ${error.message}`, () => {}); 
                } 
            });
        } catch (error) { 
            console.error("File parsing error:", error); 
            showModal(`파일 읽기 오류: ${error.message}`, () => {}); 
        } finally { 
            event.target.value = null;
        }
    };
    reader.readAsText(file);
}

async function handleSystemReset() {
    const message = "정말로 이 캔버스의 모든 데이터를 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.";
    showModal(message, async () => {
        if (!db || !currentUser) { 
            alert("초기화 실패: DB 연결을 확인해주세요."); 
            return; 
        }
        updateStatus("시스템 초기화 중...", true);
        
        const collectionsToDelete = [
            notesCollectionRef, noteProjectsCollectionRef, chatSessionsCollectionRef,
            projectsCollectionRef, tagsCollectionRef, noteTemplatesCollectionRef
        ];

        try {
            const batch = db.batch();
            for (const ref of collectionsToDelete) {
                if (ref) {
                    const snapshot = await ref.get();
                    snapshot.docs.forEach(doc => batch.delete(doc.ref));
                }
            }
            await batch.commit();
            
            localStorage.clear();
            alert("✅ 모든 데이터가 성공적으로 삭제되었습니다. 페이지를 새로고침하여 시스템을 다시 시작합니다.");
            location.reload();
        } catch (error) { 
            console.error("❌ 시스템 초기화 실패:", error); 
            alert(`시스템 초기화 중 오류가 발생했습니다: ${error.message}`); 
            updateStatus("초기화 실패 ❌", false); 
        }
    });
}