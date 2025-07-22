/* --- FILE: /scripts/core/01_state.js --- */
// --- 2. State Management ---
const canvasId = document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id';
let db, notesCollection, chatSessionsCollectionRef, projectsCollectionRef;
let currentUser = null;
const appId = 'AileyBailey_Global_Space';
let localNotesCache = [];
let currentNoteId = null;
let unsubscribeFromNotes = null;
let debounceTimer = null;
let lastSelectedText = '';

// --- CHAT & PROJECT STATE ---
let localChatSessionsCache = [];
let localProjectsCache = [];
let currentSessionId = null;
let unsubscribeFromChatSessions = null;
let unsubscribeFromProjects = null;
let selectedMode = 'ailey_coaching';
let defaultModel = 'gemini-2.5-flash-preview-04-17';
let customPrompt = localStorage.getItem('customTutorPrompt') || '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.';
let currentQuizData = null;
let currentOpenContextMenu = null;
let newlyCreatedProjectId = null;
const activeTimers = {}; // [MODIFIED] Manages all dynamic intervals, crucial for stopping animations.

// --- [REFINED] API Settings State ---
let userApiSettings = {
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