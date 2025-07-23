/*
 * state.js: Manages the global state of the application.
 */

// Firebase and DB state
export let db = null;
export let currentUser = null;
export let notesCollection = null;
export let chatSessionsCollectionRef = null;
export let projectsCollectionRef = null;

// App-wide state
export const canvasId = document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id';
export const appId = 'AileyBailey_Global_Space';

// Notes state
export let localNotesCache = [];
export let currentNoteId = null;
export let unsubscribeFromNotes = null;

// Chat & Project state
export let localChatSessionsCache = [];
export let localProjectsCache = [];
export let currentSessionId = null;
export let unsubscribeFromChatSessions = null;
export let unsubscribeFromProjects = null;
export let newlyCreatedProjectId = null;
export let currentOpenContextMenu = null;

// UI/Interaction state
export let selectedMode = 'ailey_coaching';
export let defaultModel = 'gemini-2.5-flash-preview-04-17';
export let customPrompt = localStorage.getItem('customTutorPrompt') || '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.';
export let currentQuizData = null;
export let lastSelectedText = '';
export const activeTimers = {};

// API Settings State
export let userApiSettings = {
    provider: null,
    apiKey: '',
    selectedModel: '',
    availableModels: [],
    maxOutputTokens: 2048,
    tokenUsage: { prompt: 0, completion: 0 }
};

// Functions to update state
export function setDb(newDb) { db = newDb; }
export function setCurrentUser(user) { currentUser = user; }
export function setNotesCollection(collection) { notesCollection = collection; }
export function setChatSessionsCollectionRef(ref) { chatSessionsCollectionRef = ref; }
export function setProjectsCollectionRef(ref) { projectsCollectionRef = ref; }
export function setLocalNotesCache(cache) { localNotesCache = cache; }
export function setCurrentNoteId(id) { currentNoteId = id; }
export function setUnsubscribeFromNotes(func) { unsubscribeFromNotes = func; }
export function setLocalChatSessionsCache(cache) { localChatSessionsCache = cache; }
export function setLocalProjectsCache(cache) { localProjectsCache = cache; }
export function setCurrentSessionId(id) { currentSessionId = id; }
export function setUnsubscribeFromChatSessions(func) { unsubscribeFromChatSessions = func; }
export function setUnsubscribeFromProjects(func) { unsubscribeFromProjects = func; }
export function setNewlyCreatedProjectId(id) { newlyCreatedProjectId = id; }
export function setCurrentOpenContextMenu(menu) { currentOpenContextMenu = menu; }
export function setSelectedMode(mode) { selectedMode = mode; }
export function setCustomPrompt(prompt) { customPrompt = prompt; }
export function setCurrentQuizData(data) { currentQuizData = data; }
export function setLastSelectedText(text) { lastSelectedText = text; }
export function setUserApiSettings(settings) { userApiSettings = settings; }
