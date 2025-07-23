// 모든 DOM 요소를 이곳에서 한 번만 선언합니다.
export const dom = {
    // Layout
    learningContent: document.getElementById('learning-content'),
    wrapper: document.querySelector('.wrapper'),
    body: document.body,
    
    // Widgets & Popovers
    systemInfoWidget: document.getElementById('system-info-widget'),
    canvasIdDisplay: document.getElementById('canvas-id-display'),
    copyCanvasId: document.getElementById('copy-canvas-id'),
    realTimeClock: document.getElementById('real-time-clock'),
    selectionPopover: document.getElementById('selection-popover'),
    
    // Buttons
    popoverAskAi: document.getElementById('popover-ask-ai'),
    popoverAddNote: document.getElementById('popover-add-note'),
    tocToggleBtn: document.getElementById('toc-toggle-btn'),
    startQuizBtn: document.getElementById('start-quiz-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    chatToggleBtn: document.getElementById('chat-toggle-btn'),
    notesAppToggleBtn: document.getElementById('notes-app-toggle-btn'),
    
    // Modals
    quizModalOverlay: document.getElementById('quiz-modal-overlay'),
    promptModalOverlay: document.getElementById('prompt-modal-overlay'),
    customModal: document.getElementById('custom-modal'),
    modalMessage: document.getElementById('modal-message'),
    modalConfirmBtn: document.getElementById('modal-confirm-btn'),
    modalCancelBtn: document.getElementById('modal-cancel-btn'),

    // Quiz
    quizContainer: document.getElementById('quiz-container'),
    quizSubmitBtn: document.getElementById('quiz-submit-btn'),
    quizResults: document.getElementById('quiz-results'),

    // Chat Panel
    chatPanel: document.getElementById('chat-panel'),
    chatForm: document.getElementById('chat-input-form'), // form ID 변경 필요
    chatInput: document.getElementById('chat-input'),
    chatMessages: document.getElementById('chat-messages'),
    chatSendBtn: document.getElementById('chat-send-btn'),
    chatModeSelector: document.getElementById('chat-mode-selector'),
    chatWelcomeMessage: document.getElementById('chat-welcome-message'),

    // Chat Sidebar
    newChatBtn: document.getElementById('new-chat-btn'),
    newProjectBtn: document.getElementById('new-project-btn'),
    sessionListContainer: document.getElementById('session-list-container'),
    chatSessionTitle: document.getElementById('chat-session-title'),
    deleteSessionBtn: document.getElementById('delete-session-btn'),
    searchSessionsInput: document.getElementById('search-sessions-input'),
    aiModelSelector: document.getElementById('ai-model-selector'),
    
    // Notes App
    notesAppPanel: document.getElementById('notes-app-panel'),
    noteListView: document.getElementById('note-list-view'),
    noteEditorView: document.getElementById('note-editor-view'),
    notesList: document.getElementById('notes-list'),
    searchInput: document.getElementById('search-input'),
    addNewNoteBtn: document.getElementById('add-new-note-btn'),
    backToListBtn: document.getElementById('back-to-list-btn'),
    noteTitleInput: document.getElementById('note-title-input'),
    noteContentTextarea: document.getElementById('note-content-textarea'),
    autoSaveStatus: document.getElementById('auto-save-status'),
    formatToolbar: document.querySelector('.format-toolbar'),
    linkTopicBtn: document.getElementById('link-topic-btn'),
    exportNotesBtn: document.getElementById('export-notes-btn'),
    restoreDataBtn: document.getElementById('restore-data-btn'),
    fileImporter: document.createElement('input'), // 동적으로 생성
    systemResetBtn: document.getElementById('system-reset-btn'),

    // API Settings (dynamically created)
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

    // Prompt Modal
    customPromptInput: document.getElementById('custom-prompt-input'),
    promptSaveBtn: document.getElementById('prompt-save-btn'),
    promptCancelBtn: document.getElementById('prompt-cancel-btn')
};

// 동적 생성 요소 설정
dom.fileImporter.type = 'file';
dom.fileImporter.style.display = 'none';
document.body.appendChild(dom.fileImporter);
