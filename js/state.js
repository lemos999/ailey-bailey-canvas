/*
--- Ailey & Bailey Canvas ---
File: js/state.js
Version: 11.0 (Refactored)
Architect: [Username] & System Architect Ailey
Description: Centralized state management for the application. Exports state variables and simple accessors to be used by other modules, preventing global scope pollution and ensuring a single source of truth.
*/

// --- Firebase & System State ---
export let db = null;
export let notesCollection = null;
export let chatSessionsCollectionRef = null;
export let projectsCollectionRef = null;
export let currentUser = null;
export const appId = 'AileyBailey_Global_Space';
export let unsubscribeFromNotes = null;
export let unsubscribeFromChatSessions = null;
export let unsubscribeFromProjects = null;

export function setDb(database) { db = database; }
export function setNotesCollection(collection) { notesCollection = collection; }
export function setChatSessionsCollectionRef(ref) { chatSessionsCollectionRef = ref; }
export function setProjectsCollectionRef(ref) { projectsCollectionRef = ref; }
export function setCurrentUser(user) { currentUser = user; }
export function setUnsubscribeFromNotes(func) { unsubscribeFromNotes = func; }
export function setUnsubscribeFromChatSessions(func) { unsubscribeFromChatSessions = func; }
export function setUnsubscribeFromProjects(func) { unsubscribeFromProjects = func; }


// --- Local Caches ---
export let localNotesCache = [];
export let localChatSessionsCache = [];
export let localProjectsCache = [];

export function setLocalNotesCache(notes) { localNotesCache = notes; }
export function setLocalChatSessionsCache(sessions) { localChatSessionsCache = sessions; }
export function setLocalProjectsCache(projects) { localProjectsCache = projects; }


// --- UI & Interaction State ---
export let currentNoteId = null;
export let currentSessionId = null;
export let newlyCreatedProjectId = null;
export let selectedMode = 'ailey_coaching';
export let lastSelectedText = '';
export let currentQuizData = null;
export let currentOpenContextMenu = null;
export const activeTimers = {};
export let debounceTimer = null;

export function setCurrentNoteId(id) { currentNoteId = id; }
export function setCurrentSessionId(id) { currentSessionId = id; }
export function setNewlyCreatedProjectId(id) { newlyCreatedProjectId = id; }
export function setSelectedMode(mode) { selectedMode = mode; }
export function setLastSelectedText(text) { lastSelectedText = text; }
export function setCurrentQuizData(data) { currentQuizData = data; }
export function setCurrentOpenContextMenu(menu) { currentOpenContextMenu = menu; }
export function setDebounceTimer(timer) { debounceTimer = timer; }


// --- Settings & Prompt State ---
export let defaultModel = 'gemini-2.5-flash-preview-04-17';
export let customPrompt = localStorage.getItem('customTutorPrompt') || '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.';
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

export function setDefaultModel(model) { defaultModel = model; }
export function setCustomPrompt(prompt) { customPrompt = prompt; }
export function setUserApiSettings(settings) { userApiSettings = settings; }