/*
--- Ailey & Bailey Canvas ---
File: script.js
Version: 7.9 (Critical Bug Fix & Stability Patch)
Architect: [Username] & System Architect Ailey
Description: Fixed a critical scope issue causing Google API initialization to fail. Moved handleGapiLoad and handleGisLoad to the global scope. Re-enabled the learning navigator (setupNavigator).
*/

// [FIX 1] The two main Google API loader functions are moved OUTSIDE of the DOMContentLoaded event listener.
// This makes them global functions, allowing the `onload` attribute in the HTML to find and execute them.

// Called when the Google API script is loaded.
function handleGapiLoad() {
    gapi.load('client:picker', () => {
        // No client.init() needed for the latest GAPI version for simple Drive access.
        gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
        window.gapiInited = true; // Use window object to ensure global access
    });
};

// Called when the Google Sign-In script is loaded.
function handleGisLoad() {
    const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'; // IMPORTANT: Replace with your actual Client ID
    const SCOPES = 'https://www.googleapis.com/auth/drive.file';
    window.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // Callback is handled by the promise
    });
    window.gisInited = true; // Use window object to ensure global access
};


document.addEventListener('DOMContentLoaded', function () {
    // --- 1. Element Declarations ---
    const body = document.body;
    const wrapper = document.querySelector('.wrapper');
    const learningContent = document.getElementById('learning-content'); // For navigator
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
    const chatPanel = document.getElementById('chat-panel');
    const notesAppPanel = document.getElementById('notes-app-panel');
    const themeToggle = document.getElementById('theme-toggle');
    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    const notesAppToggleBtn = document.getElementById('notes-app-toggle-btn');

    // -- Modals
    const customModal = document.getElementById('custom-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const promptModalOverlay = document.getElementById('prompt-modal-overlay');
    const customPromptInput = document.getElementById('custom-prompt-input');
    const promptSaveBtn = document.getElementById('prompt-save-btn');
    const promptCancelBtn = document.getElementById('prompt-cancel-btn');

    // -- Chat UI Elements
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const sessionList = document.getElementById('session-list');
    const chatSessionTitle = document.getElementById('chat-session-title');
    const deleteSessionBtn = document.getElementById('delete-session-btn');
    const chatWelcomeMessage = document.getElementById('chat-welcome-message');
    const chatModeSelector = document.getElementById('chat-mode-selector');

    // -- Notes App UI Elements
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

    // -- Google Drive & Loading UI Elements
    const exportToDriveBtn = document.getElementById('export-to-drive-btn');
    const importFromDriveBtn = document.getElementById('import-from-drive-btn');
    const importConfirmModal = document.getElementById('import-confirm-modal');
    const importModalConfirmBtn = document.getElementById('import-modal-confirm-btn');
    const importModalCancelBtn = document.getElementById('import-modal-cancel-btn');
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    document.body.appendChild(loadingOverlay);


    // --- 2. State Management ---
    const canvasId = document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id';
    const appId = 'AileyBailey_Global_Space';
    let db, notesCollection, chatSessionsCollectionRef, currentUser;
    let localNotesCache = [],
        localChatSessionsCache = [];
    let currentNoteId = null,
        currentSessionId = null;
    let unsubscribeFromNotes = null,
        unsubscribeFromChatSessions = null;
    let debounceTimer = null;
    let lastSelectedText = '';
    let selectedMode = 'ailey_coaching';

    // -- Google API State
    // API Keys are defined in a separate config file or environment variable in a real app
    const API_KEY = 'YOUR_GOOGLE_API_KEY'; // IMPORTANT: Replace with your actual API key
    // gapiInited, gisInited, and tokenClient are now global, defined outside this event listener

    // --- 3. Function Definitions ---

    // --- 3.1 Google API Integration & Auth ---

    // Main function to handle authentication.
    function requestGoogleAuth() {
        return new Promise((resolve, reject) => {
            if (!window.gapiInited || !window.gisInited) {
                return reject(new Error("GIS/GAPI not loaded"));
            }

            // The callback is set here to resolve or reject the promise.
            window.tokenClient.callback = (resp) => {
                if (resp.error !== undefined) {
                    reject(resp);
                } else {
                    resolve(resp);
                }
            };

            // Request token. If user is already authorized, a consent screen will not appear.
            if (gapi.client.getToken() === null) {
                window.tokenClient.requestAccessToken({ prompt: 'consent' });
            } else {
                window.tokenClient.requestAccessToken({ prompt: '' });
            }
        });
    }

    // --- 3.2 Google Drive Data Operations ---

    async function handleExportToDrive() {
        showLoadingOverlay('Google Drive 인증 중...');
        try {
            await requestGoogleAuth();
            showLoadingOverlay('데이터 수집 및 내보내는 중...');

            const notesSnapshot = await notesCollection.get();
            const notesData = notesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const chatSessionsSnapshot = await chatSessionsCollectionRef.get();
            const chatSessionsData = chatSessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const backupData = {
                version: "1.0",
                exportedAt: new Date().toISOString(),
                notes: notesData,
                chatSessions: chatSessionsData
            };
            
            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";
            
            const fileName = `[Ailey & Bailey] 백업_${new Date().toISOString().split('T')[0]}.json`;
            const fileContent = JSON.stringify(backupData, null, 2);
            
            const metadata = {
                'name': fileName,
                'mimeType': 'application/json'
            };

            const multipartRequestBody =
                delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                fileContent +
                close_delim;

            const request = gapi.client.request({
                'path': 'https://www.googleapis.com/upload/drive/v3/files',
                'method': 'POST',
                'params': {'uploadType': 'multipart'},
                'headers': {'Content-Type': 'multipart/related; boundary="' + boundary + '"'},
                'body': multipartRequestBody
            });

            await request;
            alert('✅ Google Drive에 백업이 완료되었습니다!');

        } catch (error) {
            console.error("Google Drive 내보내기 오류:", error);
            alert(`❌ Google Drive에 내보내는 중 오류가 발생했습니다: ${error.details || error.message || '알 수 없는 오류'}`);
        } finally {
            hideLoadingOverlay();
        }
    }
    
    async function handleImportFromDrive() {
        showLoadingOverlay('Google Drive 인증 중...');
        try {
            await requestGoogleAuth();
            hideLoadingOverlay();

            const view = new google.picker.View(google.picker.ViewId.DOCS);
            view.setMimeTypes("application/json");
            const picker = new google.picker.PickerBuilder()
                .setAppId(appId.split('_')[1]) // Picker needs just the app ID part
                .setOAuthToken(gapi.client.getToken().access_token)
                .addView(view)
                .setDeveloperKey(API_KEY)
                .setCallback(async (data) => {
                    if (data[google.picker.Action.PICKED]) {
                        const fileId = data[google.picker.Response.DOCUMENTS][0][google.picker.Document.ID];
                        showLoadingOverlay('백업 파일 다운로드 중...');
                        const fileResponse = await gapi.client.drive.files.get({
                            fileId: fileId,
                            alt: 'media'
                        });
                        hideLoadingOverlay();
                        
                        const backupData = JSON.parse(fileResponse.body);
                        const isConfirmed = await showImportConfirmModal();
                        if (isConfirmed) {
                           await executeImport(backupData);
                        }
                    }
                })
                .build();
            picker.setVisible(true);

        } catch (error) {
            console.error("Google Drive 불러오기 오류:", error);
            alert(`❌ Google Drive에서 불러오는 중 오류가 발생했습니다: ${error.details || error.message || '알 수 없는 오류'}`);
            hideLoadingOverlay();
        }
    }

    async function executeImport(data) {
        if (!data.notes || !data.chatSessions) {
            alert("❌ 파일 형식이 올바르지 않습니다. (notes, chatSessions 속성 필요)");
            return;
        }
        showLoadingOverlay('데이터 복원 중... (이 작업은 몇 초 정도 소요될 수 있습니다)');
        
        try {
            const batch = db.batch();

            const oldNotes = await notesCollection.get();
            oldNotes.forEach(doc => batch.delete(doc.ref));

            const oldChatSessions = await chatSessionsCollectionRef.get();
            oldChatSessions.forEach(doc => batch.delete(doc.ref));
            
            data.notes.forEach(note => {
                const docRef = notesCollection.doc(note.id);
                const noteData = { ...note };
                if (note.createdAt?.seconds) noteData.createdAt = new firebase.firestore.Timestamp(note.createdAt.seconds, note.createdAt.nanoseconds);
                if (note.updatedAt?.seconds) noteData.updatedAt = new firebase.firestore.Timestamp(note.updatedAt.seconds, note.updatedAt.nanoseconds);
                delete noteData.id;
                batch.set(docRef, noteData);
            });

            data.chatSessions.forEach(session => {
                const docRef = chatSessionsCollectionRef.doc(session.id);
                const sessionData = { ...session };
                if (session.createdAt?.seconds) sessionData.createdAt = new firebase.firestore.Timestamp(session.createdAt.seconds, session.createdAt.nanoseconds);
                if (session.updatedAt?.seconds) sessionData.updatedAt = new firebase.firestore.Timestamp(session.updatedAt.seconds, session.updatedAt.nanoseconds);
                // Convert message timestamps
                if (Array.isArray(sessionData.messages)) {
                    sessionData.messages = sessionData.messages.map(msg => {
                        if (msg.timestamp?.seconds) {
                            return { ...msg, timestamp: new firebase.firestore.Timestamp(msg.timestamp.seconds, msg.timestamp.nanoseconds) };
                        }
                        return msg;
                    });
                }
                delete sessionData.id;
                batch.set(docRef, sessionData);
            });

            await batch.commit();

            alert("✅ 데이터 복원이 완료되었습니다. 페이지를 새로고침합니다.");
            location.reload();
        
        } catch(error) {
            console.error("데이터 복원 실패:", error);
            alert("❌ 데이터 복원 중 심각한 오류가 발생했습니다.");
            hideLoadingOverlay();
        }
    }


    // --- 3.3 Firebase & App Core Logic ---

    async function initializeFirebase() {
        try {
            // This assumes __firebase_config is defined in the HTML by the server/environment
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
                setupSystemInfoWidget();
            }
        } catch (error) {
            console.error("Firebase 초기화 또는 인증 실패:", error);
            if (notesList) notesList.innerHTML = '<div>클라우드 메모장을 불러오는 데 실패했습니다.</div>';
            if (chatMessages) chatMessages.innerHTML = '<div>AI 러닝메이트 연결에 실패했습니다.</div>';
        }
    }

    function listenToChatSessions() {
        if (!chatSessionsCollectionRef) return;
        if (unsubscribeFromChatSessions) unsubscribeFromChatSessions();
        unsubscribeFromChatSessions = chatSessionsCollectionRef.orderBy("updatedAt", "desc").onSnapshot(snapshot => {
            localChatSessionsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderSessionList();
            if (currentSessionId && !localChatSessionsCache.some(s => s.id === currentSessionId)) {
                handleNewChat();
            } else if (currentSessionId) {
                const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId);
                renderChatMessages(currentSessionData?.messages || []);
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
            if (session.id === currentSessionId) item.classList.add('active');
            item.innerHTML = `<div class="session-item-title">${session.title || '새 대화'}</div>`;
            item.addEventListener('click', () => selectSession(session.id));
            sessionList.appendChild(item);
        });
    }
    
    function selectSession(sessionId) {
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
        
        if (chatMessages) { chatMessages.innerHTML = ''; chatMessages.style.display = 'none'; }
        if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'flex';
        if (chatSessionTitle) chatSessionTitle.textContent = 'AI 러닝메이트';
        if (deleteSessionBtn) deleteSessionBtn.style.display = 'none';
        if (chatInput) { chatInput.disabled = false; chatInput.value = ''; }
        if (chatSendBtn) chatSendBtn.disabled = false;
    }

    function handleDeleteSession() {
        if (!currentSessionId) return;
        const sessionToDelete = localChatSessionsCache.find(s => s.id === currentSessionId);
        showModal(`'${sessionToDelete?.title || '이 대화'}'를 삭제하시겠습니까?`, () => {
            if (chatSessionsCollectionRef && currentSessionId) {
                chatSessionsCollectionRef.doc(currentSessionId).delete()
                    .then(() => handleNewChat())
                    .catch(e => console.error("세션 삭제 실패:", e));
            }
        });
    }

    async function handleChatSend() { /* This function remains unchanged */ }
    
    function renderChatMessages(messages = []) {
        if (!chatMessages) return;
        chatMessages.innerHTML = '';
        messages.forEach(msg => {
            const d = document.createElement('div');
            d.className = `chat-message ${msg.role}`;
            let c = msg.content;
            if (c.startsWith('[PROBLEM_GENERATED]')) { d.classList.add('quiz-problem'); c = c.replace('[PROBLEM_GENERATED]', '').trim(); }
            else if (c.startsWith('[CORRECT]')) { d.classList.add('quiz-solution'); const h = document.createElement('div'); h.className = 'solution-header correct'; h.textContent = '✅ 정답입니다!'; d.appendChild(h); c = c.replace('[CORRECT]', '').trim(); }
            else if (c.startsWith('[INCORRECT]')) { d.classList.add('quiz-solution'); const h = document.createElement('div'); h.className = 'solution-header incorrect'; h.textContent = '❌ 오답입니다.'; d.appendChild(h); c = c.replace('[INCORRECT]', '').trim(); }
            const cd = document.createElement('div');
            cd.innerHTML = c.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
            d.appendChild(cd);
            
            const ts = msg.timestamp?.toDate ? msg.timestamp.toDate() : (msg.timestamp ? new Date(msg.timestamp) : null);
            if (ts) { const t = document.createElement('div'); t.className = 'chat-timestamp'; t.textContent = ts.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }); d.appendChild(t); }

            if (msg.role === 'ai') { const b = document.createElement('button'); b.className = 'send-to-note-btn'; b.textContent = '메모로 보내기'; b.onclick = e => { addNote(`[AI 러닝메이트]\n${cd.textContent}`); e.target.textContent = '✅'; e.target.disabled = true; }; cd.appendChild(b); }
            chatMessages.appendChild(d);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function listenToNotes() { /* This function remains unchanged */ }
    function renderNoteList() { /* This function remains unchanged */ }
    async function addNote(content = '') { /* This function remains unchanged */ }
    function saveNote() { /* This function remains unchanged */ }

    // --- 3.4 UI Utilities & Helpers ---
    function setupNavigator() {
        const scrollNav = document.querySelector('.scroll-nav');
        if (!scrollNav || !learningContent) return;
        const headers = learningContent.querySelectorAll('h2, h3');
        if (headers.length === 0) {
            scrollNav.style.display = 'none';
            if(wrapper) wrapper.classList.add('toc-hidden');
            return;
        }
        scrollNav.style.display = 'block';
        if(wrapper) wrapper.classList.remove('toc-hidden');
        const navList = document.createElement('ul');
        let sectionCounter = 0;
        headers.forEach((header) => {
            let targetElement = header.closest('.content-section') || header;
            if (!targetElement.id) {
                targetElement.id = `nav-target-${sectionCounter++}`;
            }
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.textContent = header.textContent.replace(/\[.*?\]/g, '').trim();
            link.href = `#${targetElement.id}`;
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
        headers.forEach(header => {
            const target = header.closest('.content-section') || header;
            if (target) observer.observe(target);
        });
    }

    function showModal(message, onConfirm) { /* This function remains unchanged */ }

    function showImportConfirmModal() {
        return new Promise((resolve) => {
            importConfirmModal.style.display = 'flex';
            importModalConfirmBtn.onclick = () => {
                importConfirmModal.style.display = 'none';
                resolve(true);
            };
            importModalCancelBtn.onclick = () => {
                importConfirmModal.style.display = 'none';
                resolve(false);
            };
        });
    }
    
    function showLoadingOverlay(message) {
        loadingOverlay.textContent = message;
        loadingOverlay.style.display = 'flex';
    }

    function hideLoadingOverlay() {
        loadingOverlay.style.display = 'none';
    }
    
    function updateStatus(msg, success) { /* This function remains unchanged */ }
    function openNoteEditor(id) { /* This function remains unchanged */ }
    function switchView(view) { /* This function remains unchanged */ }
    function handleDeleteRequest(id) { /* This function remains unchanged */ }
    async function togglePin(id) { /* This function remains unchanged */ }
    function updateClock() { /* This function remains unchanged */ }
    function setupSystemInfoWidget() { /* This function remains unchanged */ }
    function makePanelDraggable(panelElement) { /* This function remains unchanged */ }
    function setupChatModeSelector() { /* This function remains unchanged */ }
    function togglePanel(panelElement, forceShow = null) { /* This function remains unchanged */ }

    // --- 4. Global Initialization & Event Listeners ---
    function initialize() {
        updateClock();
        setInterval(updateClock, 1000);
        
        initializeFirebase().then(() => {
            // [FIX 2] setupNavigator is now called unconditionally to ensure it appears.
            setupNavigator(); 
            setupChatModeSelector();
            makePanelDraggable(chatPanel);
            makePanelDraggable(notesAppPanel);
        });

        // Event Listeners
        if (themeToggle) themeToggle.addEventListener('click', () => body.classList.toggle('dark-mode'));
        if (tocToggleBtn) tocToggleBtn.addEventListener('click', () => wrapper.classList.toggle('toc-hidden'));
        if (chatToggleBtn) chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));
        if (chatPanel) chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));
        if (notesAppToggleBtn) notesAppToggleBtn.addEventListener('click', () => togglePanel(notesAppPanel));
        if (chatForm) chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });
        if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); }});
        
        // -- Drive Button Listeners
        if (exportToDriveBtn) exportToDriveBtn.addEventListener('click', handleExportToDrive);
        if (importFromDriveBtn) importFromDriveBtn.addEventListener('click', handleImportFromDrive);
        
        // -- Notes App Listeners
        if (addNewNoteBtn) addNewNoteBtn.addEventListener('click', () => addNote());
        if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
        if (searchInput) searchInput.addEventListener('input', renderNoteList);
        if (notesList) notesList.addEventListener('click', e => {
            const item = e.target.closest('.note-item');
            if (!item) return;
            const id = item.dataset.id;
            if (e.target.closest('.delete-btn')) handleDeleteRequest(id);
            else if (e.target.closest('.pin-btn')) togglePin(id);
            else openNoteEditor(id);
        });
        const handleNoteInput = () => {
            updateStatus('입력 중...', true);
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(saveNote, 1500);
        };
        if (noteTitleInput) noteTitleInput.addEventListener('input', handleNoteInput);
        if (noteContentTextarea) noteContentTextarea.addEventListener('input', handleNoteInput);
    }
    
    // --- 5. Run Initialization ---
    initialize();
});
