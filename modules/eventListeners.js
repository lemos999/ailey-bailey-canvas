/* --- Module: Event Listener Setup --- */
import * as dom from './dom.js';
import { dynamicElements as dElements } from './dom.js';
import * as mainContent from './mainContent.js';
import * as notes from './notes.js';
import * as chat from './chat.js';
import * as apiSettings from './apiSettings.js';
import { showModal, removeContextMenu, togglePanel } from './ui.js';
import { setLastSelectedText, getUserApiSettings, setDefaultModel } from './state.js';
import { handlePopoverAskAi, handlePopoverAddNote, handleSystemReset, exportAllData, importAllData, handleRestoreClick } from '../script.js';

export function initializeEventListeners() {
    // --- Global Click Listener for text selection and context menu ---
    document.addEventListener('click', (e) => {
        mainContent.handleTextSelection(e);
        if (!e.target.closest('.session-context-menu, .project-context-menu')) {
            removeContextMenu();
        }
    });

    // --- Popover and Theme ---
    dom.popoverAskAi?.addEventListener('click', handlePopoverAskAi);
    dom.popoverAddNote?.addEventListener('click', handlePopoverAddNote);
    if (dom.themeToggle) {
        dom.themeToggle.addEventListener('click', () => {
            dom.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', dom.body.classList.contains('dark-mode') ? 'dark' : 'light');
        });
        if (localStorage.getItem('theme') === 'dark') dom.body.classList.add('dark-mode');
    }

    // --- Panel Toggles ---
    dom.tocToggleBtn?.addEventListener('click', () => {
        dom.wrapper.classList.toggle('toc-hidden');
        dom.systemInfoWidget?.classList.toggle('tucked');
    });
    dom.chatToggleBtn?.addEventListener('click', () => togglePanel(dom.chatPanel));
    dom.chatPanel?.querySelector('.close-btn').addEventListener('click', () => togglePanel(dom.chatPanel, false));
    dom.notesAppToggleBtn?.addEventListener('click', () => {
        togglePanel(dom.notesAppPanel);
        if(dom.notesAppPanel.style.display === 'flex') notes.renderNoteList();
    });

    // --- Main Content Interactions (Quiz) ---
    dom.startQuizBtn?.addEventListener('click', mainContent.startQuiz);
    dom.quizSubmitBtn?.addEventListener('click', mainContent.handleSubmitQuiz);
    dom.quizModalOverlay?.addEventListener('click', e => { if (e.target === dom.quizModalOverlay) dom.quizModalOverlay.style.display = 'none'; });

    // --- Notes App Event Listeners ---
    dom.addNewNoteBtn?.addEventListener('click', () => notes.addNote());
    dom.backToListBtn?.addEventListener('click', () => notes.switchView('list'));
    dom.searchInput?.addEventListener('input', notes.renderNoteList);
    dom.noteTitleInput?.addEventListener('input', notes.handleNoteInput);
    dom.noteContentTextarea?.addEventListener('input', notes.handleNoteInput);
    dom.notesList?.addEventListener('click', e => {
        const item = e.target.closest('.note-item');
        if (!item) return;
        const id = item.dataset.id;
        if (e.target.closest('.delete-btn')) notes.handleDeleteRequest(id);
        else if (e.target.closest('.pin-btn')) notes.togglePin(id);
        else notes.openNoteEditor(id);
    });
    dom.formatToolbar?.addEventListener('click', e => {
        const btn = e.target.closest('.format-btn');
        if (btn) notes.applyFormat(btn.dataset.format);
    });
    dom.linkTopicBtn?.addEventListener('click', notes.handleLinkTopic);

    // --- Chat App Event Listeners ---
    dom.chatForm?.addEventListener('submit', e => { e.preventDefault(); chat.handleChatSend(); });
    dom.chatInput?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chat.handleChatSend(); } });
    dom.newChatBtn?.addEventListener('click', chat.handleNewChat);
    dom.newProjectBtn?.addEventListener('click', chat.createNewProject);
    dom.searchSessionsInput?.addEventListener('input', chat.renderSidebarContent);
    dom.deleteSessionBtn?.addEventListener('click', () => chat.handleDeleteSession(state.getCurrentSessionId()));
    if(dom.sessionListContainer) {
        // Drag and Drop, Context Menu, Click events for projects and sessions
        // This is complex, so we'll break it down.
        setupSessionListEventListeners();
    }
    dom.chatMessages.addEventListener('click', (e) => {
        const header = e.target.closest('.reasoning-header');
        if (!header) return;
        const block = header.closest('.reasoning-block');
        if (block.classList.contains('loading')) return;
        block.classList.toggle('expanded');
        const content = block.querySelector('.reasoning-content');
        content.classList.toggle('expanded');
        if(block.classList.contains('expanded')) {
            const steps = JSON.parse(block.dataset.steps);
            content.innerHTML = '';
            typewriterEffect(content, steps.map(s => s.detail).filter(Boolean).join('\\n\\n'));
        } else {
            clearTimers(block.id);
            startSummaryAnimation(block, JSON.parse(block.dataset.steps));
        }
    });

    // --- API Settings Listeners ---
    // Note: apiSettingsBtn is added dynamically. We attach the listener to a static parent.
    dom.chatPanel?.querySelector('.panel-header').addEventListener('click', e => {
        if(e.target.closest('#api-settings-btn')) apiSettings.openApiSettingsModal();
    });
    dElements.apiSettingsCancelBtn?.addEventListener('click', apiSettings.closeApiSettingsModal);
    dElements.apiSettingsSaveBtn?.addEventListener('click', () => apiSettings.saveApiSettings(true));
    dElements.verifyApiKeyBtn?.addEventListener('click', apiSettings.handleVerifyApiKey);
    dElements.resetTokenUsageBtn?.addEventListener('click', apiSettings.resetTokenUsage);
    dElements.apiSettingsModalOverlay?.addEventListener('click', e => { if (e.target === dElements.apiSettingsModalOverlay) apiSettings.closeApiSettingsModal(); });
    
    // Default model selector
    dom.aiModelSelector?.addEventListener('change', () => {
        const selectedValue = dom.aiModelSelector.value;
        if (getUserApiSettings().provider && getUserApiSettings().apiKey) {
            let settings = getUserApiSettings();
            settings.selectedModel = selectedValue;
            apiSettings.saveApiSettings(false); // don't close modal
        } else {
            setDefaultModel(selectedValue);
            localStorage.setItem('selectedAiModel', selectedValue);
        }
    });

    // --- Backup & Restore ---
    dom.exportNotesBtn?.addEventListener('click', exportAllData);
    dom.restoreDataBtn?.addEventListener('click', handleRestoreClick);
    dom.fileImporter?.addEventListener('change', importAllData);
    dom.systemResetBtn?.addEventListener('click', handleSystemReset);
}

function setupSessionListEventListeners() {
    let draggedItem = null;

    dom.sessionListContainer.addEventListener('click', (e) => {
        const projectHeader = e.target.closest('.project-header');
        if (projectHeader) {
            const projectId = projectHeader.closest('.project-container').dataset.projectId;
            if (e.target.closest('.project-actions-btn')) {
                // Actions button logic here if needed, or handled via context menu
            } else if (!e.target.closest('input')) {
                chat.toggleProjectExpansion(projectId);
            }
            return;
        }

        const sessionItem = e.target.closest('.session-item');
        if (sessionItem) {
            if (e.target.closest('.session-pin-btn')) {
                e.stopPropagation();
                chat.toggleChatPin(sessionItem.dataset.sessionId);
            } else {
                chat.selectSession(sessionItem.dataset.sessionId);
            }
        }
    });

    dom.sessionListContainer.addEventListener('contextmenu', (e) => {
        const projectHeader = e.target.closest('.project-header');
        if(projectHeader) {
            e.preventDefault(); removeContextMenu();
            // showProjectContextMenu(projectHeader.closest('.project-container').dataset.projectId, e.clientX, e.clientY);
        }
        const sessionItem = e.target.closest('.session-item');
        if(sessionItem) {
            e.preventDefault(); removeContextMenu();
            // showSessionContextMenu(sessionItem.dataset.sessionId, e.clientX, e.clientY);
        }
    });

    dom.sessionListContainer.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('session-item')) {
            draggedItem = e.target;
            setTimeout(() => e.target.classList.add('is-dragging'), 0);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedItem.dataset.sessionId);
        } else {
            e.preventDefault();
        }
    });

    dom.sessionListContainer.addEventListener('dragend', () => {
        if(draggedItem) draggedItem.classList.remove('is-dragging');
        draggedItem = null;
        document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => el.classList.remove('drag-over', 'drag-target-area'));
    });

    dom.sessionListContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        const targetProjectHeader = e.target.closest('.project-header');
        document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => el.classList.remove('drag-over', 'drag-target-area'));
        if (!draggedItem) return;

        if (targetProjectHeader) {
            targetProjectHeader.classList.add('drag-over');
            e.dataTransfer.dropEffect = 'move';
        } else {
            dom.sessionListContainer.classList.add('drag-target-area');
            e.dataTransfer.dropEffect = 'move';
        }
    });

    dom.sessionListContainer.addEventListener('dragleave', (e) => {
        const targetProjectHeader = e.target.closest('.project-header');
        if (targetProjectHeader) targetProjectHeader.classList.remove('drag-over');
        if (e.target === dom.sessionListContainer) dom.sessionListContainer.classList.remove('drag-target-area');
    });

    dom.sessionListContainer.addEventListener('drop', async (e) => {
        e.preventDefault();
        document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => el.classList.remove('drag-over', 'drag-target-area'));
        if (!draggedItem) return;

        const sessionId = e.dataTransfer.getData('text/plain');
        const targetProjectHeader = e.target.closest('.project-header');
        const targetProjectId = targetProjectHeader ? targetProjectHeader.closest('.project-container').dataset.projectId : null;
        
        // await chat.moveSessionToProject(sessionId, targetProjectId);
    });
}
