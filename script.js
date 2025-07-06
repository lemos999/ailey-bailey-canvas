/*
--- Ailey & Bailey Canvas ---
File: script.js
Version: 8.0 (GitHub Data-Driven Canvas)
Architect: [Username] & System Architect Ailey
Description: Major architectural overhaul. This script now acts as a dynamic rendering engine.
- Implemented `renderPageContent` to build the learning UI from a JSON object provided by the AI.
- Integrated Firebase for the "AI Tutor" chat, enabling persistent, multi-session conversation history with a delete function.
- Added a `selection-popover` menu that appears on text selection for quick actions (Ask AI, Add to Note).
- Implemented a selection mode in the "Knowledge Lab" (Notes App) for multi-item deletion.
- Enhanced `setupNavigator` to build ToC from dynamically rendered H2 and H3 headers.
- Updated UI element names and icons as per user request.
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
    const chatPanel = document.getElementById('chat-panel');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    const chatModeSelector = document.getElementById('chat-mode-selector');
    const deleteHistoryBtn = document.getElementById('delete-history-btn');
    const notesAppPanel = document.getElementById('notes-app-panel');
    const notesAppToggleBtn = document.getElementById('notes-app-toggle-btn');
    const noteListView = document.getElementById('note-list-view');
    const noteEditorView = document.getElementById('note-editor-view');
    const notesList = document.getElementById('notes-list');
    const noteTitleInput = document.getElementById('note-title-input');
    const noteContentTextarea = document.getElementById('note-content-textarea');
    const autoSaveStatus = document.getElementById('auto-save-status');
    const listHeader = document.querySelector('#note-list-view .list-header');
    const headerButtonGroup = document.querySelector('#note-list-view .panel-header .header-button-group');
    const customModal = document.getElementById('custom-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const promptModalOverlay = document.getElementById('prompt-modal-overlay');
    const customPromptInput = document.getElementById('custom-prompt-input');
    const promptSaveBtn = document.getElementById('prompt-save-btn');
    const promptCancelBtn = document.getElementById('prompt-cancel-btn');
    const themeToggle = document.getElementById('theme-toggle');

    // --- 2. State Management ---
    let db, notesCollection, chatCollectionRef;
    let currentUser = null;
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'AileyBailey_Global_Space';
    let storageKey = 'learningSession-' + (document.title || 'default-page').replace(/\s+/g, '_');
    let localNotesCache = [];
    let currentNoteId = null;
    let unsubscribeFromNotes = null;
    let debounceTimer = null;
    let isNoteSelectionMode = false;

    // Chat State
    let chatHistories = { ailey_coaching: [], deep_learning: [], custom: [] };
    let selectedMode = 'ailey_coaching';
    let customPrompt = localStorage.getItem('customTutorPrompt') || '너는 AI 튜터야. 사용자의 모든 질문에 답변해줘.';
    let unsubscribeFromChat = null;
    let chatQuizState = 'idle'; 
    let lastQuestion = ''; 

    // --- 3. Function Definitions ---

    // Firebase & Cloud Sync
    async function initializeFirebase() {
        try {
            const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
            const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
            if (!firebaseConfig) { throw new Error("Firebase config not found."); }
            if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
            db = firebase.firestore();
            const auth = firebase.auth();
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
                chatCollectionRef = db.collection(`artifacts/${appId}/users/${currentUser.uid}/chatHistories`).doc(storageKey);
                listenToNotes();
                listenToChatHistory();
            }
        } catch (error) {
            console.error("Firebase 초기화 또는 인증 실패:", error);
            if (notesList) notesList.innerHTML = "<div>클라우드 '지식 발전소'를 불러오는 데 실패했습니다.</div>";
            if (chatMessages) chatMessages.innerHTML = '<div>AI 튜터 연결에 실패했습니다.</div>';
        }
    }

    // Dynamic Content Rendering Engine
    function parseTooltipSyntax(text) {
        if (!text) return '';
        return text.replace(/{([^}]+?)\|([^}]+?)}/g, '<strong class="has-tooltip" data-tooltip="$2">$1</strong>');
    }

    function renderPageContent(jsonData) {
        if (!learningContent || !jsonData) return;
        
        learningContent.innerHTML = '';
        document.title = jsonData.title || 'Ailey & Bailey Canvas';

        const header = document.createElement('div');
        header.className = 'header';
        header.innerHTML = `<h1>${jsonData.title}</h1><p class="subtitle">${jsonData.subtitle}</p>`;
        learningContent.appendChild(header);

        jsonData.sections.forEach(section => {
            const sectionEl = document.createElement('div');
            sectionEl.id = section.id;
            sectionEl.className = 'content-section';
            
            const titleEl = document.createElement(section.type === 'content' && section.content[0]?.type === 'h3' ? 'h3' : 'h2');
            titleEl.innerHTML = parseTooltipSyntax(section.title);
            sectionEl.appendChild(titleEl);

            switch (section.type) {
                case 'quote':
                    sectionEl.innerHTML += `<blockquote>${parseTooltipSyntax(section.content)}</blockquote>`;
                    break;
                case 'keywords':
                    const keywordList = document.createElement('div');
                    keywordList.className = 'keyword-list';
                    section.content.forEach(kw => {
                        keywordList.innerHTML += `<span class="keyword-chip" data-tooltip="${kw.tooltip}">${kw.term}</span>`;
                    });
                    sectionEl.appendChild(keywordList);
                    break;
                case 'content':
                    section.content.forEach(item => {
                        let itemEl;
                        if (item.type === 'ul') {
                            itemEl = document.createElement('ul');
                            item.items.forEach(li => {
                                const liEl = document.createElement('li');
                                liEl.innerHTML = parseTooltipSyntax(li);
                                itemEl.appendChild(liEl);
                            });
                        } else {
                            itemEl = document.createElement(item.type); // h3, p
                            itemEl.innerHTML = parseTooltipSyntax(item.text);
                        }
                        sectionEl.appendChild(itemEl);
                    });
                    break;
                case 'timeline':
                case 'glossary':
                    const listEl = document.createElement('ul');
                    section.content.forEach(item => {
                        const liEl = document.createElement('li');
                        liEl.innerHTML = `<strong>${item.year || item.term}:</strong> ${parseTooltipSyntax(item.event || item.definition)}`;
                        listEl.appendChild(liEl);
                    });
                    sectionEl.appendChild(listEl);
                    break;
            }
            learningContent.appendChild(sectionEl);
        });
        
        setupNavigator();
        initializeTooltips();
    }

    // UI & Utilities
    function updateClock() {
        if (!clockElement) return;
        const now = new Date();
        const options = { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
        clockElement.textContent = now.toLocaleString('ko-KR', options);
    }
    
    function initializeTooltips() {
        const tooltippedElements = document.querySelectorAll('[data-tooltip]');
        tooltippedElements.forEach(el => {
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

    function setupNavigator() {
        const scrollNav = document.getElementById('scroll-nav');
        if (!scrollNav || !learningContent) return;
        const headers = learningContent.querySelectorAll('h2, h3');
        if (headers.length === 0) {
            if (wrapper) wrapper.classList.add('toc-hidden');
            return;
        }
        if (wrapper) wrapper.classList.remove('toc-hidden');

        const navList = document.createElement('ul');
        headers.forEach((header, index) => {
            const targetElement = header.closest('.content-section');
            if (targetElement) {
                if (!targetElement.id) { targetElement.id = `nav-target-${index}`; }
                const listItem = document.createElement('li');
                const link = document.createElement('a');
                link.textContent = header.textContent.trim();
                link.href = `#${targetElement.id}`;
                if (header.tagName === 'H3') link.classList.add('sub-item');
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
        document.querySelectorAll('.content-section').forEach(section => observer.observe(section));
    }
    
    function showModal(message, onConfirm) {
        if (!customModal || !modalMessage || !modalConfirmBtn || !modalCancelBtn) return;
        modalMessage.textContent = message;
        customModal.style.display = 'flex';
        modalConfirmBtn.onclick = () => { onConfirm(); customModal.style.display = 'none'; };
        modalCancelBtn.onclick = () => { customModal.style.display = 'none'; };
    }

    // Selection Popover
    function setupSelectionPopover() {
        document.addEventListener('mouseup', e => {
            if (e.target.closest('#selection-popover')) return;
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            if (selectedText.length > 0 && selectedText.length < 500) { // Limit length
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                selectionPopover.style.left = `${rect.left + window.scrollX + rect.width / 2 - selectionPopover.offsetWidth / 2}px`;
                selectionPopover.style.top = `${rect.top + window.scrollY - selectionPopover.offsetHeight - 10}px`;
                selectionPopover.style.display = 'flex';
            } else {
                selectionPopover.style.display = 'none';
            }
        });

        document.addEventListener('mousedown', e => {
            if (!selectionPopover.contains(e.target)) {
                selectionPopover.style.display = 'none';
            }
        });
        
        popoverAskAi.addEventListener('click', () => {
            const selectedText = window.getSelection().toString().trim();
            if(selectedText) {
                togglePanel(chatPanel, true);
                chatInput.value = `이 내용에 대해 더 자세히 알려줘: "${selectedText}"`;
                chatInput.focus();
                chatInput.style.height = 'auto';
                chatInput.style.height = (chatInput.scrollHeight) + 'px';
            }
            selectionPopover.style.display = 'none';
        });

        popoverAddNote.addEventListener('click', () => {
            const selectedText = window.getSelection().toString().trim();
            if (selectedText) {
                addNote(`- ${selectedText}`);
            }
            selectionPopover.style.display = 'none';
        });
    }

    // AI Tutor Chat
    async function listenToChatHistory() {
        if (!chatCollectionRef) return;
        if (unsubscribeFromChat) unsubscribeFromChat();
        unsubscribeFromChat = chatCollectionRef.onSnapshot(doc => {
            const defaultHistories = { ailey_coaching: [], deep_learning: [], custom: [] };
            if (doc.exists) {
                chatHistories = { ...defaultHistories, ...doc.data() };
            } else {
                chatHistories = defaultHistories;
            }
            renderChatHistory(selectedMode);
        }, error => console.error("Chat history listener error:", error));
    }
    
    async function saveChatHistory() {
        if (chatCollectionRef) {
            try { await chatCollectionRef.set(chatHistories, { merge: true }); } 
            catch (error) { console.error("Failed to save chat history:", error); }
        }
    }
    
    function renderChatHistory(mode) {
        if (!chatMessages) return;
        chatMessages.innerHTML = '';
        const history = chatHistories[mode] || [];
        history.forEach(msg => {
            const msgDiv = document.createElement('div');
            msgDiv.className = `chat-message ${msg.role === 'user' ? 'user' : 'ai'}`;
            const contentDiv = document.createElement('div');
            contentDiv.innerHTML = msg.content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');
            msgDiv.appendChild(contentDiv);
            if (msg.timestamp) {
                const timeDiv = document.createElement('div');
                timeDiv.className = 'chat-timestamp';
                timeDiv.textContent = new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                msgDiv.appendChild(timeDiv);
            }
            chatMessages.appendChild(msgDiv);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
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
        chatInput.value = '';
        chatInput.style.height = 'auto';

        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'chat-message ai';
        aiMessageDiv.innerHTML = '<div class="loading-indicator">AI가 생각 중...</div>';
        if (chatMessages) {
            chatMessages.appendChild(aiMessageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        try {
            // Placeholder for actual AI call. Replace with your AI logic.
            const aiResponse = `"${userQuery}"에 대한 답변입니다. (시뮬레이션)`;
            
            currentHistory.push({ role: 'ai', content: aiResponse, timestamp: new Date().toISOString() });
            await saveChatHistory();
            renderChatHistory(selectedMode);
        } catch (error) {
            console.error("AI API Error:", error);
            currentHistory.push({ role: 'ai', content: `오류가 발생했습니다: ${error.message}`, timestamp: new Date().toISOString() });
            await saveChatHistory();
            renderChatHistory(selectedMode);
        } finally {
            chatInput.disabled = false;
            chatSendBtn.disabled = false;
            chatInput.focus();
        }
    }
    
    function setupChatModeSelector() {
        if (!chatModeSelector) return;
        chatModeSelector.innerHTML = '';
        const modes = [
            { id: 'ailey_coaching', text: '기본 코칭 💬' },
            { id: 'deep_learning', text: '심화 학습 🧠' },
            { id: 'custom', text: '커스텀 ⚙️' }
        ];

        modes.forEach(mode => {
            const button = document.createElement('button');
            button.dataset.mode = mode.id;
            button.innerHTML = mode.text;
            if (mode.id === selectedMode) button.classList.add('active');
            
            button.addEventListener('click', () => {
                selectedMode = mode.id;
                chatModeSelector.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                if (selectedMode === 'custom') {
                    if (promptModalOverlay) promptModalOverlay.style.display = 'flex';
                    if (customPromptInput) customPromptInput.value = customPrompt;
                }
                renderChatHistory(selectedMode);
            });
            chatModeSelector.appendChild(button);
        });
    }

    // Knowledge Lab (Notes App)
    function listenToNotes() {
        if (!notesCollection) return;
        if (unsubscribeFromNotes) unsubscribeFromNotes();
        unsubscribeFromNotes = notesCollection.onSnapshot(snapshot => {
            localNotesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderNoteList();
        }, error => { console.error("노트 실시간 수신 오류:", error); });
    }

    function renderNoteList() {
        if (!notesList) return;
        const searchInputEl = document.getElementById('search-input');
        const searchTerm = searchInputEl ? searchInputEl.value.toLowerCase() : '';
        const filteredNotes = localNotesCache.filter(note => (note.title && note.title.toLowerCase().includes(searchTerm)) || (note.content && note.content.toLowerCase().includes(searchTerm)));
        filteredNotes.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0);
        });
        notesList.innerHTML = '';
        filteredNotes.forEach(note => {
            const item = document.createElement('div');
            item.className = 'note-item';
            item.dataset.id = note.id;
            if (note.isPinned) item.classList.add('pinned');
            const date = note.updatedAt ? new Date(note.updatedAt.toMillis()).toLocaleString() : '날짜 없음';
            
            item.innerHTML = `
                <input type="checkbox" class="note-item-checkbox" data-id="${note.id}" style="display: ${isNoteSelectionMode ? 'block' : 'none'};">
                <div class="note-item-content">
                    <div class="note-item-title">${note.title || '무제'}</div>
                    <div class="note-item-date">${date}</div>
                </div>
                <div class="note-item-actions">
                    <button class="item-action-btn pin-btn ${note.isPinned ? 'pinned-active' : ''}" title="고정">${note.isPinned ? '📌' : '📍'}</button>
                    <button class="item-action-btn delete-btn" title="삭제">🗑️</button>
                </div>`;
            
            item.querySelector('.note-item-checkbox').addEventListener('change', (e) => {
                item.classList.toggle('selected', e.target.checked);
            });

            const contentPart = item.querySelector('.note-item-content');
            contentPart.addEventListener('click', () => {
                if (!isNoteSelectionMode) {
                    openNoteEditor(note.id);
                } else {
                    const checkbox = item.querySelector('.note-item-checkbox');
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            });
            
            notesList.appendChild(item);
        });
    }

    function toggleNoteSelectionMode(forceExit = false) {
        isNoteSelectionMode = forceExit ? false : !isNoteSelectionMode;
        noteListView.classList.toggle('selection-mode', isNoteSelectionMode);
        
        if (isNoteSelectionMode) {
            listHeader.innerHTML = `
                <div class="selection-controls">
                    <button id="select-all-notes-btn" class="notes-btn">모두 선택</button>
                    <button id="delete-selected-notes-btn" class="notes-btn" style="background-color: #d9534f;">선택 삭제</button>
                </div>`;
            headerButtonGroup.innerHTML = `<button id="cancel-selection-btn" class="notes-btn">취소</button>`;
            
            document.getElementById('select-all-notes-btn').addEventListener('click', () => {
                const checkboxes = notesList.querySelectorAll('.note-item-checkbox');
                const allChecked = Array.from(checkboxes).every(cb => cb.checked);
                checkboxes.forEach(cb => {
                    cb.checked = !allChecked;
                    cb.dispatchEvent(new Event('change'));
                });
            });
            document.getElementById('delete-selected-notes-btn').addEventListener('click', handleDeleteSelectedNotes);
            document.getElementById('cancel-selection-btn').addEventListener('click', () => toggleNoteSelectionMode(true));

        } else {
            listHeader.innerHTML = `<input type="text" id="search-input" placeholder="메모 검색...">`;
            headerButtonGroup.innerHTML = `
                <button id="select-mode-btn" class="notes-btn">선택</button>
                <button id="add-new-note-btn" class="notes-btn">새 메모 +</button>
                <button id="export-notes-btn" class="notes-btn" title="모든 메모 내보내기"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"></path></svg></button>`;
            
            document.getElementById('search-input').addEventListener('input', renderNoteList);
            document.getElementById('select-mode-btn').addEventListener('click', () => toggleNoteSelectionMode());
            document.getElementById('add-new-note-btn').addEventListener('click', () => addNote());
        }
        renderNoteList();
    }

    async function handleDeleteSelectedNotes() {
        const selectedCheckboxes = notesList.querySelectorAll('.note-item-checkbox:checked');
        const idsToDelete = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);

        if (idsToDelete.length === 0) { return; }

        showModal(`${idsToDelete.length}개의 메모를 영구적으로 삭제하시겠습니까?`, async () => {
            const batch = db.batch();
            idsToDelete.forEach(id => {
                batch.delete(notesCollection.doc(id));
            });
            try {
                await batch.commit();
                toggleNoteSelectionMode(true);
            } catch (error) {
                console.error("선택한 메모 삭제 실패:", error);
            }
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
        notesCollection.doc(currentNoteId).update(noteData)
          .then(() => autoSaveStatus.textContent = '저장됨 ✓')
          .catch(error => console.error("메모 저장 실패:", error));
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

    // --- 4. Global Initialization ---
    function initialize() {
        if (!body || !wrapper) { return; }

        initializeFirebase();
        setupSelectionPopover();
        
        if (themeToggle) themeToggle.addEventListener('click', () => { body.classList.toggle('dark-mode'); });
        if (tocToggleBtn) tocToggleBtn.addEventListener('click', () => { wrapper.classList.toggle('toc-hidden'); });
        if (chatToggleBtn) chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));
        if (chatPanel) chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));
        if (notesAppToggleBtn) notesAppToggleBtn.addEventListener('click', () => togglePanel(notesAppPanel));
        if (chatForm) chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });
        
        if (deleteHistoryBtn) deleteHistoryBtn.addEventListener('click', async () => {
            const modeText = chatModeSelector.querySelector(`button[data-mode="${selectedMode}"]`).textContent;
            showModal(`'${modeText}' 모드의 대화 기록을 정말로 삭제하시겠습니까?`, async () => {
                chatHistories[selectedMode] = [];
                await saveChatHistory();
            });
        });
        
        if(promptSaveBtn) promptSaveBtn.addEventListener('click', () => {
            customPrompt = customPromptInput.value;
            localStorage.setItem('customTutorPrompt', customPrompt);
            if (promptModalOverlay) promptModalOverlay.style.display = 'none';
        });
        if(promptCancelBtn) promptCancelBtn.addEventListener('click', () => {
            if (promptModalOverlay) promptModalOverlay.style.display = 'none';
        });

        // Notes App Listeners
        if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
        if (notesList) notesList.addEventListener('click', e => {
            const itemAction = e.target.closest('.item-action-btn');
            if(itemAction) {
                const noteId = itemAction.closest('.note-item').dataset.id;
                if(itemAction.classList.contains('delete-btn')) {
                    showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => {
                        if (notesCollection) notesCollection.doc(noteId).delete();
                    });
                }
                if(itemAction.classList.contains('pin-btn')) {
                    const note = localNotesCache.find(n => n.id === noteId);
                    if (note) notesCollection.doc(noteId).update({ isPinned: !note.isPinned });
                }
            }
        });
        const handleInput = () => {
            autoSaveStatus.textContent = '입력 중...';
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(saveNote, 1500);
        };
        if (noteTitleInput) noteTitleInput.addEventListener('input', handleInput);
        if (noteContentTextarea) noteContentTextarea.addEventListener('input', handleInput);

        toggleNoteSelectionMode(true); // Initialize with default buttons
        makePanelDraggable(chatPanel);
        makePanelDraggable(notesAppPanel);
        updateClock();
        setInterval(updateClock, 1000);
        setupChatModeSelector();

        // For demonstration, a sample JSON can be used to render the page on load
        const sampleJsonData = {
          "title": "선조, 비운의 군주",
          "subtitle": "임진왜란의 위기 속, 그의 선택과 리더십",
          "sections": [
            { "id": "section-1", "title": "🎯 오늘의 학습 목표", "type": "quote", "content": "선조 시대의 복잡한 정치 상황과 임진왜란이라는 거대한 위기 속에서 그가 내린 결정들의 배경과 결과를 이해하고, 그의 리더십에 대한 다양한 평가를 비판적으로 분석할 수 있다." },
            { "id": "section-2", "title": "🔑 핵심 키워드", "type": "keywords", "content": [ { "term": "방계 혈통", "tooltip": "왕의 직계가 아닌 방계 친족의 혈통. 선조는 명종의 양자 자격으로 즉위했다." }, { "term": "붕당 정치", "tooltip": "학문과 정치 성향을 같이하는 관료 집단(붕당)이 서로 견제하며 이끌어가는 정치 형태. 동인과 서인의 대립이 대표적이다." }, { "term": "임진왜란", "tooltip": "1592년 일본의 침략으로 시작되어 7년간 지속된 전쟁." }, { "term": "의병", "tooltip": "나라가 위급할 때, 관군의 소속이 아닌데도 백성들이 스스로 일어나 싸우는 군대." } ] },
            { "id": "section-3", "title": "📖 핵심 원리와 개념", "type": "content", "content": [ { "type": "h3", "text": "왕위 계승의 정통성 문제" }, { "type": "p", "text": "선조는 조선 역사상 처음으로 {방계 혈통|왕의 직계가 아닌 방계 친족의 혈통}으로 왕위에 오른 인물이야. 이는 그에게 평생의 정치적 부담으로 작용했어. 자신의 정통성이 약하다고 생각했기 때문에, 그는 왕권을 강화하고 신하들을 통제하는 데 더욱 집착하게 되었지." }, { "type": "h3", "text": "붕당 정치의 시작과 심화" }, { "type": "p", "text": "선조 시대는 사림 세력이 중앙 정계를 장악하며 {붕당 정치|학문과 정치 성향을 같이하는 관료 집단}가 본격적으로 시작된 시기야. 처음에는 동인과 서인으로 나뉘어 서로를 견제하며 건강한 논쟁을 벌였지만, 점차 대립이 격화되면서 국론 분열의 원인이 되기도 했어." } ] },
            { "id": "section-4", "title": "🧐 최종 핵심 요약", "type": "content", "content": [ { "type": "p", "text": "선조는 방계 출신이라는 정통성 약점과 붕당 정치의 격화, 그리고 임진왜란이라는 최악의 국난을 맞이한 군주였다. 그는 전쟁 준비에 미흡했고, 의주로 피난하며 백성들의 비판을 받았지만, 이순신, 권율 등 유능한 장수들을 등용하고 의병 활동을 독려하여 위기를 극복하는 데 기여한 측면도 있다. 그의 리더십은 오늘날까지도 복합적인 평가를 받고 있다." } ] }
          ]
        };
        renderPageContent(sampleJsonData);
    }

    // --- 5. Run Initialization ---
    initialize();
});
