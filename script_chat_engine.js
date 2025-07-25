/*
--- Ailey & Bailey Canvas ---
File: script_chat_engine.js
Version: 12.0 (Modular JS Refactor)
Architect: [Username] & System Architect Ailey
Description: The core engine for chat functionality. Handles message sending, API requests, response parsing, and rendering of dynamic elements like the reasoning block.
*/

// --- 3. Function Definitions (Chat Engine) ---

/**
 * 사용자 입력을 받아 AI에게 메시지를 전송하고 응답을 처리하는 전체 과정을 담당합니다.
 */
async function handleChatSend() {
    if (!chatInput || chatInput.disabled) return;
    const query = chatInput.value.trim();
    if (!query) return;

    chatInput.value = '';
    chatInput.style.height = 'auto';
    chatInput.disabled = true;
    chatInput.placeholder = "AI가 응답하는 중..."
    chatSendBtn.disabled = true;

    const userMessage = { role: 'user', content: query, timestamp: new Date() };
    const loadingMessage = { role: 'ai', status: 'loading', id: `loading-${Date.now()}` };
    let sessionRef;
    let currentMessages = [];
    let isNewSession = false;

    if (!currentSessionId) {
        isNewSession = true;
        const activeProject = document.querySelector('.project-header.active-drop-target');
        const newSessionProjectId = activeProject ? activeProject.closest('.project-container').dataset.projectId : null;

        if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
        if (chatMessages) chatMessages.style.display = 'flex';
        
        // Temporarily render user message and loading indicator
        currentMessages = [userMessage, loadingMessage];
        renderChatMessages({ messages: currentMessages });
        
        const newSessionData = {
            title: query.substring(0, 40) + (query.length > 40 ? '...' : ''),
            messages: [userMessage], // Start with only the user message for the DB
            mode: selectedMode,
            projectId: newSessionProjectId,
            isPinned: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        sessionRef = await chatSessionsCollectionRef.add(newSessionData);
        currentSessionId = sessionRef.id;

    } else {
        sessionRef = chatSessionsCollectionRef.doc(currentSessionId);
        const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId);
        
        // Temporarily render user message and loading indicator
        currentMessages = [...(currentSessionData.messages || []), userMessage, loadingMessage];
        renderChatMessages({ messages: currentMessages });
        
        // Update DB with only the new user message
        await sessionRef.update({
            messages: firebase.firestore.FieldValue.arrayUnion(userMessage),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
    
    const startTime = performance.now();
    try {
        let aiRes, usageData;
        // Prepare message history for the API call
        const historyForApi = isNewSession ? [userMessage] : (localChatSessionsCache.find(s => s.id === currentSessionId)?.messages.slice(-20) || [userMessage]);

        // Check if using a personal API key
        if (userApiSettings.provider && userApiSettings.apiKey && userApiSettings.selectedModel) {
            const requestDetails = buildApiRequest(userApiSettings.provider, userApiSettings.selectedModel, historyForApi, userApiSettings.maxOutputTokens);
            const res = await fetch(requestDetails.url, requestDetails.options);
            if (!res.ok) { 
                const errorBody = await res.text(); 
                throw new Error(`API Error ${res.status}: ${errorBody}`); 
            }
            const result = await res.json();
            const parsed = parseApiResponse(userApiSettings.provider, result);
            aiRes = parsed.content;
            usageData = parsed.usage;
            if (usageData) { 
                userApiSettings.tokenUsage.prompt += usageData.prompt; 
                userApiSettings.tokenUsage.completion += usageData.completion; 
                saveApiSettings(false); 
                renderTokenUsage(); 
            }
        } else { // Use the default Google API
            let promptWithReasoning;
            const lastUserMessage = historyForApi[historyForApi.length - 1].content;
            // This prompt structure asks the model to self-reflect and provide reasoning if needed
            promptWithReasoning = `You are Ailey. Based on the following query, provide a step-by-step reasoning process if the query is complex. For simple queries, omit the reasoning part. The reasoning, if present, must follow the format: [REASONING_START]SUMMARY:{one-line summary}|||DETAIL:{detailed explanation}SUMMARY:{another summary}|||DETAIL:{another detail}[REASONING_END]. The final answer should be in a friendly, informal Korean tone. Query: "${lastUserMessage}"`;
            
            const apiMessages = [{ role: 'user', parts: [{ text: promptWithReasoning }] }];
            const selectedDefaultModel = localStorage.getItem('selectedAiModel') || defaultModel;
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedDefaultModel}:generateContent?key=`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: apiMessages })
            });
            if (!res.ok) throw new Error(`Google API Error ${res.status}`);
            const result = await res.json();
            aiRes = result.candidates?.[0]?.content?.parts?.[0]?.text || "답변을 가져올 수 없습니다.";
        }
        
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        const aiMessage = { role: 'ai', content: aiRes, timestamp: new Date(), duration: duration };
        
        // Save the final AI message to the database
        await sessionRef.update({
            messages: firebase.firestore.FieldValue.arrayUnion(aiMessage),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

    } catch (e) {
        console.error("Chat send error:", e);
        const errorMessage = { role: 'ai', content: `API 오류가 발생했습니다: ${e.message}`, timestamp: new Date() };
        await sessionRef.update({ 
            messages: firebase.firestore.FieldValue.arrayUnion(errorMessage)
        });
    } finally {
        chatInput.disabled = false;
        chatInput.placeholder = "AI 러닝메이트에게 질문하기..."
        chatSendBtn.disabled = false;
        chatInput.focus();
        // If it was a new session, formally select it to ensure UI consistency
        if (isNewSession) {
            selectSession(currentSessionId);
        }
    }
}

/**
 * 제공된 세션 데이터에 따라 채팅 메시지 UI를 렌더링합니다.
 * @param {object} sessionData - 렌더링할 세션의 데이터
 */
function renderChatMessages(sessionData) {
    if (!chatMessages || !sessionData) return;
    
    if (sessionData && chatWelcomeMessage) {
        chatWelcomeMessage.style.display = 'none';
    }

    const messages = sessionData.messages || [];
    const fragment = document.createDocumentFragment();

    // Clear only dynamically added message elements
    chatMessages.querySelectorAll('.chat-message, .ai-response-container, .reasoning-block').forEach(el => el.remove());

    messages.forEach((msg, index) => {
        if (msg.role === 'user') {
            const d = document.createElement('div');
            d.className = `chat-message user`;
            d.textContent = msg.content;
            fragment.appendChild(d);

        } else if (msg.role === 'ai') {
            // Handle loading indicator
            if (msg.status === 'loading') {
                const loadingBlock = document.createElement('div');
                loadingBlock.className = 'reasoning-block loading';
                loadingBlock.id = msg.id; 
                loadingBlock.innerHTML = `
                    <div class="reasoning-header">
                        <span class="toggle-icon">▶</span>
                        <span class="reasoning-summary blinking-cursor">AI가 생각하는 중...</span>
                    </div>
                `;
                fragment.appendChild(loadingBlock);
                return; // Skip to next message
            }

            const aiContainer = document.createElement('div');
            aiContainer.className = 'ai-response-container';

            const content = msg.content;
            const reasoningRegex = /^\[REASONING_START\]([\s\S]*?)\[REASONING_END\]/;
            const match = content.match(reasoningRegex);

            // If the message contains a reasoning block
            if (match) {
                const reasoningBlockId = `reasoning-${currentSessionId}-${index}`;
                const reasoningRaw = match[1];
                const finalAnswer = content.replace(reasoningRegex, '').trim();

                const reasoningSteps = reasoningRaw.split('SUMMARY:')
                    .filter(s => s.trim() !== '')
                    .map(step => {
                        const parts = step.split('|||DETAIL:');
                        return { summary: parts[0]?.trim(), detail: parts[1]?.trim() };
                    });
                
                const rBlock = document.createElement('div');
                rBlock.className = 'reasoning-block';
                rBlock.id = reasoningBlockId;
                rBlock.dataset.steps = JSON.stringify(reasoningSteps);

                rBlock.innerHTML = `
                    <div class="reasoning-header">
                        <span class="toggle-icon">▶</span>
                        <span>AI의 추론 과정...</span>
                        <span class="reasoning-summary"></span>
                    </div>
                    <div class="reasoning-content"></div>
                `;
                aiContainer.appendChild(rBlock);
                
                startSummaryAnimation(rBlock, reasoningSteps); // Kick off the animation

                if (finalAnswer) {
                    const finalAnswerDiv = document.createElement('div');
                    finalAnswerDiv.className = 'chat-message ai';
                    finalAnswerDiv.innerHTML = finalAnswer.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                    aiContainer.appendChild(finalAnswerDiv);
                }
            } else { // Simple AI message without reasoning
                const d = document.createElement('div');
                d.className = 'chat-message ai';
                d.innerHTML = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                aiContainer.appendChild(d);
            }

            // Add response duration if available
            if (msg.duration) {
                const metaDiv = document.createElement('div');
                metaDiv.className = 'ai-response-meta';
                metaDiv.innerHTML = `
                    <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" /></svg>
                    <span>응답 생성: ${msg.duration}초</span>
                `;
                aiContainer.appendChild(metaDiv);
            }
            fragment.appendChild(aiContainer);
        }
    });
    
    chatMessages.appendChild(fragment);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


/**
 * API 제공사에 따라 API 요청 객체를 생성합니다.
 * @param {string} provider - API 제공사 ('openai', 'anthropic', 'google_paid')
 * @param {string} model - 사용할 모델 ID
 * @param {Array<object>} messages - API에 전달할 메시지 배열
 * @param {number} maxTokens - 최대 출력 토큰 수
 * @returns {{url: string, options: object}} API 요청 URL과 옵션 객체
 */
function buildApiRequest(provider, model, messages, maxTokens) {
    const history = messages.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.content
    }));

    if (provider === 'openai') {
        return {
            url: 'https://api.openai.com/v1/chat/completions',
            options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userApiSettings.apiKey}` }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) }
        };
    } else if (provider === 'anthropic') {
         return {
            url: 'https://api.anthropic.com/v1/messages',
            options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': userApiSettings.apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) }
        };
    } else if (provider === 'google_paid') {
        const googleHistory = messages.map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));
        return {
            url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${userApiSettings.apiKey}`,
            options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: googleHistory, generationConfig: { maxOutputTokens: Number(maxTokens) || 2048 } }) }
        };
    }
    throw new Error(`Unsupported provider: ${provider}`);
}

/**
 * API 제공사의 응답을 표준 형식으로 파싱합니다.
 * @param {string} provider - API 제공사
 * @param {object} result - API로부터 받은 원본 응답 객체
 * @returns {{content: string, usage: {prompt: number, completion: number}|null}} 파싱된 콘텐츠와 토큰 사용량
 */
function parseApiResponse(provider, result) {
    try {
        if (provider === 'openai') {
            return { content: result.choices[0].message.content, usage: { prompt: result.usage.prompt_tokens, completion: result.usage.completion_tokens } };
        } else if (provider === 'anthropic') {
            return { content: result.content[0].text, usage: { prompt: result.usage.input_tokens, completion: result.usage.output_tokens } };
        } else if (provider === 'google_paid') {
            return { content: result.candidates[0].content.parts[0].text, usage: null }; // Google paid API doesn't return token usage in the same way
        }
    } catch (error) {
        console.error(`Error parsing ${provider} response:`, error, result);
        return { content: 'API 응답을 파싱하는 중 오류가 발생했습니다.', usage: null };
    }
    return { content: '알 수 없는 제공사입니다.', usage: null };
}

/**
 * AI 추론 과정의 타이핑 애니메이션을 시작합니다.
 * @param {HTMLElement} blockElement - 애니메이션을 적용할 reasoning-block 요소
 * @param {Array<object>} reasoningSteps - 추론 단계 정보가 담긴 배열
 */
function startSummaryAnimation(blockElement, reasoningSteps) {
    const blockId = blockElement.id;
    clearTimers(blockId);
    activeTimers[blockId] = [];

    const summaryElement = blockElement.querySelector('.reasoning-summary');
    if (!summaryElement || !reasoningSteps || reasoningSteps.length === 0) return;

    let stepIndex = 0;
    let isCycling = true; // Flag to control the animation loop

    const cycleSummary = () => {
        if (!isCycling || !reasoningSteps[stepIndex] || !reasoningSteps[stepIndex].summary) return;
        
        const summaryText = reasoningSteps[stepIndex].summary;
        typewriterEffect(summaryElement, summaryText, () => {
            const waitTimer = setTimeout(() => {
                if (!isCycling) return;
                summaryElement.style.opacity = '0';
                const fadeTimer = setTimeout(() => {
                    if (!isCycling) return;
                    stepIndex = (stepIndex + 1) % reasoningSteps.length;
                    summaryElement.style.opacity = '1';
                }, 500); // Fade out duration
                if (!activeTimers[blockId]) activeTimers[blockId] = [];
                activeTimers[blockId].push(fadeTimer);
            }, 2000); // Time to display summary
            if (!activeTimers[blockId]) activeTimers[blockId] = [];
            activeTimers[blockId].push(waitTimer);
        });
    };
    
    // Start the animation loop
    cycleSummary(); // Start the first cycle immediately
    const summaryInterval = setInterval(cycleSummary, 4500); // Interval for subsequent cycles (typing + display time)
    if (!activeTimers[blockId]) activeTimers[blockId] = [];
    activeTimers[blockId].push(summaryInterval);
    
    // Stop the animation if the user expands the details
    blockElement.addEventListener('toggle', () => { isCycling = false; }, { once: true });
}


/**
 * 지정된 요소에 타이핑 효과를 적용합니다.
 * @param {HTMLElement} element - 효과를 적용할 텍스트 요소
 * @param {string} text - 표시할 전체 텍스트
 * @param {function} onComplete - 타이핑 완료 후 호출될 콜백 함수
 */
function typewriterEffect(element, text, onComplete) {
    if (!element || !text) {
        if (onComplete) onComplete();
        return;
    }

    element.innerHTML = '';
    element.classList.add('blinking-cursor');
    let i = 0;
    const blockId = element.closest('.reasoning-block')?.id;
    
    if (element.typingInterval) {
        clearInterval(element.typingInterval);
    }
    
    const typingInterval = setInterval(() => {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
        } else {
            clearInterval(typingInterval);
            element.typingInterval = null;
            element.classList.remove('blinking-cursor');
            if (onComplete) onComplete();
        }
    }, 30); // Typing speed
    
    element.typingInterval = typingInterval;

    if (blockId && activeTimers[blockId]) {
        activeTimers[blockId].push(typingInterval);
    }
}

/**
 * 지정된 블록과 관련된 모든 타이머를 정리합니다.
 * @param {string} blockId - 타이머를 정리할 블록의 ID
 */
function clearTimers(blockId) {
    if (activeTimers[blockId]) {
        activeTimers[blockId].forEach(clearInterval);
        delete activeTimers[blockId];
    }
}