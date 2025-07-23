// Migrated content for js/core/state.js

export let currentUser = null;

export const appId = 'AileyBailey_Global_Space';

export let localNotesCache = [];

export let currentNoteId = null;

export let localChatSessionsCache = [];

export let localProjectsCache = [];

export let currentSessionId = null;

export let selectedMode = 'ailey_coaching';

export let defaultModel = 'gemini-2.5-flash-preview-04-17';

export let customPrompt = localStorage.getItem('customTutorPrompt') || '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.';

export let currentQuizData = null;