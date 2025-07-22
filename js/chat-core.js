/*
--- Ailey & Bailey Canvas ---
File: js/chat-core.js
Version: 11.0 (Refactored)
Description: Handles the core logic of the chat functionality, including sending messages,
processing API requests, and rendering chat messages on the screen.
*/

import * as state from './state.js';
import { showModal, removeContextMenu } from './ui-manager.js';
import { renderSidebarContent, createSessionItem, showProjectContextMenu, moveSessionToProject, toggleChatPin } from './chat-session.js';
import { startSummaryAnimation, typewriterEffect } from './chat-ui.js';
import { saveApiSettings } from './api-manager.js';

let chatPanel, chatForm, chatInput, chatMessages, chatSendBtn,
    chatWelcomeMessage, chatSessionTitle, deleteSessionBtn, newChatBtn, newProjectBtn,
    promptSaveBtn, promptCancelBtn;


export function initializeChatCore() {
    // Query elements
    chatPanel = document.getElementById('chat-panel');
    chatForm = document.getElementById('chat-form');
    chatInput = document.getElementById('chat-input');
    chatMessages = document.getElementById('chat-messages');
    chatSendBtn = document.getElementById('chat-send-btn');
    chatWelcomeMessage = document.getElementById('chat-welcome-message');
    chatSessionTitle = document.getElementById('chat-session-title');
    deleteSessionBtn = document.getElementById('delete-session-btn');
    newChatBtn = document.getElementById('new-chat-btn');
    newProjectBtn = document.getElementById('new-project-btn');
    promptSaveBtn = document.getElementById('prompt-save-btn');
    promptCancelBtn = document.getElementById('prompt-cancel-btn');

    // Attach event listeners
    if (chatForm) chatForm.addEventListener('submit', (e) => { e.preventDefault(); handleChatSend(); });
    if (chatInput) chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } });
    if (deleteSessionBtn) deleteSessionBtn.addEventListener('click', () => handleDeleteSession(state.currentSessionId));
    if (newChatBtn) newChatBtn.addEventListener('click', handleNewChat);
    if (newProjectBtn) newProjectBtn.addEventListener('click', createNewProject);

    if (promptSaveBtn) promptSaveBtn.addEventListener('click', saveCustomPrompt);
    if (promptCancelBtn) promptCancelBtn.addEventListener('click', () => document.getElementById('prompt-modal-overlay').style.display = 'none');
    
    if (chatMessages) {
        chatMessages.addEventListener('click', handleReasoningBlockClick);
    }
}

export function handlePopoverAskAi() {
    if (!state.lastSelectedText || !chatInput) return;
    document.getElementById('chat-toggle-btn').click(); // Use the button to toggle
    handleNewChat();
    setTimeout(() => {
        chatInput.value = `"${state.lastSelectedText}"\n\n이 내용에 대해 더 자세히 설명해줄래?`;
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
        chatInput.focus();
    }, 100);
    document.getElementById('selection-popover').style.display = 'none';
}

function saveCustomPrompt() {
    const customPromptInput = document.getElementById('custom-prompt-input');
    if (customPromptInput) {
        state.setCustomPrompt(customPromptInput.value);
        localStorage.setItem('customTutorPrompt', customPromptInput.value);
        document.getElementById('prompt-modal-overlay').style.display = 'none';
    }
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
        const newSessionProjectId = null; // Simplified for now
        if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
        if (chatMessages) chatMessages.style.display = 'flex';
        
        currentMessages = [userMessage, loadingMessage];
        renderChatMessages({ messages: currentMessages }); // Render immediately with loading state
        
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
        
        renderChatMessages({ messages: currentMessages }); // Render immediately with loading state
        
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
                state.setUserApiSettings({ ...state.userApiSettings, tokenUsage: newUsage });
                saveApiSettings(false);
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
        if (sessionRef) {
            await sessionRef.update({ 
                messages: firebase.firestore.FieldValue.arrayUnion(errorMessage)
            });
        }
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


function handleReasoningBlockClick(e) {
    const header = e.target.closest('.reasoning-header');
    if (!header) return;

    const block = header.closest('.reasoning-block');
    if (block.classList.contains('loading')) return;

    const content = block.querySelector('.reasoning-content');
    const blockId = block.id;
    
    clearTimers(blockId);
    block.classList.toggle('expanded');
    content.classList.toggle('expanded');
    
    if (block.classList.contains('expanded')) {
        const steps = JSON.parse(block.dataset.steps);
        const fullText = steps.map(s => s.detail).filter(Boolean).join('\n\n');
        content.innerHTML = '';
        typewriterEffect(content, fullText);
    } else {
        content.innerHTML = '';
        const steps = JSON.parse(block.dataset.steps);
        startSummaryAnimation(block, steps);
    }
}

export function selectSession(sessionId) {
    removeContextMenu();
    if (!sessionId) return;
    const sessionData = state.localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionData) return;

    state.setCurrentSessionId(sessionId);
    Object.values(state.activeTimers).forEach(timers => timers.forEach(clearInterval));
    
    renderSidebarContent();
    
    if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
    if (chatMessages) chatMessages.style.display = 'flex';
    
    renderChatMessages(sessionData);
    
    if (chatSessionTitle) chatSessionTitle.textContent = sessionData.title || '대화';
    if (deleteSessionBtn) deleteSessionBtn.style.display = 'inline-block';
    if (chatInput) chatInput.disabled = false;
    if (chatSendBtn) chatSendBtn.disabled = false;
    chatInput.focus();
}

export function handleNewChat() {
    state.setCurrentSessionId(null);
    Object.values(state.activeTimers).forEach(timers => timers.forEach(clearInterval));
    renderSidebarContent();
    if (chatMessages) {
        chatMessages.innerHTML = '';
        chatMessages.style.display = 'none';
    }
    if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'flex';
    if (chatSessionTitle) chatSessionTitle.textContent = 'AI 러닝메이트';
    if (deleteSessionBtn) deleteSessionBtn.style.display = 'none';
    if (chatInput) {
        chatInput.disabled = false;
        chatInput.value = '';
    }
    if (chatSendBtn) chatSendBtn.disabled = false;
}

function handleDeleteSession(sessionId) {
    if (!sessionId) return;
    const sessionToDelete = state.localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionToDelete) return;
    
    showModal(`'${sessionToDelete?.title || '이 대화'}'를 삭제하시겠습니까?`, () => {
        if (state.chatSessionsCollectionRef) {
            state.chatSessionsCollectionRef.doc(sessionId).delete().then(() => {
                console.log("Session deleted successfully");
                if (state.currentSessionId === sessionId) {
                    handleNewChat();
                }
            }).catch(e => console.error("세션 삭제 실패:", e));
        }
    });
}


export async function renameSession(sessionId, newTitle) {
    if (!newTitle || !sessionId) return;
    try { 
        await state.chatSessionsCollectionRef.doc(sessionId).update({ 
            title: newTitle, 
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
        }); 
    }
    catch (error) { console.error("Error renaming session:", error); alert("세션 이름 변경에 실패했습니다."); }
}

export async function renameProject(projectId, newName) {
    if (!newName || !newName.trim() || !projectId) return;
    try {
        await state.projectsCollectionRef.doc(projectId).update({ 
            name: newName.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error renaming project:", error);
        alert("프로젝트 이름 변경에 실패했습니다.");
    }
}

export function startSessionRename(sessionId) {
    const sessionItem = document.querySelector(`.session-item[data-session-id="${sessionId}"]`);
    if (!sessionItem) return;
    const titleSpan = sessionItem.querySelector('.session-item-title');
    if (!titleSpan) return;
    const originalTitle = titleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text'; 
    input.className = 'project-title-input'; 
    input.value = originalTitle;
    titleSpan.replaceWith(input);
    input.focus(); 
    input.select();
    
    const finishEditing = () => {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== originalTitle) { 
            renameSession(sessionId, newTitle); 
        }
        else { 
            renderSidebarContent(); // Re-render to restore original
        }
    };

    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { input.blur(); }
        else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); }
    });
}

export function startProjectRename(projectId) {
    const projectContainer = document.querySelector(`.project-container[data-project-id="${projectId}"]`);
    if (!projectContainer) return;
    const titleSpan = projectContainer.querySelector('.project-title');
    if (!titleSpan) return;

    const originalTitle = titleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'project-title-input';
    input.value = originalTitle;

    titleSpan.replaceWith(input);
    input.focus();
    input.select();

    const finishEditing = () => {
        const newName = input.value.trim();
        if (newName && newName !== originalTitle) {
             renameProject(projectId, newName);
        }
         // The listener will re-render, so no need to call it manually here.
    };

    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
            input.value = originalTitle;
            input.blur();
        }
    });
}

export function showSessionContextMenu(sessionId, x, y) {
    const session = state.localChatSessionsCache.find(s => s.id === sessionId);
    if (!session) return;
    removeContextMenu();

    const menu = document.createElement('div');
    menu.className = 'session-context-menu';

    let moveToSubMenuHTML = state.localProjectsCache.map(p => `<button class="context-menu-item" data-project-id="${p.id}" ${session.projectId === p.id ? 'disabled' : ''}>${p.name}</button>`).join('');
    
    const moveToMenu = `
        <div class="context-submenu-container">
            <button class="context-menu-item" data-action="move-to"><span>프로젝트로 이동</span><span class="submenu-arrow">▶</span></button>
            <div class="context-submenu">
                <button class="context-menu-item" data-project-id="null" ${!session.projectId ? 'disabled' : ''}>[일반 대화로 이동]</button>
                <div class="context-menu-separator"></div>
                ${moveToSubMenuHTML}
            </div>
        </div>
    `;

    const createdAt = session.createdAt?.toDate()?.toLocaleString('ko-KR') || 'N/A';
    const updatedAt = session.updatedAt?.toDate()?.toLocaleString('ko-KR') || 'N/A';
    
    menu.innerHTML = `
        <button class="context-menu-item" data-action="rename">이름 변경</button>
        ${moveToMenu}
        <button class="context-menu-item" data-action="pin">${session.isPinned ? '고정 해제' : '고정하기'}</button>
        <div class="context-menu-separator"></div>
        <button class="context-menu-item" data-action="delete">삭제</button>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item disabled">생성: ${createdAt}</div>
        <div class="context-menu-item disabled">수정: ${updatedAt}</div>
    `;
    
    document.body.appendChild(menu);

    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const bodyWidth = document.body.clientWidth;
    const bodyHeight = document.body.clientHeight;

    menu.style.left = `${x + menuWidth > bodyWidth ? x - menuWidth : x}px`;
    menu.style.top = `${y + menuHeight > bodyHeight ? y - menuHeight : y}px`;
    menu.style.display = 'block';
    
    state.setCurrentOpenContextMenu(menu);
    
    menu.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = e.target.closest('.context-menu-item');
        if (!target || target.disabled) return;
        
        const action = target.dataset.action;
        const projectId = target.dataset.projectId;
        
        if (action === 'rename') { startSessionRename(sessionId); }
        else if (action === 'pin') { toggleChatPin(sessionId); }
        else if (action === 'delete') { handleDeleteSession(sessionId); }
        else if (projectId !== undefined) { moveSessionToProject(sessionId, projectId === 'null' ? null : projectId); }
        
        removeContextMenu();
    });
}