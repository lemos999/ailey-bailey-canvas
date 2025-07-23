/* --- Module: DOM Element Selections --- */
// 이 파일은 모든 DOM 요소 선택을 중앙에서 관리합니다.
// 다른 모든 모듈은 이 파일에서 필요한 요소를 import하여 사용합니다.

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
export const newChatBtn = document.getElementById('new-chat-btn');
export const newProjectBtn = document.getElementById('new-project-btn');
export const sessionListContainer = document.getElementById('session-list-container');
export const chatSessionTitle = document.getElementById('chat-session-title');
export const deleteSessionBtn = document.getElementById('delete-session-btn');
export const chatWelcomeMessage = document.getElementById('chat-welcome-message');
export const searchSessionsInput = document.getElementById('search-sessions-input');
export const aiModelSelector = document.getElementById('ai-model-selector');
export const restoreDataBtn = document.getElementById('restore-data-btn');
export const fileImporter = document.getElementById('file-importer');
export const systemResetBtn = document.getElementById('system-reset-btn');

// API Settings Modal 요소들은 동적으로 생성되므로, 생성 후 참조를 할당해야 합니다.
// 이들을 담을 export 객체를 미리 정의합니다.
export const dynamicElements = {
    apiSettingsBtn: null,
    apiSettingsModalOverlay: null,
    apiKeyInput: null,
    verifyApiKeyBtn: null,
    apiKeyStatus: null,
    apiModelSelect: null,
    maxOutputTokensInput: null,
    tokenUsageDisplay: null,
    resetTokenUsageBtn: null,
    apiSettingsSaveBtn: null,
    apiSettingsCancelBtn: null,
};
