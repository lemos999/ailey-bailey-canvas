export const state = {
    // Core
    db: null,
    currentUser: null,
    canvasId: document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id',
    appId: 'AileyBailey_Global_Space',

    // DOM Elements (populated later)
    dom: {},

    // Notes
    notesCollection: null,
    localNotesCache: [],
    currentNoteId: null,
    unsubscribeFromNotes: null,
    debounceTimer: null,
    lastSelectedText: '',

    // Chat & Projects
    chatSessionsCollectionRef: null,
    projectsCollectionRef: null,
    localChatSessionsCache: [],
    localProjectsCache: [],
    currentSessionId: null,
    unsubscribeFromChatSessions: null,
    unsubscribeFromProjects: null,
    selectedMode: 'ailey_coaching',
    defaultModel: 'gemini-1.5-flash-latest',
    customPrompt: localStorage.getItem('customTutorPrompt') || '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.',
    currentQuizData: null,
    currentOpenContextMenu: null,
    newlyCreatedProjectId: null,
    activeTimers: {},
    
    // API Settings
    userApiSettings: {
        provider: null,
        apiKey: '',
        selectedModel: '',
        availableModels: [],
        maxOutputTokens: 2048,
        tokenUsage: { prompt: 0, completion: 0 }
    }
};

// 상태를 안전하게 업데이트하는 함수
export function setState(keyOrObject, value) {
    if (typeof keyOrObject === 'object') {
        Object.assign(state, keyOrObject);
    } else {
        state[keyOrObject] = value;
    }
}
