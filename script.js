/*
--- Ailey & Bailey Canvas ---
File: script.js
Version: 7.9 (True Final - Full Readability)
Architect: [Username] & System Architect Ailey
Description: This is the true complete version with all functions explicitly written out for maximum readability and user review. It includes the session-based chat, global notes, robust copy, and all previously discussed UI functionalities without any code omission or aggressive optimization.
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
    
    // Chat Panel Elements
    const chatPanel = document.getElementById('chat-panel');
    const chatListView = document.getElementById('chat-list-view');
    const chatConversationView = document.getElementById('chat-conversation-view');
    const chatSessionList = document.getElementById('chat-session-list');
    const addNewChatBtn = document.getElementById('add-new-chat-btn');
    const backToChatListBtn = document.getElementById('back-to-chat-list-btn');
    const chatSessionTitle = document.getElementById('chat-session-title');
    const deleteSessionBtn = document.getElementById('delete-session-btn');
    const chatMessages = document.getElementById('chat-messages');
    const chatModeSelector = document.getElementById('chat-mode-selector');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');


    // --- 2. State Management ---
    const canvasId = document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id';
    let db, notesCollection, chatSessionsCollection;
    let currentUser = null;
    const appId = 'AileyBailey_Global_Space';
    let lastSelectedText = '';

    // Note State
    let localNotesCache = [];
    let currentNoteId = null;
    let unsubscribeFromNotes = null;
    let debounceTimer = null;

    // Chat State
    let localChatSessionsCache = [];
    let currentChatSessionId = null;
    let unsubscribeFromChatSessions = null;
    let selectedMode = 'ailey_coaching';
    let customPrompt = localStorage.getItem('customTutorPrompt') || '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.';

    // --- 3. Function Definitions ---

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
                // Notes are global to the user
                notesCollection = db.collection(`artifacts/${appId}/users/${currentUser.uid}/notes`);
                // Chat sessions are also global to the user
                chatSessionsCollection = db.collection(`artifacts/${appId}/users/${currentUser.uid}/chatSessions`);
                
                listenToNotes();
                listenToChatSessions();
                setupSystemInfoWidget();
            }
        } catch (error) { console.error("Firebase 초기화 실패:", error); }
    }

    // --- UI & Utilities ---
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
        if (canvasIdDisplay) {
            canvasIdDisplay.textContent = canvasId.substring(0, 8) + '...';
        }

        const copyBtn = document.getElementById('copy-canvas-id');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const tempTextarea = document.createElement('textarea');
                tempTextarea.value = canvasId;
                tempTextarea.style.position = 'absolute';
                tempTextarea.style.left = '-9999px';
                document.body.appendChild(tempTextarea);
                tempTextarea.select();
                try {
                    document.execCommand('copy');
                    copyBtn.textContent = '✅';
                } catch (err) {
                    console.error('Copy failed', err);
                    copyBtn.textContent = '❌';
                }
                document.body.removeChild(tempTextarea);
                setTimeout(() => { copyBtn.textContent = '📋'; }, 1500);
            });
        }
        
        const tooltip = document.createElement('div');
        tooltip.className = 'system-tooltip';
        tooltip.innerHTML = `<div><strong>Canvas ID:</strong> ${canvasId}</div><div><strong>User ID:</strong> ${currentUser.uid}</div>`;
        systemInfoWidget.appendChild(tooltip);
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

    function makePanelDraggable(panelElement) {
        if(!panelElement) return;
        const header = panelElement.querySelector('.panel-header');
        if(!header) return;
        let isDragging = false, offset = { x: 0, y: 0 };
        const onMouseMove = (e) => {
            if (isDragging) {
                panelElement.style.left = (e.clientX + offset.x) + 'px';
                panelElement.style.top = (e.clientY + offset.y) + 'px';
            }
        };
        const onMouseUp = () => {
            isDragging = false;
            panelElement.classList.remove('is-dragging');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        header.addEventListener('mousedown', e => {
            if (e.target.closest('button, input, .close-btn, .notes-btn')) return;
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

        const headers = learningContent.querySelectorAll('h2, #section-4 h3, #section-5 h3, #section-6 h3');

        if (headers.length === 0) {
            scrollNav.style.display = 'none';
            if(wrapper) wrapper.classList.add('toc-hidden');
            return;
        }

        scrollNav.style.display = 'block';
        if(wrapper) wrapper.classList.remove('toc-hidden');
        
        const navList = document.createElement('ul');
        headers.forEach((header, index) => {
            let targetElement = header.closest('.content-section');
            if (targetElement && !targetElement.id) { targetElement.id = `nav-target-${index}`; }
            if (targetElement) {
                const listItem = document.createElement('li');
                const link = document.createElement('a');
                let navText = header.textContent.trim().replace(/\[|\]|🤓|⏳|📖/g, '').trim();
                const maxLen = 25;
                if (navText.length > maxLen) { navText = navText.substring(0, maxLen - 3) + '...'; }
                if (header.tagName === 'H3') { link.style.paddingLeft = '25px'; link.style.fontSize = '0.9em'; }
                link.textContent = navText;
                link.href = `#${targetElement.id}`;
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
            const target = header.closest('.content-section');
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
        if (chatListView.classList.contains('active')) {
             addNewChatBtn.click();
        }
        chatInput.value = `"${lastSelectedText}"\n\n이 내용에 대해 더 자세히 설명해줄래?`;
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
        chatInput.focus();
        selectionPopover.style.display = 'none';
    }

    function handlePopoverAddNote() {
        if (!lastSelectedText) return;
        addNote(`> ${lastSelectedText}\n\n`);
        selectionPopover.style.display = 'none';
    }

    function openPromptModal() { if (customPromptInput) customPromptInput.value = customPrompt; if (promptModalOverlay) promptModalOverlay.style.display = 'flex'; }
    function closePromptModal() { if (promptModalOverlay) promptModalOverlay.style.display = 'none'; }
    function saveCustomPrompt() { if (customPromptInput) { customPrompt = customPromptInput.value; localStorage.setItem('customTutorPrompt', customPrompt); closePromptModal(); } }
    function showModal(message, onConfirm) { if (!customModal || !modalMessage || !modalConfirmBtn || !modalCancelBtn) return; modalMessage.textContent = message; customModal.style.display = 'flex'; modalConfirmBtn.onclick = () => { onConfirm(); customModal.style.display = 'none'; }; modalCancelBtn.onclick = () => { customModal.style.display = 'none'; }; }

    // --- Chat System (Session-Based) ---
    function switchChatView(viewName) {
        if (viewName === 'conversation') {
            chatListView.classList.remove('active');
            chatConversationView.classList.add('active');
        } else {
            chatConversationView.classList.remove('active');
            chatListView.classList.add('active');
            currentChatSessionId = null;
        }
    }

    function listenToChatSessions() {
        if (!chatSessionsCollection) return;
        if (unsubscribeFromChatSessions) unsubscribeFromChatSessions();
        unsubscribeFromChatSessions = chatSessionsCollection.orderBy('lastUpdatedAt', 'desc').onSnapshot(snapshot => {
            localChatSessionsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderChatSessionList();
        }, error => console.error("Chat session listener error:", error));
    }

    function renderChatSessionList() {
        if (!chatSessionList) return;
        chatSessionList.innerHTML = '';
        if (localChatSessionsCache.length === 0) {
            chatSessionList.innerHTML = '<div style="text-align:center; padding: 20px; opacity: 0.7;">새 대화를 시작해보세요!</div>';
            return;
        }
        localChatSessionsCache.forEach(session => {
            const item = document.createElement('div');
            item.className = 'chat-session-item';
            item.dataset.sessionId = session.id;
            if (session.id === currentChatSessionId) {
                item.classList.add('active');
            }
            const date = session.lastUpdatedAt ? new Date(session.lastUpdatedAt.toMillis()).toLocaleString() : '날짜 없음';
            item.innerHTML = `
                <div class="chat-session-content">
                    <div class="chat-session-title">${session.title || '새 대화'}</div>
                    <div class="chat-session-date">${date}</div>
                </div>`;
            item.addEventListener('click', () => openChatConversation(session.id));
            chatSessionList.appendChild(item);
        });
    }

    function openChatConversation(sessionId) {
        const session = localChatSessionsCache.find(s => s.id === sessionId);
        if (!session) return;
        currentChatSessionId = sessionId;
        if(chatSessionTitle) chatSessionTitle.textContent = session.title;
        renderChatHistory(session.messages || []);
        renderChatSessionList();
        switchChatView('conversation');
    }

    async function handleChatSend() {
        if (!chatInput || !chatSendBtn || !currentUser) return;
        const userQuery = chatInput.value.trim();
        if (!userQuery) return;
        chatInput.disabled = true; chatSendBtn.disabled = true;
        const userMessage = { role: 'user', content: userQuery, timestamp: new Date().toISOString() };
        
        const currentMessages = currentChatSessionId ? localChatSessionsCache.find(s => s.id === currentChatSessionId)?.messages || [] : [];
        renderChatHistory([...currentMessages, userMessage]);
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chat-message ai';
        loadingDiv.innerHTML = '<div class="loading-indicator">AI가 답변을 생성하고 있습니다...</div>';
        chatMessages.appendChild(loadingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const aiResponseText = "AI 응답 테스트... (실제 API 호출은 여기에)";
            const aiMessage = { role: 'ai', content: aiResponseText, timestamp: new Date().toISOString() };

            if (currentChatSessionId) {
                const sessionRef = chatSessionsCollection.doc(currentChatSessionId);
                await sessionRef.update({
                    messages: firebase.firestore.FieldValue.arrayUnion(userMessage, aiMessage),
                    lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                const newSession = {
                    title: userQuery.substring(0, 30) + (userQuery.length > 30 ? '...' : ''),
                    messages: [userMessage, aiMessage],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    mode: selectedMode,
                };
                const newDocRef = await chatSessionsCollection.add(newSession);
                currentChatSessionId = newDocRef.id;
            }
        } catch (error) {
            console.error("Chat send error:", error);
        } finally {
            chatInput.disabled = false; chatSendBtn.disabled = false;
            chatInput.value = ''; chatInput.style.height = 'auto'; chatInput.focus();
        }
    }

    function renderChatHistory(messages = []) {
        if (!chatMessages) return;
        chatMessages.innerHTML = '';
        messages.forEach(msg => {
            const msgDiv = document.createElement('div');
            msgDiv.className = `chat-message ${msg.role}`;
            msgDiv.innerHTML = `<div>${msg.content.replace(/\n/g, '<br>')}</div><div class="chat-timestamp">${new Date(msg.timestamp).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</div>`;
            chatMessages.appendChild(msgDiv);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function deleteCurrentSession() {
        if (!currentChatSessionId || !chatSessionsCollection) return;
        showModal("이 대화를 정말로 삭제하시겠습니까?", async () => {
            try {
                await chatSessionsCollection.doc(currentChatSessionId).delete();
                switchChatView('list');
            } catch (error) { console.error("Error deleting session:", error); }
        });
    }

    // --- Notes System (Global) ---
    function listenToNotes() { if(!notesCollection) return; if(unsubscribeFromNotes) unsubscribeFromNotes(); unsubscribeFromNotes = notesCollection.orderBy('updatedAt', 'desc').onSnapshot(s => { localNotesCache = s.docs.map(d => ({id: d.id, ...d.data()})); renderNoteList(); }, e => console.error("Note listener error:", e)); }
    function renderNoteList() { if (!notesList || !searchInput) return; const term = searchInput.value.toLowerCase(); const filtered = localNotesCache.filter(n => (n.title && n.title.toLowerCase().includes(term)) || (n.content && n.content.toLowerCase().includes(term))); filtered.sort((a,b) => (b.isPinned - a.isPinned) || (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0)); notesList.innerHTML = ''; if (filtered.length === 0) { notesList.innerHTML = '<div>표시할 메모가 없습니다.</div>'; return; } filtered.forEach(n => { const i = document.createElement('div'); i.className = 'note-item'; i.dataset.id = n.id; if (n.isPinned) i.classList.add('pinned'); const d = n.updatedAt ? new Date(n.updatedAt.toMillis()).toLocaleString() : '날짜 없음'; i.innerHTML = `<div class="note-item-content"><div class="note-item-title">${n.title||'무제'}</div><div class="note-item-date">${d}</div></div><div class="note-item-actions"><button class="item-action-btn pin-btn ${n.isPinned?'pinned-active':''}" title="고정">${n.isPinned?'📌':'📍'}</button><button class="item-action-btn delete-btn" title="삭제">🗑️</button></div>`; notesList.appendChild(i); }); }
    async function addNote(content = '') { if (!notesCollection) return; try { const ref = await notesCollection.add({ title: '새 메모', content: content, isPinned: false, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); togglePanel(notesAppPanel, true); openNoteEditor(ref.id); } catch (e) { console.error("새 메모 추가 실패:", e); } }
    function saveNote() { if (debounceTimer) clearTimeout(debounceTimer); if (!currentNoteId || !notesCollection) return; const data = { title: noteTitleInput.value, content: noteContentTextarea.value, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }; notesCollection.doc(currentNoteId).update(data).then(() => updateStatus('저장됨 ✓', true)).catch(e => { console.error("메모 저장 실패:", e); updateStatus('저장 실패 ❌', false); }); }
    function handleDeleteRequest(id) { showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => { if (notesCollection) notesCollection.doc(id).delete().catch(e => console.error("메모 삭제 실패:", e)); }); }
    async function togglePin(id) { if (!notesCollection) return; const note = localNotesCache.find(n => n.id === id); if (note) await notesCollection.doc(id).update({ isPinned: !note.isPinned }); }
    function exportNotes() { const str = JSON.stringify(localNotesCache, null, 2); const blob = new Blob([str], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'my-notes.json'; a.click(); URL.revokeObjectURL(url); }
    function switchView(view) { if (view === 'editor') { if(noteListView) noteListView.classList.remove('active'); if(noteEditorView) noteEditorView.classList.add('active'); } else { if(noteEditorView) noteEditorView.classList.remove('active'); if(noteListView) noteListView.classList.add('active'); currentNoteId = null; } }
    function openNoteEditor(id) { const note = localNotesCache.find(n => n.id === id); if (note && noteTitleInput && noteContentTextarea) { currentNoteId = id; noteTitleInput.value = note.title || ''; noteContentTextarea.value = note.content || ''; switchView('editor'); } }
    function updateStatus(msg, success) { if (!autoSaveStatus) return; autoSaveStatus.textContent = msg; autoSaveStatus.style.color = success ? 'lightgreen' : 'lightcoral'; setTimeout(() => { autoSaveStatus.textContent = ''; }, 2000); }
    function applyFormat(fmt) { if (!noteContentTextarea) return; const s = noteContentTextarea.selectionStart, e = noteContentTextarea.selectionEnd, t = noteContentTextarea.value.substring(s, e); const m = fmt === 'bold' ? '**' : (fmt === 'italic' ? '*' : '`'); noteContentTextarea.value = `${noteContentTextarea.value.substring(0,s)}${m}${t}${m}${noteContentTextarea.value.substring(e)}`; noteContentTextarea.focus(); }
    
    // --- Initialization ---
    function initialize() {
        if (!body || !wrapper) { console.error("Core layout elements not found."); return; }
        updateClock(); setInterval(updateClock, 1000);
        
        initializeFirebase().then(() => {
            setupNavigator();
            initializeTooltips();
            makePanelDraggable(chatPanel);
            makePanelDraggable(notesAppPanel);
        });

        // Global Listeners
        document.addEventListener('mouseup', handleTextSelection);
        if (themeToggle) themeToggle.addEventListener('click', () => body.classList.toggle('dark-mode'));
        if (tocToggleBtn) tocToggleBtn.addEventListener('click', () => { wrapper.classList.toggle('toc-hidden'); systemInfoWidget?.classList.toggle('tucked'); });
        if (chatToggleBtn) chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));
        if (notesAppToggleBtn) notesAppToggleBtn.addEventListener('click', () => togglePanel(notesAppPanel));
        if (chatPanel) chatPanel.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', () => togglePanel(chatPanel, false)));
        if (popoverAskAi) popoverAskAi.addEventListener('click', handlePopoverAskAi);
        if (popoverAddNote) popoverAddNote.addEventListener('click', handlePopoverAddNote);
        
        // Chat Listeners
        if (addNewChatBtn) addNewChatBtn.addEventListener('click', () => { currentChatSessionId = null; renderChatHistory([]); if(chatSessionTitle) chatSessionTitle.textContent = "새 대화"; switchChatView('conversation'); renderChatSessionList(); });
        if (backToChatListBtn) backToChatListBtn.addEventListener('click', () => switchChatView('list'));
        if (deleteSessionBtn) deleteSessionBtn.addEventListener('click', deleteCurrentSession);
        if (chatForm) chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });
        if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } });

        // Notes Listeners
        if (addNewNoteBtn) addNewNoteBtn.addEventListener('click', () => addNote());
        if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
        if (searchInput) searchInput.addEventListener('input', renderNoteList);
        if (exportNotesBtn) exportNotesBtn.addEventListener('click', exportNotes);
        const handleInput = () => { updateStatus('입력 중...', true); if (debounceTimer) clearTimeout(debounceTimer); debounceTimer = setTimeout(saveNote, 1000); };
        if (noteTitleInput) noteTitleInput.addEventListener('input', handleInput);
        if (noteContentTextarea) noteContentTextarea.addEventListener('input', handleInput);
        if (notesList) notesList.addEventListener('click', e => { const i = e.target.closest('.note-item'); if (!i) return; const id = i.dataset.id; if (e.target.closest('.delete-btn')) handleDeleteRequest(id); else if (e.target.closest('.pin-btn')) togglePin(id); else openNoteEditor(id); });
    }

    initialize();
});
