/* js/_state.js */
// State Management
export let db, notesCollection, chatSessionsCollectionRef, projectsCollectionRef;
export let currentUser = null;
export const appId = 'AileyBailey_Global_Space';
export let localNotesCache = [];
export let currentNoteId = null;
export let unsubscribeFromNotes = null;
export let debounceTimer = null;
export let lastSelectedText = '';

// CHAT & PROJECT STATE
export let localChatSessionsCache = [];
export let localProjectsCache = [];
export let currentSessionId = null;
export let unsubscribeFromChatSessions = null;
export let unsubscribeFromProjects = null;
export let selectedMode = 'ailey_coaching';
export let defaultModel = 'gemini-2.5-flash-preview-04-17';
export let customPrompt = localStorage.getItem('customTutorPrompt') || '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.';
export let currentQuizData = null;
export let currentOpenContextMenu = null;
export let newlyCreatedProjectId = null;
export const activeTimers = {};

// API Settings State
export let userApiSettings = {
    provider: null,
    apiKey: '',
    selectedModel: '',
    availableModels: [],
    maxOutputTokens: 2048,
    tokenUsage: {
        prompt: 0,
        completion: 0
    }
};

export function setDb(newDb) {
    db = newDb;
}

export function setNotesCollection(newCollection) {
    notesCollection = newCollection;
}

export function setChatSessionsCollectionRef(newRef) {
    chatSessionsCollectionRef = newRef;
}

export function setProjectsCollectionRef(newRef) {
    projectsCollectionRef = newRef;
}

export function setCurrentUser(newUser) {
    currentUser = newUser;
}

export function setLocalNotesCache(newCache) {
    localNotesCache = newCache;
}

export function setCurrentNoteId(newId) {
    currentNoteId = newId;
}

export function setUnsubscribeFromNotes(newUnsubscribe) {
    unsubscribeFromNotes = newUnsubscribe;
}

export function setDebounceTimer(newTimer) {
    debounceTimer = newTimer;
}

export function setLastSelectedText(newText) {
    lastSelectedText = newText;
}

export function setLocalChatSessionsCache(newCache) {
    localChatSessionsCache = newCache;
}

export function setLocalProjectsCache(newCache) {
    localProjectsCache = newCache;
}

export function setCurrentSessionId(newId) {
    currentSessionId = newId;
}

export function setUnsubscribeFromChatSessions(newUnsubscribe) {
    unsubscribeFromChatSessions = newUnsubscribe;
}

export function setUnsubscribeFromProjects(newUnsubscribe) {
    unsubscribeFromProjects = newUnsubscribe;
}

export function setSelectedMode(newMode) {
    selectedMode = newMode;
}

export function setDefaultModel(newModel) {
    defaultModel = newModel;
}

export function setCustomPrompt(newPrompt) {
    customPrompt = newPrompt;
}

export function setCurrentQuizData(newData) {
    currentQuizData = newData;
}

export function setCurrentOpenContextMenu(newMenu) {
    currentOpenContextMenu = newMenu;
}

export function setNewlyCreatedProjectId(newId) {
    newlyCreatedProjectId = newId;
}

export function setUserApiSettings(newSettings) {
    userApiSettings = newSettings;
}
