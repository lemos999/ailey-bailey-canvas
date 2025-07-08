/*
--- Ailey & Bailey Canvas ---
File: script.js
Version: 9.1 (Context Menu Implementation)
Architect: [Username] & System Architect Ailey
Description: Fixed the "New Project" button bug. Completely replaced the drag-and-drop logic with a more precise right-click context menu for moving sessions between projects. Implemented all related event listeners and handlers for a seamless user experience.
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
    const sessionContextMenu = document.getElementById('session-context-menu'); // [NEW]

    // -- Chat Session & Project UI Elements --
    const newChatBtn = document.getElementById('new-chat-btn');
    const newProjectBtn = document.getElementById('new-project-btn');
    const sessionListContainer = document.getElementById('session-list-container');
    const chatSessionTitle = document.getElementById('chat-session-title');
    const deleteSessionBtn = document.getElementById('delete-session-btn');
    const chatWelcomeMessage = document.getElementById('chat-welcome-message');
    const searchSessionsInput = document.getElementById('search-sessions-input');

    // -- Backup & Restore UI Elements
    const restoreDataBtn = document.getElementById('restore-data-btn');
    const fileImporter = document.getElementById('file-importer');

    // -- System Reset UI Element
    const systemResetBtn = document.getElementById('system-reset-btn');


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
    let customPrompt = localStorage.getItem('customTutorPrompt') || '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.';
    let currentQuizData = null;


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
    
    // --- [MODIFIED] Project Management ---
    function listenToProjects() {
        return new Promise((resolve) => {
            if (!projectsCollectionRef) return resolve();
            if (unsubscribeFromProjects) unsubscribeFromProjects();
            unsubscribeFromProjects = projectsCollectionRef.orderBy("createdAt", "asc").onSnapshot(snapshot => {
                const hadData = localProjectsCache.length > 0;
                localProjectsCache = snapshot.docs.map(doc => ({
                    id: doc.id,
                    isExpanded: localProjectsCache.find(p => p.id === doc.id)?.isExpanded ?? true,
                    ...doc.data()
                }));
                if(hadData) renderSidebarContent();
                resolve();
            }, error => {
                console.error("Project listener error:", error);
                resolve();
            });
        });
    }
    
    async function createNewProject() {
        const projectName = prompt("새 프로젝트의 이름을 입력하세요:", "새 프로젝트");
        if (projectName && projectName.trim()) {
            try {
                await projectsCollectionRef.add({
                    name: projectName.trim(),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (error) {
                console.error("Error creating new project:", error);
                alert("프로젝트 생성에 실패했습니다.");
            }
        }
    }

    async function renameProject(projectId, currentName) {
        const newName = prompt("프로젝트의 새 이름을 입력하세요:", currentName);
        if (newName && newName.trim() && newName.trim() !== currentName) {
             try {
                await projectsCollectionRef.doc(projectId).update({ name: newName.trim() });
            } catch (error) {
                console.error("Error renaming project:", error);
                alert("프로젝트 이름 변경에 실패했습니다.");
            }
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

    // --- [REWRITTEN] Sidebar Rendering with Projects ---
    function renderSidebarContent() {
        if (!sessionListContainer) return;
        
        const searchTerm = searchSessionsInput.value.toLowerCase();
        
        const filteredSessions = localChatSessionsCache.filter(s => s.title?.toLowerCase().includes(searchTerm));
        const projectsWithFilteredSessions = localProjectsCache.map(p => {
            const sessions = filteredSessions.filter(s => s.projectId === p.id);
            return { ...p, sessions };
        }).filter(p => p.name.toLowerCase().includes(searchTerm) || p.sessions.length > 0);

        const unassignedSessions = filteredSessions.filter(s => !s.projectId);

        sessionListContainer.innerHTML = '';
        
        projectsWithFilteredSessions.forEach(project => {
            const projectContainer = document.createElement('div');
            projectContainer.className = 'project-container';
            projectContainer.dataset.projectId = project.id;
            
            const projectHeader = document.createElement('div');
            projectHeader.className = 'project-header';
            projectHeader.innerHTML = `
                <span class="project-toggle-icon ${project.isExpanded ? 'expanded' : ''}">
                    <svg viewBox="0 0 24 24" width="16" height="16"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" /></svg>
                </span>
                <span class="project-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18"><path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2Z" /></svg>
                </span>
                <span class="project-title">${project.name}</span>
                <button class="project-actions-btn" title="프로젝트 메뉴">
                    <svg viewBox="0 0 24 24" width="18" height="18"><path d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" /></svg>
                </button>
            `;
            
            const sessionsContainer = document.createElement('div');
            sessionsContainer.className = `sessions-in-project ${project.isExpanded ? 'expanded' : ''}`;
            
            project.sessions.sort((a,b) => (b.isPinned - a.isPinned) || (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
            project.sessions.forEach(session => sessionsContainer.appendChild(createSessionItem(session)));

            projectContainer.appendChild(projectHeader);
            projectContainer.appendChild(sessionsContainer);
            sessionListContainer.appendChild(projectContainer);
        });
        
        if (unassignedSessions.length > 0) {
            const groupHeader = document.createElement('div');
            groupHeader.className = 'session-group-header';
            groupHeader.textContent = '일반 대화';
            sessionListContainer.appendChild(groupHeader);
            unassignedSessions.sort((a,b) => (b.isPinned - a.isPinned) || (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
            unassignedSessions.forEach(session => sessionListContainer.appendChild(createSessionItem(session)));
        }
    }

    function createSessionItem(session) {
        const item = document.createElement('div');
        item.className = 'session-item';
        item.dataset.sessionId = session.id;
        if (session.id === currentSessionId) item.classList.add('active');
        
        const pinIconSVG = `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>`;

        item.innerHTML = `
            <div class="session-item-title">${session.title || '새 대화'}</div>
            <button class="session-pin-btn ${session.isPinned ? 'pinned-active' : ''}" title="${session.isPinned ? '고정 해제' : '고정하기'}">
                ${pinIconSVG}
            </button>
        `;
        return item;
    }

    // --- Chat Session Management ---
    function listenToChatSessions() {
        return new Promise((resolve) => {
            if (!chatSessionsCollectionRef) return resolve();
            if (unsubscribeFromChatSessions) unsubscribeFromChatSessions();
            unsubscribeFromChatSessions = chatSessionsCollectionRef.onSnapshot(snapshot => {
                const hadData = localChatSessionsCache.length > 0;
                localChatSessionsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (hadData) {
                    renderSidebarContent();
                    if (currentSessionId) {
                        const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId);
                        if (!currentSessionData) handleNewChat();
                        else renderChatMessages(currentSessionData.messages || []);
                    }
                }
                resolve();
            }, error => {
                console.error("Chat session listener error:", error);
                resolve();
            });
        });
    }

    function selectSession(sessionId) { if (!sessionId) return; const sessionData = localChatSessionsCache.find(s => s.id === sessionId); if (!sessionData) return; currentSessionId = sessionId; renderSidebarContent(); if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none'; if (chatMessages) chatMessages.style.display = 'flex'; renderChatMessages(sessionData.messages || []); if (chatSessionTitle) chatSessionTitle.textContent = sessionData.title || '대화'; if (deleteSessionBtn) deleteSessionBtn.style.display = 'inline-block'; if (chatInput) chatInput.disabled = false; if (chatSendBtn) chatSendBtn.disabled = false; chatInput.focus(); }
    function handleNewChat() { currentSessionId = null; renderSidebarContent(); if (chatMessages) { chatMessages.innerHTML = ''; chatMessages.style.display = 'none'; } if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'flex'; if (chatSessionTitle) chatSessionTitle.textContent = 'AI 러닝메이트'; if (deleteSessionBtn) deleteSessionBtn.style.display = 'none'; if (chatInput) { chatInput.disabled = false; chatInput.value = ''; } if (chatSendBtn) chatSendBtn.disabled = false; }
    function handleDeleteSession(sessionId) { if (!sessionId) return; const sessionToDelete = localChatSessionsCache.find(s => s.id === sessionId); showModal(`'${sessionToDelete?.title || '이 대화'}'를 삭제하시겠습니까?`, () => { if (chatSessionsCollectionRef && sessionId) { chatSessionsCollectionRef.doc(sessionId).delete().then(() => { if(sessionId === currentSessionId) handleNewChat(); }).catch(e => console.error("세션 삭제 실패:", e)); } }); }
    
    async function toggleChatPin(sessionId) {
        if (!chatSessionsCollectionRef || !sessionId) return;
        const sessionRef = chatSessionsCollectionRef.doc(sessionId);
        const currentSession = localChatSessionsCache.find(s => s.id === sessionId);
        if (!currentSession) return;
        try {
            await sessionRef.update({ isPinned: !(currentSession.isPinned || false) });
        } catch (error) { console.error("Error toggling pin status:", error); }
    }
    
    async function moveSessionToProject(sessionId, projectId) {
        if (!sessionId) return;
        try {
            await chatSessionsCollectionRef.doc(sessionId).update({ projectId: projectId });
        } catch (error) {
            console.error("Failed to move session:", error);
            alert("세션 이동에 실패했습니다.");
        }
    }

    async function handleChatSend() { if (!chatInput || chatInput.disabled) return; const query = chatInput.value.trim(); if (!query) return; chatInput.disabled = true; chatSendBtn.disabled = true; const userMessage = { role: 'user', content: query, timestamp: new Date() }; let sessionRef; let messages = []; try { if (!currentSessionId) { if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none'; if (chatMessages) chatMessages.style.display = 'flex'; const newSession = { title: query.substring(0, 40) + (query.length > 40 ? '...' : ''), messages: [userMessage], mode: selectedMode, projectId: null, isPinned: false, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }; sessionRef = await chatSessionsCollectionRef.add(newSession); currentSessionId = sessionRef.id; messages = newSession.messages; } else { sessionRef = chatSessionsCollectionRef.doc(currentSessionId); const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId); messages = [...(currentSessionData.messages || []), userMessage]; await sessionRef.update({ messages: messages, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); } renderChatMessages(messages); const loadingDiv = document.createElement('div'); loadingDiv.className = 'chat-message ai'; loadingDiv.innerHTML = '<div class="loading-indicator">AI가 답변을 생성하고 있습니다...</div>'; if (chatMessages) { chatMessages.appendChild(loadingDiv); chatMessages.scrollTop = chatMessages.scrollHeight; } const apiMessages = messages.map(msg => ({ role: msg.role === 'ai' ? 'model' : 'user', parts: [{ text: msg.content }] })); const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: apiMessages }) }); if (!res.ok) throw new Error(`${res.status}`); const result = await res.json(); let aiRes = "답변 생성 중 오류... 😥"; if (result.candidates?.[0].content.parts[0]) { aiRes = result.candidates[0].content.parts[0].text; } const aiMessage = { role: 'ai', content: aiRes, timestamp: new Date() }; messages.push(aiMessage); await sessionRef.update({ messages: messages, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); } catch (e) { console.error("Chat send error:", e); const errorMessage = { role: 'ai', content: `API 오류가 발생했습니다: ${e.message}`, timestamp: new Date() }; if (sessionRef) { const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId); const errorMessages = [...(currentSessionData?.messages || []), errorMessage]; await sessionRef.update({ messages: errorMessages }); } } finally { chatInput.disabled = false; chatSendBtn.disabled = false; chatInput.value = ''; chatInput.style.height = 'auto'; chatInput.focus(); } }
    function renderChatMessages(messages = []) { if (!chatMessages) return; chatMessages.innerHTML = ''; if (messages.length === 0 && currentSessionId) { } messages.forEach(msg => { const d = document.createElement('div'); d.className = `chat-message ${msg.role}`; let c = msg.content; if (c.startsWith('[PROBLEM_GENERATED]')) { d.classList.add('quiz-problem'); c = c.replace('[PROBLEM_GENERATED]', '').trim(); } else if (c.startsWith('[CORRECT]')) { d.classList.add('quiz-solution', 'correct'); const h = document.createElement('div'); h.className = 'solution-header correct'; h.textContent = '✅ 정답입니다!'; d.appendChild(h); c = c.replace('[CORRECT]', '').trim(); } else if (c.startsWith('[INCORRECT]')) { d.classList.add('quiz-solution', 'incorrect'); const h = document.createElement('div'); h.className = 'solution-header incorrect'; h.textContent = '❌ 오답입니다.'; d.appendChild(h); c = c.replace('[INCORRECT]', '').trim(); } const cd = document.createElement('div'); cd.innerHTML = c.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'); d.appendChild(cd); if (msg.timestamp) { const t = document.createElement('div'); t.className = 'chat-timestamp'; const timestampDate = msg.timestamp.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp); t.textContent = timestampDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }); d.appendChild(t); } if (msg.role === 'ai') { const b = document.createElement('button'); b.className = 'send-to-note-btn'; b.textContent = '메모로 보내기'; b.onclick = e => { addNote(`[AI 러닝메이트] ${cd.textContent}`); e.target.textContent = '✅'; e.target.disabled = true; }; cd.appendChild(b); } chatMessages.appendChild(d); }); chatMessages.scrollTop = chatMessages.scrollHeight; }
    function setupChatModeSelector() { if (!chatModeSelector) return; chatModeSelector.innerHTML = ''; const modes = [{ id: 'ailey_coaching', t: '기본 코칭', i: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M20,16H5.17L4,17.17V4H20V16Z" /></svg>' }, { id: 'deep_learning', t: '심화 학습', i: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4M12,14A4,4 0 0,1 8,10H10A2,2 0 0,0 12,12A2,2 0 0,0 14,10H16A4,4 0 0,1 12,14M7.5,15.6C8.8,17.2 10.3,18 12,18C13.7,18 15.2,17.2 16.5,15.6C15.2,14.8 13.7,14 12,14C10.3,14 8.8,14.8 7.5,15.6Z" /></svg>' }, { id: 'custom', t: '커스텀', i: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>' }]; modes.forEach(m => { const b = document.createElement('button'); b.dataset.mode = m.id; b.innerHTML = `${m.i}<span>${m.t}</span>`; if (m.id === selectedMode) b.classList.add('active'); b.addEventListener('click', () => { selectedMode = m.id; chatModeSelector.querySelectorAll('button').forEach(btn => btn.classList.remove('active')); b.classList.add('active'); if (selectedMode === 'custom') openPromptModal(); }); chatModeSelector.appendChild(b); }); }

    // --- System Reset, Backup, Restore ---
    async function handleSystemReset() { const message = "정말로 이 캔버스의 모든 프로젝트, 채팅, 메모 기록을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 복구할 수 없습니다."; showModal(message, async () => { if (!db || !currentUser) { alert("초기화 실패: DB 연결을 확인해주세요."); return; } updateStatus("시스템 초기화 중...", true); const batch = db.batch(); try { const notesSnapshot = await notesCollection.get(); notesSnapshot.docs.forEach(doc => batch.delete(doc.ref)); const chatsSnapshot = await chatSessionsCollectionRef.get(); chatsSnapshot.docs.forEach(doc => batch.delete(doc.ref)); const projectsSnapshot = await projectsCollectionRef.get(); projectsSnapshot.docs.forEach(doc => batch.delete(doc.ref)); await batch.commit(); alert("✅ 모든 데이터가 성공적으로 삭제되었습니다. 페이지를 새로고침하여 시스템을 다시 시작합니다."); location.reload(); } catch (error) { console.error("❌ 시스템 초기화 실패:", error); alert(`시스템 초기화 중 오류가 발생했습니다: ${error.message}`); updateStatus("초기화 실패 ❌", false); } }); }
    function exportAllData() { if (localNotesCache.length === 0 && localChatSessionsCache.length === 0 && localProjectsCache.length === 0) { showModal("백업할 데이터가 없습니다.", () => {}); return; } const processTimestamp = (item) => { const newItem = { ...item }; if (newItem.createdAt?.toDate) newItem.createdAt = newItem.createdAt.toDate().toISOString(); if (newItem.updatedAt?.toDate) newItem.updatedAt = newItem.updatedAt.toDate().toISOString(); if (Array.isArray(newItem.messages)) { newItem.messages = newItem.messages.map(msg => { const newMsg = { ...msg }; if (newMsg.timestamp?.toDate) newMsg.timestamp = newMsg.timestamp.toDate().toISOString(); return newMsg; }); } return newItem; }; const dataToExport = { backupVersion: '2.0', backupDate: new Date().toISOString(), notes: localNotesCache.map(processTimestamp), chatSessions: localChatSessionsCache.map(processTimestamp), projects: localProjectsCache.map(processTimestamp) }; const str = JSON.stringify(dataToExport, null, 2); const blob = new Blob([str], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `ailey-canvas-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url); }
    function handleRestoreClick() { if (fileImporter) fileImporter.click(); }
    async function importAllData(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function(e) { try { const data = JSON.parse(e.target.result); if (data.backupVersion !== '2.0') { throw new Error("호환되지 않는 백업 파일 버전입니다."); } const message = `파일에서 ${data.projects?.length||0}개의 프로젝트, ${data.chatSessions?.length||0}개의 채팅, ${data.notes?.length||0}개의 메모를 발견했습니다. 현재 데이터를 덮어씁니다. 계속하시겠습니까?`; showModal(message, async () => { try { updateStatus('복원 중...', true); const batch = db.batch(); const toFirestoreTimestamp = ts => ts ? firebase.firestore.Timestamp.fromDate(new Date(ts)) : firebase.firestore.FieldValue.serverTimestamp(); (data.notes || []).forEach(note => { const { id, ...dataToWrite } = note; dataToWrite.createdAt = toFirestoreTimestamp(note.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(note.updatedAt); batch.set(notesCollection.doc(id), dataToWrite); }); (data.chatSessions || []).forEach(session => { const { id, ...dataToWrite } = session; dataToWrite.createdAt = toFirestoreTimestamp(session.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(session.updatedAt); if(dataToWrite.messages) dataToWrite.messages.forEach(m=>m.timestamp=toFirestoreTimestamp(m.timestamp)); batch.set(chatSessionsCollectionRef.doc(id), dataToWrite); }); (data.projects || []).forEach(project => { const { id, ...dataToWrite } = project; dataToWrite.createdAt = toFirestoreTimestamp(project.createdAt); batch.set(projectsCollectionRef.doc(id), dataToWrite); }); await batch.commit(); updateStatus('복원 완료 ✓', true); showModal("데이터 복원이 완료되었습니다. 페이지를 새로고침합니다.", () => location.reload()); } catch (error) { console.error("데이터 복원 실패:", error); updateStatus('복원 실패 ❌', false); showModal(`데이터 복원 중 오류: ${error.message}`, () => {}); } }); } catch (error) { console.error("File parsing error:", error); showModal(`파일 읽기 오류: ${error.message}`, () => {}); } finally { event.target.value = null; } }; reader.readAsText(file); }
    
    // --- Context Menu ---
    function showSessionContextMenu(e) {
        e.preventDefault();
        hideSessionContextMenu();
        const sessionItem = e.target.closest('.session-item');
        if (!sessionItem) return;
        
        const sessionId = sessionItem.dataset.sessionId;
        const session = localChatSessionsCache.find(s => s.id === sessionId);
        if (!session) return;
        
        sessionContextMenu.innerHTML = ''; // Clear previous items

        // Pin/Unpin
        const pinItem = document.createElement('button');
        pinItem.className = 'context-menu-item';
        pinItem.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg> <span>${session.isPinned ? '고정 해제' : '고정하기'}</span>`;
        pinItem.onclick = () => { toggleChatPin(sessionId); hideSessionContextMenu(); };
        sessionContextMenu.appendChild(pinItem);
        
        // Move to Project
        const moveToItem = document.createElement('div');
        moveToItem.className = 'context-menu-item has-submenu';
        moveToItem.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2Z" /></svg> <span>프로젝트로 이동</span>`;
        
        const submenu = document.createElement('div');
        submenu.className = 'submenu';
        
        // Unassigned option
        const unassignedOption = document.createElement('button');
        unassignedOption.className = 'context-menu-item';
        unassignedOption.textContent = '일반 대화 (미지정)';
        unassignedOption.onclick = () => { moveSessionToProject(sessionId, null); hideSessionContextMenu(); };
        submenu.appendChild(unassignedOption);

        // Project list
        localProjectsCache.forEach(project => {
            const projectOption = document.createElement('button');
            projectOption.className = 'context-menu-item';
            projectOption.textContent = project.name;
            projectOption.onclick = () => { moveSessionToProject(sessionId, project.id); hideSessionContextMenu(); };
            submenu.appendChild(projectOption);
        });
        moveToItem.appendChild(submenu);
        sessionContextMenu.appendChild(moveToItem);
        
        // Divider
        const divider = document.createElement('div');
        divider.className = 'context-menu-divider';
        sessionContextMenu.appendChild(divider);
        
        // Delete
        const deleteItem = document.createElement('button');
        deleteItem.className = 'context-menu-item';
        deleteItem.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z" /></svg> <span>삭제하기</span>`;
        deleteItem.onclick = () => { handleDeleteSession(sessionId); hideSessionContextMenu(); };
        sessionContextMenu.appendChild(deleteItem);

        sessionContextMenu.style.display = 'block';
        const { clientX: mouseX, clientY: mouseY } = e;
        const { innerWidth, innerHeight } = window;
        const { offsetWidth: menuWidth, offsetHeight: menuHeight } = sessionContextMenu;
        sessionContextMenu.style.top = `${mouseY + menuHeight > innerHeight ? innerHeight - menuHeight : mouseY}px`;
        sessionContextMenu.style.left = `${mouseX + menuWidth > innerWidth ? innerWidth - menuWidth : mouseX}px`;
    }

    function hideSessionContextMenu() {
        if (sessionContextMenu) sessionContextMenu.style.display = 'none';
    }

    // --- Utilities & Unchanged Functions (Abridged) ---
    function updateClock() { const el = document.getElementById('real-time-clock'); if (el) el.textContent = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
    function setupSystemInfoWidget() { if (!systemInfoWidget || !currentUser) return; const idDisp = document.getElementById('canvas-id-display'); if(idDisp) idDisp.textContent = canvasId.substring(0,8) + '...'; const copyBtn = document.getElementById('copy-canvas-id'); if (copyBtn) copyBtn.addEventListener('click', () => { navigator.clipboard.writeText(canvasId).then(() => { copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>'; setTimeout(() => { copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/></svg>'; }, 1500);});}); const tooltip=document.createElement('div'); tooltip.className='system-tooltip'; tooltip.innerHTML=`<div><strong>Canvas ID:</strong> ${canvasId}</div><div><strong>User ID:</strong> ${currentUser.uid}</div>`; systemInfoWidget.appendChild(tooltip); }
    function initializeTooltips() { document.querySelectorAll('.keyword-chip[data-tooltip]').forEach(c => { if (c.querySelector('.tooltip')) { c.classList.add('has-tooltip'); c.querySelector('.tooltip').textContent = c.dataset.tooltip; } }); document.querySelectorAll('.content-section strong[data-tooltip]').forEach(h => { if(!h.querySelector('.tooltip')) { h.classList.add('has-tooltip'); const t = document.createElement('span'); t.className = 'tooltip'; t.textContent = h.dataset.tooltip; h.appendChild(t); } }); }
    function makePanelDraggable(p) { if(!p) return; const h = p.querySelector('.panel-header'); if(!h) return; let d = false, o = {x:0, y:0}; const m = (e) => { if(d) { p.style.left = (e.clientX + o.x) + 'px'; p.style.top = (e.clientY + o.y) + 'px'; } }; const u = () => { d = false; p.classList.remove('is-dragging'); document.removeEventListener('mousemove', m); document.removeEventListener('mouseup', u); }; h.addEventListener('mousedown', e => { if(e.target.closest('button, input, .close-btn, .project-actions-btn, #delete-session-btn, #chat-mode-selector')) return; d=true; p.classList.add('is-dragging'); o = {x: p.offsetLeft-e.clientX, y:p.offsetTop-e.clientY}; document.addEventListener('mousemove', m); document.addEventListener('mouseup', u); }); }
    function togglePanel(panel, forceShow = null) { if (!panel) return; panel.style.display = (forceShow !== null ? forceShow : panel.style.display !== 'flex') ? 'flex' : 'none'; }
    function setupNavigator() { const nav=document.getElementById('scroll-nav'); if(!nav || !learningContent) return; const h=learningContent.querySelectorAll('h2, #section-4 h3, #section-5 h3, #section-6 h3'); if(h.length === 0) { nav.style.display='none'; if(wrapper) wrapper.classList.add('toc-hidden'); return; } nav.style.display='block'; if(wrapper) wrapper.classList.remove('toc-hidden'); const ul=document.createElement('ul'); h.forEach((hdr, i) => { let t=hdr.closest('.content-section'); if(t && !t.id) t.id = `nav-target-${i}`; if(t) { const li=document.createElement('li'), a=document.createElement('a'); let txt=hdr.textContent.trim().replace(/\[|\]|🤓|⏳|📖/g, '').trim(); a.textContent=txt.substring(0,25); a.href=`#${t.id}`; if(hdr.tagName==='H3') a.style.paddingLeft='25px'; li.appendChild(a); ul.appendChild(li); } }); nav.innerHTML='<h3>학습 내비게이션</h3>'; nav.appendChild(ul); const links=nav.querySelectorAll('a'); const obs=new IntersectionObserver(e=>{e.forEach(i=>{const id=i.target.getAttribute('id'), l=nav.querySelector(`a[href="#${id}"]`); if(l&&i.isIntersecting&&i.intersectionRatio>0.5){links.forEach(k=>k.classList.remove('active')); l.classList.add('active');}});}, {rootMargin:"0px 0px -70% 0px", threshold:0.6}); h.forEach(hdr => { const t=hdr.closest('.content-section'); if(t) obs.observe(t);}); }
    function handleTextSelection(e) { if (e.target.closest('.draggable-panel, #selection-popover, .custom-context-menu, .fixed-tool-container, #system-info-widget')) return; const s = window.getSelection(); const t = s.toString().trim(); if (t.length > 3) { lastSelectedText = t; const r = s.getRangeAt(0).getBoundingClientRect(); const p = selectionPopover; let top = r.top + window.scrollY - p.offsetHeight - 10, left = r.left + window.scrollX + r.width/2 - p.offsetWidth/2; p.style.top = `${top < window.scrollY ? r.bottom + window.scrollY + 10 : top}px`; p.style.left = `${Math.max(5, Math.min(left, window.innerWidth-p.offsetWidth-5))}px`; p.style.display = 'flex'; } else if (!e.target.closest('#selection-popover')) selectionPopover.style.display = 'none'; }
    function handlePopoverAskAi() { if (!lastSelectedText) return; togglePanel(chatPanel, true); handleNewChat(); setTimeout(() => { chatInput.value = `"${lastSelectedText}"\n\n이 내용에 대해 더 자세히 설명해줄래?`; chatInput.style.height = chatInput.scrollHeight + 'px'; chatInput.focus(); }, 100); selectionPopover.style.display = 'none'; }
    function handlePopoverAddNote() { if (!lastSelectedText) return; addNote(`> ${lastSelectedText}\n\n`); selectionPopover.style.display = 'none'; }
    function openPromptModal() { if (customPromptInput) customPromptInput.value = customPrompt; if (promptModalOverlay) promptModalOverlay.style.display = 'flex'; }
    function closePromptModal() { if (promptModalOverlay) promptModalOverlay.style.display = 'none'; }
    function saveCustomPrompt() { if (customPromptInput) { customPrompt = customPromptInput.value; localStorage.setItem('customTutorPrompt', customPrompt); closePromptModal(); } }
    function showModal(msg, onConfirm) { if(!customModal) return; modalMessage.textContent = msg; customModal.style.display = 'flex'; modalConfirmBtn.onclick = () => { onConfirm(); customModal.style.display = 'none'; }; modalCancelBtn.onclick = () => { customModal.style.display = 'none'; }; }
    function listenToNotes() { return new Promise(r => { if (!notesCollection) return r(); if (unsubscribeFromNotes) unsubscribeFromNotes(); unsubscribeFromNotes = notesCollection.orderBy("updatedAt", "desc").onSnapshot(s => { localNotesCache = s.docs.map(d => ({ id: d.id, ...d.data() })); if (document.getElementById('notes-app-panel')?.style.display === 'flex') renderNoteList(); r(); }, e => {console.error("노트 수신 오류:", e); r();}); }); }
    function renderNoteList() { if (!notesList || !searchInput) return; const term = searchInput.value.toLowerCase(); const filtered = localNotesCache.filter(n => n.title?.toLowerCase().includes(term) || n.content?.toLowerCase().includes(term)); filtered.sort((a,b) => (b.isPinned - a.isPinned) || (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0)); notesList.innerHTML = filtered.length === 0 ? '<div>표시할 메모가 없습니다.</div>' : ''; filtered.forEach(n => { const i = document.createElement('div'); i.className = 'note-item'; i.dataset.id = n.id; if (n.isPinned) i.classList.add('pinned'); i.innerHTML = `<div class="note-item-content"><div class="note-item-title">${n.title||'무제'}</div><div class="note-item-date">${n.updatedAt?.toDate().toLocaleString('ko-KR')||'날짜 없음'}</div></div><div class="note-item-actions"><button class="item-action-btn pin-btn ${n.isPinned?'pinned-active':''}" title="고정"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z"/></svg></button><button class="item-action-btn delete-btn" title="삭제"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z"/></svg></button></div>`; notesList.appendChild(i); }); }
    async function addNote(content = '') { if (!notesCollection) return; try { const ref = await notesCollection.add({ title: '새 메모', content, isPinned: false, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); openNoteEditor(ref.id); } catch (e) { console.error("새 메모 추가 실패:", e); } }
    function saveNote() { if (debounceTimer) clearTimeout(debounceTimer); if (!currentNoteId || !notesCollection) return; const data = { title: noteTitleInput.value, content: noteContentTextarea.value, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }; notesCollection.doc(currentNoteId).update(data).then(() => updateStatus('저장됨 ✓', true)).catch(e => { console.error("메모 저장 실패:", e); updateStatus('저장 실패 ❌', false); }); }
    function handleDeleteRequest(id) { showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => { if (notesCollection) notesCollection.doc(id).delete().catch(e => console.error("메모 삭제 실패:", e)); }); }
    async function togglePin(id) { if (!notesCollection) return; const note = localNotesCache.find(n => n.id === id); if (note) await notesCollection.doc(id).update({ isPinned: !note.isPinned }); }
    function switchView(view) { if (view === 'editor') { noteListView?.classList.remove('active'); noteEditorView?.classList.add('active'); } else { noteEditorView?.classList.remove('active'); noteListView?.classList.add('active'); currentNoteId = null; } }
    function openNoteEditor(id) { const note = localNotesCache.find(n => n.id === id); if (note) { currentNoteId = id; noteTitleInput.value = note.title || ''; noteContentTextarea.value = note.content || ''; switchView('editor'); } }
    function updateStatus(msg, success) { if (!autoSaveStatus) return; autoSaveStatus.textContent = msg; autoSaveStatus.style.color = success ? 'lightgreen' : 'lightcoral'; setTimeout(() => autoSaveStatus.textContent = '', 3000); }
    function applyFormat(fmt) { if (!noteContentTextarea) return; const s = noteContentTextarea.selectionStart, e = noteContentTextarea.selectionEnd, t = noteContentTextarea.value.substring(s, e); const m = fmt === 'bold' ? '**' : (fmt === 'italic' ? '*' : '`'); noteContentTextarea.value = `${noteContentTextarea.value.substring(0,s)}${m}${t}${m}${noteContentTextarea.value.substring(e)}`; noteContentTextarea.focus(); }
    async function startQuiz() { if(!quizModalOverlay) return; const k = Array.from(document.querySelectorAll('.keyword-chip')).map(c=>c.textContent.trim()).join(', '); if(!k){showModal("퀴즈 생성 키워드가 없습니다.",()=>{}); return;} if(quizContainer) quizContainer.innerHTML='<div class="loading-indicator">퀴즈 생성 중...</div>'; if(quizResults) quizResults.innerHTML=''; quizModalOverlay.style.display='flex'; try {const res=await new Promise(r=>setTimeout(()=>r(JSON.stringify({"questions":[{"q":"(e.g)...","o":["..."],"a":"..."}]})),500)); currentQuizData=JSON.parse(res); renderQuiz(currentQuizData);}catch(e){if(quizContainer)quizContainer.innerHTML='퀴즈 생성 실패.';}}
    function renderQuiz(data) { if (!quizContainer || !data.questions) return; quizContainer.innerHTML = ''; data.questions.forEach((q, i) => { const b = document.createElement('div'); b.className = 'quiz-question-block'; const p = document.createElement('p'); p.textContent = `${i + 1}. ${q.q}`; const o = document.createElement('div'); o.className = 'quiz-options'; q.o.forEach(opt => { const l = document.createElement('label'); const r = document.createElement('input'); r.type = 'radio'; r.name = `q-${i}`; r.value = opt; l.append(r,` ${opt}`); o.appendChild(l); }); b.append(p, o); quizContainer.appendChild(b); }); }

    // --- 4. Global Initialization ---
    function initialize() {
        updateClock(); setInterval(updateClock, 1000);
        
        initializeFirebase().then(() => {
            renderSidebarContent();
            setupNavigator();
            setupChatModeSelector();
            initializeTooltips();
            makePanelDraggable(chatPanel);
            makePanelDraggable(notesAppPanel);
        });

        // Event Listeners
        document.addEventListener('click', hideSessionContextMenu);
        document.addEventListener('mouseup', handleTextSelection);
        if (popoverAskAi) popoverAskAi.addEventListener('click', handlePopoverAskAi);
        if (popoverAddNote) popoverAddNote.addEventListener('click', handlePopoverAddNote);
        if (themeToggle) themeToggle.addEventListener('click', () => { body.classList.toggle('dark-mode'); themeToggle.querySelector('svg').innerHTML = body.classList.contains('dark-mode') ? '<path d="M12,2A9,9 0 0,0 3,11C3,14.53 5,17.6 8.24,19.22C7.47,18.5 7,17.54 7,16.5A4.5,4.5 0 0,1 11.5,12A4.5,4.5 0 0,1 16,16.5C16,17.54 15.53,18.5 14.76,19.22C18,17.6 20,14.53 20,11A9,9 0 0,0 12,2Z" />' : '<path d="M12,18V22H10V18H12M12,2V6H10V2H12M22,12H18V10H22V12M6,12H2V10H6V12M16.95,7.05L19.78,4.22L18.36,2.81L15.54,5.64L16.95,7.05M8.46,15.54L5.64,18.36L4.22,16.95L7.05,14.12L8.46,15.54M18.36,21.19L19.78,19.78L16.95,16.95L15.54,18.36L18.36,21.19M7.05,8.46L4.22,5.64L5.64,4.22L8.46,7.05L7.05,8.46M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7Z" />'; });
        if (tocToggleBtn) tocToggleBtn.addEventListener('click', () => { wrapper.classList.toggle('toc-hidden'); systemInfoWidget?.classList.toggle('tucked'); });
        if (chatToggleBtn) chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));
        if (chatPanel) chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));
        if (notesAppToggleBtn) notesAppToggleBtn.addEventListener('click', () => { togglePanel(notesAppPanel); if(notesAppPanel.style.display === 'flex') renderNoteList(); });
        if (chatForm) chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });
        if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } });
        if (deleteSessionBtn) deleteSessionBtn.addEventListener('click', () => handleDeleteSession(currentSessionId));
        if (newChatBtn) newChatBtn.addEventListener('click', handleNewChat);
        if (newProjectBtn) newProjectBtn.addEventListener('click', createNewProject); // [FIXED]
        if (promptSaveBtn) promptSaveBtn.addEventListener('click', saveCustomPrompt);
        if (promptCancelBtn) promptCancelBtn.addEventListener('click', closePromptModal);
        if (startQuizBtn) startQuizBtn.addEventListener('click', startQuiz);
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
        
        // --- [MODIFIED] Event Delegation for Sidebar ---
        if (sessionListContainer) {
            sessionListContainer.addEventListener('contextmenu', showSessionContextMenu); // [NEW] For right-click
            sessionListContainer.addEventListener('click', (e) => {
                const sessionItem = e.target.closest('.session-item');
                const pinButton = e.target.closest('.session-pin-btn');
                const projectHeader = e.target.closest('.project-header');
                const actionsButton = e.target.closest('.project-actions-btn');

                if (pinButton) {
                    e.stopPropagation();
                    toggleChatPin(pinButton.closest('.session-item').dataset.sessionId);
                } else if (sessionItem) {
                    selectSession(sessionItem.dataset.sessionId);
                } else if (actionsButton) {
                    e.stopPropagation();
                    const project = localProjectsCache.find(p=>p.id === actionsButton.closest('.project-container').dataset.projectId);
                    if(project) {
                        const action = prompt(`'${project.name}' 프로젝트에 대한 작업을 선택하세요 (이름변경, 삭제):`);
                        if(action === '이름변경') renameProject(project.id, project.name);
                        else if(action === '삭제') deleteProject(project.id);
                    }
                } else if (projectHeader) {
                    toggleProjectExpansion(projectHeader.closest('.project-container').dataset.projectId);
                }
            });
        }
        
        if (formatToolbar) formatToolbar.addEventListener('click', e => { const b = e.target.closest('.format-btn'); if (b) applyFormat(b.dataset.format); });
        if (linkTopicBtn) linkTopicBtn.addEventListener('click', () => { if(!noteContentTextarea) return; const t = document.title || '현재 학습'; noteContentTextarea.value += `\n\n🔗 연관 학습: [${t}]`; saveNote(); });
    }

    // --- 5. Run Initialization ---
    initialize();
});
