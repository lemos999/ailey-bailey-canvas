/*
 * tooltips.js: Handles logic for tooltips and the selection popover.
 */
import * as Dom from '../utils/domElements.js';
import * as State from '../core/state.js';
import { addNote } from './notes.js';
import { handleNewChat } from './chat/main.js';
import { togglePanel } from './panels.js';

export function initializeTooltips() {
    // For keyword chips
    document.querySelectorAll('.keyword-chip[data-tooltip]').forEach(chip => {
        if (chip.querySelector('.tooltip')) {
            chip.classList.add('has-tooltip');
            chip.querySelector('.tooltip').textContent = chip.dataset.tooltip;
        }
    });

    // For highlighted text in content
    document.querySelectorAll('.content-section strong[data-tooltip]').forEach(highlight => {
        if (!highlight.querySelector('.tooltip')) {
            highlight.classList.add('has-tooltip');
            const tooltipElement = document.createElement('span');
            tooltipElement.className = 'tooltip';
            tooltipElement.textContent = highlight.dataset.tooltip;
            highlight.appendChild(tooltipElement);
        }
    });
}

export function setupSystemInfoWidget() {
    if (!Dom.systemInfoWidget || !State.currentUser) return;
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
    tooltip.innerHTML = +'<div><strong>Canvas ID:</strong> </div><div><strong>User ID:</strong> </div>'+;
    Dom.systemInfoWidget.appendChild(tooltip);
}

export function handleTextSelection(e) {
    if (e.target.closest('.draggable-panel, #selection-popover, .fixed-tool-container, #system-info-widget, .project-context-menu, .session-context-menu')) return;
    
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    State.setCurrentOpenContextMenu(null); // Assuming this is how context menus are closed.

    if (selectedText.length > 3) {
        State.setLastSelectedText(selectedText);
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const popover = Dom.selectionPopover;
        let top = rect.top + window.scrollY - popover.offsetHeight - 10;
        let left = rect.left + window.scrollX + (rect.width / 2) - (popover.offsetWidth / 2);
        popover.style.top = +'${top < window.scrollY ? rect.bottom + window.scrollY + 10 : top}px'+;
        popover.style.left = +'${Math.max(5, Math.min(left, window.innerWidth - popover.offsetWidth - 5))}px'+;
        popover.style.display = 'flex';
    } else if (!e.target.closest('#selection-popover')) {
        Dom.selectionPopover.style.display = 'none';
    }
}

export function handlePopoverAskAi() {
    if (!State.lastSelectedText || !Dom.chatInput) return;
    togglePanel(Dom.chatPanel, true);
    handleNewChat(); 
    setTimeout(() => {
        Dom.chatInput.value = +'""\n\n이 내용에 대해 더 자세히 설명해줄래?'+;
        Dom.chatInput.style.height = (Dom.chatInput.scrollHeight) + 'px';
        Dom.chatInput.focus();
    }, 100);
    Dom.selectionPopover.style.display = 'none';
}

export function handlePopoverAddNote() {
    if (!State.lastSelectedText) return;
    addNote(+'> \n\n'+);
    Dom.selectionPopover.style.display = 'none';
}
