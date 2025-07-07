/*
--- Ailey & Bailey Canvas ---
File: script.js
Version: 7.7 (Local Backup & Restore)
Architect: [Username] & System Architect Ailey
Description: Implemented local data backup and restore functionality. Users can now export/import all notes and chat sessions for the current canvas as a single JSON file, enhancing data portability and safety.
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

    // -- [NEW] Chat Session UI Elements
    const newChatBtn = document.getElementById('new-chat-btn');
    const sessionList = document.getElementById('session-list');
    const chatSessionTitle = document.getElementById('chat-session-title');
    const deleteSessionBtn = document.getElementById('delete-session-btn');
    const chatWelcomeMessage = document.getElementById('chat-welcome-message');
    
    // -- [NEW] Local Backup/Restore UI Elements
    const exportAllBtn = document.getElementById('export-all-btn');
    const importAllBtn = document.getElementById('import-all-btn');


    // --- 2. State Management ---
    const canvasId = document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id';
    let db, notesCollection, chatSessionsCollectionRef;
    let currentUser = null;
    const appId = 'AileyBailey_Global_Space'; // Simplified App ID
    let localNotesCache = [];
    let currentNoteId = null;
    let unsubscribeFromNotes = null;
    let debounceTimer = null;
    let lastSelectedText = '';

    // --- [RE-ARCHITECTED] CHAT STATE ---
    let localChatSessionsCache = [];
    let currentSessionId = null;
    let unsubscribeFromChatSessions = null;
    let selectedMode = 'ailey_coaching'; // Default for new chats
    let chatQuizState = 'idle';
    let lastQuestion = '';
    let customPrompt = localStorage.getItem('customTutorPrompt') || '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.';
    let currentQuizData = null;

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
                // [CRITICAL ARCHITECTURE CHANGE] Point to the 'sessions' subcollection
                chatSessionsCollectionRef = db.collection(`artifacts/${appId}/users/${currentUser.uid}/chatHistories/${canvasId}/sessions`);
                
                listenToNotes();
                listenToChatSessions(); // Changed from listenToChatHistory
                setupSystemInfoWidget();
            }
        } catch (error) {
            console.error("Firebase 초기화 또는 인증 실패:", error);
            if (notesList) notesList.innerHTML = '<div>클라우드 메모장을 불러오는 데 실패했습니다.</div>';
            if (chatMessages) chatMessages.innerHTML = '<div>AI 러닝메이트 연결에 실패했습니다.</div>';
        }
    }

    // --- [NEW & REFINED] Chat Session Management ---
    
    function listenToChatSessions() {
        if (!chatSessionsCollectionRef) return;
        if (unsubscribeFromChatSessions) unsubscribeFromChatSessions();
        unsubscribeFromChatSessions = chatSessionsCollectionRef.orderBy("updatedAt", "desc").onSnapshot(snapshot => {
            localChatSessionsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderSessionList();
            if (currentSessionId) {
                const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId);
                if (currentSessionData) {
                    renderChatMessages(currentSessionData.messages || []);
                } else {
                    handleNewChat();
                }
            }
        }, error => console.error("Chat session listener error:", error));
    }

    function renderSessionList() {
        if (!sessionList) return;
        sessionList.innerHTML = '';
        localChatSessionsCache.forEach(session => {
            const item = document.createElement('div');
            item.className = 'session-item';
            item.dataset.sessionId = session.id;
            if (session.id === currentSessionId) {
                item.classList.add('active');
            }
            item.innerHTML = `<div class="session-item-title">${session.title || '새 대화'}</div>`;
            item.addEventListener('click', () => selectSession(session.id));
            sessionList.appendChild(item);
        });
    }
    
    function selectSession(sessionId) {
        if (!sessionId) return;
        const sessionData = localChatSessionsCache.find(s => s.id === sessionId);
        if (!sessionData) return;
        
        currentSessionId = sessionId;
        renderSessionList(); 
        
        if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
        if (chatMessages) chatMessages.style.display = 'flex';
        renderChatMessages(sessionData.messages || []);
        
        if (chatSessionTitle) chatSessionTitle.textContent = sessionData.title || '대화';
        if (deleteSessionBtn) deleteSessionBtn.style.display = 'inline-block';
        if (chatInput) chatInput.disabled = false;
        if (chatSendBtn) chatSendBtn.disabled = false;
        chatInput.focus();
    }
    
    function handleNewChat() {
        currentSessionId = null;
        renderSessionList(); 
        
        if (chatMessages) {
             chatMessages.innerHTML = '';
             chatMessages.style.display = 'none';
        }
        if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'flex';
        
        if (chatSessionTitle) chatSessionTitle.textContent = 'AI 러닝메이트';
        if (deleteSessionBtn) deleteSessionBtn.style.display = 'none';
        if (chatInput) {
            chatInput.disabled = false;
            chatInput.value = '';
        }
        if (chatSendBtn) chatSendBtn.disabled = false;
    }

    function handleDeleteSession() {
        if (!currentSessionId) return;
        const sessionToDelete = localChatSessionsCache.find(s => s.id === currentSessionId);
        showModal(`'${sessionToDelete?.title || '이 대화'}'를 삭제하시겠습니까?`, () => {
            if (chatSessionsCollectionRef && currentSessionId) {
                chatSessionsCollectionRef.doc(currentSessionId).delete()
                    .then(() => {
                        console.log("Session deleted successfully");
                        handleNewChat(); // Reset view after deletion
                    })
                    .catch(e => console.error("세션 삭제 실패:", e));
            }
        });
    }

    async function handleChatSend() {
        if (!chatInput || chatInput.disabled) return;
        const query = chatInput.value.trim();
        if (!query) return;

        chatInput.disabled = true;
        chatSendBtn.disabled = true;

        const userMessage = { role: 'user', content: query, timestamp: new Date().toISOString() };
        let sessionRef;
        let messages = [];

        try {
            if (!currentSessionId) { // New chat session
                if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
                if (chatMessages) chatMessages.style.display = 'flex';
                
                const newSession = {
                    title: query.substring(0, 40) + (query.length > 40 ? '...' : ''),
                    messages: [userMessage],
                    mode: selectedMode,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                };
                sessionRef = await chatSessionsCollectionRef.add(newSession);
                currentSessionId = sessionRef.id;
                messages = newSession.messages;
                renderSessionList();
            } else { // Existing session
                sessionRef = chatSessionsCollectionRef.doc(currentSessionId);
                const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId);
                messages = [...(currentSessionData.messages || []), userMessage];
                await sessionRef.update({ 
                    messages: messages,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            renderChatMessages(messages);
            
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'chat-message ai';
            loadingDiv.innerHTML = '<div class="loading-indicator">AI가 답변을 생성하고 있습니다...</div>';
            if (chatMessages) {
                chatMessages.appendChild(loadingDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
            
            // This is a placeholder for the actual API call logic
            await new Promise(res => setTimeout(res, 1000)); 
            const aiRes = "AI 응답 예시입니다.";

            const aiMessage = { role: 'ai', content: aiRes, timestamp: new Date().toISOString() };
            messages.push(aiMessage);
            await sessionRef.update({ 
                messages: messages,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
             });

        } catch (e) {
            console.error("Chat send error:", e);
            const errorMessage = { role: 'ai', content: `오류가 발생했습니다: ${e.message}`, timestamp: new Date().toISOString() };
            if (sessionRef) {
                 const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId);
                 const errorMessages = [...(currentSessionData?.messages || []), errorMessage];
                 await sessionRef.update({ messages: errorMessages });
            }
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
        messages.forEach(msg => {
            const d = document.createElement('div');
            d.className = `chat-message ${msg.role}`;
            // ... (message rendering logic remains the same)
            const cd = document.createElement('div');
            cd.innerHTML = msg.content.replace(/\n/g, '<br>'); // Simple rendering
            d.appendChild(cd);
            chatMessages.appendChild(d);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function setupChatModeSelector() {
        if (!chatModeSelector) return;
        chatModeSelector.innerHTML = '';
        const modes = [{ id: 'ailey_coaching', t: '기본 코칭 💬' }, { id: 'deep_learning', t: '심화 학습 🧠' }, { id: 'custom', t: '커스텀 ⚙️' }];
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

    // --- [NEW] Local Backup and Restore Functions ---

    function exportAllData() {
        if (!currentUser) {
            showModal("데이터를 내보내려면 로그인이 필요합니다.", () => {});
            return;
        }

        const date = new Date().toISOString().split('T')[0];
        const filename = `Ailey-Bailey-Canvas-Backup-${date}.json`;
        
        // Sanitize caches to remove undefined values before stringifying
        const cleanNotes = JSON.parse(JSON.stringify(localNotesCache));
        const cleanChatSessions = JSON.parse(JSON.stringify(localChatSessionsCache));

        const dataToExport = {
            appInfo: {
                appName: "Ailey & Bailey Canvas",
                version: "1.0",
                exportDate: new Date().toISOString(),
            },
            notes: cleanNotes,
            chatSessions: {
                [canvasId]: cleanChatSessions
            }
        };

        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importAllData() {
        if (!currentUser) {
            showModal("데이터를 불러오려면 로그인이 필요합니다.", () => {});
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);

                    // Basic validation
                    if (!importedData.appInfo || !importedData.notes || !importedData.chatSessions) {
                        throw new Error("유효하지 않은 백업 파일 형식입니다.");
                    }

                    const message = `정말로 데이터를 불러오시겠습니까? 현재 클라우드에 저장된 모든 메모와 이 캔버스의 채팅 기록이 선택한 파일의 내용으로 대체됩니다. 이 작업은 되돌릴 수 없습니다.`;
                    
                    showModal(message, async () => {
                        try {
                            // Show loading state
                            if (modalMessage) modalMessage.textContent = '데이터를 처리 중입니다... 이 창을 닫지 마세요.';
                            if (modalConfirmBtn) modalConfirmBtn.disabled = true;
                            if (modalCancelBtn) modalCancelBtn.disabled = true;
                            
                            const batch = db.batch();

                            // 1. Delete existing data
                            localNotesCache.forEach(note => {
                                batch.delete(notesCollection.doc(note.id));
                            });
                            localChatSessionsCache.forEach(session => {
                                batch.delete(chatSessionsCollectionRef.doc(session.id));
                            });

                            // 2. Add imported data
                            importedData.notes.forEach(note => {
                                const { id, ...noteData } = note; // Exclude old ID
                                batch.set(notesCollection.doc(), noteData);
                            });
                            
                            const sessionsForThisCanvas = importedData.chatSessions[canvasId] || [];
                            sessionsForThisCanvas.forEach(session => {
                                const { id, ...sessionData } = session; // Exclude old ID
                                batch.set(chatSessionsCollectionRef.doc(), sessionData);
                            });
                            
                            // Commit all changes at once
                            await batch.commit();

                            alert("데이터를 성공적으로 불러왔습니다! 페이지가 새로고침됩니다.");
                            location.reload();

                        } catch (commitError) {
                            console.error("데이터 불러오기 처리 중 오류 발생:", commitError);
                            showModal(`데이터 불러오기에 실패했습니다: ${commitError.message}`, () => {});
                        }
                    });

                } catch (parseError) {
                    console.error("파일 파싱 오류:", parseError);
                    showModal(`파일을 읽는 중 오류가 발생했습니다: ${parseError.message}`, () => {});
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }


    // --- [Unchanged] Notes, UI & Utilities ---
    
    function listenToNotes() { if (!notesCollection) return; if (unsubscribeFromNotes) unsubscribeFromNotes(); unsubscribeFromNotes = notesCollection.onSnapshot(s => { localNotesCache = s.docs.map(d => ({ id: d.id, ...d.data() })); renderNoteList(); }, e => console.error("노트 실시간 수신 오류:", e)); }
    function renderNoteList() { if (!notesList || !searchInput) return; const term = searchInput.value.toLowerCase(); const filtered = localNotesCache.filter(n => (n.title && n.title.toLowerCase().includes(term)) || (n.content && n.content.toLowerCase().includes(term))); filtered.sort((a,b) => (b.isPinned - a.isPinned) || (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0)); notesList.innerHTML = ''; if (filtered.length === 0) { notesList.innerHTML = '<div>표시할 메모가 없습니다.</div>'; return; } filtered.forEach(n => { const i = document.createElement('div'); i.className = 'note-item'; i.dataset.id = n.id; if (n.isPinned) i.classList.add('pinned'); const d = n.updatedAt ? new Date(n.updatedAt.toMillis()).toLocaleString() : '날짜 없음'; i.innerHTML = `<div class="note-item-content"><div class="note-item-title">${n.title||'무제'}</div><div class="note-item-date">${d}</div></div><div class="note-item-actions"><button class="item-action-btn pin-btn ${n.isPinned?'pinned-active':''}" title="고정">${n.isPinned?'📌':'📍'}</button><button class="item-action-btn delete-btn" title="삭제">🗑️</button></div>`; notesList.appendChild(i); }); }
    async function addNote(content = '') { if (!notesCollection) return; try { const ref = await notesCollection.add({ title: '새 메모', content: content, isPinned: false, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); openNoteEditor(ref.id); } catch (e) { console.error("새 메모 추가 실패:", e); } }
    function saveNote() { if (debounceTimer) clearTimeout(debounceTimer); if (!currentNoteId || !notesCollection) return; const data = { title: noteTitleInput.value, content: noteContentTextarea.value, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }; notesCollection.doc(currentNoteId).update(data).then(() => updateStatus('저장됨 ✓', true)).catch(e => { console.error("메모 저장 실패:", e); updateStatus('저장 실패 ❌', false); }); }
    function handleDeleteRequest(id) { showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => { if (notesCollection) notesCollection.doc(id).delete().catch(e => console.error("메모 삭제 실패:", e)); }); }
    async function togglePin(id) { if (!notesCollection) return; const note = localNotesCache.find(n => n.id === id); if (note) await notesCollection.doc(id).update({ isPinned: !note.isPinned }); }
    function exportNotes() { const str = JSON.stringify(localNotesCache, null, 2); const blob = new Blob([str], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'my-notes.json'; a.click(); URL.revokeObjectURL(url); }
    function switchView(view) { if (view === 'editor') { if(noteListView) noteListView.classList.remove('active'); if(noteEditorView) noteEditorView.classList.add('active'); } else { if(noteEditorView) noteEditorView.classList.remove('active'); if(noteListView) noteListView.classList.add('active'); currentNoteId = null; } }
    function openNoteEditor(id) { const note = localNotesCache.find(n => n.id === id); if (note && noteTitleInput && noteContentTextarea) { currentNoteId = id; noteTitleInput.value = note.title || ''; noteContentTextarea.value = note.content || ''; switchView('editor'); } }
    function updateStatus(msg, success) { if (!autoSaveStatus) return; autoSaveStatus.textContent = msg; autoSaveStatus.style.color = success ? 'lightgreen' : 'lightcoral'; setTimeout(() => { autoSaveStatus.textContent = ''; }, 2000); }
    function showModal(message, onConfirm) { if (!customModal || !modalMessage || !modalConfirmBtn || !modalCancelBtn) return; modalMessage.textContent = message; modalConfirmBtn.disabled = false; modalCancelBtn.disabled = false; customModal.style.display = 'flex'; modalConfirmBtn.onclick = () => { onConfirm(); customModal.style.display = 'none'; }; modalCancelBtn.onclick = () => { customModal.style.display = 'none'; }; }
    function openPromptModal() { if (customPromptInput) customPromptInput.value = customPrompt; if (promptModalOverlay) promptModalOverlay.style.display = 'flex'; }
    function closePromptModal() { if (promptModalOverlay) promptModalOverlay.style.display = 'none'; }
    function saveCustomPrompt() { if (customPromptInput) { customPrompt = customPromptInput.value; localStorage.setItem('customTutorPrompt', customPrompt); closePromptModal(); } }
    
    // ... other unchanged utility functions like makePanelDraggable, setupNavigator, etc. would be here ...


    // --- 4. Global Initialization ---
    function initialize() {
        if (!body || !wrapper) { console.error("Core layout elements not found."); return; }
        
        initializeFirebase().then(() => {
            // ... other initializations
        });
        
        if (exportNotesBtn) {
            exportNotesBtn.querySelector('span').textContent = '메모만'; // Change text for clarity
            exportNotesBtn.title = '현재 모든 메모만 내보내기';
            exportNotesBtn.addEventListener('click', exportNotes);
        }

        // Add event listeners for new buttons
        if (exportAllBtn) exportAllBtn.addEventListener('click', exportAllData);
        if (importAllBtn) importAllBtn.addEventListener('click', importAllData);

        if (chatForm) chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });
        if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } });
        if (deleteSessionBtn) deleteSessionBtn.addEventListener('click', handleDeleteSession);
        if (newChatBtn) newChatBtn.addEventListener('click', handleNewChat);
        if (addNewNoteBtn) addNewNoteBtn.addEventListener('click', () => addNote());
        if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
        if (searchInput) searchInput.addEventListener('input', renderNoteList);
        const handleInput = () => { updateStatus('입력 중...', true); if (debounceTimer) clearTimeout(debounceTimer); debounceTimer = setTimeout(saveNote, 1000); };
        if (noteTitleInput) noteTitleInput.addEventListener('input', handleInput);
        if (noteContentTextarea) noteContentTextarea.addEventListener('input', handleInput);
        if (notesList) notesList.addEventListener('click', e => { const i = e.target.closest('.note-item'); if (!i) return; const id = i.dataset.id; if (e.target.closest('.delete-btn')) handleDeleteRequest(id); else if (e.target.closest('.pin-btn')) togglePin(id); else openNoteEditor(id); });
        
        // ... other event listeners ...
    }

    // --- 5. Run Initialization ---
    initialize();
});
