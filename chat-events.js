/*
--- Ailey & Bailey Canvas ---
File: chat-events.js
Version: 12.0 (Chat Module Refactor)
Architect: [Username] & System Architect CodeMaster
Description: This module centralizes all event handling logic for the chat system. It captures user interactions like clicks and drag-and-drop, then calls appropriate functions from data or UI modules.
*/

import { state } from './state.js';
import { togglePanel } from './ui-helpers.js';
import {
    selectSession,
    toggleChatPin,
    moveSessionToProject,
    toggleProjectExpansion,
    renameSession,
    renameProject
} from './chat-data.js';
import {
    removeContextMenu,
    showProjectContextMenu,
    showSessionContextMenu,
    startSummaryAnimation,
    typewriterEffect,
    clearTimers
} from './chat-ui.js';

let draggedItem = null; // State for drag-and-drop operations

// --- Main Event Handlers ---

export function handleSidebarClick(e) {
    if (!e.target.closest('.project-context-menu, .session-context-menu')) {
        removeContextMenu();
    }
    const sessionItem = e.target.closest('.session-item');
    if (sessionItem) {
        const pinButton = e.target.closest('.session-pin-btn');
        if (pinButton) {
            e.stopPropagation();
            toggleChatPin(sessionItem.dataset.sessionId);
        } else {
            selectSession(sessionItem.dataset.sessionId);
        }
        return;
    }
    const projectHeader = e.target.closest('.project-header');
    if (projectHeader) {
        const actionsButton = e.target.closest('.project-actions-btn');
        const projectId = projectHeader.closest('.project-container').dataset.projectId;
        if (actionsButton) {
            e.stopPropagation();
            showProjectContextMenu(projectId, actionsButton);
        } else if (!e.target.closest('input')) {
            toggleProjectExpansion(projectId);
        }
        return;
    }
}

export function handleSidebarContextMenu(e) {
    const sessionItem = e.target.closest('.session-item');
    if (sessionItem) {
        e.preventDefault();
        removeContextMenu();
        showSessionContextMenu(sessionItem.dataset.sessionId, e.clientX, e.clientY);
    }
}

export function handleReasoningBlockClick(e) {
    const header = e.target.closest('.reasoning-header');
    if (!header) return;

    const block = header.closest('.reasoning-block');
    if (block.classList.contains('loading')) return;

    const content = block.querySelector('.reasoning-content');
    if (!content) return;

    const blockId = block.id;
    
    clearTimers(blockId);
    block.classList.toggle('expanded');
    content.classList.toggle('expanded');
    
    if (block.classList.contains('expanded')) {
        const steps = JSON.parse(block.dataset.steps);
        const fullText = steps.map(s => `**${s.summary}**\n${s.detail}`).filter(Boolean).join('\n\n');
        content.innerHTML = ''; // Clear previous content
        typewriterEffect(content, fullText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'));
    } else {
        content.innerHTML = '';
        const steps = JSON.parse(block.dataset.steps);
        startSummaryAnimation(block, steps);
    }
}

export function handlePopoverAskAi() {
    let chatInput = document.getElementById('chat-input');
    let chatPanel = document.getElementById('chat-panel');
    let selectionPopover = document.getElementById('selection-popover');
    const { handleNewChat } = import('./chat-data.js');
    
    if (!state.lastSelectedText || !chatInput) return;
    
    togglePanel(chatPanel, true);
    
    handleNewChat().then(() => {
        setTimeout(() => {
            chatInput.value = `"${state.lastSelectedText}"\n\n이 내용에 대해 더 자세히 설명해줄래?`;
            chatInput.style.height = (chatInput.scrollHeight) + 'px';
            chatInput.focus();
        }, 100);
    });
    
    selectionPopover.style.display = 'none';
}


// --- Drag and Drop Handlers ---

export function handleDragStart(e) {
    if (e.target.classList.contains('session-item')) {
        draggedItem = e.target;
        setTimeout(() => e.target.classList.add('is-dragging'), 0);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedItem.dataset.sessionId);
    } else {
        e.preventDefault();
    }
}

export function handleDragEnd() {
    if (draggedItem) {
        draggedItem.classList.remove('is-dragging');
        draggedItem = null;
    }
    document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => {
        el.classList.remove('drag-over', 'drag-target-area');
    });
}

export function handleDragOver(e) {
    e.preventDefault();
    const sessionListContainer = e.currentTarget;
    const targetProjectHeader = e.target.closest('.project-header');
    
    document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => {
        el.classList.remove('drag-over', 'drag-target-area');
    });

    if (!draggedItem) return;

    const sourceSessionId = draggedItem.dataset.sessionId;
    const sourceSession = state.localChatSessionsCache.find(s => s.id === sourceSessionId);

    if (targetProjectHeader) {
        const targetProjectId = targetProjectHeader.closest('.project-container').dataset.projectId;
        if (sourceSession && sourceSession.projectId !== targetProjectId) {
            e.dataTransfer.dropEffect = 'move';
            targetProjectHeader.classList.add('drag-over');
        } else {
            e.dataTransfer.dropEffect = 'none';
        }
    } else {
        if (sourceSession && sourceSession.projectId) {
            e.dataTransfer.dropEffect = 'move';
            sessionListContainer.classList.add('drag-target-area');
        } else {
            e.dataTransfer.dropEffect = 'none';
        }
    }
}

export function handleDragLeave(e) {
    const sessionListContainer = e.currentTarget;
    // Check if the mouse is truly leaving the container and not just entering a child element.
    if (!sessionListContainer.contains(e.relatedTarget)) {
        sessionListContainer.classList.remove('drag-target-area');
    }
}

export async function handleDrop(e) {
    e.preventDefault();
    document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => {
        el.classList.remove('drag-over', 'drag-target-area');
    });
    if (!draggedItem) return;

    const sessionId = e.dataTransfer.getData('text/plain');
    const targetProjectHeader = e.target.closest('.project-header');
    let targetProjectId = null;
    let shouldUpdate = false;
    const sourceSession = state.localChatSessionsCache.find(s => s.id === sessionId);

    if (!sourceSession) return;

    if (targetProjectHeader) {
        targetProjectId = targetProjectHeader.closest('.project-container').dataset.projectId;
        if (sourceSession.projectId !== targetProjectId) {
            shouldUpdate = true;
        }
    } else { // Dropped on the general area (sessionListContainer)
        if (sourceSession.projectId) { // Only update if it was in a project
            targetProjectId = null;
            shouldUpdate = true;
        }
    }

    if (shouldUpdate) {
        await moveSessionToProject(sessionId, targetProjectId);
    }
}

// --- Inline Renaming ---

export function startSessionRename(sessionId) {
    const sessionItem = document.querySelector(`.session-item[data-session-id="${sessionId}"]`);
    if (!sessionItem) return;
    const titleSpan = sessionItem.querySelector('.session-item-title');
    if (!titleSpan) return;

    const originalTitle = titleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'project-title-input'; // Using the same style as project rename
    input.value = originalTitle;
    titleSpan.replaceWith(input);
    input.focus();
    input.select();

    const finishEditing = () => {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== originalTitle) {
            renameSession(sessionId, newTitle);
        } else {
            // Re-render to restore original title if empty or unchanged
            const { renderSidebarContent } = import('./chat-ui.js');
            renderSidebarContent();
        }
    };

    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); }
    });
}

export function startProjectRename(projectId) {
    const projectContainer = document.querySelector(`.project-container[data-project-id="${projectId}"]`);
    if (!projectContainer) return;
    const titleSpan = projectContainer.querySelector('.project-title');
    if (!titleSpan) return;

    const originalTitle = titleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'project-title-input';
    input.value = originalTitle;
    titleSpan.replaceWith(input);
    input.focus();
    input.select();

    const finishEditing = () => {
        const newName = input.value.trim();
        if (newName && newName !== originalTitle) {
             renameProject(projectId, newName);
        } else {
             const { renderSidebarContent } = import('./chat-ui.js');
             renderSidebarContent();
        }
    };

    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); }
    });
}