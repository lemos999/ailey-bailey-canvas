/*
--- Ailey & Bailey Canvas ---
File: js/chat-core.js
Version: 11.0 (Refactored)
Architect: [Username] & System Architect Ailey
Description: Handles the core logic of the chat functionality: sending user messages, calling the appropriate AI API, processing the response, and rendering messages to the UI.
*/

import * as state from './state.js';
import { setUserApiSettings, renderTokenUsage } from './api-manager.js';
import { handleNewChat, renderSidebarContent } from './chat-ui.js';

// --- Element Cache ---
let chatInput, chatSendBtn, chatMessages, chatModeSelector, chatWelcomeMessage;

export function initializeChatCore() {
    chatInput = document.getElementById('chat-input');
    chatSendBtn = document.getElementById('chat-send-btn');
    chatMessages = document.getElementById('chat-messages');
    chatModeSelector = document.getElementById('chat-mode-selector');
    chatWelcomeMessage = document.getElementById('chat-welcome-message');
    
    // --- Event Listeners ---
    const chatForm = document.getElementById('chat-form');
    if (chatForm) chatForm.addEventListener('submit', e => {
        e.preventDefault();
        handleChatSend();
    });

    if (chatInput) chatInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleChatSend();
        }
    });
    
    setupChatModeSelector();
}

export async function handleChatSend() {
    if (!chatInput || chatInput.disabled) return;
    const query = chatInput.value.trim();
    if (!query) return;

    chatInput.value = '';
    chatInput.style.height = 'auto';
    chatInput.disabled = true;
    chatSendBtn.disabled = true;

    const userMessage = { role: 'user', content: query, timestamp: new Date() };
    const loadingMessage = { role: 'ai', status: 'loading', id: `loading-${Date.now()}` };
    let sessionRef;
    let currentMessages = [];
    let isNewSession = false;

    if (!state.currentSessionId) {
        isNewSession = true;
        const activeProject = document.querySelector('.project-header.active-drop-target');
        const newSessionProjectId = activeProject ? activeProject.closest('.project-container').dataset.projectId : null;
        
        if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
        if (chatMessages) chatMessages.style.display = 'flex';
        
        currentMessages = [userMessage, loadingMessage];
        renderChatMessages({ messages: currentMessages });
        
        const newSession = {
            title: query.substring(0, 40) + (query.length > 40 ? '...' : ''),
            messages: [userMessage],
            mode: state.selectedMode,
            projectId: newSessionProjectId,
            isPinned: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        sessionRef = await state.chatSessionsCollectionRef.add(newSession);
        state.setCurrentSessionId(sessionRef.id);
    } else {
        sessionRef = state.chatSessionsCollectionRef.doc(state.currentSessionId);
        const currentSessionData = state.localChatSessionsCache.find(s => s.id === state.currentSessionId);
        currentMessages = [...(currentSessionData.messages || []), userMessage, loadingMessage];
        renderChatMessages({ messages: currentMessages });
        
        await sessionRef.update({
            messages: firebase.firestore.FieldValue.arrayUnion(userMessage),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
    
    const startTime = performance.now();
    try {
        let aiRes, usageData;
        const historyForApi = isNewSession ? [userMessage] : state.localChatSessionsCache.find(s => s.id === state.currentSessionId)?.messages || [userMessage];

        if (state.userApiSettings.provider && state.userApiSettings.apiKey && state.userApiSettings.selectedModel) {
            const requestDetails = buildApiRequest(state.userApiSettings.provider, state.userApiSettings.selectedModel, historyForApi, state.userApiSettings.maxOutputTokens);
            const res = await fetch(requestDetails.url, requestDetails.options);
            if (!res.ok) { const errorBody = await res.text(); throw new Error(`API Error ${res.status}: ${errorBody}`); }
            const result = await res.json();
            const parsed = parseApiResponse(state.userApiSettings.provider, result);
            aiRes = parsed.content;
            usageData = parsed.usage;
            if (usageData) {
                const newUsage = {
                    prompt: state.userApiSettings.tokenUsage.prompt + usageData.prompt,
                    completion: state.userApiSettings.tokenUsage.completion + usageData.completion
                };
                const newSettings = { ...state.userApiSettings, tokenUsage: newUsage };
                state.setUserApiSettings(newSettings);
                renderTokenUsage();
                // No need to save here, will be saved on modal close or new save action
            }
        } else {
            let promptWithReasoning;
            const lastUserMessage = historyForApi[historyForApi.length - 1].content;
            promptWithReasoning = `You are Ailey. Based on the following query, provide a step-by-step reasoning process if the query is complex. For simple queries, omit the reasoning part. The reasoning, if present, must follow the format: [REASONING_START]SUMMARY:{one-line summary}|||DETAIL:{detailed explanation}SUMMARY:{another summary}|||DETAIL:{another detail}[REASONING_END]. The final answer should be in a friendly, informal Korean tone. Query: "${lastUserMessage}"`;
            const apiMessages = [{ role: 'user', parts: [{ text: promptWithReasoning }] }];
            const selectedDefaultModel = localStorage.getItem('selectedAiModel') || state.defaultModel;
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
        chatSendBtn.disabled = false;
        chatInput.focus();
        if (isNewSession) {
            renderSidebarContent();
        }
    }
}

function buildApiRequest(provider, model, messages, maxTokens) {
    const history = messages.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.content
    }));

    if (provider === 'openai') {
        return { url: 'https://api.openai.com/v1/chat/completions', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.userApiSettings.apiKey}` }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) } };
    } else if (provider === 'anthropic') {
         return { url: 'https://api.anthropic.com/v1/messages', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': state.userApiSettings.apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) } };
    } else if (provider === 'google_paid') {
        const googleHistory = messages.map(msg => ({ role: msg.role === 'ai' ? 'model' : 'user', parts: [{ text: msg.content }] }));
        return { url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${state.userApiSettings.apiKey}`, options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: googleHistory, generationConfig: { maxOutputTokens: Number(maxTokens) || 2048 } }) } };
    }
    throw new Error(`Unsupported provider: ${provider}`);
}

function parseApiResponse(provider, result) {
    try {
        if (provider === 'openai') { return { content: result.choices[0].message.content, usage: { prompt: result.usage.prompt_tokens, completion: result.usage.completion_tokens } }; }
        else if (provider === 'anthropic') { return { content: result.content[0].text, usage: { prompt: result.usage.input_tokens, completion: result.usage.output_tokens } }; }
        else if (provider === 'google_paid') { return { content: result.candidates[0].content.parts[0].text, usage: null }; }
    } catch (error) {
        console.error(`Error parsing ${provider} response:`, error, result);
        return { content: 'API 응답을 파싱하는 중 오류가 발생했습니다.', usage: null };
    }
    return { content: '알 수 없는 제공사입니다.', usage: null };
}

export function renderChatMessages(sessionData) {
    if (!chatMessages || !sessionData) return;
    
    const messages = sessionData.messages || [];
    chatMessages.innerHTML = '';

    messages.forEach((msg, index) => {
        if (msg.role === 'user') {
            const d = document.createElement('div');
            d.className = `chat-message user`;
            d.textContent = msg.content;
            chatMessages.appendChild(d);
        } else if (msg.role === 'ai') {
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
                chatMessages.appendChild(loadingBlock);
                return;
            }

            const aiContainer = document.createElement('div');
            aiContainer.className = 'ai-response-container';

            const content = msg.content;
            const reasoningRegex = /\[REASONING_START\]([\s\S]*?)\[REASONING_END\]/;
            const match = content.match(reasoningRegex);

            if (match) {
                const reasoningBlockId = `reasoning-${state.currentSessionId}-${index}`;
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
                
                startSummaryAnimation(rBlock, reasoningSteps);

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

function clearTimers(blockId) {
    if (state.activeTimers[blockId]) {
        state.activeTimers[blockId].forEach(clearInterval);
        delete state.activeTimers[blockId];
    }
}

function startSummaryAnimation(blockElement, reasoningSteps) {
    const blockId = blockElement.id;
    clearTimers(blockId);
    state.activeTimers[blockId] = [];

    const summaryElement = blockElement.querySelector('.reasoning-summary');
    if (!summaryElement || !reasoningSteps || reasoningSteps.length === 0) return;

    let stepIndex = 0;
    const cycleSummary = () => {
        if (!reasoningSteps[stepIndex] || !reasoningSteps[stepIndex].summary) return;
        const summaryText = reasoningSteps[stepIndex].summary;
        typewriterEffect(summaryElement, summaryText, () => {
            const waitTimer = setTimeout(() => {
                summaryElement.style.opacity = '0';
                const fadeTimer = setTimeout(() => {
                    stepIndex = (stepIndex + 1) % reasoningSteps.length;
                    summaryElement.style.opacity = '1';
                }, 500); 
                if (!state.activeTimers[blockId]) state.activeTimers[blockId] = [];
                state.activeTimers[blockId].push(fadeTimer);
            }, 2000); 
            if (!state.activeTimers[blockId]) state.activeTimers[blockId] = [];
            state.activeTimers[blockId].push(waitTimer);
        });
    };
    
    cycleSummary();
    const summaryInterval = setInterval(cycleSummary, 4000); 
    if (!state.activeTimers[blockId]) state.activeTimers[blockId] = [];
    state.activeTimers[blockId].push(summaryInterval);
}

function typewriterEffect(element, text, onComplete) {
    if (!element || !text) {
        if (onComplete) onComplete();
        return;
    }

    element.innerHTML = '';
    element.classList.add('blinking-cursor');
    let i = 0;
    const blockId = element.closest('.reasoning-block')?.id;
    
    const typingInterval = setInterval(() => {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
        } else {
            clearInterval(typingInterval);
            element.classList.remove('blinking-cursor');
            if (onComplete) onComplete();
        }
    }, 30); 

    if (blockId && state.activeTimers[blockId]) {
        state.activeTimers[blockId].push(typingInterval);
    }
}

function setupChatModeSelector() {
    if (!chatModeSelector) return;
    chatModeSelector.innerHTML = '';
    const modes = [
        { id: 'ailey_coaching', t: '기본 코칭', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M20,16H5.17L4,17.17V4H20V16Z" /></svg>' },
        { id: 'deep_learning', t: '심화 학습', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4M12,14A4,4 0 0,1 8,10H10A2,2 0 0,0 12,12A2,2 0 0,0 14,10H16A4,4 0 0,1 12,14M7.5,15.6C8.8,17.2 10.3,18 12,18C13.7,18 15.2,17.2 16.5,15.6C15.2,14.8 13.7,14 12,14C10.3,14 8.8,14.8 7.5,15.6Z" /></svg>' },
        { id: 'custom', t: '커스텀', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>' }
    ];
    modes.forEach(m => {
        const b = document.createElement('button');
        b.dataset.mode = m.id;
        b.innerHTML = `${m.i}<span>${m.t}</span>`;
        if (m.id === state.selectedMode) b.classList.add('active');
        b.addEventListener('click', () => {
            state.setSelectedMode(m.id);
            chatModeSelector.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            b.classList.add('active');
            if (state.selectedMode === 'custom') {
                 // To avoid circular dependency, dynamically import
                 import('./main.js').then(mainModule => mainModule.openPromptModal());
            }
        });
        chatModeSelector.appendChild(b);
    });
}

export function handlePopoverAskAi(selectedText) {
    if (!selectedText || !chatInput) return;
    const chatPanel = document.getElementById('chat-panel');
    import('./ui-manager.js').then(ui => ui.togglePanel(chatPanel, true));
    handleNewChat();
    setTimeout(() => {
        chatInput.value = `"${selectedText}"\n\n이 내용에 대해 더 자세히 설명해줄래?`;
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
        chatInput.focus();
    }, 100);
}

export function handlePopoverAddNote(selectedText) {
    if (!selectedText) return;
    import('./notes-manager.js').then(notes => notes.addNote(`> ${selectedText}\n\n`));
}