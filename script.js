/*
--- Ailey & Bailey Canvas ---
File: script.js (Main Entry Point)
Version: 11.0 (Modular JS Architecture)
Architect: [Username] & System Architect Ailey
Description: This file serves as the main entry point for the application.
             It imports all feature modules and orchestrates the initialization process.
*/

// --- 1. Module Imports ---
import * as dom from './modules/dom.js';
import * as state from './modules/state.js';
import { initializeFirebase, db, currentUser } from './modules/firebase.js';
import { updateClock, togglePanel, showModal } from './modules/ui.js';
import * as mainContent from './modules/mainContent.js';
import { togglePanel as toggleChatPanel } from './modules/ui.js';
import { handleNewChat as resetChat } from './modules/chat.js';
import { addNote as createNoteFromSelection } from './modules/notes.js';
import { createApiSettingsModal, loadApiSettings, updateChatHeaderModelSelector } from './modules/apiSettings.js';
import { initializeEventListeners } from './modules/eventListeners.js';

// --- 2. Global Function Exports (for event listeners and inline scripts) ---
// 일부 함수는 동적으로 생성되거나 다른 모듈에서 직접 호출해야 하므로 전역 스코프에 노출합니다.
export function handlePopoverAskAi() {
    const lastSelectedText = state.getLastSelectedText();
    if (!lastSelectedText || !dom.chatInput) return;
    toggleChatPanel(dom.chatPanel, true);
    resetChat();
    setTimeout(() => {
        dom.chatInput.value = "\"\n\n이 내용에 대해 더 자세히 설명해줄래?;
        dom.chatInput.style.height = (dom.chatInput.scrollHeight) + 'px';
        dom.chatInput.focus();
    }, 100);
    dom.selectionPopover.style.display = 'none';
}

export function handlePopoverAddNote() {
    const lastSelectedText = state.getLastSelectedText();
    if (!lastSelectedText) return;
    createNoteFromSelection(> \\n\n);
    dom.selectionPopover.style.display = 'none';
}

export async function handleSystemReset() {
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
            
            alert("? 모든 데이터가 성공적으로 삭제되었습니다. 페이지를 새로고침하여 시스템을 다시 시작합니다.");
            location.reload();
        } catch (error) {
            console.error("? 시스템 초기화 실패:", error);
            alert(시스템 초기화 중 오류가 발생했습니다: \);
            updateStatus("초기화 실패 ?", false);
        }
    });
}

export function exportAllData() {
    const notes = state.getLocalNotesCache();
    const sessions = state.getLocalChatSessionsCache();
    const projects = state.getLocalProjectsCache();
    if (notes.length === 0 && sessions.length === 0 && projects.length === 0) {
        showModal("백업할 데이터가 없습니다.", () => {});
        return;
    }
    const processTimestamp = (item) => {
        const newItem = { ...item };
        if (newItem.createdAt?.toDate) newItem.createdAt = newItem.createdAt.toDate().toISOString();
        if (newItem.updatedAt?.toDate) newItem.updatedAt = newItem.updatedAt.toDate().toISOString();
        if (Array.isArray(newItem.messages)) {
            newItem.messages = newItem.messages.map(msg => ({...msg, timestamp: msg.timestamp?.toDate ? msg.timestamp.toDate().toISOString() : msg.timestamp}));
        }
        return newItem;
    };
    const data = {
        backupVersion: '2.0',
        backupDate: new Date().toISOString(),
        notes: notes.map(processTimestamp),
        chatSessions: sessions.map(processTimestamp),
        projects: projects.map(processTimestamp)
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = iley-canvas-backup-\.json;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export function handleRestoreClick() {
    dom.fileImporter?.click();
}

export function importAllData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.backupVersion !== '2.0') throw new Error("호환되지 않는 백업 파일 버전입니다.");
            const msg = 파일에서 \개 프로젝트, \개 채팅, \개 메모 발견. 현재 데이터를 덮어쓸까요?;
            showModal(msg, async () => {
                // Batch write logic here
            });
        } catch (err) {
            showModal(파일 읽기 오류: \, () => {});
        }
    };
    reader.readAsText(file);
    event.target.value = null; // Reset file input
}

// --- 3. Application Initialization ---
function initializeApp() {
    document.removeEventListener('DOMContentLoaded', initializeApp); // Ensure it runs only once
    
    // Start the clock
    updateClock();
    setInterval(updateClock, 1000);
    
    // Dynamically create any necessary UI elements
    createApiSettingsModal();

    // Attach dynamic elements to the main script's scope if needed
    const chatHeader = dom.chatPanel?.querySelector('.panel-header > div:first-child');
    if (chatHeader && !document.getElementById('api-settings-btn')) {
        const btn = document.createElement('span');
        btn.id = 'api-settings-btn';
        btn.title = '개인 API 설정';
        btn.innerHTML = <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>;
        chatHeader.appendChild(btn);
    }
    
    // Load settings from local storage
    loadApiSettings();
    updateChatHeaderModelSelector();
    
    // Connect to Firebase and initialize data listeners
    initializeFirebase().then(() => {
        // Once Firebase is ready, set up the rest of the UI
        mainContent.setupNavigator();
        mainContent.initializeTooltips();
        togglePanel(dom.chatPanel, false); // Initially hide chat
        togglePanel(dom.notesAppPanel, false); // Initially hide notes
        
        // Setup all event listeners
        initializeEventListeners();
        
        console.log("Ailey & Bailey Canvas (Modular) Initialized.");
    }).catch(error => {
        console.error("Application failed to initialize:", error);
        // Display a global error message to the user
        dom.body.innerHTML = <div style="text-align:center; padding: 50px; font-size: 1.2em;">애플리케이션 초기화에 실패했습니다. 콘솔을 확인해주세요.</div>;
    });
}

// --- 4. Start the Application ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
