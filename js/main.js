// js/main.js
// 이 파일은 모듈화된 JavaScript 애플리케이션의 메인 진입점(Entry Point)입니다.
// 모든 모듈을 가져와서(import) 초기화하고 이벤트 리스너를 설정하는 총괄 역할을 합니다.

import * as DOM from './utils/domElements.js';
import * as State from './core/state.js';
import { updateClock } from './utils/helpers.js';
import { initializeFirebase } from './core/firebase.js';

// UI 모듈 import
import { initializeChat, listenToChatSessions, listenToProjects } from './ui/chat/main.js';
import { initializeNotes, listenToNotes, renderNoteList, addNote } from './ui/notes.js';
import { initializePanels } from './ui/panels.js';
import { initializeModals } from './ui/modals.js';
import { initializeTooltipsAndPopovers } from './ui/tooltips.js';
import { initializeToc } from './ui/toc.js';

// API 설정 관련 모듈 import
import { createApiSettingsModal, initializeApiSettings, handleSystemReset, exportAllData, importAllData, handleRestoreClick } from './ui/apiSettings.js';


/**
 * 애플리케이션 전역 초기화 함수
 */
document.addEventListener('DOMContentLoaded', function () {
    
    // 1. 기본 UI 및 시계 초기화
    if (!DOM.body || !DOM.wrapper) {
        console.error("Core layout elements not found. Initialization aborted.");
        return;
    }
    updateClock();
    setInterval(updateClock, 1000);

    // 2. 동적으로 생성되는 API 설정 모달 생성
    createApiSettingsModal();
    // DOM Elements 모듈에 동적 요소들 등록
    DOM.setApiSettingsElements({
        apiSettingsBtn: document.getElementById('api-settings-btn'),
        apiSettingsModalOverlay: document.getElementById('api-settings-modal-overlay'),
        apiKeyInput: document.getElementById('api-key-input'),
        verifyApiKeyBtn: document.getElementById('verify-api-key-btn'),
        apiKeyStatus: document.getElementById('api-key-status'),
        apiModelSelect: document.getElementById('api-model-select'),
        maxOutputTokensInput: document.getElementById('max-output-tokens-input'),
        tokenUsageDisplay: document.getElementById('token-usage-display'),
        resetTokenUsageBtn: document.getElementById('reset-token-usage-btn'),
        apiSettingsSaveBtn: document.getElementById('api-settings-save-btn'),
        apiSettingsCancelBtn: document.getElementById('api-settings-cancel-btn')
    });


    // 3. Firebase 및 데이터 리스너 초기화
    initializeFirebase().then(success => {
        if (success) {
            // Firestore 연결 성공 시 데이터 리스너 설정
            listenToNotes();
            listenToChatSessions();
            listenToProjects();
            
            // 시스템 정보 위젯 설정
            setupSystemInfoWidget();
        } else {
            // Firestore 연결 실패 시 UI 처리
            if (DOM.notesList) DOM.notesList.innerHTML = '<div>클라우드 메모장을 불러오는 데 실패했습니다.</div>';
            if (DOM.chatMessages) DOM.chatMessages.innerHTML = '<div>AI 러닝메이트 연결에 실패했습니다.</div>';
        }
    });

    // 4. 모든 UI 모듈 초기화 (이벤트 리스너 설정)
    initializeToc();
    initializePanels();
    initializeNotes();
    initializeChat();
    initializeModals();
    initializeApiSettings();
    
    // 모듈 간 의존성이 있는 콜백 함수 전달
    initializeTooltipsAndPopovers({
        handlePopoverAddNote: () => addNote('> ' + State.lastSelectedText + '\n\n'),
        removeContextMenu: () => {
             if (State.currentOpenContextMenu) {
                State.currentOpenContextMenu.remove();
                State.setCurrentOpenContextMenu(null);
            }
        }
    });
    
    // 5. 기타 전역 이벤트 리스너 설정
    if (DOM.themeToggle) {
        DOM.themeToggle.addEventListener('click', () => {
            DOM.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', DOM.body.classList.contains('dark-mode') ? 'dark' : 'light');
        });
        if(localStorage.getItem('theme') === 'dark') {
            DOM.body.classList.add('dark-mode');
        }
    }

    if (DOM.exportNotesBtn) DOM.exportNotesBtn.addEventListener('click', exportAllData);
    if (DOM.restoreDataBtn) DOM.restoreDataBtn.addEventListener('click', handleRestoreClick);
    if (DOM.fileImporter) DOM.fileImporter.addEventListener('change', importAllData);
    if (DOM.systemResetBtn) DOM.systemResetBtn.addEventListener('click', handleSystemReset);
    
    console.log("Ailey & Bailey Canvas (Modular) Initialized.");
});


/**
 * 시스템 정보 위젯 (Canvas ID, User ID)을 설정합니다.
 */
function setupSystemInfoWidget() {
    if (!DOM.systemInfoWidget || !State.currentUser) return;

    const canvasIdDisplay = document.getElementById('canvas-id-display');
    if (canvasIdDisplay) {
        canvasIdDisplay.textContent = State.canvasId.substring(0, 8) + '...';
    }

    const copyBtn = document.getElementById('copy-canvas-id');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(State.canvasId).then(() => {
                copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" /></svg>';
                setTimeout(() => {
                    copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" /></svg>';
                }, 1500);
            });
        });
    }

    const tooltip = document.createElement('div');
    tooltip.className = 'system-tooltip';
    tooltip.innerHTML = 
        <div><strong>Canvas ID:</strong> </div>
        <div><strong>User ID:</strong> </div>
    ;
    DOM.systemInfoWidget.appendChild(tooltip);
}
