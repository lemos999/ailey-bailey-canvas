/*
--- Ailey & Bailey Canvas ---
File: state.js
Version: 11.0 (JS Module Structure)
Architect: [Username] & System Architect CodeMaster
Description: Centralized state management for the application. Holds all dynamic data, caches, and current selections to be shared across modules.
*/

export const state = {
    // Firebase instances
    db: null,
    auth: null,
    
    // Collection references
    notesCollection: null,
    chatSessionsCollectionRef: null,
    projectsCollectionRef: null,

    // Caches
    localNotesCache: [],
    localChatSessionsCache: [],
    localProjectsCache: [],

    // Current Selections / IDs
    currentNoteId: null,
    currentSessionId: null,
    newlyCreatedProjectId: null, // Used to trigger rename after creation

    // Unsubscribe listeners
    unsubscribeFromNotes: null,
    unsubscribeFromChatSessions: null,
    unsubscribeFromProjects: null,

    // UI State
    lastSelectedText: '',
    currentOpenContextMenu: null,
    debounceTimer: null,
    activeTimers: {}, // Manages dynamic intervals for animations

    // Chat specific state
    selectedMode: 'ailey_coaching', // Default chat mode
    customPrompt: localStorage.getItem('customTutorPrompt') || '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.',
    currentQuizData: null,
    
    // API Settings State
    userApiSettings: {
        provider: null, // 'openai', 'anthropic', 'google_paid'
        apiKey: '',
        selectedModel: '',
        availableModels: [],
        maxOutputTokens: 2048,
        tokenUsage: {
            prompt: 0,
            completion: 0
        }
    },
    
    // App constants
    appId: 'AileyBailey_Global_Space'
};