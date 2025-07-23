/*
--- Module: ui.js ---
Description: Core UI functionalities like panel toggling, modals, etc.
*/
import { getState, getElements, setLastSelectedText } from './state.js';
import { handlePopoverAddNote, handlePopoverAskAi } from '../features/learningContent/popover.js';
import { handleSystemReset, exportAllData, importAllData, handleRestoreClick } from './dataManager.js';

let uiState = {
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    draggedPanel: null,
};

export function initCoreUI(elements, db, auth) {
    // Theme setup
    elements.themeToggle.addEventListener('click', () => {
        elements.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', elements.body.classList.contains('dark-mode') ? 'dark' : 'light');
    });
    if (localStorage.getItem('theme') === 'dark') {
        elements.body.classList.add('dark-mode');
    }

    // Panel toggles
    elements.tocToggleBtn.addEventListener('click', () => {
        elements.wrapper.classList.toggle('toc-hidden');
        elements.systemInfoWidget?.classList.toggle('tucked');
    });
    elements.chatToggleBtn.addEventListener('click', () => togglePanel(elements.chatPanel));
    elements.notesAppToggleBtn.addEventListener('click', () => togglePanel(elements.notesAppPanel));

    elements.chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(elements.chatPanel, false));
    // Note: Notes panel close is handled within its own module

    // Global text selection popover
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('mousedown', (e) => { // Hide on general mousedown
        if (!e.target.closest('#selection-popover')) {
            elements.selectionPopover.style.display = 'none';
        }
    });

    // Data management buttons
    if (elements.systemResetBtn) elements.systemResetBtn.addEventListener('click', () => handleSystemReset(db, auth));
    if (elements.exportNotesBtn) elements.exportNotesBtn.addEventListener('click', () => exportAllData());
    if (elements.restoreDataBtn) elements.restoreDataBtn.addEventListener('click', handleRestoreClick);
    if (elements.fileImporter) elements.fileImporter.addEventListener('change', (e) => importAllData(e, db));
}

export function togglePanel(panelElement, forceShow = null) {
    if (!panelElement) return;
    const show = forceShow !== null ? forceShow : panelElement.style.display !== 'flex';
    panelElement.style.display = show ? 'flex' : 'none';
}

export function updateClock() {
    const clockElement = document.getElementById('real-time-clock');
    if (!clockElement) return;
    const now = new Date();
    const options = { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
    clockElement.textContent = now.toLocaleString('ko-KR', options);
}

export function setupSystemInfoWidget(user) {
    const state = getState();
    const elements = getElements();
    if (!elements.systemInfoWidget || !user) return;

    const canvasIdDisplay = document.getElementById('canvas-id-display');
    if (canvasIdDisplay) {
        canvasIdDisplay.textContent = state.canvasId.substring(0, 8) + '...';
    }

    const copyBtn = document.getElementById('copy-canvas-id');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(state.canvasId).then(() => {
                copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" /></svg>';
                setTimeout(() => {
                    copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" /></svg>';
                }, 1500);
            });
        });
    }

    const tooltip = document.createElement('div');
    tooltip.className = 'system-tooltip';
    tooltip.innerHTML = `<div><strong>Canvas ID:</strong> ${state.canvasId}</div><div><strong>User ID:</strong> ${user.uid}</div>`;
    elements.systemInfoWidget.appendChild(tooltip);
}

export function makePanelsDraggable() {
    const { chatPanel, notesAppPanel } = getElements();
    makePanelDraggable(chatPanel);
    makePanelDraggable(notesAppPanel);
}

function makePanelDraggable(panelElement) {
    if (!panelElement) return;
    const header = panelElement.querySelector('.panel-header');
    if (!header) return;

    const onMouseMove = (e) => {
        if (uiState.isDragging) {
            uiState.draggedPanel.style.left = (e.clientX + uiState.dragOffset.x) + 'px';
            uiState.draggedPanel.style.top = (e.clientY + uiState.dragOffset.y) + 'px';
        }
    };

    const onMouseUp = () => {
        uiState.isDragging = false;
        if (uiState.draggedPanel) {
            uiState.draggedPanel.classList.remove('is-dragging');
        }
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        uiState.draggedPanel = null;
    };

    header.addEventListener('mousedown', (e) => {
        // Ignore clicks on buttons or interactive elements inside the header
        if (e.target.closest('button, input, select, .close-btn, #delete-session-btn, #chat-mode-selector, #api-settings-btn')) return;

        uiState.isDragging = true;
        uiState.draggedPanel = panelElement;
        panelElement.classList.add('is-dragging');
        uiState.dragOffset = {
            x: panelElement.offsetLeft - e.clientX,
            y: panelElement.offsetTop - e.clientY
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

function handleTextSelection(e) {
    const elements = getElements();
    // Prevent popover inside its own elements or other floating UI
    if (e.target.closest('.draggable-panel, #selection-popover, .fixed-tool-container, #system-info-widget, .project-context-menu, .session-context-menu')) {
        return;
    }

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 3) {
        setLastSelectedText(selectedText);
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const popover = elements.selectionPopover;

        let top = rect.top + window.scrollY - popover.offsetHeight - 10;
        let left = rect.left + window.scrollX + (rect.width / 2) - (popover.offsetWidth / 2);

        // Adjust position if it goes off-screen
        if (top < window.scrollY) {
            top = rect.bottom + window.scrollY + 10;
        }
        left = Math.max(5, Math.min(left, window.innerWidth - popover.offsetWidth - 5));

        popover.style.top = `${top}px`;
        popover.style.left = `${left}px`;
        popover.style.display = 'flex';

        // Ensure popover actions are wired
        const popoverAskAi = document.getElementById('popover-ask-ai');
        const popoverAddNote = document.getElementById('popover-add-note');

        // To avoid multiple event listeners, we can remove and add them again.
        // A better approach is to set them up once and use the state.
        if (!popoverAskAi.hasAttribute('data-listener-attached')) {
            popoverAskAi.addEventListener('click', handlePopoverAskAi);
            popoverAddNote.addEventListener('click', handlePopoverAddNote);
            popoverAskAi.setAttribute('data-listener-attached', 'true');
        }

    } else {
        elements.selectionPopover.style.display = 'none';
    }
}

export function showModal(message, onConfirm) {
    const elements = getElements();
    if (!elements.customModal || !elements.modalMessage || !elements.modalConfirmBtn || !elements.modalCancelBtn) return;

    elements.modalMessage.textContent = message;
    elements.customModal.style.display = 'flex';

    // Clone and replace to remove old event listeners
    const newConfirmBtn = elements.modalConfirmBtn.cloneNode(true);
    elements.modalConfirmBtn.parentNode.replaceChild(newConfirmBtn, elements.modalConfirmBtn);
    elements.modalConfirmBtn = newConfirmBtn;

    newConfirmBtn.addEventListener('click', () => {
        onConfirm();
        elements.customModal.style.display = 'none';
    });

    elements.modalCancelBtn.onclick = () => {
        elements.customModal.style.display = 'none';
    };
}