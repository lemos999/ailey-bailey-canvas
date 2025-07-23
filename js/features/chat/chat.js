import { state, setState } from '../../core/state.js';
import { dom } from '../../ui/dom.js';
import { togglePanel, showModal } from '../../core/utils.js';
import { handleChatSend } from './api.js';
import { setupChatModeSelector, clearTimers, startSummaryAnimation, typewriterEffect } from './ui.js';
import { handleNewChat, handleDeleteSession, selectSession } from './session.js';
import { createNewProject } from './project.js';
import { initializeSidebar } from './sidebar.js';
import { openNoteEditor } from '../notes/ui.js';

function handleTextSelection(e) {
    if (e.target.closest('.draggable-panel, #selection-popover, .fixed-tool-container, #system-info-widget, .project-context-menu, .session-context-menu')) return;
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (state.currentOpenContextMenu) state.currentOpenContextMenu.remove();

    if (selectedText.length > 3) {
        setState('lastSelectedText', selectedText);
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        let top = rect.top + window.scrollY - dom.selectionPopover.offsetHeight - 10;
        let left = rect.left + window.scrollX + (rect.width / 2) - (dom.selectionPopover.offsetWidth / 2);
        dom.selectionPopover.style.top = ${top < window.scrollY ? rect.bottom + window.scrollY + 10 : top}px;
        dom.selectionPopover.style.left = ${Math.max(5, Math.min(left, window.innerWidth - dom.selectionPopover.offsetWidth - 5))}px;
        dom.selectionPopover.style.display = 'flex';
    } else if (!e.target.closest('#selection-popover')) {
        dom.selectionPopover.style.display = 'none';
    }
}

function handlePopoverAskAi() {
    if (!state.lastSelectedText || !dom.chatInput) return;
    togglePanel(dom.chatPanel, true);
    selectSession(null); // Start a new chat
    setTimeout(() => {
        dom.chatInput.value = ""\n\n이 내용에 대해 더 자세히 설명해줄래?;
        dom.chatInput.style.height = (dom.chatInput.scrollHeight) + 'px';
        dom.chatInput.focus();
    }, 100);
    dom.selectionPopover.style.display = 'none';
}

function handlePopoverAddNote() {
    if (!state.lastSelectedText) return;
    // Direct call to addNote is tricky due to module boundaries.
    // A better approach would be a custom event. For now, we'll assume a global or imported addNote.
    // This part will be completed in notes.js initialization.
    console.log("Add to note:", > \n\n);
    dom.selectionPopover.style.display = 'none';
}

export function initializeChat() {
    setupChatModeSelector();
    initializeSidebar();
    
    // Main Chat Panel Listeners
    if (dom.chatToggleBtn) dom.chatToggleBtn.addEventListener('click', () => togglePanel(dom.chatPanel));
    if (dom.chatPanel) {
        const closeBtn = dom.chatPanel.querySelector('.close-btn');
        if(closeBtn) closeBtn.addEventListener('click', () => togglePanel(dom.chatPanel, false));
    }
    if (dom.chatForm) dom.chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });
    if (dom.chatInput) dom.chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } });

    // Sidebar Header Buttons
    if (dom.newChatBtn) dom.newChatBtn.addEventListener('click', handleNewChat);
    if (dom.newProjectBtn) dom.newProjectBtn.addEventListener('click', createNewProject);
    
    // Session-specific buttons
    if (dom.deleteSessionBtn) dom.deleteSessionBtn.addEventListener('click', () => handleDeleteSession(state.currentSessionId));

    // Text Selection Popover
    document.addEventListener('mouseup', handleTextSelection);
    if (dom.popoverAskAi) dom.popoverAskAi.addEventListener('click', handlePopoverAskAi);
    // Popover "Add Note" is handled in notes.js

    // Model Selector
    if (dom.aiModelSelector) {
        dom.aiModelSelector.addEventListener('change', () => {
            const selectedValue = dom.aiModelSelector.value;
            if (state.userApiSettings.provider && state.userApiSettings.apiKey) {
                setState('userApiSettings', { ...state.userApiSettings, selectedModel: selectedValue });
                localStorage.setItem('userApiSettings', JSON.stringify(state.userApiSettings));
            } else {
                setState('defaultModel', selectedValue);
                localStorage.setItem('selectedAiModel', state.defaultModel);
            }
        });
    }

    // Reasoning Block Interaction
    if (dom.chatMessages) {
        dom.chatMessages.addEventListener('click', (e) => {
            const header = e.target.closest('.reasoning-header');
            if (!header) return;
            const block = header.closest('.reasoning-block');
            if (block.classList.contains('loading')) return;
            const content = block.querySelector('.reasoning-content');
            const blockId = block.id;
            
            clearTimers(blockId);
            block.classList.toggle('expanded');
            content.classList.toggle('expanded');
            
            if (block.classList.contains('expanded')) {
                const steps = JSON.parse(block.dataset.steps);
                const fullText = steps.map(s => s.detail).filter(Boolean).join('\n\n');
                content.innerHTML = '';
                typewriterEffect(content, fullText, null);
            } else {
                content.innerHTML = '';
                const steps = JSON.parse(block.dataset.steps);
                startSummaryAnimation(block, steps);
            }
        });
    }

    // Prompt Modal
    if(dom.promptSaveBtn) dom.promptSaveBtn.addEventListener('click', saveCustomPrompt);
    if(dom.promptCancelBtn) dom.promptCancelBtn.addEventListener('click', closePromptModal);
}
