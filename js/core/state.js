/*
--- Module: state.js ---
Description: Manages the global state and element references for the application.
*/

// Encapsulated state object
const state = {
    // Core identifiers
    canvasId: '',
    appId: 'AileyBailey_Global_Space',

    // Firebase instances
    db: null,
    auth: null,
    notesCollection: null,
    chatSessionsCollection: null,
    projectsCollection: null,

    // UI Element References
    elements: {},

    // Caches and runtime state
    notesCache: [],
    chatSessionsCache: [],
    projectsCache: [],

    currentNoteId: null,
    currentSessionId: null,
    newlyCreatedProjectId: null,

    debounceTimer: null,
    lastSelectedText: '',
    currentOpenContextMenu: null,
    activeTimers: {}, // Manages all dynamic intervals for cleanup
};

// --- Getters and Setters for safe access ---

// Getters
export const getState = () => state;
export const getDb = () => state.db;
export const getAuth = () => state.auth;
export const getElements = () => state.elements;
export const getChatSessionsCollection = () => state.chatSessionsCollection;
export const getProjectsCollection = () => state.projectsCollection;

// Setters
export const setDb = (dbInstance) => { state.db = dbInstance; };
export const setAuth = (authInstance) => { state.auth = authInstance; };
export const setNotesCollection = (collectionRef) => { state.notesCollection = collectionRef; };
export const setChatSessionsCollection = (collectionRef) => { state.chatSessionsCollection = collectionRef; };
export const setProjectsCollection = (collectionRef) => { state.projectsCollection = collectionRef; };

export const setLastSelectedText = (text) => { state.lastSelectedText = text; };
export const setCurrentSessionId = (id) => { state.currentSessionId = id; };
export const setCurrentOpenContextMenu = (menu) => { state.currentOpenContextMenu = menu; };
export const setChatSessionsCache = (cache) => { state.chatSessionsCache = cache; };
export const setProjectsCache = (cache) => { state.projectsCache = cache; };
export const setNewlyCreatedProjectId = (id) => { state.newlyCreatedProjectId = id; };
export const setActiveTimers = (timers) => { state.activeTimers = timers; };


// --- Initialization ---

export function loadState() {
    state.canvasId = document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id';

    // Cache all DOM elements at the start
    state.elements = {
        body: document.body,
        wrapper: document.querySelector('.wrapper'),
        systemInfoWidget: document.getElementById('system-info-widget'),
        selectionPopover: document.getElementById('selection-popover'),

        // Panels
        chatPanel: document.getElementById('chat-panel'),
        notesAppPanel: document.getElementById('notes-app-panel'),

        // Modals
        quizModalOverlay: document.getElementById('quiz-modal-overlay'),
        promptModalOverlay: document.getElementById('prompt-modal-overlay'),
        customModal: document.getElementById('custom-modal'),
        modalMessage: document.getElementById('modal-message'),
        modalConfirmBtn: document.getElementById('modal-confirm-btn'),
        modalCancelBtn: document.getElementById('modal-cancel-btn'),

        // Learning Content Area
        learningContent: document.getElementById('learning-content'),

        // Chat Elements
        chatForm: document.getElementById('chat-form'),
        chatInput: document.getElementById('chat-input'),
        chatMessages: document.getElementById('chat-messages'),
        chatSendBtn: document.getElementById('chat-send-btn'),
        chatSessionTitle: document.getElementById('chat-session-title'),
        chatWelcomeMessage: document.getElementById('chat-welcome-message'),
        deleteSessionBtn: document.getElementById('delete-session-btn'),
        newChatBtn: document.getElementById('new-chat-btn'),
        newProjectBtn: document.getElementById('new-project-btn'),
        sessionListContainer: document.getElementById('session-list-container'),
        searchSessionsInput: document.getElementById('search-sessions-input'),
        aiModelSelector: document.getElementById('ai-model-selector'),
        chatModeSelector: document.getElementById('chat-mode-selector'),

        // Notes Elements
        noteListView: document.getElementById('note-list-view'),
        noteEditorView: document.getElementById('note-editor-view'),
        notesList: document.getElementById('notes-list'),
        addNewNoteBtn: document.getElementById('add-new-note-btn'),
        backToListBtn: document.getElementById('back-to-list-btn'),
        noteTitleInput: document.getElementById('note-title-input'),
        noteContentTextarea: document.getElementById('note-content-textarea'),
        autoSaveStatus: document.getElementById('auto-save-status'),

        // Global Tool Buttons
        themeToggle: document.getElementById('theme-toggle'),
        tocToggleBtn: document.getElementById('toc-toggle-btn'),
        chatToggleBtn: document.getElementById('chat-toggle-btn'),
        notesAppToggleBtn: document.getElementById('notes-app-toggle-btn'),

        // Data Management Buttons
        systemResetBtn: document.getElementById('system-reset-btn'),
        exportNotesBtn: document.getElementById('export-notes-btn'),
        restoreDataBtn: document.getElementById('restore-data-btn'),
        fileImporter: document.getElementById('file-importer'),
    };
}