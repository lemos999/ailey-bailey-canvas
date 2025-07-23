// js/core/state.js
// 애플리케이션의 모든 전역 상태(State)를 중앙에서 관리합니다.
// 상태는 이 파일을 통해서만 조회 및 변경되어야 합니다.

// --- Firebase & DB State ---
export let db, notesCollection, chatSessionsCollectionRef, projectsCollectionRef;
export let currentUser = null;
export const appId = 'AileyBailey_Global_Space';
export let unsubscribeFromNotes = null;
export let unsubscribeFromChatSessions = null;
export let unsubscribeFromProjects = null;

export function setDbHandles(handles) {
    db = handles.db;
    notesCollection = handles.notesCollection;
    chatSessionsCollectionRef = handles.chatSessionsCollectionRef;
    projectsCollectionRef = handles.projectsCollectionRef;
    currentUser = handles.currentUser;
}

export function setUnsubscribers(unsubs) {
    unsubscribeFromNotes = unsubs.unsubscribeFromNotes;
    unsubscribeFromChatSessions = unsubs.unsubscribeFromChatSessions;
    unsubscribeFromProjects = unsubs.unsubscribeFromProjects;
}


// --- Canvas & Note State ---
export const canvasId = document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id';
export let localNotesCache = [];
export let currentNoteId = null;
export let debounceTimer = null;
export let lastSelectedText = '';

export function setLocalNotesCache(cache) { localNotesCache = cache; }
export function setCurrentNoteId(id) { currentNoteId = id; }
export function setDebounceTimer(timer) { debounceTimer = timer; }
export function setLastSelectedText(text) { lastSelectedText = text; }

// --- Chat & Project State ---
export let localChatSessionsCache = [];
export let localProjectsCache = [];
export let currentSessionId = null;
export let selectedMode = 'ailey_coaching';
export let defaultModel = 'gemini-2.5-flash-preview-04-17';
export let customPrompt = localStorage.getItem('customTutorPrompt') || '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.';
export let currentQuizData = null;
export let currentOpenContextMenu = null;
export let newlyCreatedProjectId = null;
export const activeTimers = {}; // Manages all dynamic intervals

export function setLocalChatSessionsCache(cache) { localChatSessionsCache = cache; }
export function setLocalProjectsCache(cache) { localProjectsCache = cache; }
export function setCurrentSessionId(id) { currentSessionId = id; }
export function setSelectedMode(mode) { selectedMode = mode; }
export function setCustomPrompt(prompt) { customPrompt = prompt; }
export function setCurrentQuizData(data) { currentQuizData = data; }
export function setCurrentOpenContextMenu(menu) { currentOpenContextMenu = menu; }
export function setNewlyCreatedProjectId(id) { newlyCreatedProjectId = id; }


// --- API Settings State ---
export let userApiSettings = {
    provider: null, // 'openai', 'anthropic', 'google_paid'
    apiKey: '',
    selectedModel: '',
    availableModels: [], // List of models available for the key
    maxOutputTokens: 2048,
    tokenUsage: {
        prompt: 0,
        completion: 0
    }
};

export function setUserApiSettings(settings) {
    userApiSettings = settings;
}
