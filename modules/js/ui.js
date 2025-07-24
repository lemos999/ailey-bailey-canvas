/* Module: ui.js - Declares UI elements and handles general UI interactions. */

// --- Element Declarations ---
export const learningContent = document.getElementById('learning-content');
export const wrapper = document.querySelector('.wrapper');
export const body = document.body;
export const systemInfoWidget = document.getElementById('system-info-widget');
export const selectionPopover = document.getElementById('selection-popover');
export const popoverAskAi = document.getElementById('popover-ask-ai');
export const popoverAddNote = document.getElementById('popover-add-note');
export const tocToggleBtn = document.getElementById('toc-toggle-btn');
export const quizModalOverlay = document.getElementById('quiz-modal-overlay');
export const quizContainer = document.getElementById('quiz-container');
export const quizSubmitBtn = document.getElementById('quiz-submit-btn');
export const quizResults = document.getElementById('quiz-results');
export const startQuizBtn = document.getElementById('start-quiz-btn');
export const chatModeSelector = document.getElementById('chat-mode-selector');
export const chatPanel = document.getElementById('chat-panel');
export const chatForm = document.getElementById('chat-form');
export const chatInput = document.getElementById('chat-input');
export const chatMessages = document.getElementById('chat-messages');
export const chatSendBtn = document.getElementById('chat-send-btn');
export const notesAppPanel = document.getElementById('notes-app-panel');
export const noteListView = document.getElementById('note-list-view');
export const noteEditorView = document.getElementById('note-editor-view');
export const notesList = document.getElementById('notes-list');
export const searchInput = document.getElementById('search-input');
export const addNewNoteBtn = document.getElementById('add-new-note-btn');
export const backToListBtn = document.getElementById('back-to-list-btn');
export const noteTitleInput = document.getElementById('note-title-input');
export const noteContentTextarea = document.getElementById('note-content-textarea');
export const autoSaveStatus = document.getElementById('auto-save-status');
export const formatToolbar = document.querySelector('.format-toolbar');
export const linkTopicBtn = document.getElementById('link-topic-btn');
export const exportNotesBtn = document.getElementById('export-notes-btn');
export const customModal = document.getElementById('custom-modal');
export const modalMessage = document.getElementById('modal-message');
export const modalConfirmBtn = document.getElementById('modal-confirm-btn');
export const modalCancelBtn = document.getElementById('modal-cancel-btn');
export const promptModalOverlay = document.getElementById('prompt-modal-overlay');
export const customPromptInput = document.getElementById('custom-prompt-input');
export const promptSaveBtn = document.getElementById('prompt-save-btn');
export const promptCancelBtn = document.getElementById('prompt-cancel-btn');
export const themeToggle = document.getElementById('theme-toggle');
export const chatToggleBtn = document.getElementById('chat-toggle-btn');
export const notesAppToggleBtn = document.getElementById('notes-app-toggle-btn');

// -- Chat Session & Project UI Elements --
export const newChatBtn = document.getElementById('new-chat-btn');
export const newProjectBtn = document.getElementById('new-project-btn');
export const sessionListContainer = document.getElementById('session-list-container');
export const chatSessionTitle = document.getElementById('chat-session-title');
export const deleteSessionBtn = document.getElementById('delete-session-btn');
export const chatWelcomeMessage = document.getElementById('chat-welcome-message');
export const searchSessionsInput = document.getElementById('search-sessions-input');
export const aiModelSelector = document.getElementById('ai-model-selector');

// -- Backup & Restore UI Elements
export const restoreDataBtn = document.getElementById('restore-data-btn');
export const fileImporter = document.getElementById('file-importer');

// -- System Reset UI Element
export const systemResetBtn = document.getElementById('system-reset-btn');

// -- API Settings UI Elements (to be created dynamically) --
// These will be exported after creation in apiManager.js
export let apiSettingsBtn, apiSettingsModalOverlay, apiKeyInput, verifyApiKeyBtn, apiKeyStatus,
    apiModelSelect, maxOutputTokensInput, tokenUsageDisplay, resetTokenUsageBtn,
    apiSettingsSaveBtn, apiSettingsCancelBtn;

export function setApiSettingsElements(elements) {
    apiSettingsBtn = elements.apiSettingsBtn;
    apiSettingsModalOverlay = elements.apiSettingsModalOverlay;
    apiKeyInput = elements.apiKeyInput;
    verifyApiKeyBtn = elements.verifyApiKeyBtn;
    apiKeyStatus = elements.apiKeyStatus;
    apiModelSelect = elements.apiModelSelect;
    maxOutputTokensInput = elements.maxOutputTokensInput;
    tokenUsageDisplay = elements.tokenUsageDisplay;
    resetTokenUsageBtn = elements.resetTokenUsageBtn;
    apiSettingsSaveBtn = elements.apiSettingsSaveBtn;
    apiSettingsCancelBtn = elements.apiSettingsCancelBtn;
}

export function setupSystemInfoWidget(canvasId, currentUser) {
    if (!systemInfoWidget || !currentUser) return;
    const canvasIdDisplay = document.getElementById('canvas-id-display');
    if (canvasIdDisplay) {
        canvasIdDisplay.textContent = canvasId.substring(0, 8) + '...';
    }
    const copyBtn = document.getElementById('copy-canvas-id');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(canvasId).then(() => {
                copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" /></svg>';
                setTimeout(() => {
                    copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" /></svg>';
                }, 1500);
            });
        });
    }
    const tooltip = document.createElement('div');
    tooltip.className = 'system-tooltip';
    tooltip.innerHTML = `<div><strong>Canvas ID:</strong> ${canvasId}</div><div><strong>User ID:</strong> ${currentUser.uid}</div>`;
    systemInfoWidget.appendChild(tooltip);
}

export function initializeTooltips() {
    document.querySelectorAll('.keyword-chip[data-tooltip]').forEach(chip => {
        if (chip.querySelector('.tooltip')) {
            chip.classList.add('has-tooltip');
            chip.querySelector('.tooltip').textContent = chip.dataset.tooltip;
        }
    });
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

export function setupNavigator() {
    const scrollNav = document.getElementById('scroll-nav');
    if (!scrollNav || !learningContent) return;
    const headers = learningContent.querySelectorAll('h2, #section-4 h3, #section-5 h3, #section-6 h3');
    if (headers.length === 0) {
        scrollNav.style.display = 'none';
        if (wrapper) wrapper.classList.add('toc-hidden');
        return;
    }
    scrollNav.style.display = 'block';
    if (wrapper) wrapper.classList.remove('toc-hidden');
    const navList = document.createElement('ul');
    headers.forEach((header, index) => {
        let targetElement = header.closest('.content-section');
        if (targetElement && !targetElement.id) targetElement.id = `nav-target-${index}`;
        if (targetElement) {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            let navText = header.textContent.trim().replace(/[\[\]🤓⏳📖]/g, '').trim();
            link.textContent = navText.substring(0, 25);
            link.href = `#${targetElement.id}`;
            if (header.tagName === 'H3') {
                link.style.paddingLeft = '25px';
                link.style.fontSize = '0.9em';
            }
            listItem.appendChild(link);
            navList.appendChild(listItem);
        }
    });
    scrollNav.innerHTML = '<h3>학습 내비게이션</h3>';
    scrollNav.appendChild(navList);
    const links = scrollNav.querySelectorAll('a');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const id = entry.target.getAttribute('id');
            const navLink = scrollNav.querySelector(`a[href="#${id}"]`);
            if (navLink && entry.isIntersecting && entry.intersectionRatio > 0.5) {
                links.forEach(l => l.classList.remove('active'));
                navLink.classList.add('active');
            }
        });
    }, { rootMargin: "0px 0px -70% 0px", threshold: 0.6 });
    headers.forEach(header => {
        const target = header.closest('.content-section');
        if (target) observer.observe(target);
    });
}