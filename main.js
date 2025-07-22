/*
--- Ailey & Bailey Canvas ---
File: js/main.js
Version: 11.0 (Refactored)
Architect: [Username] & System Architect Ailey
Description: The entry point of the application. It imports all necessary modules, initializes them in the correct order, and sets up global event listeners.
*/

// --- Module Imports ---
import * as state from './state.js';
import { initializeFirebase } from './firebase-service.js';
import { 
    initializeUI, 
    updateClock, 
    setupSystemInfoWidget, 
    togglePanel, 
    setupNavigator, 
    handleTextSelection,
    showModal,
    setupPopover,
    setupQuiz
} from './ui-manager.js';
import { initializeNotesManager, handleNotesUpdate, renderNoteList } from './notes-manager.js';
import { initializeApiManager } from './api-manager.js';
import { initializeChatSessionManager, handleSessionsUpdate, handleProjectsUpdate } from './chat-session.js';
import { initializeChatUI } from './chat-ui.js';
import { initializeChatCore } from './chat-core.js';


// --- Element Cache for main.js ---
let promptModalOverlay, customPromptInput, promptSaveBtn, promptCancelBtn;

// --- Initialization Orchestrator ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Ailey & Bailey Canvas Initializing...");

    // Initialize UI elements that are directly managed by main.js or need early access
    initializePrimaryElements();
    
    // Set up recurring tasks
    updateClock();
    setInterval(updateClock, 1000);

    // Initialize all feature modules
    initializeUI();
    initializeNotesManager();
    initializeApiManager();
    initializeChatSessionManager();
    initializeChatUI();
    initializeChatCore();
    setupPopover();
    setupQuiz();

    // Setup global event listeners managed by main
    setupGlobalEventListeners();

    // Connect to Firebase and load data
    try {
        const isFirebaseReady = await initializeFirebase(handleNotesUpdate, handleSessionsUpdate, handleProjectsUpdate);
        if (isFirebaseReady) {
            setupNavigator();
            setupSystemInfoWidget();
        } else {
             throw new Error("Firebase user not available.");
        }
    } catch (error) {
        console.error("Critical initialization failed:", error);
        const notesList = document.getElementById('notes-list');
        const chatMessages = document.getElementById('chat-messages');
        if (notesList) notesList.innerHTML = '<div>클라우드 메모장을 불러오는 데 실패했습니다.</div>';
        if (chatMessages) chatMessages.innerHTML = '<div>AI 러닝메이트 연결에 실패했습니다.</div>';
    }

    // Load initial theme
    if(localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }

    console.log("System Ready.");
});


function initializePrimaryElements() {
    promptModalOverlay = document.getElementById('prompt-modal-overlay');
    customPromptInput = document.getElementById('custom-prompt-input');
    promptSaveBtn = document.getElementById('prompt-save-btn');
    promptCancelBtn = document.getElementById('prompt-cancel-btn');
}

function setupGlobalEventListeners() {
    document.addEventListener('click', (e) => {
        handleTextSelection(e);
        // This is a generic click handler, also good for closing menus
        if (!e.target.closest('.session-context-menu, .project-context-menu')) {
            import('./chat-ui.js').then(ui => ui.removeContextMenu());
        }
    });

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
        });
    }

    const tocToggleBtn = document.getElementById('toc-toggle-btn');
    if (tocToggleBtn) {
        tocToggleBtn.addEventListener('click', () => {
            document.querySelector('.wrapper')?.classList.toggle('toc-hidden');
            document.getElementById('system-info-widget')?.classList.toggle('tucked');
        });
    }
    
    // Panel Toggles
    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    if (chatToggleBtn) {
        chatToggleBtn.addEventListener('click', () => togglePanel(document.getElementById('chat-panel')));
    }
    const notesAppToggleBtn = document.getElementById('notes-app-toggle-btn');
    if (notesAppToggleBtn) {
        notesAppToggleBtn.addEventListener('click', () => {
            const panel = document.getElementById('notes-app-panel');
            togglePanel(panel);
            if(panel.style.display === 'flex') renderNoteList();
        });
    }
    
    // Panel Close Buttons
    const chatPanelClose = document.querySelector('#chat-panel .close-btn');
    if (chatPanelClose) {
        chatPanelClose.addEventListener('click', () => togglePanel(document.getElementById('chat-panel'), false));
    }
    
    // Prompt Modal
    if (promptSaveBtn) promptSaveBtn.addEventListener('click', saveCustomPrompt);
    if (promptCancelBtn) promptCancelBtn.addEventListener('click', closePromptModal);
    
    // Backup & Restore
    const exportNotesBtn = document.getElementById('export-notes-btn');
    const restoreDataBtn = document.getElementById('restore-data-btn');
    const fileImporter = document.getElementById('file-importer');
    const systemResetBtn = document.getElementById('system-reset-btn');

    if (exportNotesBtn) exportNotesBtn.addEventListener('click', exportAllData);
    if (restoreDataBtn) restoreDataBtn.addEventListener('click', () => fileImporter?.click());
    if (fileImporter) fileImporter.addEventListener('change', importAllData);
    if (systemResetBtn) systemResetBtn.addEventListener('click', handleSystemReset);

}


// --- Functions Exported for Other Modules (or for clarity) ---

export function openPromptModal() {
    if (customPromptInput) customPromptInput.value = state.customPrompt;
    if (promptModalOverlay) promptModalOverlay.style.display = 'flex';
}

function closePromptModal() {
    if (promptModalOverlay) promptModalOverlay.style.display = 'none';
}

function saveCustomPrompt() {
    if (customPromptInput) {
        state.setCustomPrompt(customPromptInput.value);
        localStorage.setItem('customTutorPrompt', state.customPrompt);
        closePromptModal();
    }
}


// --- Backup, Restore, Reset Functions ---

async function handleSystemReset() {
    const message = "정말로 이 캔버스의 모든 프로젝트, 채팅, 메모 기록을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.";
    showModal(message, async () => {
        if (!state.db || !state.currentUser) {
            alert("초기화 실패: DB 연결을 확인해주세요.");
            return;
        }
        
        const autoSaveStatus = document.getElementById('auto-save-status');
        if (autoSaveStatus) autoSaveStatus.textContent = "시스템 초기화 중...";

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

            alert("✅ 모든 데이터가 성공적으로 삭제되었습니다. 페이지를 새로고침하여 시스템을 다시 시작합니다.");
            location.reload();
        } catch (error) {
            console.error("❌ 시스템 초기화 실패:", error);
            alert(`시스템 초기화 중 오류가 발생했습니다: ${error.message}`);
            if (autoSaveStatus) autoSaveStatus.textContent = "초기화 실패 ❌";
        }
    });
}

function exportAllData() {
    if (state.localNotesCache.length === 0 && state.localChatSessionsCache.length === 0 && state.localProjectsCache.length === 0) {
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
            if (data.backupVersion !== '2.0') {
                throw new Error("호환되지 않는 백업 파일 버전입니다.");
            }
            const message = `파일에서 ${data.projects?.length||0}개의 프로젝트, ${data.chatSessions?.length||0}개의 채팅, ${data.notes?.length||0}개의 메모를 발견했습니다. 현재 데이터를 덮어씁니다. 계속하시겠습니까?`;
            
            showModal(message, async () => {
                try {
                    const autoSaveStatus = document.getElementById('auto-save-status');
                    if (autoSaveStatus) autoSaveStatus.textContent = '복원 중...';

                    const batch = state.db.batch();
                    const toFirestoreTimestamp = ts => ts ? firebase.firestore.Timestamp.fromDate(new Date(ts)) : firebase.firestore.FieldValue.serverTimestamp();

                    (data.notes || []).forEach(note => {
                        const { id, ...dataToWrite } = note;
                        dataToWrite.createdAt = toFirestoreTimestamp(note.createdAt);
                        dataToWrite.updatedAt = toFirestoreTimestamp(note.updatedAt);
                        batch.set(state.notesCollection.doc(id), dataToWrite);
                    });
                    
                    (data.chatSessions || []).forEach(session => {
                        const { id, ...dataToWrite } = session;
                        dataToWrite.createdAt = toFirestoreTimestamp(session.createdAt);
                        dataToWrite.updatedAt = toFirestoreTimestamp(session.updatedAt);
                        if(dataToWrite.messages) dataToWrite.messages.forEach(m => m.timestamp = toFirestoreTimestamp(m.timestamp));
                        batch.set(state.chatSessionsCollectionRef.doc(id), dataToWrite);
                    });

                    (data.projects || []).forEach(project => {
                        const { id, ...dataToWrite } = project;
                        dataToWrite.createdAt = toFirestoreTimestamp(project.createdAt);
                        dataToWrite.updatedAt = toFirestoreTimestamp(project.updatedAt);
                        batch.set(state.projectsCollectionRef.doc(id), dataToWrite);
                    });

                    await batch.commit();

                    if (autoSaveStatus) autoSaveStatus.textContent = '복원 완료 ✓';
                    showModal("데이터 복원이 완료되었습니다. 페이지를 새로고침합니다.", () => location.reload());

                } catch (error) {
                    console.error("데이터 복원 실패:", error);
                    if (autoSaveStatus) autoSaveStatus.textContent = '복원 실패 ❌';
                    showModal(`데이터 복원 중 오류: ${error.message}`, () => {});
                }
            });
        } catch (error) {
            console.error("File parsing error:", error);
            showModal(`파일 읽기 오류: ${error.message}`, () => {});
        } finally {
            event.target.value = null; // Reset file input
        }
    };
    reader.readAsText(file);
}