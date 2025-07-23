/*
--- Ailey & Bailey Canvas ---
File: js/ui/panels.js
Version: 11.0 (Modular)
Description: Handles logic for draggable panels and toggling their visibility.
*/

/**
 * Makes a panel element draggable by its header.
 * @param {HTMLElement} panelElement - The panel element to make draggable.
 */
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
        // Prevent dragging when clicking on interactive elements inside the header
        if (e.target.closest('button, input, select, .close-btn, #delete-session-btn, #chat-mode-selector, #api-settings-btn')) {
            return;
        }
        isDragging = true;
        panelElement.classList.add('is-dragging');
        offset = { x: panelElement.offsetLeft - e.clientX, y: panelElement.offsetTop - e.clientY };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

/**
 * Toggles the visibility of a panel.
 * @param {HTMLElement} panelElement - The panel element to toggle.
 * @param {boolean|null} forceShow - If true, shows the panel; if false, hides it. If null, toggles.
 */
export function togglePanel(panelElement, forceShow = null) {
    if (!panelElement) return;
    const show = forceShow !== null ? forceShow : panelElement.style.display !== 'flex';
    panelElement.style.display = show ? 'flex' : 'none';
}
