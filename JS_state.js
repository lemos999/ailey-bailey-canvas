/* --- JS_state.js --- */
// 이 파일은 애플리케이션의 모든 공유 상태를 중앙에서 관리합니다.

let _canvasId = document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id';
let _currentUser = null;
let _localNotesCache = [];
let _currentNoteId = null;
let _unsubscribeFromNotes = null;
let _debounceTimer = null;
let _lastSelectedText = '';

let _localChatSessionsCache = [];
let _localProjectsCache = [];
let _currentSessionId = null;
let _unsubscribeFromChatSessions = null;
let _unsubscribeFromProjects = null;
let _selectedMode = 'ailey_coaching';
let _defaultModel = 'gemini-2.5-flash-preview-04-17';
let _customPrompt = localStorage.getItem('customTutorPrompt') || '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.';
let _currentQuizData = null;
let _currentOpenContextMenu = null;
let _newlyCreatedProjectId = null;
const _activeTimers = {};

let _userApiSettings = {
    provider: null,
    apiKey: '',
    selectedModel: '',
    availableModels: [],
    maxOutputTokens: 2048,
    tokenUsage: { prompt: 0, completion: 0 }
};

export const getCanvasId = () => _canvasId;
export const getCurrentUser = () => _currentUser;
export const setCurrentUser = (user) => { _currentUser = user; };
export const getLocalNotesCache = () => _localNotesCache;
export const setLocalNotesCache = (cache) => { _localNotesCache = cache; };
export const getCurrentNoteId = () => _currentNoteId;
export const setCurrentNoteId = (id) => { _currentNoteId = id; };
export const getUnsubscribeFromNotes = () => _unsubscribeFromNotes;
export const setUnsubscribeFromNotes = (func) => { _unsubscribeFromNotes = func; };
export const getDebounceTimer = () => _debounceTimer;
export const setDebounceTimer = (timer) => { _debounceTimer = timer; };
export const getLastSelectedText = () => _lastSelectedText;
export const setLastSelectedText = (text) => { _lastSelectedText = text; };

export const getLocalChatSessionsCache = () => _localChatSessionsCache;
export const setLocalChatSessionsCache = (cache) => { _localChatSessionsCache = cache; };
export const getLocalProjectsCache = () => _localProjectsCache;
export const setLocalProjectsCache = (cache) => { _localProjectsCache = cache; };
export const getCurrentSessionId = () => _currentSessionId;
export const setCurrentSessionId = (id) => { _currentSessionId = id; };
export const getUnsubscribeFromChatSessions = () => _unsubscribeFromChatSessions;
export const setUnsubscribeFromChatSessions = (func) => { _unsubscribeFromChatSessions = func; };
export const getUnsubscribeFromProjects = () => _unsubscribeFromProjects;
export const setUnsubscribeFromProjects = (func) => { _unsubscribeFromProjects = func; };
export const getSelectedMode = () => _selectedMode;
export const setSelectedMode = (mode) => { _selectedMode = mode; };
export const getDefaultModel = () => _defaultModel;
export const setDefaultModel = (model) => { _defaultModel = model; };
export const getCustomPrompt = () => _customPrompt;
export const setCustomPrompt = (prompt) => { _customPrompt = prompt; };
export const getCurrentQuizData = () => _currentQuizData;
export const setCurrentQuizData = (data) => { _currentQuizData = data; };
export const getCurrentOpenContextMenu = () => _currentOpenContextMenu;
export const setCurrentOpenContextMenu = (menu) => { _currentOpenContextMenu = menu; };
export const getNewlyCreatedProjectId = () => _newlyCreatedProjectId;
export const setNewlyCreatedProjectId = (id) => { _newlyCreatedProjectId = id; };
export const getActiveTimers = () => _activeTimers;

export const getUserApiSettings = () => _userApiSettings;
export const setUserApiSettings = (settings) => { _userApiSettings = settings; };
