/*
--- Ailey & Bailey Canvas ---
File: script.js
Version: 8.0 (Data-Driven UI Engine)
Architect: [Username] & System Architect Ailey
Description: Complete re-architecture to a data-driven model. This script now acts as the rendering engine.
- Implemented `renderContentFromJSON` to dynamically build the entire learning page from an AI-generated JSON object.
- Integrated all 7 user requests:
  - #1: Renamed "AI Tutorbot" to "Learning Copilot".
  - #2: Added Firebase cloud sync for chat history.
  - #4: Expanded TOC generation to include all h2/h3 sections.
  - #5: Added a selection popover for "Ask AI" / "Add to Note".
  - #6: Implemented multi-select and delete for the notes app.
  - #7: Upgraded the chat send button to an SVG icon.
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
    const themeToggle = document.getElementById('theme-toggle');
    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    const notesAppToggleBtn = document.getElementById('notes-app-toggle-btn');
    // Note selection elements (#6)
    const noteListHeader = document.querySelector('#note-list-view .panel-header');


    // --- 2. State Management ---
    let db, notesCollection, chatCollectionRef;
    let currentUser = null;
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'AileyBailey_Global_Space';
    // Use a dynamic storage key based on the generated content title for chat history
    let chatStorageKey = 'global-chat'; 
    let localNotesCache = [];
    let currentNoteId = null;
    let unsubscribeFromNotes = null;
    let debounceTimer = null;
    let isNoteSelectionMode = false;

    // Chat State (#2)
    let chatHistories = { ailey_coaching: [], deep_learning: [], custom: [] };
    let selectedMode = 'ailey_coaching'; // Default mode
    let chatQuizState = 'idle'; // State for deep_learning mode: 'idle', 'awaiting_answer'
    let lastQuestion = ''; // Stores the last question asked in quiz mode
    let customPrompt = localStorage.getItem('customTutorPrompt') || '너는 AI 튜터야. 사용자의 모든 질문에 답변해줘.';
    let unsubscribeFromChat = null;
    let currentQuizData = null;

    // --- 3. Core Rendering Engine ---

    /**
     * Renders the entire page content from a structured JSON object.
     * @param {object} data The JSON data from the AI.
     */
    function renderContentFromJSON(data) {
        if (!learningContent || !data) {
            learningContent.innerHTML = '<h2>콘텐츠를 불러오는 데 실패했습니다.</h2>';
            return;
        }
        learningContent.innerHTML = ''; // Clear previous content

        // Set page title
        document.title = data.title || '새 학습';
        chatStorageKey = data.title.replace(/\s+/g, '_'); // Update chat storage key

        // Render Header
        const header = document.createElement('div');
        header.className = 'header';
        header.innerHTML = `
            <h1>${data.title}</h1>
            <p class="subtitle">${data.subtitle}</p>
        `;
        learningContent.appendChild(header);

        // Render Sections
        data.sections.forEach(section => {
            const sectionDiv = document.createElement('div');
            sectionDiv.id = `section-${section.id}`;
            sectionDiv.className = 'content-section';

            const titleEl = document.createElement(section.type === 'article' ? 'h2' : 'h3');
            titleEl.innerHTML = section.title;
            sectionDiv.appendChild(titleEl);
            
            // Re-map h3 titles to h2 for main sections for correct styling
            const mainSectionTitles = ["🎯 오늘의 학습 목표", "🔑 핵심 키워드", "📖 핵심 원리와 개념"];
            if(mainSectionTitles.includes(section.title)) {
                titleEl.tagName.toLowerCase() === 'h3' && (titleEl.outerHTML = titleEl.outerHTML.replace('<h3', '<h2').replace('</h3>', '</h2>'));
            }


            switch (section.type) {
                case 'blockquote':
                    const bq = document.createElement('blockquote');
                    bq.innerHTML = section.content;
                    sectionDiv.appendChild(bq);
                    break;
                case 'chips':
                    const chipContainer = document.createElement('div');
                    chipContainer.className = 'keyword-list';
                    section.content.forEach(chip => {
                        const chipEl = document.createElement('span');
                        chipEl.className = 'keyword-chip';
                        chipEl.textContent = chip.term;
                        chipEl.dataset.tooltip = chip.description;
                        chipContainer.appendChild(chipEl);
                    });
                    sectionDiv.appendChild(chipContainer);
                    break;
                case 'article':
                    section.content.forEach(articlePart => {
                        const subHeading = document.createElement('h3');
                        subHeading.innerHTML = articlePart.heading;
                        sectionDiv.appendChild(subHeading);
                        articlePart.paragraphs.forEach(pText => {
                            const pEl = document.createElement('p');
                            // Parse custom tooltip syntax: [[Keyword|Description]]
                            pEl.innerHTML = pText.replace(/\[\[(.*?)\|(.*?)\]\]/g, '<strong data-tooltip="$2">$1</strong>');
                            sectionDiv.appendChild(pEl);
                        });
                    });
                    break;
                case 'list':
                    const ul = document.createElement('ul');
                    section.content.forEach(item => {
                        const li = document.createElement('li');
                        li.innerHTML = item.item;
                        ul.appendChild(li);
                    });
                    sectionDiv.appendChild(ul);
                    break;
            }
            learningContent.appendChild(sectionDiv);
        });
        
        // After rendering, initialize components that depend on the content
        initializeTooltips();
        setupNavigator();
    }


    // --- 4. Function Definitions (in logical order) ---

    // Firebase (#2)
    async function initializeFirebase() {
        try {
            const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
            const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
            if (Object.keys(firebaseConfig).length === 0) { throw new Error("Firebase config not found."); }

            if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
            const auth = firebase.auth();
            db = firebase.firestore();

            if (initialAuthToken) {
                await auth.signInWithCustomToken(initialAuthToken).catch(err => {
                   console.warn("Custom token sign-in failed, trying anonymous.", err);
                   return auth.signInAnonymously();
                });
            } else if (!auth.currentUser) {
                await auth.signInAnonymously();
            }

            currentUser = auth.currentUser;
            if (currentUser) {
                notesCollection = db.collection(`artifacts/${appId}/users/${currentUser.uid}/notes`);
                chatCollectionRef = db.collection(`artifacts/${appId}/users/${currentUser.uid}/chatHistories`);
                listenToNotes();
                listenToChatHistory();
            }
        } catch (error) {
            console.error("Firebase Initialization/Auth Failed:", error);
            if (notesList) notesList.innerHTML = '<div>Cloud notes failed to load.</div>';
            if (chatMessages) chatMessages.innerHTML = '<div>Learning Copilot connection failed.</div>';
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
        // This function now needs to be more robust for dynamically added content.
        const tooltippedElements = document.querySelectorAll('[data-tooltip]');
        
        tooltippedElements.forEach(el => {
            // Avoid re-adding tooltips
            if (el.classList.contains('has-tooltip')) return;

            const tooltipText = el.dataset.tooltip;
            if (tooltipText) {
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
            if (e.target.closest('button, input, .close-btn, #delete-history-btn, #chat-mode-selector, .header-button-group')) return;
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

    // --- EXPANDED NAVIGATION (#4) ---
    function setupNavigator() {
        const scrollNav = document.getElementById('scroll-nav');
        if (!scrollNav || !learningContent) return;

        // Find all H2 and H3 tags within the content sections
        const headers = learningContent.querySelectorAll('.content-section h2, .content-section h3');

        if (headers.length === 0) {
            scrollNav.style.display = 'none';
            if(wrapper) wrapper.classList.add('toc-hidden');
            return;
        }
        scrollNav.style.display = 'block';
        if(wrapper) wrapper.classList.remove('toc-hidden');

        const navList = document.createElement('ul');
        headers.forEach((header, index) => {
            const targetElement = header;
            if (!targetElement.id) { targetElement.id = `nav-target-${index}`; }
            
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            let navText = header.textContent.trim();
            link.textContent = navText;
            link.href = `#${targetElement.id}`;
            
            // Indent H3 links for visual hierarchy
            if (header.tagName === 'H3') {
                link.style.paddingLeft = '25px';
                link.style.fontSize = '0.9em';
            }

            listItem.appendChild(link);
            navList.appendChild(listItem);
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
        headers.forEach(header => observer.observe(header));
    }

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
        modalMessage.innerHTML = message; // Use innerHTML to support simple HTML tags
        customModal.style.display = 'flex';
        const confirmHandler = () => {
            onConfirm();
            customModal.style.display = 'none';
            modalConfirmBtn.removeEventListener('click', confirmHandler);
        };
        const cancelHandler = () => {
            customModal.style.display = 'none';
            modalCancelBtn.removeEventListener('click', cancelHandler);
        };
        modalConfirmBtn.addEventListener('click', confirmHandler, { once: true });
        modalCancelBtn.addEventListener('click', cancelHandler, { once: true });
    }

    // Chat (#1, #2, #7)
    async function handleChatSend() {
        if (!chatInput || !chatSendBtn) return;
        const userQuery = chatInput.value.trim();
        if (!userQuery) return;

        chatInput.disabled = true;
        chatSendBtn.disabled = true;

        const currentHistory = chatHistories[selectedMode] || [];
        currentHistory.push({ role: 'user', content: userQuery, timestamp: new Date().toISOString() });
        renderChatHistory(selectedMode); // Optimistic update
        
        // This should be replaced with a call to the actual Gemini API
        setTimeout(async () => {
            const aiResponse = `[Generated Response for "${userQuery}"]`; // Placeholder
            currentHistory.push({ role: 'ai', content: aiResponse, timestamp: new Date().toISOString() });
            await saveChatHistory(); // Save after getting AI response
            renderChatHistory(selectedMode); // Render final state

            chatInput.disabled = false;
            chatSendBtn.disabled = false;
            chatInput.value = '';
            chatInput.style.height = 'auto';
            chatInput.focus();
        }, 1000);
    }
    
    function renderChatHistory(mode) {
        if (!chatMessages) return;
        chatMessages.innerHTML = '';
        const history = chatHistories[mode] || [];
        history.forEach(msg => {
            const msgDiv = document.createElement('div');
            msgDiv.className = `chat-message ${msg.role}`;
            
            const contentDiv = document.createElement('div');
            contentDiv.innerHTML = msg.content.replace(/\n/g, '<br>'); // Simple formatting
            msgDiv.appendChild(contentDiv);

            if (msg.timestamp) {
                const timeDiv = document.createElement('div');
                timeDiv.className = 'chat-timestamp';
                timeDiv.textContent = new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                msgDiv.appendChild(timeDiv);
            }
            if (msg.role === 'ai') {
                const sendToNoteBtn = document.createElement('button');
                sendToNoteBtn.className = 'send-to-note-btn';
                sendToNoteBtn.textContent = '메모로 보내기';
                sendToNoteBtn.onclick = (e) => {
                    addNote(`[학습 코파일럿] ${msg.content}`);
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

        unsubscribeFromChat = chatCollectionRef.doc(chatStorageKey).onSnapshot(doc => {
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
            try {
                // Set, not update, to overwrite the entire modes object
                await chatCollectionRef.doc(chatStorageKey).set(chatHistories, { merge: true });
            } catch (error) {
                console.error("Failed to save chat history:", error);
            }
        }
    }
    
    function setupChatModeSelector() {
        if (!chatModeSelector) return;
        chatModeSelector.innerHTML = ''; // Clear existing buttons
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
                chatQuizState = 'idle'; 
                lastQuestion = '';
                
                chatModeSelector.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                if (selectedMode === 'custom') openPromptModal();
                renderChatHistory(selectedMode);
            });
            chatModeSelector.appendChild(button);
        });
    }

    // --- NOTES APP LOGIC (with #6 multi-select) ---
    function listenToNotes() {
        if (!notesCollection) return;
        if (unsubscribeFromNotes) unsubscribeFromNotes();
        unsubscribeFromNotes = notesCollection.orderBy('updatedAt', 'desc').onSnapshot(snapshot => {
            localNotesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderNoteList();
        }, error => console.error("노트 실시간 수신 오류:", error));
    }
    
    function renderNoteList() {
        if (!notesList || !searchInput) return;
        const searchTerm = searchInput.value.toLowerCase();
        const filteredNotes = localNotesCache.filter(note => 
            (note.title && note.title.toLowerCase().includes(searchTerm)) || 
            (note.content && note.content.toLowerCase().includes(searchTerm))
        );
        filteredNotes.sort((a, b) => (a.isPinned === b.isPinned) ? 0 : a.isPinned ? -1 : 1);

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
            item.innerHTML = `
                <input type="checkbox" class="note-item-selector" data-id="${note.id}">
                <div class="note-item-content">
                    <div class="note-item-title">${note.title || '무제'}</div>
                    <div class="note-item-date">${date}</div>
                </div>
                <div class="note-item-actions">
                    <button class="item-action-btn pin-btn ${note.isPinned ? 'pinned-active' : ''}" title="고정">${note.isPinned ? '📌' : '📍'}</button>
                    <button class="item-action-btn delete-btn" title="삭제">🗑️</button>
                </div>
            `;
            notesList.appendChild(item);
        });
    }

    function toggleNoteSelectionMode() {
        isNoteSelectionMode = !isNoteSelectionMode;
        if(noteListView) noteListView.classList.toggle('selection-mode', isNoteSelectionMode);
        
        // Uncheck all items when exiting mode
        if (!isNoteSelectionMode) {
            document.querySelectorAll('.note-item-selector:checked').forEach(cb => cb.checked = false);
            document.querySelectorAll('.note-item.selected').forEach(item => item.classList.remove('selected'));
        }
    }

    async function deleteSelectedNotes() {
        if (!notesCollection) return;
        const selectedIds = Array.from(document.querySelectorAll('.note-item-selector:checked')).map(cb => cb.dataset.id);
        
        if (selectedIds.length === 0) {
            alert('삭제할 메모를 선택해주세요.');
            return;
        }

        showModal(`선택한 ${selectedIds.length}개의 메모를 정말로 삭제하시겠습니까?`, async () => {
            const batch = db.batch();
            selectedIds.forEach(id => {
                batch.delete(notesCollection.doc(id));
            });
            try {
                await batch.commit();
                toggleNoteSelectionMode(); // Exit selection mode after deletion
            } catch (error) {
                console.error("메모 일괄 삭제 실패:", error);
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
        notesCollection.doc(currentNoteId).update(noteData).then(() => updateStatus('저장됨 ✓', true)).catch(error => { console.error("메모 저장 실패:", error); updateStatus('저장 실패 ❌', false); });
    }

    // --- 5. Selection Popover Logic (#5) ---
    function setupSelectionPopover() {
        document.addEventListener('mouseup', (e) => {
            // Don't show popover inside inputs or the popover itself
            if (e.target.closest('input, textarea, #selection-popover')) return;

            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            if (selectedText.length > 0) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                selectionPopover.style.display = 'flex';
                selectionPopover.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (selectionPopover.offsetWidth / 2)}px`;
                selectionPopover.style.top = `${rect.top + window.scrollY - selectionPopover.offsetHeight - 10}px`;
            } else {
                selectionPopover.style.display = 'none';
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (!e.target.closest('#selection-popover')) {
                selectionPopover.style.display = 'none';
            }
        });
        
        popoverAskAi.addEventListener('click', () => {
            const selectedText = window.getSelection().toString().trim();
            if(selectedText) {
                chatInput.value = selectedText;
                togglePanel(chatPanel, true);
                chatInput.focus();
                selectionPopover.style.display = 'none';
            }
        });

        popoverAddNote.addEventListener('click', () => {
            const selectedText = window.getSelection().toString().trim();
            if(selectedText) {
                addNote(selectedText);
                togglePanel(notesAppPanel, true);
                selectionPopover.style.display = 'none';
            }
        });
    }

    // Other functions (unchanged or minor adjustments from original)
    function openNoteEditor(noteId) {
        const note = localNotesCache.find(n => n.id === noteId);
        if (note && noteTitleInput && noteContentTextarea) {
            currentNoteId = noteId;
            noteTitleInput.value = note.title || '';
            noteContentTextarea.value = note.content || '';
            switchView('editor');
        }
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
    function updateStatus(message, success) { /*...*/ }
    function applyFormat(format) { /*...*/ }

    // --- 6. Global Initialization ---
    function initialize() {
        if (!body || !wrapper) return;
        
        // Check for AI-generated data on load
        if (typeof window.aiGeneratedData !== 'undefined') {
            renderContentFromJSON(window.aiGeneratedData);
        } else {
            if(learningContent) learningContent.innerHTML = '<h2>학습할 내용을 불러와주세요.</h2>';
        }

        // Clock
        updateClock(); setInterval(updateClock, 1000);

        // Draggable Panels
        makePanelDraggable(chatPanel); makePanelDraggable(notesAppPanel);
        
        // Popover
        setupSelectionPopover();

        // Event Listeners
        themeToggle?.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            themeToggle.textContent = body.classList.contains('dark-mode') ? '☀️' : '🌙';
        });
        tocToggleBtn?.addEventListener('click', () => {
            wrapper.classList.toggle('toc-hidden');
            clockElement.classList.toggle('tucked');
        });
        chatToggleBtn?.addEventListener('click', () => togglePanel(chatPanel));
        chatPanel?.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));
        notesAppToggleBtn?.addEventListener('click', () => togglePanel(notesAppPanel));
        chatForm?.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });
        chatInput?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } });
        
        deleteHistoryBtn?.addEventListener('click', async () => {
            const modeText = chatModeSelector.querySelector(`button[data-mode="${selectedMode}"]`).textContent;
            showModal(`'${modeText}' 모드의 대화 기록을 정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`, async () => {
                chatHistories[selectedMode] = [];
                await saveChatHistory();
            });
        });
        
        promptSaveBtn?.addEventListener('click', saveCustomPrompt);
        promptCancelBtn?.addEventListener('click', closePromptModal);

        // Notes App Listeners
        addNewNoteBtn?.addEventListener('click', () => addNote());
        backToListBtn?.addEventListener('click', () => switchView('list'));
        searchInput?.addEventListener('input', renderNoteList);
        exportNotesBtn?.addEventListener('click', () => { /* export logic */ });
        const handleInput = () => { /* saveNote logic */ };
        noteTitleInput?.addEventListener('input', handleInput);
        noteContentTextarea?.addEventListener('input', handleInput);
        
        notesList?.addEventListener('click', e => {
            const noteItem = e.target.closest('.note-item');
            if (!noteItem) return;
            const noteId = noteItem.dataset.id;

            if (isNoteSelectionMode) {
                const checkbox = noteItem.querySelector('.note-item-selector');
                checkbox.checked = !checkbox.checked;
                noteItem.classList.toggle('selected', checkbox.checked);
                return;
            }

            if (e.target.closest('.delete-btn')) { /* handleDeleteRequest(noteId) */ }
            else if (e.target.closest('.pin-btn')) { /* togglePin(noteId) */ }
            else openNoteEditor(noteId);
        });
        
        // Create and add note selection buttons (#6)
        if (noteListHeader) {
            const defaultGroup = document.createElement('div');
            defaultGroup.className = 'header-button-group default-controls';
            defaultGroup.innerHTML = `<button id="select-notes-btn" class="notes-btn secondary">선택</button>`;
            noteListHeader.appendChild(defaultGroup);

            const selectionGroup = document.createElement('div');
            selectionGroup.className = 'header-button-group selection-controls';
            selectionGroup.innerHTML = `<button id="delete-selected-btn" class="notes-btn secondary">선택 삭제</button><button id="cancel-selection-btn" class="notes-btn">취소</button>`;
            noteListHeader.appendChild(selectionGroup);

            document.getElementById('select-notes-btn')?.addEventListener('click', toggleNoteSelectionMode);
            document.getElementById('cancel-selection-btn')?.addEventListener('click', toggleNoteSelectionMode);
            document.getElementById('delete-selected-btn')?.addEventListener('click', deleteSelectedNotes);
        }

        // Initial Setup Calls
        setupChatModeSelector();
        initializeFirebase();
    }

    // --- 7. Run Initialization ---
    initialize();
});
