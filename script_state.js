/*
--- Ailey & Bailey Canvas ---
File: script_state.js
Version: 13.2 (UX Enhancement)
Architect: [Username] & System Architect Ailey
Description: Declares all global state variables and DOM element constants. This file must be loaded first to ensure all other script modules can access this shared state.
*/

// --- 1. Element Declarations (Global Scope) ---
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

// -- Backup & Restore UI Elements (Now part of dropdown) --
export const fileImporter = document.getElementById('file-importer');

// -- API Settings UI Elements (dynamically created) --
export let apiSettingsBtn, apiSettingsModalOverlay, apiKeyInput, verifyApiKeyBtn, apiKeyStatus,
    apiModelSelect, maxOutputTokensInput, tokenUsageDisplay, resetTokenUsageBtn,
    apiSettingsSaveBtn, apiSettingsCancelBtn;

// --- 2. State Management (Global Scope) ---
export const canvasId = document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id';
export let db;
export let currentUser = null;
export const appId = 'AileyBailey_Global_Space';
export let debounceTimer = null;
export let lastSelectedText = '';
export let currentOpenContextMenu = null;

// -- Notes App State --
export let notesCollectionRef, noteProjectsCollectionRef, tagsCollectionRef, noteTemplatesCollectionRef;
export let localNotesCache = [], localNoteProjectsCache = [], localTagsCache = [], noteTemplatesCache = [];
export let unsubscribeFromNotes = null, unsubscribeFromNoteProjects = null, unsubscribeFromTags = null, unsubscribeFromNoteTemplates = null;
export let currentNoteId = null;
export let newlyCreatedNoteProjectId = null;
export let currentNoteSort = 'updatedAt_desc';
export let draggedNoteId = null; // [NEW] For drag & drop

// -- Chat & Project State --
export let chatSessionsCollectionRef, projectsCollectionRef;
export let localChatSessionsCache = [], localProjectsCache = [];
export let currentSessionId = null;
export let unsubscribeFromChatSessions = null, unsubscribeFromProjects = null;
export let newlyCreatedProjectId = null;
export const activeTimers = {};

// -- AI & Learning State --
export let selectedMode = 'ailey_coaching';
export let defaultModel = 'gemini-2.5-flash-preview-04-17';
export let customPrompt = localStorage.getItem('customTutorPrompt') || '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.';
export let currentQuizData = null;
export let noteGraphData = { nodes: [], edges: [] };

// -- API Settings State --
export let userApiSettings = {
    provider: null, apiKey: '', selectedModel: '', availableModels: [],
    maxOutputTokens: 2048, tokenUsage: { prompt: 0, completion: 0 }
};