/* --- Source: script_state.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_state.js
Version: 14.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 1: STATE] 애플리케이션의 모든 전역 상태 변수와 DOM 요소 상수를 선언합니다.
---
*/

// --- 1. Element Declarations (Global Scope) ---
const learningContent = document.getElementById('learning-content');
const wrapper = document.querySelector('.wrapper');
const body = document.body;
const systemInfoWidget = document.getElementById('system-info-widget');
const selectionPopover = document.getElementById('selection-popover');
const popoverAskAi = document.getElementById('popover-ask-ai');
const popoverAddNote = document.getElementById('popover-add-note');
const tocToggleBtn = document.getElementById('toc-toggle-btn');
const quizModalOverlay = document.getElementById('quiz-modal-overlay');
const quizContainer = document.getElementById('quiz-container');
const quizSubmitBtn = document.getElementById('quiz-submit-btn');
const quizResults = document.getElementById('quiz-results');
const startQuizBtn = document.getElementById('start-quiz-btn');
const chatModeSelector = document.getElementById('chat-mode-selector');
const chatPanel = document.getElementById('chat-panel');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const chatSendBtn = document.getElementById('chat-send-btn');
const notesAppPanel = document.getElementById('notes-app-panel');
const noteListView = document.getElementById('note-list-view');
const noteEditorView = document.getElementById('note-editor-view');
const notesList = document.getElementById('notes-list');
const searchInput = document.getElementById('search-input');
const addNewNoteBtn = document.getElementById('add-new-note-btn');
const backToListBtn = document.getElementById('back-to-list-btn');
const noteTitleInput = document.getElementById('note-title-input');
const noteContentTextarea = document.getElementById('note-content-textarea');
const autoSaveStatus = document.getElementById('auto-save-status');
const formatToolbar = document.querySelector('.format-toolbar');
const linkTopicBtn = document.getElementById('link-topic-btn');
const customModal = document.getElementById('custom-modal');
const modalMessage = document.getElementById('modal-message');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const promptModalOverlay = document.getElementById('prompt-modal-overlay');
const customPromptInput = document.getElementById('custom-prompt-input');
const promptSaveBtn = document.getElementById('prompt-save-btn');
const promptCancelBtn = document.getElementById('prompt-cancel-btn');
const themeToggle = document.getElementById('theme-toggle');
const chatToggleBtn = document.getElementById('chat-toggle-btn');
const notesAppToggleBtn = document.getElementById('notes-app-toggle-btn');

// -- Chat Session & Project UI Elements --
const newChatBtn = document.getElementById('new-chat-btn');
const newProjectBtn = document.getElementById('new-project-btn');
const sessionListContainer = document.getElementById('session-list-container');
const chatSessionTitle = document.getElementById('chat-session-title');
const deleteSessionBtn = document.getElementById('delete-session-btn');
const chatWelcomeMessage = document.getElementById('chat-welcome-message');
const searchSessionsInput = document.getElementById('search-sessions-input');
const aiModelSelector = document.getElementById('ai-model-selector');

// -- Backup & Restore UI Elements (Now part of dropdown) --
const fileImporter = document.getElementById('file-importer');

// -- API Settings UI Elements (dynamically created) --
let apiSettingsBtn, apiSettingsModalOverlay, apiKeyInput, verifyApiKeyBtn, apiKeyStatus,
    apiModelSelect, maxOutputTokensInput, tokenUsageDisplay, resetTokenUsageBtn,
    apiSettingsSaveBtn, apiSettingsCancelBtn;

// --- 2. State Management (Global Scope) ---
const canvasId = document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id';
let db;
let currentUser = null;
const appId = 'AileyBailey_Global_Space';
let debounceTimer = null;
let lastSelectedText = '';
let currentOpenContextMenu = null;

// -- Notes App State --
let notesCollectionRef, noteProjectsCollectionRef, tagsCollectionRef, noteTemplatesCollectionRef;
let localNotesCache = [], localNoteProjectsCache = [], localTagsCache = [], noteTemplatesCache = [];
let unsubscribeFromNotes = null, unsubscribeFromNoteProjects = null, unsubscribeFromTags = null, unsubscribeFromNoteTemplates = null;
let currentNoteId = null;
let newlyCreatedNoteProjectId = null;
let currentNoteSort = 'updatedAt_desc';
let draggedNoteId = null;

// -- Chat & Project State --
let chatSessionsCollectionRef, projectsCollectionRef;
let localChatSessionsCache = [], localProjectsCache = [];
let currentSessionId = null;
let unsubscribeFromChatSessions = null, unsubscribeFromProjects = null;
let newlyCreatedProjectId = null;
const activeTimers = {};

// -- AI & Learning State --
let selectedMode = 'ailey_coaching';
let defaultModel = 'gemini-2.5-flash-preview-04-17';
let customPrompt = localStorage.getItem('customTutorPrompt') || '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.';
let currentQuizData = null;
let noteGraphData = { nodes: [], edges: [] };

// -- API Settings State --
let userApiSettings = {
    provider: null, apiKey: '', selectedModel: '', availableModels: [],
    maxOutputTokens: 2048, tokenUsage: { prompt: 0, completion: 0 }
};

/* --- Source: script_service_firebase.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_service_firebase.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 2: SERVICE] Firebase 서비스 자체의 초기화 및 인증 로직을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const FirebaseService = {
        async initialize() {
            console.log("Firebase 서비스 초기화 시작...");
            try {
                // 이 변수들은 외부 HTML에 의해 주입되어야 합니다.
                const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
                const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

                if (!firebaseConfig) { throw new Error("Firebase 설정(config)을 찾을 수 없습니다."); }
                if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }

                const auth = firebase.auth();
                db = firebase.firestore(); // 전역 변수 db 설정

                if (initialAuthToken) {
                    await auth.signInWithCustomToken(initialAuthToken).catch(async (err) => {
                       console.warn("커스텀 토큰 로그인 실패. 익명으로 재시도합니다.", err);
                       await auth.signInAnonymously();
                    });
                } else {
                    await auth.signInAnonymously();
                }

                currentUser = auth.currentUser; // 전역 변수 currentUser 설정
                console.log("Firebase 인증 성공. User UID:", currentUser.uid);
                return true;
            } catch (error) {
                console.error("Firebase 초기화 또는 인증 실패:", error);
                // UI에 에러 메시지를 표시하는 로직은 다른 모듈이 책임집니다.
                return false;
            }
        }
    };

    // 전역 네임스페이스에 서비스 등록
    window.Services = window.Services || {};
    window.Services.Firebase = FirebaseService;

})(window);

/* --- Source: script_service_api_settings.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_service_api_settings.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 2: SERVICE] API 설정 모달의 상태 관리 및 키 검증 로직을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const ApiSettingsService = {
        load() {
            const savedSettings = localStorage.getItem('userApiSettings');
            if (savedSettings) {
                userApiSettings = JSON.parse(savedSettings);
                if (!userApiSettings.tokenUsage) { userApiSettings.tokenUsage = { prompt: 0, completion: 0 }; }
                if (!userApiSettings.availableModels) { userApiSettings.availableModels = []; }
            } else {
                // 기본값으로 초기화
                userApiSettings = { provider: null, apiKey: '', selectedModel: '', availableModels: [], maxOutputTokens: 2048, tokenUsage: { prompt: 0, completion: 0 } };
            }
        },

        save() {
            localStorage.setItem('userApiSettings', JSON.stringify(userApiSettings));
            // UI 업데이트 로직은 다른 모듈에서 처리합니다.
        },

        detectProvider(key) {
            if (key.startsWith('sk-ant-api')) return 'anthropic';
            if (key.startsWith('sk-')) return 'openai';
            if (key.length > 35 && key.startsWith('AIza')) return 'google';
            return null;
        },

        async fetchAvailableModels(provider, key) {
            const service = window.Services.Api[provider];
            if (service && typeof service.fetchModels === 'function') {
                return await service.fetchModels(key);
            }
            throw new Error(`${provider} 서비스의 모델 로드 기능이 정의되지 않았습니다.`);
        },

        resetTokenUsage() {
             userApiSettings.tokenUsage = { prompt: 0, completion: 0 };
             this.save();
        }
    };

    // 전역 네임스페이스에 서비스 등록
    window.Services = window.Services || {};
    window.Services.ApiSettings = ApiSettingsService;

})(window);

/* --- Source: script_service_api_openai.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_service_api_openai.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 2: SERVICE] OpenAI API와의 통신(요청/응답 처리)을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const OpenAiApiService = {
        async fetchModels(apiKey) {
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (!response.ok) {
                throw new Error('OpenAI 서버에서 모델 목록을 가져올 수 없습니다.');
            }
            const data = await response.json();
            return data.data.filter(m => m.id.includes('gpt')).map(m => m.id).sort().reverse();
        },

        buildRequest(model, messages, maxTokens, apiKey) {
            const history = messages.map(msg => ({
                role: msg.role === 'ai' ? 'assistant' : 'user',
                content: msg.content
            }));
            return {
                url: 'https://api.openai.com/v1/chat/completions',
                options: {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                    body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 })
                }
            };
        },

        parseResponse(result) {
            try {
                return {
                    content: result.choices[0].message.content,
                    usage: {
                        prompt: result.usage.prompt_tokens,
                        completion: result.usage.completion_tokens
                    }
                };
            } catch (error) {
                console.error("OpenAI 응답 파싱 오류:", error, result);
                return { content: 'API 응답을 파싱하는 중 오류가 발생했습니다.', usage: null };
            }
        }
    };

    // 전역 네임스페이스에 서비스 등록
    window.Services = window.Services || {};
    window.Services.Api = window.Services.Api || {};
    window.Services.Api.openai = OpenAiApiService;

})(window);

/* --- Source: script_service_api_anthropic.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_service_api_anthropic.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 2: SERVICE] Anthropic (Claude) API와의 통신을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const AnthropicApiService = {
        fetchModels(apiKey) {
            // Anthropic은 모델 목록을 가져오는 API를 제공하지 않으므로, 주요 모델을 하드코딩합니다.
            return Promise.resolve([
                'claude-3-opus-20240229',
                'claude-3-sonnet-20240229',
                'claude-3-haiku-20240307',
                'claude-2.1'
            ]);
        },

        buildRequest(model, messages, maxTokens, apiKey) {
            const history = messages.map(msg => ({
                role: msg.role === 'ai' ? 'assistant' : 'user',
                content: msg.content
            }));
            return {
                url: 'https://api.anthropic.com/v1/messages',
                options: {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 })
                }
            };
        },

        parseResponse(result) {
            try {
                return {
                    content: result.content[0].text,
                    usage: {
                        prompt: result.usage.input_tokens,
                        completion: result.usage.output_tokens
                    }
                };
            } catch (error) {
                console.error("Anthropic 응답 파싱 오류:", error, result);
                return { content: 'API 응답을 파싱하는 중 오류가 발생했습니다.', usage: null };
            }
        }
    };

    // 전역 네임스페이스에 서비스 등록
    window.Services = window.Services || {};
    window.Services.Api = window.Services.Api || {};
    window.Services.Api.anthropic = AnthropicApiService;

})(window);

/* --- Source: script_service_api_google.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_service_api_google.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 2: SERVICE] Google (Gemini) API와의 통신을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const GoogleApiService = {
        async fetchModels(apiKey) {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            if (!response.ok) {
                throw new Error('Google 서버에서 모델 목록을 가져올 수 없습니다.');
            }
            const data = await response.json();
            return data.models.map(m => m.name.replace('models/', '')).filter(m => m.includes('gemini'));
        },

        buildRequest(model, messages, maxTokens, apiKey) {
            const googleHistory = messages.map(msg => ({
                role: msg.role === 'ai' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));
            return {
                url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                options: {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: googleHistory,
                        generationConfig: { maxOutputTokens: Number(maxTokens) || 2048 }
                    })
                }
            };
        },

        parseResponse(result) {
            try {
                return {
                    content: result.candidates[0].content.parts[0].text,
                    // Google API는 응답에서 토큰 사용량을 제공하지 않습니다.
                    usage: null
                };
            } catch (error) {
                console.error("Google 응답 파싱 오류:", error, result);
                return { content: 'API 응답을 파싱하는 중 오류가 발생했습니다.', usage: null };
            }
        }
    };

    // 전역 네임스페이스에 서비스 등록
    window.Services = window.Services || {};
    window.Services.Api = window.Services.Api || {};
    window.Services.Api.google = GoogleApiService;

})(window);

/* --- Source: script_data_notes_notes.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_data_notes_notes.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 3: DATA] 노트 데이터의 Firestore CRUD 작업을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const NotesDataService = {
        collectionRef: null,

        initialize() {
            if (!currentUser) throw new Error("사용자 인증 정보가 없습니다.");
            const userPath = `artifacts/${appId}/users/${currentUser.uid}`;
            this.collectionRef = db.collection(`${userPath}/notes`);
        },

        listen(callback) {
            if (!this.collectionRef) this.initialize();
            return this.collectionRef.onSnapshot(snapshot => {
                const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(notes);
            }, error => console.error("노트 데이터 수신 오류:", error));
        },

        async add(noteData) {
            if (!this.collectionRef) this.initialize();
            const dataWithTimestamp = {
                ...noteData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            const docRef = await this.collectionRef.add(dataWithTimestamp);
            return docRef.id;
        },

        update(noteId, dataToUpdate) {
            if (!this.collectionRef) this.initialize();
            const dataWithTimestamp = {
                ...dataToUpdate,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            return this.collectionRef.doc(noteId).update(dataWithTimestamp);
        },

        delete(noteId) {
            if (!this.collectionRef) this.initialize();
            return this.collectionRef.doc(noteId).delete();
        }
    };

    window.Data = window.Data || {};
    window.Data.Notes = NotesDataService;

})(window);

/* --- Source: script_data_notes_projects.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_data_notes_projects.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 3: DATA] 노트 프로젝트(폴더) 데이터의 Firestore CRUD 작업을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const NoteProjectsDataService = {
        collectionRef: null,

        initialize() {
            if (!currentUser) throw new Error("사용자 인증 정보가 없습니다.");
            const userPath = `artifacts/${appId}/users/${currentUser.uid}`;
            this.collectionRef = db.collection(`${userPath}/noteProjects`);
        },

        listen(callback) {
            if (!this.collectionRef) this.initialize();
            return this.collectionRef.onSnapshot(snapshot => {
                const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(projects);
            }, error => console.error("노트 프로젝트 데이터 수신 오류:", error));
        },

        async add(projectData) {
            if (!this.collectionRef) this.initialize();
            const dataWithTimestamp = {
                ...projectData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            const docRef = await this.collectionRef.add(dataWithTimestamp);
            return docRef.id;
        },

        update(projectId, dataToUpdate) {
            if (!this.collectionRef) this.initialize();
            const dataWithTimestamp = {
                ...dataToUpdate,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            return this.collectionRef.doc(projectId).update(dataWithTimestamp);
        },

        async delete(projectId, notesToMove) {
            if (!this.collectionRef) this.initialize();
            const batch = db.batch();
            // 연결된 노트들의 projectId를 null로 업데이트
            notesToMove.forEach(note => {
                const noteRef = window.Data.Notes.collectionRef.doc(note.id);
                batch.update(noteRef, { projectId: null });
            });
            // 프로젝트 삭제
            const projectRef = this.collectionRef.doc(projectId);
            batch.delete(projectRef);
            return await batch.commit();
        }
    };

    window.Data = window.Data || {};
    window.Data.NoteProjects = NoteProjectsDataService;

})(window);

/* --- Source: script_data_chat_sessions.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_data_chat_sessions.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 3: DATA] 채팅 세션 데이터의 Firestore CRUD 작업을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const ChatSessionsDataService = {
        collectionRef: null,

        initialize() {
            if (!currentUser) throw new Error("사용자 인증 정보가 없습니다.");
            const chatHistoryPath = `artifacts/${appId}/users/${currentUser.uid}/chatHistories/${canvasId}`;
            this.collectionRef = db.collection(`${chatHistoryPath}/sessions`);
        },

        listen(callback) {
            if (!this.collectionRef) this.initialize();
            return this.collectionRef.onSnapshot(snapshot => {
                const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(sessions);
            }, error => console.error("채팅 세션 데이터 수신 오류:", error));
        },

        async add(sessionData) {
            if (!this.collectionRef) this.initialize();
            const dataWithTimestamp = {
                ...sessionData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            const docRef = await this.collectionRef.add(dataWithTimestamp);
            return docRef.id;
        },

        update(sessionId, dataToUpdate) {
            if (!this.collectionRef) this.initialize();
            const dataWithTimestamp = {
                ...dataToUpdate,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            return this.collectionRef.doc(sessionId).update(dataWithTimestamp);
        },

        addMessage(sessionId, message) {
            if (!this.collectionRef) this.initialize();
            return this.collectionRef.doc(sessionId).update({
                messages: firebase.firestore.FieldValue.arrayUnion(message),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        },

        delete(sessionId) {
            if (!this.collectionRef) this.initialize();
            return this.collectionRef.doc(sessionId).delete();
        }
    };

    window.Data = window.Data || {};
    window.Data.ChatSessions = ChatSessionsDataService;

})(window);

/* --- Source: script_data_chat_projects.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_data_chat_projects.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 3: DATA] 채팅 프로젝트 데이터의 Firestore CRUD 작업을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const ChatProjectsDataService = {
        collectionRef: null,

        initialize() {
            if (!currentUser) throw new Error("사용자 인증 정보가 없습니다.");
            const chatHistoryPath = `artifacts/${appId}/users/${currentUser.uid}/chatHistories/${canvasId}`;
            this.collectionRef = db.collection(`${chatHistoryPath}/projects`);
        },

        listen(callback) {
            if (!this.collectionRef) this.initialize();
            return this.collectionRef.onSnapshot(snapshot => {
                const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(projects);
            }, error => console.error("채팅 프로젝트 데이터 수신 오류:", error));
        },

        async add(projectData) {
            if (!this.collectionRef) this.initialize();
            const dataWithTimestamp = {
                ...projectData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            const docRef = await this.collectionRef.add(dataWithTimestamp);
            return docRef.id;
        },

        update(projectId, dataToUpdate) {
            if (!this.collectionRef) this.initialize();
            const dataWithTimestamp = {
                ...dataToUpdate,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            return this.collectionRef.doc(projectId).update(dataWithTimestamp);
        },

        async delete(projectId, sessionsToMove) {
            if (!this.collectionRef) this.initialize();
            const batch = db.batch();
            // 연결된 세션들의 projectId를 null로 업데이트
            sessionsToMove.forEach(session => {
                const sessionRef = window.Data.ChatSessions.collectionRef.doc(session.id);
                batch.update(sessionRef, { projectId: null });
            });
            // 프로젝트 삭제
            const projectRef = this.collectionRef.doc(projectId);
            batch.delete(projectRef);
            return await batch.commit();
        }
    };

    window.Data = window.Data || {};
    window.Data.ChatProjects = ChatProjectsDataService;

})(window);

/* --- Source: script_ui_component_modal.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_ui_component_modal.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 4: UI] 모든 종류의 모달(Modal) UI 생성 및 제어를 책임집니다.
---
*/

(function(window) {
    'use strict';

    const ModalComponent = {
        show(message, onConfirm) {
            if (!customModal || !modalMessage || !modalConfirmBtn || !modalCancelBtn) return;
            modalMessage.textContent = message;
            customModal.style.display = 'flex';

            // 기존 이벤트 리스너를 제거하여 중복 실행을 방지합니다.
            const newConfirmBtn = modalConfirmBtn.cloneNode(true);
            modalConfirmBtn.parentNode.replaceChild(newConfirmBtn, modalConfirmBtn);
            modalConfirmBtn = newConfirmBtn;

            const newCancelBtn = modalCancelBtn.cloneNode(true);
            modalCancelBtn.parentNode.replaceChild(newCancelBtn, modalCancelBtn);
            modalCancelBtn = newCancelBtn;

            modalConfirmBtn.addEventListener('click', () => {
                onConfirm();
                this.hide();
            });

            modalCancelBtn.addEventListener('click', () => {
                this.hide();
            });
        },

        hide() {
            if (customModal) customModal.style.display = 'none';
        }
    };

    window.UI = window.UI || {};
    window.UI.Modal = ModalComponent;

})(window);

/* --- Source: script_ui_component_panel.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_ui_component_panel.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 4: UI] 모든 드래그 가능한 패널(Panel)의 생성 및 드래그 기능을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const PanelComponent = {
        makeDraggable(panelElement) {
            if(!panelElement) return;
            const header = panelElement.querySelector('.panel-header');
            if(!header) return;

            let isDragging = false, offset = { x: 0, y: 0 };

            const onMouseMove = (e) => {
                if (isDragging) {
                    panelElement.style.left = (e.clientX + offset.x) + 'px';
                    panelElement.style.top = (e.clientY + offset.y) + 'px';
                }
            };

            const onMouseUp = () => {
                isDragging = false;
                panelElement.classList.remove('is-dragging');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            header.addEventListener('mousedown', e => {
                // 버튼, 입력 필드 등 상호작용 요소를 클릭했을 때는 드래그를 시작하지 않습니다.
                if (e.target.closest('button, input, select, a, .close-btn')) return;
                isDragging = true;
                panelElement.classList.add('is-dragging');
                offset = { x: panelElement.offsetLeft - e.clientX, y: panelElement.offsetTop - e.clientY };
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        },

        toggle(panelElement, forceShow = null) {
            if (!panelElement) return;
            const show = forceShow !== null ? forceShow : panelElement.style.display !== 'flex';
            panelElement.style.display = show ? 'flex' : 'none';
        }
    };

    window.UI = window.UI || {};
    window.UI.Panel = PanelComponent;

})(window);

/* --- Source: script_ui_notes_view.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_ui_notes_view.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 4: UI] 노트 앱의 전체 뷰(목록/에디터) 전환을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const NotesView = {
        switch(view) {
            if (view === 'editor') {
                noteListView?.classList.remove('active');
                noteEditorView?.classList.add('active');
            } else { // list
                noteEditorView?.classList.remove('active');
                noteListView?.classList.add('active');
                currentNoteId = null; // 현재 활성 노트 ID 초기화
            }
        }
    };

    window.UI = window.UI || {};
    window.UI.NotesView = NotesView;

})(window);

/* --- Source: script_ui_notes_note_item.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_ui_notes_note_item.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 4: UI] 단일 노트 아이템 UI 생성을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const NoteItem = {
        create(noteData) {
            const item = document.createElement('div');
            item.className = 'note-item';
            item.dataset.id = noteData.id;
            item.draggable = true;
            if (noteData.isPinned) item.classList.add('pinned');
            item.setAttribute('data-action', 'notes-open-note');

            item.innerHTML = `
                <div class="note-item-content">
                    <div class="note-item-title">${noteData.title || '무제 노트'}</div>
                    <div class="note-item-date">${noteData.updatedAt?.toDate().toLocaleString('ko-KR',{dateStyle:'short',timeStyle:'short'})||'날짜 없음'}</div>
                </div>
            `;
            return item;
        }
    };

    window.UI = window.UI || {};
    window.UI.NotesNoteItem = NoteItem;

})(window);

/* --- Source: script_ui_notes_project_item.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_ui_notes_project_item.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 4: UI] 단일 노트 프로젝트(폴더) 아이템 UI 생성을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const ProjectItem = {
        create(project, allNotes) {
            const projectContainer = document.createElement('div');
            projectContainer.className = 'note-project-container';
            projectContainer.dataset.projectId = project.id;

            projectContainer.innerHTML = `
                <div class="note-project-header" data-action="notes-toggle-project" data-project-id="${project.id}">
                    <span class="note-project-toggle-icon ${project.isExpanded !== false ? 'expanded' : ''}"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" /></svg></span>
                    <span class="note-project-icon"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2Z" /></svg></span>
                    <span class="note-project-title">${project.name}</span>
                    <span class="note-count">(${allNotes.filter(n => n.projectId === project.id).length})</span>
                </div>
                <div class="notes-in-project ${project.isExpanded !== false ? 'expanded' : ''}"></div>
            `;

            const notesContainer = projectContainer.querySelector('.notes-in-project');
            allNotes.filter(n => n.projectId === project.id && !n.isPinned)
                .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0))
                .forEach(note => notesContainer.appendChild(window.UI.NotesNoteItem.create(note)));

            return projectContainer;
        }
    };

    window.UI = window.UI || {};
    window.UI.NotesProjectItem = ProjectItem;

})(window);

/* --- Source: script_ui_notes_list_renderer.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_ui_notes_list_renderer.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 4: UI] 노트 목록의 전체 구조(액션바, 목록) 렌더링을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const ListRenderer = {
        renderFullList(notes, projects, searchTerm) {
            if (!noteListView) return;
            this.renderActionBar();
            this.renderNotes(notes, projects, searchTerm);
        },

        renderActionBar() {
            // 이 부분은 나중에 atom_input, atom_button 등으로 분해될 수 있습니다.
            const actionBarHTML = `
                <div class="action-bar">
                    <div class="action-bar-group left">
                        <button id="add-new-note-btn-dynamic" class="notes-btn" title="새 메모" data-action="notes-create-note"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg></button>
                        <button id="add-new-note-project-btn-dynamic" class="notes-btn" title="새 폴더" data-action="notes-create-project"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M13,13H11V10H8V8H11V5H13V8H16V10H13V13Z"/></svg></button>
                    </div>
                    <div class="action-bar-group center">
                        <input type="text" id="search-input-dynamic" class="search-input-notes" placeholder="메모 검색...">
                    </div>
                    <div class="action-bar-group right">
                        <div class="more-options-container">
                            <button id="more-options-btn" class="more-options-btn" title="더 보기" data-action="notes-toggle-more-options"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" /></svg></button>
                            <div id="notes-dropdown-menu" class="dropdown-menu">
                                <button class="dropdown-item" data-action="notes-export-all"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"></path></svg><span>데이터 백업</span></button>
                                <button class="dropdown-item" data-action="notes-import-all"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19.35,10.04C18.67,6.59 15.64,4 12,4C9.11,4 6.6,5.64 5.35,8.04C2.34,8.36 0,10.91 0,14A6,6 0 0,0 6,20H19A5,5 0 0,0 19.35,10.04Z"></path></svg><span>데이터 복원</span></button>
                                <div class="dropdown-separator"></div>
                                <button class="dropdown-item" data-action="notes-system-reset" style="color: #d9534f;"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,4C14.12,4 16.16,4.73 17.89,6.03L16.83,7.09C15.5,6.07 13.83,5.5 12,5.5C8.96,5.5 6.5,7.96 6.5,11H8.5C8.5,9.07 10.07,7.5 12,7.5C12.86,7.5 13.65,7.81 14.29,8.34L13.23,9.4L17.5,10.5L16.4,6.23L15.34,7.29C14.37,6.46 13.23,6 12,6C9.24,6 7,8.24 7,11V11.5H5V11C5,7.13 8.13,4 12,4M12,18C9.88,18 7.84,17.27 6.11,15.97L7.17,14.91C8.5,15.93 10.17,16.5 12,16.5C15.04,16.5 17.5,14.04 17.5,11H15.5C15.5,12.93 13.93,14.5 12,14.5C11.14,14.5 10.35,14.19 9.71,13.66L10.77,12.6L6.5,11.5L7.6,15.77L8.66,14.71C9.63,15.54 10.77,16 12,16C14.76,16 17,13.76 17,11V10.5H19V11C19,14.87 15.87,18 12,18Z" /></svg><span>시스템 초기화</span></button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            noteListView.innerHTML = actionBarHTML + '<div id="notes-list"></div>';
        },

        renderNotes(notes, projects, searchTerm) {
            const term = (searchTerm || '').toLowerCase();
            const filteredNotes = notes.filter(n => term ? ((n.title||'').toLowerCase().includes(term) || (n.content||'').toLowerCase().includes(term)) : true);

            const notesListContainer = document.getElementById('notes-list');
            if (!notesListContainer) return;
            notesListContainer.innerHTML = '';
            const fragment = document.createDocumentFragment();

            // 로직 분리: 렌더링 로직은 각 컴포넌트에 위임
            const pinnedNotes = filteredNotes.filter(n => n.isPinned);
            if (pinnedNotes.length > 0) { /* ... 렌더링 ... */ }

            projects.forEach(project => { fragment.appendChild(window.UI.NotesProjectItem.create(project, filteredNotes)); });

            const unassignedNotes = filteredNotes.filter(n => !n.projectId && !n.isPinned);
            if (unassignedNotes.length > 0) { /* ... 렌더링 ... */ }

            notesListContainer.appendChild(fragment);
        }
    };

    window.UI = window.UI || {};
    window.UI.NotesListRenderer = ListRenderer;

})(window);

/* --- Source: script_ui_notes_context_menu.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_ui_notes_context_menu.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 4: UI] 노트 앱의 컨텍스트 메뉴 UI 생성을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const ContextMenu = {
        // ... 컨텍스트 메뉴 생성 로직 ...
    };

    window.UI = window.UI || {};
    window.UI.NotesContextMenu = ContextMenu;

})(window);

/* --- Source: script_ui_notes_editor.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_ui_notes_editor.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 4: UI] Toast UI 에디터 인스턴스 관리 및 관련 UI 제어를 책임집니다.
---
*/

(function(window) {
    'use strict';

    let toastEditorInstance = null;

    const Editor = {
        getInstance() { return toastEditorInstance; },

        create(note) {
            // ... Toast UI Editor 생성 로직 ...
        },

        destroy() {
            if (toastEditorInstance) {
                toastEditorInstance.destroy();
                toastEditorInstance = null;
            }
        },

        getContent() {
            return toastEditorInstance ? toastEditorInstance.getMarkdown() : '';
        }
    };

    window.UI = window.UI || {};
    window.UI.NotesEditor = Editor;

})(window);

/* --- Source: script_ui_chat_session_item.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_ui_chat_session_item.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 4: UI] 단일 채팅 세션 아이템 UI 생성을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const SessionItem = {
        create(session) {
            const item = document.createElement('div');
            item.className = 'session-item';
            item.dataset.sessionId = session.id;
            if (session.id === currentSessionId) item.classList.add('active');
            item.setAttribute('data-action', 'chat-select-session');
            item.innerHTML = `<div class="session-item-title">${session.title || '새 대화'}</div>`;
            return item;
        }
    };

    window.UI = window.UI || {};
    window.UI.ChatSessionItem = SessionItem;

})(window);

/* --- Source: script_ui_chat_project_item.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_ui_chat_project_item.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 4: UI] 단일 채팅 프로젝트 아이템 UI 생성을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const ProjectItem = {
        create(project, allSessions, searchTerm) {
            const projectContainer = document.createElement('div');
            projectContainer.className = 'project-container';
            projectContainer.dataset.projectId = project.id;
            projectContainer.innerHTML = `<!-- 프로젝트 헤더 HTML -->`;
            
            const sessionsContainer = projectContainer.querySelector('.sessions-in-project');
            allSessions.filter(s => s.projectId === project.id).forEach(session => {
                sessionsContainer.appendChild(window.UI.ChatSessionItem.create(session));
            });
            
            return projectContainer;
        }
    };

    window.UI = window.UI || {};
    window.UI.ChatProjectItem = ProjectItem;

})(window);

/* --- Source: script_ui_chat_sidebar_renderer.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_ui_chat_sidebar_renderer.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 4: UI] 채팅 사이드바의 전체 구조 렌더링을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const SidebarRenderer = {
        render(sessions, projects, searchTerm) {
            if (!sessionListContainer) return;
            sessionListContainer.innerHTML = '';
            const fragment = document.createDocumentFragment();

            // 프로젝트 렌더링
            projects.forEach(project => {
                fragment.appendChild(window.UI.ChatProjectItem.create(project, sessions, searchTerm));
            });

            // 그룹화된 세션 렌더링 (날짜별)
            // ... (세션 그룹화 및 렌더링 로직)

            sessionListContainer.appendChild(fragment);
        }
    };

    window.UI = window.UI || {};
    window.UI.ChatSidebarRenderer = SidebarRenderer;

})(window);

/* --- Source: script_ui_chat_message_renderer.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_ui_chat_message_renderer.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 4: UI] 채팅 메시지 목록의 렌더링을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const MessageRenderer = {
        render(messages) {
            if (!chatMessages) return;
            chatMessages.innerHTML = '';
            const fragment = document.createDocumentFragment();
            messages.forEach(msg => {
                const messageElement = this.createMessageElement(msg);
                fragment.appendChild(messageElement);
            });
            chatMessages.appendChild(fragment);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        },

        createMessageElement(msg) {
            const el = document.createElement('div');
            if(msg.role === 'user') {
                 el.className = 'chat-message user';
                 el.textContent = msg.content;
            } else {
                 el.className = 'ai-response-container';
                 // ... 복잡한 AI 응답 렌더링 로직 (추론 과정 포함)
            }
            return el;
        }
    };

    window.UI = window.UI || {};
    window.UI.ChatMessageRenderer = MessageRenderer;

})(window);

/* --- Source: script_ui_chat_context_menu.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_ui_chat_context_menu.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 4: UI] 채팅 앱의 컨텍스트 메뉴 UI 생성을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const ContextMenu = {
        // ... 채팅 컨텍스트 메뉴 생성 로직 ...
    };

    window.UI = window.UI || {};
    window.UI.ChatContextMenu = ContextMenu;

})(window);

/* --- Source: script_action_notes_create.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_action_notes_create.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 5: ACTION] 새로운 노트를 생성하는 비즈니스 로직을 책임집니다.
---
*/

(function(window) {
    'use strict';

    async function createNewNote(content = '') {
        try {
            const newNoteData = {
                title: '',
                content: content,
                projectId: null, // 기본적으로 프로젝트 없음
                isPinned: false,
                tags: []
            };
            const newNoteId = await window.Data.Notes.add(newNoteData);
            console.log("새 노트 생성 성공:", newNoteId);
            // 생성 후 에디터 여는 로직은 다른 액션에서 담당
            return newNoteId;
        } catch (error) {
            console.error("새 노트 생성 실패:", error);
            // 에러 UI 표시는 UI 모듈의 책임
            return null;
        }
    }

    window.Actions = window.Actions || {};
    window.Actions.Notes = window.Actions.Notes || {};
    window.Actions.Notes.create = createNewNote;

})(window);

/* --- Source: script_action_notes_project_create.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_action_notes_project_create.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 5: ACTION] 새로운 노트 프로젝트(폴더)를 생성하는 로직을 책임집니다.
---
*/

(function(window) {
    'use strict';

    function getNewDefaultName() {
        const baseName = "새 폴더";
        let i = 1;
        let newName = baseName;
        const existingNames = new Set(localNoteProjectsCache.map(p => p.name));
        while (existingNames.has(newName)) {
            newName = `${baseName} ${++i}`;
        }
        return newName;
    }

    async function createNewNoteProject() {
        try {
            const newProjectData = { name: getNewDefaultName() };
            const newProjectId = await window.Data.NoteProjects.add(newProjectData);
            console.log("새 노트 폴더 생성 성공:", newProjectId);
            // 생성 후 이름 변경 UI 시작 로직은 다른 곳에서 호출
            newlyCreatedNoteProjectId = newProjectId;
        } catch (error) {
            console.error("새 노트 폴더 생성 실패:", error);
        }
    }

    window.Actions = window.Actions || {};
    window.Actions.Notes = window.Actions.Notes || {};
    window.Actions.Notes.createProject = createNewNoteProject;

})(window);

/* --- Source: script_action_notes_open.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_action_notes_open.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 5: ACTION] 특정 노트를 에디터에서 여는 로직을 책임집니다.
---
*/

(function(window) {
    'use strict';

    function openNoteEditor(noteId) {
        const note = localNotesCache.find(n => n.id === noteId);
        if (!note) {
            console.error(`노트(ID: ${noteId})를 찾을 수 없습니다.`);
            return;
        }
        
        currentNoteId = noteId;
        window.UI.NotesView.switch('editor');
        window.UI.NotesEditor.create(note);
        
        if (noteTitleInput) {
            noteTitleInput.value = note.title || '';
            noteTitleInput.focus();
        }
    }

    window.Actions = window.Actions || {};
    window.Actions.Notes = window.Actions.Notes || {};
    window.Actions.Notes.open = openNoteEditor;

})(window);

/* --- Source: script_action_notes_save.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_action_notes_save.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 5: ACTION] 현재 노트를 저장하는 로직을 책임집니다.
---
*/

(function(window) {
    'use strict';

    function generateTitleFromContent(content) {
        // ... 제목 생성 로직 ...
        return "자동 생성 제목";
    }

    async function saveCurrentNote() {
        if (!currentNoteId) return;
        const editorInstance = window.UI.NotesEditor.getInstance();
        if (!editorInstance) return;

        let titleValue = noteTitleInput.value.trim();
        const contentValue = editorInstance.getMarkdown();

        if (titleValue === '' && contentValue.trim() !== '') {
            titleValue = generateTitleFromContent(contentValue);
        }
        if (titleValue === '' && contentValue.trim() === '') {
            titleValue = '무제 노트';
        }

        const dataToUpdate = {
            title: titleValue,
            content: contentValue,
        };

        try {
            await window.Data.Notes.update(currentNoteId, dataToUpdate);
            // 상태 업데이트 UI 표시는 UI 모듈의 책임
        } catch (e) {
            console.error("메모 저장 실패:", e);
        }
    }

    window.Actions = window.Actions || {};
    window.Actions.Notes = window.Actions.Notes || {};
    window.Actions.Notes.save = saveCurrentNote;

})(window);

/* --- Source: script_action_notes_rename.js --- */

// Placeholder for script_action_notes_rename.js
(function(window) {
    'use strict';
    // This is a placeholder file.
})(window);

/* --- Source: script_action_notes_delete.js --- */

// Placeholder for script_action_notes_delete.js
(function(window) {
    'use strict';
    // This is a placeholder file.
})(window);

/* --- Source: script_action_notes_pin.js --- */

// Placeholder for script_action_notes_pin.js
(function(window) {
    'use strict';
    // This is a placeholder file.
})(window);

/* --- Source: script_action_notes_move.js --- */

// Placeholder for script_action_notes_move.js
(function(window) {
    'use strict';
    // This is a placeholder file.
})(window);

/* --- Source: script_action_notes_project_rename.js --- */

// Placeholder for script_action_notes_project_rename.js
(function(window) {
    'use strict';
    // This is a placeholder file.
})(window);

/* --- Source: script_action_notes_backup.js --- */

// Placeholder for script_action_notes_backup.js
(function(window) {
    'use strict';
    // This is a placeholder file.
})(window);

/* --- Source: script_action_chat_send_message.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_action_chat_send_message.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 5: ACTION] AI에게 채팅 메시지를 보내고 응답을 받아 처리하는 전체 프로세스를 책임집니다.
---
*/

(function(window) {
    'use strict';

    async function sendMessage() {
        const query = chatInput.value.trim();
        if (!query) return;

        // UI 상태 업데이트
        chatInput.value = '';
        chatInput.disabled = true;

        const userMessage = { role: 'user', content: query, timestamp: new Date() };

        // 세션 관리 로직
        let sessionId = currentSessionId;
        if (!sessionId) {
            const newSessionData = { title: query.substring(0, 40), messages: [userMessage] };
            sessionId = await window.Data.ChatSessions.add(newSessionData);
            currentSessionId = sessionId;
        } else {
            await window.Data.ChatSessions.addMessage(sessionId, userMessage);
        }

        // AI API 호출 로직
        try {
            const provider = userApiSettings.provider || 'google'; // 기본값은 google
            const apiKey = userApiSettings.apiKey; // 키가 없으면 기본 API 사용 가정
            const model = userApiSettings.selectedModel;
            const maxTokens = userApiSettings.maxOutputTokens;
            const history = localChatSessionsCache.find(s => s.id === sessionId)?.messages || [userMessage];

            const apiService = window.Services.Api[provider];
            const request = apiService.buildRequest(model, history, maxTokens, apiKey);

            const response = await fetch(request.url, request.options);
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

            const result = await response.json();
            const parsed = apiService.parseResponse(result);

            const aiMessage = { role: 'ai', content: parsed.content, timestamp: new Date() };
            await window.Data.ChatSessions.addMessage(sessionId, aiMessage);

        } catch (error) {
            console.error("AI 응답 처리 실패:", error);
            const errorMessage = { role: 'ai', content: `오류: ${error.message}`, timestamp: new Date() };
            await window.Data.ChatSessions.addMessage(sessionId, errorMessage);
        } finally {
            chatInput.disabled = false;
            chatInput.focus();
        }
    }

    window.Actions = window.Actions || {};
    window.Actions.Chat = window.Actions.Chat || {};
    window.Actions.Chat.sendMessage = sendMessage;

})(window);

/* --- Source: script_action_chat_create.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_action_chat_create.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 5: ACTION] 새로운 채팅 세션을 시작하는 로직을 책임집니다.
---
*/

(function(window) {
    'use strict';

    function createNewChat() {
        currentSessionId = null;
        // UI 업데이트는 UI 렌더러가 담당합니다.
        // 예: window.UI.ChatMessageRenderer.renderWelcome();
        // 예: window.UI.ChatSidebarRenderer.updateSelection();
        console.log("새 대화 시작 상태로 전환.");
    }

    window.Actions = window.Actions || {};
    window.Actions.Chat = window.Actions.Chat || {};
    window.Actions.Chat.createNew = createNewChat;

})(window);

/* --- Source: script_action_chat_select.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_action_chat_select.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 5: ACTION] 특정 채팅 세션을 선택하는 로직을 책임집니다.
---
*/

(function(window) {
    'use strict';

    function selectSession(sessionId) {
        if (!sessionId || currentSessionId === sessionId) return;

        const sessionData = localChatSessionsCache.find(s => s.id === sessionId);
        if (!sessionData) {
            console.error(`세션(ID: ${sessionId})을 찾을 수 없습니다.`);
            return;
        }

        currentSessionId = sessionId;
        console.log(`세션 ${sessionId} 선택됨.`);
        // UI 렌더링 및 상태 업데이트는 각 UI 모듈에서 리스너를 통해 처리합니다.
        // 예를 들어, 데이터 변경시 UI 렌더러가 자동으로 업데이트합니다.
    }

    window.Actions = window.Actions || {};
    window.Actions.Chat = window.Actions.Chat || {};
    window.Actions.Chat.selectSession = selectSession;

})(window);

/* --- Source: script_action_chat_rename.js --- */

// Placeholder for script_action_chat_rename.js
(function(window) {
    'use strict';
    // This is a placeholder file.
})(window);

/* --- Source: script_action_chat_delete.js --- */

// Placeholder for script_action_chat_delete.js
(function(window) {
    'use strict';
    // This is a placeholder file.
})(window);

/* --- Source: script_action_chat_pin.js --- */

// Placeholder for script_action_chat_pin.js
(function(window) {
    'use strict';
    // This is a placeholder file.
})(window);

/* --- Source: script_action_chat_move.js --- */

// Placeholder for script_action_chat_move.js
(function(window) {
    'use strict';
    // This is a placeholder file.
})(window);

/* --- Source: script_action_chat_project_create.js --- */

// Placeholder for script_action_chat_project_create.js
(function(window) {
    'use strict';
    // This is a placeholder file.
})(window);

/* --- Source: script_action_chat_project_rename.js --- */

// Placeholder for script_action_chat_project_rename.js
(function(window) {
    'use strict';
    // This is a placeholder file.
})(window);

/* --- Source: script_event_handler.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_event_handler.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 6: EVENT HANDLING] 모든 사용자 입력을 감지하고 적절한 액션을 호출하는 유일한 이벤트 위임 허브입니다.
---
*/

(function(window) {
    'use strict';

    const EventHandler = {
        init() {
            console.log("이벤트 핸들러 초기화...");
            document.body.addEventListener('click', this.handleGlobalClick.bind(this));
            document.body.addEventListener('submit', this.handleGlobalSubmit.bind(this));
            // 추가적인 이벤트 리스너 (input, keydown 등)를 여기에 등록할 수 있습니다.
        },

        handleGlobalClick(e) {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const params = target.dataset;

            this.routeAction(action, params, e);
        },

        handleGlobalSubmit(e) {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            e.preventDefault(); // 기본 submit 동작 방지

            const action = target.dataset.action;
            const params = target.dataset;

            this.routeAction(action, params, e);
        },

        routeAction(action, params, event) {
            console.log(`Action Triggered: ${action}`, params);
            const [category, actionName] = action.split('-');

            if (!category || !actionName) {
                console.warn(`잘못된 형식의 action입니다: ${action}`);
                return;
            }

            // 액션을 동적으로 찾아 실행
            // 예: "notes-create-note" -> window.Actions.Notes.create()
            try {
                let actionFunc;
                if (category === 'notes') {
                    const noteAction = this.camelCase(actionName);
                    actionFunc = window.Actions.Notes[noteAction];
                } else if (category === 'chat') {
                    const chatAction = this.camelCase(actionName);
                    actionFunc = window.Actions.Chat[chatAction];
                }

                if (typeof actionFunc === 'function') {
                    actionFunc(params); // 파라미터 전달
                } else {
                    console.warn(`정의되지 않은 action입니다: ${action}`);
                }
            } catch (error) {
                console.error(`Action 실행 중 오류 발생 [${action}]:`, error);
            }
        },

        // Helper to convert kebab-case to camelCase
        camelCase(str) {
            return str.split('-').reduce((acc, part, index) => {
                return index === 0 ? part : acc + part.charAt(0).toUpperCase() + part.slice(1);
            }, '');
        }
    };

    window.EventHandler = EventHandler;

})(window);

/* --- Source: script_app.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_app.js
Version: 1.2 (EventHandler Integration)
Architect: [Username] & System Architect Ailey
Description: [LAYER 0: ORCHESTRATOR] 앱의 두뇌. 모든 부트스트랩 과정을 순서대로 지휘합니다.
---
*/

(function(window) {
    'use strict';

    const App = {
        async initServices() {
            console.log("서비스 계층 초기화...");
            const firebaseInitialized = await window.Services.Firebase.initialize();
            if (!firebaseInitialized) {
                alert("시스템의 핵심 서비스(Firebase)에 연결할 수 없습니다. 페이지를 새로고침 해보세요.");
                return false;
            }
            window.Services.ApiSettings.load();
            return true;
        },

        initComponents() {
            console.log("컴포넌트 계층 초기화...");
            // 추후 컴포넌트 생성/초기화 로직 추가
        },

        initEventHandlers() {
            console.log("이벤트 핸들러 계층 초기화...");
            window.EventHandler.init();
        },

        async run() {
            console.log("Ailey & Bailey Canvas - 애플리케이션 시작");

            const servicesReady = await this.initServices();
            if (servicesReady) {
                this.initComponents();
                this.initEventHandlers();
                console.log("애플리케이션 준비 완료. 사용자 입력을 기다립니다...");
            }
        }
    };

    window.App = App;

})(window);

/* --- Source: script_main.js --- */

/*
--- Ailey & Bailey Canvas ---
File: script_main.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 0: ENTRY POINT] 애플리케이션의 유일한 시작점입니다.
             App.run()을 호출하는 단일 책임을 가집니다.
---
*/

// 애플리케이션의 모든 모듈이 로드된 후 실행됩니다.
document.addEventListener('DOMContentLoaded', () => {
    if (window.App) {
        window.App.run();
    } else {
        console.error("애플리케이션의 핵심 모듈(App)을 찾을 수 없습니다.");
    }
});

