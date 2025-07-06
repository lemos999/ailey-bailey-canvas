/*
--- Ailey & Bailey Canvas ---
File: script.js
Version: 6.3 (Upgraded Navigation Scanner)
Architect: [Username] & System Architect Ailey
Description: Upgraded the navigation scanner to include list-based subheadings
from the main content for a richer ToC.
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
    const chatModeSelector = document.getElementById('chat-mode-selector');
    const deleteHistoryBtn = document.getElementById('delete-history-btn');
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
    const editCustomPromptBtn = document.getElementById('edit-custom-prompt-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    const notesAppToggleBtn = document.getElementById('notes-app-toggle-btn');

    // --- 2. State Management ---
    let db, notesCollection, chatCollectionRef;
    let currentUser = null;
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'AileyBailey_Global_Space';
    let storageKey = 'learningNote-' + (document.title || 'default-page');
    let localNotesCache = [];
    let currentNoteId = null;
    let unsubscribeFromNotes = null;
    let debounceTimer = null;
    let chatHistories = { default: [], socratic: [], interview: [], custom: [] };
    let selectedMode = 'default';
    let customPrompt = localStorage.getItem('customTutorPrompt') || '너는 AI 튜터야. 사용자의 모든 질문에 답변해줘.';
    let unsubscribeFromChat = null;
    let currentQuizData = null;

    // --- 3. Function Definitions (in logical order) ---

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
            if (chatMessages) chatMessages.innerHTML = '<div>AI 튜터 연결에 실패했습니다.</div>';
        }
    }

    // UI & Utilities
    function updateClock() {
        if (!clockElement) return;
        const now = new Date();
        const options = { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
        clockElement.textContent = now.toLocaleString('ko-KR', options);
    }
    
    function initializeTooltips() {
        // For .keyword-chip elements
        const keywordChips = document.querySelectorAll('.keyword-chip');
        keywordChips.forEach(chip => {
            const tooltipText = chip.dataset.tooltip;
            if (tooltipText) {
                chip.classList.add('has-tooltip');
                const tooltipElement = chip.querySelector('.tooltip');
                if (tooltipElement) {
                    tooltipElement.textContent = tooltipText;
                }
            }
        });

        // For inline <strong> elements
        const inlineHighlights = document.querySelectorAll('.content-section strong[data-tooltip]');
        inlineHighlights.forEach(highlight => {
            const tooltipText = highlight.dataset.tooltip;
            if(tooltipText && !highlight.querySelector('.tooltip')) {
                 highlight.classList.add('has-tooltip');
                 const tooltipElement = document.createElement('span');
                 tooltipElement.className = 'tooltip';
                 tooltipElement.textContent = tooltipText;
                 highlight.appendChild(tooltipElement);
            }
        });
    }

    function makePanelDraggable(panelElement) {
        if(!panelElement) return;
        const header = panelElement.querySelector('.panel-header');
        if(!header) return;
        let isDragging = false, offset = { x: 0, y: 0 };
        const onMouseMove = (e) => { if (isDragging) { panelElement.style.left = (e.clientX + offset.x) + 'px'; panelElement.style.top = (e.clientY + offset.y) + 'px'; } };
        const onMouseUp = () => { 
            isDragging = false; 
            panelElement.classList.remove('is-dragging');
            document.removeEventListener('mousemove', onMouseMove); 
            document.removeEventListener('mouseup', onMouseUp); 
        };
        header.addEventListener('mousedown', e => {
            if (e.target.closest('button, input, .close-btn, #delete-history-btn, #chat-mode-selector')) return;
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

    /* --- MODIFIED: UPGRADED NAVIGATION SCANNER --- */
    function setupNavigator() {
        const scrollNav = document.getElementById('scroll-nav');
        if (!scrollNav || !learningContent) return;
        
        // Upgraded selector to include h2 and specific li > strong elements as headers
        const headers = learningContent.querySelectorAll('h2, #section-3 ul li > strong');
        
        if (headers.length === 0) {
            scrollNav.style.display = 'none';
            if(wrapper) wrapper.classList.add('toc-hidden');
            return;
        }
        scrollNav.style.display = 'block';
        if(wrapper) wrapper.classList.remove('toc-hidden');

        const navList = document.createElement('ul');
        headers.forEach((header, index) => {
            // Determine the actual element to set the ID on (the h2's parent div, or the li)
            let targetElement;
            let isSubheading = false;
            if (header.tagName === 'H2') {
                targetElement = header.closest('.content-section');
            } else { // It's a STRONG tag inside an LI
                targetElement = header.closest('li');
                isSubheading = true;
            }

            if (targetElement && !targetElement.id) {
                targetElement.id = `nav-target-${index}`;
            }
            
            if (targetElement) {
                const listItem = document.createElement('li');
                const link = document.createElement('a');
                
                let navText = header.textContent.trim();
                const maxLen = 25;
                if (navText.length > maxLen) {
                    navText = navText.substring(0, maxLen - 3) + '...';
                }
                link.textContent = navText;
                link.href = `#${targetElement.id}`;

                if (isSubheading) {
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
            const targetElement = header.tagName === 'H2' ? header.closest('.content-section') : header.closest('li');
            if (targetElement) {
                observer.observe(targetElement);
            }
        });
    }
    /* --- END OF MODIFICATION --- */


    // Modals
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
        modalConfirmBtn.onclick = () => { onConfirm(); customModal.style.display = 'none'; };
        modalCancelBtn.onclick = () => { customModal.style.display = 'none'; };
    }

    // Chat
    function generateTutorPrompt(mode, query) {
        let basePrompt = "";
        switch(mode) {
            case 'socratic': basePrompt = "너는 소크라테스야. 사용자의 질문에 직접 답하지 말고, 계속해서 질문을 던져 사용자가 스스로 답을 찾도록 유도해줘."; break;
            case 'interview': basePrompt = "너는 압박 면접관이야. 사용자의 답변에 대해 날카롭게 꼬리 질문을 던져줘."; break;
            case 'custom': basePrompt = customPrompt; break;
            default: basePrompt = "너는 '에일리'와 '베일리'라는 두 인격을 가진 AI 튜터야. 먼저 다정한 코치 '에일리'가 되어 사용자의 질문에 친절하게 답해줘(😊 이모지 사용). 그 다음, 답변과 관련된 비판적 사고를 유도하는 날카로운 질문을 '베일리'가 되어 던져줘(😎, 😒 이모지 사용). 에일리의 답변과 베일리의 질문은 반드시 ---CHALLENGE--- 문자열로 구분해야 해.";
        }
        const toneMandate = "너는 지금부터 친한 친구에게 말하는 것처럼, 반드시 친근한 반말(informal Korean)으로만 대화해야 해. '안녕하세요' 같은 존댓말은 절대 사용하면 안 돼.";
        return `${basePrompt} ${toneMandate} 다음 질문에 답변해줘: "${query}"`;
    }
    async function handleChatSend() {
        if (!chatInput || !chatSendBtn) return;
        const userQuery = chatInput.value.trim();
        if (!userQuery) return;
        chatInput.disabled = true;
        chatSendBtn.disabled = true;

        const currentHistory = chatHistories[selectedMode] || [];
        currentHistory.push({ role: 'user', content: userQuery, timestamp: new Date().toISOString() });
        renderChatHistory(selectedMode);
        
        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'chat-message ai';
        aiMessageDiv.innerHTML = '<div class="loading-indicator">AI가 답변을 생성하고 있습니다...</div>';
        if(chatMessages) chatMessages.appendChild(aiMessageDiv);

        const apiKey = ""; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{ role: "user", parts: [{ text: generateTutorPrompt(selectedMode, userQuery) }] }]
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            const result = await response.json();
            
            let aiResponse = "죄송해요, 답변을 생성하는 데 문제가 발생했어요. 😥";
            if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
                aiResponse = result.candidates[0].content.parts[0].text;
            }
            
            const [aileyPart, baileyPart] = aiResponse.split('---CHALLENGE---');
            currentHistory.push({ role: 'ai', content: aileyPart.trim(), timestamp: new Date().toISOString() });
            if (baileyPart) {
                currentHistory.push({ role: 'bailey', content: baileyPart.trim(), timestamp: new Date().toISOString() });
            }
            await saveChatHistory();
            renderChatHistory(selectedMode);
        } catch (error) {
            console.error("AI API Error:", error);
            currentHistory.push({ role: 'ai', content: `오류가 발생했습니다: ${error.message}`, timestamp: new Date().toISOString() });
            renderChatHistory(selectedMode);
        } finally {
            chatInput.disabled = false;
            chatSendBtn.disabled = false;
            chatInput.value = '';
            chatInput.style.height = 'auto';
            chatInput.focus();
        }
    }
    function renderChatHistory(mode) {
        if (!chatMessages) return;
        chatMessages.innerHTML = '';
        const history = chatHistories[mode] || [];
        history.forEach(msg => {
            const msgDiv = document.createElement('div');
            msgDiv.className = `chat-message ${msg.role}`;
            if(msg.role === 'bailey') msgDiv.classList.add('ai', 'bailey-challenge');
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
                sendToNoteBtn.className = 'send-to-note-btn';
                sendToNoteBtn.textContent = '메모로 보내기';
                sendToNoteBtn.onclick = (e) => {
                    addNote(`[AI 튜터] ${msg.content}`);
                    e.target.textContent = '✅';
                    e.target.disabled = true;
                };
                contentDiv.appendChild(sendToNoteBtn);
            }
            chatMessages.appendChild(msgDiv);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    async function listenToChatHistory() {
        if (!chatCollectionRef) return;
        if (unsubscribeFromChat) unsubscribeFromChat();
        unsubscribeFromChat = chatCollectionRef.onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                chatHistories = { ...{ default: [], socratic: [], interview: [], custom: [] }, ...data };
            } else {
                chatHistories = { default: [], socratic: [], interview: [], custom: [] };
            }
            renderChatHistory(selectedMode);
        }, error => console.error("Chat history listener error:", error));
    }
    async function saveChatHistory() {
        if (chatCollectionRef) {
            try { await chatCollectionRef.set(chatHistories); } 
            catch (error) { console.error("Failed to save chat history:", error); }
        }
    }

    // Notes
    function listenToNotes() {
        if (!notesCollection) return;
        if (unsubscribeFromNotes) unsubscribeFromNotes();
        unsubscribeFromNotes = notesCollection.onSnapshot(snapshot => {
            localNotesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderNoteList();
        }, error => { console.error("노트 실시간 수신 오류:", error); });
    }
    function renderNoteList() {
        if (!notesList || !searchInput) return;
        const searchTerm = searchInput.value.toLowerCase();
        const filteredNotes = localNotesCache.filter(note => (note.title && note.title.toLowerCase().includes(searchTerm)) || (note.content && note.content.toLowerCase().includes(searchTerm)));
        filteredNotes.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0);
        });
        notesList.innerHTML = '';
        if (filteredNotes.length === 0) {
            notesList.innerHTML = '<div>표시할 메모가 없습니다.</div>';
            return;
        }
        filteredNotes.forEach(note => {
            const item = document.createElement('div');
            item.className = 'note-item';
            item.dataset.id = note.id;
            if (note.isPinned) item.classList.add('pinned');
            const date = note.updatedAt ? new Date(note.updatedAt.toMillis()).toLocaleString() : '날짜 없음';
            item.innerHTML = `<div class="note-item-content"><div class="note-item-title">${note.title || '무제'}</div><div class="note-item-date">${date}</div></div><div class="note-item-actions"><button class="item-action-btn pin-btn ${note.isPinned ? 'pinned-active' : ''}" title="고정">${note.isPinned ? '📌' : '📍'}</button><button class="item-action-btn delete-btn" title="삭제">🗑️</button></div>`;
            notesList.appendChild(item);
        });
    }
    async function addNote(initialContent = '') {
        if (!notesCollection) return;
        try {
            const newNoteRef = await notesCollection.add({
                title: '새 메모', content: initialContent, isPinned: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            openNoteEditor(newNoteRef.id);
        } catch (error) { console.error("새 메모 추가 실패:", error); }
    }
    function saveNote() {
        if (debounceTimer) clearTimeout(debounceTimer);
        if (!currentNoteId || !notesCollection) return;
        const noteData = { title: noteTitleInput.value, content: noteContentTextarea.value, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
        notesCollection.doc(currentNoteId).update(noteData).then(() => updateStatus('저장됨 ✓', true)).catch(error => { console.error("메모 저장 실패:", error); updateStatus('저장 실패 ❌', false); });
    }
    function handleDeleteRequest(noteId) {
        showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => {
            if (notesCollection) notesCollection.doc(noteId).delete().catch(error => console.error("메모 삭제 실패:", error));
        });
    }
    async function togglePin(noteId) {
        if (!notesCollection) return;
        const note = localNotesCache.find(n => n.id === noteId);
        if (note) await notesCollection.doc(noteId).update({ isPinned: !note.isPinned });
    }
    function exportNotes() {
        const dataStr = JSON.stringify(localNotesCache, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'my-notes.json'; a.click();
        URL.revokeObjectURL(url);
    }
    function switchView(viewName) {
        if (viewName === 'editor') {
            if(noteListView) noteListView.classList.remove('active');
            if(noteEditorView) noteEditorView.classList.add('active');
        } else {
            if(noteEditorView) noteEditorView.classList.remove('active');
            if(noteListView) noteListView.classList.add('active');
            currentNoteId = null;
        }
    }
    function openNoteEditor(noteId) {
        const note = localNotesCache.find(n => n.id === noteId);
        if (note && noteTitleInput && noteContentTextarea) {
            currentNoteId = noteId;
            noteTitleInput.value = note.title || '';
            noteContentTextarea.value = note.content || '';
            switchView('editor');
        }
    }
    function updateStatus(message, success) {
        if (!autoSaveStatus) return;
        autoSaveStatus.textContent = message;
        autoSaveStatus.style.color = success ? 'lightgreen' : 'lightcoral';
        setTimeout(() => { autoSaveStatus.textContent = ''; }, 2000);
    }
    function applyFormat(format) {
        if (!noteContentTextarea) return;
        const start = noteContentTextarea.selectionStart;
        const end = noteContentTextarea.selectionEnd;
        const selectedText = noteContentTextarea.value.substring(start, end);
        const marker = format === 'bold' ? '**' : (format === 'italic' ? '*' : '`');
        const newText = `${noteContentTextarea.value.substring(0, start)}${marker}${selectedText}${marker}${noteContentTextarea.value.substring(end)}`;
        noteContentTextarea.value = newText;
        noteContentTextarea.focus();
    }
    
    // Quiz
    async function startQuiz() {
        if (!quizModalOverlay) return;
        const keywords = Array.from(document.querySelectorAll('.keyword-chip')).map(k => k.textContent.trim()).join(', ');
        if (!keywords) { 
            showModal("퀴즈를 생성할 키워드가 없습니다.", () => { if(quizModalOverlay) quizModalOverlay.style.display = 'none'; });
            return;
        }
        const prompt = `다음 키워드들을 기반으로 객관식 퀴즈 3개를 생성해줘: ${keywords}. 각 문제는 4개의 선택지를 가져야 해. 출력 형식은 반드시 아래 JSON 포맷을 따라야 하며, 다른 설명은 절대 추가하지 마.\n\n{"questions": [{"question": "...", "options": [...], "answer": "..."}, ...]}`;
        if (quizContainer) quizContainer.innerHTML = '<div class="loading-indicator">퀴즈를 생성 중입니다...</div>';
        if (quizResults) quizResults.innerHTML = '';
        quizModalOverlay.style.display = 'flex';
        try {
            const aiResponse = await new Promise(resolve => setTimeout(() => resolve(JSON.stringify({
                "questions": [
                    {"question": "(e.g)정조가 젊은 인재를 양성하고 정책을 연구하기 위해 설립한 개혁의 핵심 기구는 무엇인가요?", "options": ["집현전", "장용영", "규장각", "성균관"], "answer": "규장각"},
                    {"question": "(e.g)정조가 상인들의 독점권을 폐지하고 자유로운 상업 활동을 보장한 경제 정책은 무엇인가요?", "options": ["과전법", "대동법", "균역법", "신해통공"], "answer": "신해통공"},
                    {"question": "(e.g)정조의 효심과 개혁 의지가 담겨 있으며, 정약용의 거중기 등 최신 과학 기술이 동원된 건축물은 무엇인가요?", "options": ["경복궁", "창덕궁", "수원 화성", "남한산성"], "answer": "수원 화성"}
                ]
            })), 1000));
            currentQuizData = JSON.parse(aiResponse);
            renderQuiz(currentQuizData);
        } catch (e) {
            if (quizContainer) quizContainer.innerHTML = '퀴즈 생성에 실패했습니다. 다시 시도해주세요.';
            console.error("Invalid quiz JSON", e);
        }
    }
    function renderQuiz(data) {
        if (!quizContainer || !data || !data.questions) return;
        quizContainer.innerHTML = '';
        data.questions.forEach((q, index) => {
            const questionBlock = document.createElement('div');
            questionBlock.className = 'quiz-question-block';
            const questionText = document.createElement('p');
            questionText.textContent = `${index + 1}. ${q.question}`;
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'quiz-options';
            q.options.forEach(option => {
                const label = document.createElement('label');
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = `question-${index}`;
                radio.value = option;
                label.appendChild(radio);
                label.appendChild(document.createTextNode(` ${option}`));
                optionsDiv.appendChild(label);
            });
            questionBlock.appendChild(questionText);
            questionBlock.appendChild(optionsDiv);
            quizContainer.appendChild(questionBlock);
        });
    }

    // --- 4. Global Initialization ---
    function initialize() {
        if (!body || !wrapper) {
            console.error("Core layout elements not found. Initialization aborted.");
            return;
        }
        
        // Clock
        updateClock();
        setInterval(updateClock, 1000);

        // Tooltips
        initializeTooltips();
        
        // Draggable Panels
        makePanelDraggable(chatPanel);
        makePanelDraggable(notesAppPanel);

        // Event Listeners
        if (themeToggle) themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            themeToggle.textContent = body.classList.contains('dark-mode') ? '☀️' : '🌙';
        });
        if (tocToggleBtn) tocToggleBtn.addEventListener('click', () => {
            wrapper.classList.toggle('toc-hidden');
            clockElement.classList.toggle('tucked');
        });
        if (chatToggleBtn) chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));
        if (chatPanel) chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));
        if (notesAppToggleBtn) notesAppToggleBtn.addEventListener('click', () => togglePanel(notesAppPanel));
        if (chatForm) chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });
        if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } });
        if (deleteHistoryBtn) deleteHistoryBtn.addEventListener('click', async () => {
            showModal(`'${selectedMode}' 모드의 대화 기록을 정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`, async () => {
                chatHistories[selectedMode] = [];
                await saveChatHistory();
                renderChatHistory(selectedMode);
            });
        });
        if (promptSaveBtn) promptSaveBtn.addEventListener('click', saveCustomPrompt);
        if (promptCancelBtn) promptCancelBtn.addEventListener('click', closePromptModal);
        if (startQuizBtn) startQuizBtn.addEventListener('click', startQuiz);
        if (quizSubmitBtn) quizSubmitBtn.addEventListener('click', () => {
            if (!currentQuizData || !quizResults) return;
            let score = 0;
            let allAnswered = true;
            currentQuizData.questions.forEach((q, index) => {
                const selected = document.querySelector(`input[name="question-${index}"]:checked`);
                if (!selected) { allAnswered = false; }
            });
            if (!allAnswered) {
                quizResults.textContent = "모든 문제에 답해주세요!";
                quizResults.style.color = 'orange';
                return;
            }
            currentQuizData.questions.forEach((q, index) => {
                const selected = document.querySelector(`input[name="question-${index}"]:checked`);
                const questionBlock = document.querySelectorAll('.quiz-question-block')[index];
                const labels = questionBlock.querySelectorAll('label');
                labels.forEach(label => {
                    const radio = label.querySelector('input');
                    if (radio.value === q.answer) {
                        label.style.color = 'lightgreen';
                        label.style.fontWeight = 'bold';
                    }
                    if (radio.checked && radio.value !== q.answer) {
                        label.style.color = 'lightcoral';
                    }
                });
                if (selected.value === q.answer) { score++; }
            });
            quizResults.textContent = `결과: ${currentQuizData.questions.length}문제 중 ${score}개를 맞혔습니다!`;
            quizResults.style.color = score === currentQuizData.questions.length ? 'lightgreen' : 'orange';
        });
        if(quizModalOverlay) quizModalOverlay.addEventListener('click', (e) => {
            if (e.target === quizModalOverlay) {
                quizModalOverlay.style.display = 'none';
            }
        });

        // Notes App Listeners
        if (addNewNoteBtn) addNewNoteBtn.addEventListener('click', () => addNote());
        if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
        if (searchInput) searchInput.addEventListener('input', renderNoteList);
        if (exportNotesBtn) exportNotesBtn.addEventListener('click', exportNotes);
        const handleInput = () => {
            updateStatus('입력 중...', true);
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(saveNote, 1000);
        };
        if (noteTitleInput) noteTitleInput.addEventListener('input', handleInput);
        if (noteContentTextarea) noteContentTextarea.addEventListener('input', handleInput);
        if (notesList) notesList.addEventListener('click', e => {
            const noteItem = e.target.closest('.note-item');
            if (!noteItem) return;
            const noteId = noteItem.dataset.id;
            if (e.target.closest('.delete-btn')) handleDeleteRequest(noteId);
            else if (e.target.closest('.pin-btn')) togglePin(noteId);
            else openNoteEditor(noteId);
        });
        if (formatToolbar) formatToolbar.addEventListener('click', e => {
            const button = e.target.closest('.format-btn');
            if (button) applyFormat(button.dataset.format);
        });
        if (linkTopicBtn) linkTopicBtn.addEventListener('click', () => {
            if(!noteContentTextarea) return;
            const topicTitle = document.title || '현재 학습';
            const linkText = `\n\n🔗 연관 학습: [${topicTitle}]`;
            noteContentTextarea.value += linkText;
            saveNote();
        });
        if (chatModeSelector) chatModeSelector.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button && button.dataset.mode) {
                selectedMode = button.dataset.mode;
                chatModeSelector.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                if (selectedMode === 'custom') {
                    openPromptModal();
                }
                renderChatHistory(selectedMode);
            }
        });
        if (editCustomPromptBtn) editCustomPromptBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openPromptModal();
        });

        // Initial Setup Calls
        setupNavigator();
        initializeFirebase();
    }

    // --- 5. Run Initialization ---
    initialize();
});
