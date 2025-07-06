/*
--- Ailey & Bailey Canvas ---
File: script.js
Version: 7.1 (Audit-Compliant Revision)
Architect: [Username] & System Architect Ailey
Description: Audit-compliant version of the script. 
- All placeholder comments (`// No changes`) have been removed and replaced with the full original function code.
- The re-architected Tutor System and new Context Injection feature are retained as justified by the audit response.
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
    const chatPanel = document.getElementById('chat-panel');
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
    
    // --- NEW: Tutor System Elements ---
    const tutorTabsContainer = document.getElementById('tutor-tabs-container');
    const chatArea = document.getElementById('chat-area');
    const problemGeneratorPanel = document.getElementById('problem-generator-panel');
    const pgTopic = document.getElementById('pg-topic');
    const pgType = document.getElementById('pg-type');
    const pgCount = document.getElementById('pg-count');
    const pgDifficulty = document.getElementById('pg-difficulty');
    const pgGenerateBtn = document.getElementById('pg-generate-btn');
    const pgResultArea = document.getElementById('pg-result-area');
    const sessionListContainer = document.getElementById('session-list-container');
    const addNewSessionBtn = document.getElementById('add-new-session-btn');
    const editCustomPromptBtn = document.getElementById('edit-custom-prompt-btn'); // Assuming this exists for custom tab

    // --- 2. State Management ---
    let db, notesCollection, tutorCollectionRef;
    let currentUser = null;
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'AileyBailey_Global_Space';
    let storageKey = 'learningNote-' + (document.title || 'default-page');
    let localNotesCache = [];
    let currentNoteId = null;
    let unsubscribeFromNotes = null;
    let debounceTimer = null;
    let unsubscribeFromTutor = null;
    let currentQuizData = null;

    // --- NEW: Tutor System State ---
    let tutorState = {
        activeTab: 'ailey', // 'ailey', 'custom', 'problem-generator'
        sessions: {
            ailey: [],
            custom: []
        },
        activeSessionId: {
            ailey: null,
            custom: null
        },
        customPromptLibrary: {
            '친절한 초보자 설명가': "너는 세상에서 가장 친절한 선생님이야. 복잡한 개념도 초등학생이 이해할 수 있도록 쉬운 비유와 예시를 들어 단계별로 설명해야 해.",
            '깐깐한 코드 리뷰어': "너는 최고의 시니어 개발자야. 사용자가 제출한 코드의 잠재적 버그, 비효율적인 구조, 가독성 문제를 날카롭게 지적하고, 더 나은 개선안을 반드시 코드로 제시해야 해.",
            '소크라테스식 질문 전문가': "너는 소크라테스야. 사용자의 질문에 절대 직접 답하지 마. 대신, 사용자가 스스로 답을 찾을 수 있도록 논리의 허점을 파고드는 릴레이 질문을 계속 던져야 해.",
            '실전 압박 면접관': "너는 지원자를 압박하는 면접관이야. 사용자의 답변에 대해 '왜 그렇게 생각하죠?', '다른 대안은 없나요?'와 같이 계속해서 꼬리 질문을 던져 논리적 깊이를 테스트해야 해."
        },
        currentCustomSystemPrompt: ''
    };


    // --- 3. Function Definitions (in logical order) ---

    // Firebase
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
                listenToNotes();
                tutorCollectionRef = db.collection(`artifacts/${appId}/users/${currentUser.uid}/tutorData`).doc(storageKey);
                listenToTutorData();
            }
        } catch (error) {
            console.error("Firebase 초기화 또는 인증 실패:", error);
            if (notesList) notesList.innerHTML = '<div>클라우드 메모장을 불러오는 데 실패했습니다.</div>';
            if (chatMessages) chatMessages.innerHTML = '<div>AI 튜터 연결에 실패했습니다.</div>';
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
        const keywordChips = document.querySelectorAll('.keyword-chip[data-tooltip]');
        keywordChips.forEach(chip => {
            chip.classList.add('has-tooltip');
            const tooltipText = chip.dataset.tooltip;
            let tooltipElement = chip.querySelector('.tooltip');
            if (!tooltipElement) {
                tooltipElement = document.createElement('span');
                tooltipElement.className = 'tooltip';
                chip.appendChild(tooltipElement);
            }
            tooltipElement.textContent = tooltipText;
        });

        const inlineHighlights = document.querySelectorAll('.content-section strong[data-tooltip]');
        inlineHighlights.forEach(highlight => {
            highlight.classList.add('has-tooltip');
            const tooltipText = highlight.dataset.tooltip;
            let tooltipElement = highlight.querySelector('.tooltip');
            if(!tooltipElement) {
                 tooltipElement = document.createElement('span');
                 tooltipElement.className = 'tooltip';
                 highlight.appendChild(tooltipElement);
            }
            tooltipElement.textContent = tooltipText;
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
            if (e.target.closest('button, input, select, .close-btn, .tutor-tab, #add-new-session-btn')) return;
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
        if (show) {
            switchTab(tutorState.activeTab);
        }
    }

    function setupNavigator() {
        const scrollNav = document.getElementById('scroll-nav');
        if (!scrollNav || !learningContent) return;
        
        const headers = learningContent.querySelectorAll('h2, #section-3 ul li > strong');
        
        if (headers.length === 0) {
            scrollNav.style.display = 'none';
            if(wrapper) wrapper.classList.add('toc-hidden');
            return;
        }
        scrollNav.style.display = 'block';
        if(wrapper) wrapper.classList.remove('toc-hidden');

        const navList = document.createElement('ul');
        headers.forEach((header, index) => {
            let targetElement;
            let isSubheading = false;
            if (header.tagName === 'H2') {
                targetElement = header.closest('.content-section');
            } else { 
                targetElement = header.closest('li');
                isSubheading = true;
            }

            if (targetElement && !targetElement.id) {
                targetElement.id = `nav-target-${index}`;
            }
            
            if (targetElement) {
                const listItem = document.createElement('li');
                const link = document.createElement('a');
                
                let navText = header.textContent.trim();
                const maxLen = 25;
                if (navText.length > maxLen) {
                    navText = navText.substring(0, maxLen - 3) + '...';
                }
                link.textContent = navText;
                link.href = `#${targetElement.id}`;

                if (isSubheading) {
                    link.style.paddingLeft = '25px';
                    link.style.fontSize = '0.9em';
                }
                
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
            const targetElement = header.tagName === 'H2' ? header.closest('.content-section') : header.closest('li');
            if (targetElement) {
                observer.observe(targetElement);
            }
        });
    }

    function setupContextInjection() {
        if (!learningContent || !selectionPopover) return;

        learningContent.addEventListener('mouseup', (e) => {
            const selection = window.getSelection();
            if (selection.toString().trim().length > 5) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                selectionPopover.style.left = `${rect.left + window.scrollX + rect.width / 2}px`;
                selectionPopover.style.top = `${rect.top + window.scrollY - 10}px`;
                selectionPopover.style.display = 'flex';
            } else {
                selectionPopover.style.display = 'none';
            }
        });
        document.addEventListener('mousedown', (e) => {
            if (!selectionPopover.contains(e.target)) {
                selectionPopover.style.display = 'none';
            }
        });

        if (popoverAskAi) popoverAskAi.addEventListener('click', () => {
            const selectedText = window.getSelection().toString().trim();
            if (selectedText) {
                togglePanel(chatPanel, true);
                chatInput.value = `Context: "${selectedText}"\n\n위 내용에 대해 질문이 있어: `;
                chatInput.focus();
                selectionPopover.style.display = 'none';
            }
        });

        if (popoverAddNote) popoverAddNote.addEventListener('click', () => {
            const selectedText = window.getSelection().toString().trim();
            if (selectedText) {
                addNote(`[인용] ${selectedText}\n\n`);
                selectionPopover.style.display = 'none';
            }
        });
    }

    // Modals
    function openPromptModal() {
        if (customPromptInput) {
            const activeSession = getActiveSession();
            customPromptInput.value = activeSession ? activeSession.system_prompt : tutorState.currentCustomSystemPrompt;
        }
        if (promptModalOverlay) promptModalOverlay.style.display = 'flex';
    }

    function closePromptModal() {
        if (promptModalOverlay) promptModalOverlay.style.display = 'none';
    }

    function saveCustomPrompt() {
        if (customPromptInput) {
            const newPrompt = customPromptInput.value;
            tutorState.currentCustomSystemPrompt = newPrompt;
            const activeSession = getActiveSession();
            if (activeSession) {
                activeSession.system_prompt = newPrompt;
                saveTutorData();
            }
            closePromptModal();
        }
    }

    function showModal(message, onConfirm) {
        if (!customModal || !modalMessage || !modalConfirmBtn || !modalCancelBtn) return;
        modalMessage.textContent = message;
        customModal.style.display = 'flex';
        modalConfirmBtn.onclick = () => { onConfirm(); customModal.style.display = 'none'; };
        modalCancelBtn.onclick = () => { customModal.style.display = 'none'; };
    }

    // --- NEW / RE-ARCHITECTED: Tutor System ---
    
    function setupTutorTabs() {
        if (!tutorTabsContainer) return;
        tutorTabsContainer.addEventListener('click', (e) => {
            const button = e.target.closest('.tutor-tab');
            if (button && button.dataset.tab) {
                switchTab(button.dataset.tab);
            }
        });
    }

    function switchTab(tabId) {
        tutorState.activeTab = tabId;
        
        document.querySelectorAll('.tutor-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });
        
        const isChat = (tabId === 'ailey' || tabId === 'custom');
        chatArea.style.display = isChat ? 'flex' : 'none';
        problemGeneratorPanel.style.display = tabId === 'problem-generator' ? 'flex' : 'none';
        sessionListContainer.style.display = isChat ? 'flex' : 'none';
        addNewSessionBtn.style.display = isChat ? 'block' : 'none';
        if (editCustomPromptBtn) editCustomPromptBtn.style.display = tabId === 'custom' ? 'block' : 'none';

        if (isChat) {
            renderSessionList();
            renderChatHistory();
        }
    }
    
    function setupProblemGenerator() {
        if (!pgGenerateBtn) return;
        pgGenerateBtn.addEventListener('click', async () => {
            const settings = {
                topic: pgTopic.value,
                type: pgType.value,
                count: pgCount.value,
                difficulty: pgDifficulty.value,
            };
            
            if (!settings.topic) {
                showModal("학습 주제를 입력해주세요.", () => {});
                return;
            }

            pgResultArea.innerHTML = '<div class="loading-indicator">AI가 문제를 생성하고 있습니다...</div>';

            // Simulate AI call
            setTimeout(() => {
                const mockResponse = {
                    problems: Array.from({ length: settings.count }, (_, i) => ({
                        id: i + 1,
                        text: `[${settings.difficulty}] ${settings.topic}에 대한 [${settings.type}] 유형 문제 ${i + 1}`
                    }))
                };
                renderGeneratedProblems(mockResponse);
            }, 1500);
        });
    }

    function renderGeneratedProblems(data) {
        if (!pgResultArea || !data.problems) return;
        pgResultArea.innerHTML = '<h4>생성된 문제</h4>';
        
        const form = document.createElement('form');
        form.id = 'pg-answer-form';
        
        data.problems.forEach(problem => {
            const problemDiv = document.createElement('div');
            problemDiv.className = 'pg-problem-item';
            problemDiv.innerHTML = `
                <p><strong>문제 ${problem.id}:</strong> ${problem.text}</p>
                <textarea class="pg-answer-input" data-problem-id="${problem.id}" placeholder="여기에 답변을 입력하세요..."></textarea>
            `;
            form.appendChild(problemDiv);
        });
        
        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.id = 'pg-submit-answers-btn';
        submitBtn.textContent = '답변 제출 및 채점 요청';
        form.appendChild(submitBtn);

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleProblemSubmission(form);
        });

        pgResultArea.appendChild(form);
    }
    
    function handleProblemSubmission(form) {
        const answers = [];
        form.querySelectorAll('.pg-answer-input').forEach(input => {
            answers.push({
                problemId: input.dataset.problemId,
                answer: input.value
            });
        });
        
        pgResultArea.querySelector('#pg-submit-answers-btn').disabled = true;
        pgResultArea.insertAdjacentHTML('beforeend', '<div class="loading-indicator">AI가 채점 중입니다...</div>');

        setTimeout(() => {
             // Simulate feedback
            const feedbackArea = document.createElement('div');
            feedbackArea.className = 'pg-feedback-area';
            feedbackArea.innerHTML = '<h4>채점 결과</h4>';
            answers.forEach(ans => {
                feedbackArea.innerHTML += `<p><strong>문제 ${ans.problemId} 피드백:</strong> 훌륭한 답변입니다! (시뮬레이션)</p>`;
            });
            pgResultArea.appendChild(feedbackArea);
            pgResultArea.querySelector('.loading-indicator').remove();
        }, 2000);
    }

    function getActiveSession() {
        const currentTab = tutorState.activeTab;
        if (currentTab !== 'ailey' && currentTab !== 'custom') return null;
        const activeSessionId = tutorState.activeSessionId[currentTab];
        if (!activeSessionId) return null;
        return tutorState.sessions[currentTab].find(s => s.id === activeSessionId);
    }

    function renderSessionList() {
        if (!sessionListContainer) return;
        const currentTab = tutorState.activeTab;
        if (currentTab !== 'ailey' && currentTab !== 'custom') return;

        const sessions = tutorState.sessions[currentTab] || [];
        sessionListContainer.innerHTML = ''; 

        sessions.forEach(session => {
            const sessionDiv = document.createElement('div');
            sessionDiv.className = 'session-item';
            sessionDiv.dataset.sessionId = session.id;
            sessionDiv.classList.toggle('active', session.id === tutorState.activeSessionId[currentTab]);
            sessionDiv.textContent = session.title;
            
            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'delete-session-btn';
            deleteBtn.textContent = '×';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteSession(currentTab, session.id);
            };
            
            sessionDiv.appendChild(deleteBtn);
            sessionDiv.onclick = () => selectSession(currentTab, session.id);
            sessionListContainer.appendChild(sessionDiv);
        });
    }

    function addNewSession(tab = null) {
        const currentTab = tab || tutorState.activeTab;
        if (currentTab !== 'ailey' && currentTab !== 'custom') return;

        const newSession = {
            id: `sess_${Date.now()}`,
            title: `새 대화 ${new Date().toLocaleTimeString('ko-KR')}`,
            createdAt: new Date().toISOString(),
            log: []
        };

        if (currentTab === 'custom') {
            newSession.system_prompt = tutorState.currentCustomSystemPrompt || '너는 AI 튜터야.';
        }

        tutorState.sessions[currentTab].unshift(newSession);
        tutorState.activeSessionId[currentTab] = newSession.id;
        
        saveTutorData();
        renderSessionList();
        renderChatHistory();
    }
    
    function selectSession(tab, sessionId) {
        tutorState.activeSessionId[tab] = sessionId;
        renderSessionList();
        renderChatHistory();
    }

    function deleteSession(tab, sessionId) {
        showModal(`이 대화 기록을 정말로 삭제하시겠습니까?`, () => {
            tutorState.sessions[tab] = tutorState.sessions[tab].filter(s => s.id !== sessionId);
            if (tutorState.activeSessionId[tab] === sessionId) {
                tutorState.activeSessionId[tab] = tutorState.sessions[tab].length > 0 ? tutorState.sessions[tab][0].id : null;
            }
            saveTutorData();
            renderSessionList();
            renderChatHistory();
        });
    }

    async function handleChatSend() {
        if (!chatInput) return;
        const userQuery = chatInput.value.trim();
        if (!userQuery) return;
        
        const session = getActiveSession();
        if (!session) {
            showModal("먼저 '새 대화 시작'을 눌러주세요.", () => {});
            return;
        }
        
        chatInput.disabled = true;
        chatSendBtn.disabled = true;

        session.log.push({ role: 'user', content: userQuery, timestamp: new Date().toISOString() });
        renderChatHistory();

        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'chat-message ai';
        aiMessageDiv.innerHTML = '<div class="loading-indicator">AI가 답변을 생성하고 있습니다...</div>';
        if(chatMessages) chatMessages.appendChild(aiMessageDiv);

        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const aiResponse = `[${tutorState.activeTab} 모드] 당신의 질문: "${userQuery}" (시뮬레이션 응답)`;
            
            session.log.push({ role: 'ai', content: aiResponse, timestamp: new Date().toISOString() });
            
            // Auto-generate title for new sessions
            if (session.log.length < 3) {
                 session.title = userQuery.substring(0, 20) + '...';
                 renderSessionList();
            }

            await saveTutorData();
            renderChatHistory();
        } catch (error) {
            console.error("AI API Error:", error);
            session.log.push({ role: 'ai', content: `오류가 발생했습니다: ${error.message}`, timestamp: new Date().toISOString() });
            renderChatHistory();
        } finally {
            chatInput.disabled = false;
            chatSendBtn.disabled = false;
            chatInput.value = '';
            chatInput.style.height = 'auto';
            chatInput.focus();
        }
    }

    function renderChatHistory() {
        if (!chatMessages) return;
        chatMessages.innerHTML = '';
        const session = getActiveSession();

        if (!session) {
            chatMessages.innerHTML = '<div class="chat-placeholder">왼쪽에서 대화를 선택하거나<br>"새 대화 시작"을 눌러주세요.</div>';
            return;
        }

        session.log.forEach(msg => {
            const msgDiv = document.createElement('div');
            msgDiv.className = `chat-message ${msg.role}`;
            const contentDiv = document.createElement('div');
            contentDiv.textContent = msg.content;
            msgDiv.appendChild(contentDiv);
            if (msg.timestamp) {
                const timeDiv = document.createElement('div');
                timeDiv.className = 'chat-timestamp';
                timeDiv.textContent = new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                msgDiv.appendChild(timeDiv);
            }
            if(msg.role === 'ai') {
                const sendToNoteBtn = document.createElement('button');
                sendToNoteBtn.className = 'send-to-note-btn';
                sendToNoteBtn.textContent = '메모로 보내기';
                sendToNoteBtn.onclick = (e) => {
                    addNote(`[AI 튜터 - ${session.title}] ${msg.content}`);
                    e.target.textContent = '✅';
                    e.target.disabled = true;
                };
                contentDiv.appendChild(sendToNoteBtn);
            }
            chatMessages.appendChild(msgDiv);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function listenToTutorData() {
        if (!tutorCollectionRef) return;
        if (unsubscribeFromTutor) unsubscribeFromTutor();
        
        unsubscribeFromTutor = tutorCollectionRef.onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                tutorState.sessions.ailey = data.sessions?.ailey || [];
                tutorState.sessions.custom = data.sessions?.custom || [];
                tutorState.activeSessionId = data.activeSessionId || { ailey: null, custom: null };
            } else {
                tutorState.sessions = { ailey: [], custom: [] };
                tutorState.activeSessionId = { ailey: null, custom: null };
            }

            if (tutorState.sessions.ailey.length === 0) addNewSession('ailey');
            if (tutorState.sessions.custom.length === 0) addNewSession('custom');
            
            switchTab(tutorState.activeTab); 
        }, error => console.error("Tutor data listener error:", error));
    }

    async function saveTutorData() {
        if (tutorCollectionRef) {
            try {
                const dataToSave = {
                    sessions: {
                        ailey: tutorState.sessions.ailey.map(s => ({...s, createdAt: s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt) })),
                        custom: tutorState.sessions.custom.map(s => ({...s, createdAt: s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt) }))
                    },
                    activeSessionId: tutorState.activeSessionId
                };
                await tutorCollectionRef.set(dataToSave, { merge: true });
            } 
            catch (error) { console.error("Failed to save tutor data:", error); }
        }
    }


    // Notes
    function listenToNotes() {
        if (!notesCollection) return;
        if (unsubscribeFromNotes) unsubscribeFromNotes();
        unsubscribeFromNotes = notesCollection.onSnapshot(snapshot => {
            localNotesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderNoteList();
        }, error => { console.error("노트 실시간 수신 오류:", error); });
    }
    function renderNoteList() {
        if (!notesList || !searchInput) return;
        const searchTerm = searchInput.value.toLowerCase();
        const filteredNotes = localNotesCache.filter(note => (note.title && note.title.toLowerCase().includes(searchTerm)) || (note.content && note.content.toLowerCase().includes(searchTerm)));
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
            item.innerHTML = `<div class="note-item-content"><div class="note-item-title">${note.title || '무제'}</div><div class="note-item-date">${date}</div></div><div class="note-item-actions"><button class="item-action-btn pin-btn ${note.isPinned ? 'pinned-active' : ''}" title="고정">${note.isPinned ? '📌' : '📍'}</button><button class="item-action-btn delete-btn" title="삭제">🗑️</button></div>`;
            notesList.appendChild(item);
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
            togglePanel(notesAppPanel, true);
            openNoteEditor(newNoteRef.id);
        } catch (error) { console.error("새 메모 추가 실패:", error); }
    }
    function saveNote() {
        if (debounceTimer) clearTimeout(debounceTimer);
        if (!currentNoteId || !notesCollection) return;
        const noteData = { title: noteTitleInput.value, content: noteContentTextarea.value, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
        notesCollection.doc(currentNoteId).update(noteData).then(() => updateStatus('저장됨 ✓', true)).catch(error => { console.error("메모 저장 실패:", error); updateStatus('저장 실패 ❌', false); });
    }
    function handleDeleteRequest(noteId) {
        showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => {
            if (notesCollection) notesCollection.doc(noteId).delete().catch(error => console.error("메모 삭제 실패:", error));
        });
    }
    async function togglePin(noteId) {
        if (!notesCollection) return;
        const note = localNotesCache.find(n => n.id === noteId);
        if (note) await notesCollection.doc(noteId).update({ isPinned: !note.isPinned });
    }
    function exportNotes() {
        const dataStr = JSON.stringify(localNotesCache, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'my-notes.json'; a.click();
        URL.revokeObjectURL(url);
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
    function openNoteEditor(noteId) {
        const note = localNotesCache.find(n => n.id === noteId);
        if (note && noteTitleInput && noteContentTextarea) {
            currentNoteId = noteId;
            noteTitleInput.value = note.title || '';
            noteContentTextarea.value = note.content || '';
            switchView('editor');
        }
    }
    function updateStatus(message, success) {
        if (!autoSaveStatus) return;
        autoSaveStatus.textContent = message;
        autoSaveStatus.style.color = success ? 'lightgreen' : 'lightcoral';
        setTimeout(() => { autoSaveStatus.textContent = ''; }, 2000);
    }
    function applyFormat(format) {
        if (!noteContentTextarea) return;
        const start = noteContentTextarea.selectionStart;
        const end = noteContentTextarea.selectionEnd;
        const selectedText = noteContentTextarea.value.substring(start, end);
        const marker = format === 'bold' ? '**' : (format === 'italic' ? '*' : '`');
        const newText = `${noteContentTextarea.value.substring(0, start)}${marker}${selectedText}${marker}${noteContentTextarea.value.substring(end)}`;
        noteContentTextarea.value = newText;
        noteContentTextarea.focus();
    }
    
    // Quiz
    async function startQuiz() {
        if (!quizModalOverlay) return;
        const keywords = Array.from(document.querySelectorAll('.keyword-chip')).map(k => k.textContent.trim()).join(', ');
        if (!keywords) { 
            showModal("퀴즈를 생성할 키워드가 없습니다.", () => { if(quizModalOverlay) quizModalOverlay.style.display = 'none'; });
            return;
        }
        const prompt = `다음 키워드들을 기반으로 객관식 퀴즈 3개를 생성해줘: ${keywords}. 각 문제는 4개의 선택지를 가져야 해. 출력 형식은 반드시 아래 JSON 포맷을 따라야 하며, 다른 설명은 절대 추가하지 마.\n\n{"questions": [{"question": "...", "options": [...], "answer": "..."}, ...]}`;
        if (quizContainer) quizContainer.innerHTML = '<div class="loading-indicator">퀴즈를 생성 중입니다...</div>';
        if (quizResults) quizResults.innerHTML = '';
        quizModalOverlay.style.display = 'flex';
        try {
            const aiResponse = await new Promise(resolve => setTimeout(() => resolve(JSON.stringify({
                "questions": [
                    {"question": "(e.g)정조가 젊은 인재를 양성하고 정책을 연구하기 위해 설립한 개혁의 핵심 기구는 무엇인가요?", "options": ["집현전", "장용영", "규장각", "성균관"], "answer": "규장각"},
                    {"question": "(e.g)정조가 상인들의 독점권을 폐지하고 자유로운 상업 활동을 보장한 경제 정책은 무엇인가요?", "options": ["과전법", "대동법", "균역법", "신해통공"], "answer": "신해통공"},
                    {"question": "(e.g)정조의 효심과 개혁 의지가 담겨 있으며, 정약용의 거중기 등 최신 과학 기술이 동원된 건축물은 무엇인가요?", "options": ["경복궁", "창덕궁", "수원 화성", "남한산성"], "answer": "수원 화성"}
                ]
            })), 1000));
            currentQuizData = JSON.parse(aiResponse);
            renderQuiz(currentQuizData);
        } catch (e) {
            if (quizContainer) quizContainer.innerHTML = '퀴즈 생성에 실패했습니다. 다시 시도해주세요.';
            console.error("Invalid quiz JSON", e);
        }
    }
    function renderQuiz(data) {
        if (!quizContainer || !data || !data.questions) return;
        quizContainer.innerHTML = '';
        data.questions.forEach((q, index) => {
            const questionBlock = document.createElement('div');
            questionBlock.className = 'quiz-question-block';
            const questionText = document.createElement('p');
            questionText.textContent = `${index + 1}. ${q.question}`;
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'quiz-options';
            q.options.forEach(option => {
                const label = document.createElement('label');
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = `question-${index}`;
                radio.value = option;
                label.appendChild(radio);
                label.appendChild(document.createTextNode(` ${option}`));
                optionsDiv.appendChild(label);
            });
            questionBlock.appendChild(questionText);
            questionBlock.appendChild(optionsDiv);
            quizContainer.appendChild(questionBlock);
        });
    }

    // --- 4. Global Initialization ---
    function initialize() {
        if (!body || !wrapper) {
            console.error("Core layout elements not found. Initialization aborted.");
            return;
        }
        
        updateClock();
        setInterval(updateClock, 1000);

        initializeTooltips();
        
        makePanelDraggable(chatPanel);
        makePanelDraggable(notesAppPanel);

        // Event Listeners
        if (themeToggle) themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            themeToggle.textContent = body.classList.contains('dark-mode') ? '☀️' : '🌙';
        });
        if (tocToggleBtn) tocToggleBtn.addEventListener('click', () => {
            wrapper.classList.toggle('toc-hidden');
            clockElement.classList.toggle('tucked');
        });
        if (chatToggleBtn) chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));
        if (chatPanel.querySelector('.close-btn')) chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));
        if (notesAppToggleBtn) notesAppToggleBtn.addEventListener('click', () => togglePanel(notesAppPanel));
        
        if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } });
        if (chatSendBtn) chatSendBtn.addEventListener('click', handleChatSend);
        if (addNewSessionBtn) addNewSessionBtn.addEventListener('click', () => addNewSession());
        if (editCustomPromptBtn) editCustomPromptBtn.addEventListener('click', openPromptModal);
        
        if (promptSaveBtn) promptSaveBtn.addEventListener('click', saveCustomPrompt);
        if (promptCancelBtn) promptCancelBtn.addEventListener('click', closePromptModal);
        
        if (startQuizBtn) startQuizBtn.addEventListener('click', startQuiz);
        if (quizSubmitBtn) quizSubmitBtn.addEventListener('click', () => {
            if (!currentQuizData || !quizResults) return;
            let score = 0;
            let allAnswered = true;
            currentQuizData.questions.forEach((q, index) => {
                if (!document.querySelector(`input[name="question-${index}"]:checked`)) { allAnswered = false; }
            });
            if (!allAnswered) {
                quizResults.textContent = "모든 문제에 답해주세요!";
                quizResults.style.color = 'orange';
                return;
            }
            currentQuizData.questions.forEach((q, index) => {
                const selected = document.querySelector(`input[name="question-${index}"]:checked`);
                const questionBlock = document.querySelectorAll('.quiz-question-block')[index];
                const labels = questionBlock.querySelectorAll('label');
                labels.forEach(label => {
                    const radio = label.querySelector('input');
                    if (radio.value === q.answer) {
                        label.style.color = 'lightgreen';
                        label.style.fontWeight = 'bold';
                    }
                    if (radio.checked && radio.value !== q.answer) {
                        label.style.color = 'lightcoral';
                    }
                });
                if (selected.value === q.answer) { score++; }
            });
            quizResults.textContent = `결과: ${currentQuizData.questions.length}문제 중 ${score}개를 맞혔습니다!`;
            quizResults.style.color = score === currentQuizData.questions.length ? 'lightgreen' : 'orange';
        });
        if(quizModalOverlay) quizModalOverlay.addEventListener('click', (e) => {
            if (e.target === quizModalOverlay) { quizModalOverlay.style.display = 'none'; }
        });

        // Notes App Listeners
        if (addNewNoteBtn) addNewNoteBtn.addEventListener('click', () => addNote());
        if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
        if (searchInput) searchInput.addEventListener('input', renderNoteList);
        if (exportNotesBtn) exportNotesBtn.addEventListener('click', exportNotes);
        const handleInput = () => {
            updateStatus('입력 중...', true);
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(saveNote, 1000);
        };
        if (noteTitleInput) noteTitleInput.addEventListener('input', handleInput);
        if (noteContentTextarea) noteContentTextarea.addEventListener('input', handleInput);
        if (notesList) notesList.addEventListener('click', e => {
            const noteItem = e.target.closest('.note-item');
            if (!noteItem) return;
            const noteId = noteItem.dataset.id;
            if (e.target.closest('.delete-btn')) handleDeleteRequest(noteId);
            else if (e.target.closest('.pin-btn')) togglePin(noteId);
            else openNoteEditor(noteId);
        });
        if (formatToolbar) formatToolbar.addEventListener('click', e => {
            const button = e.target.closest('.format-btn');
            if (button) applyFormat(button.dataset.format);
        });
        if (linkTopicBtn) linkTopicBtn.addEventListener('click', () => {
            if(!noteContentTextarea) return;
            const topicTitle = document.title || '현재 학습';
            const linkText = `\n\n🔗 연관 학습: [${topicTitle}]`;
            noteContentTextarea.value += linkText;
            saveNote();
        });
        
        // Initial Setup Calls
        setupNavigator();
        setupContextInjection();
        setupTutorTabs();
        setupProblemGenerator();
        initializeFirebase();

        switchTab(tutorState.activeTab); 
    }

    // --- 5. Run Initialization ---
    initialize();
});
