/*
--- Ailey & Bailey Canvas ---
File: script.js
Version: 9.0 (Intelligent Local Backup & Restore System)
Architect: [Username] & System Architect Ailey
Description: Implemented a UX-focused local data management system. Users can now export all notes and chat sessions to a local JSON file. The new import feature provides an intelligent preview modal, allowing users to analyze differences (new, conflict), resolve conflicts, and perform selective or full data restoration safely.
*/

// [GLOBAL SCOPE] Functions called by HTML onload attribute
function handleGapiLoad() {
    gapi.load('client:picker', () => {
        gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
        window.gapiInited = true;
    });
};

function handleGisLoad() {
    // [Applied] The user's Client ID has been inserted here.
    const CLIENT_ID = '464743950938-qm5uidbabg4cuvccje11drdk07jaahd.apps.googleusercontent.com';
    const SCOPES = 'https://www.googleapis.com/auth/drive.file';

    window.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '',
    });
    window.gisInited = true;
};


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
    // **[NEW]** Elements for local backup/restore
    let exportNotesBtn, importNotesBtn, fileInput;
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loading-overlay';
    document.body.appendChild(loadingOverlay);


    // --- 2. State Management ---
    const canvasId = document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id';
    let db, notesCollection, chatSessionsCollectionRef;
    let currentUser = null;
    const appId = 'AileyBailey_Global_Space';
    let localNotesCache = [];
    let currentNoteId = null;
    let unsubscribeFromNotes = null;
    let debounceTimer = null;
    let lastSelectedText = '';
    let localChatSessionsCache = [];
    let currentSessionId = null;
    let unsubscribeFromChatSessions = null;
    let selectedMode = 'ailey_coaching';
    let chatQuizState = 'idle';
    let lastQuestion = '';
    let customPrompt = localStorage.getItem('customTutorPrompt') || '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.';
    let currentQuizData = null;
    
    // --- 3. Function Definitions ---

    // --- 3.1 Firebase & App Core Logic ---
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
            } else { await auth.signInAnonymously(); }
            
            currentUser = auth.currentUser;

            if (currentUser) {
                notesCollection = db.collection(`artifacts/${appId}/users/${currentUser.uid}/notes`);
                chatSessionsCollectionRef = db.collection(`artifacts/${appId}/users/${currentUser.uid}/chatSessions`);
                listenToNotes();
                listenToChatSessions();
            }
        } catch (error) {
            console.error("Firebase 초기화 또는 인증 실패:", error);
        }
    }
    
    // --- 3.2 Local Data Management (NEW & REFINED) ---
    function setupDataManagementButtons() {
        const buttonGroup = noteListView.querySelector('.header-button-group');
        if (!buttonGroup) return;

        // Export Button
        exportNotesBtn = document.createElement('button');
        exportNotesBtn.id = 'export-notes-btn';
        exportNotesBtn.className = 'notes-btn';
        exportNotesBtn.title = '모든 데이터 내보내기';
        exportNotesBtn.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"></path></svg><span>내보내기</span>`;
        
        // Import Button
        importNotesBtn = document.createElement('button');
        importNotesBtn.id = 'import-notes-btn';
        importNotesBtn.className = 'notes-btn';
        importNotesBtn.title = '데이터 가져오기';
        importNotesBtn.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M9,16V10H5L12,3L19,10H15V16H9M5,20V18H19V20H5Z"></path></svg><span>가져오기</span>`;

        buttonGroup.appendChild(importNotesBtn);
        buttonGroup.appendChild(exportNotesBtn);

        // Hidden file input
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
    }
    
    async function handleExportToLocal() {
        if (!notesCollection || !chatSessionsCollectionRef) return;
        showLoadingOverlay('데이터를 수집하는 중...');
        try {
            const notesSnapshot = await notesCollection.get();
            const notesData = notesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const chatSessionsSnapshot = await chatSessionsCollectionRef.get();
            const chatSessionsData = chatSessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const backupData = {
                version: "2.1",
                exportedAt: new Date().toISOString(),
                notes: notesData,
                chatSessions: chatSessionsData
            };
            
            const jsonString = JSON.stringify(backupData, (key, value) => {
                 if (value && typeof value.toDate === 'function') {
                    return { '.sv': 'timestamp', 'seconds': value.seconds, 'nanoseconds': value.nanoseconds };
                }
                return value;
            }, 2);
            
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const date = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `ailey-bailey-backup-${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error("로컬로 내보내기 오류:", error);
            alert('데이터를 내보내는 중 오류가 발생했습니다.');
        } finally {
            hideLoadingOverlay();
        }
    }

    function handleImportFromLocal(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                let fileContent = e.target.result;
                const parsedData = JSON.parse(fileContent, (key, value) => {
                    if (value && value['.sv'] === 'timestamp') {
                        return new firebase.firestore.Timestamp(value.seconds, value.nanoseconds);
                    }
                    return value;
                });

                if (!parsedData.notes || !parsedData.chatSessions) {
                    throw new Error("Invalid backup file format.");
                }
                
                showLoadingOverlay("클라우드 데이터와 비교 분석 중...");

                const cloudNotesSnapshot = await notesCollection.get();
                const cloudNotes = cloudNotesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const cloudSessionsSnapshot = await chatSessionsCollectionRef.get();
                const cloudSessions = cloudSessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                const cloudData = { notes: cloudNotes, chatSessions: cloudSessions };
                
                const analysisResult = analyzeDataDifferences(parsedData, cloudData);

                hideLoadingOverlay();
                showImportPreviewModal(analysisResult, parsedData);

            } catch (error) {
                console.error("파일 가져오기 오류:", error);
                alert("파일을 읽거나 분석하는 중 오류가 발생했습니다. 파일 형식이 올바른지 확인해주세요.");
                hideLoadingOverlay();
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset file input
    }
    
    function analyzeDataDifferences(fileData, cloudData) {
        const analysis = {
            notes: { newItems: [], conflictItems: [] },
            chatSessions: { newItems: [], conflictItems: [] }
        };

        const cloudNotesMap = new Map(cloudData.notes.map(n => [n.id, n]));
        const cloudSessionsMap = new Map(cloudData.chatSessions.map(s => [s.id, s]));

        fileData.notes.forEach(fileNote => {
            const cloudNote = cloudNotesMap.get(fileNote.id);
            if (!cloudNote) {
                analysis.notes.newItems.push(fileNote);
            } else {
                // Compare timestamps for conflict
                const fileTime = fileNote.updatedAt?.toMillis() || 0;
                const cloudTime = cloudNote.updatedAt?.toMillis() || 0;
                if (Math.abs(fileTime - cloudTime) > 1000) { // Allow 1s difference
                    analysis.notes.conflictItems.push({ file: fileNote, cloud: cloudNote });
                }
            }
        });

        fileData.chatSessions.forEach(fileSession => {
            const cloudSession = cloudSessionsMap.get(fileSession.id);
            if (!cloudSession) {
                analysis.chatSessions.newItems.push(fileSession);
            } else {
                const fileTime = fileSession.updatedAt?.toMillis() || 0;
                const cloudTime = cloudSession.updatedAt?.toMillis() || 0;
                if (Math.abs(fileTime - cloudTime) > 1000) {
                    analysis.chatSessions.conflictItems.push({ file: fileSession, cloud: cloudSession });
                }
            }
        });
        
        return analysis;
    }

    function showImportPreviewModal(analysis, fullFileData) {
        const existingModal = document.getElementById('import-preview-modal');
        if (existingModal) existingModal.remove();

        const totalNew = analysis.notes.newItems.length + analysis.chatSessions.newItems.length;
        const totalConflicts = analysis.notes.conflictItems.length + analysis.chatSessions.conflictItems.length;

        if (totalNew === 0 && totalConflicts === 0) {
            alert("가져올 새로운 데이터나 변경된 데이터가 없습니다. 클라우드 데이터가 이미 최신 상태입니다.");
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'import-preview-modal';
        modal.innerHTML = `
            <div class="import-preview-content">
                <div class="import-preview-header">
                    <h3>데이터 가져오기 미리보기</h3>
                    <p>파일에서 ${totalNew}개의 새 항목과 ${totalConflicts}개의 충돌 항목을 발견했습니다. 가져올 항목을 선택하고 충돌을 해결해주세요.</p>
                </div>
                <div class="import-preview-body">
                    <div class="import-tabs">
                        <button class="tab-btn active" data-tab="notes">📝 메모 (${analysis.notes.newItems.length + analysis.notes.conflictItems.length})</button>
                        <button class="tab-btn" data-tab="sessions">💬 대화 세션 (${analysis.chatSessions.newItems.length + analysis.chatSessions.conflictItems.length})</button>
                    </div>
                    <div id="notes-tab-content" class="tab-content active">
                        ${generateItemsHtml(analysis.notes, 'note')}
                    </div>
                    <div id="sessions-tab-content" class="tab-content">
                        ${generateItemsHtml(analysis.chatSessions, 'session')}
                    </div>
                </div>
                <div class="import-preview-footer">
                    <button id="import-cancel-btn">취소</button>
                    <button id="import-overwrite-btn" class="danger">전체 덮어쓰기</button>
                    <button id="import-confirm-btn" class="primary">선택 항목 가져오기</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Add event listeners for the modal
        modal.querySelector('.import-tabs').addEventListener('click', e => {
            if (e.target.classList.contains('tab-btn')) {
                modal.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
                e.target.classList.add('active');
                modal.querySelector(`#${e.target.dataset.tab}-tab-content`).classList.add('active');
            }
        });
        
        modal.querySelector('.tab-content').addEventListener('click', e => {
            if (e.target.classList.contains('conflict-header')) {
                e.target.parentElement.classList.toggle('expanded');
            }
        });

        modal.querySelector('#import-cancel-btn').addEventListener('click', () => modal.remove());
        
        modal.querySelector('#import-confirm-btn').addEventListener('click', async () => {
            const decisions = { notes: [], sessions: [] };
            modal.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
                const itemDiv = cb.closest('.import-item');
                const id = itemDiv.dataset.id;
                const type = itemDiv.dataset.type; // 'note' or 'session'
                const isConflict = itemDiv.classList.contains('conflict');
                
                let decision = { id, type };
                if (isConflict) {
                    decision.resolution = itemDiv.querySelector('input[type="radio"]:checked').value; // 'file' or 'cloud'
                }
                decisions[type === 'note' ? 'notes' : 'sessions'].push(decision);
            });
            
            modal.remove();
            await executeSelectiveImport(decisions, analysis);
        });

        modal.querySelector('#import-overwrite-btn').addEventListener('click', () => {
            showModal("정말로 모든 클라우드 데이터를 삭제하고 이 파일의 내용으로 덮어쓰시겠습니까? 이 작업은 되돌릴 수 없습니다.", async () => {
                modal.remove();
                await executeOverwriteImport(fullFileData);
            });
        });
    }
    
    function generateItemsHtml(data, type) {
        let html = '<div class="item-list">';
        if (data.newItems.length === 0 && data.conflictItems.length === 0) {
            return '<p class="no-items">표시할 항목이 없습니다.</p>';
        }

        data.newItems.forEach(item => {
            html += `
                <div class="import-item new" data-id="${item.id}" data-type="${type}">
                    <input type="checkbox" checked>
                    <span class="status-tag new">[신규]</span>
                    <span class="item-title">${item.title || '새 항목'}</span>
                </div>
            `;
        });
        
        data.conflictItems.forEach(item => {
            const fileTime = item.file.updatedAt.toDate().toLocaleString('ko-KR');
            const cloudTime = item.cloud.updatedAt.toDate().toLocaleString('ko-KR');
            html += `
                <div class="import-item conflict" data-id="${item.file.id}" data-type="${type}">
                    <input type="checkbox" checked>
                    <span class="status-tag conflict">[충돌]</span>
                    <span class="item-title">${item.file.title || '충돌 항목'}</span>
                    <div class="conflict-details">
                        <div class="conflict-header">▼ 상세 정보 보기/숨기기</div>
                        <div class="conflict-body">
                            <div class="version-view">
                                <h4>파일 버전</h4>
                                <label><input type="radio" name="conflict-${type}-${item.file.id}" value="file" checked> 선택</label>
                                <p><strong>수정일:</strong> ${fileTime}</p>
                                <pre>${(item.file.content || JSON.stringify(item.file.messages, null, 2)).substring(0, 150)}...</pre>
                            </div>
                            <div class="version-view">
                                <h4>클라우드 버전</h4>
                                <label><input type="radio" name="conflict-${type}-${item.file.id}" value="cloud"> 선택</label>
                                <p><strong>수정일:</strong> ${cloudTime}</p>
                                <pre>${(item.cloud.content || JSON.stringify(item.cloud.messages, null, 2)).substring(0, 150)}...</pre>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    async function executeSelectiveImport(decisions, analysis) {
        showLoadingOverlay("선택한 항목을 가져오는 중...");
        try {
            const batch = db.batch();

            decisions.notes.forEach(decision => {
                const isConflict = analysis.notes.conflictItems.some(c => c.file.id === decision.id);
                if (isConflict) {
                    if (decision.resolution === 'file') {
                        const itemData = analysis.notes.conflictItems.find(c => c.file.id === decision.id).file;
                        batch.set(notesCollection.doc(decision.id), itemData);
                    }
                } else { // New item
                    const itemData = analysis.notes.newItems.find(n => n.id === decision.id);
                    batch.set(notesCollection.doc(decision.id), itemData);
                }
            });
            
            decisions.sessions.forEach(decision => {
                const isConflict = analysis.chatSessions.conflictItems.some(c => c.file.id === decision.id);
                if (isConflict) {
                    if (decision.resolution === 'file') {
                        const itemData = analysis.chatSessions.conflictItems.find(c => c.file.id === decision.id).file;
                        batch.set(chatSessionsCollectionRef.doc(decision.id), itemData);
                    }
                } else { // New item
                    const itemData = analysis.chatSessions.newItems.find(n => n.id === decision.id);
                    batch.set(chatSessionsCollectionRef.doc(decision.id), itemData);
                }
            });

            await batch.commit();
            alert("✅ 선택한 항목을 성공적으로 가져왔습니다!");

        } catch (error) {
            console.error("선택적 가져오기 실패:", error);
            alert("❌ 데이터를 가져오는 중 오류가 발생했습니다.");
        } finally {
            hideLoadingOverlay();
        }
    }
    
    async function executeOverwriteImport(fileData) {
        showLoadingOverlay("전체 데이터를 덮어쓰는 중... (항목 수에 따라 시간이 걸릴 수 있습니다)");
        try {
            // Step 1: Delete all existing cloud data
            const deleteBatch = db.batch();
            const notesSnapshot = await notesCollection.get();
            notesSnapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));
            const sessionsSnapshot = await chatSessionsCollectionRef.get();
            sessionsSnapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));
            await deleteBatch.commit();
            
            // Step 2: Write new data from file
            const writeBatch = db.batch();
            fileData.notes.forEach(note => {
                writeBatch.set(notesCollection.doc(note.id), note);
            });
            fileData.chatSessions.forEach(session => {
                writeBatch.set(chatSessionsCollectionRef.doc(session.id), session);
            });
            await writeBatch.commit();

            alert("✅ 모든 데이터를 성공적으로 덮어썼습니다!");

        } catch (error) {
            console.error("전체 덮어쓰기 실패:", error);
            alert("❌ 데이터를 덮어쓰는 중 심각한 오류가 발생했습니다.");
        } finally {
            hideLoadingOverlay();
        }
    }


    // --- 3.3 Chat & Notes Logic (Existing) ---
    function listenToChatSessions() {
        if (!chatSessionsCollectionRef) return;
        if (unsubscribeFromChatSessions) unsubscribeFromChatSessions();
        unsubscribeFromChatSessions = chatSessionsCollectionRef.orderBy("updatedAt", "desc").onSnapshot(snapshot => {
            localChatSessionsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderSessionList();
            if (currentSessionId && !localChatSessionsCache.some(s => s.id === currentSessionId)) { handleNewChat(); } 
            else if (currentSessionId) {
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
                    .then(() => handleNewChat()).catch(e => console.error("세션 삭제 실패:", e));
            }
        });
    }

    async function handleChatSend() {
        if (!chatInput || chatInput.disabled) return;
        const query = chatInput.value.trim();
        if (!query) return;

        chatInput.disabled = true;
        chatSendBtn.disabled = true;

        const userMessage = { role: 'user', content: query, timestamp: new Date() };
        let sessionRef;

        try {
            if (!currentSessionId) {
                if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
                if (chatMessages) chatMessages.style.display = 'flex';
                const newSession = {
                    title: query.substring(0, 40) + (query.length > 40 ? '...' : ''),
                    messages: [userMessage], mode: selectedMode,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                };
                sessionRef = await chatSessionsCollectionRef.add(newSession);
                currentSessionId = sessionRef.id;
            } else {
                sessionRef = chatSessionsCollectionRef.doc(currentSessionId);
                await sessionRef.update({ 
                    messages: firebase.firestore.FieldValue.arrayUnion(userMessage),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
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
            const ts = msg.timestamp?.toDate ? msg.timestamp.toDate() : (msg.timestamp ? new Date(msg.timestamp) : null);
            if (ts) { const t = document.createElement('div'); t.className = 'chat-timestamp'; t.textContent = ts.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }); d.appendChild(t); }
            if (msg.role === 'ai') { const b = document.createElement('button'); b.className = 'send-to-note-btn'; b.textContent = '메모로 보내기'; b.onclick = e => { addNote(`[AI 러닝메이트]\n${cd.textContent}`); e.target.textContent = '✅'; e.target.disabled = true; }; cd.appendChild(b); }
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
                if (selectedMode === 'custom') openPromptModal();
            });
            chatModeSelector.appendChild(b);
        });
    }

    function listenToNotes() {
        if (!notesCollection) return;
        if (unsubscribeFromNotes) unsubscribeFromNotes();
        unsubscribeFromNotes = notesCollection.orderBy("updatedAt", "desc").onSnapshot(s => {
            localNotesCache = s.docs.map(d => ({ id: d.id, ...d.data() }));
            renderNoteList();
        }, e => console.error("노트 실시간 수신 오류:", e));
    }
    
    function renderNoteList() {
        if (!notesList || !searchInput) return;
        const term = searchInput.value.toLowerCase();
        const filtered = localNotesCache.filter(n => (n.title && n.title.toLowerCase().includes(term)) || (n.content && n.content.toLowerCase().includes(term)));
        filtered.sort((a,b) => (b.isPinned - a.isPinned) || (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
        notesList.innerHTML = filtered.length > 0 ? '' : '<div>표시할 메모가 없습니다.</div>';
        filtered.forEach(n => {
            const i = document.createElement('div');
            i.className = 'note-item';
            i.dataset.id = n.id;
            if (n.isPinned) i.classList.add('pinned');
            const d = n.updatedAt?.toDate ? n.updatedAt.toDate().toLocaleString('ko-KR') : '날짜 없음';
            i.innerHTML = `<div class="note-item-title">${n.title||'무제'}</div><div class="note-item-date">${d}</div><div class="note-item-actions"><button class="item-action-btn pin-btn ${n.isPinned?'pinned-active':''}" title="고정">${n.isPinned?'📌':'📍'}</button><button class="item-action-btn delete-btn" title="삭제">🗑️</button></div>`;
            notesList.appendChild(i);
        });
    }

    async function addNote(content = '') {
        if (!notesCollection) return;
        try {
            const ref = await notesCollection.add({ title: '새 메모', content: content, isPinned: false, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
            openNoteEditor(ref.id);
        } catch (e) { console.error("새 메모 추가 실패:", e); }
    }

    function saveNote() {
        if (debounceTimer) clearTimeout(debounceTimer);
        if (!currentNoteId || !notesCollection) return;
        const data = { title: noteTitleInput.value, content: noteContentTextarea.value, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
        notesCollection.doc(currentNoteId).update(data).then(() => updateStatus('저장됨 ✓', true)).catch(e => { console.error("메모 저장 실패:", e); updateStatus('저장 실패 ❌', false); });
    }
    
    function handleDeleteRequest(id) {
        showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => {
            if (notesCollection) notesCollection.doc(id).delete().catch(e => console.error("메모 삭제 실패:", e));
        });
    }

    async function togglePin(id) {
        if (!notesCollection) return;
        const note = localNotesCache.find(n => n.id === id);
        if (note) await notesCollection.doc(id).update({ isPinned: !note.isPinned });
    }

    function openNoteEditor(id) {
        const note = localNotesCache.find(n => n.id === id);
        if (note && noteTitleInput && noteContentTextarea) {
            currentNoteId = id;
            noteTitleInput.value = note.title || '';
            noteContentTextarea.value = note.content || '';
            switchView('editor');
        }
    }

    // --- 3.4 UI Setup & Helpers ---
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
            const popover = selectionPopover;
            let top = rect.top + window.scrollY - popover.offsetHeight - 10;
            let left = rect.left + window.scrollX + (rect.width / 2) - (popover.offsetWidth / 2);
            if (top < window.scrollY) top = rect.bottom + window.scrollY + 10;
            if (left < 0) left = 5;
            if (left + popover.offsetWidth > window.innerWidth) left = window.innerWidth - popover.offsetWidth - 5;
            popover.style.top = `${top}px`;
            popover.style.left = `${left}px`;
            popover.style.display = 'flex';
        } else {
            if (!e.target.closest('#selection-popover')) selectionPopover.style.display = 'none';
        }
    }

    function handlePopoverAskAi() {
        if (!lastSelectedText || !chatInput) return;
        togglePanel(chatPanel, true);
        handleNewChat();
        setTimeout(() => {
            chatInput.value = `"${lastSelectedText}"\n\n이 내용에 대해 더 자세히 설명해줄래?`;
            chatInput.style.height = 'auto';
            chatInput.style.height = (chatInput.scrollHeight) + 'px';
            chatInput.focus();
        }, 100);
        selectionPopover.style.display = 'none';
    }

    function handlePopoverAddNote() {
        if (!lastSelectedText) return;
        addNote(`> ${lastSelectedText}\n\n`);
        selectionPopover.style.display = 'none';
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
            if (e.target.closest('button, input, .close-btn, #delete-session-btn, .notes-btn')) return;
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
    
    function setupSystemInfoWidget() {
        if (!systemInfoWidget || !currentUser) return;
        const canvasIdDisplay = document.getElementById('canvas-id-display');
        if (canvasIdDisplay) { canvasIdDisplay.textContent = canvasId.substring(0, 8) + '...'; }
        const copyBtn = document.getElementById('copy-canvas-id');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const tempTextarea = document.createElement('textarea');
                tempTextarea.value = canvasId;
                document.body.appendChild(tempTextarea); tempTextarea.select();
                try { document.execCommand('copy'); copyBtn.textContent = '✅'; } 
                catch (err) { console.error('Copy failed', err); copyBtn.textContent = '❌'; }
                document.body.removeChild(tempTextarea);
                setTimeout(() => { copyBtn.textContent = '📋'; }, 1500);
            });
        }
    }

    function initializeTooltips() {
        const keywordChips = document.querySelectorAll('.keyword-chip');
        keywordChips.forEach(chip => {
            const tooltipText = chip.dataset.tooltip;
            if (tooltipText && chip.querySelector('.tooltip')) {
                chip.classList.add('has-tooltip');
                chip.querySelector('.tooltip').textContent = tooltipText;
            }
        });
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

    function showModal(message, onConfirm) {
        const modal = document.getElementById('custom-modal');
        const msgEl = document.getElementById('modal-message');
        const confirmBtn = document.getElementById('modal-confirm-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');
        if (!modal || !msgEl || !confirmBtn || !cancelBtn) return;
        msgEl.textContent = message; modal.style.display = 'flex';
        confirmBtn.onclick = () => { onConfirm(); modal.style.display = 'none'; };
        cancelBtn.onclick = () => { modal.style.display = 'none'; };
    }

    function showLoadingOverlay(message) { loadingOverlay.textContent = message; loadingOverlay.style.display = 'flex'; }
    function hideLoadingOverlay() { loadingOverlay.style.display = 'none'; }
    function updateStatus(msg, success) {
        if (!autoSaveStatus) return;
        autoSaveStatus.textContent = msg;
        autoSaveStatus.style.color = success ? 'lightgreen' : 'lightcoral';
        setTimeout(() => { autoSaveStatus.textContent = ''; }, 2000);
    }
    
    function switchView(view) {
        if (view === 'editor') {
            if(noteListView) noteListView.classList.remove('active');
            if(noteEditorView) noteEditorView.classList.add('active');
        } else {
            if(noteEditorView) noteEditorView.classList.remove('active');
            if(noteListView) noteListView.classList.add('active');
            currentNoteId = null;
        }
    }

    function applyFormat(fmt) {
        if (!noteContentTextarea) return;
        const s = noteContentTextarea.selectionStart, e = noteContentTextarea.selectionEnd, t = noteContentTextarea.value.substring(s, e);
        const m = fmt === 'bold' ? '**' : (fmt === 'italic' ? '*' : '`');
        noteContentTextarea.value = `${noteContentTextarea.value.substring(0,s)}${m}${t}${m}${noteContentTextarea.value.substring(e)}`;
        noteContentTextarea.focus();
    }
    
    async function startQuiz() {
        if (!quizModalOverlay) return;
        const k = Array.from(document.querySelectorAll('.keyword-chip')).map(c => c.textContent.trim()).join(', ');
        if (!k) { showModal("퀴즈 생성 키워드가 없습니다.", ()=>{}); return; }
        if (quizContainer) quizContainer.innerHTML = '<div class="loading-indicator">퀴즈 생성 중...</div>';
        if (quizResults) quizResults.innerHTML = '';
        quizModalOverlay.style.display = 'flex';
        try {
            const res = await new Promise(r => setTimeout(() => r(JSON.stringify({ "questions": [{"q":"(e.g)...","o":["..."],"a":"..."}]})), 500));
            currentQuizData = JSON.parse(res);
            renderQuiz(currentQuizData);
        } catch (e) { if(quizContainer) quizContainer.innerHTML = '퀴즈 생성 실패.'; }
    }
    
    function renderQuiz(data) {
        if (!quizContainer || !data.questions) return;
        quizContainer.innerHTML = '';
        data.questions.forEach((q, i) => {
            const b = document.createElement('div'); b.className = 'quiz-question-block';
            const p = document.createElement('p'); p.textContent = `${i + 1}. ${q.q}`;
            const o = document.createElement('div'); o.className = 'quiz-options';
            q.o.forEach(opt => {
                const l = document.createElement('label'); const r = document.createElement('input');
                r.type = 'radio'; r.name = `q-${i}`; r.value = opt;
                l.append(r,` ${opt}`); o.appendChild(l);
            });
            b.append(p, o); quizContainer.appendChild(b);
        });
    }
    
    function openPromptModal() { if (customPromptInput) customPromptInput.value = customPrompt; if (promptModalOverlay) promptModalOverlay.style.display = 'flex'; }
    function closePromptModal() { if (promptModalOverlay) promptModalOverlay.style.display = 'none'; }
    function saveCustomPrompt() { if (customPromptInput) { customPrompt = customPromptInput.value; localStorage.setItem('customTutorPrompt', customPrompt); closePromptModal(); } }

    // --- 4. Centralized Event Listener Setup ---
    function setupEventListeners() {
        document.addEventListener('mouseup', handleTextSelection);
        if (popoverAskAi) popoverAskAi.addEventListener('click', handlePopoverAskAi);
        if (popoverAddNote) popoverAddNote.addEventListener('click', handlePopoverAddNote);
        if (themeToggle) themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            themeToggle.textContent = body.classList.contains('dark-mode') ? '☀️' : '🌙';
        });
        if (tocToggleBtn) tocToggleBtn.addEventListener('click', () => {
            wrapper.classList.toggle('toc-hidden');
            systemInfoWidget?.classList.toggle('tucked');
        });
        if (chatToggleBtn) chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));
        if (chatPanel) chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));
        if (notesAppToggleBtn) notesAppToggleBtn.addEventListener('click', () => togglePanel(notesAppPanel));
        if (chatForm) chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });
        if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); }});
        if (deleteSessionBtn) deleteSessionBtn.addEventListener('click', handleDeleteSession);
        if (newChatBtn) newChatBtn.addEventListener('click', handleNewChat);
        if (promptSaveBtn) promptSaveBtn.addEventListener('click', saveCustomPrompt);
        if (promptCancelBtn) promptCancelBtn.addEventListener('click', closePromptModal);
        if (startQuizBtn) startQuizBtn.addEventListener('click', startQuiz);
        if (quizSubmitBtn) quizSubmitBtn.addEventListener('click', () => {
            if (!currentQuizData || !quizResults) return; let score = 0, allAnswered = true;
            currentQuizData.questions.forEach((q, i) => { if (!document.querySelector(`input[name="q-${i}"]:checked`)) allAnswered = false; });
            if (!allAnswered) { quizResults.textContent = "모든 문제에 답해주세요!"; return; }
            currentQuizData.questions.forEach((q, i) => {
                const s = document.querySelector(`input[name="q-${i}"]:checked`);
                if(s.value === q.a) score++;
            });
            quizResults.textContent = `결과: ${currentQuizData.questions.length} 중 ${score} 정답!`;
        });
        if(quizModalOverlay) quizModalOverlay.addEventListener('click', e => { if (e.target === quizModalOverlay) quizModalOverlay.style.display = 'none'; });
        if (addNewNoteBtn) addNewNoteBtn.addEventListener('click', () => addNote());
        if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
        if (searchInput) searchInput.addEventListener('input', renderNoteList);
        // **[NEW]** Event listeners for data management
        if (exportNotesBtn) exportNotesBtn.addEventListener('click', handleExportToLocal);
        if (importNotesBtn) importNotesBtn.addEventListener('click', () => fileInput.click());
        if (fileInput) fileInput.addEventListener('change', handleImportFromLocal);

        const handleInput = () => { updateStatus('입력 중...', true); if (debounceTimer) clearTimeout(debounceTimer); debounceTimer = setTimeout(saveNote, 1000); };
        if (noteTitleInput) noteTitleInput.addEventListener('input', handleInput);
        if (noteContentTextarea) noteContentTextarea.addEventListener('input', handleInput);
        if (notesList) notesList.addEventListener('click', e => {
            const i = e.target.closest('.note-item'); if (!i) return;
            const id = i.dataset.id;
            if (e.target.closest('.delete-btn')) handleDeleteRequest(id);
            else if (e.target.closest('.pin-btn')) togglePin(id);
            else openNoteEditor(id);
        });
        if (formatToolbar) formatToolbar.addEventListener('click', e => { const b = e.target.closest('.format-btn'); if (b) applyFormat(b.dataset.format); });
        if (linkTopicBtn) linkTopicBtn.addEventListener('click', () => { if(!noteContentTextarea) return; const t = document.title || '현재 학습'; noteContentTextarea.value += `\n\n🔗 연관 학습: [${t}]`; saveNote(); });
    }

    // --- 5. Application Initialization Flow ---
    function initialize() {
        updateClock();
        setInterval(updateClock, 1000);
        
        initializeFirebase().then(() => {
            setupNavigator();
            setupChatModeSelector();
            setupDataManagementButtons(); // **[NEW]**
            initializeTooltips();
            makePanelDraggable(chatPanel);
            makePanelDraggable(notesAppPanel);
            setupSystemInfoWidget();
            setupEventListeners();
        });
    }
    
    // --- Run Initialization ---
    initialize();
});
