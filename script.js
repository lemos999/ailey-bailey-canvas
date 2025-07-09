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
            sessionRef = await chatSessionsCollectionRef.add(newSession);
            currentSessionId = sessionRef.id;
        } else {
            sessionRef = chatSessionsCollectionRef.doc(currentSessionId);
            const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId);
            currentMessages = [...(currentSessionData.messages || []), userMessage, loadingMessage];
            // Render immediately with loading state
            renderChatMessages({ messages: currentMessages });
            
            await sessionRef.update({
                messages: firebase.firestore.FieldValue.arrayUnion(userMessage),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        const startTime = performance.now();
        try {
            let aiRes, usageData;
            // The API call logic remains the same
             const historyForApi = isNewSession ? [userMessage] : localChatSessionsCache.find(s => s.id === currentSessionId)?.messages || [userMessage];

            if (userApiSettings.provider && userApiSettings.apiKey && userApiSettings.selectedModel) {
                const requestDetails = buildApiRequest(userApiSettings.provider, userApiSettings.selectedModel, historyForApi, userApiSettings.maxOutputTokens);
                const res = await fetch(requestDetails.url, requestDetails.options);
                if (!res.ok) { const errorBody = await res.text(); throw new Error(`API Error ${res.status}: ${errorBody}`); }
                const result = await res.json();
                const parsed = parseApiResponse(userApiSettings.provider, result);
                aiRes = parsed.content;
                usageData = parsed.usage;
                if (usageData) { userApiSettings.tokenUsage.prompt += usageData.prompt; userApiSettings.tokenUsage.completion += usageData.completion; saveApiSettings(false); }
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

            // The listener will pick up the change and re-render automatically.

        } catch (e) {
            console.error("Chat send error:", e);
            const errorMessage = { role: 'ai', content: `API 오류가 발생했습니다: ${e.message}`, timestamp: new Date() };
            await sessionRef.update({ 
                messages: firebase.firestore.FieldValue.arrayUnion(errorMessage)
            });
        } finally {
            chatInput.disabled = false;
            chatSendBtn.disabled = false;
            chatInput.focus();
            if (isNewSession) {
                renderSidebarContent();
            }
        }
    }
    
    function buildApiRequest(provider, model, messages, maxTokens) {
        const history = messages.map(msg => ({
            role: msg.role === 'ai' ? 'assistant' : 'user',
            content: msg.content
        }));

        if (provider === 'openai') {
            return { url: 'https://api.openai.com/v1/chat/completions', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userApiSettings.apiKey}` }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) } };
        } else if (provider === 'anthropic') {
             return { url: 'https://api.anthropic.com/v1/messages', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': userApiSettings.apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) } };
        } else if (provider === 'google_paid') {
            const googleHistory = messages.map(msg => ({ role: msg.role === 'ai' ? 'model' : 'user', parts: [{ text: msg.content }] }));
            return { url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${userApiSettings.apiKey}`, options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: googleHistory, generationConfig: { maxOutputTokens: Number(maxTokens) || 2048 } }) } };
        }
        throw new Error(`Unsupported provider: ${provider}`);
    }

    function parseApiResponse(provider, result) {
        try {
            if (provider === 'openai') { return { content: result.choices[0].message.content, usage: { prompt: result.usage.prompt_tokens, completion: result.usage.completion_tokens } }; }
            else if (provider === 'anthropic') { return { content: result.content[0].text, usage: { prompt: result.usage.input_tokens, completion: result.usage.output_tokens } }; }
            else if (provider === 'google_paid') { return { content: result.candidates[0].content.parts[0].text, usage: null }; }
        } catch (error) {
            console.error(`Error parsing ${provider} response:`, error, result);
            return { content: 'API 응답을 파싱하는 중 오류가 발생했습니다.', usage: null };
        }
        return { content: '알 수 없는 제공사입니다.', usage: null };
    }
    
    // --- [REFINED & FIXED] RENDER CHAT with STATE-BASED REASONING UI ---
    function renderChatMessages(sessionData) {
        if (!chatMessages || !sessionData) return;
        
        // Use the messages from the provided session data. If it's a temporary render (like for loading), it will have a 'status' property.
        const messages = sessionData.messages || [];
        chatMessages.innerHTML = '';

        messages.forEach((msg, index) => {
            if (msg.role === 'user') {
                const d = document.createElement('div');
                d.className = `chat-message user`;
                d.textContent = msg.content;
                chatMessages.appendChild(d);

            } else if (msg.role === 'ai') {
                // [NEW] Handle the loading state explicitly
                if (msg.status === 'loading') {
                    const loadingBlock = document.createElement('div');
                    loadingBlock.className = 'reasoning-block loading';
                    loadingBlock.id = msg.id; // Assign the temporary ID
                    loadingBlock.innerHTML = `
                        <div class="reasoning-header">
                            <span class="toggle-icon">▶</span>
                            <span class="reasoning-summary blinking-cursor">AI가 생각하는 중...</span>
                        </div>
                    `;
                    chatMessages.appendChild(loadingBlock);
                    return; // Skip to the next message
                }

                const aiContainer = document.createElement('div');
                aiContainer.className = 'ai-response-container';

                const content = msg.content;
                const reasoningRegex = /\[REASONING_START\]([\s\S]*?)\[REASONING_END\]/;
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
                        finalAnswerDiv.innerHTML = finalAnswer.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                        aiContainer.appendChild(finalAnswerDiv);
                    }
                } else {
                    const d = document.createElement('div');
                    d.className = 'chat-message ai';
                    d.innerHTML = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
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

                chatMessages.appendChild(aiContainer);
            }
        });

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // [MODIFIED] Helper functions for dynamic reasoning UI
    function clearTimers(blockId) {
        if (activeTimers[blockId]) {
            activeTimers[blockId].forEach(clearInterval);
            delete activeTimers[blockId];
        }
    }
    
    function startSummaryAnimation(blockElement, reasoningSteps) {
        const blockId = blockElement.id;
        clearTimers(blockId);
        activeTimers[blockId] = [];

        const summaryElement = blockElement.querySelector('.reasoning-summary');
        if (!summaryElement || !reasoningSteps || reasoningSteps.length === 0) return;

        let stepIndex = 0;
        const cycleSummary = () => {
            if (!reasoningSteps[stepIndex] || !reasoningSteps[stepIndex].summary) return;
            const summaryText = reasoningSteps[stepIndex].summary;
            typewriterEffect(summaryElement, summaryText, () => {
                const waitTimer = setTimeout(() => {
                    summaryElement.style.opacity = '0';
                    const fadeTimer = setTimeout(() => {
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
        const summaryInterval = setInterval(cycleSummary, 4000); 
        if (!activeTimers[blockId]) activeTimers[blockId] = [];
        activeTimers[blockId].push(summaryInterval);
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
        
        const typingInterval = setInterval(() => {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
            } else {
                clearInterval(typingInterval);
                element.classList.remove('blinking-cursor');
                if (onComplete) onComplete();
            }
        }, 30); 

        if (blockId && activeTimers[blockId]) {
            activeTimers[blockId].push(typingInterval);
        } else {
            // Fallback for elements not in a managed block, though this is less ideal.
            // Consider creating a global timer manager if needed.
        }
    }


    function setupChatModeSelector() { if (!chatModeSelector) return; chatModeSelector.innerHTML = ''; const modes = [{ id: 'ailey_coaching', t: '기본 코칭', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M20,16H5.17L4,17.17V4H20V16Z" /></svg>' }, { id: 'deep_learning', t: '심화 학습', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4M12,14A4,4 0 0,1 8,10H10A2,2 0 0,0 12,12A2,2 0 0,0 14,10H16A4,4 0 0,1 12,14M7.5,15.6C8.8,17.2 10.3,18 12,18C13.7,18 15.2,17.2 16.5,15.6C15.2,14.8 13.7,14 12,14C10.3,14 8.8,14.8 7.5,15.6Z" /></svg>' }, { id: 'custom', t: '커스텀', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>' }]; modes.forEach(m => { const b = document.createElement('button'); b.dataset.mode = m.id; b.innerHTML = `${m.i}<span>${m.t}</span>`; if (m.id === selectedMode) b.classList.add('active'); b.addEventListener('click', () => { selectedMode = m.id; chatModeSelector.querySelectorAll('button').forEach(btn => btn.classList.remove('active')); b.classList.add('active'); if (selectedMode === 'custom') openPromptModal(); }); chatModeSelector.appendChild(b); }); }

    // --- System Reset, Backup, Restore ---
    async function handleSystemReset() {
        const message = "정말로 이 캔버스의 모든 프로젝트, 채팅, 메모 기록을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.";
        showModal(message, async () => {
            if (!db || !currentUser) { alert("초기화 실패: DB 연결을 확인해주세요."); return; }
            updateStatus("시스템 초기화 중...", true);
            const batch = db.batch();
            try {
                const notesSnapshot = await notesCollection.get();
                notesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
                const chatsSnapshot = await chatSessionsCollectionRef.get();
                chatsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
                const projectsSnapshot = await projectsCollectionRef.get();
                projectsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                
                localStorage.removeItem('userApiSettings');
    async function handleChatSend() {
        if (!chatInput || chatInput.disabled) return;
        const query = chatInput.value.trim();
        if (!query) return;

        const originalChatInputHeight = chatInput.style.height;
        chatInput.value = '';
        chatInput.style.height = 'auto';
        chatInput.disabled = true;
        chatSendBtn.disabled = true;

        const userMessage = { role: 'user', content: query, timestamp: new Date() };

        // --- Phase 1: Optimistic UI - Immediate Manual Render ---
        if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
        if (chatMessages) chatMessages.style.display = 'flex';
        
        const userMessageDiv = document.createElement('div');
        userMessageDiv.className = 'chat-message user';
        userMessageDiv.textContent = userMessage.content;
        chatMessages.appendChild(userMessageDiv);

        const loadingMessageId = `loading-${Date.now()}`;
        const loadingContainer = document.createElement('div');
        loadingContainer.className = 'ai-response-container';
        loadingContainer.id = loadingMessageId; 
        
        const loadingBlock = document.createElement('div');
        loadingBlock.className = 'reasoning-block loading';
        loadingBlock.innerHTML = `
            <div class="reasoning-header">
                <span class="toggle-icon">▶</span>
                <span class="reasoning-summary blinking-cursor">AI가 생각하는 중...</span>
            </div>
        `;
        loadingContainer.appendChild(loadingBlock);
        chatMessages.appendChild(loadingContainer);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // --- Phase 2: Get or Create Firestore Session ---
        let sessionRef;
        let isNewSession = false;
        let historyForApi;

        if (!currentSessionId) {
            isNewSession = true;
            historyForApi = [userMessage];
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
            sessionRef = await chatSessionsCollectionRef.add(newSession);
            currentSessionId = sessionRef.id;
        } else {
            sessionRef = chatSessionsCollectionRef.doc(currentSessionId);
            const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId);
            historyForApi = [...(currentSessionData?.messages || []), userMessage];
            await sessionRef.update({
                messages: firebase.firestore.FieldValue.arrayUnion(userMessage),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // --- Phase 3: API Call and Staged UI Transition ---
        const startTime = performance.now();
        try {
            let aiRes, usageData;
            if (userApiSettings.provider && userApiSettings.apiKey && userApiSettings.selectedModel) {
                const requestDetails = buildApiRequest(userApiSettings.provider, userApiSettings.selectedModel, historyForApi, userApiSettings.maxOutputTokens);
                const res = await fetch(requestDetails.url, requestDetails.options);
                if (!res.ok) { const errorBody = await res.text(); throw new Error(`API Error ${res.status}: ${errorBody}`); }
                const result = await res.json();
                const parsed = parseApiResponse(userApiSettings.provider, result);
                aiRes = parsed.content;
                usageData = parsed.usage;
                if (usageData) { userApiSettings.tokenUsage.prompt += usageData.prompt; userApiSettings.tokenUsage.completion += usageData.completion; saveApiSettings(false); }
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
            
            // --- Phase 4: Live Transition from Loading to Final Answer ---
            const reasoningRegex = /\[REASONING_START\]([\s\S]*?)\[REASONING_END\]/;
            const match = aiMessage.content.match(reasoningRegex);
            
            loadingContainer.innerHTML = ''; 

            if (match) {
                const reasoningRaw = match[1];
                const finalAnswer = aiMessage.content.replace(reasoningRegex, '').trim();
                const reasoningSteps = reasoningRaw.split('SUMMARY:')
                    .filter(s => s.trim() !== '')
                    .map(step => {
                        const parts = step.split('|||DETAIL:');
                        return { summary: parts[0]?.trim(), detail: parts[1]?.trim() };
                    });
                
                const transformedReasoningBlock = document.createElement('div');
                transformedReasoningBlock.className = 'reasoning-block';
                transformedReasoningBlock.id = `reasoning-${currentSessionId}-${historyForApi.length}`;
                transformedReasoningBlock.dataset.steps = JSON.stringify(reasoningSteps);
                transformedReasoningBlock.innerHTML = `
                    <div class="reasoning-header">
                        <span class="toggle-icon">▶</span>
                        <span>AI의 추론 과정...</span>
                        <span class="reasoning-summary"></span>
                    </div>
                    <div class="reasoning-content"></div>
                `;
                loadingContainer.appendChild(transformedReasoningBlock);
                startSummaryAnimation(transformedReasoningBlock, reasoningSteps);
                
                if (finalAnswer) {
                    const finalAnswerDiv = document.createElement('div');
                    finalAnswerDiv.className = 'chat-message ai';
                    finalAnswerDiv.innerHTML = finalAnswer.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                    loadingContainer.appendChild(finalAnswerDiv);
                }
            } else {
                const finalAnswerDiv = document.createElement('div');
                finalAnswerDiv.className = 'chat-message ai';
                finalAnswerDiv.innerHTML = aiMessage.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                loadingContainer.appendChild(finalAnswerDiv);
            }

            if(aiMessage.duration) {
                const metaDiv = document.createElement('div');
                metaDiv.className = 'ai-response-meta';
                metaDiv.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" /></svg><span>응답 생성: ${aiMessage.duration}초</span>`;
                loadingContainer.appendChild(metaDiv);
            }
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // --- Phase 5: Commit to Firestore ---
            await sessionRef.update({
                messages: firebase.firestore.FieldValue.arrayUnion(aiMessage),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        } catch (e) {
            console.error("Chat send error:", e);
            const errorMessage = { role: 'ai', content: `API 오류가 발생했습니다: ${e.message}`, timestamp: new Date() };
            
            loadingContainer.innerHTML = '';
            const errorDiv = document.createElement('div');
            errorDiv.className = 'chat-message ai';
            errorDiv.style.color = 'var(--incorrect-color)';
            errorDiv.innerHTML = errorMessage.content;
            loadingContainer.appendChild(errorDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            await sessionRef.update({ 
                messages: firebase.firestore.FieldValue.arrayUnion(errorMessage)
            });
        } finally {
            chatInput.disabled = false;
            chatSendBtn.disabled = false;
            chatInput.style.height = originalChatInputHeight;
            chatInput.focus();
            if (isNewSession) {
                setTimeout(() => renderSidebarContent(), 500);
            }
        }
    }
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
