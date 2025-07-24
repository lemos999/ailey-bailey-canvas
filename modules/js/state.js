/* Module: state.js - Manages the global state of the application. */
import { defaultModel } from './config.js';

// --- State Management ---
export const canvasId = document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id';
export let db = null;
export let notesCollection = null;
export let chatSessionsCollectionRef = null;
export let projectsCollectionRef = null;
export let currentUser = null;
export let localNotesCache = [];
export let currentNoteId = null;
export let unsubscribeFromNotes = null;
export let debounceTimer = null;
export let lastSelectedText = '';

// --- CHAT & PROJECT STATE ---
export let localChatSessionsCache = [];
export let localProjectsCache = [];
export let currentSessionId = null;
export let unsubscribeFromChatSessions = null;
export let unsubscribeFromProjects = null;
export let selectedMode = 'ailey_coaching';
export let customPrompt = localStorage.getItem('customTutorPrompt') || '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.';
export let currentQuizData = null;
export let currentOpenContextMenu = null;
export let newlyCreatedProjectId = null;
export const activeTimers = {};

// --- API Settings State ---
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

// --- State Updaters ---
export function setDb(database) { db = database; }
export function setNotesCollection(collection) { notesCollection = collection; }
export function setChatSessionsCollectionRef(ref) { chatSessionsCollectionRef = ref; }
export function setProjectsCollectionRef(ref) { projectsCollectionRef = ref; }
export function setCurrentUser(user) { currentUser = user; }
export function setLocalNotesCache(notes) { localNotesCache = notes; }
export function setCurrentNoteId(id) { currentNoteId = id; }
export function setUnsubscribeFromNotes(unsubscribe) { if (unsubscribeFromNotes) unsubscribeFromNotes(); unsubscribeFromNotes = unsubscribe; }
export function setDebounceTimer(timer) { if (debounceTimer) clearTimeout(debounceTimer); debounceTimer = timer; }
export function setLastSelectedText(text) { lastSelectedText = text; }
export function setLocalChatSessionsCache(sessions) { localChatSessionsCache = sessions; }
export function setLocalProjectsCache(projects) { localProjectsCache = projects; }
export function setCurrentSessionId(id) { currentSessionId = id; }
export function setUnsubscribeFromChatSessions(unsubscribe) { if (unsubscribeFromChatSessions) unsubscribeFromChatSessions(); unsubscribeFromChatSessions = unsubscribe; }
export function setUnsubscribeFromProjects(unsubscribe) { if (unsubscribeFromProjects) unsubscribeFromProjects(); unsubscribeFromProjects = unsubscribe; }
export function setSelectedMode(mode) { selectedMode = mode; }
export function setCustomPrompt(prompt) { customPrompt = prompt; }
export function setCurrentQuizData(data) { currentQuizData = data; }
export function setCurrentOpenContextMenu(menu) { if (currentOpenContextMenu) currentOpenContextMenu.remove(); currentOpenContextMenu = menu; }
export function setNewlyCreatedProjectId(id) { newlyCreatedProjectId = id; }
export function setUserApiSettings(settings) { userApiSettings = settings; }