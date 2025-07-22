/*
--- Ailey & Bailey Canvas ---
File: system-data.js
Version: 12.0 (Chat Module Refactor)
Architect: [Username] & System Architect CodeMaster
Description: This module handles system-wide data management tasks such as resetting all user data, and exporting/importing backups. It interacts with multiple data collections (notes, chats, projects).
*/

import { state } from './state.js';
import { showModal } from './ui-helpers.js';

let systemResetBtn, exportNotesBtn, restoreDataBtn, fileImporter;

export function initializeSystemData() {
    queryElements();
    setupEventListeners();
}

function queryElements() {
    systemResetBtn = document.getElementById('system-reset-btn');
    exportNotesBtn = document.getElementById('export-notes-btn');
    restoreDataBtn = document.getElementById('restore-data-btn');
    fileImporter = document.getElementById('file-importer');
}

function setupEventListeners() {
    if (systemResetBtn) systemResetBtn.addEventListener('click', handleSystemReset);
    if (exportNotesBtn) exportNotesBtn.addEventListener('click', exportAllData);
    if (restoreDataBtn) restoreDataBtn.addEventListener('click', () => fileImporter?.click());
    if (fileImporter) fileImporter.addEventListener('change', importAllData);
}

async function handleSystemReset() {
    const message = "정말로 이 캔버스의 모든 프로젝트, 채팅, 메모 기록을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.";
    showModal(message, async () => {
        if (!state.db || !state.auth.currentUser) {
            alert("초기화 실패: DB 연결을 확인해주세요.");
            return;
        }
        
        try {
            const batch = state.db.batch();
            
            // Delete all notes
            if (state.notesCollection) {
                const notesSnapshot = await state.notesCollection.get();
                notesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            }
            
            // Delete all chat sessions
            if (state.chatSessionsCollectionRef) {
                const chatsSnapshot = await state.chatSessionsCollectionRef.get();
                chatsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            }

            // Delete all projects
            if (state.projectsCollectionRef) {
                const projectsSnapshot = await state.projectsCollectionRef.get();
                projectsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            }
            
            await batch.commit();
            
            // Clear relevant local storage items
            localStorage.removeItem('userApiSettings');
            localStorage.removeItem('selectedAiModel');
            localStorage.removeItem('customTutorPrompt');

            alert("✅ 모든 데이터가 성공적으로 삭제되었습니다. 페이지를 새로고침하여 시스템을 다시 시작합니다.");
            location.reload();
        } catch (error) {
            console.error("❌ 시스템 초기화 실패:", error);
            alert(`시스템 초기화 중 오류가 발생했습니다: ${error.message}`);
        }
    });
}

function exportAllData() {
    if (state.localNotesCache.length === 0 && state.localChatSessionsCache.length === 0 && state.localProjectsCache.length === 0) {
        showModal("백업할 데이터가 없습니다.", () => {});
        return;
    }

    // Helper to convert Firestore Timestamps to ISO strings for JSON compatibility
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
    a.download = `ailey-canvas-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

async function importAllData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.backupVersion || data.backupVersion !== '2.0') {
                throw new Error("호환되지 않는 백업 파일 버전입니다. (v2.0 필요)");
            }
            const message = `파일에서 ${data.projects?.length||0}개의 프로젝트, ${data.chatSessions?.length||0}개의 채팅, ${data.notes?.length||0}개의 메모를 발견했습니다. 현재 데이터를 덮어쓰고 복원하시겠습니까?`;
            
            showModal(message, async () => {
                try {
                    const batch = state.db.batch();
                    const toFirestoreTimestamp = ts => ts ? firebase.firestore.Timestamp.fromDate(new Date(ts)) : firebase.firestore.FieldValue.serverTimestamp();
                    
                    // Restore Notes
                    if (state.notesCollection && data.notes) {
                        data.notes.forEach(note => {
                            const { id, ...dataToWrite } = note;
                            dataToWrite.createdAt = toFirestoreTimestamp(note.createdAt);
                            dataToWrite.updatedAt = toFirestoreTimestamp(note.updatedAt);
                            batch.set(state.notesCollection.doc(id), dataToWrite);
                        });
                    }

                    // Restore Chat Sessions
                    if (state.chatSessionsCollectionRef && data.chatSessions) {
                        data.chatSessions.forEach(session => {
                            const { id, ...dataToWrite } = session;
                            dataToWrite.createdAt = toFirestoreTimestamp(session.createdAt);
                            dataToWrite.updatedAt = toFirestoreTimestamp(session.updatedAt);
                            if(dataToWrite.messages) {
                                dataToWrite.messages.forEach(m => m.timestamp = toFirestoreTimestamp(m.timestamp));
                            }
                            batch.set(state.chatSessionsCollectionRef.doc(id), dataToWrite);
                        });
                    }

                    // Restore Projects
                    if (state.projectsCollectionRef && data.projects) {
                        data.projects.forEach(project => {
                            const { id, ...dataToWrite } = project;
                            dataToWrite.createdAt = toFirestoreTimestamp(project.createdAt);
                            dataToWrite.updatedAt = toFirestoreTimestamp(project.updatedAt);
                            batch.set(state.projectsCollectionRef.doc(id), dataToWrite);
                        });
                    }
                    
                    await batch.commit();
                    showModal("데이터 복원이 완료되었습니다. 페이지를 새로고침합니다.", () => location.reload());

                } catch (error) {
                    console.error("데이터 복원 실패:", error);
                    showModal(`데이터 복원 중 오류: ${error.message}`, () => {});
                }
            });
        } catch (error) {
            console.error("File parsing error:", error);
            showModal(`파일 읽기 오류: ${error.message}`, () => {});
        } finally {
            event.target.value = null; // Reset file input to allow re-uploading the same file
        }
    };
    reader.readAsText(file);
}