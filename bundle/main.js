/* Auto-generated bundle from 2025-08-08T06:44:30.344Z */

/* --- Source: src\01_state\001_state_globalVars.js --- */
/*

--- Ailey & Bailey Canvas ---

File: 001_state_globalVars.js

Version: 1.1 (Refactored)

Description: Declares all global DOM element constants. All state variables have been moved to state_manager.js.

*/



// --- 1. Element Declarations (Global Scope) ---

// [VPC] Caching DOM elements for performance and easy access.

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



// --- 2. Shared Variables (Global Scope) ---

// These are simple variables, not application state. State is in state_manager.js

const canvasId = document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id';

const appId = 'AileyBailey_Global_Space';

let debounceTimer = null;

let lastSelectedText = '';

let currentOpenContextMenu = null;

let toastEditorInstance = null; // This is a specific instance, managed in its own module.

/* --- Source: src\01_state\005_state_manager.js --- */
/*

--- Ailey & Bailey Canvas ---

File: 005_state_manager.js

Version: 1.0 (Refactored)

Description: Centralized state management for the application. Acts as the Single Source of Truth.

*/



// [CoreDNA] The core state object, kept private within the module.

const _state = {

    // DB & Auth State

    db: null,

    currentUser: null,

    

    // Notes App State

    notesCollectionRef: null, 

    noteProjectsCollectionRef: null, 

    tagsCollectionRef: null, 

    noteTemplatesCollectionRef: null,

    localNotesCache: [], 

    localNoteProjectsCache: [], 

    localTagsCache: [], 

    noteTemplatesCache: [],

    unsubscribeFromNotes: null, 

    unsubscribeFromNoteProjects: null, 

    unsubscribeFromTags: null, 

    unsubscribeFromNoteTemplates: null,

    currentNoteId: null,

    newlyCreatedNoteProjectId: null,

    currentNoteSort: 'updatedAt_desc',

    draggedNoteId: null,



    // Chat & Project State

    chatSessionsCollectionRef: null, 

    projectsCollectionRef: null,

    localChatSessionsCache: [], 

    localProjectsCache: [],

    currentSessionId: null,

    unsubscribeFromChatSessions: null, 

    unsubscribeFromProjects: null,

    newlyCreatedProjectId: null,

    activeTimers: {},



    // AI & Learning State

    selectedMode: 'ailey_coaching',

    defaultModel: 'gemini-2.5-flash-preview-04-17',

    customPrompt: '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.',

    currentQuizData: null,

    noteGraphData: { nodes: [], edges: [] },



    // API Settings State

    userApiSettings: {

        provider: null, apiKey: '', selectedModel: '', availableModels: [],

        maxOutputTokens: 2048, tokenUsage: { prompt: 0, completion: 0 }

    }

};



// [CoreDNA] Subscribers to state changes

const _subscribers = [];



// [HCA] The public interface for interacting with the state.

const stateManager = {

    /**

     * Returns a readonly copy of the current state.

     * @returns {object} The current state.

     */

    getState: () => {

        return Object.freeze({ ..._state });

    },



    /**

     * Updates the state with new values and notifies subscribers.

     * @param {object} newState - An object containing the state keys to update.

     */

    setState: (newState) => {

        Object.assign(_state, newState);

        console.log('[StateManager] State updated:', newState);

        _subscribers.forEach(callback => callback());

    },



    /**

     * Subscribes a callback function to be executed on state changes.

     * @param {function} callback - The function to call when state changes.

     * @returns {function} An unsubscribe function.

     */

    subscribe: (callback) => {

        _subscribers.push(callback);

        return () => {

            const index = _subscribers.indexOf(callback);

            if (index > -1) {

                _subscribers.splice(index, 1);

            }

        };

    }

};



// Make the stateManager globally accessible (for this bundled architecture)

window.stateManager = stateManager;

/* --- Source: src\02_utils\010_utils_debounce.js --- */
/*
--- Ailey & Bailey Canvas ---
File: 010_utils_debounce.js
Version: 1.0 (Bundled)
Description: Provides a generic debounce utility function.
*/

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

/* --- Source: src\02_utils\011_utils_helpers.js --- */
/*
--- Ailey & Bailey Canvas ---
File: 011_utils_helpers.js
Version: 1.0 (Bundled)
Description: Contains generic, reusable UI helper functions.
*/

function updateClock() { 
    const clockElement = document.getElementById('real-time-clock'); 
    if (!clockElement) return; 
    const now = new Date(); 
    const options = { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }; 
    clockElement.textContent = now.toLocaleString('ko-KR', options); 
}

function setupSystemInfoWidget() { 
    if (!systemInfoWidget || !currentUser) return; 
    const canvasIdDisplay = document.getElementById('canvas-id-display'); 
    if (canvasIdDisplay) { 
        canvasIdDisplay.textContent = canvasId.substring(0, 8) + '...'; 
    } 
    const copyBtn = document.getElementById('copy-canvas-id'); 
    if (copyBtn) { 
        copyBtn.addEventListener('click', () => { 
            navigator.clipboard.writeText(canvasId).then(() => { 
                copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" /></svg>'; 
                setTimeout(() => { 
                    copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" /></svg>'; 
                }, 1500); 
            }); 
        }); 
    } 
    const tooltip = document.createElement('div'); 
    tooltip.className = 'system-tooltip'; 
    tooltip.innerHTML = `<div><strong>Canvas ID:</strong> ${canvasId}</div><div><strong>User ID:</strong> ${currentUser.uid}</div>`; 
    systemInfoWidget.appendChild(tooltip); 
}

function initializeTooltips() { 
    document.querySelectorAll('.keyword-chip[data-tooltip]').forEach(chip => { 
        if (chip.querySelector('.tooltip')) { 
            chip.classList.add('has-tooltip'); 
            chip.querySelector('.tooltip').textContent = chip.dataset.tooltip; 
        } 
    }); 
    document.querySelectorAll('.content-section strong[data-tooltip]').forEach(highlight => { 
        if(!highlight.querySelector('.tooltip')) { 
            highlight.classList.add('has-tooltip'); 
            const tooltipElement = document.createElement('span'); 
            tooltipElement.className = 'tooltip'; 
            tooltipElement.textContent = highlight.dataset.tooltip; 
            highlight.appendChild(tooltipElement); 
        } 
    }); 
}

function makePanelDraggable(panelElement) { 
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
        if (e.target.closest('button, input, select, .close-btn, #delete-session-btn, #chat-mode-selector, #api-settings-btn')) return; 
        isDragging = true; 
        panelElement.classList.add('is-dragging'); 
        offset = { x: panelElement.offsetLeft - e.clientX, y: panelElement.offsetTop - e.clientY }; 
        document.addEventListener('mousemove', onMouseMove); 
        document.addEventListener('mouseup', onMouseUp); 
    }); 
}

function togglePanel(panelElement, forceShow = null) { 
    if (!panelElement) return; 
    const show = forceShow !== null ? forceShow : panelElement.style.display !== 'flex'; 
    panelElement.style.display = show ? 'flex' : 'none'; 
}

function setupNavigator() { 
    const scrollNav = document.getElementById('scroll-nav'); 
    if (!scrollNav || !learningContent) return; 
    const headers = learningContent.querySelectorAll('h2, #section-4 h3, #section-5 h3, #section-6 h3'); 
    if (headers.length === 0) { 
        scrollNav.style.display = 'none'; 
        if(wrapper) wrapper.classList.add('toc-hidden'); 
        return; 
    } 
    scrollNav.style.display = 'block'; 
    if(wrapper) wrapper.classList.remove('toc-hidden'); 
    const navList = document.createElement('ul'); 
    headers.forEach((header, index) => { 
        let targetElement = header.closest('.content-section'); 
        if (targetElement && !targetElement.id) targetElement.id = `nav-target-${index}`; 
        if (targetElement) { 
            const listItem = document.createElement('li'); 
            const link = document.createElement('a'); 
            let navText = header.textContent.trim().replace(/[\[\]🤓⏳📖]/g, '').trim(); 
            link.textContent = navText.substring(0, 25); 
            link.href = `#${targetElement.id}`; 
            if (header.tagName === 'H3') { 
                link.style.paddingLeft = '25px'; 
                link.style.fontSize = '0.9em'; 
            } 
            listItem.appendChild(link); 
            navList.appendChild(listItem); 
        } 
    }); 
    scrollNav.innerHTML = '<h3>학습 내비게이션</h3>'; 
    scrollNav.appendChild(navList); 
    const links = scrollNav.querySelectorAll('a'); 
    const observer = new IntersectionObserver(entries => { 
        entries.forEach(entry => { 
            const id = entry.target.getAttribute('id'); 
            const navLink = scrollNav.querySelector(`a[href="#${id}"]`); 
            if (navLink && entry.isIntersecting && entry.intersectionRatio > 0.5) { 
                links.forEach(l => l.classList.remove('active')); 
                navLink.classList.add('active'); 
            } 
        }); 
    }, { rootMargin: "0px 0px -70% 0px", threshold: 0.6 }); 
    headers.forEach(header => { 
        const target = header.closest('.content-section'); 
        if (target) observer.observe(target); 
    }); 
}

function handleTextSelection(e) { 
    if (e.target.closest('.draggable-panel, #selection-popover, .fixed-tool-container, #system-info-widget, .project-context-menu, .session-context-menu')) return; 
    const selection = window.getSelection(); 
    const selectedText = selection.toString().trim(); 
    removeContextMenu(); 
    if (selectedText.length > 3) { 
        lastSelectedText = selectedText; 
        const range = selection.getRangeAt(0); 
        const rect = range.getBoundingClientRect(); 
        const popover = selectionPopover; 
        let top = rect.top + window.scrollY - popover.offsetHeight - 10; 
        let left = rect.left + window.scrollX + (rect.width / 2) - (popover.offsetWidth / 2); 
        popover.style.top = `${top < window.scrollY ? rect.bottom + window.scrollY + 10 : top}px`; 
        popover.style.left = `${Math.max(5, Math.min(left, window.innerWidth - popover.offsetWidth - 5))}px`; 
        popover.style.display = 'flex'; 
    } else if (!e.target.closest('#selection-popover')) { 
        selectionPopover.style.display = 'none'; 
    } 
}

function handlePopoverAskAi() { 
    if (!lastSelectedText || !chatInput) return; 
    togglePanel(chatPanel, true); 
    handleNewChat(); 
    setTimeout(() => { 
        chatInput.value = `"${lastSelectedText}"\n\n이 내용에 대해 더 자세히 설명해줄래?`; 
        chatInput.style.height = (chatInput.scrollHeight) + 'px'; 
        chatInput.focus(); 
    }, 100); 
    selectionPopover.style.display = 'none'; 
}

function handlePopoverAddNote() { 
    if (!lastSelectedText) return; 
    addNote(`> ${lastSelectedText}\n\n`); 
    selectionPopover.style.display = 'none'; 
}

function openPromptModal() { 
    if (customPromptInput) customPromptInput.value = customPrompt; 
    if (promptModalOverlay) promptModalOverlay.style.display = 'flex'; 
}

function closePromptModal() { 
    if (promptModalOverlay) promptModalOverlay.style.display = 'none'; 
}

function saveCustomPrompt() { 
    if (customPromptInput) { 
        customPrompt = customPromptInput.value; 
        localStorage.setItem('customTutorPrompt', customPrompt); 
        closePromptModal(); 
    } 
}

function showModal(message, onConfirm) { 
    if (!customModal || !modalMessage || !modalConfirmBtn || !modalCancelBtn) return; 
    modalMessage.textContent = message; 
    customModal.style.display = 'flex'; 
    modalConfirmBtn.onclick = () => { 
        onConfirm(); 
        customModal.style.display = 'none'; 
    }; 
    modalCancelBtn.onclick = () => { 
        customModal.style.display = 'none'; 
    }; 
}

function updateStatus(msg, success) { 
    if (!autoSaveStatus) return; 
    autoSaveStatus.textContent = msg; 
    autoSaveStatus.style.color = success ? 'lightgreen' : 'lightcoral'; 
    setTimeout(() => { autoSaveStatus.textContent = ''; }, 3000); 
}

function applyFormat(fmt) { 
    if (!noteContentTextarea) return; 
    const s = noteContentTextarea.selectionStart, e = noteContentTextarea.selectionEnd, t = noteContentTextarea.value.substring(s, e); 
    const m = fmt === 'bold' ? '**' : (fmt === 'italic' ? '*' : '`'); 
    noteContentTextarea.value = `${noteContentTextarea.value.substring(0,s)}${m}${t}${m}${noteContentTextarea.value.substring(e)}`; 
    noteContentTextarea.focus(); 
}

async function startQuiz() { 
    if (!quizModalOverlay) return; 
    const k = Array.from(document.querySelectorAll('.keyword-chip')).map(c => c.textContent.trim()).join(', '); 
    if (!k) { 
        showModal("퀴즈 생성 키워드가 없습니다.", ()=>{}); 
        return; 
    } 
    if (quizContainer) quizContainer.innerHTML = '<div class="loading-indicator">퀴즈 생성 중...</div>'; 
    if (quizResults) quizResults.innerHTML = ''; 
    quizModalOverlay.style.display = 'flex'; 
    try { 
        const res = await new Promise(r => setTimeout(() => r(JSON.stringify({ "questions": [{"q":"(e.g)...","o":["..."],"a":"..."}]})), 500)); 
        currentQuizData = JSON.parse(res); 
        renderQuiz(currentQuizData); 
    } catch (e) { 
        if(quizContainer) quizContainer.innerHTML = '퀴즈 생성 실패.'; 
    } 
}

function renderQuiz(data) { 
    if (!quizContainer || !data.questions) return; 
    quizContainer.innerHTML = ''; 
    data.questions.forEach((q, i) => { 
        const b = document.createElement('div'); 
        b.className = 'quiz-question-block'; 
        const p = document.createElement('p'); 
        p.textContent = `${i + 1}. ${q.q}`; 
        const o = document.createElement('div'); 
        o.className = 'quiz-options'; 
        q.o.forEach(opt => { 
            const l = document.createElement('label'); 
            const r = document.createElement('input'); 
            r.type = 'radio'; 
            r.name = `q-${i}`; 
            r.value = opt; 
            l.append(r,` ${opt}`); 
            o.appendChild(l); 
        }); 
        b.append(p, o); 
        quizContainer.appendChild(b); 
    }); 
}

/* --- Source: src\03_core\100_core_firebase.js --- */
/*

--- Ailey & Bailey Canvas ---

File: 100_core_firebase.js

Version: 1.1 (Refactored)

Description: Handles all Firebase-related initialization and sets up real-time listeners for all data collections.

*/



async function initializeFirebase() {

    try {

        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;

        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

        if (!firebaseConfig) { throw new Error("Firebase config not found."); }

        if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }

        

        const auth = firebase.auth();

        const db = firebase.firestore();

        stateManager.setState({ db });

        

        if (initialAuthToken) {

            await auth.signInWithCustomToken(initialAuthToken).catch(async (err) => {

               console.warn("Custom token sign-in failed, trying anonymous.", err);

               await auth.signInAnonymously();

            });

        } else {

            await auth.signInAnonymously();

        }

        

        stateManager.setState({ currentUser: auth.currentUser });



        const { currentUser } = stateManager.getState();



        if (currentUser) {

            const userPath = `artifacts/${appId}/users/${currentUser.uid}`;

            

            // Note App refs

            stateManager.setState({

                notesCollectionRef: db.collection(`${userPath}/notes`),

                noteProjectsCollectionRef: db.collection(`${userPath}/noteProjects`),

                tagsCollectionRef: db.collection(`${userPath}/noteTags`),

                noteTemplatesCollectionRef: db.collection(`${userPath}/noteTemplates`)

            });



            // Chat App refs

            const chatHistoryPath = `${userPath}/chatHistories/${canvasId}`;

            stateManager.setState({

                chatSessionsCollectionRef: db.collection(`${chatHistoryPath}/sessions`),

                projectsCollectionRef: db.collection(`${chatHistoryPath}/projects`)

            });



            await Promise.all([

                listenToNotes(),

                listenToNoteProjects(),

                listenToTags(),

                listenToNoteTemplates(),

                listenToChatSessions(),

                listenToProjects()

            ]);

            

            setupSystemInfoWidget();

        }

    } catch (error) {

        console.error("Firebase 초기화 또는 인증 실패:", error);

        if (notesList) notesList.innerHTML = '<div>클라우드 메모장을 불러오는 데 실패했습니다.</div>';

        if (chatMessages) chatMessages.innerHTML = '<div>AI 러닝메이트 연결에 실패했습니다.</div>';

    }

}



function getRelativeDateGroup(timestamp, isPinned = false) {

    if (isPinned) return { key: 0, label: '📌 고정됨' };

    if (!timestamp) return { key: 99, label: '날짜 정보 없음' };

    const now = new Date();

    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();

    now.setHours(0, 0, 0, 0);

    date.setHours(0, 0, 0, 0);

    const diffTime = now.getTime() - date.getTime();

    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays < 1) return { key: 1, label: '오늘' };

    if (diffDays < 2) return { key: 2, label: '어제' };

    if (diffDays < 7) return { key: 3, label: '지난 7일' };

    const nowMonth = now.getMonth(), dateMonth = date.getMonth(), nowYear = now.getFullYear(), dateYear = date.getFullYear();

    if (nowYear === dateYear && nowMonth === dateMonth) return { key: 4, label: '이번 달' };

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    if (dateYear === lastMonth.getFullYear() && dateMonth === lastMonth.getMonth()) return { key: 5, label: '지난 달' };

    return { key: 6 + (nowYear - dateYear) * 12 + (nowMonth - dateMonth), label: `${dateYear}년 ${dateMonth + 1}월` };

}

/* --- Source: src\03_core\110_core_api_settings.js --- */
/*

--- Ailey & Bailey Canvas ---

File: 110_core_api_settings.js

Version: 1.1 (Refactored)

Description: Manages all logic for the API Settings (BYOK) modal.

*/



function createApiSettingsModal() {

    function createApiSettingsModal() {
    const modal = document.createElement('div');
    modal.id = 'api-settings-modal-overlay';
    modal.className = 'custom-modal-overlay';
    modal.innerHTML = `
        <div class="custom-modal api-settings-modal">
            <h3><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg> 개인 API 설정 (BYOK)</h3>
            <p class="api-modal-desc">기본 제공되는 모델 외에, 개인 API 키를 사용하여 더 다양하고 강력한 모델을 이용할 수 있습니다.</p>
            <div class="api-form-section">
                <label for="api-key-input">API 키</label>
                <div class="api-key-wrapper">
                    <input type="password" id="api-key-input" placeholder="sk-..., sk-ant-..., 또는 Google API 키를 입력하세요">
                    <button id="verify-api-key-btn">키 검증 & 모델 로드</button>
                </div>
                <div id="api-key-status"></div>
            </div>
            <div class="api-form-section">
                <label for="api-model-select">사용 모델</label>
                <select id="api-model-select" disabled>
                    <option value="">API 키를 먼저 검증해주세요</option>
                </select>
            </div>
            <div class="api-form-section">
                <label>토큰 한도 설정</label>
                <div class="token-limit-wrapper">
                    <input type="number" id="max-output-tokens-input" placeholder="최대 출력 (예: 2048)">
                </div>
                <small>모델이 생성할 응답의 최대 길이를 제한합니다. (입력값 없을 시 모델 기본값 사용)</small>
            </div>
            <div class="api-form-section token-usage-section">
                <label>누적 토큰 사용량 (개인 키)</label>
                <div id="token-usage-display">
                    <span>입력: 0</span> | <span>출력: 0</span> | <strong>총합: 0</strong>
                </div>
                <button id="reset-token-usage-btn">사용량 초기화</button>
                <small>Google 유료 모델은 응답에 토큰 정보를 포함하지 않아 집계되지 않습니다.</small>
            </div>
            <div class="custom-modal-actions">
                <button id="api-settings-cancel-btn" class="modal-btn">취소</button>
                <button id="api-settings-save-btn" class="modal-btn">저장</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    apiSettingsModalOverlay = document.getElementById('api-settings-modal-overlay');
    apiKeyInput = document.getElementById('api-key-input');
    verifyApiKeyBtn = document.getElementById('verify-api-key-btn');
    apiKeyStatus = document.getElementById('api-key-status');
    apiModelSelect = document.getElementById('api-model-select');
    maxOutputTokensInput = document.getElementById('max-output-tokens-input');
    tokenUsageDisplay = document.getElementById('token-usage-display');
    resetTokenUsageBtn = document.getElementById('reset-token-usage-btn');
    apiSettingsSaveBtn = document.getElementById('api-settings-save-btn');
    apiSettingsCancelBtn = document.getElementById('api-settings-cancel-btn');
}

}



function openApiSettingsModal() {

    loadApiSettings();

    const { userApiSettings } = stateManager.getState();

    apiKeyInput.value = userApiSettings.apiKey;

    maxOutputTokensInput.value = userApiSettings.maxOutputTokens;

    populateModelSelector(userApiSettings.availableModels, userApiSettings.provider, userApiSettings.selectedModel);

    if (userApiSettings.apiKey) {

         apiKeyStatus.textContent = `✅ [${userApiSettings.provider}] 키가 활성화되어 있습니다.`;

         apiKeyStatus.className = 'status-success';

    } else {

         apiKeyStatus.textContent = '';

         apiKeyStatus.className = '';

    }

    renderTokenUsage();

    apiSettingsModalOverlay.style.display = 'flex';

}



function closeApiSettingsModal() {

    apiSettingsModalOverlay.style.display = 'none';

    loadApiSettings(); 

    updateChatHeaderModelSelector();

}



function loadApiSettings() {

    const savedSettings = localStorage.getItem('userApiSettings');

    if (savedSettings) {

        let parsedSettings = JSON.parse(savedSettings);

        if (!parsedSettings.tokenUsage) { parsedSettings.tokenUsage = { prompt: 0, completion: 0 }; }

        if (!parsedSettings.availableModels) { parsedSettings.availableModels = []; }

        stateManager.setState({ userApiSettings: parsedSettings });

    }

}



function saveApiSettings(closeModal = true) {

    const { userApiSettings } = stateManager.getState();

    let newSettings = { ...userApiSettings };

    const key = apiKeyInput.value.trim();



    if (key) {

        newSettings.apiKey = key;

        newSettings.selectedModel = apiModelSelect.value;

        newSettings.maxOutputTokens = Number(maxOutputTokensInput.value) || 2048;

        if (apiModelSelect && apiModelSelect.options.length > 0 && !apiModelSelect.disabled) {

             newSettings.availableModels = Array.from(apiModelSelect.options).map(opt => opt.value);

        }

    } else {

        newSettings = { provider: null, apiKey: '', selectedModel: '', availableModels: [], maxOutputTokens: 2048, tokenUsage: { prompt: 0, completion: 0 } };

    }

    localStorage.setItem('userApiSettings', JSON.stringify(newSettings));

    stateManager.setState({ userApiSettings: newSettings });

    updateChatHeaderModelSelector();

    if (closeModal) { closeApiSettingsModal(); }

}



function detectProvider(key) {
    if (key.startsWith('sk-ant-api')) return 'anthropic';
    if (key.startsWith('sk-')) return 'openai';
    if (key.length > 35 && key.startsWith('AIza')) return 'google_paid';
    return null;
}

async function handleVerifyApiKey() {
    const key = apiKeyInput.value.trim();
    if (!key) { apiKeyStatus.textContent = 'API 키를 입력해주세요.'; apiKeyStatus.className = 'status-error'; return; }
    const provider = detectProvider(key);
    if (!provider) { apiKeyStatus.textContent = '알 수 없는 형식의 API 키입니다. (OpenAI, Anthropic, Google 지원)'; apiKeyStatus.className = 'status-error'; return; }
    userApiSettings.provider = provider;
    apiKeyStatus.textContent = `[${provider}] 키 검증 및 모델 목록 로딩 중...`; apiKeyStatus.className = 'status-loading'; verifyApiKeyBtn.disabled = true;
    try {
        const models = await fetchAvailableModels(provider, key);
        populateModelSelector(models, provider);
        apiKeyStatus.textContent = `✅ [${provider}] 키 검증 완료! 모델을 선택하고 저장하세요.`; apiKeyStatus.className = 'status-success'; apiModelSelect.disabled = false;
    } catch (error) {
        console.error("API Key Verification Error:", error);
        apiKeyStatus.textContent = `❌ [${provider}] 키 검증 실패: ${error.message}`; apiKeyStatus.className = 'status-error'; apiModelSelect.innerHTML = '<option>키 검증에 실패했습니다</option>'; apiModelSelect.disabled = true;
    } finally { verifyApiKeyBtn.disabled = false; }
}

async function fetchAvailableModels(provider, key) {
    if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', { headers: { 'Authorization': `Bearer ${key}` } });
        if (!response.ok) throw new Error('OpenAI 서버에서 모델 목록을 가져올 수 없습니다.');
        const data = await response.json();
        return data.data.filter(m => m.id.includes('gpt')).map(m => m.id).sort().reverse();
    } else if (provider === 'anthropic') {
        return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-2.1'];
    } else if (provider === 'google_paid') {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (!response.ok) throw new Error('Google 서버에서 모델 목록을 가져올 수 없습니다.');
        const data = await response.json();
        return data.models.map(m => m.name.replace('models/', '')).filter(m => m.includes('gemini'));
    }
    return [];
}

function populateModelSelector(models, provider, selectedModel = null) {
    apiModelSelect.innerHTML = '';
    const effectiveModels = models || [];
    if (provider && effectiveModels.length === 0) { if (provider === 'anthropic') { effectiveModels.push('claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'); } }
    if (effectiveModels.length > 0) { effectiveModels.forEach(modelId => { const option = document.createElement('option'); option.value = modelId; option.textContent = modelId; if (modelId === selectedModel) { option.selected = true; } apiModelSelect.appendChild(option); }); apiModelSelect.disabled = false; }
    else { apiModelSelect.innerHTML = '<option>사용 가능한 모델 없음</option>'; apiModelSelect.disabled = true; }
}

function renderTokenUsage() {
    const { prompt, completion } = userApiSettings.tokenUsage;
    const total = prompt + completion;
    tokenUsageDisplay.innerHTML = `<span>입력: ${prompt.toLocaleString()}</span> | <span>출력: ${completion.toLocaleString()}</span> | <strong>총합: ${total.toLocaleString()}</strong>`;
}

function resetTokenUsage() { showModal('누적 토큰 사용량을 정말로 초기화하시겠습니까?', () => { userApiSettings.tokenUsage = { prompt: 0, completion: 0 }; saveApiSettings(false); renderTokenUsage(); }); }

async function handleVerifyApiKey() {

    const key = apiKeyInput.value.trim();

    if (!key) { apiKeyStatus.textContent = 'API 키를 입력해주세요.'; apiKeyStatus.className = 'status-error'; return; }

    const provider = detectProvider(key);

    if (!provider) { apiKeyStatus.textContent = '알 수 없는 형식의 API 키입니다. (OpenAI, Anthropic, Google 지원)'; apiKeyStatus.className = 'status-error'; return; }

    

    stateManager.setState({ userApiSettings: { ...stateManager.getState().userApiSettings, provider } });

    apiKeyStatus.textContent = `[${provider}] 키 검증 및 모델 목록 로딩 중...`; apiKeyStatus.className = 'status-loading'; verifyApiKeyBtn.disabled = true;

    try {

        const models = await fetchAvailableModels(provider, key);

        populateModelSelector(models, provider);

        apiKeyStatus.textContent = `✅ [${provider}] 키 검증 완료! 모델을 선택하고 저장하세요.`; apiKeyStatus.className = 'status-success'; apiModelSelect.disabled = false;

    } catch (error) {

        console.error("API Key Verification Error:", error);

        apiKeyStatus.textContent = `❌ [${provider}] 키 검증 실패: ${error.message}`; apiKeyStatus.className = 'status-error'; apiModelSelect.innerHTML = '<option>키 검증에 실패했습니다</option>'; apiModelSelect.disabled = true;

    } finally { verifyApiKeyBtn.disabled = false; }

}



function renderTokenUsage() {

    const { tokenUsage } = stateManager.getState().userApiSettings;

    const { prompt, completion } = tokenUsage;

    const total = prompt + completion;

    tokenUsageDisplay.innerHTML = `<span>입력: ${prompt.toLocaleString()}</span> | <span>출력: ${completion.toLocaleString()}</span> | <strong>총합: ${total.toLocaleString()}</strong>`;

}



function resetTokenUsage() { 

    showModal('누적 토큰 사용량을 정말로 초기화하시겠습니까?', () => { 

        const { userApiSettings } = stateManager.getState();

        const newSettings = { ...userApiSettings, tokenUsage: { prompt: 0, completion: 0 } };

        stateManager.setState({ userApiSettings: newSettings });

        localStorage.setItem('userApiSettings', JSON.stringify(newSettings));

        renderTokenUsage(); 

    }); 

}

/* --- Source: src\03_core\120_core_main_initializer.js --- */
/*

--- Ailey & Bailey Canvas ---

File: 120_core_main_initializer.js

Version: 1.2 (Refactored)

Description: The main entry point for the application. Initializes all modules.

*/



document.addEventListener('DOMContentLoaded', function () {



    /**

     * Initializes the entire application.

     */

    function initialize() {

        if (!body || !wrapper) { console.error("Core layout elements not found."); return; }

        

        // Basic UI setup

        updateClock(); 

        setInterval(updateClock, 1000);

        

        // Dynamically create and inject the API settings modal and its trigger button

        createApiSettingsModal();

        

        // Load settings and initialize Firebase

        loadApiSettings();

        updateChatHeaderModelSelector();

        

        initializeFirebase().then(() => { 

            // Initialize UI components that depend on data

            setupNavigator(); 

            initializeTooltips(); 

            makePanelDraggable(chatPanel); 

            

            // Initialize feature modules

            chatApp.init();

            notesApp.init();

            

            handleNewChat(); // Start with a clean chat slate

        });



        attachPrimaryEventListeners();

    }



    /**

     * Attaches global, non-feature-specific event listeners.

     */

    function attachPrimaryEventListeners() {

        document.addEventListener('click', (e) => { 

            handleTextSelection(e); 

            if (!e.target.closest('.note-context-menu, .session-context-menu, .project-context-menu')) {

                removeContextMenu();

            }

            if (!e.target.closest('.more-options-container')) {

                document.getElementById('notes-dropdown-menu')?.classList.remove('show');

            }

        });

        

        if (popoverAskAi) popoverAskAi.addEventListener('click', handlePopoverAskAi);

        if (popoverAddNote) popoverAddNote.addEventListener('click', handlePopoverAddNote);



        if (themeToggle) { 

            themeToggle.addEventListener('click', () => { 

                body.classList.toggle('dark-mode'); 

                localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');

                if (toastEditorInstance) {

                    toastEditorInstance.setTheme(body.classList.contains('dark-mode') ? 'dark' : 'default');

                }

            }); 

            if(localStorage.getItem('theme') === 'dark') body.classList.add('dark-mode'); else body.classList.remove('dark-mode');

        }

        if (tocToggleBtn) tocToggleBtn.addEventListener('click', () => { wrapper.classList.toggle('toc-hidden'); systemInfoWidget?.classList.toggle('tucked'); });



        document.body.addEventListener('click', e => {

            if (e.target.closest('#api-settings-btn')) {

                openApiSettingsModal();

            }

        });

    }



    initialize();

});

/* --- Source: src\04_features_chat\200_chat_data.js --- */
/*
--- Ailey & Bailey Canvas ---
File: 200_chat_data.js
Version: 1.0 (Bundled)
Description: Handles all data layer interactions with Firebase Firestore for the chat application.
*/

// --- Chat Data Listeners (moved from firebase.js) ---
function listenToProjects() {
    return new Promise((resolve) => {
        if (!projectsCollectionRef) return resolve();
        if (unsubscribeFromProjects) unsubscribeFromProjects();
        unsubscribeFromProjects = projectsCollectionRef.onSnapshot(snapshot => {
            const oldCache = [...localProjectsCache];
            localProjectsCache = snapshot.docs.map(doc => ({
                id: doc.id,
                isExpanded: oldCache.find(p => p.id === doc.id)?.isExpanded ?? true, ...doc.data()
            }));
            renderSidebarContent();
            if (newlyCreatedProjectId) {
                const newProjectElement = document.querySelector(`.project-container[data-project-id="${newlyCreatedProjectId}"]`);
                if (newProjectElement) { startProjectRename(newlyCreatedProjectId); newlyCreatedProjectId = null; }
            }
            resolve();
        }, error => { console.error("Project listener error:", error); resolve(); });
    });
}

function listenToChatSessions() {
    return new Promise((resolve) => {
        if (!chatSessionsCollectionRef) return resolve();
        if (unsubscribeFromChatSessions) unsubscribeFromChatSessions();
        unsubscribeFromChatSessions = chatSessionsCollectionRef.onSnapshot(snapshot => {
            localChatSessionsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderSidebarContent();
            if (currentSessionId) {
                const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId);
                if (!currentSessionData) handleNewChat();
                else renderChatMessages(currentSessionData);
            }
            resolve();
        }, error => { console.error("Chat session listener error:", error); resolve(); });
    });
}

// --- Chat Data Management Functions ---
async function createNewProject() {
    const newName = getNewProjectDefaultName();
    try {
        const newProjectRef = await projectsCollectionRef.add({
            name: newName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        newlyCreatedProjectId = newProjectRef.id;
    } catch (error) {
        console.error("Error creating new project:", error);
        alert("프로젝트 생성에 실패했습니다.");
    }
}

async function renameProject(projectId, newName) {
    if (!newName || !newName.trim() || !projectId) return;
    try {
        await projectsCollectionRef.doc(projectId).update({
            name: newName.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error renaming project:", error);
        alert("프로젝트 이름 변경에 실패했습니다.");
    }
}

async function deleteProject(projectId) {
    const project = localProjectsCache.find(p => p.id === projectId);
    if (!project) return;

    const message = `프로젝트 '${project.name}'를 삭제하시겠습니까? 프로젝트 안의 모든 대화는 '일반 대화'로 이동됩니다.`;
    showModal(message, async () => {
        try {
            const batch = db.batch();
            const sessionsToMove = localChatSessionsCache.filter(s => s.projectId === projectId);
            sessionsToMove.forEach(session => {
                const sessionRef = chatSessionsCollectionRef.doc(session.id);
                batch.update(sessionRef, { projectId: null });
            });
            const projectRef = projectsCollectionRef.doc(projectId);
            batch.delete(projectRef);
            await batch.commit();
        } catch (error) {
            console.error("Error deleting project:", error);
            alert("프로젝트 삭제에 실패했습니다.");
        }
    });
}

async function moveSessionToProject(sessionId, newProjectId) {
    const session = localChatSessionsCache.find(s => s.id === sessionId);
    if (!session || session.projectId === newProjectId) return;

    try {
        await chatSessionsCollectionRef.doc(sessionId).update({
            projectId: newProjectId,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (newProjectId) {
            await projectsCollectionRef.doc(newProjectId).update({
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error("Error moving session:", error);
        alert("세션 이동에 실패했습니다.");
    }
}

async function toggleChatPin(sessionId) {
    if (!chatSessionsCollectionRef || !sessionId) return;
    const sessionRef = chatSessionsCollectionRef.doc(sessionId);
    const currentSession = localChatSessionsCache.find(s => s.id === sessionId);
    if (!currentSession) return;
    try {
        await sessionRef.update({
            isPinned: !(currentSession.isPinned || false),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error toggling pin status:", error);
    }
}

async function renameSession(sessionId, newTitle) {
    if (!newTitle || !sessionId) return;
    try {
        await chatSessionsCollectionRef.doc(sessionId).update({
            title: newTitle,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error renaming session:", error);
        alert("세션 이름 변경에 실패했습니다.");
    }
}

function handleDeleteSession(sessionId) {
    if (!sessionId) return;
    const sessionToDelete = localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionToDelete) return;

    showModal(`'${sessionToDelete?.title || '이 대화'}'를 삭제하시겠습니까?`, () => {
        if (chatSessionsCollectionRef) {
            chatSessionsCollectionRef.doc(sessionId).delete().then(() => {
                console.log("Session deleted successfully");
                if (currentSessionId === sessionId) {
                    handleNewChat();
                }
            }).catch(e => {
                console.error("세션 삭제 실패:", e);
                alert("세션 삭제에 실패했습니다.");
            });
        }
    });
}

/* --- Source: src\04_features_chat\210_chat_engine.js --- */
/*
--- Ailey & Bailey Canvas ---
File: 210_chat_engine.js
Version: 1.0 (Bundled)
Description: The core engine for chat functionality, including API requests and response parsing.
*/

async function handleChatSend() {
    if (!chatInput || chatInput.disabled) return;
    const query = chatInput.value.trim();
    if (!query) return;

    chatInput.value = '';
    chatInput.style.height = 'auto';
    chatInput.disabled = true;
    chatInput.placeholder = "AI가 응답하는 중..."
    chatSendBtn.disabled = true;

    const userMessage = { role: 'user', content: query, timestamp: new Date() };
    const loadingMessage = { role: 'ai', status: 'loading', id: `loading-${Date.now()}` };
    let sessionRef;
    let currentMessages = [];
    let isNewSession = false;

    if (!currentSessionId) {
        isNewSession = true;
        const activeProject = document.querySelector('.project-header.active-drop-target');
        const newSessionProjectId = activeProject ? activeProject.closest('.project-container').dataset.projectId : null;

        if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
        if (chatMessages) chatMessages.style.display = 'flex';
        
        currentMessages = [userMessage, loadingMessage];
        renderChatMessages({ messages: currentMessages });
        
        const newSessionData = {
            title: query.substring(0, 40) + (query.length > 40 ? '...' : ''),
            messages: [userMessage],
            mode: selectedMode,
            projectId: newSessionProjectId,
            isPinned: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        sessionRef = await chatSessionsCollectionRef.add(newSessionData);
        currentSessionId = sessionRef.id;

    } else {
        sessionRef = chatSessionsCollectionRef.doc(currentSessionId);
        const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId);
        
        currentMessages = [...(currentSessionData.messages || []), userMessage, loadingMessage];
        renderChatMessages({ messages: currentMessages });
        
        await sessionRef.update({
            messages: firebase.firestore.FieldValue.arrayUnion(userMessage),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
    
    const startTime = performance.now();
    try {
        let aiRes, usageData;
        const historyForApi = isNewSession ? [userMessage] : (localChatSessionsCache.find(s => s.id === currentSessionId)?.messages.slice(-20) || [userMessage]);

        if (userApiSettings.provider && userApiSettings.apiKey && userApiSettings.selectedModel) {
            const requestDetails = buildApiRequest(userApiSettings.provider, userApiSettings.selectedModel, historyForApi, userApiSettings.maxOutputTokens);
            const res = await fetch(requestDetails.url, requestDetails.options);
            if (!res.ok) { 
                const errorBody = await res.text(); 
                throw new Error(`API Error ${res.status}: ${errorBody}`); 
            }
            const result = await res.json();
            const parsed = parseApiResponse(userApiSettings.provider, result);
            aiRes = parsed.content;
            usageData = parsed.usage;
            if (usageData) { 
                userApiSettings.tokenUsage.prompt += usageData.prompt; 
                userApiSettings.tokenUsage.completion += usageData.completion; 
                saveApiSettings(false); 
                renderTokenUsage(); 
            }
        } else {
            let promptWithReasoning;
            const lastUserMessage = historyForApi[historyForApi.length - 1].content;
            promptWithReasoning = `You are Ailey. Based on the following query, provide a step-by-step reasoning process if the query is complex. For simple queries, omit the reasoning part. The reasoning, if present, must follow the format: [REASONING_START]SUMMARY:{one-line summary}|||DETAIL:{detailed explanation}SUMMARY:{another summary}|||DETAIL:{another detail}[REASONING_END]. The final answer should be in a friendly, informal Korean tone. Query: "${lastUserMessage}"`;
            
            const apiMessages = [{ role: 'user', parts: [{ text: promptWithReasoning }] }];
            const selectedDefaultModel = localStorage.getItem('selectedAiModel') || defaultModel;
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedDefaultModel}:generateContent?key=`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: apiMessages })
            });
            if (!res.ok) throw new Error(`Google API Error ${res.status}`);
            const result = await res.json();
            aiRes = result.candidates?.[0]?.content?.parts?.[0]?.text || "답변을 가져올 수 없습니다.";
        }
        
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        const aiMessage = { role: 'ai', content: aiRes, timestamp: new Date(), duration: duration };
        
        await sessionRef.update({
            messages: firebase.firestore.FieldValue.arrayUnion(aiMessage),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

    } catch (e) {
        console.error("Chat send error:", e);
        const errorMessage = { role: 'ai', content: `API 오류가 발생했습니다: ${e.message}`, timestamp: new Date() };
        await sessionRef.update({ 
            messages: firebase.firestore.FieldValue.arrayUnion(errorMessage)
        });
    } finally {
        chatInput.disabled = false;
        chatInput.placeholder = "AI 러닝메이트에게 질문하기..."
        chatSendBtn.disabled = false;
        chatInput.focus();
        if (isNewSession) {
            selectSession(currentSessionId);
        }
    }
}

function buildApiRequest(provider, model, messages, maxTokens) {
    const history = messages.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.content
    }));

    if (provider === 'openai') {
        return {
            url: 'https://api.openai.com/v1/chat/completions',
            options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userApiSettings.apiKey}` }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) }
        };
    } else if (provider === 'anthropic') {
         return {
            url: 'https://api.anthropic.com/v1/messages',
            options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': userApiSettings.apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) }
        };
    } else if (provider === 'google_paid') {
        const googleHistory = messages.map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));
        return {
            url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${userApiSettings.apiKey}`,
            options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: googleHistory, generationConfig: { maxOutputTokens: Number(maxTokens) || 2048 } }) }
        };
    }
    throw new Error(`Unsupported provider: ${provider}`);
}

function parseApiResponse(provider, result) {
    try {
        if (provider === 'openai') {
            return { content: result.choices[0].message.content, usage: { prompt: result.usage.prompt_tokens, completion: result.usage.completion_tokens } };
        } else if (provider === 'anthropic') {
            return { content: result.content[0].text, usage: { prompt: result.usage.input_tokens, completion: result.usage.output_tokens } };
        } else if (provider === 'google_paid') {
            return { content: result.candidates[0].content.parts[0].text, usage: null };
        }
    } catch (error) {
        console.error(`Error parsing ${provider} response:`, error, result);
        return { content: 'API 응답을 파싱하는 중 오류가 발생했습니다.', usage: null };
    }
    return { content: '알 수 없는 제공사입니다.', usage: null };
}

/* --- Source: src\04_features_chat\220_chat_ui.js --- */
/*
--- Ailey & Bailey Canvas ---
File: 220_chat_ui.js
Version: 1.0 (Bundled)
Description: Handles all UI rendering for the chat application, including messages and sidebar.
*/

function renderChatMessages(sessionData) {
    if (!chatMessages || !sessionData) return;
    
    if (sessionData && chatWelcomeMessage) {
        chatWelcomeMessage.style.display = 'none';
    }

    const messages = sessionData.messages || [];
    const fragment = document.createDocumentFragment();

    chatMessages.querySelectorAll('.chat-message, .ai-response-container, .reasoning-block').forEach(el => el.remove());

    messages.forEach((msg, index) => {
        if (msg.role === 'user') {
            const d = document.createElement('div');
            d.className = `chat-message user`;
            d.textContent = msg.content;
            fragment.appendChild(d);

        } else if (msg.role === 'ai') {
            if (msg.status === 'loading') {
                const loadingBlock = document.createElement('div');
                loadingBlock.className = 'reasoning-block loading';
                loadingBlock.id = msg.id; 
                loadingBlock.innerHTML = `
                    <div class="reasoning-header">
                        <span class="toggle-icon">▶</span>
                        <span class="reasoning-summary blinking-cursor">AI가 생각하는 중...</span>
                    </div>
                `;
                fragment.appendChild(loadingBlock);
                return;
            }

            const aiContainer = document.createElement('div');
            aiContainer.className = 'ai-response-container';

            const content = msg.content;
            const reasoningRegex = /^\[REASONING_START\]([\s\S]*?)\[REASONING_END\]/;
            const match = content.match(reasoningRegex);

            if (match) {
                const reasoningBlockId = `reasoning-${currentSessionId}-${index}`;
                const reasoningRaw = match[1];
                const finalAnswer = content.replace(reasoningRegex, '').trim();

                const reasoningSteps = reasoningRaw.split('SUMMARY:')
                    .filter(s => s.trim() !== '')
                    .map(step => {
                        const parts = step.split('|||DETAIL:');
                        return { summary: parts[0]?.trim(), detail: parts[1]?.trim() };
                    });
                
                const rBlock = document.createElement('div');
                rBlock.className = 'reasoning-block';
                rBlock.id = reasoningBlockId;
                rBlock.dataset.steps = JSON.stringify(reasoningSteps);

                rBlock.innerHTML = `
                    <div class="reasoning-header">
                        <span class="toggle-icon">▶</span>
                        <span>AI의 추론 과정...</span>
                        <span class="reasoning-summary"></span>
                    </div>
                    <div class="reasoning-content"></div>
                `;
                aiContainer.appendChild(rBlock);
                
                startSummaryAnimation(rBlock, reasoningSteps);

                if (finalAnswer) {
                    const finalAnswerDiv = document.createElement('div');
                    finalAnswerDiv.className = 'chat-message ai';
                    finalAnswerDiv.textContent = finalAnswer;
                    renderMathInElement(finalAnswerDiv);
                    aiContainer.appendChild(finalAnswerDiv);
                }
            } else {
                const d = document.createElement('div');
                d.className = 'chat-message ai';
                d.textContent = content;
                renderMathInElement(d);
                aiContainer.appendChild(d);
            }

            if (msg.duration) {
                const metaDiv = document.createElement('div');
                metaDiv.className = 'ai-response-meta';
                metaDiv.innerHTML = `
                    <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" /></svg>
                    <span>응답 생성: ${msg.duration}초</span>
                `;
                aiContainer.appendChild(metaDiv);
            }
            fragment.appendChild(aiContainer);
        }
    });
    
    chatMessages.appendChild(fragment);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderMathInElement(element) {
    if (!element || typeof katex === 'undefined') return;
    const textNodes = Array.from(element.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
    
    for (const node of textNodes) {
        const text = node.nodeValue;
        const regex = /\$\$([\s\S]*?)\$\$|\$(?!\s)([^$]*?)(?!\s)\$/g;
        let match;
        let lastIndex = 0;
        const newNodes = [];

        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                newNodes.push(document.createTextNode(text.substring(lastIndex, match.index)));
            }
            
            const isDisplay = !!match[1];
            const formula = isDisplay ? match[1] : match[2];

            try {
                const span = document.createElement('span');
                katex.render(formula, span, {
                    throwOnError: false,
                    displayMode: isDisplay
                });
                newNodes.push(span);
            } catch (e) {
                console.warn("KaTeX rendering error:", e);
                newNodes.push(document.createTextNode(match[0]));
            }
            lastIndex = regex.lastIndex;
        }

        if (lastIndex < text.length) {
            newNodes.push(document.createTextNode(text.substring(lastIndex)));
        }

        if (newNodes.length > 0) {
            node.replaceWith(...newNodes);
        }
    }
}

function startSummaryAnimation(blockElement, reasoningSteps) {
    const blockId = blockElement.id;
    clearTimers(blockId);
    activeTimers[blockId] = [];

    const summaryElement = blockElement.querySelector('.reasoning-summary');
    if (!summaryElement || !reasoningSteps || reasoningSteps.length === 0) return;

    let stepIndex = 0;
    let isCycling = true;

    const cycleSummary = () => {
        if (!isCycling || !reasoningSteps[stepIndex] || !reasoningSteps[stepIndex].summary) return;
        
        const summaryText = reasoningSteps[stepIndex].summary;
        typewriterEffect(summaryElement, summaryText, () => {
            const waitTimer = setTimeout(() => {
                if (!isCycling) return;
                summaryElement.style.opacity = '0';
                const fadeTimer = setTimeout(() => {
                    if (!isCycling) return;
                    stepIndex = (stepIndex + 1) % reasoningSteps.length;
                    summaryElement.style.opacity = '1';
                }, 500);
                if (!activeTimers[blockId]) activeTimers[blockId] = [];
                activeTimers[blockId].push(fadeTimer);
            }, 2000);
            if (!activeTimers[blockId]) activeTimers[blockId] = [];
            activeTimers[blockId].push(waitTimer);
        });
    };
    
    cycleSummary();
    const summaryInterval = setInterval(cycleSummary, 4500);
    if (!activeTimers[blockId]) activeTimers[blockId] = [];
    activeTimers[blockId].push(summaryInterval);
    
    blockElement.addEventListener('toggle', () => { isCycling = false; }, { once: true });
}

function typewriterEffect(element, text, onComplete) {
    if (!element || !text) {
        if (onComplete) onComplete();
        return;
    }

    element.innerHTML = '';
    element.classList.add('blinking-cursor');
    let i = 0;
    const blockId = element.closest('.reasoning-block')?.id;
    
    if (element.typingInterval) {
        clearInterval(element.typingInterval);
    }
    
    const typingInterval = setInterval(() => {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
        } else {
            clearInterval(typingInterval);
            element.typingInterval = null;
            element.classList.remove('blinking-cursor');
            if (onComplete) onComplete();
        }
    }, 30);
    
    element.typingInterval = typingInterval;

    if (blockId && activeTimers[blockId]) {
        activeTimers[blockId].push(typingInterval);
    }
}

function clearTimers(blockId) {
    if (activeTimers[blockId]) {
        activeTimers[blockId].forEach(clearInterval);
        delete activeTimers[blockId];
    }
}

function renderSidebarContent() {
    if (!sessionListContainer) return;
    const searchTerm = searchSessionsInput.value.toLowerCase();
    sessionListContainer.innerHTML = ''; 
    const fragment = document.createDocumentFragment();

    const projectsToDisplay = localProjectsCache
        .filter(p => searchTerm ? p.name?.toLowerCase().includes(searchTerm) || localChatSessionsCache.some(s => s.projectId === p.id && (s.title || '').toLowerCase().includes(searchTerm)) : true)
        .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));

    if (projectsToDisplay.length > 0) {
        const projectGroupHeader = document.createElement('div');
        projectGroupHeader.className = 'session-group-header';
        projectGroupHeader.textContent = '📁 프로젝트';
        fragment.appendChild(projectGroupHeader);

        projectsToDisplay.forEach(project => {
            fragment.appendChild(createProjectContainer(project, searchTerm));
        });
    }

    const unassignedSessions = localChatSessionsCache
        .filter(s => !s.projectId)
        .filter(s => searchTerm ? (s.title || '새 대화').toLowerCase().includes(searchTerm) : true);

    if (unassignedSessions.length > 0) {
        const generalGroupHeader = document.createElement('div');
        generalGroupHeader.className = 'session-group-header';
        generalGroupHeader.textContent = '💬 일반 대화';
        fragment.appendChild(generalGroupHeader);

        const groupedSessions = unassignedSessions.reduce((acc, session) => {
            const groupInfo = getRelativeDateGroup(session.updatedAt || session.createdAt, session.isPinned);
            if (!acc[groupInfo.label]) {
                acc[groupInfo.label] = { key: groupInfo.key, items: [] };
            }
            acc[groupInfo.label].items.push(session);
            return acc;
        }, {});

        const sortedGroupLabels = Object.keys(groupedSessions).sort((a, b) => groupedSessions[a].key - groupedSessions[b].key);

        sortedGroupLabels.forEach(label => {
            const header = document.createElement('div');
            header.className = 'date-group-header';
            header.textContent = label;
            fragment.appendChild(header);

            const group = groupedSessions[label];
            group.items.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
            group.items.forEach(session => fragment.appendChild(createSessionItem(session)));
        });
    }
    sessionListContainer.appendChild(fragment);
}

function createProjectContainer(project, searchTerm) {
    const projectContainer = document.createElement('div');
    projectContainer.className = 'project-container';
    projectContainer.dataset.projectId = project.id;

    const projectHeader = document.createElement('div');
    projectHeader.className = 'project-header';

    const createdAt = project.createdAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) || '정보 없음';
    const updatedAt = project.updatedAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) || createdAt;
    projectHeader.title = `생성: ${createdAt}\n최종 수정: ${updatedAt}`;

    projectHeader.innerHTML = `
        <span class="project-toggle-icon ${project.isExpanded ? 'expanded' : ''}">
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" /></svg>
        </span>
        <span class="project-icon">
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2Z" /></svg>
        </span>
        <span class="project-title">${project.name}</span>
        <button class="project-actions-btn" title="프로젝트 메뉴">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" /></svg>
        </button>
    `;

    const sessionsContainer = document.createElement('div');
    sessionsContainer.className = `sessions-in-project ${project.isExpanded ? 'expanded' : ''}`;
    
    localChatSessionsCache
        .filter(s => s.projectId === project.id)
        .filter(s => searchTerm ? (s.title || '새 대화').toLowerCase().includes(searchTerm) : true)
        .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0))
        .forEach(session => sessionsContainer.appendChild(createSessionItem(session)));

    projectContainer.appendChild(projectHeader);
    projectContainer.appendChild(sessionsContainer);
    return projectContainer;
}

function createSessionItem(session) {
    const item = document.createElement('div');
    item.className = 'session-item';
    item.dataset.sessionId = session.id;
    item.draggable = true;
    if (session.id === currentSessionId) item.classList.add('active');
    
    const createdAt = session.createdAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) || '정보 없음';
    const updatedAt = session.updatedAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) || createdAt;
    item.title = `생성: ${createdAt}\n최종 수정: ${updatedAt}`;
    
    const pinIconSVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>`;
    
    const titleSpan = document.createElement('div');
    titleSpan.className = 'session-item-title';
    titleSpan.textContent = session.title || '새 대화';

    const pinButton = document.createElement('button');
    pinButton.className = `session-pin-btn ${session.isPinned ? 'pinned-active' : ''}`;
    pinButton.title = session.isPinned ? '고정 해제' : '고정하기';
    pinButton.innerHTML = pinIconSVG;

    item.appendChild(titleSpan);
    item.appendChild(pinButton);
    
    return item;
}

function removeContextMenu() {
    currentOpenContextMenu?.remove();
    currentOpenContextMenu = null;
}

function showProjectContextMenu(projectId, buttonElement) {
    removeContextMenu();
    const rect = buttonElement.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'project-context-menu'; 
    menu.style.position = 'absolute';
    menu.style.top = `${rect.bottom + 2}px`;
    menu.style.right = '5px';
    menu.innerHTML = `
        <button class="context-menu-item" data-action="rename">이름 변경</button>
        <button class="context-menu-item" data-action="delete">삭제</button>
    `;
    
    if (sessionListContainer) {
        sessionListContainer.appendChild(menu);
        menu.style.display = 'block';
        currentOpenContextMenu = menu;

        menu.addEventListener('click', (e) => {
            e.stopPropagation();
            const target = e.target.closest('button');
            if(!target) return;
            const action = target.dataset.action;
            if (action === 'rename') {
                startProjectRename(projectId);
            } else if (action === 'delete') {
                deleteProject(projectId);
            }
            removeContextMenu();
        }, { once: true });
    }
}

function showSessionContextMenu(sessionId, x, y) {
    const session = localChatSessionsCache.find(s => s.id === sessionId);
    if (!session) return;
    removeContextMenu();
    
    const menu = document.createElement('div');
    menu.className = 'session-context-menu';
    
    let moveToSubMenuHTML = localProjectsCache
        .sort((a,b) => (a.name > b.name) ? 1 : -1)
        .map(p => `<button class="context-menu-item" data-project-id="${p.id}" ${session.projectId === p.id ? 'disabled' : ''}>${p.name}</button>`).join('');
    
    const moveToMenu = `
        <div class="context-submenu-container">
            <button class="context-menu-item" data-action="move-to"><span>프로젝트로 이동</span><span class="submenu-arrow">▶</span></button>
            <div class="context-submenu">
                <button class="context-menu-item" data-project-id="null" ${!session.projectId ? 'disabled' : ''}>[일반 대화로 이동]</button>
                ${moveToSubMenuHTML ? '<div class="context-menu-separator"></div>' + moveToSubMenuHTML : ''}
            </div>
        </div>
    `;

    const createdAt = session.createdAt?.toDate()?.toLocaleString('ko-KR') || 'N/A';
    const updatedAt = session.updatedAt?.toDate()?.toLocaleString('ko-KR') || 'N/A';
    
    menu.innerHTML = `
        <button class="context-menu-item" data-action="rename">이름 변경</button>
        ${moveToMenu}
        <button class="context-menu-item" data-action="pin">${session.isPinned ? '고정 해제' : '고정하기'}</button>
        <div class="context-menu-separator"></div>
        <button class="context-menu-item" data-action="delete">삭제</button>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item disabled" style="font-size:0.8em; opacity: 0.6;">생성: ${createdAt}</div>
        <div class="context-menu-item disabled" style="font-size:0.8em; opacity: 0.6;">수정: ${updatedAt}</div>
    `;
    
    document.body.appendChild(menu);
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const bodyWidth = document.body.clientWidth;
    const bodyHeight = document.body.clientHeight;
    menu.style.left = `${x + menuWidth > bodyWidth ? x - menuWidth : x}px`;
    menu.style.top = `${y + menuHeight > bodyHeight ? y - menuHeight : y}px`;
    menu.style.display = 'block';
    currentOpenContextMenu = menu;

    menu.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = e.target.closest('.context-menu-item');
        if (!target || target.disabled) return;
        
        const action = target.dataset.action;
        const projectId = target.dataset.projectId;

        if (action === 'rename') { startSessionRename(sessionId); }
        else if (action === 'pin') { toggleChatPin(sessionId); }
        else if (action === 'delete') { handleDeleteSession(sessionId); }
        else if (projectId !== undefined) { moveSessionToProject(sessionId, projectId === 'null' ? null : projectId); }
        
        if (!target.closest('.context-submenu-container')) {
            removeContextMenu();
        }
    });
}

function updateChatHeaderModelSelector() {
    if (!aiModelSelector) return;
    const DEFAULT_MODELS = [
        { value: 'gemini-2.5-flash-preview-04-17', text: '⚡️ Gemini 2.5 Flash (최신)' },
        { value: 'gemini-2.0-flash', text: '💡 Gemini 2.0 Flash (안정)' }
    ];
    aiModelSelector.innerHTML = '';

    if (userApiSettings.provider && userApiSettings.apiKey) {
        const models_to_show = userApiSettings.availableModels || [];
        if(models_to_show.length === 0 && userApiSettings.selectedModel) {
            models_to_show.push(userApiSettings.selectedModel);
        }
        
        models_to_show.forEach(modelId => {
            const option = document.createElement('option');
            option.value = modelId;
            option.textContent = `[개인] ${modelId}`;
            aiModelSelector.appendChild(option);
        });
        
        aiModelSelector.value = userApiSettings.selectedModel;
        aiModelSelector.title = `${userApiSettings.provider} 모델을 선택합니다. (개인 키 사용 중)`;
    } else {
        DEFAULT_MODELS.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.text;
            aiModelSelector.appendChild(option);
        });
        const savedDefaultModel = localStorage.getItem('selectedAiModel') || defaultModel;
        aiModelSelector.value = savedDefaultModel;
        aiModelSelector.title = 'AI 모델을 선택합니다.';
    }
}

/* --- Source: src\04_features_chat\230_chat_app.js --- */
/*

--- Ailey & Bailey Canvas ---

File: 230_chat_app.js

Version: 1.1 (Refactored)

Description: Main controller for the Chat App, handling user interactions and initialization.

*/



const chatApp = {

    init: function() {

        this.attachEventListeners();

        stateManager.subscribe(renderSidebarContent);

        stateManager.subscribe(() => {

            const { currentSessionId, localChatSessionsCache } = stateManager.getState();

            if (currentSessionId) {

                 const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId);

                 if (currentSessionData) {

                    renderChatMessages(currentSessionData);

                 }

            }

        });

        console.log("Chat App Initialized");

    },



    attachEventListeners: function() {

        if (chatForm) chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });

        if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } });

        if (newChatBtn) newChatBtn.addEventListener('click', handleNewChat);

        if (newProjectBtn) newProjectBtn.addEventListener('click', createNewProject);

        if (searchSessionsInput) searchSessionsInput.addEventListener('input', debounce(renderSidebarContent, 300));

        if (chatToggleBtn) chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));

        if (chatPanel) chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));

        setupChatModeSelector();



        if (sessionListContainer) {

             sessionListContainer.addEventListener('click', e => {

                 const sessionItem = e.target.closest('.session-item');

                 if(sessionItem) { selectSession(sessionItem.dataset.sessionId); return; }



                 const pinBtn = e.target.closest('.session-pin-btn');

                 if(pinBtn) { toggleChatPin(pinBtn.closest('.session-item').dataset.sessionId); return; }

                 

                 const projectHeader = e.target.closest('.project-header');

                 if(projectHeader) {

                    const actionsBtn = e.target.closest('.project-actions-btn');

                    if(actionsBtn) { showProjectContextMenu(projectHeader.closest('.project-container').dataset.projectId, actionsBtn); }

                    else { toggleProjectExpansion(projectHeader.closest('.project-container').dataset.projectId); }

                    return;

                 }

             });

             sessionListContainer.addEventListener('contextmenu', e => {

                const sessionItem = e.target.closest('.session-item');

                if(sessionItem) { e.preventDefault(); showSessionContextMenu(sessionItem.dataset.sessionId, e.clientX, e.clientY); }

             });

        }

    }

};

function getNewProjectDefaultName() {
    const baseName = "새 프로젝트";
    const existingNames = new Set(localProjectsCache.map(p => p.name));
    if (!existingNames.has(baseName)) {
        return baseName;
    }
    let i = 2;
    while (existingNames.has(`${baseName} ${i}`)) {
        i++;
    }
    return `${baseName} ${i}`;
}

function toggleProjectExpansion(projectId) {
    const project = localProjectsCache.find(p => p.id === projectId);
    if (project) {
        project.isExpanded = !project.isExpanded;
        renderSidebarContent();
    }
}

function startProjectRename(projectId) {
    const projectContainer = document.querySelector(`.project-container[data-project-id="${projectId}"]`);
    if (!projectContainer) return;
    const titleSpan = projectContainer.querySelector('.project-title');
    if (!titleSpan) return;

    const originalTitle = titleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'project-title-input';
    input.value = originalTitle;

    titleSpan.replaceWith(input);
    input.focus();
    input.select();

    const finishEditing = () => {
        const newName = input.value.trim();
        if (newName && newName !== originalTitle) {
             renameProject(projectId, newName);
        } else {
             renderSidebarContent();
        }
    };

    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
            input.value = originalTitle;
            input.blur();
        }
    });
}

function startSessionRename(sessionId) {
    const sessionItem = document.querySelector(`.session-item[data-session-id="${sessionId}"]`);
    if (!sessionItem) return;
    const titleSpan = sessionItem.querySelector('.session-item-title');
    if (!titleSpan) return;
    const originalTitle = titleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'project-title-input';
    input.value = originalTitle;
    titleSpan.replaceWith(input);
    input.focus();
    input.select();

    const finishEditing = () => {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== originalTitle) {
            renameSession(sessionId, newTitle);
        } else {
            renderSidebarContent();
        }
    };
    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
            input.value = originalTitle;
            input.blur();
        }
    });
}

function selectSession(sessionId) {
    removeContextMenu();
    if (!sessionId) return;
    const sessionData = localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionData) return;

    currentSessionId = sessionId;
    Object.values(activeTimers).forEach(timers => timers.forEach(clearInterval));

    renderSidebarContent();
    if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
    if (chatMessages) chatMessages.style.display = 'flex';
    renderChatMessages(sessionData);

    if (chatSessionTitle) chatSessionTitle.textContent = sessionData.title || '대화';
    if (deleteSessionBtn) deleteSessionBtn.style.display = 'inline-block';
    if (chatInput) {
        chatInput.disabled = false;
        chatInput.placeholder = "AI 러닝메이트에게 질문하기..."
    }
    if (chatSendBtn) chatSendBtn.disabled = false;
    chatInput.focus();
}

function handleNewChat() { 
    currentSessionId = null; 
    Object.values(activeTimers).forEach(timers => timers.forEach(clearInterval));
    renderSidebarContent();

    if (chatMessages) {
        chatMessages.querySelectorAll('.chat-message, .ai-response-container, .reasoning-block').forEach(el => el.remove());
        chatMessages.style.display = 'flex';
    }

    if (chatWelcomeMessage) {
        chatWelcomeMessage.style.display = 'flex';
        const p = chatWelcomeMessage.querySelector('p');
        if (p) p.textContent = "아래 입력창에 질문을 입력하여 대화를 시작해보세요!";
    }
    
    if (chatSessionTitle) chatSessionTitle.textContent = 'AI 러닝메이트'; 
    if (deleteSessionBtn) deleteSessionBtn.style.display = 'none'; 
    if (chatInput) { 
        chatInput.disabled = false;
        chatInput.value = '';
        chatInput.placeholder = "AI 러닝메이트에게 질문하기..."
    } 
    if (chatSendBtn) chatSendBtn.disabled = false; 
}

function setupChatModeSelector() { 
    if (!chatModeSelector) return; 
    chatModeSelector.innerHTML = ''; 
    const modes = [
        { id: 'ailey_coaching', t: '기본 코칭', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M20,16H5.17L4,17.17V4H20V16Z" /></svg>' }, 
        { id: 'deep_learning', t: '심화 학습', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4M12,14A4,4 0 0,1 8,10H10A2,2 0 0,0 12,12A2,2 0 0,0 14,10H16A4,4 0 0,1 12,14M7.5,15.6C8.8,17.2 10.3,18 12,18C13.7,18 15.2,17.2 16.5,15.6C15.2,14.8 13.7,14 12,14C10.3,14 8.8,14.8 7.5,15.6Z" /></svg>' }, 
        { id: 'custom', t: '커스텀', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>' }
    ]; 
    modes.forEach(m => { 
        const b = document.createElement('button'); 
        b.dataset.mode = m.id; 
        b.innerHTML = `${m.i}<span>${m.t}</span>`; 
        if (m.id === selectedMode) b.classList.add('active'); 
        b.addEventListener('click', () => { 
            selectedMode = m.id; 
            chatModeSelector.querySelectorAll('button').forEach(btn => btn.classList.remove('active')); 
            b.classList.add('active'); 
            if (selectedMode === 'custom') openPromptModal();
        }); 
        chatModeSelector.appendChild(b); 
    }); 
}

/* --- Source: src\05_features_notes\300_notes_data.js --- */
/*
--- Ailey & Bailey Canvas ---
File: 300_notes_data.js
Version: 1.0 (Bundled)
Description: Handles all data layer interactions with Firebase Firestore for the Notes App.
*/

// --- Notes Data Listeners (moved from firebase.js) ---
function listenToNotes() { 
    return new Promise(resolve => { 
        if (!notesCollectionRef) return resolve(); 
        if (unsubscribeFromNotes) unsubscribeFromNotes(); 
        unsubscribeFromNotes = notesCollectionRef.onSnapshot(s => { 
            localNotesCache = s.docs.map(d => ({ id: d.id, ...d.data() })); 
            if (document.getElementById('notes-app-panel')?.style.display === 'flex') renderNoteList(); 
            resolve(); 
        }, e => { console.error("노트 수신 오류:", e); resolve(); }); 
    }); 
}

function listenToNoteProjects() {
    return new Promise((resolve) => {
        if (!noteProjectsCollectionRef) return resolve();
        if (unsubscribeFromNoteProjects) unsubscribeFromNoteProjects();
        unsubscribeFromNoteProjects = noteProjectsCollectionRef.onSnapshot(snapshot => {
            const oldCache = [...localNoteProjectsCache];
            localNoteProjectsCache = snapshot.docs.map(doc => ({
                id: doc.id,
                isExpanded: oldCache.find(p => p.id === doc.id)?.isExpanded ?? true, ...doc.data()
            }));
            if (document.getElementById('notes-app-panel')?.style.display === 'flex') renderNoteList();
            if (newlyCreatedNoteProjectId) {
                const newProjectElement = document.querySelector(`.note-project-container[data-project-id="${newlyCreatedNoteProjectId}"]`);
                if (newProjectElement) { startNoteProjectRename(newlyCreatedNoteProjectId); newlyCreatedNoteProjectId = null; }
            }
            resolve();
        }, error => { console.error("Note Project listener error:", error); resolve(); });
    });
}

function listenToTags() {
    return new Promise((resolve) => {
        if (!tagsCollectionRef) return resolve();
        if (unsubscribeFromTags) unsubscribeFromTags();
        unsubscribeFromTags = tagsCollectionRef.onSnapshot(snapshot => {
            localTagsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            resolve();
        }, error => { console.error("Tags listener error:", error); resolve(); });
    });
}

function listenToNoteTemplates() {
    return new Promise((resolve) => {
        if (!noteTemplatesCollectionRef) return resolve();
        if (unsubscribeFromNoteTemplates) unsubscribeFromNoteTemplates();
        unsubscribeFromNoteTemplates = noteTemplatesCollectionRef.onSnapshot(snapshot => {
            noteTemplatesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            resolve();
        }, error => { console.error("Note Templates listener error:", error); resolve(); });
    });
}

// --- Notes Data Management Functions ---
async function addNote(content = '') {
    if (!notesCollectionRef) return null;
    try {
        const activeProject = document.querySelector('.note-project-header.active-drop-target');
        const projectId = activeProject ? activeProject.closest('.note-project-container').dataset.projectId : null;
        
        const ref = await notesCollectionRef.add({
            title: '',
            content: content,
            projectId: projectId,
            isPinned: false,
            tags: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return ref.id;
    } catch (e) {
        console.error("새 메모 추가 실패:", e);
        return null;
    }
}

function deleteNote(noteId) {
    showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => {
        if (notesCollectionRef && noteId) {
            notesCollectionRef.doc(noteId).delete().catch(e => {
                console.error("메모 삭제 실패:", e);
                alert("메모 삭제에 실패했습니다.");
            });
            if (currentNoteId === noteId) {
                switchView('list');
            }
        }
    });
}

async function renameNote(noteId, newTitle) {
    if (!newTitle?.trim() || !noteId || !notesCollectionRef) return;
    try {
        await notesCollectionRef.doc(noteId).update({
            title: newTitle.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error renaming note:", error);
        alert("노트 이름 변경에 실패했습니다.");
    }
}

async function togglePin(noteId) {
    if (!notesCollectionRef) return;
    const note = localNotesCache.find(n => n.id === noteId);
    if (note) {
        try {
            await notesCollectionRef.doc(noteId).update({
                isPinned: !note.isPinned
            });
        } catch (error) {
            console.error("Error toggling pin:", error);
            alert("노트 고정 상태 변경에 실패했습니다.");
        }
    }
}

async function moveNoteToProject(noteId, projectId) {
    if (!notesCollectionRef || !noteId) return;
    const targetProjectId = projectId === "null" ? null : projectId;
    try {
        await notesCollectionRef.doc(noteId).update({
            projectId: targetProjectId,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error moving note:", error);
        alert("노트 이동에 실패했습니다.");
    }
}

async function createNewNoteProject() {
    if (!noteProjectsCollectionRef) return;
    try {
        const newProjectRef = await noteProjectsCollectionRef.add({
            name: getNewNoteProjectDefaultName(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        newlyCreatedNoteProjectId = newProjectRef.id;
    } catch (error) {
        console.error("Error creating new note project:", error);
        alert("새 폴더 생성에 실패했습니다.");
    }
}

async function renameNoteProject(projectId, newName) {
    if (!newName?.trim() || !projectId || !noteProjectsCollectionRef) return;
    try {
        await noteProjectsCollectionRef.doc(projectId).update({
            name: newName.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error renaming note project:", error);
        alert("폴더 이름 변경에 실패했습니다.");
    }
}

async function deleteNoteProject(projectId) {
    const project = localNoteProjectsCache.find(p => p.id === projectId);
    if (!project) return;

    showModal(`폴더 '${project.name}'를 삭제하시겠습니까? 폴더 안의 모든 메모는 '일반 메모'로 이동됩니다.`, async () => {
        try {
            const batch = db.batch();
            localNotesCache.filter(n => n.projectId === projectId).forEach(note => {
                batch.update(notesCollectionRef.doc(note.id), { projectId: null });
            });
            batch.delete(noteProjectsCollectionRef.doc(projectId));
            await batch.commit();
        } catch (error) {
            console.error("Error deleting note project:", error);
            alert("폴더 삭제에 실패했습니다.");
        }
    });
}

/* --- Source: src\05_features_notes\310_notes_editor.js --- */
/*
--- Ailey & Bailey Canvas ---
File: 310_notes_editor.js
Version: 1.0 (Bundled)
Description: Manages the Toast UI Editor instance for the Notes App.
*/

let toastEditorInstance = null;

function openNoteEditor(noteId) {
    const note = localNotesCache.find(n => n.id === noteId);
    if (!note) return;
    
    switchView('editor');

    const editorEl = document.getElementById('toast-editor');
    if (!editorEl) {
        console.error("Toast editor container element not found!");
        return;
    }

    if (toastEditorInstance) {
        toastEditorInstance.destroy();
        toastEditorInstance = null;
    }

    toastEditorInstance = new toastui.Editor({
        el: editorEl,
        initialValue: note.content || '',
        initialEditType: 'wysiwyg',
        previewStyle: 'vertical',
        height: '100%',
        theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light',
        plugins: [toastui.Editor.plugin.codeSyntaxHighlight],
        events: {
            change: debounce(() => {
                updateStatus('입력 중...', true);
                saveNote();
            }, 1500)
        }
    });

    currentNoteId = noteId;
    if(noteTitleInput) noteTitleInput.value = note.title || '';
    if(noteTitleInput) noteTitleInput.focus();
}

function saveNote() {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (!currentNoteId || !notesCollectionRef || !toastEditorInstance) return;

    let titleValue = noteTitleInput.value.trim();
    const contentValue = toastEditorInstance.getMarkdown();

    if (titleValue === '' && contentValue.trim() !== '') {
        titleValue = generateTitleFromContent(contentValue);
    }
    
    if (titleValue === '' && contentValue.trim() === '') {
        titleValue = '무제 노트';
    }

    const dataToUpdate = {
        title: titleValue,
        content: contentValue,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    notesCollectionRef.doc(currentNoteId).update(dataToUpdate)
        .then(() => {
            updateStatus('저장됨 ✓', true);
        })
        .catch(e => {
            console.error("메모 저장 실패:", e);
            updateStatus('저장 실패 ❌', false);
        });
}

function generateTitleFromContent(content) {
    if (!content) return '무제 노트';
    const trimmedContent = content.trim();
    if (trimmedContent === '') {
        return '무제 노트';
    }
    const firstLine = trimmedContent.split('\n')[0].replace(/^[#->\s*]*/, '').trim();
    return firstLine.substring(0, 30) || '무제 노트';
}

/* --- Source: src\05_features_notes\320_notes_ui.js --- */
/*
--- Ailey & Bailey Canvas ---
File: 320_notes_ui.js
Version: 1.0 (Bundled)
Description: Handles all UI rendering logic for the Notes App list view.
*/

function renderNoteList() {
    if (!noteListView) return;

    const actionBarHTML = `
        <div class="action-bar">
            <div class="action-bar-group left">
                <button id="add-new-note-btn-dynamic" class="notes-btn" title="새 메모"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg></button>
                <button id="add-new-note-project-btn-dynamic" class="notes-btn" title="새 폴더"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M13,13H11V10H8V8H11V5H13V8H16V10H13V13Z"/></svg></button>
            </div>
            <div class="action-bar-group center">
                <input type="text" id="search-input-dynamic" class="search-input-notes" placeholder="메모 검색...">
            </div>
            <div class="action-bar-group right">
                <div class="more-options-container">
                    <button id="more-options-btn" class="more-options-btn" title="더 보기"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" /></svg></button>
                    <div id="notes-dropdown-menu" class="dropdown-menu">
                        <button class="dropdown-item" data-action="export-all"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"></path></svg><span>데이터 백업</span></button>
                        <button class="dropdown-item" data-action="import-all"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19.35,10.04C18.67,6.59 15.64,4 12,4C9.11,4 6.6,5.64 5.35,8.04C2.34,8.36 0,10.91 0,14A6,6 0 0,0 6,20H19A5,5 0 0,0 19.35,10.04Z"></path></svg><span>데이터 복원</span></button>
                        <div class="dropdown-separator"></div>
                        <button class="dropdown-item" data-action="system-reset" style="color: #d9534f;"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,4C14.12,4 16.16,4.73 17.89,6.03L16.83,7.09C15.5,6.07 13.83,5.5 12,5.5C8.96,5.5 6.5,7.96 6.5,11H8.5C8.5,9.07 10.07,7.5 12,7.5C12.86,7.5 13.65,7.81 14.29,8.34L13.23,9.4L17.5,10.5L16.4,6.23L15.34,7.29C14.37,6.46 13.23,6 12,6C9.24,6 7,8.24 7,11V11.5H5V11C5,7.13 8.13,4 12,4M12,18C9.88,18 7.84,17.27 6.11,15.97L7.17,14.91C8.5,15.93 10.17,16.5 12,16.5C15.04,16.5 17.5,14.04 17.5,11H15.5C15.5,12.93 13.93,14.5 12,14.5C11.14,14.5 10.35,14.19 9.71,13.66L10.77,12.6L6.5,11.5L7.6,15.77L8.66,14.71C9.63,15.54 10.77,16 12,16C14.76,16 17,13.76 17,11V10.5H19V11C19,14.87 15.87,18 12,18Z" /></svg><span>시스템 초기화</span></button>
                    </div>
                </div>
            </div>
        </div>
    `;
    const notesListContainerHTML = `<div id="notes-list"></div>`;
    noteListView.innerHTML = actionBarHTML + notesListContainerHTML;

    const searchInput = document.getElementById('search-input-dynamic');
    const term = searchInput.value.toLowerCase();
    const filteredNotes = localNotesCache.filter(n => term ? ((n.title||'').toLowerCase().includes(term) || (n.content||'').toLowerCase().includes(term)) : true);

    const notesListContainer = document.getElementById('notes-list');
    const fragment = document.createDocumentFragment();

    const pinnedNotes = filteredNotes.filter(n => n.isPinned);
    const unpinnedNotes = filteredNotes.filter(n => !n.isPinned);

    if (pinnedNotes.length > 0) {
        const pinnedHeader = document.createElement('div');
        pinnedHeader.className = 'note-group-header';
        pinnedHeader.textContent = '📌 고정된 메모';
        fragment.appendChild(pinnedHeader);
        pinnedNotes
            .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0))
            .forEach(note => fragment.appendChild(createNoteItem(note)));
    }

    localNoteProjectsCache
        .sort((a,b) => a.name.localeCompare(b.name, 'ko'))
        .forEach(project => {
            const notesInProject = unpinnedNotes.filter(n => n.projectId === project.id);
            if (term && !project.name.toLowerCase().includes(term) && notesInProject.length === 0) return;

            const projectContainer = document.createElement('div');
            projectContainer.className = 'note-project-container';
            projectContainer.dataset.projectId = project.id;
            projectContainer.innerHTML = `
                <div class="note-project-header">
                    <span class="note-project-toggle-icon ${project.isExpanded !== false ? 'expanded' : ''}"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" /></svg></span>
                    <span class="note-project-icon"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2Z" /></svg></span>
                    <span class="note-project-title">${project.name}</span>
                    <span class="note-count">(${localNotesCache.filter(n => n.projectId === project.id).length})</span>
                </div>
                <div class="notes-in-project ${project.isExpanded !== false ? 'expanded' : ''}"></div>
            `;
            const notesContainer = projectContainer.querySelector('.notes-in-project');
            notesInProject
                .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0))
                .forEach(note => notesContainer.appendChild(createNoteItem(note)));
            fragment.appendChild(projectContainer);
        });

    const unassignedNotes = unpinnedNotes.filter(n => !n.projectId);
    if (unassignedNotes.length > 0) {
        const generalHeader = document.createElement('div');
        generalHeader.className = 'note-group-header';
        generalHeader.textContent = '일반 메모';
        fragment.appendChild(generalHeader);
        unassignedNotes
            .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0))
            .forEach(note => fragment.appendChild(createNoteItem(note)));
    }

    if (fragment.children.length === 0 && term) {
        notesListContainer.innerHTML = '<div>검색 결과가 없습니다.</div>';
    } else if (fragment.children.length === 0) {
        notesListContainer.innerHTML = '<div>표시할 메모가 없습니다.</div>';
    } else {
        notesListContainer.appendChild(fragment);
    }
}

function createNoteItem(noteData) {
    const item = document.createElement('div');
    item.className = 'note-item';
    item.dataset.id = noteData.id;
    item.draggable = true;
    if (noteData.isPinned) item.classList.add('pinned');

    item.innerHTML = `
        <div class="note-item-content">
            <div class="note-item-title">${noteData.title || '무제 노트'}</div>
            <div class="note-item-date">${noteData.updatedAt?.toDate().toLocaleString('ko-KR',{dateStyle:'short',timeStyle:'short'})||'날짜 없음'}</div>
        </div>
    `;
    return item;
}

function showContextMenu(target, event) {
    event.preventDefault();
    removeContextMenu();

    const noteItem = target.closest('.note-item');
    const projectHeader = target.closest('.note-project-header');
    
    let menu;
    if (noteItem) {
        menu = createNoteContextMenu(noteItem.dataset.id);
    } else if (projectHeader) {
        menu = createProjectContextMenu(projectHeader.closest('.note-project-container').dataset.projectId);
    } else {
        return;
    }

    document.body.appendChild(menu);
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const bodyWidth = document.body.clientWidth;
    const bodyHeight = document.body.clientHeight;
    menu.style.left = `${event.clientX + menuWidth > bodyWidth ? event.clientX - menuWidth : event.clientX}px`;
    menu.style.top = `${event.clientY + menuHeight > bodyHeight ? event.clientY - menuHeight : event.clientY}px`;
    menu.style.display = 'block';
    currentOpenContextMenu = menu;
}

function createNoteContextMenu(noteId) {
    const note = localNotesCache.find(n => n.id === noteId);
    if (!note) return;

    const menu = document.createElement('div');
    menu.className = 'note-context-menu';

    let moveToSubMenuHTML = localNoteProjectsCache
        .sort((a,b) => a.name.localeCompare(b.name, 'ko'))
        .map(p => `<button class="context-menu-item" data-action="move-to" data-project-id="${p.id}" ${note.projectId === p.id ? 'disabled' : ''}><span class="icon">📁</span><span>${p.name}</span></button>`).join('');

    if (note.projectId) {
        moveToSubMenuHTML = `<button class="context-menu-item" data-action="move-to" data-project-id="null"><span class="icon">⏏️</span><span>[일반 메모로 이동]</span></button><div class="context-menu-separator"></div>${moveToSubMenuHTML}`;
    }

    menu.innerHTML = `
        <button class="context-menu-item" data-action="rename"><span class="icon">✏️</span><span>이름 변경</span></button>
        <button class="context-menu-item" data-action="pin"><span class="icon">${note.isPinned ? '📌' : '📌'}</span><span>${note.isPinned ? '고정 해제' : '고정하기'}</span></button>
        <div class="context-submenu-container">
            <button class="context-menu-item"><span class="icon">📂</span><span>폴더로 이동</span><span class="submenu-arrow">▶</span></button>
            <div class="context-submenu">${moveToSubMenuHTML}</div>
        </div>
        <div class="context-menu-separator"></div>
        <button class="context-menu-item" data-action="delete" style="color: #d9534f;"><span class="icon">🗑️</span><span>삭제</span></button>
        <div class="context-menu-separator"></div>
        <div class="context-meta-info">수정: ${note.updatedAt?.toDate().toLocaleDateString('ko-KR') || 'N/A'}</div>
    `;
    
    return menu;
}

function createProjectContextMenu(projectId) {
    const project = localNoteProjectsCache.find(p => p.id === projectId);
    if (!project) return;

    const menu = document.createElement('div');
    menu.className = 'note-context-menu';
    menu.innerHTML = `
        <button class="context-menu-item" data-action="rename"><span class="icon">✏️</span><span>이름 변경</span></button>
        <div class="context-menu-separator"></div>
        <button class="context-menu-item" data-action="delete" style="color: #d9534f;"><span class="icon">🗑️</span><span>삭제</span></button>
    `;
    
    return menu;
}

/* --- Source: src\05_features_notes\330_notes_utils.js --- */
/*
--- Ailey & Bailey Canvas ---
File: 330_notes_utils.js
Version: 1.0 (Bundled)
Description: Provides utility functions for the Notes App, such as data backup and restoration.
*/

function exportAllData() {
    const allCaches = [localNotesCache, localNoteProjectsCache, localChatSessionsCache, localProjectsCache];
    if (allCaches.every(cache => cache.length === 0)) { 
        showModal("백업할 데이터가 없습니다.", () => {}); 
        return; 
    }

    const processTimestamp = (item) => { 
        const newItem = { ...item }; 
        if (newItem.createdAt?.toDate) newItem.createdAt = newItem.createdAt.toDate().toISOString(); 
        if (newItem.updatedAt?.toDate) newItem.updatedAt = newItem.updatedAt.toDate().toISOString(); 
        
        if (Array.isArray(newItem.messages)) { 
            newItem.messages = newItem.messages.map(msg => { 
                const newMsg = { ...msg }; 
                if (newMsg.timestamp?.toDate) newMsg.timestamp = newMsg.timestamp.toDate().toISOString(); 
                return newMsg; 
            }); 
        } 
        return newItem; 
    };

    const dataToExport = { 
        backupVersion: '4.0',
        backupDate: new Date().toISOString(), 
        notes: localNotesCache.map(processTimestamp), 
        noteProjects: localNoteProjectsCache.map(processTimestamp),
        chatSessions: localChatSessionsCache.map(processTimestamp), 
        projects: localProjectsCache.map(processTimestamp) 
    };

    const str = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([str], { type: 'application/json' }); 
    const url = URL.createObjectURL(blob); 
    
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `ailey-canvas-backup-${new Date().toISOString().slice(0, 10)}.json`; 
    document.body.appendChild(a);
    a.click(); 
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function handleRestoreClick() { 
    if (fileImporter) fileImporter.click(); 
}

async function importAllData(event) {
    const file = event.target.files[0]; 
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            const supportedVersions = ['2.0', '3.0', '4.0'];
            if (!data.backupVersion || !supportedVersions.includes(data.backupVersion)) { 
                throw new Error(`호환되지 않는 백업 파일 버전입니다. (${supportedVersions.join(', ')} 지원)`); 
            }

            const message = `파일(${data.backupVersion}v)에서 채팅 폴더 ${data.projects?.length||0}개, 채팅 ${data.chatSessions?.length||0}개, 메모 폴더 ${data.noteProjects?.length||0}개, 메모 ${data.notes?.length||0}개를 발견했습니다. 현재 데이터를 덮어씁니다. 계속하시겠습니까?`;
            
            showModal(message, async () => {
                try {
                    updateStatus('복원 중...', true);
                    const batch = db.batch();
                    const toFirestoreTimestamp = ts => ts ? firebase.firestore.Timestamp.fromDate(new Date(ts)) : firebase.firestore.FieldValue.serverTimestamp();
                    
                    (data.notes || []).forEach(note => { const { id, ...dataToWrite } = note; dataToWrite.createdAt = toFirestoreTimestamp(note.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(note.updatedAt); batch.set(notesCollectionRef.doc(id), dataToWrite); });
                    (data.noteProjects || []).forEach(project => { const { id, ...dataToWrite } = project; dataToWrite.createdAt = toFirestoreTimestamp(project.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(project.updatedAt); batch.set(noteProjectsCollectionRef.doc(id), dataToWrite); });
                    (data.chatSessions || []).forEach(session => { const { id, ...dataToWrite } = session; dataToWrite.createdAt = toFirestoreTimestamp(session.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(session.updatedAt); if(dataToWrite.messages) dataToWrite.messages.forEach(m=>m.timestamp=toFirestoreTimestamp(m.timestamp)); batch.set(chatSessionsCollectionRef.doc(id), dataToWrite); });
                    (data.projects || []).forEach(project => { const { id, ...dataToWrite } = project; dataToWrite.createdAt = toFirestoreTimestamp(project.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(project.updatedAt); batch.set(projectsCollectionRef.doc(id), dataToWrite); });
                    
                    await batch.commit();
                    updateStatus('복원 완료 ✓', true);
                    showModal("데이터 복원이 완료되었습니다. 페이지를 새로고침합니다.", () => location.reload());
                } catch (error) { 
                    console.error("데이터 복원 실패:", error); 
                    updateStatus('복원 실패 ❌', false); 
                    showModal(`데이터 복원 중 오류: ${error.message}`, () => {}); 
                } 
            });
        } catch (error) { 
            console.error("File parsing error:", error); 
            showModal(`파일 읽기 오류: ${error.message}`, () => {}); 
        } finally { 
            event.target.value = null;
        }
    };
    reader.readAsText(file);
}

async function handleSystemReset() {
    const message = "정말로 이 캔버스의 모든 데이터를 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.";
    showModal(message, async () => {
        if (!db || !currentUser) { 
            alert("초기화 실패: DB 연결을 확인해주세요."); 
            return; 
        }
        updateStatus("시스템 초기화 중...", true);
        
        const collectionsToDelete = [
            notesCollectionRef, noteProjectsCollectionRef, chatSessionsCollectionRef,
            projectsCollectionRef, tagsCollectionRef, noteTemplatesCollectionRef
        ];

        try {
            const batch = db.batch();
            for (const ref of collectionsToDelete) {
                if (ref) {
                    const snapshot = await ref.get();
                    snapshot.docs.forEach(doc => batch.delete(doc.ref));
                }
            }
            await batch.commit();
            
            localStorage.clear();
            alert("✅ 모든 데이터가 성공적으로 삭제되었습니다. 페이지를 새로고침하여 시스템을 다시 시작합니다.");
            location.reload();
        } catch (error) { 
            console.error("❌ 시스템 초기화 실패:", error); 
            alert(`시스템 초기화 중 오류가 발생했습니다: ${error.message}`); 
            updateStatus("초기화 실패 ❌", false); 
        }
    });
}

/* --- Source: src\05_features_notes\340_notes_app.js --- */
/*

--- Ailey & Bailey Canvas ---

File: 340_notes_app.js

Version: 1.1 (Refactored)

Description: Main controller for the Notes App, handling view switching and initialization.

*/



const notesApp = {

    init: function() {

        this.attachEventListeners();

        stateManager.subscribe(renderNoteList);

        console.log("Notes App Initialized");

    },



    attachEventListeners: function() {

        if (notesAppToggleBtn) {

            notesAppToggleBtn.addEventListener('click', () => { 

                togglePanel(notesAppPanel);

                if (notesAppPanel.style.display === 'flex') {

                    ensureNotePanelHeader();

                    renderNoteList();

                }

            });

        }

        

        if (noteListView) {

            noteListView.addEventListener('click', e => {

                

            });

            noteListView.addEventListener('contextmenu', e => showContextMenu(e.target, e));

            const debouncedRender = debounce(renderNoteList, 300);

            noteListView.addEventListener('input', e => {

                if (e.target.id === 'search-input-dynamic') {

                    debouncedRender();

                }

            });

            

        }

        

        if (fileImporter) fileImporter.addEventListener('change', importAllData);

        if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));

        const handleNoteTitleEdit = debounce(() => saveNote(), 1500);

        if (noteTitleInput) noteTitleInput.addEventListener('input', () => { updateStatus('입력 중...', true); handleNoteTitleEdit(); });

    }

};

function ensureNotePanelHeader() {
    if (!notesAppPanel) return;
    let header = notesAppPanel.querySelector('.panel-header');
    if (!header) {
        header = document.createElement('div');
        header.className = 'panel-header';
        header.innerHTML = `
            <span>🗒️ 지식 발전소</span>
            <button class="close-btn" title="패널 닫기"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg></button>
        `;
        header.querySelector('.close-btn').addEventListener('click', () => togglePanel(notesAppPanel, false));
        notesAppPanel.prepend(header);
        makePanelDraggable(notesAppPanel);
    }
}

function switchView(view) {
    if (view === 'editor') {
        noteListView?.classList.remove('active');
        noteEditorView?.classList.add('active');
    } else {
        if (noteTitleInput && noteTitleInput.value.trim() === '' && currentNoteId && toastEditorInstance) {
            const content = toastEditorInstance.getMarkdown();
            const newTitle = generateTitleFromContent(content);
            if (newTitle && newTitle !== '무제 노트') {
                notesCollectionRef.doc(currentNoteId).update({ title: newTitle });
            }
        }
        
        if (toastEditorInstance) {
            toastEditorInstance.destroy();
            toastEditorInstance = null;
        }

        noteEditorView?.classList.remove('active');
        noteListView?.classList.add('active');
        currentNoteId = null;
    }
}

function getNewNoteProjectDefaultName() {
    const baseName = "새 폴더";
    let i = 1;
    let newName = baseName;
    const existingNames = new Set(localNoteProjectsCache.map(p => p.name));
    while (existingNames.has(newName)) {
        newName = `${baseName} ${++i}`;
    }
    return newName;
}

function toggleNoteProjectExpansion(projectId) {
    const project = localNoteProjectsCache.find(p => p.id === projectId);
    if (project) {
        project.isExpanded = !project.isExpanded;
        renderNoteList();
    }
}

function startNoteProjectRename(projectId) {
    const titleSpan = document.querySelector(`.note-project-container[data-project-id="${projectId}"] .note-project-title`);
    if (!titleSpan) return;
    const originalTitle = titleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'note-project-title-input';
    input.value = originalTitle;
    titleSpan.replaceWith(input);
    input.focus();
    input.select();
    const finish = () => {
        const newName = input.value.trim();
        if (newName && newName !== originalTitle) {
            renameNoteProject(projectId, newName);
        } else {
            renderNoteList();
        }
        input.removeEventListener('blur', finish);
        input.removeEventListener('keydown', onKeydown);
    };
    const onKeydown = (e) => {
        if (e.key === 'Enter') input.blur();
        else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); }
    };
    input.addEventListener('blur', finish);
    input.addEventListener('keydown', onKeydown);
}

function startNoteRename(noteId) {
    const titleSpan = document.querySelector(`.note-item[data-id="${noteId}"] .note-item-title`);
    if (!titleSpan) return;
    const originalTitle = titleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'note-item-title-input';
    input.value = originalTitle;
    titleSpan.replaceWith(input);
    input.focus();
    input.select();
    const finish = () => {
        const newName = input.value.trim();
        if (newName && newName !== originalTitle) {
            renameNote(noteId, newName);
        } else {
            renderNoteList();
        }
        input.removeEventListener('blur', finish);
        input.removeEventListener('keydown', onKeydown);
    };
    const onKeydown = (e) => {
        if (e.key === 'Enter') input.blur();
        else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); }
    };
    input.addEventListener('blur', finish);
    input.addEventListener('keydown', onKeydown);
}

async function handleAddNewNote() {
    const newNoteId = await addNote();
    if (newNoteId) {
        openNoteEditor(newNoteId);
    }
}

