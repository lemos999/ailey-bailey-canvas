/*
--- Ailey & Bailey Canvas ---
File: script.js (Entry Point)
Version: 11.0 (Modularized JS)
Architect: [Username] & System Architect Ailey
Description: This file now acts as the entry point for all modularized JavaScript files. It imports necessary modules and initializes them in the correct order.
*/

// --- 1. Module Imports ---
import * as State from './modules/js/state.js';
import * as UI from './modules/js/ui.js';
import { initializeFirebase } from './modules/js/firebase.js';
import { updateClock, togglePanel, makePanelDraggable } from './modules/js/utils.js';
import { setupNavigator, initializeTooltips } from './modules/js/ui.js';
import { createApiSettingsModal, openApiSettingsModal, closeApiSettingsModal, saveApiSettings, handleVerifyApiKey, resetTokenUsage, updateChatHeaderModelSelector } from './modules/js/apiManager.js';
import * as NoteManager from './modules/js/notesManager.js';
import * as ChatManager from './modules/js/chat/chatManager.js';
import * as ChatData from './modules/js/chat/chatData.js';
import * as ChatUI from './modules/js/chat/chatUI.js';

// --- 2. Main Initialization Function ---
function initialize() {
    if (!UI.body || !UI.wrapper) {
        console.error("Core layout elements not found.");
        return;
    }

    // Basic setup
    updateClock();
    setInterval(updateClock, 1000);
    
    // Create modals dynamically
    createApiSettingsModal();

    // Load settings and initialize Firebase
    updateChatHeaderModelSelector(); // Uses localStorage initially
    initializeFirebase().then(() => {
        setupNavigator();
        ChatUI.setupChatModeSelector();
        initializeTooltips();
        makePanelDraggable(UI.chatPanel);
        makePanelDraggable(UI.notesAppPanel);
    });

    // Setup all event listeners
    setupEventListeners();
}

// --- 3. Event Listener Setup ---
function setupEventListeners() {
    // Global Listeners
    document.addEventListener('click', (e) => {
        handleTextSelection(e);
        if (!e.target.closest('.session-context-menu, .project-context-menu')) {
            State.setCurrentOpenContextMenu(null);
        }
    });

    // Popover Listeners
    if (UI.popoverAskAi) UI.popoverAskAi.addEventListener('click', handlePopoverAskAi);
    if (UI.popoverAddNote) UI.popoverAddNote.addEventListener('click', handlePopoverAddNote);

    // Theme & Layout Toggles
    if (UI.themeToggle) {
        UI.themeToggle.addEventListener('click', () => {
            UI.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', UI.body.classList.contains('dark-mode') ? 'dark' : 'light');
        });
        if (localStorage.getItem('theme') === 'dark') UI.body.classList.add('dark-mode');
    }
    if (UI.tocToggleBtn) UI.tocToggleBtn.addEventListener('click', () => {
        UI.wrapper.classList.toggle('toc-hidden');
        UI.systemInfoWidget?.classList.toggle('tucked');
    });

    // Panel Toggles
    if (UI.chatToggleBtn) UI.chatToggleBtn.addEventListener('click', () => togglePanel(UI.chatPanel));
    if (UI.chatPanel) UI.chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(UI.chatPanel, false));
    if (UI.notesAppToggleBtn) UI.notesAppToggleBtn.addEventListener('click', () => {
        togglePanel(UI.notesAppPanel);
        if (UI.notesAppPanel.style.display === 'flex') NoteManager.renderNoteList();
    });

    // Chat Listeners
    if (UI.chatForm) UI.chatForm.addEventListener('submit', e => { e.preventDefault(); ChatData.handleChatSend(); });
    if (UI.chatInput) UI.chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ChatData.handleChatSend(); } });
    if (UI.deleteSessionBtn) UI.deleteSessionBtn.addEventListener('click', () => ChatData.handleDeleteSession(State.currentSessionId));
    if (UI.newChatBtn) UI.newChatBtn.addEventListener('click', ChatManager.handleNewChat);
    if (UI.newProjectBtn) UI.newProjectBtn.addEventListener('click', ChatData.createNewProject);
    if (UI.searchSessionsInput) UI.searchSessionsInput.addEventListener('input', ChatManager.renderSidebarContent);

    // AI Model & API Settings Listeners
    if (UI.aiModelSelector) {
        UI.aiModelSelector.addEventListener('change', () => {
            const selectedValue = UI.aiModelSelector.value;
            if (State.userApiSettings.provider && State.userApiSettings.apiKey) {
                const settings = { ...State.userApiSettings, selectedModel: selectedValue };
                State.setUserApiSettings(settings);
                localStorage.setItem('userApiSettings', JSON.stringify(settings));
            } else {
                localStorage.setItem('selectedAiModel', selectedValue);
            }
        });
    }
    if (UI.apiSettingsBtn) UI.apiSettingsBtn.addEventListener('click', openApiSettingsModal);
    if (UI.apiSettingsCancelBtn) UI.apiSettingsCancelBtn.addEventListener('click', closeApiSettingsModal);
    if (UI.apiSettingsSaveBtn) UI.apiSettingsSaveBtn.addEventListener('click', () => saveApiSettings(true));
    if (UI.verifyApiKeyBtn) UI.verifyApiKeyBtn.addEventListener('click', handleVerifyApiKey);
    if (UI.resetTokenUsageBtn) UI.resetTokenUsageBtn.addEventListener('click', resetTokenUsage);
    if (UI.apiSettingsModalOverlay) UI.apiSettingsModalOverlay.addEventListener('click', (e) => { if (e.target === UI.apiSettingsModalOverlay) closeApiSettingsModal(); });

    // Custom Prompt Modal
    if (UI.promptSaveBtn) UI.promptSaveBtn.addEventListener('click', () => {
        if(UI.customPromptInput) {
            State.setCustomPrompt(UI.customPromptInput.value);
            localStorage.setItem('customTutorPrompt', State.customPrompt);
        }
        if (UI.promptModalOverlay) UI.promptModalOverlay.style.display = 'none';
    });
    if (UI.promptCancelBtn) UI.promptCancelBtn.addEventListener('click', () => {
        if (UI.promptModalOverlay) UI.promptModalOverlay.style.display = 'none';
    });


    // Notes App Listeners
    if (UI.addNewNoteBtn) UI.addNewNoteBtn.addEventListener('click', () => NoteManager.addNote());
    if (UI.backToListBtn) UI.backToListBtn.addEventListener('click', () => NoteManager.switchView('list'));
    if (UI.searchInput) UI.searchInput.addEventListener('input', NoteManager.renderNoteList);
    if (UI.notesList) UI.notesList.addEventListener('click', e => {
        const i = e.target.closest('.note-item');
        if (!i) return;
        const id = i.dataset.id;
        if (e.target.closest('.delete-btn')) NoteManager.handleDeleteRequest(id);
        else if (e.target.closest('.pin-btn')) NoteManager.togglePin(id);
        else NoteManager.openNoteEditor(id);
    });
    const handleNoteInput = () => {
        NoteManager.updateStatus('입력 중...', true);
        State.setDebounceTimer(setTimeout(NoteManager.saveNote, 1000));
    };
    if (UI.noteTitleInput) UI.noteTitleInput.addEventListener('input', handleNoteInput);
    if (UI.noteContentTextarea) UI.noteContentTextarea.addEventListener('input', handleNoteInput);
    if (UI.formatToolbar) UI.formatToolbar.addEventListener('click', e => {
        const b = e.target.closest('.format-btn');
        if (b) NoteManager.applyFormat(b.dataset.format);
    });
    if (UI.linkTopicBtn) UI.linkTopicBtn.addEventListener('click', () => {
        if (!UI.noteContentTextarea) return;
        const t = document.title || '현재 학습';
        UI.noteContentTextarea.value += `\n\n🔗 연관 학습: [${t}]`;
        NoteManager.saveNote();
    });

    // Backup, Restore, Reset Listeners
    if (UI.exportNotesBtn) UI.exportNotesBtn.addEventListener('click', NoteManager.exportAllData);
    if (UI.restoreDataBtn) UI.restoreDataBtn.addEventListener('click', NoteManager.handleRestoreClick);
    if (UI.fileImporter) UI.fileImporter.addEventListener('change', NoteManager.importAllData);
    if (UI.systemResetBtn) UI.systemResetBtn.addEventListener('click', NoteManager.handleSystemReset);
    
    // Sidebar Drag & Drop, Context Menus
    if(UI.sessionListContainer) setupSidebarEventListeners(UI.sessionListContainer);
    
    // Reasoning Block event delegation
    if (UI.chatMessages) setupReasoningBlockListener(UI.chatMessages);

}

// --- 4. Helper Functions for Event Listeners ---
function handleTextSelection(e) {
    if (e.target.closest('.draggable-panel, #selection-popover, .fixed-tool-container, #system-info-widget, .project-context-menu, .session-context-menu')) return;
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    State.setCurrentOpenContextMenu(null);
    if (selectedText.length > 3) {
        State.setLastSelectedText(selectedText);
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const popover = UI.selectionPopover;
        let top = rect.top + window.scrollY - popover.offsetHeight - 10;
        let left = rect.left + window.scrollX + (rect.width / 2) - (popover.offsetWidth / 2);
        popover.style.top = `${top < window.scrollY ? rect.bottom + window.scrollY + 10 : top}px`;
        popover.style.left = `${Math.max(5, Math.min(left, window.innerWidth - popover.offsetWidth - 5))}px`;
        popover.style.display = 'flex';
    } else if (!e.target.closest('#selection-popover')) {
        UI.selectionPopover.style.display = 'none';
    }
}

function handlePopoverAskAi() {
    if (!State.lastSelectedText || !UI.chatInput) return;
    togglePanel(UI.chatPanel, true);
    ChatManager.handleNewChat();
    setTimeout(() => {
        UI.chatInput.value = `"${State.lastSelectedText}"\n\n이 내용에 대해 더 자세히 설명해줄래?`;
        UI.chatInput.style.height = (UI.chatInput.scrollHeight) + 'px';
        UI.chatInput.focus();
    }, 100);
    UI.selectionPopover.style.display = 'none';
}

function handlePopoverAddNote() {
    if (!State.lastSelectedText) return;
    NoteManager.addNote(`> ${State.lastSelectedText}\n\n`);
    UI.selectionPopover.style.display = 'none';
}

function setupSidebarEventListeners(container) {
    container.addEventListener('click', (e) => {
        if (!e.target.closest('.project-context-menu')) {
            State.setCurrentOpenContextMenu(null);
        }
        const sessionItem = e.target.closest('.session-item');
        if (sessionItem) {
            const pinButton = e.target.closest('.session-pin-btn');
            if (pinButton) { e.stopPropagation(); ChatData.toggleChatPin(sessionItem.dataset.sessionId); }
            else { ChatManager.selectSession(sessionItem.dataset.sessionId); }
            return;
        }
        const projectHeader = e.target.closest('.project-header');
        if (projectHeader) {
            const actionsButton = e.target.closest('.project-actions-btn');
            const projectId = projectHeader.closest('.project-container').dataset.projectId;
            if (actionsButton) {
                e.stopPropagation();
                // showProjectContextMenu is not defined here. It should be part of ChatUI.
            } else if (!e.target.closest('input')) {
                ChatManager.toggleProjectExpansion(projectId);
            }
            return;
        }
    });

    container.addEventListener('contextmenu', (e) => {
        const sessionItem = e.target.closest('.session-item');
        if (sessionItem) {
            e.preventDefault();
            State.setCurrentOpenContextMenu(null);
            ChatUI.showSessionContextMenu(sessionItem.dataset.sessionId, e.clientX, e.clientY);
        }
    });

    let draggedItem = null;
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
        if (draggedItem) {
            draggedItem.classList.remove('is-dragging');
            draggedItem = null;
        }
        document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => {
            el.classList.remove('drag-over', 'drag-target-area');
        });
    });

    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        const targetProjectHeader = e.target.closest('.project-header');
        document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => { el.classList.remove('drag-over', 'drag-target-area'); });
        if (!draggedItem) return;
        const sourceSessionId = draggedItem.dataset.sessionId;
        const sourceSession = State.localChatSessionsCache.find(s => s.id === sourceSessionId);
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
                container.classList.add('drag-target-area');
            } else {
                e.dataTransfer.dropEffect = 'none';
            }
        }
    });

    container.addEventListener('dragleave', (e) => { if (e.target === container) { container.classList.remove('drag-target-area'); } });

    container.addEventListener('drop', async (e) => {
        e.preventDefault();
        document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => { el.classList.remove('drag-over', 'drag-target-area'); });
        if (!draggedItem) return;
        const sessionId = e.dataTransfer.getData('text/plain');
        const targetProjectHeader = e.target.closest('.project-header');
        let targetProjectId = null;
        let shouldUpdate = false;
        const sourceSession = State.localChatSessionsCache.find(s => s.id === sessionId);
        if (!sourceSession) return;
        if (targetProjectHeader) {
            targetProjectId = targetProjectHeader.closest('.project-container').dataset.projectId;
            if (sourceSession.projectId !== targetProjectId) {
                shouldUpdate = true;
            }
        } else {
            if (sourceSession.projectId) {
                targetProjectId = null;
                shouldUpdate = true;
            }
        }
        if (shouldUpdate) {
            ChatData.moveSessionToProject(sessionId, targetProjectId);
        }
    });
}

function setupReasoningBlockListener(container) {
    container.addEventListener('click', (e) => {
        const header = e.target.closest('.reasoning-header');
        if (!header) return;
        const block = header.closest('.reasoning-block');
        if (block.classList.contains('loading')) return;
        const content = block.querySelector('.reasoning-content');
        block.classList.toggle('expanded');
        content.classList.toggle('expanded');
        if (block.classList.contains('expanded')) {
            const steps = JSON.parse(block.dataset.steps);
            const fullText = steps.map(s => s.detail).filter(Boolean).join('\n\n');
            content.innerHTML = '';
            typewriterEffect(content, fullText);
        } else {
            content.innerHTML = '';
            const steps = JSON.parse(block.dataset.steps);
           // startSummaryAnimation is in chatUI.js - it's tricky to call back.
           // This indicates a need for a more robust event system or a unified controller.
        }
    });
}


// --- 5. Start the Application ---
document.addEventListener('DOMContentLoaded', initialize);