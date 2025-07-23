// js/ui/chat/actions.js
// 채팅 전송, API 요청 생성 및 응답 처리 등 실제 동작을 담당합니다.

import * as DOM from '../../utils/domElements.js';
import * as State from '../../core/state.js';
import { renderChatMessages, renderSidebarContent } from './render.js';

/**
 * 채팅 메시지 전송 로직을 처리합니다.
 */
export async function handleChatSend() {
    if (!DOM.chatInput || DOM.chatInput.disabled) return;
    const query = DOM.chatInput.value.trim();
    if (!query) return;

    DOM.chatInput.value = '';
    DOM.chatInput.style.height = 'auto';
    DOM.chatInput.disabled = true;
    DOM.chatSendBtn.disabled = true;

    const userMessage = { role: 'user', content: query, timestamp: new Date() };
    const loadingMessage = { role: 'ai', status: 'loading', id: loading- };
    let sessionRef;
    let currentMessages = [];
    let isNewSession = false;

    if (!State.currentSessionId) {
        isNewSession = true;
        const activeProject = document.querySelector('.project-header.active-drop-target');
        const newSessionProjectId = activeProject ? activeProject.closest('.project-container').dataset.projectId : null;
        if (DOM.chatWelcomeMessage) DOM.chatWelcomeMessage.style.display = 'none';
        if (DOM.chatMessages) DOM.chatMessages.style.display = 'flex';
        currentMessages = [userMessage, loadingMessage];
        renderChatMessages({ messages: currentMessages });
        
        const newSession = {
            title: query.substring(0, 40) + (query.length > 40 ? '...' : ''),
            messages: [userMessage],
            mode: State.selectedMode,
            projectId: newSessionProjectId,
            isPinned: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        sessionRef = await State.chatSessionsCollectionRef.add(newSession);
        State.setCurrentSessionId(sessionRef.id);
    } else {
        sessionRef = State.chatSessionsCollectionRef.doc(State.currentSessionId);
        const currentSessionData = State.localChatSessionsCache.find(s => s.id === State.currentSessionId);
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
        const historyForApi = isNewSession ? [userMessage] : State.localChatSessionsCache.find(s => s.id === State.currentSessionId)?.messages || [userMessage];
        const settings = State.userApiSettings;

        if (settings.provider && settings.apiKey && settings.selectedModel) {
            const requestDetails = buildApiRequest(settings.provider, settings.selectedModel, historyForApi, settings.maxOutputTokens, settings.apiKey);
            const res = await fetch(requestDetails.url, requestDetails.options);
            if (!res.ok) { const errorBody = await res.text(); throw new Error(API Error : ); }
            const result = await res.json();
            const parsed = parseApiResponse(settings.provider, result);
            aiRes = parsed.content;
            usageData = parsed.usage;
            if (usageData) {
                const newSettings = { ...settings };
                newSettings.tokenUsage.prompt += usageData.prompt;
                newSettings.tokenUsage.completion += usageData.completion;
                State.setUserApiSettings(newSettings);
                // No need to save here, will be saved in the settings modal
            }
        } else {
            let promptWithReasoning;
            const lastUserMessage = historyForApi[historyForApi.length - 1].content;
            promptWithReasoning = You are Ailey. Based on the following query, provide a step-by-step reasoning process if the query is complex. For simple queries, omit the reasoning part. The reasoning, if present, must follow the format: [REASONING_START]SUMMARY:{one-line summary}|||DETAIL:{detailed explanation}SUMMARY:{another summary}|||DETAIL:{another detail}[REASONING_END]. The final answer should be in a friendly, informal Korean tone. Query: "";
            const apiMessages = [{ role: 'user', parts: [{ text: promptWithReasoning }] }];
            const selectedDefaultModel = localStorage.getItem('selectedAiModel') || State.defaultModel;
            const res = await fetch(https://generativelanguage.googleapis.com/v1beta/models/:generateContent?key=, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: apiMessages })
            });
            if (!res.ok) throw new Error(Google API Error );
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
        const errorMessage = { role: 'ai', content: API 오류가 발생했습니다: , timestamp: new Date() };
        await sessionRef.update({ 
            messages: firebase.firestore.FieldValue.arrayUnion(errorMessage)
        });
    } finally {
        DOM.chatInput.disabled = false;
        DOM.chatSendBtn.disabled = false;
        DOM.chatInput.focus();
        if (isNewSession) {
            renderSidebarContent();
        }
    }
}

/**
 * API 제공사에 맞는 요청 객체를 생성합니다.
 * @param {string} provider - API 제공사 ('openai', 'anthropic', 'google_paid')
 * @param {string} model - 모델 이름
 * @param {Array} messages - 대화 기록
 * @param {number} maxTokens - 최대 출력 토큰
 * @param {string} apiKey - API 키
 * @returns {{url: string, options: object}} API 요청 URL 및 옵션
 */
function buildApiRequest(provider, model, messages, maxTokens, apiKey) {
    const history = messages.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.content
    }));

    if (provider === 'openai') {
        return { url: 'https://api.openai.com/v1/chat/completions', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': Bearer  }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) } };
    } else if (provider === 'anthropic') {
         return { url: 'https://api.anthropic.com/v1/messages', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) } };
    } else if (provider === 'google_paid') {
        const googleHistory = messages.map(msg => ({ role: msg.role === 'ai' ? 'model' : 'user', parts: [{ text: msg.content }] }));
        return { url: https://generativelanguage.googleapis.com/v1beta/models/:generateContent?key=, options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: googleHistory, generationConfig: { maxOutputTokens: Number(maxTokens) || 2048 } }) } };
    }
    throw new Error(Unsupported provider: );
}

/**
 * API 응답을 파싱하여 콘텐츠와 토큰 사용량을 추출합니다.
 * @param {string} provider - API 제공사
 * @param {object} result - API 응답 객체
 * @returns {{content: string, usage: {prompt: number, completion: number}|null}}
 */
function parseApiResponse(provider, result) {
    try {
        if (provider === 'openai') { return { content: result.choices[0].message.content, usage: { prompt: result.usage.prompt_tokens, completion: result.usage.completion_tokens } }; }
        else if (provider === 'anthropic') { return { content: result.content[0].text, usage: { prompt: result.usage.input_tokens, completion: result.usage.output_tokens } }; }
        else if (provider === 'google_paid') { return { content: result.candidates[0].content.parts[0].text, usage: null }; }
    } catch (error) {
        console.error(Error parsing  response:, error, result);
        return { content: 'API 응답을 파싱하는 중 오류가 발생했습니다.', usage: null };
    }
    return { content: '알 수 없는 제공사입니다.', usage: null };
}

