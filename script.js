/*
--- Ailey & Bailey Canvas ---
File: script.js
Version: 8.3 (Final - Wipe and Write Restore)
Architect: [Username] & System Architect Ailey
Description: The restore logic has been fundamentally re-architected to a 'Wipe and Write' model. It now deletes all existing canvas-specific data before writing the new data, ensuring perfect consistency with the backup file and eliminating all data conflict errors.
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

    // -- Chat Session UI Elements
    const newChatBtn = document.getElementById('new-chat-btn');
    const sessionList = document.getElementById('session-list');
    const chatSessionTitle = document.getElementById('chat-session-title');
    const deleteSessionBtn = document.getElementById('delete-session-btn');
    const chatWelcomeMessage = document.getElementById('chat-welcome-message');

    // -- Backup & Restore UI Elements
    const restoreDataBtn = document.getElementById('restore-data-btn');
    const fileImporter = document.getElementById('file-importer');

    // -- System Reset UI Element
    const systemResetBtn = document.getElementById('system-reset-btn');


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

    // --- CHAT STATE ---
    let localChatSessionsCache = [];
    let currentSessionId = null;
    let unsubscribeFromChatSessions = null;
    let selectedMode = 'ailey_coaching';
    let chatQuizState = 'idle';
    let lastQuestion = '';
    let customPrompt = localStorage.getItem('customTutorPrompt') || '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.';
    let currentQuizData = null;

    // --- 3. Function Definitions ---

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
                // Using a single global collection for notes, but logic will filter by canvasId.
                notesCollection = db.collection(`artifacts/${appId}/users/${currentUser.uid}/notes`);
                chatSessionsCollectionRef = db.collection(`artifacts/${appId}/users/${currentUser.uid}/chatHistories/${canvasId}/sessions`);
                
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

    // --- Chat Session Management ---
    function listenToChatSessions() { if (!chatSessionsCollectionRef) return; if (unsubscribeFromChatSessions) unsubscribeFromChatSessions(); unsubscribeFromChatSessions = chatSessionsCollectionRef.orderBy("updatedAt", "desc").onSnapshot(snapshot => { localChatSessionsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); renderSessionList(); if (currentSessionId) { const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId); if (currentSessionData) { renderChatMessages(currentSessionData.messages || []); } else { handleNewChat(); } } }, error => console.error("Chat session listener error:", error)); }
    function renderSessionList() { if (!sessionList) return; sessionList.innerHTML = ''; localChatSessionsCache.forEach(session => { const item = document.createElement('div'); item.className = 'session-item'; item.dataset.sessionId = session.id; if (session.id === currentSessionId) { item.classList.add('active'); } item.innerHTML = `<div class="session-item-title">${session.title || '새 대화'}</div>`; item.addEventListener('click', () => selectSession(session.id)); sessionList.appendChild(item); }); }
    function selectSession(sessionId) { if (!sessionId) return; const sessionData = localChatSessionsCache.find(s => s.id === sessionId); if (!sessionData) return; currentSessionId = sessionId; renderSessionList(); if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none'; if (chatMessages) chatMessages.style.display = 'flex'; renderChatMessages(sessionData.messages || []); if (chatSessionTitle) chatSessionTitle.textContent = sessionData.title || '대화'; if (deleteSessionBtn) deleteSessionBtn.style.display = 'inline-block'; if (chatInput) chatInput.disabled = false; if (chatSendBtn) chatSendBtn.disabled = false; chatInput.focus(); }
    function handleNewChat() { currentSessionId = null; renderSessionList(); if (chatMessages) { chatMessages.innerHTML = ''; chatMessages.style.display = 'none'; } if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'flex'; if (chatSessionTitle) chatSessionTitle.textContent = 'AI 러닝메이트'; if (deleteSessionBtn) deleteSessionBtn.style.display = 'none'; if (chatInput) { chatInput.disabled = false; chatInput.value = ''; } if (chatSendBtn) chatSendBtn.disabled = false; }
    function handleDeleteSession() { if (!currentSessionId) return; const sessionToDelete = localChatSessionsCache.find(s => s.id === currentSessionId); showModal(`'${sessionToDelete?.title || '이 대화'}'를 삭제하시겠습니까?`, () => { if (chatSessionsCollectionRef && currentSessionId) { chatSessionsCollectionRef.doc(currentSessionId).delete().then(() => { console.log("Session deleted successfully"); handleNewChat(); }).catch(e => console.error("세션 삭제 실패:", e)); } }); }
    async function handleChatSend() { if (!chatInput || chatInput.disabled) return; const query = chatInput.value.trim(); if (!query) return; chatInput.disabled = true; chatSendBtn.disabled = true; const userMessage = { role: 'user', content: query, timestamp: new Date().toISOString() }; let sessionRef; let messages = []; try { if (!currentSessionId) { if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none'; if (chatMessages) chatMessages.style.display = 'flex'; const newSession = { title: query.substring(0, 40) + (query.length > 40 ? '...' : ''), messages: [userMessage], mode: selectedMode, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp(), }; sessionRef = await chatSessionsCollectionRef.add(newSession); currentSessionId = sessionRef.id; messages = newSession.messages; renderSessionList(); } else { sessionRef = chatSessionsCollectionRef.doc(currentSessionId); const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId); messages = [...(currentSessionData.messages || []), userMessage]; await sessionRef.update({ messages: messages, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); } renderChatMessages(messages); const loadingDiv = document.createElement('div'); loadingDiv.className = 'chat-message ai'; loadingDiv.innerHTML = '<div class="loading-indicator">AI가 답변을 생성하고 있습니다...</div>'; if (chatMessages) { chatMessages.appendChild(loadingDiv); chatMessages.scrollTop = chatMessages.scrollHeight; } const apiMessages = messages.map(msg => ({ role: msg.role === 'ai' ? 'model' : 'user', parts: [{ text: msg.content }] })); const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: apiMessages }) }); if (!res.ok) throw new Error(`${res.status}`); const result = await res.json(); let aiRes = "답변 생성 중 오류... 😥"; if (result.candidates?.[0].content.parts[0]) { aiRes = result.candidates[0].content.parts[0].text; } const aiMessage = { role: 'ai', content: aiRes, timestamp: new Date().toISOString() }; messages.push(aiMessage); await sessionRef.update({ messages: messages, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); } catch (e) { console.error("Chat send error:", e); const errorMessage = { role: 'ai', content: `API 오류가 발생했습니다: ${e.message}`, timestamp: new Date().toISOString() }; if (sessionRef) { const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId); const errorMessages = [...(currentSessionData?.messages || []), errorMessage]; await sessionRef.update({ messages: errorMessages }); } } finally { chatInput.disabled = false; chatSendBtn.disabled = false; chatInput.value = ''; chatInput.style.height = 'auto'; chatInput.focus(); } }
    function renderChatMessages(messages = []) { if (!chatMessages) return; chatMessages.innerHTML = ''; if (messages.length === 0 && currentSessionId) { } messages.forEach(msg => { const d = document.createElement('div'); d.className = `chat-message ${msg.role}`; let c = msg.content; if (c.startsWith('[PROBLEM_GENERATED]')) { d.classList.add('quiz-problem'); c = c.replace('[PROBLEM_GENERATED]', '').trim(); } else if (c.startsWith('[CORRECT]')) { d.classList.add('quiz-solution', 'correct'); const h = document.createElement('div'); h.className = 'solution-header correct'; h.textContent = '✅ 정답입니다!'; d.appendChild(h); c = c.replace('[CORRECT]', '').trim(); } else if (c.startsWith('[INCORRECT]')) { d.classList.add('quiz-solution', 'incorrect'); const h = document.createElement('div'); h.className = 'solution-header incorrect'; h.textContent = '❌ 오답입니다.'; d.appendChild(h); c = c.replace('[INCORRECT]', '').trim(); } const cd = document.createElement('div'); cd.innerHTML = c.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'); d.appendChild(cd); if (msg.timestamp) { const t = document.createElement('div'); t.className = 'chat-timestamp'; t.textContent = new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }); d.appendChild(t); } if (msg.role === 'ai') { const b = document.createElement('button'); b.className = 'send-to-note-btn'; b.textContent = '메모로 보내기'; b.onclick = e => { addNote(`[AI 러닝메이트] ${cd.textContent}`); e.target.textContent = '✅'; e.target.disabled = true; }; cd.appendChild(b); } chatMessages.appendChild(d); }); chatMessages.scrollTop = chatMessages.scrollHeight; }
    function setupChatModeSelector() { if (!chatModeSelector) return; chatModeSelector.innerHTML = ''; const modes = [{ id: 'ailey_coaching', t: '기본 코칭 💬' }, { id: 'deep_learning', t: '심화 학습 🧠' }, { id: 'custom', t: '커스텀 ⚙️' }]; modes.forEach(m => { const b = document.createElement('button'); b.dataset.mode = m.id; b.innerHTML = m.t; if (m.id === selectedMode) b.classList.add('active'); b.addEventListener('click', () => { selectedMode = m.id; chatQuizState = 'idle'; lastQuestion = ''; chatModeSelector.querySelectorAll('button').forEach(btn => btn.classList.remove('active')); b.classList.add('active'); if (selectedMode === 'custom') openPromptModal(); }); chatModeSelector.appendChild(b); }); }

    // --- System Reset Function ---
    async function handleSystemReset() { const message = "정말로 이 캔버스의 모든 메모와 채팅 기록을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 복구할 수 없습니다."; showModal(message, async () => { if (!db || !notesCollection || !chatSessionsCollectionRef) { alert("초기화 실패: DB 연결을 확인해주세요."); return; } updateStatus("시스템 초기화 중...", true); console.log("⚠️ 시스템 초기화를 시작합니다..."); const batch = db.batch(); try { const notesSnapshot = await notesCollection.where("canvasId", "==", canvasId).get(); let notesCount = 0; notesSnapshot.docs.forEach(doc => { batch.delete(doc.ref); notesCount++; }); console.log(`현재 캔버스 메모 ${notesCount}개 삭제 대기 중...`); const chatsSnapshot = await chatSessionsCollectionRef.get(); let chatsCount = 0; chatsSnapshot.docs.forEach(doc => { batch.delete(doc.ref); chatsCount++; }); console.log(`현재 캔버스 채팅 세션 ${chatsCount}개 삭제 대기 중...`); if (notesCount === 0 && chatsCount === 0) { alert("삭제할 데이터가 없습니다."); updateStatus("", true); return; } await batch.commit(); console.log("✅ 시스템 초기화 완료."); alert("✅ 현재 캔버스의 모든 데이터가 성공적으로 삭제되었습니다. 페이지를 새로고침하여 시스템을 다시 시작합니다."); location.reload(); } catch (error) { console.error("❌ 시스템 초기화 실패:", error); alert(`시스템 초기화 중 오류가 발생했습니다: ${error.message}`); updateStatus("초기화 실패 ❌", false); } }); }

    // --- Data Backup & Restore ---
    function exportAllData() { if (localNotesCache.length === 0 && localChatSessionsCache.length === 0) { showModal("백업할 데이터가 없습니다.", () => {}); return; } const dataToExport = { backupVersion: '1.2-isolated', backupDate: new Date().toISOString(), notes: localNotesCache, chatSessions: localChatSessionsCache }; const str = JSON.stringify(dataToExport, null, 2); const blob = new Blob([str], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; const date = new Date().toISOString().slice(0, 10); a.download = `ailey-canvas-backup-${date}.json`; a.click(); URL.revokeObjectURL(url); }
    function handleRestoreClick() { if (fileImporter) { fileImporter.click(); } }
    
    // [RE-ARCHITECTED] Wipe and Write Restore Logic.
    async function importAllData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.backupVersion || !data.notes || !data.chatSessions) {
                    throw new Error("유효하지 않은 파일 형식입니다.");
                }
                
                const confirmationMessage = `이 작업은 현재 캔버스의 모든 데이터를 영구적으로 삭제하고, 파일의 내용으로 완전히 대체합니다. 계속하시겠습니까?`;

                showModal(confirmationMessage, async () => {
                    if (!db || !notesCollection || !chatSessionsCollectionRef) {
                        return updateStatus('복원 실패: DB 연결 오류 ❌', false);
                    }
                    
                    // --- 1. WIPE PHASE ---
                    updateStatus("기존 데이터 정리 중...", true);
                    try {
                        const deleteBatch = db.batch();
                        const notesToDelete = await notesCollection.where("canvasId", "==", canvasId).get();
                        notesToDelete.docs.forEach(doc => deleteBatch.delete(doc.ref));
                        
                        const chatsToDelete = await chatSessionsCollectionRef.get();
                        chatsToDelete.docs.forEach(doc => deleteBatch.delete(doc.ref));
                        
                        await deleteBatch.commit();
                        console.log("✅ 기존 캔버스 데이터가 성공적으로 삭제되었습니다.");
                    } catch(error) {
                        console.error("❌ 기존 데이터 삭제 실패:", error);
                        updateStatus("복원 실패: 기존 데이터 정리 오류 ❌", false);
                        alert("기존 데이터를 정리하는 데 실패했습니다. 콘솔을 확인해주세요.");
                        return;
                    }

                    // --- 2. WRITE PHASE ---
                    updateStatus("새 데이터 복원 중...", true);
                    const notePromises = data.notes.map(note => {
                        const docRef = notesCollection.doc(note.id);
                        const { id, ...dataToWrite } = note;
                        if (dataToWrite.createdAt && typeof dataToWrite.createdAt === 'string') dataToWrite.createdAt = firebase.firestore.Timestamp.fromDate(new Date(dataToWrite.createdAt));
                        if (dataToWrite.updatedAt && typeof dataToWrite.updatedAt === 'string') dataToWrite.updatedAt = firebase.firestore.Timestamp.fromDate(new Date(dataToWrite.updatedAt));
                        // Ensure the note has the current canvasId, even if the backup is from another.
                        dataToWrite.canvasId = canvasId; 
                        return docRef.set(dataToWrite).catch(err => {
                             console.error(`[쓰기 실패] 메모: "${note.title || note.id}"`, err);
                             return Promise.reject(err);
                        });
                    });

                    const chatPromises = data.chatSessions.map(session => {
                        const docRef = chatSessionsCollectionRef.doc(session.id);
                        const { id, ...dataToWrite } = session;
                        if (dataToWrite.createdAt && typeof dataToWrite.createdAt === 'string') dataToWrite.createdAt = firebase.firestore.Timestamp.fromDate(new Date(dataToWrite.createdAt));
                        if (dataToWrite.updatedAt && typeof dataToWrite.updatedAt === 'string') dataToWrite.updatedAt = firebase.firestore.Timestamp.fromDate(new Date(dataToWrite.updatedAt));
                        if (Array.isArray(dataToWrite.messages)) {
                            dataToWrite.messages.forEach(message => {
                                if (message.timestamp && typeof message.timestamp === 'string') message.timestamp = firebase.firestore.Timestamp.fromDate(new Date(message.timestamp));
                            });
                        }
                        return docRef.set(dataToWrite).catch(err => {
                            console.error(`[쓰기 실패] 채팅: "${session.title || session.id}"`, err);
                            return Promise.reject(err);
                        });
                    });
                    
                    const results = await Promise.allSettled([...notePromises, ...chatPromises]);
                    const successCount = results.filter(r => r.status === 'fulfilled').length;
                    const failureCount = results.filter(r => r.status === 'rejected').length;

                    const finalMessage = `복원 완료: ${successCount}개 성공, ${failureCount}개 실패.`;
                    updateStatus(finalMessage, failureCount === 0);
                    if (failureCount > 0) {
                        alert(finalMessage + "\n자세한 내용은 개발자 콘솔(F12)을 확인하세요.");
                    } else {
                        alert("✅ 데이터 복원이 성공적으로 완료되었습니다!");
                    }
                });
            } catch (error) {
                showModal(`파일을 읽는 중 오류가 발생했습니다: ${error.message}`, () => {});
            } finally {
                event.target.value = null;
            }
        };
        reader.readAsText(file);
    }
    
    // --- Utilities, Notes (with canvasId logic) ---
    function updateClock() { const clockElement = document.getElementById('real-time-clock'); if (!clockElement) return; const now = new Date(); const options = { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }; clockElement.textContent = now.toLocaleString('ko-KR', options); }
    function setupSystemInfoWidget() { if (!systemInfoWidget || !currentUser) return; const canvasIdDisplay = document.getElementById('canvas-id-display'); if (canvasIdDisplay) { canvasIdDisplay.textContent = canvasId.substring(0, 8) + '...'; } const copyBtn = document.getElementById('copy-canvas-id'); if (copyBtn) { copyBtn.addEventListener('click', () => { const tempTextarea = document.createElement('textarea'); tempTextarea.value = canvasId; tempTextarea.style.position = 'absolute'; tempTextarea.style.left = '-9999px'; document.body.appendChild(tempTextarea); tempTextarea.select(); try { document.execCommand('copy'); copyBtn.textContent = '✅'; } catch (err) { console.error('Copy failed', err); copyBtn.textContent = '❌'; } document.body.removeChild(tempTextarea); setTimeout(() => { copyBtn.textContent = '📋'; }, 1500); }); } const tooltip = document.createElement('div'); tooltip.className = 'system-tooltip'; tooltip.innerHTML = `<div><strong>Canvas ID:</strong> ${canvasId}</div><div><strong>User ID:</strong> ${currentUser.uid}</div>`; systemInfoWidget.appendChild(tooltip); }
    function initializeTooltips() { const keywordChips = document.querySelectorAll('.keyword-chip'); keywordChips.forEach(chip => { const tooltipText = chip.dataset.tooltip; if (tooltipText && chip.querySelector('.tooltip')) { chip.classList.add('has-tooltip'); chip.querySelector('.tooltip').textContent = tooltipText; } }); const inlineHighlights = document.querySelectorAll('.content-section strong[data-tooltip]'); inlineHighlights.forEach(highlight => { const tooltipText = highlight.dataset.tooltip; if(tooltipText && !highlight.querySelector('.tooltip')) { highlight.classList.add('has-tooltip'); const tooltipElement = document.createElement('span'); tooltipElement.className = 'tooltip'; tooltipElement.textContent = tooltipText; highlight.appendChild(tooltipElement); } }); }
    function makePanelDraggable(panelElement) { if(!panelElement) return; const header = panelElement.querySelector('.panel-header'); if(!header) return; let isDragging = false, offset = { x: 0, y: 0 }; const onMouseMove = (e) => { if (isDragging) { panelElement.style.left = (e.clientX + offset.x) + 'px'; panelElement.style.top = (e.clientY + offset.y) + 'px'; } }; const onMouseUp = () => { isDragging = false; panelElement.classList.remove('is-dragging'); document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); }; header.addEventListener('mousedown', e => { if (e.target.closest('button, input, .close-btn, #delete-session-btn, #chat-mode-selector')) return; isDragging = true; panelElement.classList.add('is-dragging'); offset = { x: panelElement.offsetLeft - e.clientX, y: panelElement.offsetTop - e.clientY }; document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp); }); }
    function togglePanel(panelElement, forceShow = null) { if (!panelElement) return; const show = forceShow !== null ? forceShow : panelElement.style.display !== 'flex'; panelElement.style.display = show ? 'flex' : 'none'; }
    function setupNavigator() { const scrollNav = document.getElementById('scroll-nav'); if (!scrollNav || !learningContent) return; const headers = learningContent.querySelectorAll('h2, #section-4 h3, #section-5 h3, #section-6 h3'); if (headers.length === 0) { scrollNav.style.display = 'none'; if(wrapper) wrapper.classList.add('toc-hidden'); return; } scrollNav.style.display = 'block'; if(wrapper) wrapper.classList.remove('toc-hidden'); const navList = document.createElement('ul'); headers.forEach((header, index) => { let targetElement = header.closest('.content-section'); if (targetElement && !targetElement.id) { targetElement.id = `nav-target-${index}`; } if (targetElement) { const listItem = document.createElement('li'); const link = document.createElement('a'); let navText = header.textContent.trim().replace(/\[|\]|🤓|⏳|📖/g, '').trim(); const maxLen = 25; if (navText.length > maxLen) { navText = navText.substring(0, maxLen - 3) + '...'; } if (header.tagName === 'H3') { link.style.paddingLeft = '25px'; link.style.fontSize = '0.9em'; } link.textContent = navText; link.href = `#${targetElement.id}`; listItem.appendChild(link); navList.appendChild(listItem); } }); scrollNav.innerHTML = '<h3>학습 내비게이션</h3>'; scrollNav.appendChild(navList); const links = scrollNav.querySelectorAll('a'); const observer = new IntersectionObserver(entries => { entries.forEach(entry => { const id = entry.target.getAttribute('id'); const navLink = scrollNav.querySelector(`a[href="#${id}"]`); if (navLink && entry.isIntersecting && entry.intersectionRatio > 0.5) { links.forEach(l => l.classList.remove('active')); navLink.classList.add('active'); } }); }, { rootMargin: "0px 0px -70% 0px", threshold: 0.6 }); headers.forEach(header => { const target = header.closest('.content-section'); if (target) observer.observe(target); }); }
    function handleTextSelection(e) { if (e.target.closest('.draggable-panel, #selection-popover, .fixed-tool-container, #system-info-widget')) return; const selection = window.getSelection(); const selectedText = selection.toString().trim(); if (selectedText.length > 3) { lastSelectedText = selectedText; const range = selection.getRangeAt(0); const rect = range.getBoundingClientRect(); const popover = selectionPopover; let top = rect.top + window.scrollY - popover.offsetHeight - 10; let left = rect.left + window.scrollX + (rect.width / 2) - (popover.offsetWidth / 2); if (top < window.scrollY) top = rect.bottom + window.scrollY + 10; if (left < 0) left = 5; if (left + popover.offsetWidth > window.innerWidth) left = window.innerWidth - popover.offsetWidth - 5; popover.style.top = `${top}px`; popover.style.left = `${left}px`; popover.style.display = 'flex'; } else { if (!e.target.closest('#selection-popover')) selectionPopover.style.display = 'none'; } }
    function handlePopoverAskAi() { if (!lastSelectedText || !chatInput) return; togglePanel(chatPanel, true); handleNewChat(); setTimeout(() => { chatInput.value = `"${lastSelectedText}"\n\n이 내용에 대해 더 자세히 설명해줄래?`; chatInput.style.height = 'auto'; chatInput.style.height = (chatInput.scrollHeight) + 'px'; chatInput.focus(); }, 100); selectionPopover.style.display = 'none'; }
    function handlePopoverAddNote() { if (!lastSelectedText) return; addNote(`> ${lastSelectedText}\n\n`); selectionPopover.style.display = 'none'; }
    function openPromptModal() { if (customPromptInput) customPromptInput.value = customPrompt; if (promptModalOverlay) promptModalOverlay.style.display = 'flex'; }
    function closePromptModal() { if (promptModalOverlay) promptModalOverlay.style.display = 'none'; }
    function saveCustomPrompt() { if (customPromptInput) { customPrompt = customPromptInput.value; localStorage.setItem('customTutorPrompt', customPrompt); closePromptModal(); } }
    function showModal(message, onConfirm) { if (!customModal || !modalMessage || !modalConfirmBtn || !modalCancelBtn) return; modalMessage.textContent = message; customModal.style.display = 'flex'; modalConfirmBtn.onclick = () => { onConfirm(); customModal.style.display = 'none'; }; modalCancelBtn.onclick = () => { customModal.style.display = 'none'; }; }
    function listenToNotes() { if (!notesCollection) return; if (unsubscribeFromNotes) unsubscribeFromNotes(); unsubscribeFromNotes = notesCollection.where("canvasId", "==", canvasId).onSnapshot(s => { localNotesCache = s.docs.map(d => ({ id: d.id, ...d.data() })); renderNoteList(); }, e => console.error("노트 실시간 수신 오류:", e)); }
    function renderNoteList() { if (!notesList || !searchInput) return; const term = searchInput.value.toLowerCase(); const filtered = localNotesCache.filter(n => (n.title && n.title.toLowerCase().includes(term)) || (n.content && n.content.toLowerCase().includes(term))); filtered.sort((a,b) => (b.isPinned - a.isPinned) || (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0)); notesList.innerHTML = ''; if (filtered.length === 0) { notesList.innerHTML = '<div>표시할 메모가 없습니다.</div>'; return; } filtered.forEach(n => { const i = document.createElement('div'); i.className = 'note-item'; i.dataset.id = n.id; if (n.isPinned) i.classList.add('pinned'); const d = n.updatedAt ? new Date(n.updatedAt.toMillis()).toLocaleString() : '날짜 없음'; i.innerHTML = `<div class="note-item-content"><div class="note-item-title">${n.title||'무제'}</div><div class="note-item-date">${d}</div></div><div class="note-item-actions"><button class="item-action-btn pin-btn ${n.isPinned?'pinned-active':''}" title="고정">${n.isPinned?'📌':'📍'}</button><button class="item-action-btn delete-btn" title="삭제">🗑️</button></div>`; notesList.appendChild(i); }); }
    async function addNote(content = '') { if (!notesCollection) return; try { const newNote = { title: '새 메모', content: content, isPinned: false, canvasId: canvasId, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }; const ref = await notesCollection.add(newNote); openNoteEditor(ref.id); } catch (e) { console.error("새 메모 추가 실패:", e); } }
    function saveNote() { if (debounceTimer) clearTimeout(debounceTimer); if (!currentNoteId || !notesCollection) return; const data = { title: noteTitleInput.value, content: noteContentTextarea.value, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }; notesCollection.doc(currentNoteId).update(data).then(() => updateStatus('저장됨 ✓', true)).catch(e => { console.error("메모 저장 실패:", e); updateStatus('저장 실패 ❌', false); }); }
    function handleDeleteRequest(id) { showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => { if (notesCollection) notesCollection.doc(id).delete().catch(e => console.error("메모 삭제 실패:", e)); }); }
    async function togglePin(id) { if (!notesCollection) return; const note = localNotesCache.find(n => n.id === id); if (note) await notesCollection.doc(id).update({ isPinned: !note.isPinned }); }
    function switchView(view) { if (view === 'editor') { if(noteListView) noteListView.classList.remove('active'); if(noteEditorView) noteEditorView.classList.add('active'); } else { if(noteEditorView) noteEditorView.classList.remove('active'); if(noteListView) noteListView.classList.add('active'); currentNoteId = null; } }
    function openNoteEditor(id) { const note = localNotesCache.find(n => n.id === id); if (note && noteTitleInput && noteContentTextarea) { currentNoteId = id; noteTitleInput.value = note.title || ''; noteContentTextarea.value = note.content || ''; switchView('editor'); } }
    function updateStatus(msg, success) { if (!autoSaveStatus) return; autoSaveStatus.textContent = msg; autoSaveStatus.style.color = success ? 'lightgreen' : 'lightcoral'; setTimeout(() => { autoSaveStatus.textContent = ''; }, 4000); }
    function applyFormat(fmt) { if (!noteContentTextarea) return; const s = noteContentTextarea.selectionStart, e = noteContentTextarea.selectionEnd, t = noteContentTextarea.value.substring(s, e); const m = fmt === 'bold' ? '**' : (fmt === 'italic' ? '*' : '`'); noteContentTextarea.value = `${noteContentTextarea.value.substring(0,s)}${m}${t}${m}${noteContentTextarea.value.substring(e)}`; noteContentTextarea.focus(); }
    async function startQuiz() { if (!quizModalOverlay) return; const k = Array.from(document.querySelectorAll('.keyword-chip')).map(c => c.textContent.trim()).join(', '); if (!k) { showModal("퀴즈 생성 키워드가 없습니다.", ()=>{}); return; } if (quizContainer) quizContainer.innerHTML = '<div class="loading-indicator">퀴즈 생성 중...</div>'; if (quizResults) quizResults.innerHTML = ''; quizModalOverlay.style.display = 'flex'; try { const res = await new Promise(r => setTimeout(() => r(JSON.stringify({ "questions": [{"q":"(e.g)...","o":["..."],"a":"..."}]})), 500)); currentQuizData = JSON.parse(res); renderQuiz(currentQuizData); } catch (e) { if(quizContainer) quizContainer.innerHTML = '퀴즈 생성 실패.'; } }
    function renderQuiz(data) { if (!quizContainer || !data.questions) return; quizContainer.innerHTML = ''; data.questions.forEach((q, i) => { const b = document.createElement('div'); b.className = 'quiz-question-block'; const p = document.createElement('p'); p.textContent = `${i + 1}. ${q.q}`; const o = document.createElement('div'); o.className = 'quiz-options'; q.o.forEach(opt => { const l = document.createElement('label'); const r = document.createElement('input'); r.type = 'radio'; r.name = `q-${i}`; r.value = opt; l.append(r,` ${opt}`); o.appendChild(l); }); b.append(p, o); quizContainer.appendChild(b); }); }

    // --- 4. Global Initialization ---
    function initialize() {
        if (!body || !wrapper) { console.error("Core layout elements not found."); return; }
        updateClock(); setInterval(updateClock, 1000);
        
        initializeFirebase().then(() => {
            setupNavigator();
            setupChatModeSelector();
            initializeTooltips();
            makePanelDraggable(chatPanel);
            makePanelDraggable(notesAppPanel);
        });

        document.addEventListener('mouseup', handleTextSelection);
        if (popoverAskAi) popoverAskAi.addEventListener('click', handlePopoverAskAi);
        if (popoverAddNote) popoverAddNote.addEventListener('click', handlePopoverAddNote);
        if (themeToggle) themeToggle.addEventListener('click', () => { body.classList.toggle('dark-mode'); themeToggle.textContent = body.classList.contains('dark-mode') ? '☀️' : '🌙'; });
        if (tocToggleBtn) tocToggleBtn.addEventListener('click', () => { wrapper.classList.toggle('toc-hidden'); systemInfoWidget?.classList.toggle('tucked'); });
        if (chatToggleBtn) chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));
        if (chatPanel) chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));
        if (notesAppToggleBtn) notesAppToggleBtn.addEventListener('click', () => togglePanel(notesAppPanel));
        if (chatForm) chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });
        if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } });
        if (deleteSessionBtn) deleteSessionBtn.addEventListener('click', handleDeleteSession);
        if (newChatBtn) newChatBtn.addEventListener('click', handleNewChat);
        if (promptSaveBtn) promptSaveBtn.addEventListener('click', saveCustomPrompt);
        if (promptCancelBtn) promptCancelBtn.addEventListener('click', closePromptModal);
        if (startQuizBtn) startQuizBtn.addEventListener('click', startQuiz);
        if (quizSubmitBtn) quizSubmitBtn.addEventListener('click', () => { if (!currentQuizData || !quizResults) return; let score = 0, allAnswered = true; currentQuizData.questions.forEach((q, i) => { if (!document.querySelector(`input[name="q-${i}"]:checked`)) allAnswered = false; }); if (!allAnswered) { quizResults.textContent = "모든 문제에 답해주세요!"; return; } currentQuizData.questions.forEach((q, i) => { const s = document.querySelector(`input[name="q-${i}"]:checked`); if(s.value === q.a) score++; }); quizResults.textContent = `결과: ${currentQuizData.questions.length} 중 ${score} 정답!`; });
        if(quizModalOverlay) quizModalOverlay.addEventListener('click', e => { if (e.target === quizModalOverlay) quizModalOverlay.style.display = 'none'; });
        if (addNewNoteBtn) addNewNoteBtn.addEventListener('click', () => addNote());
        if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
        if (searchInput) searchInput.addEventListener('input', renderNoteList);
        if (exportNotesBtn) exportNotesBtn.addEventListener('click', exportAllData);
        if (restoreDataBtn) restoreDataBtn.addEventListener('click', handleRestoreClick);
        if (fileImporter) fileImporter.addEventListener('change', importAllData);
        if (systemResetBtn) systemResetBtn.addEventListener('click', handleSystemReset);
        const handleInput = () => { updateStatus('입력 중...', true); if (debounceTimer) clearTimeout(debounceTimer); debounceTimer = setTimeout(saveNote, 1000); };
        if (noteTitleInput) noteTitleInput.addEventListener('input', handleInput);
        if (noteContentTextarea) noteContentTextarea.addEventListener('input', handleInput);
        if (notesList) notesList.addEventListener('click', e => { const i = e.target.closest('.note-item'); if (!i) return; const id = i.dataset.id; if (e.target.closest('.delete-btn')) handleDeleteRequest(id); else if (e.target.closest('.pin-btn')) togglePin(id); else openNoteEditor(id); });
        if (formatToolbar) formatToolbar.addEventListener('click', e => { const b = e.target.closest('.format-btn'); if (b) applyFormat(b.dataset.format); });
        if (linkTopicBtn) linkTopicBtn.addEventListener('click', () => { if(!noteContentTextarea) return; const t = document.title || '현재 학습'; noteContentTextarea.value += `\n\n🔗 연관 학습: [${t}]`; saveNote(); });
    }

    // --- 5. Run Initialization ---
    initialize();
});
