/*
--- Ailey & Bailey Canvas ---
File: js/core/state.js
Version: 11.0 (Modular)
Description: Manages the global state of the application.
*/

// --- State Variables ---
let state = {
    db: null,
    notesCollection: null,
    chatSessionsCollectionRef: null,
    projectsCollectionRef: null,
    currentUser: null,
    localNotesCache: [],
    currentNoteId: null,
    unsubscribeFromNotes: null,
    debounceTimer: null,
    lastSelectedText: '',
    localChatSessionsCache: [],
    localProjectsCache: [],
    currentSessionId: null,
    unsubscribeFromChatSessions: null,
    unsubscribeFromProjects: null,
    selectedMode: 'ailey_coaching',
    defaultModel: 'gemini-2.5-flash-preview-04-17',
    customPrompt: '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.',
    currentQuizData: null,
    currentOpenContextMenu: null,
    newlyCreatedProjectId: null,
    activeTimers: {},
    userApiSettings: {
        provider: null,
        apiKey: '',
        selectedModel: '',
        availableModels: [],
        maxOutputTokens: 2048,
        tokenUsage: {
            prompt: 0,
            completion: 0
        }
    }
};

// --- State Accessors and Mutators ---

export function getState() {
    return state;
}

export function setState(newState) {
    state = { ...state, ...newState };
}

export function updateState(key, value) {
    state[key] = value;
}

export function loadInitialState() {
    const savedPrompt = localStorage.getItem('customTutorPrompt');
    if (savedPrompt) {
        state.customPrompt = savedPrompt;
    }
    const savedApiSettings = localStorage.getItem('userApiSettings');
    if (savedApiSettings) {
        state.userApiSettings = JSON.parse(savedApiSettings);
        if (!state.userApiSettings.tokenUsage) {
            state.userApiSettings.tokenUsage = { prompt: 0, completion: 0 };
        }
        if (!state.userApiSettings.availableModels) {
            state.userApiSettings.availableModels = [];
        }
    }
}
