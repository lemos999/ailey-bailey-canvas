import { state, setState } from '../../core/state.js';
import { dom } from '../../ui/dom.js';
import { renderChatMessages } from './ui.js';
import { renderSidebarContent } from './sidebar.js';

export async function handleChatSend() {
    if (!dom.chatInput || dom.chatInput.disabled) return;
    const query = dom.chatInput.value.trim();
    if (!query) return;

    dom.chatInput.value = '';
    dom.chatInput.style.height = 'auto';
    dom.chatInput.disabled = true;
    dom.chatSendBtn.disabled = true;

    const userMessage = { role: 'user', content: query, timestamp: new Date() };
    const loadingMessage = { role: 'ai', status: 'loading', id: loading- };
    let sessionRef;
    let currentMessages = [];
    let isNewSession = false;

    if (!state.currentSessionId) {
        isNewSession = true;
        const activeProject = document.querySelector('.project-header.active-drop-target');
        const newSessionProjectId = activeProject ? activeProject.closest('.project-container').dataset.projectId : null;
        if (dom.chatWelcomeMessage) dom.chatWelcomeMessage.style.display = 'none';
        if (dom.chatMessages) dom.chatMessages.style.display = 'flex';
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
        setState('currentSessionId', sessionRef.id);
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
        const { provider, apiKey, selectedModel, maxOutputTokens } = state.userApiSettings;

        if (provider && apiKey && selectedModel) {
            const requestDetails = buildApiRequest(provider, selectedModel, historyForApi, maxOutputTokens);
            const res = await fetch(requestDetails.url, requestDetails.options);
            if (!res.ok) { const errorBody = await res.text(); throw new Error(API Error : ); }
            const result = await res.json();
            const parsed = parseApiResponse(provider, result);
            aiRes = parsed.content;
            usageData = parsed.usage;
            if (usageData) { 
                const newUsage = { 
                    prompt: state.userApiSettings.tokenUsage.prompt + usageData.prompt, 
                    completion: state.userApiSettings.tokenUsage.completion + usageData.completion 
                };
                setState('userApiSettings', {...state.userApiSettings, tokenUsage: newUsage });
                localStorage.setItem('userApiSettings', JSON.stringify(state.userApiSettings));
            }
        } else {
            const lastUserMessage = historyForApi[historyForApi.length - 1].content;
            const promptWithReasoning = You are Ailey. Based on the following query, provide a step-by-step reasoning process if the query is complex. For simple queries, omit the reasoning part. The reasoning, if present, must follow the format: [REASONING_START]SUMMARY:{one-line summary}|||DETAIL:{detailed explanation}SUMMARY:{another summary}|||DETAIL:{another detail}[REASONING_END]. The final answer should be in a friendly, informal Korean tone. Query: "";
            const apiMessages = [{ role: 'user', parts: [{ text: promptWithReasoning }] }];
            const selectedDefaultModel = localStorage.getItem('selectedAiModel') || state.defaultModel;
            const res = await fetch(https://generativelanguage.googleapis.com/v1beta/models/:generateContent?key=YOUR_API_KEY, { // Replace YOUR_API_KEY
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
        dom.chatInput.disabled = false;
        dom.chatSendBtn.disabled = false;
        dom.chatInput.focus();
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
        return { url: 'https://api.openai.com/v1/chat/completions', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': Bearer  }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) } };
    } else if (provider === 'anthropic') {
         return { url: 'https://api.anthropic.com/v1/messages', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': state.userApiSettings.apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) } };
    } else if (provider === 'google_paid') {
        const googleHistory = messages.map(msg => ({ role: msg.role === 'ai' ? 'model' : 'user', parts: [{ text: msg.content }] }));
        return { url: https://generativelanguage.googleapis.com/v1beta/models/:generateContent?key=, options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: googleHistory, generationConfig: { maxOutputTokens: Number(maxTokens) || 2048 } }) } };
    }
    throw new Error(Unsupported provider: );
}

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
