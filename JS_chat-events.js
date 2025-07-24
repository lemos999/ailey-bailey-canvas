/* --- JS_chat-events.js --- */
import * as chatModule from 'https://lemos999.github.io/ailey-bailey-canvas/JS_chat-module.js';
import { getChatDomElements } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_chat-ui.js';
import { openApiSettingsModal } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_api-settings.js';

export function initializeChatEventListeners() {
    const dom = getChatDomElements();

    dom.chatForm?.addEventListener('submit', e => { e.preventDefault(); chatModule.handleChatSend(); });
    dom.chatInput?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chatModule.handleChatSend(); } });
    dom.newChatBtn?.addEventListener('click', chatModule.handleNewChat);
    dom.newProjectBtn?.addEventListener('click', chatModule.createNewProject);
    dom.searchSessionsInput?.addEventListener('input', chatModule.renderSidebarContent);
    dom.deleteSessionBtn?.addEventListener('click', () => chatModule.handleDeleteSession(state.getCurrentSessionId()));
    
    // API Settings Button (Dynamically added, needs event delegation)
    dom.chatPanel?.querySelector('.panel-header').addEventListener('click', e => {
        if (e.target.closest('#api-settings-btn')) {
            openApiSettingsModal();
        }
    });

    if (dom.sessionListContainer) {
        setupSessionListEventListeners(dom.sessionListContainer);
    }
}

function setupSessionListEventListeners(container) {
    let draggedItem = null;

    container.addEventListener('click', (e) => {
        const projectHeader = e.target.closest('.project-header');
        if (projectHeader) {
            const projectId = projectHeader.closest('.project-container').dataset.projectId;
            if (e.target.closest('.project-actions-btn')) {
                // Placeholder for potential actions button
            } else if (!e.target.closest('input')) {
                chatModule.toggleProjectExpansion(projectId);
            }
            return;
        }

        const sessionItem = e.target.closest('.session-item');
        if (sessionItem) {
            if (e.target.closest('.session-pin-btn')) {
                e.stopPropagation();
                chatModule.toggleChatPin(sessionItem.dataset.sessionId);
            } else {
                chatModule.selectSession(sessionItem.dataset.sessionId);
            }
        }
    });

    // Drag and Drop Logic
    container.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('session-item')) {
            draggedItem = e.target;
            setTimeout(() => e.target.classList.add('is-dragging'), 0);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedItem.dataset.sessionId);
        } else {
            e.preventDefault();
        }
    });

    container.addEventListener('dragend', () => {
        if (draggedItem) draggedItem.classList.remove('is-dragging');
        draggedItem = null;
        document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => el.classList.remove('drag-over', 'drag-target-area'));
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        const targetProjectHeader = e.target.closest('.project-header');
        document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => el.classList.remove('drag-over', 'drag-target-area'));
        if (!draggedItem) return;

        if (targetProjectHeader) {
            targetProjectHeader.classList.add('drag-over');
            e.dataTransfer.dropEffect = 'move';
        } else {
            container.classList.add('drag-target-area');
            e.dataTransfer.dropEffect = 'move';
        }
    });

    container.addEventListener('dragleave', (e) => {
        if (e.target.closest('.project-header')) e.target.closest('.project-header').classList.remove('drag-over');
        if (e.currentTarget === container) container.classList.remove('drag-target-area');
    });

    container.addEventListener('drop', async (e) => {
        e.preventDefault();
        document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => el.classList.remove('drag-over', 'drag-target-area'));
        if (!draggedItem) return;
        // Drop logic would be implemented here if needed.
    });
}
