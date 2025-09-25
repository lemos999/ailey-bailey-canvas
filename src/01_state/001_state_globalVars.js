/* --- Ailey & Bailey Canvas --- */
// File: 001_state_globalVars.js
// Version: 6.3 (Header Toggle State)
// Description: Added a global state variable for the header toggle button.

let learningContent, wrapper, body, systemInfoWidget, selectionPopover, popoverAskAi, popoverAddNote, tocToggleBtn;
let quizModalOverlay, quizContainer, quizSubmitBtn, quizResults, startQuizBtn;
let chatPanel, chatControlDeck, chatForm, chatInput, chatMessages, chatSendBtn, sidebarToggleBtn;
let notesAppPanel, noteListView, noteEditorView, notesList, searchInput, addNewNoteBtn, backToListBtn;
let noteTitleInput, noteContentTextarea, autoSaveStatus, formatToolbar, linkTopicBtn;
let customModal, modalMessage, modalConfirmBtn, modalCancelBtn;
let copyModalOverlay, copyModalTextarea;
let promptModalOverlay, customPromptInput, promptSaveBtn, promptCancelBtn;
let themeToggle, chatToggleBtn, notesAppToggleBtn, debuggerToggleBtn;
let newChatBtn, newProjectBtn, sessionListContainer, chatSessionTitle, deleteSessionBtn, chatWelcomeMessage, searchSessionsInput, tempSessionToggle;
let fileImporter, chatFileInput, chatAttachBtn, attachedFileDisplay;
let apiSettingsBtn, apiSettingsModalOverlay, apiKeyInput, verifyApiKeyBtn, apiKeyStatus, apiModelSelect, maxOutputTokensInput, tokenUsageDisplay, resetTokenUsageBtn, apiSettingsSaveBtn, apiSettingsCancelBtn, apiSettingsResetBtn;
let settingsControlContainer, settingsButton, settingsDisplayText, settingsPopover, aiModelSelector, quickPromptSelect, managePromptsBtn, manageApiSettingsBtn;
let debuggerPanel, debuggerContent, debuggerCopyBtn, debuggerClearBtn;
let quickQueryInput, quickQuerySendBtn, quickQueryTempToggle;
let drawingCanvasOverlay, drawingToolbar, fabricCanvasInstance, unsubscribeFromDrawing, headerToggleBtn;
let isDrawingModeActive = false;


let canvasId = 'global_fallback_id';
let db;
let currentUser = null;
const appId = 'AileyBailey_Global_Space';
let debounceTimer = null;
let lastSelectedText = '';
let notesCollectionRef, noteProjectsCollectionRef, tagsCollectionRef, noteTemplatesCollectionRef, userSettingsRef;
let localNotesCache = [], localNoteProjectsCache = [], localTagsCache = [], noteTemplatesCache = [];
let unsubscribeFromNotes = null, unsubscribeFromNoteProjects = null, unsubscribeFromTags = null, unsubscribeFromNoteTemplates = null;
let currentNoteId = null;
let newlyCreatedNoteProjectId = null;
let currentNoteSort = 'updatedAt_desc';
let draggedNoteId = null;
let chatSessionsCollectionRef, projectsCollectionRef, canvasDrawingsCollectionRef;
let localChatSessionsCache = [], localProjectsCache = [];
let currentSessionId = null;
let temporarySession = { messages: [], contextSent: false };
let attachedFile = null;
let stagedHiddenContext = null;
let unsubscribeFromChatSessions = null, unsubscribeFromProjects = null, unsubscribeFromMessages = null;
let newlyCreatedProjectId = null;
const activeTimers = {};
let pendingResponses = new Set();
let activeStreams = {};
let completedButUnseenResponses = new Set();
let promptTemplatesCollectionRef;
let promptTemplatesCache = [];
let unsubscribeFromPromptTemplates = null;
let selectedTemplateId = null;
let activePromptId = null;
let defaultModel = 'gemini-2.5-flash-preview-04-17';
let customPrompt = localStorage.getItem('customTutorPrompt') || '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.';
let currentQuizData = null;
let noteGraphData = { nodes: [], edges: [] };
let userApiSettings = { provider: null, apiKey: '', selectedModel: '', availableModels: [], maxOutputTokens: 65536, tokenUsage: { prompt: 0, completion: 0 }, panelStates: {} };
let isQuickQueryTempMode = false;
let debouncedSaveUserSettings;
// --- Panel Focus State ---
let highestZIndex = 1100;
// --- Session-specific State ---
let currentSessionState = {
    isLoadingMore: false,
    hasMoreMessages: true,
    oldestMessageTimestamp: null,
    lastMessageTimestamp: null
};

// --- Note Infinite Scroll State ---
let isNoteLoadingMore = false;
let lastVisibleNoteTimestamp = null;
let hasMoreNotes = true;

function rebindDOMElements() {
    learningContent = document.getElementById('learning-content');
    wrapper = document.querySelector('.wrapper');
    body = document.body;
    systemInfoWidget = document.getElementById('system-info-widget');
    selectionPopover = document.getElementById('selection-popover');
    popoverAskAi = document.getElementById('popover-ask-ai');
    popoverAddNote = document.getElementById('popover-add-note');
    quizModalOverlay = document.getElementById('quiz-modal-overlay');
    quizContainer = document.getElementById('quiz-container');
    quizSubmitBtn = document.getElementById('quiz-submit-btn');
    quizResults = document.getElementById('quiz-results');
    chatPanel = document.getElementById('chat-panel');
    chatControlDeck = document.getElementById('chat-control-deck');
    chatForm = document.getElementById('chat-form');
    chatInput = document.getElementById('chat-input');
    chatMessages = document.getElementById('chat-messages');
    chatSendBtn = document.getElementById('chat-send-btn');
    sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    notesAppPanel = document.getElementById('notes-app-panel');
    noteListView = document.getElementById('note-list-view');
    noteEditorView = document.getElementById('note-editor-view');
    backToListBtn = document.getElementById('back-to-list-btn');
    noteTitleInput = document.getElementById('note-title-input');
    autoSaveStatus = document.getElementById('auto-save-status');
    customModal = document.getElementById('custom-modal');
    modalMessage = document.getElementById('modal-message');
    modalConfirmBtn = document.getElementById('modal-confirm-btn');
    modalCancelBtn = document.getElementById('modal-cancel-btn');
    copyModalOverlay = document.getElementById('copy-modal-overlay');
    copyModalTextarea = document.getElementById('copy-modal-textarea');
    promptModalOverlay = document.getElementById('prompt-modal-overlay');
    customPromptInput = document.getElementById('custom-prompt-input');
    promptSaveBtn = document.getElementById('prompt-save-btn');
    promptCancelBtn = document.getElementById('prompt-cancel-btn');
    themeToggle = document.getElementById('theme-toggle');
    chatToggleBtn = document.getElementById('chat-toggle-btn');
    notesAppToggleBtn = document.getElementById('notes-app-toggle-btn');
    debuggerToggleBtn = document.getElementById('debugger-toggle-btn');
    newChatBtn = document.getElementById('new-chat-btn');
    newProjectBtn = document.getElementById('new-project-btn');
    sessionListContainer = document.getElementById('session-list-container');
    chatSessionTitle = document.getElementById('chat-session-title');
    deleteSessionBtn = document.getElementById('delete-session-btn');
    chatWelcomeMessage = document.getElementById('chat-welcome-message');
    searchSessionsInput = document.getElementById('search-sessions-input');
    tempSessionToggle = document.getElementById('temp-session-toggle');
    fileImporter = document.getElementById('file-importer');
    chatFileInput = document.getElementById('chat-file-input');
    chatAttachBtn = document.getElementById('chat-attach-btn');
    attachedFileDisplay = document.getElementById('attached-file-display');
    settingsControlContainer = document.getElementById('settings-control-container');
    settingsButton = document.getElementById('settings-button');
    settingsDisplayText = document.getElementById('settings-display-text');
    settingsPopover = document.getElementById('settings-popover');
    aiModelSelector = document.getElementById('ai-model-selector');
    quickPromptSelect = document.getElementById('quick-prompt-select');
    managePromptsBtn = document.getElementById('manage-prompts-btn');
    manageApiSettingsBtn = document.getElementById('manage-api-settings-btn');
    promptManagerModalOverlay = document.getElementById('prompt-manager-modal-overlay');
    promptManagerCloseBtn = document.getElementById('prompt-manager-close-btn');
    templateListContainer = document.getElementById('template-list-container');
    addNewTemplateBtn = document.getElementById('add-new-template-btn');
    templateEditorPanel = document.querySelector('.template-editor-panel');
    templateNameInput = document.getElementById('template-name-input');
    templatePromptTextarea = document.getElementById('template-prompt-textarea');
    saveTemplateBtn = document.getElementById('save-template-btn');
    deleteTemplateBtn = document.getElementById('delete-template-btn');
    debuggerPanel = document.getElementById('live-debugger-panel');
    debuggerContent = document.getElementById('live-debugger-content');
    debuggerCopyBtn = document.getElementById('debugger-copy-btn');
    debuggerClearBtn = document.getElementById('debugger-clear-btn');
    quickQueryInput = document.getElementById('quick-query-input');
    quickQuerySendBtn = document.getElementById('quick-query-send-btn');
    quickQueryTempToggle = document.getElementById('quick-query-temp-toggle');
    drawingCanvasOverlay = document.getElementById('drawing-canvas-overlay');
    drawingToolbar = document.getElementById('drawing-toolbar');
    headerToggleBtn = document.getElementById('header-toggle-btn'); // [PATCH]
}