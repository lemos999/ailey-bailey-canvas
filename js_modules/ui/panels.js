/*
 * panels.js: Handles logic for draggable panels.
 */
import * as Dom from '../utils/domElements.js';
import { renderNoteList } from './notes.js';

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
        // Prevent dragging from buttons, inputs, etc. inside the header
        if (e.target.closest('button, input, select, .close-btn, #delete-session-btn, #chat-mode-selector, #api-settings-btn')) {
            return;
        }
        isDragging = true;
        panelElement.classList.add('is-dragging');
        offset = {
            x: panelElement.offsetLeft - e.clientX,
            y: panelElement.offsetTop - e.clientY
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

export function togglePanel(panelElement, forceShow = null) {
    if (!panelElement) return;
    const show = forceShow !== null ? forceShow : panelElement.style.display !== 'flex';
    panelElement.style.display = show ? 'flex' : 'none';

    // Special handling for notes panel to refresh list on show
    if (panelElement.id === 'notes-app-panel' && show) {
        renderNoteList();
    }
}
