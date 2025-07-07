/*
--- Ailey & Bailey Canvas ---
File: script.js
Version: 7.8 (Google Drive Integration)
Architect: [Username] & System Architect Ailey
Description: Implemented Google Drive backup (export) and restore (import) functionality.
Users can now sign in with their Google account to save their entire learning data (notes & chats)
to their personal Google Drive and restore it later, ensuring data ownership and portability.
This script requires configuration of Google Cloud API_KEY and CLIENT_ID.
*/

document.addEventListener('DOMContentLoaded', function () {
    // --- 0. [IMPORTANT] CONFIGURATION ---
    // Replace with your own Google Cloud project credentials.
    const API_KEY = 'YOUR_GOOGLE_API_KEY'; // For using Google APIs
    const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'; // For OAuth 2.0

    // --- 1. Element Declarations ---
    const body = document.body;
    const wrapper = document.querySelector('.wrapper');
    const systemInfoWidget = document.getElementById('system-info-widget');
    const selectionPopover = document.getElementById('selection-popover');
    const popoverAskAi = document.getElementById('popover-ask-ai');
    const popoverAddNote = document.getElementById('popover-add-note');
    const tocToggleBtn = document.getElementById('toc-toggle-btn');
    const customModal = document.getElementById('custom-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const themeToggle = document.getElementById('theme-toggle');

    // Chat Panel Elements
    const chatPanel = document.getElementById('chat-panel');
    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const sessionList = document.getElementById('session-list');
    const chatSessionTitle = document.getElementById('chat-session-title');
    const deleteSessionBtn = document.getElementById('delete-session-btn');
    const chatWelcomeMessage = document.getElementById('chat-welcome-message');
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatModeSelector = document.getElementById('chat-mode-selector');

    // Notes Panel Elements
    const notesAppPanel = document.getElementById('notes-app-panel');
    const notesAppToggleBtn = document.getElementById('notes-app-toggle-btn');
    const noteListView = document.getElementById('note-list-view');
    const noteEditorView = document.getElementById('note-editor-view');
    const notesList = document.getElementById('notes-list');
    const searchInput = document.getElementById('search-input');
    const addNewNoteBtn = document.getElementById('add-new-note-btn');
    const backToListBtn = document.getElementById('back-to-list-btn');
    const noteTitleInput = document.getElementById('note-title-input');
    const noteContentTextarea = document.getElementById('note-content-textarea');
    const autoSaveStatus = document.getElementById('auto-save-status');

    // -- [NEW] Google Drive Integration Elements
    const importFromDriveBtn = document.getElementById('import-from-drive-btn');
    const exportToDriveBtn = document.getElementById('export-to-drive-btn');


    // --- 2. State Management ---
    const appId = 'AileyBailey_Global_Space';
    let db, notesCollection, chatSessionsCollectionRef;
    let currentUser = null;
    let localNotesCache = [];
    let localChatSessionsCache = [];
    let currentNoteId = null;
    let currentSessionId = null;
    let unsubscribeFromNotes = null;
    let unsubscribeFromChatSessions = null;
    let debounceTimer = null;
    let lastSelectedText = '';
    let selectedMode = 'ailey_coaching';

    // -- [NEW] Google API State
    const SCOPES = 'https://www.googleapis.com/auth/drive.file';
    let tokenClient;
    let gapiInited = false;
    let gisInited = false;
    let pickerInited = false;


    // --- 3. Function Definitions ---

    // --- 3.1 Firebase Core (Main Data Store) ---
    async function initializeFirebase() {
        try {
            const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
            if (!firebaseConfig) { throw new Error("Firebase config not found."); }
            if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
            
            const auth = firebase.auth();
            db = firebase.firestore();
            
            await auth.signInAnonymously();
            currentUser = auth.currentUser;

            if (currentUser) {
                notesCollection = db.collection(`artifacts/${appId}/users/${currentUser.uid}/notes`);
                chatSessionsCollectionRef = db.collection(`artifacts/${appId}/users/${currentUser.uid}/chatSessions`);
                listenToNotes();
                listenToChatSessions();
            }
        } catch (error) {
            console.error("Firebase Initialization Failed:", error);
            if (notesList) notesList.innerHTML = '<div>Cloud notes failed to load.</div>';
            if (chatMessages) chatMessages.innerHTML = '<div>AI co-pilot connection failed.</div>';
        }
    }

    function listenToNotes() {
        if (!notesCollection) return;
        if (unsubscribeFromNotes) unsubscribeFromNotes();
        unsubscribeFromNotes = notesCollection.orderBy("updatedAt", "desc").onSnapshot(snapshot => {
            localNotesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderNoteList();
        }, error => console.error("Note listener error:", error));
    }

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


    // --- 3.2 [NEW] Google Drive Integration (Backup/Restore) ---

    function initializeGoogleApi() {
        // Load the GAPI client script
        const scriptGapi = document.createElement('script');
        scriptGapi.src = 'https://apis.google.com/js/api.js';
        scriptGapi.async = true;
        scriptGapi.defer = true;
        scriptGapi.onload = gapiLoaded;
        document.body.appendChild(scriptGapi);

        // Load the GIS client script
        const scriptGis = document.createElement('script');
        scriptGis.src = 'https://accounts.google.com/gsi/client';
        scriptGis.async = true;
        scriptGis.defer = true;
        scriptGis.onload = gisLoaded;
        document.body.appendChild(scriptGis);
    }
    
    function gapiLoaded() {
        gapi.load('client:picker', () => {
            pickerInited = true;
            gapi.client.init({ apiKey: API_KEY })
                .then(() => { gapiInited = true; });
        });
    }

    function gisLoaded() {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: '', // Callback is handled by the Promise fulfillment
        });
        gisInited = true;
    }
    
    async function requestGoogleAuth() {
        return new Promise((resolve, reject) => {
            if (!tokenClient) {
                reject(new Error("Google Auth client not initialized."));
                return;
            }

            // A bit of a hack for the callback, since the client library expects a function name
            const callback = (resp) => {
                if (resp.error) {
                    reject(new Error(resp.error));
                } else {
                    resolve(resp);
                }
            };

            tokenClient.callback = callback;
            tokenClient.requestAccessToken({ prompt: 'consent' });
        });
    }

    async function handleExportToDrive() {
        showPanelLoading('notes-app-panel', 'Google 인증 확인 중...');
        try {
            if (!gapi.client.getToken()) {
                await requestGoogleAuth();
            }
            
            showPanelLoading('notes-app-panel', '학습 데이터 수집 중...');
            const notesSnapshot = await notesCollection.get();
            const notesData = notesSnapshot.docs.map(doc => doc.data());

            const chatSessionsSnapshot = await chatSessionsCollectionRef.get();
            const chatSessionsData = chatSessionsSnapshot.docs.map(doc => doc.data());
            
            const backupData = {
                exportedAt: new Date().toISOString(),
                notes: notesData,
                chatSessions: chatSessionsData
            };
            const backupContent = JSON.stringify(backupData, null, 2);

            const date = new Date().toISOString().slice(0, 10);
            const fileName = `[Ailey & Bailey] 백업_${date}.json`;

            showPanelLoading('notes-app-panel', 'Google Drive에 저장 중...');

            await gapi.client.load('drive', 'v3');
            const fileMetadata = { 'name': fileName, 'mimeType': 'application/json' };
            
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
            form.append('file', new Blob([backupContent], { type: 'application/json' }));

            const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: new Headers({ 'Authorization': 'Bearer ' + gapi.client.getToken().access_token }),
                body: form,
            });

            if (!res.ok) throw new Error('File upload failed.');
            
            showModal('성공적으로 Google Drive에 데이터를 내보냈습니다!', () => {});

        } catch (error) {
            console.error("Export to Drive failed:", error);
            showModal(`오류가 발생했습니다: ${error.message}`, () => {});
        } finally {
            hidePanelLoading('notes-app-panel');
        }
    }

    async function handleImportFromDrive() {
        try {
             if (!gapi.client.getToken()) {
                showPanelLoading('notes-app-panel', 'Google 인증 확인 중...');
                await requestGoogleAuth();
                hidePanelLoading('notes-app-panel');
            }
            createPicker();
        } catch (error) {
             console.error("Import from Drive failed:", error);
             showModal(`인증 중 오류가 발생했습니다: ${error.message}`, () => {});
             hidePanelLoading('notes-app-panel');
        }
    }

    function createPicker() {
        const view = new google.picker.View(google.picker.ViewId.DOCS);
        view.setMimeTypes("application/json");
        const picker = new google.picker.PickerBuilder()
            .enableFeature(google.picker.Feature.NAV_HIDDEN)
            .setAppId(appId.split('_')[0]) // Just use the base name
            .setOAuthToken(gapi.client.getToken().access_token)
            .addView(view)
            .setDeveloperKey(API_KEY)
            .setCallback(pickerCallback)
            .build();
        picker.setVisible(true);
    }

    async function pickerCallback(data) {
        if (data.action === google.picker.Action.PICKED) {
            const fileId = data.docs[0].id;
            
            showPanelLoading('notes-app-panel', '파일을 불러오는 중...');
            
            try {
                await gapi.client.load('drive', 'v3');
                const res = await gapi.client.drive.files.get({
                    fileId: fileId,
                    alt: 'media'
                });

                const backupData = JSON.parse(res.body);

                if (!backupData.notes || !backupData.chatSessions) {
                    throw new Error("선택한 파일이 올바른 백업 파일 형식이 아닙니다.");
                }

                hidePanelLoading('notes-app-panel');
                
                showModal('현재 모든 학습 데이터가 선택한 파일의 내용으로 교체됩니다. 이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?', async () => {
                    showPanelLoading('notes-app-panel', '데이터 복원 중...');
                    
                    // Overwrite notes
                    const notesBatch = db.batch();
                    const oldNotes = await notesCollection.get();
                    oldNotes.forEach(doc => notesBatch.delete(doc.ref));
                    backupData.notes.forEach(note => {
                        const newNoteRef = notesCollection.doc();
                        // Convert Firestore Timestamps if they exist
                        if(note.createdAt?.seconds) note.createdAt = new firebase.firestore.Timestamp(note.createdAt.seconds, note.createdAt.nanoseconds);
                        if(note.updatedAt?.seconds) note.updatedAt = new firebase.firestore.Timestamp(note.updatedAt.seconds, note.updatedAt.nanoseconds);
                        notesBatch.set(newNoteRef, note);
                    });
                    await notesBatch.commit();

                    // Overwrite chat sessions
                    const chatBatch = db.batch();
                    const oldChats = await chatSessionsCollectionRef.get();
                    oldChats.forEach(doc => chatBatch.delete(doc.ref));
                    backupData.chatSessions.forEach(session => {
                        const newChatRef = chatSessionsCollectionRef.doc();
                         if(session.createdAt?.seconds) session.createdAt = new firebase.firestore.Timestamp(session.createdAt.seconds, session.createdAt.nanoseconds);
                         if(session.updatedAt?.seconds) session.updatedAt = new firebase.firestore.Timestamp(session.updatedAt.seconds, session.updatedAt.nanoseconds);
                        chatBatch.set(newChatRef, session);
                    });
                    await chatBatch.commit();
                    
                    hidePanelLoading('notes-app-panel');
                    showModal('데이터 복원이 완료되었습니다!', () => {});
                });

            } catch (error) {
                console.error("File processing failed:", error);
                hidePanelLoading('notes-app-panel');
                showModal(`파일 처리 중 오류가 발생했습니다: ${error.message}`, () => {});
            }
        }
    }


    // --- 3.3 UI & Utilities ---
    // (This section contains all other functions like handleChatSend, renderNoteList, etc.)
    // For brevity, only showing a few key utility functions here. The rest of the JS file is unchanged.

    function showModal(message, onConfirm) {
        if (!customModal || !modalMessage || !modalConfirmBtn || !modalCancelBtn) return;
        modalMessage.textContent = message;
        modalConfirmBtn.style.display = onConfirm ? 'inline-block' : 'none';
        modalCancelBtn.textContent = onConfirm ? '취소' : '확인';
        customModal.style.display = 'flex';
        
        const confirmHandler = () => {
            if(onConfirm) onConfirm();
            customModal.style.display = 'none';
            modalConfirmBtn.removeEventListener('click', confirmHandler);
            modalCancelBtn.removeEventListener('click', cancelHandler);
        };
        const cancelHandler = () => {
            customModal.style.display = 'none';
            modalConfirmBtn.removeEventListener('click', confirmHandler);
            modalCancelBtn.removeEventListener('click', cancelHandler);
        };

        modalConfirmBtn.addEventListener('click', confirmHandler);
        modalCancelBtn.addEventListener('click', cancelHandler);
    }
    
    function showPanelLoading(panelId, message = "처리 중...") {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        let overlay = panel.querySelector('.panel-loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'panel-loading-overlay';
            overlay.innerHTML = `<div class="loader"></div><div class="loading-text"></div>`;
            panel.appendChild(overlay);
        }
        overlay.querySelector('.loading-text').textContent = message;
        overlay.style.display = 'flex';
    }

    function hidePanelLoading(panelId) {
        const panel = document.getElementById(panelId);
        if (panel) {
            const overlay = panel.querySelector('.panel-loading-overlay');
            if (overlay) overlay.style.display = 'none';
        }
    }
    
    // ... all other unchanged functions from the original script.js file go here ...
    // (handleNewChat, renderSessionList, selectSession, handleChatSend, renderChatMessages,
    // renderNoteList, addNote, saveNote, etc. They are not repeated here for conciseness.)

    // --- PASTE UNCHANGED FUNCTIONS FROM THE ORIGINAL SCRIPT.TXT FILE HERE ---
    function renderNoteList() { if (!notesList || !searchInput) return; const term = searchInput.value.toLowerCase(); const filtered = localNotesCache.filter(n => (n.title && n.title.toLowerCase().includes(term)) || (n.content && n.content.toLowerCase().includes(term))); filtered.sort((a,b) => (b.isPinned - a.isPinned) || (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0)); notesList.innerHTML = ''; if (filtered.length === 0) { notesList.innerHTML = '<div>표시할 메모가 없습니다.</div>'; return; } filtered.forEach(n => { const i = document.createElement('div'); i.className = 'note-item'; i.dataset.id = n.id; if (n.isPinned) i.classList.add('pinned'); const d = n.updatedAt ? new Date(n.updatedAt.toMillis()).toLocaleString() : '날짜 없음'; i.innerHTML = `<div class="note-item-content"><div class="note-item-title">${n.title||'무제'}</div><div class="note-item-date">${d}</div></div><div class="note-item-actions"><button class="item-action-btn pin-btn ${n.isPinned?'pinned-active':''}" title="고정">${n.isPinned?'📌':'📍'}</button><button class="item-action-btn delete-btn" title="삭제">🗑️</button></div>`; notesList.appendChild(i); }); }
    async function addNote(content = '') { if (!notesCollection) return; try { const ref = await notesCollection.add({ title: '새 메모', content: content, isPinned: false, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); openNoteEditor(ref.id); } catch (e) { console.error("새 메모 추가 실패:", e); } }
    function openNoteEditor(id) { const note = localNotesCache.find(n => n.id === id); if (note && noteTitleInput && noteContentTextarea) { currentNoteId = id; noteTitleInput.value = note.title || ''; noteContentTextarea.value = note.content || ''; switchView('editor'); } }
    function switchView(view) { if (view === 'editor') { if(noteListView) noteListView.classList.remove('active'); if(noteEditorView) noteEditorView.classList.add('active'); } else { if(noteEditorView) noteEditorView.classList.remove('active'); if(noteListView) noteListView.classList.add('active'); currentNoteId = null; } }
    function saveNote() { if (debounceTimer) clearTimeout(debounceTimer); if (!currentNoteId || !notesCollection) return; const data = { title: noteTitleInput.value, content: noteContentTextarea.value, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }; notesCollection.doc(currentNoteId).update(data).then(() => updateStatus('저장됨 ✓', true)).catch(e => { console.error("메모 저장 실패:", e); updateStatus('저장 실패 ❌', false); }); }
    function updateStatus(msg, success) { if (!autoSaveStatus) return; autoSaveStatus.textContent = msg; autoSaveStatus.style.color = success ? 'lightgreen' : 'lightcoral'; setTimeout(() => { autoSaveStatus.textContent = ''; }, 2000); }
    function handleDeleteRequest(id) { showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => { if (notesCollection) notesCollection.doc(id).delete().catch(e => console.error("메모 삭제 실패:", e)); }); }
    async function togglePin(id) { if (!notesCollection) return; const note = localNotesCache.find(n => n.id === id); if (note) await notesCollection.doc(id).update({ isPinned: !note.isPinned }); }
    function handleNewChat() { currentSessionId = null; renderSessionList(); if (chatMessages) { chatMessages.innerHTML = ''; chatMessages.style.display = 'none'; } if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'flex'; if (chatSessionTitle) chatSessionTitle.textContent = 'AI 러닝메이트'; if (deleteSessionBtn) deleteSessionBtn.style.display = 'none'; if (chatInput) { chatInput.disabled = false; chatInput.value = ''; } if (chatSendBtn) chatSendBtn.disabled = false; }
    function renderSessionList() { if (!sessionList) return; sessionList.innerHTML = ''; localChatSessionsCache.forEach(session => { const item = document.createElement('div'); item.className = 'session-item'; item.dataset.sessionId = session.id; if (session.id === currentSessionId) { item.classList.add('active'); } item.innerHTML = `<div class="session-item-title">${session.title || '새 대화'}</div>`; item.addEventListener('click', () => selectSession(session.id)); sessionList.appendChild(item); }); }
    function selectSession(sessionId) { if (!sessionId) return; const sessionData = localChatSessionsCache.find(s => s.id === sessionId); if (!sessionData) return; currentSessionId = sessionId; renderSessionList(); if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none'; if (chatMessages) chatMessages.style.display = 'flex'; renderChatMessages(sessionData.messages || []); if (chatSessionTitle) chatSessionTitle.textContent = sessionData.title || '대화'; if (deleteSessionBtn) deleteSessionBtn.style.display = 'inline-block'; if (chatInput) chatInput.disabled = false; if (chatSendBtn) chatSendBtn.disabled = false; chatInput.focus(); }
    async function handleChatSend() { if (!chatInput || chatInput.disabled) return; const query = chatInput.value.trim(); if (!query) return; chatInput.disabled = true; chatSendBtn.disabled = true; const userMessage = { role: 'user', content: query, timestamp: new Date().toISOString() }; let sessionRef; let messages = []; try { if (!currentSessionId) { if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none'; if (chatMessages) chatMessages.style.display = 'flex'; const newSession = { title: query.substring(0, 40) + (query.length > 40 ? '...' : ''), messages: [userMessage], mode: selectedMode, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp(), }; sessionRef = await chatSessionsCollectionRef.add(newSession); currentSessionId = sessionRef.id; messages = newSession.messages; renderSessionList(); } else { sessionRef = chatSessionsCollectionRef.doc(currentSessionId); const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId); messages = [...(currentSessionData.messages || []), userMessage]; await sessionRef.update({ messages: messages, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); } renderChatMessages(messages); const loadingDiv = document.createElement('div'); loadingDiv.className = 'chat-message ai'; loadingDiv.innerHTML = '<div class="loading-indicator">AI가 답변을 생성하고 있습니다...</div>'; if (chatMessages) { chatMessages.appendChild(loadingDiv); chatMessages.scrollTop = chatMessages.scrollHeight; } const apiMessages = messages.map(msg => ({ role: msg.role === 'ai' ? 'model' : 'user', parts: [{ text: msg.content }] })); const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: apiMessages }) }); if (!res.ok) throw new Error(`${res.status}`); const result = await res.json(); let aiRes = "답변 생성 중 오류... 😥"; if (result.candidates?.[0].content.parts[0]) { aiRes = result.candidates[0].content.parts[0].text; } const aiMessage = { role: 'ai', content: aiRes, timestamp: new Date().toISOString() }; messages.push(aiMessage); await sessionRef.update({ messages: messages, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); } catch (e) { console.error("Chat send error:", e); const errorMessage = { role: 'ai', content: `API 오류가 발생했습니다: ${e.message}`, timestamp: new Date().toISOString() }; if (sessionRef) { const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId); const errorMessages = [...(currentSessionData?.messages || []), errorMessage]; await sessionRef.update({ messages: errorMessages }); } } finally { chatInput.disabled = false; chatSendBtn.disabled = false; chatInput.value = ''; chatInput.style.height = 'auto'; chatInput.focus(); } }
    function renderChatMessages(messages = []) { if (!chatMessages) return; chatMessages.innerHTML = ''; messages.forEach(msg => { const d = document.createElement('div'); d.className = `chat-message ${msg.role}`; let c = msg.content; if (c.startsWith('[PROBLEM_GENERATED]')) { d.classList.add('quiz-problem'); c = c.replace('[PROBLEM_GENERATED]', '').trim(); } else if (c.startsWith('[CORRECT]')) { d.classList.add('quiz-solution', 'correct'); const h = document.createElement('div'); h.className = 'solution-header correct'; h.textContent = '✅ 정답입니다!'; d.appendChild(h); c = c.replace('[CORRECT]', '').trim(); } else if (c.startsWith('[INCORRECT]')) { d.classList.add('quiz-solution', 'incorrect'); const h = document.createElement('div'); h.className = 'solution-header incorrect'; h.textContent = '❌ 오답입니다.'; d.appendChild(h); c = c.replace('[INCORRECT]', '').trim(); } const cd = document.createElement('div'); cd.innerHTML = c.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'); d.appendChild(cd); if (msg.timestamp) { const t = document.createElement('div'); t.className = 'chat-timestamp'; t.textContent = new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }); d.appendChild(t); } if (msg.role === 'ai') { const b = document.createElement('button'); b.className = 'send-to-note-btn'; b.textContent = '메모로 보내기'; b.onclick = e => { addNote(`[AI 러닝메이트] ${cd.textContent}`); e.target.textContent = '✅'; e.target.disabled = true; }; cd.appendChild(b); } chatMessages.appendChild(d); }); if(chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight; }
    function handleDeleteSession() { if (!currentSessionId) return; const sessionToDelete = localChatSessionsCache.find(s => s.id === currentSessionId); showModal(`'${sessionToDelete?.title || '이 대화'}'를 삭제하시겠습니까?`, () => { if (chatSessionsCollectionRef && currentSessionId) { chatSessionsCollectionRef.doc(currentSessionId).delete().then(() => { console.log("Session deleted"); handleNewChat(); }).catch(e => console.error("세션 삭제 실패:", e)); } }); }


    // --- 4. Global Initialization ---
    function initialize() {
        if (!body) { console.error("Core layout elements not found."); return; }
        
        initializeFirebase().then(() => {
            // Firebase loaded, now safe to init dependent things
        });
        
        // Initialize Google APIs in parallel
        initializeGoogleApi();

        // General event listeners
        if (themeToggle) themeToggle.addEventListener('click', () => { body.classList.toggle('dark-mode'); themeToggle.textContent = body.classList.contains('dark-mode') ? '☀️' : '🌙'; });
        if (chatToggleBtn) chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));
        if (chatPanel) chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));
        if (notesAppToggleBtn) notesAppToggleBtn.addEventListener('click', () => togglePanel(notesAppPanel));
        if (notesAppPanel) notesAppPanel.querySelector('.panel-header .close-btn')?.addEventListener('click', () => togglePanel(notesAppPanel, false));
        if (chatForm) chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });
        if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } });
        if (newChatBtn) newChatBtn.addEventListener('click', handleNewChat);
        if (deleteSessionBtn) deleteSessionBtn.addEventListener('click', handleDeleteSession);
        
        if (addNewNoteBtn) addNewNoteBtn.addEventListener('click', () => addNote());
        if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
        if (searchInput) searchInput.addEventListener('input', renderNoteList);
        const handleInput = () => { updateStatus('입력 중...', true); if (debounceTimer) clearTimeout(debounceTimer); debounceTimer = setTimeout(saveNote, 1000); };
        if (noteTitleInput) noteTitleInput.addEventListener('input', handleInput);
        if (noteContentTextarea) noteContentTextarea.addEventListener('input', handleInput);
        if (notesList) notesList.addEventListener('click', e => { const i = e.target.closest('.note-item'); if (!i) return; const id = i.dataset.id; if (e.target.closest('.delete-btn')) handleDeleteRequest(id); else if (e.target.closest('.pin-btn')) togglePin(id); else openNoteEditor(id); });

        // -- [NEW] Google Drive Button Listeners
        if (exportToDriveBtn) exportToDriveBtn.addEventListener('click', handleExportToDrive);
        if (importFromDriveBtn) importFromDriveBtn.addEventListener('click', handleImportFromDrive);
    }
    
    function togglePanel(panelElement, forceShow = null) { if (!panelElement) return; const show = forceShow !== null ? forceShow : panelElement.style.display !== 'flex'; panelElement.style.display = show ? 'flex' : 'none'; }


    // --- 5. Run Initialization ---
    initialize();
});
