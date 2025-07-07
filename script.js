/*
--- Ailey & Bailey Canvas ---
File: script.js
Version: 7.7 (Intelligent Chat Workspace)
Architect: [Username] & System Architect Ailey
Description: Major refactor. Implemented the full 'Intelligent Workspace' for the chat panel. 
- Features: Canvas-specific session loading, automatic session creation with AI greeting for new canvases, folder management, real-time search, and relative timestamps.
- Data Structure: Sessions are now tied to a `canvasId`. Folders are introduced.
- Logic: Removed 'Deep Learning' mode completely.
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
    const startQuizBtn = document.getElementById('start-quiz-btn');
    const chatModeSelector = document.getElementById('chat-mode-selector');
    const chatPanel = document.getElementById('chat-panel');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const notesAppPanel = document.getElementById('notes-app-panel');
    // ... (other note elements are unchanged)
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

    // -- [NEW & REFINED] Chat Workspace UI Elements
    const newChatBtn = document.getElementById('new-chat-btn');
    const newFolderBtn = document.getElementById('new-folder-btn'); // New
    const sessionListContainer = document.getElementById('session-list');
    const chatSearchInput = document.getElementById('chat-search-input'); // New
    const chatSessionTitle = document.getElementById('chat-session-title');
    const deleteSessionBtn = document.getElementById('delete-session-btn');
    const chatWelcomeMessage = document.getElementById('chat-welcome-message');

    // --- 2. State Management ---
    const canvasId = document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id';
    let db, notesCollection, chatFoldersCollectionRef, chatSessionsCollectionRef;
    let currentUser = null;
    const appId = 'AileyBailey_Global_Space';
    let lastSelectedText = '';

    // --- [RE-ARCHITECTED] CHAT WORKSPACE STATE ---
    let localChatSessionsCache = [];
    let localChatFoldersCache = [];
    let currentCanvasId = canvasId; // Explicitly track the canvas context
    let currentSessionId = null;
    let unsubscribeFromChatSessions = null;
    let unsubscribeFromChatFolders = null;
    let selectedMode = 'ailey_coaching'; // Default mode
    let customPrompt = localStorage.getItem('customTutorPrompt') || '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.';
    
    // --- 3. Function Definitions ---

    // Firebase Initialization
    async function initializeFirebase() {
        try {
            const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
            const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
            if (!firebaseConfig) { throw new Error("Firebase config not found."); }
            if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
            
            const auth = firebase.auth();
            db = firebase.firestore();
            
            if (initialAuthToken) {
                await auth.signInWithCustomToken(initialAuthToken).catch(err => auth.signInAnonymously());
            } else {
                await auth.signInAnonymously();
            }
            
            currentUser = auth.currentUser;

            if (currentUser) {
                // Notes collection remains the same
                notesCollection = db.collection(`artifacts/${appId}/users/${currentUser.uid}/notes`);
                
                // [NEW] Global collection for folders
                chatFoldersCollectionRef = db.collection(`artifacts/${appId}/users/${currentUser.uid}/chatFolders`);

                // [CRITICAL CHANGE] Sessions are now grouped by canvasId in the database
                chatSessionsCollectionRef = db.collection(`artifacts/${appId}/users/${currentUser.uid}/chatHistories/${currentCanvasId}/sessions`);

                // listenToNotes(); // This can be enabled if notes are used
                setupSystemInfoWidget();
            }
        } catch (error) {
            console.error("Firebase 초기화 또는 인증 실패:", error);
            if (chatMessages) chatMessages.innerHTML = '<div>AI 러닝메이트 연결에 실패했습니다.</div>';
        }
    }

    // --- [NEW] Chat Workspace - Core Logic ---

    async function openChatWorkspace() {
        togglePanel(chatPanel, true);
        if (!currentUser) return;

        // Start listening to data if not already
        if (!unsubscribeFromChatFolders) listenToChatFolders();
        if (!unsubscribeFromChatSessions) listenToChatSessions();
        
        // Check if there are any sessions for the CURRENT canvas
        const sessionsForThisCanvas = await chatSessionsCollectionRef.limit(1).get();

        if (sessionsForThisCanvas.empty) {
            // Situation 1: First time on this canvas. Create a new session.
            await startNewCanvasSession();
        } else {
            // Situation 2: Sessions exist. Load the most recent one.
            const mostRecentSession = localChatSessionsCache.sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis())[0];
            if (mostRecentSession) {
                selectSession(mostRecentSession.id);
            }
        }
    }

    async function startNewCanvasSession() {
        if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
        if (chatMessages) chatMessages.style.display = 'flex';
        
        const canvasTitle = document.querySelector('.header h1')?.textContent.trim() || '새로운 학습';
        const newSessionTitle = `[${canvasTitle}]에 대한 대화`;

        // Create the session document in Firestore first
        const newSessionData = {
            title: newSessionTitle,
            messages: [], // Start with no messages
            mode: selectedMode,
            folderId: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        try {
            const sessionRef = await chatSessionsCollectionRef.add(newSessionData);
            currentSessionId = sessionRef.id;

            // Now, trigger the AI's greeting
            const greetingPrompt = `[GREETING_FOR_CANVAS_TOPIC: "${canvasTitle}"]`;
            const aiGreetingMessage = await getAiResponse(greetingPrompt, []);
            
            // Add the AI greeting to the messages array
            const firstMessage = { role: 'ai', content: aiGreetingMessage, timestamp: new Date().toISOString() };
            await sessionRef.update({ 
                messages: [firstMessage],
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            selectSession(sessionRef.id); // This will render everything
        } catch (e) {
            console.error("Error starting new canvas session:", e);
            // Handle error state
        }
    }

    // --- [NEW & REFINED] Data Listeners & Renderers ---
    
    function listenToChatFolders() {
        if (!chatFoldersCollectionRef) return;
        if (unsubscribeFromChatFolders) unsubscribeFromChatFolders();
        unsubscribeFromChatFolders = chatFoldersCollectionRef.orderBy("createdAt", "desc").onSnapshot(snapshot => {
            localChatFoldersCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderWorkspace();
        }, error => console.error("Chat folder listener error:", error));
    }
    
    function listenToChatSessions() {
        if (!chatSessionsCollectionRef) return;
        if (unsubscribeFromChatSessions) unsubscribeFromChatSessions();
        unsubscribeFromChatSessions = chatSessionsCollectionRef.orderBy("updatedAt", "desc").onSnapshot(snapshot => {
            localChatSessionsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderWorkspace();
             // If a session is currently selected, refresh its content
            if (currentSessionId) {
                const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId);
                if (currentSessionData) {
                    renderChatMessages(currentSessionData.messages || []);
                } else {
                    handleNewChat(); // The active session was deleted
                }
            }
        }, error => console.error("Chat session listener error:", error));
    }

    function renderWorkspace() {
        if (!sessionListContainer || !chatSearchInput) return;
        const searchTerm = chatSearchInput.value.toLowerCase();
        sessionListContainer.innerHTML = '';

        // Filter folders and sessions
        const filteredFolders = localChatFoldersCache.filter(f => f.name.toLowerCase().includes(searchTerm));
        const sessionsInFilteredFolders = localChatSessionsCache.filter(s => filteredFolders.some(f => f.id === s.folderId));
        const filteredSessions = localChatSessionsCache.filter(s => s.title.toLowerCase().includes(searchTerm));

        // Create a combined list of items to render
        const itemsToRender = new Set([...filteredFolders, ...sessionsInFilteredFolders, ...filteredSessions]);

        // Render folders first
        filteredFolders.forEach(folder => {
            const folderEl = document.createElement('div');
            folderEl.className = 'folder-item';
            folderEl.dataset.folderId = folder.id;
            // A better way to handle collapsed state would be in a state object
            if (folder.isCollapsed) folderEl.classList.add('collapsed');

            folderEl.innerHTML = `
                <div class="folder-header">
                    <span class="folder-toggle-icon">▼</span>
                    <span class="folder-name">${folder.name}</span>
                </div>
                <div class="folder-content"></div>
            `;
            sessionListContainer.appendChild(folderEl);
        });

        // Render sessions
        localChatSessionsCache.forEach(session => {
            // If search is active and session doesn't match, skip
            if (searchTerm && !itemsToRender.has(session)) return;

            const sessionEl = createSessionElement(session);
            const folderContentEl = session.folderId ? sessionListContainer.querySelector(`.folder-item[data-folder-id="${session.folderId}"] .folder-content`) : null;

            if (folderContentEl) {
                sessionEl.classList.add('indented');
                folderContentEl.appendChild(sessionEl);
            } else if (!session.folderId) {
                sessionListContainer.appendChild(sessionEl);
            }
        });
    }

    function createSessionElement(session) {
        const item = document.createElement('div');
        item.className = 'session-item';
        item.dataset.sessionId = session.id;
        if (session.id === currentSessionId) {
            item.classList.add('active');
        }
        const time = session.updatedAt ? formatRelativeTime(session.updatedAt.toDate()) : '';

        item.innerHTML = `
            <div class="session-item-main">
                <div class="session-item-title">${session.title || '새 대화'}</div>
                <div class="session-item-time">${time}</div>
            </div>
        `; // Actions can be added later
        item.addEventListener('click', () => selectSession(session.id));
        return item;
    }
    
    function selectSession(sessionId) {
        if (!sessionId) return;
        const sessionData = localChatSessionsCache.find(s => s.id === sessionId);
        if (!sessionData) return;
        
        currentSessionId = sessionId;
        renderWorkspace(); // Re-render to update the 'active' class
        
        if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
        if (chatMessages) chatMessages.style.display = 'flex';
        renderChatMessages(sessionData.messages || []);
        
        if (chatSessionTitle) chatSessionTitle.textContent = sessionData.title || '대화';
        if (deleteSessionBtn) deleteSessionBtn.style.display = 'inline-block';
        if (chatInput) chatInput.disabled = false;
        if (chatSendBtn) chatSendBtn.disabled = false;
        chatInput.focus();
    }
    
    async function handleNewChat() {
        const newSessionData = {
            title: '새 대화',
            messages: [],
            mode: selectedMode,
            folderId: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };
        try {
            const sessionRef = await chatSessionsCollectionRef.add(newSessionData);
            selectSession(sessionRef.id);
        } catch (e) {
            console.error("Error creating new chat:", e);
        }
    }

    async function handleNewFolder() {
        const folderName = prompt("새 폴더의 이름을 입력하세요:", "새 폴더");
        if (folderName && folderName.trim() !== "" && chatFoldersCollectionRef) {
            try {
                await chatFoldersCollectionRef.add({
                    name: folderName.trim(),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (e) {
                console.error("Error creating new folder:", e);
            }
        }
    }

    function handleDeleteSession() {
        if (!currentSessionId) return;
        const sessionToDelete = localChatSessionsCache.find(s => s.id === currentSessionId);
        showModal(`'${sessionToDelete?.title || '이 대화'}'를 삭제하시겠습니까?`, () => {
            if (chatSessionsCollectionRef && currentSessionId) {
                chatSessionsCollectionRef.doc(currentSessionId).delete()
                    .then(() => {
                        console.log("Session deleted successfully");
                        currentSessionId = null;
                        // Select the next available session or show welcome message
                        const nextSession = localChatSessionsCache[0];
                        if (nextSession && nextSession.id !== sessionToDelete.id) {
                            selectSession(nextSession.id);
                        } else {
                             if(chatMessages) chatMessages.style.display = 'none';
                             if(chatWelcomeMessage) chatWelcomeMessage.style.display = 'flex';
                        }
                    })
                    .catch(e => console.error("세션 삭제 실패:", e));
            }
        });
    }

    // --- [REFINED] Chat Interaction ---

    async function getAiResponse(prompt, history) {
        // A helper to centralize API calls
        const apiMessages = history.map(msg => ({ role: msg.role === 'ai' ? 'model' : 'user', parts: [{ text: msg.content }] }));
        apiMessages.push({ role: 'user', parts: [{ text: prompt }] });
        
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=`, { // API Key placeholder
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: apiMessages })
        });
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        const result = await res.json();
        if (result.candidates?.[0].content.parts[0]) {
            return result.candidates[0].content.parts[0].text;
        }
        return "답변 생성 중 오류... 😥";
    }

    async function handleChatSend() {
        if (!chatInput || chatInput.disabled || !currentSessionId) return;
        const query = chatInput.value.trim();
        if (!query) return;

        chatInput.disabled = true;
        chatSendBtn.disabled = true;

        const userMessage = { role: 'user', content: query, timestamp: new Date().toISOString() };
        const sessionRef = chatSessionsCollectionRef.doc(currentSessionId);
        
        try {
            // Optimistically update UI
            const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId);
            let messages = [...(currentSessionData.messages || []), userMessage];
            renderChatMessages(messages);

            // Update DB in the background
            await sessionRef.update({ 
                messages: messages,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'chat-message ai';
            loadingDiv.innerHTML = '<div class="loading-indicator">AI가 답변을 생성하고 있습니다...</div>';
            if (chatMessages) {
                chatMessages.appendChild(loadingDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
            
            let fullPrompt;
            if (selectedMode === 'custom') {
                fullPrompt = `[M-CHAT-CUSTOM] 모드. 프롬프트:"${customPrompt}", 질문:"${query}"`;
            } else {
                fullPrompt = `[M-CHAT-AILEY] 모드. 질문:"${query}"`;
            }

            const aiRes = await getAiResponse(fullPrompt, messages);
            
            const aiMessage = { role: 'ai', content: aiRes, timestamp: new Date().toISOString() };
            messages.push(aiMessage);
            await sessionRef.update({ 
                messages: messages,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
             });

        } catch (e) {
            console.error("Chat send error:", e);
            const errorMessage = { role: 'ai', content: `API 오류가 발생했습니다: ${e.message}`, timestamp: new Date().toISOString() };
             const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId);
             const errorMessages = [...(currentSessionData.messages || []), errorMessage];
             await sessionRef.update({ messages: errorMessages });
        } finally {
            chatInput.disabled = false;
            chatSendBtn.disabled = false;
            chatInput.value = '';
            chatInput.style.height = 'auto';
            chatInput.focus();
        }
    }
    
    function renderChatMessages(messages = []) {
        if (!chatMessages) return;
        chatMessages.innerHTML = '';
        if (messages.length === 0) {
            // This case should be rare now with the AI greeting
            chatMessages.innerHTML = '<div class="loading-indicator">대화를 시작해보세요...</div>';
        }
        messages.forEach(msg => {
            const d = document.createElement('div');
            d.className = `chat-message ${msg.role}`;
            let c = msg.content;
            const cd = document.createElement('div');
            cd.innerHTML = c.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
            d.appendChild(cd);
            if (msg.timestamp) { const t = document.createElement('div'); t.className = 'chat-timestamp'; t.textContent = new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }); d.appendChild(t); }
            if (msg.role === 'ai') { const b = document.createElement('button'); b.className = 'send-to-note-btn'; b.textContent = '메모로 보내기'; b.onclick = e => { /* addNote logic */ e.target.textContent = '✅'; e.target.disabled = true; }; cd.appendChild(b); }
            chatMessages.appendChild(d);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function setupChatModeSelector() {
        if (!chatModeSelector) return;
        chatModeSelector.innerHTML = '';
        const modes = [{ id: 'ailey_coaching', t: '기본 코칭 💬' }, { id: 'custom', t: '커스텀 ⚙️' }];
        modes.forEach(m => {
            const b = document.createElement('button');
            b.dataset.mode = m.id;
            b.innerHTML = m.t;
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

    function formatRelativeTime(date) {
        const now = new Date();
        const diff = now - date;
        const diffSeconds = Math.floor(diff / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSeconds < 60) return "방금";
        if (diffMinutes < 60) return `${diffMinutes}분 전`;
        if (diffHours < 24) return `${diffHours}시간 전`;
        if (diffDays === 1) return "어제";
        if (diffDays < 7) return `${diffDays}일 전`;
        return date.toLocaleDateString('ko-KR');
    }

    // --- [Unchanged or Minor Changes] UI & Utilities ---
    // ... (All other utility functions like updateClock, makePanelDraggable, showModal etc. remain here)
    function showModal(message, onConfirm) { if (!customModal || !modalMessage || !modalConfirmBtn || !modalCancelBtn) return; modalMessage.textContent = message; customModal.style.display = 'flex'; modalConfirmBtn.onclick = () => { onConfirm(); customModal.style.display = 'none'; }; modalCancelBtn.onclick = () => { customModal.style.display = 'none'; }; }
    function openPromptModal() { if (customPromptInput) customPromptInput.value = customPrompt; if (promptModalOverlay) promptModalOverlay.style.display = 'flex'; }
    function closePromptModal() { if (promptModalOverlay) promptModalOverlay.style.display = 'none'; }
    function saveCustomPrompt() { if (customPromptInput) { customPrompt = customPromptInput.value; localStorage.setItem('customTutorPrompt', customPrompt); closePromptModal(); } }
    function setupSystemInfoWidget() { /* Unchanged */ }
    function togglePanel(panelElement, forceShow = null) { if (!panelElement) return; const show = forceShow !== null ? forceShow : panelElement.style.display !== 'flex'; panelElement.style.display = show ? 'flex' : 'none'; }
    
    // --- 4. Global Initialization ---
    function initialize() {
        if (!body || !wrapper) { console.error("Core layout elements not found."); return; }
        
        initializeFirebase().then(() => {
            // setupNavigator(); // This can be re-enabled if needed
            setupChatModeSelector();
            // initializeTooltips(); // This can be re-enabled if needed
            makePanelDraggable(chatPanel);
            makePanelDraggable(notesAppPanel);
        });

        // Event Listeners
        if (themeToggle) themeToggle.addEventListener('click', () => { body.classList.toggle('dark-mode'); themeToggle.textContent = body.classList.contains('dark-mode') ? '☀️' : '🌙'; });
        
        // --- CHAT WORKSPACE LISTENERS ---
        if (chatToggleBtn) chatToggleBtn.addEventListener('click', openChatWorkspace);
        if (chatPanel) chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));
        if (chatForm) chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });
        if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } });
        if (deleteSessionBtn) deleteSessionBtn.addEventListener('click', handleDeleteSession);
        if (newChatBtn) newChatBtn.addEventListener('click', handleNewChat);
        if (newFolderBtn) newFolderBtn.addEventListener('click', handleNewFolder);
        if (chatSearchInput) chatSearchInput.addEventListener('input', renderWorkspace);
        if (sessionListContainer) sessionListContainer.addEventListener('click', e => {
            const folderHeader = e.target.closest('.folder-header');
            if (folderHeader) {
                const folderItem = folderHeader.closest('.folder-item');
                folderItem.classList.toggle('collapsed');
                // You might want to save the collapsed state to Firestore here
            }
        });

        // --- Other Listeners ---
        if (promptSaveBtn) promptSaveBtn.addEventListener('click', saveCustomPrompt);
        if (promptCancelBtn) promptCancelBtn.addEventListener('click', closePromptModal);
        // ... (other listeners for notes, popovers etc. would go here)
    }

    // --- 5. Run Initialization ---
    initialize();
});
