/*
--- Ailey & Bailey Canvas ---
File: script.js
Version: 10.0 (Interactive Reasoning UI Implementation)
Architect: [Username] & System Architect Ailey
Description: Implemented a state-based rendering system for AI responses. Instead of a simple "Thinking..." text, a placeholder reasoning block UI is now displayed immediately. This block transitions seamlessly into the final AI response (either a full reasoning block or a standard message), providing a more intuitive and interactive user experience.
*/

document.addEventListener('DOMContentLoaded', function () {
    // --- 1. Element Declarations ---
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
    const exportNotesBtn = document.getElementById('export-notes-btn');
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

    // -- Backup & Restore UI Elements
    const restoreDataBtn = document.getElementById('restore-data-btn');
    const fileImporter = document.getElementById('file-importer');

    // -- System Reset UI Element
    const systemResetBtn = document.getElementById('system-reset-btn');

    // -- [NEW] API Settings UI Elements (to be created dynamically) --
    let apiSettingsBtn, apiSettingsModalOverlay, apiKeyInput, verifyApiKeyBtn, apiKeyStatus,
        apiModelSelect, maxOutputTokensInput, tokenUsageDisplay, resetTokenUsageBtn,
        apiSettingsSaveBtn, apiSettingsCancelBtn;


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


    // --- 3. Function Definitions ---

    async function initializeFirebase() {
        try {
            const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
            const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
            if (!firebaseConfig) { throw new Error("Firebase config not found."); }
            if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
            
            const auth = firebase.auth();
            db = firebase.firestore();
            
            if (initialAuthToken) {
                await auth.signInWithCustomToken(initialAuthToken).catch(async (err) => {
                   console.warn("Custom token sign-in failed, trying anonymous.", err);
                   await auth.signInAnonymously();
                });
            } else {
                await auth.signInAnonymously();
            }
            
            currentUser = auth.currentUser;

            if (currentUser) {
                const userPath = `artifacts/${appId}/users/${currentUser.uid}`;
                notesCollection = db.collection(`${userPath}/notes`);
                const chatHistoryPath = `${userPath}/chatHistories/${canvasId}`;
                chatSessionsCollectionRef = db.collection(`${chatHistoryPath}/sessions`);
                projectsCollectionRef = db.collection(`${chatHistoryPath}/projects`);

                await Promise.all([
                    listenToNotes(),
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
        if (isPinned) {
            return { key: 0, label: '📌 고정됨' };
        }
    
        if (!timestamp) {
            return { key: 99, label: '날짜 정보 없음' };
        }
    
        const now = new Date();
        const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
        
        now.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);
    
        const diffTime = now.getTime() - date.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
        if (diffDays < 1) return { key: 1, label: '오늘' };
        if (diffDays < 2) return { key: 2, label: '어제' };
        if (diffDays < 7) return { key: 3, label: '지난 7일' };
    
        const nowMonth = now.getMonth();
        const dateMonth = date.getMonth();
        const nowYear = now.getFullYear();
        const dateYear = date.getFullYear();
    
        if (nowYear === dateYear && nowMonth === dateMonth) {
            return { key: 4, label: '이번 달' };
        }
    
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        if (dateYear === lastMonth.getFullYear() && dateMonth === lastMonth.getMonth()) {
             return { key: 5, label: '지난 달' };
        }
    
        return { key: 6 + (nowYear - dateYear) * 12 + (nowMonth - dateMonth), label: `${dateYear}년 ${dateMonth + 1}월` };
    }

    // --- [NEW/REFINED] Project & Session Management ---
    function listenToProjects() {
        return new Promise((resolve) => {
            if (!projectsCollectionRef) return resolve();
            if (unsubscribeFromProjects) unsubscribeFromProjects();
            unsubscribeFromProjects = projectsCollectionRef.onSnapshot(snapshot => {
                const oldCache = [...localProjectsCache];
                localProjectsCache = snapshot.docs.map(doc => ({
                    id: doc.id,
                    isExpanded: oldCache.find(p => p.id === doc.id)?.isExpanded ?? true,
                    ...doc.data()
                }));
                
                renderSidebarContent();

                if (newlyCreatedProjectId) {
                    const newProjectElement = document.querySelector(`.project-container[data-project-id="${newlyCreatedProjectId}"]`);
                    if (newProjectElement) {
                        startProjectRename(newlyCreatedProjectId);
                        newlyCreatedProjectId = null;
                    }
                }

                resolve();
            }, error => {
                console.error("Project listener error:", error);
                resolve();
            });
        });
    }

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

    function toggleProjectExpansion(projectId) {
        const project = localProjectsCache.find(p => p.id === projectId);
        if (project) {
            project.isExpanded = !project.isExpanded;
            renderSidebarContent();
        }
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
            <button data-action="rename">이름 변경</button>
            <button data-action="delete">삭제</button>
        `;
        
        sessionListContainer.appendChild(menu);
        menu.style.display = 'block';
        currentOpenContextMenu = menu;

        menu.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = e.target.dataset.action;
            if (action === 'rename') {
                startProjectRename(projectId);
            } else if (action === 'delete') {
                deleteProject(projectId);
            }
            removeContextMenu();
        });
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
            }
             renderSidebarContent();
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
    
    function renderSidebarContent() {
        if (!sessionListContainer) return;
        const searchTerm = searchSessionsInput.value.toLowerCase();
        sessionListContainer.innerHTML = ''; 
    
        const filteredProjects = localProjectsCache.filter(p => p.name?.toLowerCase().includes(searchTerm));
        const filteredSessions = localChatSessionsCache.filter(s => (s.title || '새 대화').toLowerCase().includes(searchTerm));
    
        const fragment = document.createDocumentFragment();
    
        if (filteredProjects.length > 0 || localProjectsCache.length > 0) {
            const projectGroupHeader = document.createElement('div');
            projectGroupHeader.className = 'session-group-header';
            projectGroupHeader.textContent = '📁 프로젝트';
            fragment.appendChild(projectGroupHeader);
    
            const sortedProjects = [...(searchTerm ? filteredProjects : localProjectsCache)].sort((a, b) => {
                 const timeA = a.updatedAt?.toMillis() || 0;
                 const timeB = b.updatedAt?.toMillis() || 0;
                 return timeB - timeA;
            });
    
            sortedProjects.forEach(project => {
                const sessionsInProject = localChatSessionsCache
                    .filter(s => s.projectId === project.id)
                    .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
                
                if (searchTerm && !project.name.toLowerCase().includes(searchTerm) && sessionsInProject.filter(s => (s.title || '').toLowerCase().includes(searchTerm)).length === 0) {
                    return;
                }

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
                sessionsInProject.forEach(session => {
                    if (!searchTerm || (session.title || '새 대화').toLowerCase().includes(searchTerm)) {
                         sessionsContainer.appendChild(createSessionItem(session));
                    }
                });
        
                projectContainer.appendChild(projectHeader);
                projectContainer.appendChild(sessionsContainer);
                fragment.appendChild(projectContainer);
            });
        }
    
        const unassignedSessions = filteredSessions.filter(s => !s.projectId);
    
        if (unassignedSessions.length > 0) {
            const generalGroupHeader = document.createElement('div');
            generalGroupHeader.className = 'session-group-header';
            generalGroupHeader.textContent = '💬 일반 대화';
            fragment.appendChild(generalGroupHeader);
    
            unassignedSessions.forEach(session => {
                const timestamp = session.updatedAt || session.createdAt;
                session.dateGroup = getRelativeDateGroup(timestamp, session.isPinned);
            });
    
            const groupedSessions = unassignedSessions.reduce((acc, session) => {
                const label = session.dateGroup.label;
                if (!acc[label]) {
                    acc[label] = { key: session.dateGroup.key, items: [] };
                }
                acc[label].items.push(session);
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

    // --- Chat Session Management ---
    function listenToChatSessions() {
        return new Promise((resolve) => {
            if (!chatSessionsCollectionRef) return resolve();
            if (unsubscribeFromChatSessions) unsubscribeFromChatSessions();
            unsubscribeFromChatSessions = chatSessionsCollectionRef.onSnapshot(snapshot => {
                localChatSessionsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderSidebarContent();
                if (currentSessionId) {
                    const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId);
                    if (!currentSessionData) {
                        handleNewChat();
                    } else {
                        // Pass the entire session data to render messages
                        renderChatMessages(currentSessionData);
                    }
                }
                resolve();
            }, error => {
                console.error("Chat session listener error:", error);
                resolve();
            });
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
        if (chatInput) chatInput.disabled = false;
        if (chatSendBtn) chatSendBtn.disabled = false;
        chatInput.focus();
    }
    
    function handleNewChat() { currentSessionId = null; Object.values(activeTimers).forEach(timers => timers.forEach(clearInterval)); renderSidebarContent(); if (chatMessages) { chatMessages.innerHTML = ''; chatMessages.style.display = 'none'; } if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'flex'; if (chatSessionTitle) chatSessionTitle.textContent = 'AI 러닝메이트'; if (deleteSessionBtn) deleteSessionBtn.style.display = 'none'; if (chatInput) { chatInput.disabled = false; chatInput.value = ''; } if (chatSendBtn) chatSendBtn.disabled = false; }
    
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
                }).catch(e => console.error("세션 삭제 실패:", e));
            }
        });
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
        } catch (error) { console.error("Error toggling pin status:", error); }
    }

    // --- [MAJOR REFACTOR & ADDITION] Chat Send Logic with State-Based Rendering ---
    async function handleChatSend() {
        if (!chatInput || chatInput.disabled) return;
        const query = chatInput.value.trim();
        if (!query) return;

        chatInput.value = '';
        chatInput.style.height = 'auto';
        chatInput.disabled = true;
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
            // Render immediately with loading state
            renderChatMessages({ messages: currentMessages });
            
            const newSession = {
                title: query.substring(0, 40) + (query.length > 40 ? '...' : ''),
                messages: [userMessage], // Start with only the user message in Firestore
                mode: selectedMode,
                projectId: newSessionProjectId,
                isPinned: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
// --- [MAJOR REFACTOR & ADDITION] Chat Send Logic with 2-Step API Call ---
    async function handleChatSend() {
        if (!chatInput || chatInput.disabled) return;
        const query = chatInput.value.trim();
        if (!query) return;

        chatInput.value = '';
        chatInput.style.height = 'auto';
        chatInput.disabled = true;
        chatSendBtn.disabled = true;

        const userMessage = { role: 'user', content: query, timestamp: new Date() };
        let sessionRef;
        let isNewSession = false;

        // --- Step 1: Initialize Session and UI ---
        const tempAiMessageId = `ai-response-${Date.now()}`;
        if (!currentSessionId) {
            isNewSession = true;
            const newSession = {
                title: query.substring(0, 40) + (query.length > 40 ? '...' : ''),
                messages: [userMessage],
                mode: selectedMode, // Assuming selectedMode is globally managed
                projectId: document.querySelector('.project-header.active-drop-target')?.closest('.project-container').dataset.projectId || null,
                isPinned: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            sessionRef = await chatSessionsCollectionRef.add(newSession);
            currentSessionId = sessionRef.id;
            renderSidebarContent();
            if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
            if (chatMessages) chatMessages.style.display = 'flex';
        } else {
            sessionRef = chatSessionsCollectionRef.doc(currentSessionId);
            await sessionRef.update({
                messages: firebase.firestore.FieldValue.arrayUnion(userMessage),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Add user message to UI
        const userMessageDiv = document.createElement('div');
        userMessageDiv.className = `chat-message user`;
        userMessageDiv.textContent = userMessage.content;
        chatMessages.appendChild(userMessageDiv);

        // Add live reasoning placeholder to UI
        const liveReasoningPlaceholder = document.createElement('div');
        liveReasoningPlaceholder.id = tempAiMessageId;
        liveReasoningPlaceholder.className = 'live-reasoning-container';
        liveReasoningPlaceholder.innerHTML = `
            <div class="live-reasoning-header">
                <div class="blinking-dot"></div>
                <span>AI가 생각하는 중...</span>
            </div>
        `;
        chatMessages.appendChild(liveReasoningPlaceholder);
        chatMessages.scrollTop = chatMessages.scrollHeight;
// --- [MAJOR REFACTOR & ADDITION] Chat Send Logic with 2-Step API Call ---
    async function handleChatSend() {
        if (!chatInput || chatInput.disabled) return;
        const query = chatInput.value.trim();
        if (!query) return;

        chatInput.value = '';
        chatInput.style.height = 'auto';
        chatInput.disabled = true;
        chatSendBtn.disabled = true;

        const userMessage = { role: 'user', content: query, timestamp: new Date() };
        let sessionRef;
        let isNewSession = false;

        // --- Step 1: Initialize Session and UI ---
        const tempAiMessageId = `ai-response-${Date.now()}`;
        if (!currentSessionId) {
            isNewSession = true;
            const activeProject = document.querySelector('.project-header.active-drop-target');
            const newSessionProjectId = activeProject ? activeProject.closest('.project-container').dataset.projectId : null;

            const newSession = {
                title: query.substring(0, 40) + (query.length > 40 ? '...' : ''),
                messages: [userMessage],
                mode: selectedMode,
                projectId: newSessionProjectId,
                isPinned: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            try {
                sessionRef = await chatSessionsCollectionRef.add(newSession);
                currentSessionId = sessionRef.id;
            } catch (e) {
                console.error("Error creating new session:", e);
                chatInput.disabled = false;
                chatSendBtn.disabled = false;
                return;
            }
        } else {
            sessionRef = chatSessionsCollectionRef.doc(currentSessionId);
            await sessionRef.update({
                messages: firebase.firestore.FieldValue.arrayUnion(userMessage),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Add user message and AI placeholder to UI immediately
        if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
        if (chatMessages) chatMessages.style.display = 'flex';
        
        const userMessageDiv = createMessageDiv(userMessage);
        chatMessages.appendChild(userMessageDiv);

        const liveReasoningPlaceholder = document.createElement('div');
        liveReasoningPlaceholder.id = tempAiMessageId;
        liveReasoningPlaceholder.className = 'live-reasoning-container';
        liveReasoningPlaceholder.innerHTML = `
            <div class="live-reasoning-header">
                <div class="blinking-dot"></div>
                <span>AI가 생각하는 중...</span>
            </div>
        `;
        chatMessages.appendChild(liveReasoningPlaceholder);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // --- Step 2: API Call #1 - Get Reasoning Steps ---
        try {
            const reasoningPrompt = `
                [M-CHAT-STEP1_REASONING]
                The user's query is: "${query}".
                Based on this query, please provide your internal reasoning steps to construct a high-quality answer. The steps should be a logical flow of thought.
                Output ONLY a JSON object with a single key "reasoningSteps" which is an array of strings.
                Example: {"reasoningSteps": ["First, I will analyze the user's core question.", "Then, I will identify key concepts.", "Finally, I will structure the answer clearly."]}
            `;
            
            // This is a simplified representation. In a real scenario, this would use a robust API handling function.
            // For now, we will simulate the API call and response.
            // const res1 = await callApi(reasoningPrompt);
            // const reasoningData = JSON.parse(res1);
            
            // SIMULATED RESPONSE for demonstration
            const reasoningData = {
                reasoningSteps: [
                    "사용자의 질문 의도 파악하기",
                    "핵심 개념 정의 및 연관 정보 수집",
                    "답변의 구조 설계 (서론, 본론, 결론)",
                    "Ailey 코칭 페르소나에 맞춰 문체 다듬기",
                    "최종 답변 생성 및 검토"
                ]
            };
            const reasoningSteps = reasoningData.reasoningSteps || ["답변을 준비하고 있습니다..."];
            
            // --- Step 3: Start Streaming Reasoning & Simultaneously Fire API Call #2 ---
            const finalAnswerPromise = getFinalAnswer(query, reasoningSteps);
            await streamReasoningSteps(tempAiMessageId, reasoningSteps);
            
            // --- Step 4: Process Final Answer ---
            const startTime = performance.now();
            const finalAnswer = await finalAnswerPromise;
            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);

            const aiMessage = { role: 'ai', content: finalAnswer, timestamp: new Date(), duration: duration };

            // Replace the live reasoning placeholder with the final message
            const finalMessageContainer = document.getElementById(tempAiMessageId);
            if (finalMessageContainer) {
                 renderSingleMessage(aiMessage, finalMessageContainer);
            }
            
            await sessionRef.update({
                messages: firebase.firestore.FieldValue.arrayUnion(aiMessage),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        } catch (e) {
            console.error("Chat send error:", e);
            const errorMessage = { role: 'ai', content: `API 오류가 발생했습니다: ${e.message}`, timestamp: new Date() };
             const errorContainer = document.getElementById(tempAiMessageId);
             if (errorContainer) {
                 renderSingleMessage(errorMessage, errorContainer);
             }
            if(sessionRef) {
                await sessionRef.update({ 
                    messages: firebase.firestore.FieldValue.arrayUnion(errorMessage)
                });
            }
        } finally {
            chatInput.disabled = false;
            chatSendBtn.disabled = false;
            chatInput.focus();
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    // [NEW] Helper for API Call #2
    async function getFinalAnswer(query, reasoningSteps) {
        // SIMULATED API call for demonstration
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000)); // Simulate network latency
        
        const synthesisPrompt = `
            [M-CHAT-STEP2_SYNTHESIS]
            The user's original query was: "${query}".
            My thought process to answer this is: ${JSON.stringify(reasoningSteps)}.
            Based on this thought process, please provide the final, user-facing answer in Ailey's persona. The answer should be helpful, clear, and encouraging.
        `;
        
        // SIMULATED RESPONSE
        return `흥미로운 질문이야! 😊 너의 질문인 "${query}"에 대해 나의 생각 과정을 거쳐 답변을 준비해봤어.

        **1단계: 핵심 파악**
        먼저, 네가 궁금해하는 것의 핵심이 무엇인지 파악했어.

        **2단계: 정보 탐색 및 구조화**
        그 다음, 관련 정보를 찾고 어떻게 설명하면 네가 가장 이해하기 쉬울지 고민하며 답변의 뼈대를 만들었지.

        **3단계: 친절한 설명으로 완성**
        마지막으로, Ailey 코칭 스타일로 내용을 다듬어서 최종 답변을 완성했어!

        이런 과정을 거쳐서 나온 답변이야. 궁금한 점이 있다면 언제든지 다시 물어봐줘!`;
    }

    // [NEW] Helper to stream reasoning steps into the UI
    async function streamReasoningSteps(containerId, steps) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const header = container.querySelector('.live-reasoning-header span');
        if(header) header.textContent = '실시간 추론 중';

        for (const step of steps) {
            await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400)); // variable delay
            const stepDiv = document.createElement('div');
            stepDiv.className = 'live-reasoning-step';
            container.appendChild(stepDiv);
            await typewriterEffect(stepDiv, `→ ${step}`);
            if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        // Add a final "generating" message
        await new Promise(resolve => setTimeout(resolve, 300));
        const finalStepDiv = document.createElement('div');
        finalStepDiv.className = 'live-reasoning-step generating';
        container.appendChild(finalStepDiv);
        await typewriterEffect(finalStepDiv, '최종 답변을 생성하는 중...');
        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // [NEW] Helper to create a message div
    function createMessageDiv(msg) {
        const messageContainer = document.createElement('div');
        if (msg.role === 'user') {
            messageContainer.className = `chat-message user`;
            messageContainer.textContent = msg.content;
        } else if (msg.role === 'ai') {
            // This case might be used if we need to render AI messages differently in the future
            // For now, renderSingleMessage handles the container population.
            messageContainer.className = 'ai-response-wrapper'; // Use wrapper class
            renderSingleMessage(msg, messageContainer);
        }
        return messageContainer;
    }

    // --- [REFINED & FIXED] RENDER CHAT with STATE-BASED REASONING UI ---
    function renderChatMessages(sessionData) {
        if (!chatMessages || !sessionData) return;
        
        const messages = sessionData.messages || [];
        // Clear timers associated with the previous session's animations
        Object.values(activeTimers).forEach(clearInterval);
        for (const key in activeTimers) {
            delete activeTimers[key];
        }

        chatMessages.innerHTML = '';

        messages.forEach((msg) => {
             const messageDiv = createMessageDiv(msg);
             chatMessages.appendChild(messageDiv);
        });

        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // [NEW] Renders a single AI message, used for both initial load and live updates
    function renderSingleMessage(msg, container) {
        container.innerHTML = ''; // Clear previous content (like placeholder)
        container.className = 'ai-response-wrapper'; // Ensure correct wrapper class
        
        const aiContainer = document.createElement('div');
        aiContainer.className = 'ai-response-container';
        
        const content = msg.content || '';

        // This regex now only applies to legacy messages if they exist.
        // New messages won't have this format.
        const reasoningRegex = /\[REASONING_START\]([\s\S]*?)\[REASONING_END\]/;
        const match = content.match(reasoningRegex);

        if (match) {
            // Legacy rendering for old messages with embedded reasoning
            const reasoningRaw = match[1];
            const finalAnswer = content.replace(reasoningRegex, '').trim();

            const rBlock = document.createElement('div');
            rBlock.className = 'reasoning-block'; // The old, collapsible block
            rBlock.innerHTML = `
                <div class="reasoning-header">
                    <span class="toggle-icon">▶</span>
                    <span>AI의 추론 과정 (과거 기록)</span>
                </div>
                <div class="reasoning-content"><pre><code>${reasoningRaw.trim()}</code></pre></div>
            `;
            rBlock.addEventListener('click', function() {
                this.classList.toggle('expanded');
                const content = this.querySelector('.reasoning-content');
                content.style.maxHeight = this.classList.contains('expanded') ? content.scrollHeight + "px" : null;
            });

            aiContainer.appendChild(rBlock);

            if (finalAnswer) {
                const finalAnswerDiv = document.createElement('div');
                finalAnswerDiv.className = 'chat-message ai';
                finalAnswerDiv.innerHTML = DOMPurify.sanitize(finalAnswer.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'));
                aiContainer.appendChild(finalAnswerDiv);
            }
        } else {
            // Standard rendering for new messages
            const d = document.createElement('div');
            d.className = 'chat-message ai';
            d.innerHTML = DOMPurify.sanitize(content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'));
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

        container.appendChild(aiContainer);
    }
    
    // [MODIFIED] Independent Typewriter Effect
    function typewriterEffect(element, text) {
        return new Promise(resolve => {
            if (!element || !text) {
                resolve();
                return;
            }
            element.innerHTML = '';
            let i = 0;
            const typingInterval = setInterval(() => {
                if (i < text.length) {
                    element.innerHTML += text.charAt(i);
                    i++;
                } else {
                    clearInterval(typingInterval);
                    resolve();
                }
            }, 20); // Faster typing speed
        });
    }
        resetTokenUsageBtn = document.getElementById('reset-token-usage-btn');
        apiSettingsSaveBtn = document.getElementById('api-settings-save-btn');
        apiSettingsCancelBtn = document.getElementById('api-settings-cancel-btn');
    }

    function openApiSettingsModal() {
        loadApiSettings();
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
            userApiSettings = JSON.parse(savedSettings);
            if (!userApiSettings.tokenUsage) { userApiSettings.tokenUsage = { prompt: 0, completion: 0 }; }
            if (!userApiSettings.availableModels) { userApiSettings.availableModels = []; }
        }
    }

    function saveApiSettings(closeModal = true) {
        const key = apiKeyInput.value.trim();
        if (key) {
            userApiSettings.apiKey = key;
            userApiSettings.selectedModel = apiModelSelect.value;
            userApiSettings.maxOutputTokens = Number(maxOutputTokensInput.value) || 2048;
            if (apiModelSelect && apiModelSelect.options.length > 0 && !apiModelSelect.disabled) {
                 userApiSettings.availableModels = Array.from(apiModelSelect.options).map(opt => opt.value);
            }
        } else {
            userApiSettings = { provider: null, apiKey: '', selectedModel: '', availableModels: [], maxOutputTokens: 2048, tokenUsage: { prompt: 0, completion: 0 } };
        }
        localStorage.setItem('userApiSettings', JSON.stringify(userApiSettings));
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
    
    function updateChatHeaderModelSelector() {
        if (!aiModelSelector) return;
        const DEFAULT_MODELS = [ { value: 'gemini-2.5-flash-preview-04-17', text: '⚡️ Gemini 2.5 Flash (최신)' }, { value: 'gemini-2.0-flash', text: '💡 Gemini 2.0 Flash (안정)' } ];
        aiModelSelector.innerHTML = '';
        if (userApiSettings.provider && userApiSettings.apiKey) {
            const models_to_show = userApiSettings.availableModels || [];
            if(models_to_show.length === 0 && userApiSettings.selectedModel) { models_to_show.push(userApiSettings.selectedModel); }
            models_to_show.forEach(modelId => { const option = document.createElement('option'); option.value = modelId; option.textContent = `[개인] ${modelId}`; aiModelSelector.appendChild(option); });
            aiModelSelector.value = userApiSettings.selectedModel; aiModelSelector.title = `${userApiSettings.provider} 모델을 선택합니다. (개인 키 사용 중)`;
        } else {
            DEFAULT_MODELS.forEach(model => { const option = document.createElement('option'); option.value = model.value; option.textContent = model.text; aiModelSelector.appendChild(option); });
            const savedDefaultModel = localStorage.getItem('selectedAiModel') || defaultModel;
            aiModelSelector.value = savedDefaultModel; aiModelSelector.title = 'AI 모델을 선택합니다.';
        }
    }

    function renderTokenUsage() {
        const { prompt, completion } = userApiSettings.tokenUsage;
        const total = prompt + completion;
        tokenUsageDisplay.innerHTML = `<span>입력: ${prompt.toLocaleString()}</span> | <span>출력: ${completion.toLocaleString()}</span> | <strong>총합: ${total.toLocaleString()}</strong>`;
    }

    function resetTokenUsage() { showModal('누적 토큰 사용량을 정말로 초기화하시겠습니까?', () => { userApiSettings.tokenUsage = { prompt: 0, completion: 0 }; saveApiSettings(false); renderTokenUsage(); }); }

    // --- 4. Global Initialization ---
    function initialize() {
        if (!body || !wrapper) { console.error("Core layout elements not found."); return; }
        updateClock(); setInterval(updateClock, 1000);
        createApiSettingsModal();
        const chatHeader = document.querySelector('#chat-main-view .panel-header > div');
        if (chatHeader) {
            apiSettingsBtn = document.createElement('span'); apiSettingsBtn.id = 'api-settings-btn'; apiSettingsBtn.title = '개인 API 설정';
            apiSettingsBtn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>`;
            chatHeader.appendChild(apiSettingsBtn);
        }
        loadApiSettings();
        updateChatHeaderModelSelector();
        initializeFirebase().then(() => { setupNavigator(); setupChatModeSelector(); initializeTooltips(); makePanelDraggable(chatPanel); makePanelDraggable(notesAppPanel); });

        // Event Listeners
        document.addEventListener('click', (e) => { handleTextSelection(e); if (!e.target.closest('.session-context-menu, .project-context-menu')) { removeContextMenu(); } });
        if (popoverAskAi) popoverAskAi.addEventListener('click', handlePopoverAskAi);
        if (popoverAddNote) popoverAddNote.addEventListener('click', handlePopoverAddNote);
        if (themeToggle) { themeToggle.addEventListener('click', () => { body.classList.toggle('dark-mode'); localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light'); }); if(localStorage.getItem('theme') === 'dark') body.classList.add('dark-mode'); }
        if (tocToggleBtn) tocToggleBtn.addEventListener('click', () => { wrapper.classList.toggle('toc-hidden'); systemInfoWidget?.classList.toggle('tucked'); });
        if (chatToggleBtn) chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));
        if (chatPanel) chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));
        if (notesAppToggleBtn) notesAppToggleBtn.addEventListener('click', () => { togglePanel(notesAppPanel); if(notesAppPanel.style.display === 'flex') renderNoteList(); });
        if (chatForm) chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });
        if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } });
        if (deleteSessionBtn) deleteSessionBtn.addEventListener('click', () => handleDeleteSession(currentSessionId));
        if (newChatBtn) newChatBtn.addEventListener('click', handleNewChat);
        if (newProjectBtn) newProjectBtn.addEventListener('click', createNewProject);
        if (promptSaveBtn) promptSaveBtn.addEventListener('click', saveCustomPrompt);
        if (promptCancelBtn) promptCancelBtn.addEventListener('click', closePromptModal);
        if (startQuizBtn) startQuizBtn.addEventListener('click', startQuiz);
        if (quizSubmitBtn) quizSubmitBtn.addEventListener('click', () => { if (!currentQuizData || !quizResults) return; let score = 0; if (currentQuizData.questions.some((q, i) => !document.querySelector(`input[name="q-${i}"]:checked`))) { quizResults.textContent = "모든 문제에 답해주세요!"; return; } currentQuizData.questions.forEach((q, i) => { if(document.querySelector(`input[name="q-${i}"]:checked`).value === q.a) score++; }); quizResults.textContent = `결과: ${currentQuizData.questions.length} 중 ${score} 정답!`; });
        if(quizModalOverlay) quizModalOverlay.addEventListener('click', e => { if (e.target === quizModalOverlay) quizModalOverlay.style.display = 'none'; });
        if (addNewNoteBtn) addNewNoteBtn.addEventListener('click', () => addNote());
        if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
        if (searchInput) searchInput.addEventListener('input', renderNoteList);
        if (exportNotesBtn) exportNotesBtn.addEventListener('click', exportAllData);
        if (restoreDataBtn) restoreDataBtn.addEventListener('click', handleRestoreClick);
        if (fileImporter) fileImporter.addEventListener('change', importAllData);
        if (systemResetBtn) systemResetBtn.addEventListener('click', handleSystemReset);
        const handleInput = () => { updateStatus('입력 중...', true); if (debounceTimer) clearTimeout(debounceTimer); debounceTimer = setTimeout(saveNote, 1000); };
        if (noteTitleInput) noteTitleInput.addEventListener('input', handleInput);
        if (noteContentTextarea) noteContentTextarea.addEventListener('input', handleInput);
        if (notesList) notesList.addEventListener('click', e => { const i = e.target.closest('.note-item'); if (!i) return; const id = i.dataset.id; if (e.target.closest('.delete-btn')) handleDeleteRequest(id); else if (e.target.closest('.pin-btn')) togglePin(id); else openNoteEditor(id); });
        if (searchSessionsInput) searchSessionsInput.addEventListener('input', renderSidebarContent);
        
        if (aiModelSelector) {
            aiModelSelector.addEventListener('change', () => {
                const selectedValue = aiModelSelector.value;
                if (userApiSettings.provider && userApiSettings.apiKey) {
                    userApiSettings.selectedModel = selectedValue;
                    localStorage.setItem('userApiSettings', JSON.stringify(userApiSettings));
                } else {
                    defaultModel = selectedValue;
                    localStorage.setItem('selectedAiModel', defaultModel);
                }
            });
        }
        
        if (apiSettingsBtn) apiSettingsBtn.addEventListener('click', openApiSettingsModal);
        if (apiSettingsCancelBtn) apiSettingsCancelBtn.addEventListener('click', closeApiSettingsModal);
        if (apiSettingsSaveBtn) apiSettingsSaveBtn.addEventListener('click', () => saveApiSettings(true));
        if (verifyApiKeyBtn) verifyApiKeyBtn.addEventListener('click', handleVerifyApiKey);
        if (resetTokenUsageBtn) resetTokenUsageBtn.addEventListener('click', resetTokenUsage);
        if (apiSettingsModalOverlay) apiSettingsModalOverlay.addEventListener('click', (e) => { if (e.target === apiSettingsModalOverlay) closeApiSettingsModal(); });

        if (sessionListContainer) {
            sessionListContainer.addEventListener('click', (e) => {
                if (!e.target.closest('.project-context-menu')) { removeContextMenu(); }
                const sessionItem = e.target.closest('.session-item');
                if (sessionItem) {
                    const pinButton = e.target.closest('.session-pin-btn');
                    if (pinButton) { e.stopPropagation(); toggleChatPin(sessionItem.dataset.sessionId); }
                    else { selectSession(sessionItem.dataset.sessionId); }
                    return;
                }
                const projectHeader = e.target.closest('.project-header');
                if (projectHeader) {
                    const actionsButton = e.target.closest('.project-actions-btn');
                    const projectId = projectHeader.closest('.project-container').dataset.projectId;
                    if (actionsButton) { e.stopPropagation(); showProjectContextMenu(projectId, actionsButton); }
                    else if (!e.target.closest('input')) { toggleProjectExpansion(projectId); }
                    return;
                }
            });

            sessionListContainer.addEventListener('contextmenu', (e) => {
                const sessionItem = e.target.closest('.session-item');
                if (sessionItem) { e.preventDefault(); removeContextMenu(); showSessionContextMenu(sessionItem.dataset.sessionId, e.clientX, e.clientY); }
            });

            let draggedItem = null;
            sessionListContainer.addEventListener('dragstart', (e) => {
                if (e.target.classList.contains('session-item')) {
                    draggedItem = e.target;
                    setTimeout(() => e.target.classList.add('is-dragging'), 0);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', draggedItem.dataset.sessionId);
                } else { e.preventDefault(); }
            });

            sessionListContainer.addEventListener('dragend', () => {
                if(draggedItem) { draggedItem.classList.remove('is-dragging'); draggedItem = null; }
                document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => { el.classList.remove('drag-over', 'drag-target-area'); });
            });

            sessionListContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                const targetProjectHeader = e.target.closest('.project-header');
                document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => { el.classList.remove('drag-over', 'drag-target-area'); });
                if (!draggedItem) return;
                const sourceSessionId = draggedItem.dataset.sessionId;
                const sourceSession = localChatSessionsCache.find(s => s.id === sourceSessionId);
                if (targetProjectHeader) { 
                    const targetProjectId = targetProjectHeader.closest('.project-container').dataset.projectId;
                    if (sourceSession && sourceSession.projectId !== targetProjectId) { e.dataTransfer.dropEffect = 'move'; targetProjectHeader.classList.add('drag-over'); }
                    else { e.dataTransfer.dropEffect = 'none'; }
                } else { 
                     if (sourceSession && sourceSession.projectId) { e.dataTransfer.dropEffect = 'move'; sessionListContainer.classList.add('drag-target-area'); }
                     else { e.dataTransfer.dropEffect = 'none'; }
                }
            });
            
            sessionListContainer.addEventListener('dragleave', (e) => { if (e.target === sessionListContainer) { sessionListContainer.classList.remove('drag-target-area'); } });

            sessionListContainer.addEventListener('drop', async (e) => {
                e.preventDefault();
                 document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => { el.classList.remove('drag-over', 'drag-target-area'); });
                if (!draggedItem) return;
                const sessionId = e.dataTransfer.getData('text/plain');
                const targetProjectHeader = e.target.closest('.project-header');
                let targetProjectId = null; let shouldUpdate = false;
                const sourceSession = localChatSessionsCache.find(s => s.id === sessionId);
                if (!sourceSession) return;
                if (targetProjectHeader) { targetProjectId = targetProjectHeader.closest('.project-container').dataset.projectId; if (sourceSession.projectId !== targetProjectId) { shouldUpdate = true; } }
                else { if (sourceSession.projectId) { targetProjectId = null; shouldUpdate = true; } }
                if (shouldUpdate) {
                    try {
                        const updates = { projectId: targetProjectId, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
                        await chatSessionsCollectionRef.doc(sessionId).update(updates);
                        if (targetProjectId) { await projectsCollectionRef.doc(targetProjectId).update({ updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); }
                    } catch (error) { console.error("Failed to move session:", error); }
                }
            });
        }
        
        if (formatToolbar) formatToolbar.addEventListener('click', e => { const b = e.target.closest('.format-btn'); if (b) applyFormat(b.dataset.format); });
        if (linkTopicBtn) linkTopicBtn.addEventListener('click', () => { if(!noteContentTextarea) return; const t = document.title || '현재 학습'; noteContentTextarea.value += `\n\n🔗 연관 학습: [${t}]`; saveNote(); });
    
        // [MODIFIED] Event Delegation for Reasoning Blocks
        if (chatMessages) {
            chatMessages.addEventListener('click', (e) => {
                const header = e.target.closest('.reasoning-header');
                if (!header) return;

                const block = header.closest('.reasoning-block');
                if (block.classList.contains('loading')) return; // Do not interact with loading blocks

                const content = block.querySelector('.reasoning-content');
                const blockId = block.id;
                
                clearTimers(blockId);
                block.classList.toggle('expanded');
                content.classList.toggle('expanded');
                
                if (block.classList.contains('expanded')) {
                    const steps = JSON.parse(block.dataset.steps);
                    const fullText = steps.map(s => s.detail).filter(Boolean).join('\n\n');
                    content.innerHTML = '';
                    typewriterEffect(content, fullText);
                } else {
                    content.innerHTML = '';
                    const steps = JSON.parse(block.dataset.steps);
                    startSummaryAnimation(block, steps);
                }
            });
        }
    }

    // --- 5. [NEW] Session Context Menu & Related Functions ---
    function showSessionContextMenu(sessionId, x, y) {
        const session = localChatSessionsCache.find(s => s.id === sessionId);
        if (!session) return;
        removeContextMenu();
        const menu = document.createElement('div');
        menu.className = 'session-context-menu'; 
        let moveToSubMenuHTML = localProjectsCache.map(p => `<button class="context-menu-item" data-project-id="${p.id}" ${session.projectId === p.id ? 'disabled' : ''}>${p.name}</button>`).join('');
        const moveToMenu = `
            <div class="context-submenu-container">
                <button class="context-menu-item" data-action="move-to"><span>프로젝트로 이동</span><span class="submenu-arrow">▶</span></button>
                <div class="context-submenu">
                    <button class="context-menu-item" data-project-id="null" ${!session.projectId ? 'disabled' : ''}>[일반 대화로 이동]</button>
                    <div class="context-menu-separator"></div>
                    ${moveToSubMenuHTML}
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
            <div class="context-menu-item disabled">생성: ${createdAt}</div>
            <div class="context-menu-item disabled">수정: ${updatedAt}</div>
        `;
        document.body.appendChild(menu);
        const menuWidth = menu.offsetWidth; const menuHeight = menu.offsetHeight;
        const bodyWidth = document.body.clientWidth; const bodyHeight = document.body.clientHeight;
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
            removeContextMenu();
        });
    }

    async function moveSessionToProject(sessionId, newProjectId) {
        const session = localChatSessionsCache.find(s => s.id === sessionId);
        if (!session || session.projectId === newProjectId) return;
        try {
            await chatSessionsCollectionRef.doc(sessionId).update({ projectId: newProjectId, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
            if (newProjectId) { await projectsCollectionRef.doc(newProjectId).update({ updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); }
        } catch (error) { console.error("Error moving session:", error); alert("세션 이동에 실패했습니다."); }
    }
    
    function startSessionRename(sessionId) {
        const sessionItem = document.querySelector(`.session-item[data-session-id="${sessionId}"]`);
        if (!sessionItem) return;
        const titleSpan = sessionItem.querySelector('.session-item-title');
        if (!titleSpan) return;
        const originalTitle = titleSpan.textContent;
        const input = document.createElement('input');
        input.type = 'text'; input.className = 'project-title-input'; input.value = originalTitle;
        titleSpan.replaceWith(input);
        input.focus(); input.select();
        const finishEditing = () => {
            const newTitle = input.value.trim();
            if (newTitle && newTitle !== originalTitle) { renameSession(sessionId, newTitle); }
            else { renderSidebarContent(); }
        };
        input.addEventListener('blur', finishEditing);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { input.blur(); }
            else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); }
        });
    }

    async function renameSession(sessionId, newTitle) {
        if (!newTitle || !sessionId) return;
        try { await chatSessionsCollectionRef.doc(sessionId).update({ title: newTitle, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); }
        catch (error) { console.error("Error renaming session:", error); alert("세션 이름 변경에 실패했습니다."); }
    }


    // --- 6. Run Initialization ---
    initialize();
});
