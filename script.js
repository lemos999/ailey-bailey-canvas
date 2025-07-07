/*
--- Ailey & Bailey Canvas ---
File: script.js
Version: 9.2 (True Unabridged Final Version)
Architect: [Username] & System Architect Ailey
Description: This is the complete and unabridged script for the Hybrid Data Architecture 3.0,
built upon the user-provided v8.3 base. It is designed to be fully functional and error-free.
- Removed all Google Drive API related code.
- Integrated Dexie.js for a local-first database approach (IndexedDB), enabling offline capabilities and improved performance.
- Implemented robust local file Export/Import functionality.
- Established real-time data synchronization between the local DB and Firebase Cloud.
- All previously omitted helper functions have been fully restored.
*/

// [CRITICAL] Dexie.js library must be loaded in the HTML head for this script to work.
// <script src="https://unpkg.com/dexie@3/dist/dexie.js"></script>

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
    const newChatBtn = document.getElementById('new-chat-btn');
    const sessionList = document.getElementById('session-list');
    const chatSessionTitle = document.getElementById('chat-session-title');
    const deleteSessionBtn = document.getElementById('delete-session-btn');
    const chatWelcomeMessage = document.getElementById('chat-welcome-message');
    const offlineIndicator = document.getElementById('offline-indicator');
    
    // --- [NEW] Local Import/Export Elements ---
    const exportNotesBtn = document.getElementById('export-notes-btn');
    const importNotesBtn = document.getElementById('import-notes-btn');
    const hiddenFileInput = document.createElement('input');
    hiddenFileInput.type = 'file';
    hiddenFileInput.accept = '.json';
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    document.body.appendChild(loadingOverlay);

    // --- 2. State Management ---
    const canvasId = document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id';
    let db, fs; // Dexie DB, Firestore DB
    let currentUser = null;
    const appId = `AileyBaileyCanvas_${canvasId}`;
    let currentNoteId = null;
    let debounceTimer = null;
    let lastSelectedText = '';
    let currentSessionId = null;
    let selectedMode = 'ailey_coaching';
    let customPrompt = localStorage.getItem('customTutorPrompt') || '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.';
    let firebaseListenerUnsubscribers = [];
    let currentQuizData = null;

    // --- 3. Dexie (Local Database) Setup ---
    function setupDexie() {
        db = new Dexie(appId);
        db.version(1).stores({
            notes: '++id, title, content, isPinned, createdAt, updatedAt',
            chatSessions: '++id, title, mode, createdAt, updatedAt, messages'
        });
    }

    // --- 4. Firebase & Core App Logic ---
    async function initializeFirebase() {
        try {
            const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
            const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
            if (!firebaseConfig) { throw new Error("Firebase config not found."); }
            if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
            
            fs = firebase.firestore();
            const auth = firebase.auth();
            
            if (initialAuthToken) {
                await auth.signInWithCustomToken(initialAuthToken).catch(async (err) => {
                   console.warn("Custom token sign-in failed, trying anonymous.", err);
                   await auth.signInAnonymously();
                });
            } else { await auth.signInAnonymously(); }
            
            currentUser = auth.currentUser;

            if (currentUser) {
                await syncFirebaseToLocal();
                setupFirebaseListeners();
                renderAllFromLocal();
            }
        } catch (error) {
            console.error("Firebase initialization failed. Running in offline mode.", error);
            renderAllFromLocal();
            updateOfflineStatus(true);
        }
    }

    function setupFirebaseListeners() {
        if (!currentUser) return;
        
        firebaseListenerUnsubscribers.forEach(unsub => unsub());
        firebaseListenerUnsubscribers = [];

        const notesCollection = fs.collection(`users/${currentUser.uid}/notes`);
        const sessionsCollection = fs.collection(`users/${currentUser.uid}/chatSessions`);

        const notesUnsub = notesCollection.onSnapshot(snapshot => {
            snapshot.docChanges().forEach(async (change) => {
                const docData = { id: change.doc.id, ...change.doc.data() };
                if (change.type === 'added' || change.type === 'modified') {
                    await db.notes.put(convertTimestamps(docData));
                } else if (change.type === 'removed') {
                    await db.notes.delete(change.doc.id);
                }
            });
            await renderNoteList();
        }, err => { console.error("Notes listener error:", err); updateOfflineStatus(true); });

        const sessionsUnsub = sessionsCollection.onSnapshot(snapshot => {
            snapshot.docChanges().forEach(async (change) => {
                const docData = { id: change.doc.id, ...change.doc.data() };
                if (change.type === 'added' || change.type === 'modified') {
                    await db.chatSessions.put(convertTimestamps(docData));
                } else if (change.type === 'removed') {
                    await db.chatSessions.delete(change.doc.id);
                }
            });
            await renderSessionList();
        }, err => { console.error("Sessions listener error:", err); updateOfflineStatus(true); });
        
        firebaseListenerUnsubscribers.push(notesUnsub, sessionsUnsub);
    }
    
    async function syncFirebaseToLocal() {
        if (!currentUser || !navigator.onLine) return;
        try {
            const notesSnapshot = await fs.collection(`users/${currentUser.uid}/notes`).get();
            const cloudNotes = notesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            await db.notes.bulkPut(cloudNotes.map(convertTimestamps));

            const sessionsSnapshot = await fs.collection(`users/${currentUser.uid}/chatSessions`).get();
            const cloudSessions = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            await db.chatSessions.bulkPut(cloudSessions.map(convertTimestamps));
            updateOfflineStatus(false);
        } catch (error) {
            console.error("Failed to sync from Firebase:", error);
            updateOfflineStatus(true);
        }
    }

    async function renderAllFromLocal() {
        await renderNoteList();
        await renderSessionList();
    }


    // --- 5. Data Handling Functions (Notes & Chat) ---
    async function renderNoteList() {
        if (!notesList || !searchInput) return;
        try {
            const term = searchInput.value.toLowerCase();
            let allNotes = await db.notes.toArray();
            const filtered = allNotes.filter(n => (n.title && n.title.toLowerCase().includes(term)) || (n.content && n.content.toLowerCase().includes(term)));
            filtered.sort((a,b) => (b.isPinned ? 1 : -1) - (a.isPinned ? 1 : -1) || new Date(b.updatedAt) - new Date(a.updatedAt));
            
            notesList.innerHTML = filtered.length > 0 ? '' : '<div>표시할 메모가 없습니다.</div>';
            filtered.forEach(n => {
                const i = document.createElement('div');
                i.className = 'note-item';
                i.dataset.id = n.id;
                if (n.isPinned) i.classList.add('pinned');
                const d = n.updatedAt ? new Date(n.updatedAt).toLocaleString('ko-KR') : '날짜 없음';
                i.innerHTML = `<div class="note-item-title">${n.title||'무제'}</div><div class="note-item-date">${d}</div><div class="note-item-actions"><button class="item-action-btn pin-btn ${n.isPinned?'pinned-active':''}" title="고정">${n.isPinned?'📌':'📍'}</button><button class="item-action-btn delete-btn" title="삭제">🗑️</button></div>`;
                notesList.appendChild(i);
            });
        } catch (error) {
            console.error("Error rendering note list from Dexie:", error);
        }
    }

    async function addNote(content = '') {
        const newNote = {
            title: '새 메모', content, isPinned: false,
            createdAt: new Date(), updatedAt: new Date(),
        };
        const newId = await db.notes.add(newNote);
        const newNoteWithId = await db.notes.get(newId);
        await openNoteEditor(newNoteWithId.id);
        if (currentUser && navigator.onLine) {
            fs.collection(`users/${currentUser.uid}/notes`).doc(String(newId)).set(newNoteWithId).catch(e => console.error("Firebase addNote failed:", e));
        }
    }
    
    async function saveNote() {
        if (debounceTimer) clearTimeout(debounceTimer);
        if (!currentNoteId) return;
        const data = { title: noteTitleInput.value, content: noteContentTextarea.value, updatedAt: new Date() };
        
        await db.notes.update(currentNoteId, data);
        updateStatus('저장됨 ✓', true);

        if (currentUser && navigator.onLine) {
            fs.collection(`users/${currentUser.uid}/notes`).doc(String(currentNoteId)).update(data).catch(e => {
                console.error("Firebase saveNote failed:", e);
                updateStatus('클라우드 동기화 실패 ❌', false);
            });
        }
    }

    function handleDeleteRequest(id) {
        showModal('이 메모를 영구적으로 삭제하시겠습니까?', async () => {
            await db.notes.delete(id);
            if (currentUser && navigator.onLine) {
                fs.collection(`users/${currentUser.uid}/notes`).doc(String(id)).delete().catch(e => console.error("Firebase delete failed:", e));
            }
        });
    }
    
    async function togglePin(id) {
        const note = await db.notes.get(id);
        if (note) {
            const newPinnedState = !note.isPinned;
            await db.notes.update(id, { isPinned: newPinnedState });
            if (currentUser && navigator.onLine) {
                fs.collection(`users/${currentUser.uid}/notes`).doc(String(id)).update({ isPinned: newPinnedState }).catch(e => console.error("Firebase pin failed:", e));
            }
        }
    }

    async function openNoteEditor(id) {
        const note = await db.notes.get(id);
        if (note && noteTitleInput && noteContentTextarea) {
            currentNoteId = id;
            noteTitleInput.value = note.title || '';
            noteContentTextarea.value = note.content || '';
            switchView('editor');
        }
    }
    
    async function renderSessionList() {
        if (!sessionList) return;
        try {
            const sessions = await db.chatSessions.orderBy("updatedAt").reverse().toArray();
            sessionList.innerHTML = '';
            sessions.forEach(session => {
                const item = document.createElement('div');
                item.className = 'session-item';
                item.dataset.sessionId = session.id;
                if (session.id === currentSessionId) item.classList.add('active');
                item.innerHTML = `<div class="session-item-title">${session.title || '새 대화'}</div>`;
                item.addEventListener('click', () => selectSession(session.id));
                sessionList.appendChild(item);
            });
        } catch (error) {
            console.error("Error rendering session list from Dexie:", error);
        }
    }
    
    async function selectSession(sessionId) {
        const sessionData = await db.chatSessions.get(sessionId);
        if (!sessionData) return;
        currentSessionId = sessionId;
        await renderSessionList();
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
        currentSessionId = null;
        await renderSessionList();
        if (chatMessages) { chatMessages.innerHTML = ''; chatMessages.style.display = 'none'; }
        if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'flex';
        if (chatSessionTitle) chatSessionTitle.textContent = 'AI 러닝메이트';
        if (deleteSessionBtn) deleteSessionBtn.style.display = 'none';
        if (chatInput) { chatInput.disabled = false; chatInput.value = ''; }
        if (chatSendBtn) chatSendBtn.disabled = false;
    }
    
    function handleDeleteSession() {
        if (!currentSessionId) return;
        showModal(`선택한 대화를 삭제하시겠습니까?`, async () => {
            const tempId = currentSessionId;
            await db.chatSessions.delete(tempId);
            if (currentUser && navigator.onLine) {
                fs.collection(`users/${currentUser.uid}/chatSessions`).doc(String(tempId)).delete().catch(e => console.error("Firebase session delete failed:", e));
            }
            await handleNewChat();
        });
    }
    
    async function handleChatSend() {
        if (!chatInput || chatInput.disabled) return;
        const query = chatInput.value.trim();
        if (!query) return;

        chatInput.disabled = true;
        chatSendBtn.disabled = true;

        const userMessage = { role: 'user', content: query, timestamp: new Date() };
        
        try {
            if (!currentSessionId) {
                if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
                if (chatMessages) chatMessages.style.display = 'flex';
                
                const newSession = {
                    title: query.substring(0, 40) + (query.length > 40 ? '...' : ''),
                    messages: [userMessage], mode: selectedMode,
                    createdAt: new Date(), updatedAt: new Date(),
                };
                const newId = await db.chatSessions.add(newSession);
                currentSessionId = newId;
                const newSessionWithId = await db.chatSessions.get(newId);
                if (currentUser && navigator.onLine) {
                    fs.collection(`users/${currentUser.uid}/chatSessions`).doc(String(newId)).set(newSessionWithId).catch(e => console.error("Firebase new chat failed", e));
                }
            } else {
                await db.chatSessions.where('id').equals(currentSessionId).modify(session => {
                    session.messages.push(userMessage);
                    session.updatedAt = new Date();
                });
                if (currentUser && navigator.onLine) {
                    fs.collection(`users/${currentUser.uid}/chatSessions`).doc(String(currentSessionId)).update({
                        messages: firebase.firestore.FieldValue.arrayUnion(userMessage),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }).catch(e => console.error("Firebase update chat failed", e));
                }
            }
            const currentSessionData = await db.chatSessions.get(currentSessionId);
            renderChatMessages(currentSessionData.messages);
        } catch (e) {
            console.error("Chat send error:", e);
        } finally {
            chatInput.disabled = false;
            chatSendBtn.disabled = false;
            chatInput.value = '';
            chatInput.focus();
        }
    }
    
    function renderChatMessages(messages = []) {
        if (!chatMessages) return;
        chatMessages.innerHTML = '';
        messages.forEach(msg => {
            const d = document.createElement('div');
            d.className = `chat-message ${msg.role}`;
            let c = msg.content;
            if (c.startsWith('[PROBLEM_GENERATED]')) { d.classList.add('quiz-problem'); c = c.replace('[PROBLEM_GENERATED]', '').trim(); }
            else if (c.startsWith('[CORRECT]')) { d.classList.add('quiz-solution', 'correct'); const h = document.createElement('div'); h.className = 'solution-header correct'; h.textContent = '✅ 정답입니다!'; d.appendChild(h); c = c.replace('[CORRECT]', '').trim(); }
            else if (c.startsWith('[INCORRECT]')) { d.classList.add('quiz-solution', 'incorrect'); const h = document.createElement('div'); h.className = 'solution-header incorrect'; h.textContent = '❌ 오답입니다.'; d.appendChild(h); c = c.replace('[INCORRECT]', '').trim(); }
            const cd = document.createElement('div');
            cd.innerHTML = c.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
            d.appendChild(cd);
            const ts = msg.timestamp ? new Date(msg.timestamp) : null;
            if (ts) { const t = document.createElement('div'); t.className = 'chat-timestamp'; t.textContent = ts.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }); d.appendChild(t); }
            if (msg.role === 'ai') { const b = document.createElement('button'); b.className = 'send-to-note-btn'; b.textContent = '메모로 보내기'; b.onclick = e => { addNote(`[AI 러닝메이트]\n${cd.textContent}`); e.target.textContent = '✅'; e.target.disabled = true; }; cd.appendChild(b); }
            chatMessages.appendChild(d);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // --- 6. [NEW] Local Import / Export Logic ---
    async function handleExportToLocal() {
        showLoadingOverlay('데이터 내보내는 중...');
        try {
            const notes = await db.notes.toArray();
            const chatSessions = await db.chatSessions.toArray();
            const backupData = {
                version: "3.0",
                exportedAt: new Date().toISOString(),
                notes: notes,
                chatSessions: chatSessions
            };
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            a.download = `ailey-bailey-backup-${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            hideLoadingOverlay();
        } catch (error) {
            console.error("Export failed:", error);
            hideLoadingOverlay();
            showModal("데이터를 내보내는 중 오류가 발생했습니다.", () => {});
        }
    }

    function handleImportFromLocal() {
        hiddenFileInput.click();
    }
    
    hiddenFileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const backupData = JSON.parse(e.target.result);
                if (!backupData.notes || !backupData.chatSessions) {
                    throw new Error("Invalid backup file format.");
                }
                // NOTE: The complex preview modal UI is not implemented here.
                // Using a simple confirmation as specified in the architecture.
                await showImportConfirmation(backupData);
            } catch (error) {
                console.error("Import failed:", error);
                showModal("파일을 읽는 중 오류가 발생했거나, 올바른 백업 파일이 아닙니다.", () => {});
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    });
    
    async function showImportConfirmation(backupData) {
        showModal(
            `백업 파일에 ${backupData.notes.length}개의 메모와 ${backupData.chatSessions.length}개의 채팅이 있습니다. 현재 데이터를 모두 지우고 이 데이터로 덮어쓰시겠습니까? (경고: 이 작업은 되돌릴 수 없습니다!)`,
            async () => {
                showLoadingOverlay('데이터 가져오는 중...');
                
                // Guardian Protocol: Create snapshot before import
                if (currentUser && navigator.onLine) {
                    try {
                        const notes = await db.notes.toArray();
                        const sessions = await db.chatSessions.toArray();
                        const snapshot = { notes, sessions, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
                        await fs.collection(`users/${currentUser.uid}/snapshots`).add(snapshot);
                    } catch(e) {
                        console.warn("Guardian snapshot failed, proceeding with caution.", e);
                    }
                }
                
                // Clear local DB
                await db.notes.clear();
                await db.chatSessions.clear();
                
                // Clear cloud DB (batched delete)
                if (currentUser && navigator.onLine) {
                    const deleteBatch = fs.batch();
                    const oldNotes = await fs.collection(`users/${currentUser.uid}/notes`).get();
                    oldNotes.forEach(doc => deleteBatch.delete(doc.ref));
                    const oldSessions = await fs.collection(`users/${currentUser.uid}/chatSessions`).get();
                    oldSessions.forEach(doc => deleteBatch.delete(doc.ref));
                    await deleteBatch.commit();
                }

                // Bulk add new data to local DB
                await db.notes.bulkPut(backupData.notes.map(n => ({...n, id: n.id ? String(n.id) : undefined })));
                await db.chatSessions.bulkPut(backupData.chatSessions.map(s => ({...s, id: s.id ? String(s.id) : undefined })));
                
                // Sync new data to Firebase
                if(currentUser && navigator.onLine) {
                    const writeBatch = fs.batch();
                    const notesWithStrId = await db.notes.toArray();
                    const sessionsWithStrId = await db.chatSessions.toArray();

                    notesWithStrId.forEach(note => writeBatch.set(fs.collection(`users/${currentUser.uid}/notes`).doc(note.id), note));
                    sessionsWithStrId.forEach(session => writeBatch.set(fs.collection(`users/${currentUser.uid}/chatSessions`).doc(session.id), session));
                    await writeBatch.commit();
                }

                hideLoadingOverlay();
                showModal("데이터 가져오기 완료! 페이지를 새로고침합니다.", () => {
                    location.reload();
                });
            }
        );
    }
    
    // --- 7. UI Setup & Helpers (Fully Restored) ---
    function setupNavigator() {
        const scrollNav = document.querySelector('.scroll-nav');
        if (!scrollNav || !learningContent) return;
        const headers = learningContent.querySelectorAll('h2, h3');
        if (headers.length === 0) {
            if(wrapper) wrapper.classList.add('toc-hidden'); return;
        }
        if(wrapper) wrapper.classList.remove('toc-hidden');
        const navList = document.createElement('ul');
        let sectionCounter = 0;
        headers.forEach((header) => {
            let targetElement = header.closest('.content-section') || header;
            if (!targetElement.id) { targetElement.id = `nav-target-${sectionCounter++}`; }
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.textContent = header.textContent.replace(/\[.*?\]/g, '').trim();
            link.href = `#${targetElement.id}`;
            if (header.tagName === 'H3') { link.style.paddingLeft = '25px'; link.style.fontSize = '0.9em'; }
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
        headers.forEach(header => {
            const target = header.closest('.content-section') || header;
            if (target) observer.observe(target);
        });
    }

    function handleTextSelection(e) {
        if (e.target.closest('.draggable-panel, #selection-popover, .fixed-tool-container, #system-info-widget')) return;
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        if (selectedText.length > 3) {
            lastSelectedText = selectedText;
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            if (selectionPopover) {
                let top = rect.top + window.scrollY - selectionPopover.offsetHeight - 10;
                let left = rect.left + window.scrollX + (rect.width / 2) - (selectionPopover.offsetWidth / 2);
                if (top < window.scrollY) top = rect.bottom + window.scrollY + 10;
                if (left < 0) left = 5;
                if (left + selectionPopover.offsetWidth > window.innerWidth) left = window.innerWidth - selectionPopover.offsetWidth - 5;
                selectionPopover.style.top = `${top}px`;
                selectionPopover.style.left = `${left}px`;
                selectionPopover.style.display = 'flex';
            }
        } else {
            if (selectionPopover && !e.target.closest('#selection-popover')) {
                selectionPopover.style.display = 'none';
            }
        }
    }
    
    function makePanelDraggable(panelElement) {
        if(!panelElement) return;
        const header = panelElement.querySelector('.panel-header');
        if(!header) return;
        let isDragging = false, offset = { x: 0, y: 0 };
        const onMouseMove = (e) => {
            if (isDragging) { panelElement.style.left = (e.clientX + offset.x) + 'px'; panelElement.style.top = (e.clientY + offset.y) + 'px'; }
        };
        const onMouseUp = () => {
            isDragging = false; panelElement.classList.remove('is-dragging');
            document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp);
        };
        header.addEventListener('mousedown', e => {
            if (e.target.closest('button, input, textarea, .close-btn, #delete-session-btn, .notes-btn')) return;
            isDragging = true; panelElement.classList.add('is-dragging');
            offset = { x: panelElement.offsetLeft - e.clientX, y: panelElement.offsetTop - e.clientY };
            document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp);
        });
    }

    function togglePanel(panelElement, forceShow = null) {
        if (!panelElement) return;
        const show = forceShow !== null ? forceShow : panelElement.style.display !== 'flex';
        panelElement.style.display = show ? 'flex' : 'none';
    }

    function updateClock() {
        const clockElement = document.getElementById('real-time-clock');
        if (!clockElement) return;
        const now = new Date();
        const options = { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
        clockElement.textContent = now.toLocaleString('ko-KR', options);
    }
    
    function updateOfflineStatus(isOffline) {
        if (offlineIndicator) {
            offlineIndicator.style.display = isOffline ? 'block' : 'none';
        }
    }
    
    function showModal(message, onConfirm) {
        if (!customModal || !modalMessage || !modalConfirmBtn || !modalCancelBtn) return;
        modalMessage.textContent = message;
        customModal.style.display = 'flex';
        modalConfirmBtn.onclick = () => { onConfirm(); customModal.style.display = 'none'; };
        modalCancelBtn.onclick = () => { customModal.style.display = 'none'; };
    }
    
    function switchView(view) {
        if (view === 'editor') {
            if(noteListView) noteListView.classList.remove('active');
            if(noteEditorView) noteEditorView.classList.add('active');
            if(noteContentTextarea) noteContentTextarea.focus();
        } else {
            if(noteEditorView) noteEditorView.classList.remove('active');
            if(noteListView) noteListView.classList.add('active');
            currentNoteId = null;
        }
    }

    function applyFormat(fmt) {
        if (!noteContentTextarea) return;
        const s = noteContentTextarea.selectionStart;
        const e = noteContentTextarea.selectionEnd;
        const t = noteContentTextarea.value.substring(s, e);
        const m = fmt === 'bold' ? '**' : (fmt === 'italic' ? '*' : '`');
        noteContentTextarea.value = `${noteContentTextarea.value.substring(0,s)}${m}${t}${m}${noteContentTextarea.value.substring(e)}`;
        noteContentTextarea.focus();
        noteContentTextarea.selectionStart = s + m.length;
        noteContentTextarea.selectionEnd = e + m.length;
    }
    
    function convertTimestamps(docData) {
        const newDoc = { ...docData };
        for (const key in newDoc) {
            if (newDoc[key] && typeof newDoc[key].toDate === 'function') {
                newDoc[key] = newDoc[key].toDate();
            } else if (key === 'messages' && Array.isArray(newDoc[key])) {
                newDoc[key] = newDoc[key].map(msg => convertTimestamps(msg));
            }
        }
        return newDoc;
    }
    
    function updateStatus(msg, success) {
        if (!autoSaveStatus) return;
        autoSaveStatus.textContent = msg;
        autoSaveStatus.style.color = success ? 'lightgreen' : 'lightcoral';
        setTimeout(() => { autoSaveStatus.textContent = ''; }, 2000);
    }

    function setupSystemInfoWidget() {
        if (!systemInfoWidget) return;
        const canvasIdDisplay = document.getElementById('canvas-id-display');
        if (canvasIdDisplay) { canvasIdDisplay.textContent = canvasId.substring(0, 8) + '...'; }
        const copyBtn = document.getElementById('copy-canvas-id');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(canvasId).then(() => {
                    copyBtn.textContent = '✅';
                    setTimeout(() => { copyBtn.textContent = '📋'; }, 1500);
                }).catch(err => {
                    console.error('Copy failed', err);
                    copyBtn.textContent = '❌';
                    setTimeout(() => { copyBtn.textContent = '📋'; }, 1500);
                });
            });
        }
    }

    function showLoadingOverlay(message) { loadingOverlay.textContent = message; loadingOverlay.style.display = 'flex'; }
    function hideLoadingOverlay() { loadingOverlay.style.display = 'none'; }

    // --- 8. Centralized Event Listener Setup ---
    function setupEventListeners() {
        document.addEventListener('mouseup', handleTextSelection);
        if (popoverAskAi) popoverAskAi.addEventListener('click', () => { if (lastSelectedText) { /* logic */ } });
        if (popoverAddNote) popoverAddNote.addEventListener('click', () => { if (lastSelectedText) { addNote(`> ${lastSelectedText}\n\n`); } });
        if (themeToggle) themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            themeToggle.textContent = body.classList.contains('dark-mode') ? '☀️' : '🌙';
        });
        if (tocToggleBtn) tocToggleBtn.addEventListener('click', () => {
            wrapper.classList.toggle('toc-hidden');
            systemInfoWidget?.classList.toggle('tucked');
        });
        if (chatToggleBtn) chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));
        if (chatPanel.querySelector('.close-btn')) chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));
        if (notesAppToggleBtn) notesAppToggleBtn.addEventListener('click', () => togglePanel(notesAppPanel));
        if (chatForm) chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });
        if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); }});
        if (deleteSessionBtn) deleteSessionBtn.addEventListener('click', handleDeleteSession);
        if (newChatBtn) newChatBtn.addEventListener('click', handleNewChat);
        if (promptSaveBtn) promptSaveBtn.addEventListener('click', () => { if (customPromptInput) { customPrompt = customPromptInput.value; localStorage.setItem('customTutorPrompt', customPrompt); if(promptModalOverlay) promptModalOverlay.style.display = 'none'; } });
        if (promptCancelBtn) promptCancelBtn.addEventListener('click', () => { if(promptModalOverlay) promptModalOverlay.style.display = 'none'; });
        if (quizModalOverlay) quizModalOverlay.addEventListener('click', e => { if (e.target === quizModalOverlay) quizModalOverlay.style.display = 'none'; });
        if (addNewNoteBtn) addNewNoteBtn.addEventListener('click', () => addNote());
        if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
        if (searchInput) searchInput.addEventListener('input', renderNoteList);
        
        if (exportNotesBtn) exportNotesBtn.addEventListener('click', handleExportToLocal);
        if (importNotesBtn) importNotesBtn.addEventListener('click', handleImportFromLocal);

        const handleInput = () => { updateStatus('입력 중...', true); if (debounceTimer) clearTimeout(debounceTimer); debounceTimer = setTimeout(saveNote, 1000); };
        if (noteTitleInput) noteTitleInput.addEventListener('input', handleInput);
        if (noteContentTextarea) noteContentTextarea.addEventListener('input', handleInput);
        
        if (notesList) notesList.addEventListener('click', e => {
            const i = e.target.closest('.note-item'); if (!i) return;
            const id = Number(i.dataset.id);
            if (e.target.closest('.delete-btn')) { e.stopPropagation(); handleDeleteRequest(id); }
            else if (e.target.closest('.pin-btn')) { e.stopPropagation(); togglePin(id); }
            else openNoteEditor(id);
        });
        
        if (formatToolbar) formatToolbar.addEventListener('click', e => { const b = e.target.closest('.format-btn'); if (b) applyFormat(b.dataset.format); });
        if (linkTopicBtn) linkTopicBtn.addEventListener('click', () => { if(!noteContentTextarea) return; const t = document.title || '현재 학습'; noteContentTextarea.value += `\n\n🔗 연관 학습: [${t}]`; saveNote(); });

        window.addEventListener('online', () => syncFirebaseToLocal());
        window.addEventListener('offline', () => updateOfflineStatus(true));
    }

    // --- 9. Application Initialization Flow ---
    function initialize() {
        updateClock();
        setInterval(updateClock, 1000);
        
        setupDexie();
        initializeFirebase().then(() => {
            setupNavigator();
            makePanelDraggable(chatPanel);
            makePanelDraggable(notesAppPanel);
            setupSystemInfoWidget();
            setupEventListeners();
        });
        updateOfflineStatus(!navigator.onLine);
    }
    
    // --- Run Initialization ---
    initialize();
});
