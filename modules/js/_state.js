/* Module: Global State Management */

// 이 파일은 애플리케이션 전체에서 공유되는 상태 변수를 관리합니다.
// 각 변수는 export되어 다른 모듈에서 import하여 사용 및 수정할 수 있습니다.

// --- Firebase & User State ---
export let db = null;
export let notesCollection = null;
export let chatSessionsCollectionRef = null;
export let projectsCollectionRef = null;
export let currentUser = null;
export const appId = 'AileyBailey_Global_Space';

// --- Notes App State ---
export let localNotesCache = [];
export let currentNoteId = null;
export let unsubscribeFromNotes = null;
export let debounceTimer = null;

// --- Chat & Project State ---
export let localChatSessionsCache = [];
export let localProjectsCache = [];
export let currentSessionId = null;
export let unsubscribeFromChatSessions = null;
export let unsubscribeFromProjects = null;
export let selectedMode = 'ailey_coaching';
export let defaultModel = 'gemini-2.5-flash-preview-04-17';
export let customPrompt = localStorage.getItem('customTutorPrompt') || '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.';
export let newlyCreatedProjectId = null;
export const activeTimers = {}; // 동적 UI 애니메이션 타이머 관리

// --- General UI State ---
export let lastSelectedText = '';
export let currentOpenContextMenu = null;

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

// --- Quiz State ---
export let currentQuizData = null;

// State를 수정하기 위한 Setter 함수들
export function setDb(database) { db = database; }
export function setNotesCollection(collection) { notesCollection = collection; }
export function setChatSessionsCollectionRef(ref) { chatSessionsCollectionRef = ref; }
export function setProjectsCollectionRef(ref) { projectsCollectionRef = ref; }
export function setCurrentUser(user) { currentUser = user; }
export function setLocalNotesCache(cache) { localNotesCache = cache; }
export function setCurrentNoteId(id) { currentNoteId = id; }
export function setUnsubscribeFromNotes(func) { unsubscribeFromNotes = func; }
export function setDebounceTimer(timer) { debounceTimer = timer; }
export function setLocalChatSessionsCache(cache) { localChatSessionsCache = cache; }
export function setLocalProjectsCache(cache) { localProjectsCache = cache; }
export function setCurrentSessionId(id) { currentSessionId = id; }
export function setUnsubscribeFromChatSessions(func) { unsubscribeFromChatSessions = func; }
export function setUnsubscribeFromProjects(func) { unsubscribeFromProjects = func; }
export function setSelectedMode(mode) { selectedMode = mode; }
export function setCustomPrompt(prompt) { customPrompt = prompt; }
export function setNewlyCreatedProjectId(id) { newlyCreatedProjectId = id; }
export function setLastSelectedText(text) { lastSelectedText = text; }
export function setCurrentOpenContextMenu(menu) { currentOpenContextMenu = menu; }
export function setUserApiSettings(settings) { userApiSettings = settings; }
export function setCurrentQuizData(data) { currentQuizData = data; }