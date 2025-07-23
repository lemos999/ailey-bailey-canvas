/*
 * domElements.js: Caches all DOM element queries for the application.
 * This centralizes all DOM access, making it easier to manage and refactor.
 */

// Main layout and content
export const learningContent = document.getElementById('learning-content');
export const wrapper = document.querySelector('.wrapper');
export const body = document.body;

// Widgets and Popovers
export const systemInfoWidget = document.getElementById('system-info-widget');
export const selectionPopover = document.getElementById('selection-popover');
export const popoverAskAi = document.getElementById('popover-ask-ai');
export const popoverAddNote = document.getElementById('popover-add-note');

// Fixed Tools
export const tocToggleBtn = document.getElementById('toc-toggle-btn');
export const themeToggle = document.getElementById('theme-toggle');
export const chatToggleBtn = document.getElementById('chat-toggle-btn');
export const notesAppToggleBtn = document.getElementById('notes-app-toggle-btn');
export const startQuizBtn = document.getElementById('start-quiz-btn');

// Chat Panel
export const chatPanel = document.getElementById('chat-panel');
export const chatForm = document.getElementById('chat-form');
export const chatInput = document.getElementById('chat-input');
export const chatMessages = document.getElementById('chat-messages');
export const chatSendBtn = document.getElementById('chat-send-btn');
export const chatWelcomeMessage = document.getElementById('chat-welcome-message');
export const chatSessionTitle = document.getElementById('chat-session-title');
export const deleteSessionBtn = document.getElementById('delete-session-btn');
export const aiModelSelector = document.getElementById('ai-model-selector');
export const chatModeSelector = document.getElementById('chat-mode-selector');

// Chat Sidebar (Projects & Sessions)
export const newChatBtn = document.getElementById('new-chat-btn');
export const newProjectBtn = document.getElementById('new-project-btn');
export const sessionListContainer = document.getElementById('session-list-container');
export const searchSessionsInput = document.getElementById('search-sessions-input');

// Notes App Panel
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
export const systemResetBtn = document.getElementById('system-reset-btn');

// Modals
export const quizModalOverlay = document.getElementById('quiz-modal-overlay');
export const quizContainer = document.getElementById('quiz-container');
export const quizSubmitBtn = document.getElementById('quiz-submit-btn');
export const quizResults = document.getElementById('quiz-results');

export const customModal = document.getElementById('custom-modal');
export const modalMessage = document.getElementById('modal-message');
export const modalConfirmBtn = document.getElementById('modal-confirm-btn');
export const modalCancelBtn = document.getElementById('modal-cancel-btn');

export const promptModalOverlay = document.getElementById('prompt-modal-overlay');
export const customPromptInput = document.getElementById('custom-prompt-input');
export const promptSaveBtn = document.getElementById('prompt-save-btn');
export const promptCancelBtn = document.getElementById('prompt-cancel-btn');

// These are created dynamically, so we'll export functions to get them
export const getApiSettingsModalElements = () => ({
    apiSettingsModalOverlay: document.getElementById('api-settings-modal-overlay'),
    apiKeyInput: document.getElementById('api-key-input'),
    verifyApiKeyBtn: document.getElementById('verify-api-key-btn'),
    apiKeyStatus: document.getElementById('api-key-status'),
    apiModelSelect: document.getElementById('api-model-select'),
    maxOutputTokensInput: document.getElementById('max-output-tokens-input'),
    tokenUsageDisplay: document.getElementById('token-usage-display'),
    resetTokenUsageBtn: document.getElementById('reset-token-usage-btn'),
    apiSettingsSaveBtn: document.getElementById('api-settings-save-btn'),
    apiSettingsCancelBtn: document.getElementById('api-settings-cancel-btn'),
    apiSettingsBtn: document.getElementById('api-settings-btn') 
});

// Backup & Restore
export const restoreDataBtn = document.getElementById('restore-data-btn');
export const fileImporter = document.getElementById('file-importer');
