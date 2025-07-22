/* --- FILE: /scripts/ui/02_ui_panels.js --- */
function makePanelDraggable(panelElement) {
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

function togglePanel(panelElement, forceShow = null) {
    if (!panelElement) return;
    const show = forceShow !== null ? forceShow : panelElement.style.display !== 'flex';
    panelElement.style.display = show ? 'flex' : 'none';
}