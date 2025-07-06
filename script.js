/*
--- Ailey & Bailey Canvas ---
File: script.js
Version: 7.4 (Final Architecture - Per-Canvas Persistence & ID Display)
Architect: [Username] & System Architect Ailey
Description: Completed the core architectural upgrade. The script now reads the unique Canvas ID and User UID to establish fully independent cloud storage paths for notes and chat. Dynamically populates the new System Info Widget with ID display, copy functionality, and a detailed hover tooltip.
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

    // --- 2. State Management ---
    const canvasId = document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id';
    let db, notesCollection, chatCollectionRef;
    let currentUser = null;
    const appId = 'AileyBailey_Global_Space'; // Simplified App ID
    let localNotesCache = [];
    let currentNoteId = null;
    let unsubscribeFromNotes = null;
    let debounceTimer = null;
    let lastSelectedText = '';

    // --- CHAT STATE ---
    let chatHistories = { ailey_coaching: [], deep_learning: [], custom: [] };
    let selectedMode = 'ailey_coaching';
    let chatQuizState = 'idle';
    let lastQuestion = '';
    let customPrompt = localStorage.getItem('customTutorPrompt') || '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.';
    let unsubscribeFromChat = null;
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
                // [CRITICAL] Set up data paths using the unique Canvas ID
                notesCollection = db.collection(`artifacts/${appId}/users/${currentUser.uid}/canvases/${canvasId}/notes`);
                chatCollectionRef = db.collection(`artifacts/${appId}/users/${currentUser.uid}/chatHistories`).doc(canvasId);
                
                listenToNotes();
                listenToChatHistory();
                setupSystemInfoWidget(); // Setup widget after getting user info
            }
        } catch (error) {
            console.error("Firebase 초기화 또는 인증 실패:", error);
            if (notesList) notesList.innerHTML = '<div>클라우드 메모장을 불러오는 데 실패했습니다.</div>';
            if (chatMessages) chatMessages.innerHTML = '<div>AI 러닝메이트 연결에 실패했습니다.</div>';
        }
    }

    // UI & Utilities
    function updateClock() {
        const clockElement = document.getElementById('real-time-clock');
        if (!clockElement) return;
        const now = new Date();
        const options = { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
        clockElement.textContent = now.toLocaleString('ko-KR', options);
    }
    
    function setupSystemInfoWidget() {
        if (!systemInfoWidget || !currentUser) return;

        // Display abbreviated Canvas ID
        const canvasIdDisplay = document.getElementById('canvas-id-display');
        if (canvasIdDisplay) {
            canvasIdDisplay.textContent = canvasId.substring(0, 8) + '...';
        }

        // Setup copy button
        const copyBtn = document.getElementById('copy-canvas-id');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(canvasId).then(() => {
                    copyBtn.textContent = '✅';
                    setTimeout(() => { copyBtn.textContent = '📋'; }, 1500);
                });
            });
        }
        
        // Create and append the detailed tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'system-tooltip';
        tooltip.innerHTML = `
            <div><strong>Canvas ID:</strong> ${canvasId}</div>
            <div><strong>User ID:</strong> ${currentUser.uid}</div>
        `;
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
        const onMouseMove = (e) => { if (isDragging) { panelElement.style.left = (e.clientX + offset.x) + 'px'; panelElement.style.top = (e.clientY + offset.y) + 'px'; } };
        const onMouseUp = () => { isDragging = false; panelElement.classList.remove('is-dragging'); document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
        header.addEventListener('mousedown', e => {
            if (e.target.closest('button, input, .close-btn, #delete-history-btn, #chat-mode-selector')) return;
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

    function setupNavigator() {
        const scrollNav = document.getElementById('scroll-nav');
        if (!scrollNav || !learningContent) return;
        const headers = learningContent.querySelectorAll('h2, #section-4 h3, #section-5 h3, #section-6 h3');
        if (headers.length === 0) { scrollNav.style.display = 'none'; if(wrapper) wrapper.classList.add('toc-hidden'); return; }
        scrollNav.style.display = 'block'; if(wrapper) wrapper.classList.remove('toc-hidden');
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
                link.textContent = navText; link.href = `#${targetElement.id}`;
                listItem.appendChild(link); navList.appendChild(listItem);
            }
        });
        scrollNav.innerHTML = '<h3>학습 내비게이션</h3>'; scrollNav.appendChild(navList);
        const links = scrollNav.querySelectorAll('a');
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const id = entry.target.getAttribute('id');
                const navLink = scrollNav.querySelector(`a[href="#${id}"]`);
                if (navLink && entry.isIntersecting && entry.intersectionRatio > 0.5) {
                    links.forEach(l => l.classList.remove('active')); navLink.classList.add('active');
                }
            });
        }, { rootMargin: "0px 0px -70% 0px", threshold: 0.6 });
        headers.forEach(header => { const target = header.closest('.content-section'); if (target) observer.observe(target); });
    }
    
    function handleTextSelection(e) {
        if (e.target.closest('.draggable-panel, #selection-popover, .fixed-tool-container, #system-info-widget')) return;
        const selection = window.getSelection(); const selectedText = selection.toString().trim();
        if (selectedText.length > 3) {
            lastSelectedText = selectedText; const range = selection.getRangeAt(0); const rect = range.getBoundingClientRect();
            const popover = selectionPopover; let top = rect.top + window.scrollY - popover.offsetHeight - 10; let left = rect.left + window.scrollX + (rect.width / 2) - (popover.offsetWidth / 2);
            if (top < window.scrollY) top = rect.bottom + window.scrollY + 10;
            if (left < 0) left = 5;
            if (left + popover.offsetWidth > window.innerWidth) left = window.innerWidth - popover.offsetWidth - 5;
            popover.style.top = `${top}px`; popover.style.left = `${left}px`; popover.style.display = 'flex';
        } else { if (!e.target.closest('#selection-popover')) selectionPopover.style.display = 'none'; }
    }
    
    // All other functions (handlePopoverAskAi, handlePopoverAddNote, Modals, Chat, Notes, Quiz, etc.) remain largely the same.
    // They now implicitly use the correctly scoped `notesCollection` and `chatCollectionRef`.
    function handlePopoverAskAi() { if (!lastSelectedText || !chatInput) return; togglePanel(chatPanel, true); chatInput.value = `"${lastSelectedText}"\n\n이 내용에 대해 더 자세히 설명해줄래?`; chatInput.style.height = 'auto'; chatInput.style.height = (chatInput.scrollHeight) + 'px'; chatInput.focus(); selectionPopover.style.display = 'none'; }
    function handlePopoverAddNote() { if (!lastSelectedText) return; addNote(`> ${lastSelectedText}\n\n`); selectionPopover.style.display = 'none'; }
    function openPromptModal() { if (customPromptInput) customPromptInput.value = customPrompt; if (promptModalOverlay) promptModalOverlay.style.display = 'flex'; }
    function closePromptModal() { if (promptModalOverlay) promptModalOverlay.style.display = 'none'; }
    function saveCustomPrompt() { if (customPromptInput) { customPrompt = customPromptInput.value; localStorage.setItem('customTutorPrompt', customPrompt); closePromptModal(); } }
    function showModal(message, onConfirm) { if (!customModal || !modalMessage || !modalConfirmBtn || !modalCancelBtn) return; modalMessage.textContent = message; customModal.style.display = 'flex'; modalConfirmBtn.onclick = () => { onConfirm(); customModal.style.display = 'none'; }; modalCancelBtn.onclick = () => { customModal.style.display = 'none'; }; }
    function generateTutorPrompt(mode, query) { const tone = "너는 지금부터 친한 친구에게 말하는 것처럼, 반드시 친근한 반말(informal Korean)으로만 대화해야 해. '안녕하세요' 같은 존댓말은 절대 사용하면 안 돼."; let p = ""; switch(mode) { case 'ailey_coaching': p=`[M-CHAT-AILEY] 모드. 질문:"${query}"`; break; case 'deep_learning': p = chatQuizState==='idle' ? `[M-CHAT-QUIZ] Phase 1. 주제:"${query}"` : `[M-CHAT-QUIZ] Phase 2. 문제:"${lastQuestion}", 답변:"${query}"`; break; case 'custom': p=`[M-CHAT-CUSTOM] 모드. 프롬프트:"${customPrompt}", 질문:"${query}"`; break; } return `${p}\n\n${tone}`; }
    async function handleChatSend() { if (!chatInput || !chatSendBtn) return; const q = chatInput.value.trim(); if (!q) return; chatInput.disabled = true; chatSendBtn.disabled = true; const h = chatHistories[selectedMode] || []; h.push({ role: 'user', content: q, timestamp: new Date().toISOString() }); renderChatHistory(selectedMode); const loadingDiv = document.createElement('div'); loadingDiv.className = 'chat-message ai'; loadingDiv.innerHTML = '<div class="loading-indicator">AI가 답변을 생성하고 있습니다...</div>'; if(chatMessages) { chatMessages.appendChild(loadingDiv); chatMessages.scrollTop = chatMessages.scrollHeight; } try { const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: generateTutorPrompt(selectedMode, q) }] }] }) }); if (!res.ok) throw new Error(`${res.status}`); const result = await res.json(); let aiRes = "답변 생성 중 오류... 😥"; if (result.candidates?.[0].content.parts[0]) aiRes = result.candidates[0].content.parts[0].text; if (selectedMode === 'deep_learning') { if (chatQuizState === 'idle' && aiRes.startsWith('[PROBLEM_GENERATED]')) { chatQuizState = 'awaiting_answer'; lastQuestion = aiRes.replace('[PROBLEM_GENERATED]', '').trim(); } else if (chatQuizState === 'awaiting_answer') { chatQuizState = 'idle'; lastQuestion = ''; } } h.push({ role: 'ai', content: aiRes, timestamp: new Date().toISOString() }); await saveChatHistory(); } catch (e) { h.push({ role: 'ai', content: `API 오류가 발생했습니다: ${e.message}`, timestamp: new Date().toISOString() }); await saveChatHistory(); } finally { chatInput.disabled = false; chatSendBtn.disabled = false; chatInput.value = ''; chatInput.style.height = 'auto'; chatInput.focus(); } }
    function renderChatHistory(mode) { if (!chatMessages) return; chatMessages.innerHTML = ''; const h = chatHistories[mode] || []; h.forEach(msg => { const d = document.createElement('div'); d.className = `chat-message ${msg.role}`; let c = msg.content; if (c.startsWith('[PROBLEM_GENERATED]')) { d.classList.add('quiz-problem'); c = c.replace('[PROBLEM_GENERATED]', '').trim(); } else if (c.startsWith('[CORRECT]')) { d.classList.add('quiz-solution', 'correct'); const h = document.createElement('div'); h.className = 'solution-header correct'; h.textContent = '✅ 정답입니다!'; d.appendChild(h); c = c.replace('[CORRECT]', '').trim(); } else if (c.startsWith('[INCORRECT]')) { d.classList.add('quiz-solution', 'incorrect'); const h = document.createElement('div'); h.className = 'solution-header incorrect'; h.textContent = '❌ 오답입니다.'; d.appendChild(h); c = c.replace('[INCORRECT]', '').trim(); } const cd = document.createElement('div'); cd.innerHTML = c.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'); d.appendChild(cd); if (msg.timestamp) { const t = document.createElement('div'); t.className = 'chat-timestamp'; t.textContent = new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit' }); d.appendChild(t); } if(msg.role === 'ai') { const b = document.createElement('button'); b.className = 'send-to-note-btn'; b.textContent = '메모로 보내기'; b.onclick = e => { addNote(`[AI 러닝메이트] ${cd.textContent}`); e.target.textContent = '✅'; e.target.disabled = true; }; cd.appendChild(b); } chatMessages.appendChild(d); }); chatMessages.scrollTop = chatMessages.scrollHeight; }
    async function listenToChatHistory() { if (!chatCollectionRef) return; if (unsubscribeFromChat) unsubscribeFromChat(); unsubscribeFromChat = chatCollectionRef.onSnapshot(doc => { const d = { ailey_coaching: [], deep_learning: [], custom: [] }; chatHistories = doc.exists ? { ...d, ...doc.data() } : d; renderChatHistory(selectedMode); }, e => console.error("Chat history listener error:", e)); }
    async function saveChatHistory() { if (chatCollectionRef) { try { await chatCollectionRef.set(chatHistories); } catch (e) { console.error("Failed to save chat history:", e); } } }
    function setupChatModeSelector() { if (!chatModeSelector) return; chatModeSelector.innerHTML = ''; const modes = [{id:'ailey_coaching',t:'기본 코칭 💬'},{id:'deep_learning',t:'심화 학습 🧠'},{id:'custom',t:'커스텀 ⚙️'}]; modes.forEach(m => { const b = document.createElement('button'); b.dataset.mode = m.id; b.innerHTML = m.t; if (m.id === selectedMode) b.classList.add('active'); b.addEventListener('click', () => { selectedMode = m.id; chatQuizState = 'idle'; lastQuestion = ''; chatModeSelector.querySelectorAll('button').forEach(btn => btn.classList.remove('active')); b.classList.add('active'); if (selectedMode === 'custom') openPromptModal(); renderChatHistory(selectedMode); }); chatModeSelector.appendChild(b); }); }
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
        if (tocToggleBtn) tocToggleBtn.addEventListener('click', () => systemInfoWidget?.classList.toggle('tucked'));
        if (chatToggleBtn) chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));
        if (chatPanel) chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));
        if (notesAppToggleBtn) notesAppToggleBtn.addEventListener('click', () => togglePanel(notesAppPanel));
        if (chatForm) chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });
        if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } });
        if (deleteHistoryBtn) deleteHistoryBtn.addEventListener('click', () => { const m = {'ailey_coaching':'기본 코칭','deep_learning':'심화 학습','custom':'커스텀'}; showModal(`'${m[selectedMode]}' 모드 기록 삭제?`, async () => { if(chatHistories[selectedMode]) { chatHistories[selectedMode] = []; await saveChatHistory(); } }); });
        if (promptSaveBtn) promptSaveBtn.addEventListener('click', saveCustomPrompt);
        if (promptCancelBtn) promptCancelBtn.addEventListener('click', closePromptModal);
        if (startQuizBtn) startQuizBtn.addEventListener('click', startQuiz);
        if (quizSubmitBtn) quizSubmitBtn.addEventListener('click', () => { if (!currentQuizData || !quizResults) return; let score = 0, allAnswered = true; currentQuizData.questions.forEach((q, i) => { if (!document.querySelector(`input[name="q-${i}"]:checked`)) allAnswered = false; }); if (!allAnswered) { quizResults.textContent = "모든 문제에 답해주세요!"; return; } currentQuizData.questions.forEach((q, i) => { const s = document.querySelector(`input[name="q-${i}"]:checked`); if(s.value === q.a) score++; }); quizResults.textContent = `결과: ${currentQuizData.questions.length} 중 ${score} 정답!`; });
        if(quizModalOverlay) quizModalOverlay.addEventListener('click', e => { if (e.target === quizModalOverlay) quizModalOverlay.style.display = 'none'; });
        if (addNewNoteBtn) addNewNoteBtn.addEventListener('click', () => addNote());
        if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
        if (searchInput) searchInput.addEventListener('input', renderNoteList);
        if (exportNotesBtn) exportNotesBtn.addEventListener('click', exportNotes);
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
