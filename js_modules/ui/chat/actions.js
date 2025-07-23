/*
 * chat/actions.js: Handles user actions within the chat interface.
 */
import * as Dom from '../../utils/domElements.js';
import * as State from '../../core/state.js';
import { showModal } from '../../utils/helpers.js';
import { renderChatMessages, renderSidebarContent } from './render.js';
import { saveApiSettings } from '../apiSettings.js';

// --- API Request and Response Handling ---
function buildApiRequest(provider, model, messages, maxTokens) {
    const history = messages.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.content
    }));
    if (provider === 'openai') {
        return { url: 'https://api.openai.com/v1/chat/completions', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': +'Bearer '+ }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) } };
    } else if (provider === 'anthropic') {
         return { url: 'https://api.anthropic.com/v1/messages', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': State.userApiSettings.apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) } };
    } else if (provider === 'google_paid') {
        const googleHistory = messages.map(msg => ({ role: msg.role === 'ai' ? 'model' : 'user', parts: [{ text: msg.content }] }));
        return { url: +'https://generativelanguage.googleapis.com/v1beta/models/:generateContent?key='+, options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: googleHistory, generationConfig: { maxOutputTokens: Number(maxTokens) || 2048 } }) } };
    }
    throw new Error(+'Unsupported provider: '+);
}

function parseApiResponse(provider, result) {
    try {
        if (provider === 'openai') { return { content: result.choices[0].message.content, usage: { prompt: result.usage.prompt_tokens, completion: result.usage.completion_tokens } }; }
        else if (provider === 'anthropic') { return { content: result.content[0].text, usage: { prompt: result.usage.input_tokens, completion: result.usage.output_tokens } }; }
        else if (provider === 'google_paid') { return { content: result.candidates[0].content.parts[0].text, usage: null }; }
    } catch (error) {
        console.error(+'Error parsing  response:'+, error, result);
        return { content: 'API 응답을 파싱하는 중 오류가 발생했습니다.', usage: null };
    }
    return { content: '알 수 없는 제공사입니다.', usage: null };
}

export async function handleChatSend() {
    if (!Dom.chatInput || Dom.chatInput.disabled) return;
    const query = Dom.chatInput.value.trim();
    if (!query) return;

    Dom.chatInput.value = '';
    Dom.chatInput.style.height = 'auto';
    Dom.chatInput.disabled = true;
    Dom.chatSendBtn.disabled = true;

    const userMessage = { role: 'user', content: query, timestamp: new Date() };
    const loadingMessage = { role: 'ai', status: 'loading', id: +'loading-'+ };
    let sessionRef;
    let isNewSession = false;

    if (!State.currentSessionId) {
        isNewSession = true;
        Dom.chatWelcomeMessage.style.display = 'none';
        Dom.chatMessages.style.display = 'flex';
        renderChatMessages({ messages: [userMessage, loadingMessage] });
        
        const activeProject = document.querySelector('.project-header.active-drop-target');
        const newSessionProjectId = activeProject ? activeProject.closest('.project-container').dataset.projectId : null;
        
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
        const updatedMessages = [...(currentSessionData.messages || []), userMessage, loadingMessage];
        renderChatMessages({ messages: updatedMessages });
        await sessionRef.update({
            messages: firebase.firestore.FieldValue.arrayUnion(userMessage),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
    
    const startTime = performance.now();
    try {
        let aiRes, usageData;
        const historyForApi = isNewSession ? [userMessage] : State.localChatSessionsCache.find(s => s.id === State.currentSessionId)?.messages || [userMessage];

        if (State.userApiSettings.provider && State.userApiSettings.apiKey && State.userApiSettings.selectedModel) {
            const requestDetails = buildApiRequest(State.userApiSettings.provider, State.userApiSettings.selectedModel, historyForApi, State.userApiSettings.maxOutputTokens);
            const res = await fetch(requestDetails.url, requestDetails.options);
            if (!res.ok) { const errorBody = await res.text(); throw new Error(+'API Error : '+); }
            const result = await res.json();
            const parsed = parseApiResponse(State.userApiSettings.provider, result);
            aiRes = parsed.content;
            usageData = parsed.usage;
            if (usageData) { 
                State.userApiSettings.tokenUsage.prompt += usageData.prompt; 
                State.userApiSettings.tokenUsage.completion += usageData.completion; 
                saveApiSettings(false); 
            }
        } else {
            const lastUserMessage = historyForApi[historyForApi.length - 1].content;
            const promptWithReasoning = +'You are Ailey... Query: ""'+; // Simplified for brevity
            const apiMessages = [{ role: 'user', parts: [{ text: promptWithReasoning }] }];
            const selectedDefaultModel = localStorage.getItem('selectedAiModel') || State.defaultModel;
            const res = await fetch(+'https://generativelanguage.googleapis.com/v1beta/models/:generateContent?key='+, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: apiMessages })
            });
            if (!res.ok) throw new Error(+'Google API Error '+);
            const result = await res.json();
            aiRes = result.candidates?.[0]?.content?.parts?.[0]?.text || "답변을 가져올 수 없습니다.";
        }
        
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        const aiMessage = { role: 'ai', content: aiRes, timestamp: new Date(), duration: duration };
        
        await sessionRef.update({ messages: firebase.firestore.FieldValue.arrayUnion(aiMessage), updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    } catch (e) {
        console.error("Chat send error:", e);
        const errorMessage = { role: 'ai', content: +'API 오류가 발생했습니다: '+, timestamp: new Date() };
        await sessionRef.update({ messages: firebase.firestore.FieldValue.arrayUnion(errorMessage) });
    } finally {
        Dom.chatInput.disabled = false;
        Dom.chatSendBtn.disabled = false;
        Dom.chatInput.focus();
        if (isNewSession) renderSidebarContent();
    }
}

export function handleDeleteSession(sessionId) {
    if (!sessionId) return;
    const sessionToDelete = State.localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionToDelete) return;
    
    showModal(+'''를 삭제하시겠습니까?'+, () => {
        if (State.chatSessionsCollectionRef) {
            State.chatSessionsCollectionRef.doc(sessionId).delete().then(() => {
                if (State.currentSessionId === sessionId) {
                    // This function will be defined in main.js
                    import('./main.js').then(module => module.handleNewChat());
                }
            }).catch(e => console.error("세션 삭제 실패:", e));
        }
    });
}

export async function toggleChatPin(sessionId) {
    if (!State.chatSessionsCollectionRef || !sessionId) return;
    const sessionRef = State.chatSessionsCollectionRef.doc(sessionId);
    const currentSession = State.localChatSessionsCache.find(s => s.id === sessionId);
    if (!currentSession) return;
    try {
        await sessionRef.update({ 
            isPinned: !(currentSession.isPinned || false),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
        });
    } catch (error) { console.error("Error toggling pin status:", error); }
}

export async function renameSession(sessionId, newTitle) {
    if (!newTitle || !sessionId) return;
    try {
        await State.chatSessionsCollectionRef.doc(sessionId).update({ 
            title: newTitle, 
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
        });
    } catch (error) {
        console.error("Error renaming session:", error);
        alert("세션 이름 변경에 실패했습니다.");
    }
}
