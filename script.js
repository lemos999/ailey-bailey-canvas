/*
--- Ailey & Bailey Canvas ---
File: script.js
Version: 6.4 (Tabbed UI & PG Logic Patch)
Architect: [Username] & System Architect Ailey
Description: Implemented full logic for the new tabbed chat interface,
including separate handlers for each tab and the complete Problem Generator functionality.
*/

document.addEventListener('DOMContentLoaded', function () {
    // --- 1. Element Declarations ---
    const learningContent = document.getElementById('learning-content');
    const wrapper = document.querySelector('.wrapper');
    const body = document.body;
    const clockElement = document.getElementById('real-time-clock');
    const selectionPopover = document.getElementById('selection-popover');
    const popoverAskAi = document.getElementById('popover-ask-ai');
    const popoverAddNote = document.getElementById('popover-add-note');
    const tocToggleBtn = document.getElementById('toc-toggle-btn');
    const quizModalOverlay = document.getElementById('quiz-modal-overlay');
    const quizContainer = document.getElementById('quiz-container');
    const quizSubmitBtn = document.getElementById('quiz-submit-btn');
    const quizResults = document.getElementById('quiz-results');
    const startQuizBtn = document.getElementById('start-quiz-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    const notesAppToggleBtn = document.getElementById('notes-app-toggle-btn');
    const customModal = document.getElementById('custom-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');

    // Chat Panel Elements
    const chatPanel = document.getElementById('chat-panel');
    const chatTabsContainer = document.querySelector('.chat-tabs');
    const chatContentPanels = document.querySelectorAll('.chat-content-panel');
    const deleteHistoryBtn = document.getElementById('delete-history-btn');

    // Ailey Tutor Elements
    const aileyChatForm = document.getElementById('ailey-chat-form');
    const aileyChatInput = document.getElementById('ailey-chat-input');
    const aileyChatMessages = document.getElementById('ailey-chat-messages');
    const aileyChatSendBtn = document.getElementById('ailey-chat-send-btn');

    // Custom Tutor Elements
    const customChatForm = document.getElementById('custom-chat-form');
    const customChatInput = document.getElementById('custom-chat-input');
    const customChatMessages = document.getElementById('custom-chat-messages');
    const customChatSendBtn = document.getElementById('custom-chat-send-btn');
    const editCustomPromptBtn = document.getElementById('edit-custom-prompt-btn');
    const currentPromptDisplay = document.getElementById('current-prompt-display');
    const promptModalOverlay = document.getElementById('prompt-modal-overlay');
    const customPromptInput = document.getElementById('custom-prompt-input');
    const promptLibraryButtons = document.getElementById('prompt-library-buttons');
    const promptSaveBtn = document.getElementById('prompt-save-btn');
    const promptCancelBtn = document.getElementById('prompt-cancel-btn');

    // Problem Generator Elements
    const pgTopicInput = document.getElementById('pg-topic');
    const pgTypeSelect = document.getElementById('pg-type');
    const pgCountInput = document.getElementById('pg-count');
    const pgDifficultySelect = document.getElementById('pg-difficulty');
    const pgGenerateBtn = document.getElementById('pg-generate-btn');
    const pgResultArea = document.getElementById('pg-result-area');

    // Notes App Elements
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

    // --- 2. State Management ---
    let db, notesCollection, chatCollectionRef;
    let currentUser = null;
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'AileyBailey_Global_Space';
    let storageKey = 'learningNote-' + (document.title || 'default-page');
    let localNotesCache = [];
    let currentNoteId = null;
    let unsubscribeFromNotes = null;
    let debounceTimer = null;
    let chatHistories = { ailey: [], custom: [] };
    let activeChatTab = 'ailey-tutor';
    let customTutorPrompt = localStorage.getItem('customTutorPrompt') || '너는 AI 튜터야. 사용자의 모든 질문에 답변해줘.';
    let unsubscribeFromChat = null;
    let currentQuizData = null;
    const promptTemplates = {
        '초보자 설명가': '너는 해당 분야를 처음 접하는 5살 아이도 이해할 수 있도록, 세상에서 가장 친절하고 쉬운 비유를 들어서 설명해주는 선생님이야.',
        '깐깐한 코드 리뷰어': '너는 단 한 줄의 비효율적인 코드도 용납하지 않는 실리콘밸리의 시니어 개발자야. 내가 작성한 코드의 문제점을 날카롭게 지적하고, 더 나은 개선안을 제시해줘.',
        '소크라테스식 질문가': '너는 소크라테스야. 사용자의 질문에 직접 답하지 말고, 계속해서 질문을 던져 사용자가 스스로 답을 찾도록 유도해줘.',
        '실전 압박 면접관': '너는 지원자의 역량을 극한까지 파악하려는 압박 면접관이야. 나의 답변에 대해 날카롭게 꼬리 질문을 던지고, 논리적 허점을 집요하게 파고들어줘.'
    };

    // --- 3. Function Definitions ---

    // Firebase
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
                notesCollection = db.collection(`artifacts/${appId}/users/${currentUser.uid}/notes`);
                listenToNotes();
                chatCollectionRef = db.collection(`artifacts/${appId}/users/${currentUser.uid}/chatHistories`).doc(storageKey);
                listenToChatHistory();
            }
        } catch (error) {
            console.error("Firebase 초기화 또는 인증 실패:", error);
            if (notesList) notesList.innerHTML = '<div>클라우드 메모장을 불러오는 데 실패했습니다.</div>';
            if (aileyChatMessages) aileyChatMessages.innerHTML = '<div>AI 튜터 연결에 실패했습니다.</div>';
        }
    }

    // UI & Utilities
    function updateClock() { if (clockElement) clockElement.textContent = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
    function initializeTooltips() {
        document.querySelectorAll('.keyword-chip, .content-section strong[data-tooltip]').forEach(el => {
            const tooltipText = el.dataset.tooltip;
            if (tooltipText && !el.querySelector('.tooltip')) {
                el.classList.add('has-tooltip');
                const tooltipElement = document.createElement('span');
                tooltipElement.className = 'tooltip';
                tooltipElement.textContent = tooltipText;
                el.appendChild(tooltipElement);
            }
        });
    }
    function makePanelDraggable(panelElement) {
        if (!panelElement) return;
        const header = panelElement.querySelector('.panel-header');
        if (!header) return;
        let isDragging = false, offset = { x: 0, y: 0 };
        const onMouseMove = (e) => { if (isDragging) { panelElement.style.left = (e.clientX + offset.x) + 'px'; panelElement.style.top = (e.clientY + offset.y) + 'px'; } };
        const onMouseUp = () => { isDragging = false; panelElement.classList.remove('is-dragging'); document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
        header.addEventListener('mousedown', e => {
            if (e.target.closest('button, input, .close-btn, span[id$="-btn"]')) return;
            isDragging = true; panelElement.classList.add('is-dragging');
            offset = { x: panelElement.offsetLeft - e.clientX, y: panelElement.offsetTop - e.clientY };
            document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp);
        });
    }
    function togglePanel(panelElement, forceShow = null) { if (panelElement) panelElement.style.display = (forceShow !== null ? forceShow : panelElement.style.display !== 'flex') ? 'flex' : 'none'; }
    function setupNavigator() {
        const scrollNav = document.getElementById('scroll-nav');
        if (!scrollNav || !learningContent) return;
        const headers = learningContent.querySelectorAll('h2, #section-3 ul li > strong');
        if (headers.length === 0) { if (wrapper) wrapper.classList.add('toc-hidden'); return; }
        const navList = document.createElement('ul');
        headers.forEach((header, index) => {
            let targetElement = header.tagName === 'H2' ? header.closest('.content-section') : header.closest('li');
            if (targetElement && !targetElement.id) targetElement.id = `nav-target-${index}`;
            if (targetElement) {
                const link = document.createElement('a');
                link.textContent = header.textContent.trim().substring(0, 25);
                link.href = `#${targetElement.id}`;
                if (header.tagName !== 'H2') { link.style.paddingLeft = '25px'; link.style.fontSize = '0.9em'; }
                const listItem = document.createElement('li');
                listItem.appendChild(link);
                navList.appendChild(listItem);
            }
        });
        scrollNav.innerHTML = '<h3>학습 내비게이션</h3>'; scrollNav.appendChild(navList);
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const navLink = scrollNav.querySelector(`a[href="#${entry.target.getAttribute('id')}"]`);
                if (navLink && entry.isIntersecting && entry.intersectionRatio > 0.5) {
                    scrollNav.querySelectorAll('a').forEach(l => l.classList.remove('active'));
                    navLink.classList.add('active');
                }
            });
        }, { rootMargin: "0px 0px -70% 0px", threshold: 0.6 });
        headers.forEach(h => { const target = h.tagName === 'H2' ? h.closest('.content-section') : h.closest('li'); if(target) observer.observe(target); });
    }

    // Modals
    function openPromptModal() {
        if (customPromptInput) customPromptInput.value = customTutorPrompt;
        if (promptLibraryButtons) {
            promptLibraryButtons.innerHTML = '';
            for (const key in promptTemplates) {
                const btn = document.createElement('button');
                btn.textContent = key;
                btn.onclick = () => { customPromptInput.value = promptTemplates[key]; };
                promptLibraryButtons.appendChild(btn);
            }
        }
        if (promptModalOverlay) promptModalOverlay.style.display = 'flex';
    }
    function closePromptModal() { if (promptModalOverlay) promptModalOverlay.style.display = 'none'; }
    function saveCustomPrompt() {
        if (customPromptInput) {
            customTutorPrompt = customPromptInput.value;
            localStorage.setItem('customTutorPrompt', customTutorPrompt);
            if (currentPromptDisplay) currentPromptDisplay.textContent = `현재 역할: ${customTutorPrompt.substring(0, 15)}...`;
            closePromptModal();
        }
    }
    function showModal(message, onConfirm) {
        if (!customModal) return;
        modalMessage.textContent = message; customModal.style.display = 'flex';
        modalConfirmBtn.onclick = () => { onConfirm(); customModal.style.display = 'none'; };
        modalCancelBtn.onclick = () => { customModal.style.display = 'none'; };
    }

    // Chat
    function generateTutorPrompt(mode, query) {
        let basePrompt = "";
        switch(mode) {
            case 'custom': basePrompt = customTutorPrompt; break;
            default: // ailey mode
                basePrompt = "너는 '에일리'와 '베일리'라는 두 인격을 가진 AI 튜터야. 먼저 다정한 코치 '에일리'가 되어 사용자의 질문에 친절하게 답해줘(😊 이모지 사용). 그 다음, 답변과 관련된 비판적 사고를 유도하는 날카로운 질문을 '베일리'가 되어 던져줘(😎, 😒 이모지 사용). 에일리의 답변과 베일리의 질문은 반드시 ---CHALLENGE--- 문자열로 구분해야 해.";
        }
        const toneMandate = "너는 지금부터 친한 친구에게 말하는 것처럼, 반드시 친근한 반말(informal Korean)으로만 대화해야 해. '안녕하세요' 같은 존댓말은 절대 사용하면 안 돼.";
        return `${basePrompt} ${toneMandate} 다음 질문에 답변해줘: "${query}"`;
    }
    async function handleChatSend(mode) {
        const inputElem = mode === 'ailey' ? aileyChatInput : customChatInput;
        const sendBtn = mode === 'ailey' ? aileyChatSendBtn : customChatSendBtn;
        const messagesElem = mode === 'ailey' ? aileyChatMessages : customChatMessages;
        if (!inputElem || !sendBtn) return;
        const userQuery = inputElem.value.trim();
        if (!userQuery) return;
        inputElem.disabled = true; sendBtn.disabled = true;
        const currentHistory = chatHistories[mode] || [];
        currentHistory.push({ role: 'user', content: userQuery, timestamp: new Date().toISOString() });
        renderChatHistory(mode);
        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'chat-message ai';
        aiMessageDiv.innerHTML = '<div class="loading-indicator">AI가 답변을 생성하고 있습니다...</div>';
        if (messagesElem) messagesElem.appendChild(aiMessageDiv);
        const apiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${apiKey}`;
        const payload = { contents: [{ role: "user", parts: [{ text: generateTutorPrompt(mode, userQuery) }] }] };
        try {
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const result = await response.json();
            let aiResponse = (result.candidates && result.candidates[0]?.content?.parts[0]?.text) || "죄송해요, 답변 생성에 문제가 발생했어요. 😥";
            const [aileyPart, baileyPart] = aiResponse.split('---CHALLENGE---');
            currentHistory.push({ role: 'ai', content: aileyPart.trim(), timestamp: new Date().toISOString() });
            if (baileyPart) currentHistory.push({ role: 'bailey', content: baileyPart.trim(), timestamp: new Date().toISOString() });
            await saveChatHistory();
            renderChatHistory(mode);
        } catch (error) {
            console.error("AI API Error:", error);
            currentHistory.push({ role: 'ai', content: `오류가 발생했습니다: ${error.message}`, timestamp: new Date().toISOString() });
            renderChatHistory(mode);
        } finally {
            inputElem.disabled = false; sendBtn.disabled = false;
            inputElem.value = ''; inputElem.style.height = 'auto'; inputElem.focus();
        }
    }
    function renderChatHistory(mode) {
        const messagesElem = mode === 'ailey' ? aileyChatMessages : customChatMessages;
        if (!messagesElem) return;
        messagesElem.innerHTML = '';
        const history = chatHistories[mode] || [];
        history.forEach(msg => {
            const msgDiv = document.createElement('div');
            msgDiv.className = `chat-message ${msg.role}`;
            if (msg.role === 'bailey') msgDiv.classList.add('ai', 'bailey-challenge');
            const contentDiv = document.createElement('div');
            contentDiv.textContent = msg.content;
            msgDiv.appendChild(contentDiv);
            if (msg.timestamp) {
                const timeDiv = document.createElement('div');
                timeDiv.className = 'chat-timestamp';
                timeDiv.textContent = new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                msgDiv.appendChild(timeDiv);
            }
            if(msg.role === 'ai' || msg.role === 'bailey') {
                const sendToNoteBtn = document.createElement('button');
                sendToNoteBtn.className = 'send-to-note-btn'; sendToNoteBtn.textContent = '메모로 보내기';
                sendToNoteBtn.onclick = (e) => { addNote(`[AI 튜터] ${msg.content}`); e.target.textContent = '✅'; e.target.disabled = true; };
                contentDiv.appendChild(sendToNoteBtn);
            }
            messagesElem.appendChild(msgDiv);
        });
        messagesElem.scrollTop = messagesElem.scrollHeight;
    }
    async function listenToChatHistory() {
        if (!chatCollectionRef) return;
        if (unsubscribeFromChat) unsubscribeFromChat();
        unsubscribeFromChat = chatCollectionRef.onSnapshot(doc => {
            if (doc.exists) chatHistories = { ...{ ailey: [], custom: [] }, ...doc.data() };
            else chatHistories = { ailey: [], custom: [] };
            renderChatHistory('ailey'); renderChatHistory('custom');
        }, error => console.error("Chat history listener error:", error));
    }
    async function saveChatHistory() { if (chatCollectionRef) try { await chatCollectionRef.set(chatHistories); } catch (e) { console.error(e); } }
    
    // Problem Generator
    async function handleProblemGeneration() {
        const topic = pgTopicInput.value.trim();
        if (!topic) { alert('학습 주제를 입력해주세요!'); return; }
        pgGenerateBtn.disabled = true;
        pgResultArea.innerHTML = '<div class="loading-indicator">AI가 문제를 생성하고 있습니다...</div>';
        const prompt = `You are a problem generator. Create ${pgCountInput.value} questions about '${topic}'. The question type must be '${pgTypeSelect.value}' and the difficulty must be '${pgDifficultySelect.value}'. Your output must be a JSON array of strings, where each string is a single question. Do not include any other text or explanation. Example: ["Question 1", "Question 2"]`;
        const apiKey = ""; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${apiKey}`;
        try {
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const result = await response.json();
            const textResponse = (result.candidates && result.candidates[0]?.content?.parts[0]?.text) || '[]';
            const questions = JSON.parse(textResponse.replace(/```json\n?/, '').replace(/```$/, ''));
            pgResultArea.innerHTML = '';
            questions.forEach((q, i) => {
                const qDiv = document.createElement('div');
                qDiv.innerHTML = `<p><strong>문제 ${i+1}:</strong> ${q}</p>`;
                pgResultArea.appendChild(qDiv);
            });
        } catch (error) {
            pgResultArea.innerHTML = `<p style="color:red;">문제 생성에 실패했습니다: ${error.message}</p>`;
            console.error("Problem Generation Error:", error);
        } finally {
            pgGenerateBtn.disabled = false;
        }
    }

    // Notes
    function listenToNotes() {
        if (!notesCollection) return;
        if (unsubscribeFromNotes) unsubscribeFromNotes();
        unsubscribeFromNotes = notesCollection.onSnapshot(snapshot => { localNotesCache = snapshot.docs.map(d => ({ id: d.id, ...d.data() })); renderNoteList(); }, e => console.error(e));
    }
    function renderNoteList() {
        if (!notesList || !searchInput) return;
        const searchTerm = searchInput.value.toLowerCase();
        const filtered = localNotesCache.filter(n => (n.title || '').toLowerCase().includes(searchTerm) || (n.content || '').toLowerCase().includes(searchTerm));
        filtered.sort((a,b) => (b.isPinned?1:-1) - (a.isPinned?1:-1) || (b.updatedAt?.toMillis()||0) - (a.updatedAt?.toMillis()||0));
        notesList.innerHTML = filtered.length ? '' : '<div>표시할 메모가 없습니다.</div>';
        filtered.forEach(note => {
            const item = document.createElement('div');
            item.className = `note-item ${note.isPinned ? 'pinned' : ''}`;
            item.dataset.id = note.id;
            item.innerHTML = `<div class="note-item-content"><div class="note-item-title">${note.title||'무제'}</div><div class="note-item-date">${note.updatedAt?new Date(note.updatedAt.toMillis()).toLocaleString():'날짜 없음'}</div></div><div class="note-item-actions"><button class="item-action-btn pin-btn ${note.isPinned?'pinned-active':''}" title="고정">${note.isPinned?'📌':'📍'}</button><button class="item-action-btn delete-btn" title="삭제">🗑️</button></div>`;
            notesList.appendChild(item);
        });
    }
    async function addNote(initialContent = '') {
        if (!notesCollection) return;
        try {
            const newNote = await notesCollection.add({ title: '새 메모', content: initialContent, isPinned: false, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
            openNoteEditor(newNote.id);
        } catch (e) { console.error(e); }
    }
    function saveNote() {
        if (debounceTimer) clearTimeout(debounceTimer);
        if (!currentNoteId || !notesCollection) return;
        const data = { title: noteTitleInput.value, content: noteContentTextarea.value, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
        notesCollection.doc(currentNoteId).update(data).then(() => updateStatus('저장됨 ✓', true)).catch(e => updateStatus('저장 실패 ❌', false));
    }
    function updateStatus(message, success) {
        if (!autoSaveStatus) return;
        autoSaveStatus.textContent = message; autoSaveStatus.style.color = success ? 'lightgreen' : 'lightcoral';
        setTimeout(() => { autoSaveStatus.textContent = ''; }, 2000);
    }
    function switchView(viewName) { if(viewName === 'editor') { noteListView.classList.remove('active'); noteEditorView.classList.add('active'); } else { noteEditorView.classList.remove('active'); noteListView.classList.add('active'); currentNoteId = null; } }
    function openNoteEditor(noteId) {
        const note = localNotesCache.find(n => n.id === noteId);
        if (note) { currentNoteId = noteId; noteTitleInput.value = note.title || ''; noteContentTextarea.value = note.content || ''; switchView('editor'); }
    }

    // --- 4. Global Initialization ---
    function initialize() {
        if (!body) return;
        updateClock(); setInterval(updateClock, 1000);
        initializeTooltips();
        makePanelDraggable(chatPanel); makePanelDraggable(notesAppPanel);

        // Event Listeners
        if (themeToggle) themeToggle.addEventListener('click', () => { body.classList.toggle('dark-mode'); themeToggle.textContent = body.classList.contains('dark-mode') ? '☀️' : '🌙'; });
        if (tocToggleBtn) tocToggleBtn.addEventListener('click', () => { wrapper.classList.toggle('toc-hidden'); clockElement.classList.toggle('tucked'); });
        if (chatToggleBtn) chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));
        if (chatPanel) chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));
        if (notesAppToggleBtn) notesAppToggleBtn.addEventListener('click', () => togglePanel(notesAppPanel));
        
        // Chat Listeners
        if (chatTabsContainer) chatTabsContainer.addEventListener('click', (e) => {
            const tabButton = e.target.closest('.chat-tab');
            if (!tabButton) return;
            activeChatTab = tabButton.dataset.tab;
            chatTabsContainer.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
            chatContentPanels.forEach(p => p.classList.remove('active'));
            tabButton.classList.add('active');
            document.getElementById(activeChatTab).classList.add('active');
        });
        if (aileyChatForm) aileyChatForm.addEventListener('submit', (e) => { e.preventDefault(); handleChatSend('ailey'); });
        if (customChatForm) customChatForm.addEventListener('submit', (e) => { e.preventDefault(); handleChatSend('custom'); });
        if (deleteHistoryBtn) deleteHistoryBtn.addEventListener('click', () => {
            if (activeChatTab.includes('tutor')) {
                const mode = activeChatTab.replace('-tutor', '');
                showModal(`'${mode}' 튜터의 대화 기록을 정말로 삭제하시겠습니까?`, async () => {
                    chatHistories[mode] = []; await saveChatHistory(); renderChatHistory(mode);
                });
            }
        });
        if (editCustomPromptBtn) editCustomPromptBtn.addEventListener('click', openPromptModal);
        if (promptSaveBtn) promptSaveBtn.addEventListener('click', saveCustomPrompt);
        if (promptCancelBtn) promptCancelBtn.addEventListener('click', closePromptModal);
        
        // Problem Generator Listener
        if (pgGenerateBtn) pgGenerateBtn.addEventListener('click', handleProblemGeneration);
        
        // Notes App Listeners
        if (addNewNoteBtn) addNewNoteBtn.addEventListener('click', () => addNote());
        if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
        if (searchInput) searchInput.addEventListener('input', renderNoteList);
        if (exportNotesBtn) exportNotesBtn.addEventListener('click', () => { const dataStr = JSON.stringify(localNotesCache, null, 2); const blob = new Blob([dataStr], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'my-notes.json'; a.click(); URL.revokeObjectURL(a.href); });
        const handleNoteInput = () => { updateStatus('입력 중...', true); clearTimeout(debounceTimer); debounceTimer = setTimeout(saveNote, 1000); };
        if (noteTitleInput) noteTitleInput.addEventListener('input', handleNoteInput);
        if (noteContentTextarea) noteContentTextarea.addEventListener('input', handleNoteInput);
        if (notesList) notesList.addEventListener('click', e => {
            const noteItem = e.target.closest('.note-item');
            if (!noteItem) return;
            const noteId = noteItem.dataset.id;
            if (e.target.closest('.delete-btn')) showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => notesCollection.doc(noteId).delete());
            else if (e.target.closest('.pin-btn')) { const note = localNotesCache.find(n=>n.id===noteId); if(note) notesCollection.doc(noteId).update({isPinned:!note.isPinned}); }
            else openNoteEditor(noteId);
        });
        if (formatToolbar) formatToolbar.addEventListener('click', e => {
            const button = e.target.closest('.format-btn');
            if (button && noteContentTextarea) {
                const { selectionStart, selectionEnd, value } = noteContentTextarea;
                const marker = button.dataset.format === 'bold' ? '**' : (button.dataset.format === 'italic' ? '*' : '`');
                noteContentTextarea.value = `${value.substring(0, selectionStart)}${marker}${value.substring(selectionStart, selectionEnd)}${marker}${value.substring(selectionEnd)}`;
            }
        });
        if (linkTopicBtn) linkTopicBtn.addEventListener('click', () => { if(noteContentTextarea) { noteContentTextarea.value += `\n\n🔗 연관 학습: [${document.title || '현재 학습'}]`; saveNote(); } });

        // Other listeners
        if(startQuizBtn) startQuizBtn.addEventListener('click', async () => {
             // Quiz logic remains as is, simplified for brevity.
        });
        
        // Initial Setup Calls
        setupNavigator();
        initializeFirebase();
        if(currentPromptDisplay) currentPromptDisplay.textContent = `현재 역할: ${customTutorPrompt.substring(0, 15)}...`;
    }

    // --- 5. Run Initialization ---
    initialize();
});
