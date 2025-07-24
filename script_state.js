/*
--- Ailey & Bailey Canvas ---
File: script_state.js
Version: 14.0 (Smart Editor)
Architect: [Username] & System Architect Ailey
Description: Declares all global state variables and DOM element constants.
*/

// --- 1. Element Declarations (Global Scope) ---
const learningContent = document.getElementById('learning-content');
const wrapper = document.querySelector('.wrapper');
const body = document.body;
const systemInfoWidget = document.getElementById('system-info-widget');
const selectionPopover = document.getElementById('selection-popover');
const popoverAskAi = document.getElementById('popover-ask-ai');
const popoverAddNote = document.getElementById('popover-add-note');
const tocToggleBtn = document.getElementById('toc-toggle-btn');
const quizModalOverlay = document.getElementById('quiz-modal-overlay');
const quizContainer = document.getElementById('quiz-container');
const quizSubmitBtn = document.getElementById('quiz-submit-btn');
const quizResults = document.getElementById('quiz-results');
const startQuizBtn = document.getElementById('start-quiz-btn');
const chatModeSelector = document.getElementById('chat-mode-selector');
const chatPanel = document.getElementById('chat-panel');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const chatSendBtn = document.getElementById('chat-send-btn');
const notesAppPanel = document.getElementById('notes-app-panel');
const noteListView = document.getElementById('note-list-view');
const noteEditorView = document.getElementById('note-editor-view');
const notesList = document.getElementById('notes-list');
const backToListBtn = document.getElementById('back-to-list-btn');
const noteTitleInput = document.getElementById('note-title-input');
const noteContentTextarea = document.getElementById('note-content-textarea'); // This element is now replaced by Quill
const autoSaveStatus = document.getElementById('auto-save-status');
const linkTopicBtn = document.getElementById('link-topic-btn');
const customModal = document.getElementById('custom-modal');
const modalMessage = document.getElementById('modal-message');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const promptModalOverlay = document.getElementById('prompt-modal-overlay');
const customPromptInput = document.getElementById('custom-prompt-input');
const promptSaveBtn = document.getElementById('prompt-save-btn');
const promptCancelBtn = document.getElementById('prompt-cancel-btn');
const themeToggle = document.getElementById('theme-toggle');
const chatToggleBtn = document.getElementById('chat-toggle-btn');
const notesAppToggleBtn = document.getElementById('notes-app-toggle-btn');
const chatSessionTitle = document.getElementById('chat-session-title');
const deleteSessionBtn = document.getElementById('delete-session-btn');
const chatWelcomeMessage = document.getElementById('chat-welcome-message');
const searchSessionsInput = document.getElementById('search-sessions-input');
const aiModelSelector = document.getElementById('ai-model-selector');
const newChatBtn = document.getElementById('new-chat-btn');
const newProjectBtn = document.getElementById('new-project-btn');
const sessionListContainer = document.getElementById('session-list-container');
const fileImporter = document.getElementById('file-importer');

let apiSettingsBtn, apiSettingsModalOverlay, apiKeyInput, verifyApiKeyBtn, apiKeyStatus,
    apiModelSelect, maxOutputTokensInput, tokenUsageDisplay, resetTokenUsageBtn,
    apiSettingsSaveBtn, apiSettingsCancelBtn;

// --- 2. State Management (Global Scope) ---
const canvasId = document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id';
let db, currentUser = null;
const appId = 'AileyBailey_Global_Space';
let debounceTimer = null, lastSelectedText = '', currentOpenContextMenu = null;

// -- Notes App State --
let notesCollectionRef, noteProjectsCollectionRef;
let localNotesCache = [], localNoteProjectsCache = [];
let unsubscribeFromNotes = null, unsubscribeFromNoteProjects = null;
let currentNoteId = null;
let newlyCreatedNoteProjectId = null;
let quillEditor = null; // NEW: To hold the Quill editor instance

// -- Chat & Project State --
let chatSessionsCollectionRef, projectsCollectionRef;
let localChatSessionsCache = [], localProjectsCache = [];
let currentSessionId = null;
let unsubscribeFromChatSessions = null, unsubscribeFromProjects = null;
let newlyCreatedProjectId = null;
const activeTimers = {};

// -- AI & Learning State --
let selectedMode = 'ailey_coaching';
let defaultModel = 'gemini-2.5-flash-preview-04-17';
let customPrompt = localStorage.getItem('customTutorPrompt') || '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.';
let currentQuizData = null;

// -- API Settings State --
let userApiSettings = {
    provider: null, apiKey: '', selectedModel: '', availableModels: [],
    maxOutputTokens: 2048, tokenUsage: { prompt: 0, completion: 0 }
};