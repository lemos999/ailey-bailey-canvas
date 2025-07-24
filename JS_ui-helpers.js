/* --- JS_ui-helpers.js --- */
import { getCanvasId, getCurrentOpenContextMenu, setCurrentOpenContextMenu, getActiveTimers, getCurrentUser } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_state.js';

export function getDomElements() {
    return {
        learningContent: document.getElementById('learning-content'),
        wrapper: document.querySelector('.wrapper'),
        body: document.body,
        systemInfoWidget: document.getElementById('system-info-widget'),
        selectionPopover: document.getElementById('selection-popover'),
        popoverAskAi: document.getElementById('popover-ask-ai'),
        popoverAddNote: document.getElementById('popover-add-note'),
        tocToggleBtn: document.getElementById('toc-toggle-btn'),
        quizModalOverlay: document.getElementById('quiz-modal-overlay'),
        quizContainer: document.getElementById('quiz-container'),
        quizSubmitBtn: document.getElementById('quiz-submit-btn'),
        quizResults: document.getElementById('quiz-results'),
        startQuizBtn: document.getElementById('start-quiz-btn'),
        chatPanel: document.getElementById('chat-panel'),
        notesAppPanel: document.getElementById('notes-app-panel'),
        customModal: document.getElementById('custom-modal'),
        modalMessage: document.getElementById('modal-message'),
        modalConfirmBtn: document.getElementById('modal-confirm-btn'),
        modalCancelBtn: document.getElementById('modal-cancel-btn'),
        themeToggle: document.getElementById('theme-toggle'),
        chatToggleBtn: document.getElementById('chat-toggle-btn'),
        notesAppToggleBtn: document.getElementById('notes-app-toggle-btn'),
        exportNotesBtn: document.getElementById('export-notes-btn'),
        restoreDataBtn: document.getElementById('restore-data-btn'),
        fileImporter: document.getElementById('file-importer'),
        systemResetBtn: document.getElementById('system-reset-btn')
    };
}

export function updateClock() {
    const clockElement = document.getElementById('real-time-clock');
    if (!clockElement) return;
    const now = new Date();
    const options = { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
    clockElement.textContent = now.toLocaleString('ko-KR', options);
}

export function setupSystemInfoWidget() {
    const dom = getDomElements();
    const currentUser = getCurrentUser();
    if (!dom.systemInfoWidget || !currentUser) return;
    const canvasId = getCanvasId();
    const canvasIdDisplay = document.getElementById('canvas-id-display');
    if (canvasIdDisplay) {
        canvasIdDisplay.textContent = canvasId.substring(0, 8) + '...';
    }
    const copyBtn = document.getElementById('copy-canvas-id');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(canvasId).then(() => {
                copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" /></svg>';
                setTimeout(() => {
                    copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" /></svg>';
                }, 1500);
            });
        });
    }
    const tooltip = document.createElement('div');
    tooltip.className = 'system-tooltip';
    tooltip.innerHTML = <div><strong>Canvas ID:</strong> \</div><div><strong>User ID:</strong> \</div>;
    dom.systemInfoWidget.appendChild(tooltip);
}

export function makePanelDraggable(panelElement) {
    if (!panelElement) return;
    const header = panelElement.querySelector('.panel-header');
    if (!header) return;
    let isDragging = false, offset = { x: 0, y: 0 };
    const onMouseMove = (e) => {
        if (isDragging) {
            panelElement.style.left = (e.clientX + offset.x) + 'px';
            panelElement.style.top = (e.clientY + offset.y) + 'px';
        }
    };
    const onMouseUp = () => {
        isDragging = false;
        panelElement.classList.remove('is-dragging');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };
    header.addEventListener('mousedown', e => {
        if (e.target.closest('button, input, select, .close-btn, #delete-session-btn, #chat-mode-selector, #api-settings-btn')) return;
        isDragging = true;
        panelElement.classList.add('is-dragging');
        offset = { x: panelElement.offsetLeft - e.clientX, y: panelElement.offsetTop - e.clientY };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

export function togglePanel(panelElement, forceShow = null) {
    if (!panelElement) return;
    const show = forceShow !== null ? forceShow : panelElement.style.display !== 'flex';
    panelElement.style.display = show ? 'flex' : 'none';
}

export function showModal(message, onConfirm) {
    const dom = getDomElements();
    if (!dom.customModal || !dom.modalMessage || !dom.modalConfirmBtn || !dom.modalCancelBtn) return;
    dom.modalMessage.textContent = message;
    dom.customModal.style.display = 'flex';
    dom.modalConfirmBtn.onclick = () => {
        onConfirm();
        dom.customModal.style.display = 'none';
    };
    dom.modalCancelBtn.onclick = () => {
        dom.customModal.style.display = 'none';
    };
}

export function removeContextMenu() {
    const menu = getCurrentOpenContextMenu();
    menu?.remove();
    setCurrentOpenContextMenu(null);
}

export function updateStatus(element, msg, success) {
    if (!element) return;
    element.textContent = msg;
    element.style.color = success ? 'lightgreen' : 'lightcoral';
    setTimeout(() => {
        element.textContent = '';
    }, 3000);
}

export function clearTimers(blockId) {
    const activeTimers = getActiveTimers();
    if (activeTimers[blockId]) {
        activeTimers[blockId].forEach(clearInterval);
        delete activeTimers[blockId];
    }
}

export function typewriterEffect(element, text, onComplete) {
    if (!element || !text) {
        if (onComplete) onComplete();
        return;
    }
    const activeTimers = getActiveTimers();
    element.innerHTML = '';
    element.classList.add('blinking-cursor');
    let i = 0;
    const blockId = element.closest('.reasoning-block')?.id;
    
    const typingInterval = setInterval(() => {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
        } else {
            clearInterval(typingInterval);
            element.classList.remove('blinking-cursor');
            if (onComplete) onComplete();
        }
    }, 30);

    if (blockId) {
        if (!activeTimers[blockId]) activeTimers[blockId] = [];
        activeTimers[blockId].push(typingInterval);
    }
}
