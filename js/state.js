/*
--- Ailey & Bailey Canvas ---
File: js/state.js
Version: 11.0 (Refactored)
Description: Acts as the single source of truth for the application's shared state.
It exports state variables and setter functions to be used by other modules.
*/

// --- Constants ---
export const canvasId = document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id';
export const appId = 'AileyBailey_Global_Space';

// --- Mutable State & Setters ---

// Firebase-related state
export let db = null;
export let notesCollection = null;
export let chatSessionsCollectionRef = null;
export let projectsCollectionRef = null;
export let currentUser = null;
export let unsubscribeFromNotes = null;
export let unsubscribeFromChatSessions = null;
export let unsubscribeFromProjects = null;

export function setFirebaseInstances(instances) {
    if (instances.db) db = instances.db;
    if (instances.currentUser) currentUser = instances.currentUser;
    if (instances.notesCollection) notesCollection = instances.notesCollection;
    if (instances.chatSessionsCollectionRef) chatSessionsCollectionRef = instances.chatSessionsCollectionRef;
    if (instances.projectsCollectionRef) projectsCollectionRef = instances.projectsCollectionRef;
}
export function setUnsubscribers(unsubs) {
    if (unsubs.notes) unsubscribeFromNotes = unsubs.notes;
    if (unsubs.chat) unsubscribeFromChatSessions = unsubs.chat;
    if (unsubs.projects) unsubscribeFromProjects = unsubs.projects;
}


// Cache state
export let localNotesCache = [];
export let localChatSessionsCache = [];
export let localProjectsCache = [];

export function setLocalNotesCache(cache) { localNotesCache = cache; }
export function setLocalChatSessionsCache(cache) { localChatSessionsCache = cache; }
export function setLocalProjectsCache(cache) { localProjectsCache = cache; }


// Active item state
export let currentNoteId = null;
export let currentSessionId = null;
export let newlyCreatedProjectId = null;

export function setCurrentNoteId(id) { currentNoteId = id; }
export function setCurrentSessionId(id) { currentSessionId = id; }
export function setNewlyCreatedProjectId(id) { newlyCreatedProjectId = id; }


// UI & Interaction State
export let lastSelectedText = '';
export let currentOpenContextMenu = null;
export let debounceTimer = null;
export const activeTimers = {}; // Stores interval/timeout IDs

export function setLastSelectedText(text) { lastSelectedText = text; }
export function setCurrentOpenContextMenu(menu) { currentOpenContextMenu = menu; }
export function setDebounceTimer(timer) { debounceTimer = timer; }


// Settings & Mode State
export let selectedMode = 'ailey_coaching';
export let defaultModel = 'gemini-2.5-flash-preview-04-17';
export let customPrompt = localStorage.getItem('customTutorPrompt') || '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.';
export let currentQuizData = null;
export let userApiSettings = {
    provider: null,
    apiKey: '',
    selectedModel: '',
    availableModels: [],
    maxOutputTokens: 2048,
    tokenUsage: { prompt: 0, completion: 0 }
};

export function setSelectedMode(mode) { selectedMode = mode; }
export function setDefaultModel(model) { defaultModel = model; }
export function setCustomPrompt(prompt) { customPrompt = prompt; }
export function setCurrentQuizData(data) { currentQuizData = data; }
export function setUserApiSettings(settings) { userApiSettings = settings; }