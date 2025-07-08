    // --- [RE-ARCHITECTED] Chat Send Logic with JSON Stream Normalizer ---
    async function handleChatSend() {
        if (isStreaming) {
            streamController?.abort();
            isStreaming = false;
            chatInput.disabled = false;
            return;
        }

        const query = chatInput.value.trim();
        if (!query) return;

        isStreaming = true;
        chatInput.value = '';
        chatInput.style.height = 'auto';
        chatSendBtn.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M9,9V15H15V9H9Z" /></svg>`;
        chatSendBtn.title = "생성 중단";
        chatInput.disabled = true;
        streamController = new AbortController();

        const userMessage = { role: 'user', content: query, timestamp: new Date() };
        let sessionRef;

        // Render user message immediately
        if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
        if (chatMessages) chatMessages.style.display = 'flex';
        const userMessageDiv = document.createElement('div');
        userMessageDiv.className = 'chat-message user';
        userMessageDiv.textContent = userMessage.content;
        chatMessages.appendChild(userMessageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        if (!currentSessionId) {
            const activeProject = document.querySelector('.project-header.active-drop-target');
            const newSessionProjectId = activeProject ? activeProject.closest('.project-container').dataset.projectId : null;
            const newSessionData = {
                title: query.substring(0, 40) + (query.length > 40 ? '...' : ''),
                messages: [userMessage],
                mode: selectedMode,
                projectId: newSessionProjectId,
                isPinned: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            sessionRef = await chatSessionsCollectionRef.add(newSessionData);
            currentSessionId = sessionRef.id;
            selectSession(currentSessionId, false);
        } else {
            sessionRef = chatSessionsCollectionRef.doc(currentSessionId);
            await sessionRef.update({ messages: firebase.firestore.FieldValue.arrayUnion(userMessage) });
        }

        try {
            const isCustomApi = userApiSettings.provider && userApiSettings.apiKey && userApiSettings.selectedModel;
            const historyForApi = (localChatSessionsCache.find(s => s.id === currentSessionId)?.messages || [userMessage]);
            
            let apiEndpoint, apiOptions;
            if (isCustomApi) {
                const requestDetails = buildApiRequest(userApiSettings.provider, userApiSettings.selectedModel, historyForApi, userApiSettings.maxOutputTokens, true);
                apiEndpoint = requestDetails.url;
                apiOptions = { ...requestDetails.options, signal: streamController.signal };
            } else {
                const selectedDefaultModel = localStorage.getItem('selectedAiModel') || defaultModel;
                const promptWithReasoning = `You are Ailey. Your response MUST follow this strict sequence for real-time streaming: 1. Output a "[REASONING_START]" tag. 2. Stream your entire thought process in natural language. 3. Output a "[REASONING_END]" tag. 4. Stream your final, friendly, informal Korean answer. For simple queries (like greetings), omit the reasoning part entirely and just provide the answer. Query: "${query}"`;
                const apiMessages = [{ role: 'user', parts: [{ text: promptWithReasoning }] }];
                apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${selectedDefaultModel}:streamGenerateContent?key=`;
                apiOptions = {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: apiMessages }),
                    signal: streamController.signal
                };
            }
            
            const response = await fetch(apiEndpoint, apiOptions);
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API Error ${response.status}: ${errorBody}`);
            }
            
            const fullResponse = await streamToDom(response.body, isCustomApi);
            const aiMessageToSave = { role: 'ai', content: fullResponse, timestamp: new Date() };
            await sessionRef.update({
                messages: firebase.firestore.FieldValue.arrayUnion(aiMessageToSave),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Stream aborted by user.');
            } else {
                console.error("Chat send/stream error:", error);
                const errorDiv = document.createElement('div');
                errorDiv.className = 'chat-message ai';
                errorDiv.textContent = `오류가 발생했습니다: ${error.message}`;
                chatMessages.appendChild(errorDiv);
            }
        } finally {
            isStreaming = false;
            chatInput.disabled = false;
            chatSendBtn.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" /></svg>`;
            chatSendBtn.title = "전송";
            chatInput.focus();
        }
    }

    async function streamToDom(stream, isCustomApi) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponseText = '';
        let streamingState = 'IDLE'; // IDLE, REASONING, ANSWER
        let reasoningEl, answerEl;

        const processText = (text) => {
            if (!text) return;
            
            if (streamingState === 'IDLE') {
                if (text.includes('[REASONING_START]')) {
                    streamingState = 'REASONING';
                    const [_, reasoningContainer, rEl] = createReasoningBlock();
                    reasoningEl = rEl;
                    text = text.split('[REASONING_START]')[1] || '';
                } else {
                    streamingState = 'ANSWER';
                    const [_, aEl] = createFinalAnswerBlock();
                    answerEl = aEl;
                }
            }

            if (streamingState === 'REASONING') {
                if (text.includes('[REASONING_END]')) {
                    const parts = text.split('[REASONING_END]');
                    reasoningEl.textContent += parts[0];
                    reasoningEl.classList.remove('blinking-cursor');
                    streamingState = 'ANSWER';
                    const [_, aEl] = createFinalAnswerBlock(reasoningEl.closest('.ai-response-container'));
                    answerEl = aEl;
                    answerEl.innerHTML += (parts[1] || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                } else {
                    reasoningEl.textContent += text;
                }
            } else if (streamingState === 'ANSWER') {
                answerEl.innerHTML += text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
            }
            
            chatMessages.scrollTop = chatMessages.scrollHeight;
            fullResponseText += text;
        };
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            if (isCustomApi) { // For simple text streams like OpenAI
                processText(buffer);
                buffer = '';
            } else { // For line-delimited JSON streams like Gemini
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep the last, possibly incomplete, line

                for (const line of lines) {
                    if (line.trim().startsWith(',')) continue; // Skip empty/comma lines
                    try {
                        const parsed = JSON.parse(line);
                        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                        processText(text);
                    } catch (e) {
                        console.warn('Could not parse JSON line, skipping:', line);
                    }
                }
            }
        }

        // Process any remaining text in the buffer
        if (buffer && isCustomApi) {
            processText(buffer);
        }

        if (reasoningEl) reasoningEl.classList.remove('blinking-cursor');
        if (answerEl) answerEl.classList.remove('blinking-cursor');

        return fullResponseText;
    }

    function createReasoningBlock() {
        const aiContainer = document.createElement('div');
        aiContainer.className = 'ai-response-container';

        const rBlock = document.createElement('div');
        rBlock.className = 'reasoning-block';
        
        rBlock.innerHTML = `
            <div class="reasoning-header">
                <span class="toggle-icon">▶</span>
                <span class="reasoning-summary">AI의 추론 과정...</span>
            </div>
            <div class="reasoning-content blinking-cursor"></div>
        `;

        const rContentEl = rBlock.querySelector('.reasoning-content');
        aiContainer.appendChild(rBlock);
        chatMessages.appendChild(aiContainer);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        const header = rBlock.querySelector('.reasoning-header');
        header.addEventListener('click', () => {
            rBlock.classList.toggle('expanded');
            rContentEl.classList.toggle('expanded');
        });

        return [aiContainer, rBlock, rContentEl];
    }
    
    function createFinalAnswerBlock(existingContainer = null) {
        let container = existingContainer;
        if (!container) {
            container = document.createElement('div');
            container.className = 'ai-response-container';
            chatMessages.appendChild(container);
        }

        const answerEl = document.createElement('div');
        answerEl.className = 'chat-message ai blinking-cursor';
        container.appendChild(answerEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        return [container, answerEl];
    }
    
    function buildApiRequest(provider, model, messages, maxTokens, stream = false) {
        const history = messages.map(msg => ({ role: msg.role === 'ai' ? 'assistant' : 'user', content: msg.content }));
        const body = { model, messages, max_tokens: Number(maxTokens) || 2048, stream };

        if (provider === 'openai') {
            return { url: 'https://api.openai.com/v1/chat/completions', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userApiSettings.apiKey}` }, body: JSON.stringify(body) } };
        } else if (provider === 'anthropic') {
             if (stream) console.warn("Anthropic streaming is not fully implemented with this generic handler.");
             return { url: 'https://api.anthropic.com/v1/messages', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': userApiSettings.apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ ...body, stream: stream }) } };
        } else if (provider === 'google_paid') {
            const googleHistory = messages.map(msg => ({ role: msg.role === 'ai' ? 'model' : 'user', parts: [{ text: msg.content }] }));
            const endpoint = stream ? 'streamGenerateContent' : 'generateContent';
            return { url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}?key=${userApiSettings.apiKey}`, options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: googleHistory, generationConfig: { maxOutputTokens: Number(maxTokens) || 2048 } }) } };
        }
        throw new Error(`Unsupported provider: ${provider}`);
    }

    function renderChatMessages(sessionData) {
        if (!chatMessages || !sessionData || !sessionData.messages) return;
        
        chatMessages.innerHTML = '';
        const messages = sessionData.messages;
    
        messages.forEach((msg) => {
            if (msg.role === 'user') {
                const d = document.createElement('div');
                d.className = `chat-message user`;
                d.textContent = msg.content;
                chatMessages.appendChild(d);
    
            } else if (msg.role === 'ai') {
                const aiContainer = document.createElement('div');
                aiContainer.className = 'ai-response-container';
    
                const content = msg.content;
                const reasoningRegex = /\[REASONING_START\]([\s\S]*?)\[REASONING_END\]/;
                const match = content.match(reasoningRegex);
    
                if (match) {
                    const reasoningRaw = match[1];
                    const finalAnswer = content.replace(reasoningRegex, '').trim();
    
                    const rBlock = document.createElement('div');
                    rBlock.className = 'reasoning-block';
                    rBlock.innerHTML = `
                        <div class="reasoning-header">
                            <span class="toggle-icon">▶</span>
                            <span>AI의 추론 과정...</span>
                        </div>
                        <div class="reasoning-content">${reasoningRaw}</div>
                    `;
                    const rContentEl = rBlock.querySelector('.reasoning-content');
                    rBlock.querySelector('.reasoning-header').addEventListener('click', () => {
                        rBlock.classList.toggle('expanded');
                        rContentEl.classList.toggle('expanded');
                    });
                    aiContainer.appendChild(rBlock);
    
                    if (finalAnswer) {
                        const finalAnswerDiv = document.createElement('div');
                        finalAnswerDiv.className = 'chat-message ai';
                        finalAnswerDiv.innerHTML = finalAnswer.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                        aiContainer.appendChild(finalAnswerDiv);
                    }
                } else {
                    const d = document.createElement('div');
                    d.className = 'chat-message ai';
                    d.innerHTML = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                    aiContainer.appendChild(d);
                }
    
                if (msg.duration) {
                    const metaDiv = document.createElement('div');
                    metaDiv.className = 'ai-response-meta';
                    metaDiv.innerHTML = `
                        <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" /></svg>
                        <span>응답 생성: ${msg.duration}초</span>
                    `;
                    aiContainer.appendChild(metaDiv);
                }
    
                chatMessages.appendChild(aiContainer);
            }
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function setupChatModeSelector() { if (!chatModeSelector) return; chatModeSelector.innerHTML = ''; const modes = [{ id: 'ailey_coaching', t: '기본 코칭', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M20,16H5.17L4,17.17V4H20V16Z" /></svg>' }, { id: 'deep_learning', t: '심화 학습', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4M12,14A4,4 0 0,1 8,10H10A2,2 0 0,0 12,12A2,2 0 0,0 14,10H16A4,4 0 0,1 12,14M7.5,15.6C8.8,17.2 10.3,18 12,18C13.7,18 15.2,17.2 16.5,15.6C15.2,14.8 13.7,14 12,14C10.3,14 8.8,14.8 7.5,15.6Z" /></svg>' }, { id: 'custom', t: '커스텀', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>' }]; modes.forEach(m => { const b = document.createElement('button'); b.dataset.mode = m.id; b.innerHTML = `${m.i}<span>${m.t}</span>`; if (m.id === selectedMode) b.classList.add('active'); b.addEventListener('click', () => { selectedMode = m.id; chatModeSelector.querySelectorAll('button').forEach(btn => btn.classList.remove('active')); b.classList.add('active'); if (selectedMode === 'custom') openPromptModal(); }); chatModeSelector.appendChild(b); }); }

    // --- System Reset, Backup, Restore ---
    async function handleSystemReset() {
        const message = "정말로 이 캔버스의 모든 프로젝트, 채팅, 메모 기록을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.";
        showModal(message, async () => {
            if (!db || !currentUser) { alert("초기화 실패: DB 연결을 확인해주세요."); return; }
            updateStatus("시스템 초기화 중...", true);
            const batch = db.batch();
            try {
                const notesSnapshot = await notesCollection.get();
                notesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
                const chatsSnapshot = await chatSessionsCollectionRef.get();
                chatsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
                const projectsSnapshot = await projectsCollectionRef.get();
                projectsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                
                localStorage.removeItem('userApiSettings');
                localStorage.removeItem('selectedAiModel');

                alert("✅ 모든 데이터가 성공적으로 삭제되었습니다. 페이지를 새로고침하여 시스템을 다시 시작합니다.");
                location.reload();
            } catch (error) { console.error("❌ 시스템 초기화 실패:", error); alert(`시스템 초기화 중 오류가 발생했습니다: ${error.message}`); updateStatus("초기화 실패 ❌", false); }
        });
    }
    function exportAllData() { if (localNotesCache.length === 0 && localChatSessionsCache.length === 0 && localProjectsCache.length === 0) { showModal("백업할 데이터가 없습니다.", () => {}); return; } const processTimestamp = (item) => { const newItem = { ...item }; if (newItem.createdAt?.toDate) newItem.createdAt = newItem.createdAt.toDate().toISOString(); if (newItem.updatedAt?.toDate) newItem.updatedAt = newItem.updatedAt.toDate().toISOString(); if (Array.isArray(newItem.messages)) { newItem.messages = newItem.messages.map(msg => { const newMsg = { ...msg }; if (newMsg.timestamp?.toDate) newMsg.timestamp = newMsg.timestamp.toDate().toISOString(); return newMsg; }); } return newItem; }; const dataToExport = { backupVersion: '2.0', backupDate: new Date().toISOString(), notes: localNotesCache.map(processTimestamp), chatSessions: localChatSessionsCache.map(processTimestamp), projects: localProjectsCache.map(processTimestamp) }; const str = JSON.stringify(dataToExport, null, 2); const blob = new Blob([str], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `ailey-canvas-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url); }
    function handleRestoreClick() { if (fileImporter) fileImporter.click(); }
    async function importAllData(event) {
        const file = event.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if (data.backupVersion !== '2.0') { throw new Error("호환되지 않는 백업 파일 버전입니다."); }
                const message = `파일에서 ${data.projects?.length||0}개의 프로젝트, ${data.chatSessions?.length||0}개의 채팅, ${data.notes?.length||0}개의 메모를 발견했습니다. 현재 데이터를 덮어씁니다. 계속하시겠습니까?`;
                showModal(message, async () => {
                    try {
                        updateStatus('복원 중...', true);
                        const batch = db.batch();
                        const toFirestoreTimestamp = ts => ts ? firebase.firestore.Timestamp.fromDate(new Date(ts)) : firebase.firestore.FieldValue.serverTimestamp();
                        (data.notes || []).forEach(note => { const { id, ...dataToWrite } = note; dataToWrite.createdAt = toFirestoreTimestamp(note.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(note.updatedAt); batch.set(notesCollection.doc(id), dataToWrite); });
                        (data.chatSessions || []).forEach(session => { const { id, ...dataToWrite } = session; dataToWrite.createdAt = toFirestoreTimestamp(session.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(session.updatedAt); if(dataToWrite.messages) dataToWrite.messages.forEach(m=>m.timestamp=toFirestoreTimestamp(m.timestamp)); batch.set(chatSessionsCollectionRef.doc(id), dataToWrite); });
                        (data.projects || []).forEach(project => { const { id, ...dataToWrite } = project; dataToWrite.createdAt = toFirestoreTimestamp(project.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(project.updatedAt); batch.set(projectsCollectionRef.doc(id), dataToWrite); });
                        await batch.commit();
                        updateStatus('복원 완료 ✓', true);
                        showModal("데이터 복원이 완료되었습니다. 페이지를 새로고침합니다.", () => location.reload());
                    } catch (error) { console.error("데이터 복원 실패:", error); updateStatus('복원 실패 ❌', false); showModal(`데이터 복원 중 오류: ${error.message}`, () => {}); }
                });
            } catch (error) { console.error("File parsing error:", error); showModal(`파일 읽기 오류: ${error.message}`, () => {}); }
            finally { event.target.value = null; }
        };
        reader.readAsText(file);
    }
    
    // --- Utilities, Notes, and Other Functions ---
    function updateClock() { const clockElement = document.getElementById('real-time-clock'); if (!clockElement) return; const now = new Date(); const options = { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }; clockElement.textContent = now.toLocaleString('ko-KR', options); }
    function setupSystemInfoWidget() { if (!systemInfoWidget || !currentUser) return; const canvasIdDisplay = document.getElementById('canvas-id-display'); if (canvasIdDisplay) { canvasIdDisplay.textContent = canvasId.substring(0, 8) + '...'; } const copyBtn = document.getElementById('copy-canvas-id'); if (copyBtn) { copyBtn.addEventListener('click', () => { navigator.clipboard.writeText(canvasId).then(() => { copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" /></svg>'; setTimeout(() => { copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" /></svg>'; }, 1500); }); }); } const tooltip = document.createElement('div'); tooltip.className = 'system-tooltip'; tooltip.innerHTML = `<div><strong>Canvas ID:</strong> ${canvasId}</div><div><strong>User ID:</strong> ${currentUser.uid}</div>`; systemInfoWidget.appendChild(tooltip); }
    function initializeTooltips() { document.querySelectorAll('.keyword-chip[data-tooltip]').forEach(chip => { if (chip.querySelector('.tooltip')) { chip.classList.add('has-tooltip'); chip.querySelector('.tooltip').textContent = chip.dataset.tooltip; } }); document.querySelectorAll('.content-section strong[data-tooltip]').forEach(highlight => { if(!highlight.querySelector('.tooltip')) { highlight.classList.add('has-tooltip'); const tooltipElement = document.createElement('span'); tooltipElement.className = 'tooltip'; tooltipElement.textContent = highlight.dataset.tooltip; highlight.appendChild(tooltipElement); } }); }
    function makePanelDraggable(panelElement) { if(!panelElement) return; const header = panelElement.querySelector('.panel-header'); if(!header) return; let isDragging = false, offset = { x: 0, y: 0 }; const onMouseMove = (e) => { if (isDragging) { panelElement.style.left = (e.clientX + offset.x) + 'px'; panelElement.style.top = (e.clientY + offset.y) + 'px'; } }; const onMouseUp = () => { isDragging = false; panelElement.classList.remove('is-dragging'); document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); }; header.addEventListener('mousedown', e => { if (e.target.closest('button, input, select, .close-btn, #delete-session-btn, #chat-mode-selector, #api-settings-btn')) return; isDragging = true; panelElement.classList.add('is-dragging'); offset = { x: panelElement.offsetLeft - e.clientX, y: panelElement.offsetTop - e.clientY }; document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp); }); }
    function togglePanel(panelElement, forceShow = null) { if (!panelElement) return; const show = forceShow !== null ? forceShow : panelElement.style.display !== 'flex'; panelElement.style.display = show ? 'flex' : 'none'; }
    function setupNavigator() { const scrollNav = document.getElementById('scroll-nav'); if (!scrollNav || !learningContent) return; const headers = learningContent.querySelectorAll('h2, #section-4 h3, #section-5 h3, #section-6 h3'); if (headers.length === 0) { scrollNav.style.display = 'none'; if(wrapper) wrapper.classList.add('toc-hidden'); return; } scrollNav.style.display = 'block'; if(wrapper) wrapper.classList.remove('toc-hidden'); const navList = document.createElement('ul'); headers.forEach((header, index) => { let targetElement = header.closest('.content-section'); if (targetElement && !targetElement.id) targetElement.id = `nav-target-${index}`; if (targetElement) { const listItem = document.createElement('li'); const link = document.createElement('a'); let navText = header.textContent.trim().replace(/\[|\]|🤓|⏳|📖/g, '').trim(); link.textContent = navText.substring(0, 25); link.href = `#${targetElement.id}`; if (header.tagName === 'H3') { link.style.paddingLeft = '25px'; link.style.fontSize = '0.9em'; } listItem.appendChild(link); navList.appendChild(listItem); } }); scrollNav.innerHTML = '<h3>학습 내비게이션</h3>'; scrollNav.appendChild(navList); const links = scrollNav.querySelectorAll('a'); const observer = new IntersectionObserver(entries => { entries.forEach(entry => { const id = entry.target.getAttribute('id'); const navLink = scrollNav.querySelector(`a[href="#${id}"]`); if (navLink && entry.isIntersecting && entry.intersectionRatio > 0.5) { links.forEach(l => l.classList.remove('active')); navLink.classList.add('active'); } }); }, { rootMargin: "0px 0px -70% 0px", threshold: 0.6 }); headers.forEach(header => { const target = header.closest('.content-section'); if (target) observer.observe(target); }); }
    function handleTextSelection(e) { if (e.target.closest('.draggable-panel, #selection-popover, .fixed-tool-container, #system-info-widget, .project-context-menu, .session-context-menu')) return; const selection = window.getSelection(); const selectedText = selection.toString().trim(); removeContextMenu(); if (selectedText.length > 3) { lastSelectedText = selectedText; const range = selection.getRangeAt(0); const rect = range.getBoundingClientRect(); const popover = selectionPopover; let top = rect.top + window.scrollY - popover.offsetHeight - 10; let left = rect.left + window.scrollX + (rect.width / 2) - (popover.offsetWidth / 2); popover.style.top = `${top < window.scrollY ? rect.bottom + window.scrollY + 10 : top}px`; popover.style.left = `${Math.max(5, Math.min(left, window.innerWidth - popover.offsetWidth - 5))}px`; popover.style.display = 'flex'; } else if (!e.target.closest('#selection-popover')) { selectionPopover.style.display = 'none'; } }
    function handlePopoverAskAi() { if (!lastSelectedText || !chatInput) return; togglePanel(chatPanel, true); handleNewChat(); setTimeout(() => { chatInput.value = `"${lastSelectedText}"\n\n이 내용에 대해 더 자세히 설명해줄래?`; chatInput.style.height = (chatInput.scrollHeight) + 'px'; chatInput.focus(); }, 100); selectionPopover.style.display = 'none'; }
    function handlePopoverAddNote() { if (!lastSelectedText) return; addNote(`> ${lastSelectedText}\n\n`); selectionPopover.style.display = 'none'; }
    function openPromptModal() { if (customPromptInput) customPromptInput.value = customPrompt; if (promptModalOverlay) promptModalOverlay.style.display = 'flex'; }
    function closePromptModal() { if (promptModalOverlay) promptModalOverlay.style.display = 'none'; }
    function saveCustomPrompt() { if (customPromptInput) { customPrompt = customPromptInput.value; localStorage.setItem('customTutorPrompt', customPrompt); closePromptModal(); } }
    function showModal(message, onConfirm) { if (!customModal || !modalMessage || !modalConfirmBtn || !modalCancelBtn) return; modalMessage.textContent = message; customModal.style.display = 'flex'; modalConfirmBtn.onclick = () => { onConfirm(); customModal.style.display = 'none'; }; modalCancelBtn.onclick = () => { customModal.style.display = 'none'; }; }
    function listenToNotes() { return new Promise(resolve => { if (!notesCollection) return resolve(); if (unsubscribeFromNotes) unsubscribeFromNotes(); unsubscribeFromNotes = notesCollection.orderBy("updatedAt", "desc").onSnapshot(s => { localNotesCache = s.docs.map(d => ({ id: d.id, ...d.data() })); if (document.getElementById('notes-app-panel')?.style.display === 'flex') renderNoteList(); resolve(); }, e => {console.error("노트 수신 오류:", e); resolve();}); }); }
    function renderNoteList() { if (!notesList || !searchInput) return; const term = searchInput.value.toLowerCase(); const filtered = localNotesCache.filter(n => n.title?.toLowerCase().includes(term) || n.content?.toLowerCase().includes(term)); filtered.sort((a,b) => (b.isPinned - a.isPinned) || (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0)); notesList.innerHTML = filtered.length === 0 ? '<div>표시할 메모가 없습니다.</div>' : ''; filtered.forEach(n => { const i = document.createElement('div'); i.className = 'note-item'; i.dataset.id = n.id; if (n.isPinned) i.classList.add('pinned'); i.innerHTML = `<div class="note-item-content"><div class="note-item-title">${n.title||'무제'}</div><div class="note-item-date">${n.updatedAt?.toDate().toLocaleString('ko-KR')||'날짜 없음'}</div></div><div class="note-item-actions"><button class="item-action-btn pin-btn ${n.isPinned?'pinned-active':''}" title="고정"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg></button><button class="item-action-btn delete-btn" title="삭제"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z" /></svg></button></div>`; notesList.appendChild(i); }); }
    async function addNote(content = '') { if (!notesCollection) return; try { const ref = await notesCollection.add({ title: '새 메모', content: content, isPinned: false, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); openNoteEditor(ref.id); } catch (e) { console.error("새 메모 추가 실패:", e); } }
    function saveNote() { if (debounceTimer) clearTimeout(debounceTimer); if (!currentNoteId || !notesCollection) return; const data = { title: noteTitleInput.value, content: noteContentTextarea.value, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }; notesCollection.doc(currentNoteId).update(data).then(() => updateStatus('저장됨 ✓', true)).catch(e => { console.error("메모 저장 실패:", e); updateStatus('저장 실패 ❌', false); }); }
    function handleDeleteRequest(id) { showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => { if (notesCollection) notesCollection.doc(id).delete().catch(e => console.error("메모 삭제 실패:", e)); }); }
    async function togglePin(id) { if (!notesCollection) return; const note = localNotesCache.find(n => n.id === id); if (note) await notesCollection.doc(id).update({ isPinned: !note.isPinned }); }
    function switchView(view) { if (view === 'editor') { if(noteListView) noteListView.classList.remove('active'); if(noteEditorView) noteEditorView.classList.add('active'); } else { if(noteEditorView) noteEditorView.classList.remove('active'); if(noteListView) noteListView.classList.add('active'); currentNoteId = null; } }
    function openNoteEditor(id) { const note = localNotesCache.find(n => n.id === id); if (note && noteTitleInput && noteContentTextarea) { currentNoteId = id; noteTitleInput.value = note.title || ''; noteContentTextarea.value = note.content || ''; switchView('editor'); } }
    function updateStatus(msg, success) { if (!autoSaveStatus) return; autoSaveStatus.textContent = msg; autoSaveStatus.style.color = success ? 'lightgreen' : 'lightcoral'; setTimeout(() => { autoSaveStatus.textContent = ''; }, 3000); }
    function applyFormat(fmt) { if (!noteContentTextarea) return; const s = noteContentTextarea.selectionStart, e = noteContentTextarea.selectionEnd, t = noteContentTextarea.value.substring(s, e); const m = fmt === 'bold' ? '**' : (fmt === 'italic' ? '*' : '`'); noteContentTextarea.value = `${noteContentTextarea.value.substring(0,s)}${m}${t}${m}${noteContentTextarea.value.substring(e)}`; noteContentTextarea.focus(); }
    async function startQuiz() { if (!quizModalOverlay) return; const k = Array.from(document.querySelectorAll('.keyword-chip')).map(c => c.textContent.trim()).join(', '); if (!k) { showModal("퀴즈 생성 키워드가 없습니다.", ()=>{}); return; } if (quizContainer) quizContainer.innerHTML = '<div class="loading-indicator">퀴즈 생성 중...</div>'; if (quizResults) quizResults.innerHTML = ''; quizModalOverlay.style.display = 'flex'; try { const res = await new Promise(r => setTimeout(() => r(JSON.stringify({ "questions": [{"q":"(e.g)...","o":["..."],"a":"..."}]})), 500)); currentQuizData = JSON.parse(res); renderQuiz(currentQuizData); } catch (e) { if(quizContainer) quizContainer.innerHTML = '퀴즈 생성 실패.'; } }
    function renderQuiz(data) { if (!quizContainer || !data.questions) return; quizContainer.innerHTML = ''; data.questions.forEach((q, i) => { const b = document.createElement('div'); b.className = 'quiz-question-block'; const p = document.createElement('p'); p.textContent = `${i + 1}. ${q.q}`; const o = document.createElement('div'); o.className = 'quiz-options'; q.o.forEach(opt => { const l = document.createElement('label'); const r = document.createElement('input'); r.type = 'radio'; r.name = `q-${i}`; r.value = opt; l.append(r,` ${opt}`); o.appendChild(l); }); b.append(p, o); quizContainer.appendChild(b); }); }

    
    // --- API Settings & Dynamic Model Selector Functions ---
    
    function createApiSettingsModal() {
        const modal = document.createElement('div');
        modal.id = 'api-settings-modal-overlay';
        modal.className = 'custom-modal-overlay';
        modal.innerHTML = `
            <div class="custom-modal api-settings-modal">
                <h3><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg> 개인 API 설정 (BYOK)</h3>
                <p class="api-modal-desc">기본 제공되는 모델 외에, 개인 API 키를 사용하여 더 다양하고 강력한 모델을 이용할 수 있습니다.</p>
                <div class="api-form-section">
                    <label for="api-key-input">API 키</label>
                    <div class="api-key-wrapper">
                        <input type="password" id="api-key-input" placeholder="sk-..., sk-ant-..., 또는 Google API 키를 입력하세요">
                        <button id="verify-api-key-btn">키 검증 & 모델 로드</button>
                    </div>
                    <div id="api-key-status"></div>
                </div>
                <div class="api-form-section">
                    <label for="api-model-select">사용 모델</label>
                    <select id="api-model-select" disabled>
                        <option value="">API 키를 먼저 검증해주세요</option>
                    </select>
                </div>
                <div class="api-form-section">
                    <label>토큰 한도 설정</label>
                    <div class="token-limit-wrapper">
                        <input type="number" id="max-output-tokens-input" placeholder="최대 출력 (예: 2048)">
                    </div>
                    <small>모델이 생성할 응답의 최대 길이를 제한합니다. (입력값 없을 시 모델 기본값 사용)</small>
                </div>
                <div class="api-form-section token-usage-section">
                    <label>누적 토큰 사용량 (개인 키)</label>
                    <div id="token-usage-display">
                        <span>입력: 0</span> | <span>출력: 0</span> | <strong>총합: 0</strong>
                    </div>
                    <button id="reset-token-usage-btn">사용량 초기화</button>
                    <small>Google 유료 모델은 응답에 토큰 정보를 포함하지 않아 집계되지 않습니다.</small>
                </div>
                <div class="custom-modal-actions">
                    <button id="api-settings-cancel-btn" class="modal-btn">취소</button>
                    <button id="api-settings-save-btn" class="modal-btn">저장</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        apiSettingsModalOverlay = document.getElementById('api-settings-modal-overlay');
        apiKeyInput = document.getElementById('api-key-input');
        verifyApiKeyBtn = document.getElementById('verify-api-key-btn');
        apiKeyStatus = document.getElementById('api-key-status');
        apiModelSelect = document.getElementById('api-model-select');
        maxOutputTokensInput = document.getElementById('max-output-tokens-input');
        tokenUsageDisplay = document.getElementById('token-usage-display');
        resetTokenUsageBtn = document.getElementById('reset-token-usage-btn');
        apiSettingsSaveBtn = document.getElementById('api-settings-save-btn');
        apiSettingsCancelBtn = document.getElementById('api-settings-cancel-btn');
    }

    function openApiSettingsModal() {
        loadApiSettings();
        apiKeyInput.value = userApiSettings.apiKey;
        maxOutputTokensInput.value = userApiSettings.maxOutputTokens;
        populateModelSelector(userApiSettings.availableModels, userApiSettings.provider, userApiSettings.selectedModel);
        if (userApiSettings.apiKey) {
             apiKeyStatus.textContent = `✅ [${userApiSettings.provider}] 키가 활성화되어 있습니다.`;
             apiKeyStatus.className = 'status-success';
        } else {
             apiKeyStatus.textContent = '';
             apiKeyStatus.className = '';
        }
        renderTokenUsage();
        apiSettingsModalOverlay.style.display = 'flex';
    }

    function closeApiSettingsModal() {
        apiSettingsModalOverlay.style.display = 'none';
        loadApiSettings(); 
        updateChatHeaderModelSelector();
    }

    function loadApiSettings() {
        const savedSettings = localStorage.getItem('userApiSettings');
        if (savedSettings) {
            userApiSettings = JSON.parse(savedSettings);
            if (!userApiSettings.tokenUsage) { userApiSettings.tokenUsage = { prompt: 0, completion: 0 }; }
            if (!userApiSettings.availableModels) { userApiSettings.availableModels = []; }
        }
    }

    function saveApiSettings(closeModal = true) {
        const key = apiKeyInput.value.trim();
        if (key) {
            userApiSettings.apiKey = key;
            userApiSettings.selectedModel = apiModelSelect.value;
            userApiSettings.maxOutputTokens = Number(maxOutputTokensInput.value) || 2048;
            if (apiModelSelect && apiModelSelect.options.length > 0 && !apiModelSelect.disabled) {
                 userApiSettings.availableModels = Array.from(apiModelSelect.options).map(opt => opt.value);
            }
        } else {
            userApiSettings = { provider: null, apiKey: '', selectedModel: '', availableModels: [], maxOutputTokens: 2048, tokenUsage: { prompt: 0, completion: 0 } };
        }
        localStorage.setItem('userApiSettings', JSON.stringify(userApiSettings));
        updateChatHeaderModelSelector();
        if (closeModal) { closeApiSettingsModal(); }
    }

    function detectProvider(key) {
        if (key.startsWith('sk-ant-api')) return 'anthropic';
        if (key.startsWith('sk-')) return 'openai';
        if (key.length > 35 && key.startsWith('AIza')) return 'google_paid';
        return null;
    }

    async function handleVerifyApiKey() {
        const key = apiKeyInput.value.trim();
        if (!key) { apiKeyStatus.textContent = 'API 키를 입력해주세요.'; apiKeyStatus.className = 'status-error'; return; }
        const provider = detectProvider(key);
        if (!provider) { apiKeyStatus.textContent = '알 수 없는 형식의 API 키입니다. (OpenAI, Anthropic, Google 지원)'; apiKeyStatus.className = 'status-error'; return; }
        userApiSettings.provider = provider;
        apiKeyStatus.textContent = `[${provider}] 키 검증 및 모델 목록 로딩 중...`; apiKeyStatus.className = 'status-loading'; verifyApiKeyBtn.disabled = true;
        try {
            const models = await fetchAvailableModels(provider, key);
            populateModelSelector(models, provider);
            apiKeyStatus.textContent = `✅ [${provider}] 키 검증 완료! 모델을 선택하고 저장하세요.`; apiKeyStatus.className = 'status-success'; apiModelSelect.disabled = false;
        } catch (error) {
            console.error("API Key Verification Error:", error);
            apiKeyStatus.textContent = `❌ [${provider}] 키 검증 실패: ${error.message}`; apiKeyStatus.className = 'status-error'; apiModelSelect.innerHTML = '<option>키 검증에 실패했습니다</option>'; apiModelSelect.disabled = true;
        } finally { verifyApiKeyBtn.disabled = false; }
    }

    async function fetchAvailableModels(provider, key) {
        if (provider === 'openai') {
            const response = await fetch('https://api.openai.com/v1/models', { headers: { 'Authorization': `Bearer ${key}` } });
            if (!response.ok) throw new Error('OpenAI 서버에서 모델 목록을 가져올 수 없습니다.');
            const data = await response.json();
            return data.data.filter(m => m.id.includes('gpt')).map(m => m.id).sort().reverse();
        } else if (provider === 'anthropic') {
            return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-2.1'];
        } else if (provider === 'google_paid') {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            if (!response.ok) throw new Error('Google 서버에서 모델 목록을 가져올 수 없습니다.');
            const data = await response.json();
            return data.models.map(m => m.name.replace('models/', '')).filter(m => m.includes('gemini'));
        }
        return [];
    }

    function populateModelSelector(models, provider, selectedModel = null) {
        apiModelSelect.innerHTML = '';
        const effectiveModels = models || [];
        if (provider && effectiveModels.length === 0) { if (provider === 'anthropic') { effectiveModels.push('claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'); } }
        if (effectiveModels.length > 0) { effectiveModels.forEach(modelId => { const option = document.createElement('option'); option.value = modelId; option.textContent = modelId; if (modelId === selectedModel) { option.selected = true; } apiModelSelect.appendChild(option); }); apiModelSelect.disabled = false; }
        else { apiModelSelect.innerHTML = '<option>사용 가능한 모델 없음</option>'; apiModelSelect.disabled = true; }
    }
    
    function updateChatHeaderModelSelector() {
        if (!aiModelSelector) return;
        const DEFAULT_MODELS = [ { value: 'gemini-2.5-flash-preview-04-17', text: '⚡️ Gemini 2.5 Flash (최신)' }, { value: 'gemini-2.0-flash', text: '💡 Gemini 2.0 Flash (안정)' } ];
        aiModelSelector.innerHTML = '';
        if (userApiSettings.provider && userApiSettings.apiKey) {
            const models_to_show = userApiSettings.availableModels || [];
            if(models_to_show.length === 0 && userApiSettings.selectedModel) { models_to_show.push(userApiSettings.selectedModel); }
            models_to_show.forEach(modelId => { const option = document.createElement('option'); option.value = modelId; option.textContent = `[개인] ${modelId}`; aiModelSelector.appendChild(option); });
            aiModelSelector.value = userApiSettings.selectedModel; aiModelSelector.title = `${userApiSettings.provider} 모델을 선택합니다. (개인 키 사용 중)`;
        } else {
            DEFAULT_MODELS.forEach(model => { const option = document.createElement('option'); option.value = model.value; option.textContent = model.text; aiModelSelector.appendChild(option); });
            const savedDefaultModel = localStorage.getItem('selectedAiModel') || defaultModel;
            aiModelSelector.value = savedDefaultModel; aiModelSelector.title = 'AI 모델을 선택합니다.';
        }
    }

    function renderTokenUsage() {
        const { prompt, completion } = userApiSettings.tokenUsage;
        const total = prompt + completion;
        tokenUsageDisplay.innerHTML = `<span>입력: ${prompt.toLocaleString()}</span> | <span>출력: ${completion.toLocaleString()}</span> | <strong>총합: ${total.toLocaleString()}</strong>`;
    }

    function resetTokenUsage() { showModal('누적 토큰 사용량을 정말로 초기화하시겠습니까?', () => { userApiSettings.tokenUsage = { prompt: 0, completion: 0 }; saveApiSettings(false); renderTokenUsage(); }); }
