/* --- Ailey & Bailey Canvas: script.js --- */
/* This file should be hosted on your GitHub Pages. */

document.addEventListener('DOMContentLoaded', function () {
    // --- Global Elements ---
    const learningContent = document.getElementById('learning-content');
    const scrollNav = document.getElementById('scroll-nav');
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const chatPanel = document.getElementById('chat-panel');
    const notesAppPanel = document.getElementById('notes-app-panel');
    const customModal = document.getElementById('custom-modal');

    // --- Data-Driven Rendering Function ---
    function renderDynamicContent(data) {
        if (!data) return;

        // 1. Render Main Content & Build Navigator
        let mainHTML = '';
        let navHTML = '';
        
        mainHTML += `
            <div class="header">
                <h1>${data.title || '제목 없음'}</h1>
                <p class="subtitle">${data.subtitle || ''}</p>
            </div>
            <blockquote>🎯 <b>오늘의 학습 목표:</b> ${data.learningGoal || '목표가 설정되지 않았습니다.'}</blockquote>
        `;

        if (data.keywords && data.keywords.length > 0) {
            mainHTML += `
                <div class="keyword-list">
                    ${data.keywords.map(kw => `<span class="keyword-chip">${kw}</span>`).join('')}
                </div>
            `;
        }

        if (data.sections && data.sections.length > 0) {
            data.sections.forEach(section => {
                mainHTML += `
                    <div class="content-section" id="${section.id}">
                        <h2>${section.title}</h2>
                        <div>${section.content}</div>
                    </div>
                `;
                navHTML += `<li><a href="#${section.id}">${section.title}</a></li>`;
            });
        }
        
        learningContent.innerHTML = mainHTML;
        scrollNav.innerHTML = `<h3>학습 네비게이터</h3><ul>${navHTML}</ul>`;

        // 2. Render Draggable Panel Skeletons (they will be populated by their own logic)
        notesAppPanel.innerHTML = `
            <div id="note-list-view" class="notes-view active">
                <div class="panel-header">
                    <span>지식 발전소</span>
                    <button id="export-notes-btn" class="notes-btn" title="모든 메모 내보내기">📥</button>
                    <button id="add-new-note-btn" class="notes-btn" title="새 메모 작성">새 메모 +</button>
                </div>
                <div class="list-header">
                    <input type="text" id="search-input" placeholder="메모 검색...">
                </div>
                <div id="notes-list"></div>
            </div>
            <div id="note-editor-view" class="notes-view">
                <div class="panel-header">
                    <button id="back-to-list-btn" class="notes-btn">← 목록</button>
                    <div id="auto-save-status"></div>
                </div>
                <input type="text" id="note-title-input" placeholder="제목을 입력하세요...">
                <div class="format-toolbar">
                    <button class="format-btn" data-format="bold"><b>B</b></button>
                    <button class="format-btn" data-format="italic"><i>I</i></button>
                    <button class="format-btn" data-format="code">\`code\`</button>
                    <button id="link-topic-btn" class="notes-btn" title="현재 학습 주제 연결">🔗 주제 연결</button>
                </div>
                <textarea id="note-content-textarea" placeholder="내용을 입력하세요..."></textarea>
            </div>
        `;

        chatPanel.innerHTML = `
            <div class="panel-header">
                <span>AI 튜터봇</span>
                <span class="close-btn">×</span>
            </div>
            <div class="chat-messages" id="chat-messages"></div>
            <form class="chat-input-form" id="chat-form">
                <textarea id="chat-input" placeholder="AI 튜터에게 질문하기..." rows="1"></textarea>
                <button type="submit" id="chat-send-btn" title="전송">▶️</button>
            </form>
        `;

        customModal.innerHTML = `
            <div class="custom-modal">
                <p id="modal-message">정말로 이 메모를 삭제하시겠습니까?</p>
                <div class="custom-modal-actions">
                    <button id="modal-cancel-btn" class="modal-btn">취소</button>
                    <button id="modal-confirm-btn" class="modal-btn">삭제</button>
                </div>
            </div>
        `;
    }

    // --- Knowledge Powerhouse v3.0 (Notes App) Logic ---
    let db;
    let notesCollection;
    let currentUser = null;
    let localNotesCache = [];
    let currentNoteId = null;
    let unsubscribeFromNotes = null;
    let debounceTimer = null;

    async function initializeFirebase(firebaseConfigStr, initialAuthToken) {
        try {
            const firebaseConfig = JSON.parse(firebaseConfigStr);
            firebase.initializeApp(firebaseConfig);
            const auth = firebase.auth();
            db = firebase.firestore();

            if (initialAuthToken) {
                await auth.signInWithCustomToken(initialAuthToken);
            } else {
                await auth.signInAnonymously();
            }

            currentUser = auth.currentUser;
            if (currentUser) {
                notesCollection = db.collection(`artifacts/AileyBailey_Global_Space/users/${currentUser.uid}/notes`);
                listenToNotes();
            }
        } catch (error) {
            console.error("Firebase Initialization/Auth Failed:", error);
            const notesList = document.getElementById('notes-list');
            if (notesList) notesList.innerHTML = '<div>클라우드 메모장을 불러오는 데 실패했습니다.</div>';
        }
    }

    function listenToNotes() {
        if (unsubscribeFromNotes) unsubscribeFromNotes();
        unsubscribeFromNotes = notesCollection.onSnapshot(snapshot => {
            localNotesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderNoteList();
        }, error => {
            console.error("Note real-time subscription error:", error);
        });
    }
    
    function renderNoteList() {
        const notesList = document.getElementById('notes-list');
        const searchInput = document.getElementById('search-input');
        if (!notesList || !searchInput) return;

        const searchTerm = searchInput.value.toLowerCase();
        
        const filteredNotes = localNotesCache.filter(note => 
            (note.title && note.title.toLowerCase().includes(searchTerm)) || 
            (note.content && note.content.toLowerCase().includes(searchTerm))
        );

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

            item.innerHTML = `
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

    async function addNote() {
        try {
            const newNoteRef = await notesCollection.add({
                title: '새 메모',
                content: '',
                isPinned: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            openNoteEditor(newNoteRef.id);
        } catch (error) {
            console.error("Failed to add new note:", error);
        }
    }

    function saveNote() {
        clearTimeout(debounceTimer);
        if (!currentNoteId) return;

        const noteTitleInput = document.getElementById('note-title-input');
        const noteContentTextarea = document.getElementById('note-content-textarea');

        const noteData = {
            title: noteTitleInput.value,
            content: noteContentTextarea.value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        notesCollection.doc(currentNoteId).update(noteData)
            .then(() => updateStatus('저장됨 ✓', true))
            .catch(error => {
                console.error("Failed to save note:", error);
                updateStatus('저장 실패 ❌', false);
            });
    }

    function handleDeleteRequest(noteId) {
        showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => {
            notesCollection.doc(noteId).delete().catch(error => console.error("Failed to delete note:", error));
        });
    }

    async function togglePin(noteId) {
        const note = localNotesCache.find(n => n.id === noteId);
        if (note) {
            await notesCollection.doc(noteId).update({ isPinned: !note.isPinned });
        }
    }
            
    function exportNotes() {
        const dataStr = JSON.stringify(localNotesCache, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my-notes.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function switchView(viewName) {
        const noteListView = document.getElementById('note-list-view');
        const noteEditorView = document.getElementById('note-editor-view');
        if (viewName === 'editor') {
            noteListView.classList.remove('active');
            noteEditorView.classList.add('active');
        } else {
            noteEditorView.classList.remove('active');
            noteListView.classList.add('active');
            currentNoteId = null;
        }
    }

    function openNoteEditor(noteId) {
        const note = localNotesCache.find(n => n.id === noteId);
        if (note) {
            currentNoteId = noteId;
            document.getElementById('note-title-input').value = note.title || '';
            document.getElementById('note-content-textarea').value = note.content || '';
            switchView('editor');
        }
    }
            
    function updateStatus(message, success) {
        const autoSaveStatus = document.getElementById('auto-save-status');
        if (!autoSaveStatus) return;
        autoSaveStatus.textContent = message;
        autoSaveStatus.style.color = success ? 'lightgreen' : 'lightcoral';
        setTimeout(() => { autoSaveStatus.textContent = ''; }, 2000);
    }

    function applyFormat(format) {
        const textarea = document.getElementById('note-content-textarea');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        const marker = format === 'bold' ? '**' : (format === 'italic' ? '*' : '`');
        const newText = `${textarea.value.substring(0, start)}${marker}${selectedText}${marker}${textarea.value.substring(end)}`;
        textarea.value = newText;
        textarea.focus();
    }
            
    function showModal(message, onConfirm) {
        document.getElementById('modal-message').textContent = message;
        document.getElementById('custom-modal').style.display = 'flex';
        document.getElementById('modal-confirm-btn').onclick = () => {
            onConfirm();
            document.getElementById('custom-modal').style.display = 'none';
        };
        document.getElementById('modal-cancel-btn').onclick = () => {
            document.getElementById('custom-modal').style.display = 'none';
        };
    }

    // --- Other Interactive Features ---
    async function callGemini(prompt, elementToUpdate) {
        elementToUpdate.innerHTML = '<div class="loading-indicator">AI가 답변을 생성하고 있습니다...</div>';
        const apiKey = ""; // This should be handled by a secure backend in a real app
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
        try {
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
            if (!response.ok) { const errorData = await response.json(); throw new Error(`API Error: ${errorData.error.message}`); }
            const result = await response.json();
            if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
                elementToUpdate.innerHTML = result.candidates[0].content.parts[0].text.replace(/\n/g, '<br>');
            } else { throw new Error('Invalid API response structure.'); }
        } catch (error) { console.error('Gemini API Error:', error); elementToUpdate.textContent = `오류: ${error.message}`; }
    }
            
    function handleChatSend() {
        const chatInput = document.getElementById('chat-input');
        const chatMessages = document.getElementById('chat-messages');
        const userQuery = chatInput.value.trim();
        if (!userQuery) return;
        const personaPrompt = chatPanel.dataset.personaPrompt || "You are a helpful AI.";
        const finalPrompt = `${personaPrompt} 다음 질문에 답변해주세요: "${userQuery}"`;
        const userMessageDiv = document.createElement('div');
        userMessageDiv.className = 'chat-message user';
        userMessageDiv.textContent = userQuery;
        chatMessages.appendChild(userMessageDiv);
        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'chat-message ai';
        chatMessages.appendChild(aiMessageDiv);
        callGemini(finalPrompt, aiMessageDiv);
        chatInput.value = '';
        chatInput.style.height = 'auto';
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
            
    function makePanelDraggable(panelElement) {
        const header = panelElement.querySelector('.panel-header');
        if(!header) return;
        let isDragging = false, offset = { x: 0, y: 0 };
        header.addEventListener('mousedown', e => {
            isDragging = true;
            offset = { x: panelElement.offsetLeft - e.clientX, y: panelElement.offsetTop - e.clientY };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        function onMouseMove(e) { if (isDragging) { panelElement.style.left = (e.clientX + offset.x) + 'px'; panelElement.style.top = (e.clientY + offset.y) + 'px'; } }
        function onMouseUp() { isDragging = false; document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); }
    }
            
    function togglePanel(panelElement, forceShow = null) {
        const show = forceShow !== null ? forceShow : panelElement.style.display !== 'flex';
        panelElement.style.display = show ? 'flex' : 'none';
    }

    function setupNavigator() {
        const links = scrollNav.querySelectorAll('a');
        const sections = document.querySelectorAll('.content-section');
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    links.forEach(link => {
                        link.classList.toggle('active', link.getAttribute('href').substring(1) === entry.target.id);
                    });
                }
            });
        }, { rootMargin: '-30% 0px -70% 0px' });
        sections.forEach(section => observer.observe(section));
    }

    function applyTheme(theme) {
        body.classList.toggle('dark-mode', theme === 'dark');
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        localStorage.setItem('ailey-bailey-theme', theme);
    }
    
    // --- Global Event Listener Setup ---
    function setupEventListeners() {
        // Theme Toggle
        themeToggle.addEventListener('click', () => {
            const newTheme = body.classList.contains('dark-mode') ? 'light' : 'dark';
            applyTheme(newTheme);
        });

        // Panel Toggles
        document.getElementById('chat-toggle-btn').addEventListener('click', () => togglePanel(chatPanel));
        document.getElementById('notes-app-toggle-btn').addEventListener('click', () => togglePanel(notesAppPanel));
        
        // Panel Close Buttons (event delegation)
        document.addEventListener('click', e => {
            if (e.target.matches('#chat-panel .close-btn')) {
                togglePanel(chatPanel, false);
            }
        });

        // Chat Form
        const chatForm = document.getElementById('chat-form');
        const chatInput = document.getElementById('chat-input');
        if(chatForm) chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });
        if(chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chatForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); } });

        // Notes App Event Listeners (delegation)
        notesAppPanel.addEventListener('click', e => {
            const target = e.target;
            const noteItem = target.closest('.note-item');

            if (target.id === 'add-new-note-btn') addNote();
            else if (target.id === 'back-to-list-btn') switchView('list');
            else if (target.id === 'export-notes-btn') exportNotes();
            else if (target.closest('.format-btn')) applyFormat(target.closest('.format-btn').dataset.format);
            else if (target.id === 'link-topic-btn') {
                const textarea = document.getElementById('note-content-textarea');
                const linkText = `\n\n🔗 연관 학습: [${document.title || '현재 학습'}]`;
                textarea.value += linkText;
                saveNote();
            } else if (noteItem) {
                const noteId = noteItem.dataset.id;
                if (target.closest('.delete-btn')) handleDeleteRequest(noteId);
                else if (target.closest('.pin-btn')) togglePin(noteId);
                else openNoteEditor(noteId);
            }
        });
        
        notesAppPanel.addEventListener('input', e => {
            const target = e.target;
            if (target.id === 'search-input') renderNoteList();
            else if (target.id === 'note-title-input' || target.id === 'note-content-textarea') {
                updateStatus('입력 중...', true);
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(saveNote, 1000);
            }
        });
    }

    // --- Global Initialization ---
    function initialize() {
        // 1. Render content first based on AI data
        renderDynamicContent(typeof __lecture_data__ !== 'undefined' ? __lecture_data__ : null);

        // 2. Setup theme
        const savedTheme = localStorage.getItem('ailey-bailey-theme') || 'dark';
        applyTheme(savedTheme);

        // 3. Make panels draggable
        makePanelDraggable(chatPanel);
        makePanelDraggable(notesAppPanel);
        
        // 4. Setup event listeners for the newly rendered content
        setupEventListeners();

        // 5. Setup navigator for the main content
        setupNavigator();

        // 6. Initialize Firebase which will trigger note rendering
        try {
            if (typeof __firebase_config !== 'undefined' && __firebase_config.length > 10 && typeof __initial_auth_token !== 'undefined') {
                 initializeFirebase(__firebase_config, __initial_auth_token);
            } else {
                throw new Error("Firebase configuration is missing or invalid.");
            }
        } catch (e) {
            console.error(e.message);
            const notesList = document.getElementById('notes-list');
            if (notesList) notesList.innerHTML = '<div>클라우드 메모장을 불러오는 데 실패했습니다. (설정 오류)</div>';
        }
    }

    // Start the application
    initialize();
});
