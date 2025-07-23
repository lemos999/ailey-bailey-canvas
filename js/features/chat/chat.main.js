/*
--- Module: chat.main.js ---
Description: Main logic for the chat system, including sending messages and handling API calls.
*/
import { getState, setCurrentSessionId } from '../../core/state.js';
import { getApiSettings, buildApiRequest, parseApiResponse, saveApiSettings } from '../api/api.main.js';
import { initChatUI, renderChatMessages, updateSidebar, handleNewChatUI } from './chat.ui.js';
import { listenToSessions, listenToProjects } from './chat.sessions.js';

let chatState = {
    selectedMode: 'ailey_coaching',
    defaultModel: 'gemini-2.5-flash-preview-04-17',
    customPrompt: '너는 나의 AI 러닝메이트야. 사용자의 모든 질문에 친구처럼 답변해줘.',
};

export function initChatSystem(elements, db, auth, apiSettings) {
    initChatUI(elements, handleChatSend, handleModeSelection, handleModelSelection);

    // Start listening to Firestore data
    listenToSessions(db);
    listenToProjects(db);
}

function handleModeSelection(mode, openPromptModalCallback) {
    chatState.selectedMode = mode;
    if (mode === 'custom') {
        openPromptModalCallback(chatState.customPrompt, (newPrompt) => {
            chatState.customPrompt = newPrompt;
            localStorage.setItem('customTutorPrompt', newPrompt);
        });
    }
}

function handleModelSelection(selectedValue, apiSettings) {
    if (apiSettings.provider && apiSettings.apiKey) {
        apiSettings.selectedModel = selectedValue;
        localStorage.setItem('userApiSettings', JSON.stringify(apiSettings));
    } else {
        chatState.defaultModel = selectedValue;
        localStorage.setItem('selectedAiModel', chatState.defaultModel);
    }
}

async function handleChatSend() {
    const { chatInput, chatSendBtn, chatWelcomeMessage, chatMessages } = getState().elements;
    const state = getState();

    if (chatInput.disabled) return;
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

    const currentSessionId = state.currentSessionId;

    if (!currentSessionId) {
        isNewSession = true;
        if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
        if (chatMessages) chatMessages.style.display = 'flex';

        currentMessages = [userMessage, loadingMessage];
        renderChatMessages({ messages: currentMessages }); // Render immediately with loading state

        const newSession = {
            title: query.substring(0, 40) + (query.length > 40 ? '...' : ''),
            messages: [userMessage], // Start with only the user message in Firestore
            mode: chatState.selectedMode,
            projectId: null, // Logic to get active project ID can be added here
            isPinned: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            sessionRef = await state.chatSessionsCollection.add(newSession);
            setCurrentSessionId(sessionRef.id);
        } catch (e) {
            console.error("Failed to create new session:", e);
            // Handle error UI
            chatInput.disabled = false;
            chatSendBtn.disabled = false;
            return;
        }
    } else {
        sessionRef = state.chatSessionsCollection.doc(currentSessionId);
        const currentSessionData = state.chatSessionsCache.find(s => s.id === currentSessionId);
        currentMessages = [...(currentSessionData.messages || []), userMessage, loadingMessage];
        renderChatMessages({ messages: currentMessages }); // Render with loading state

        await sessionRef.update({
            messages: firebase.firestore.FieldValue.arrayUnion(userMessage),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    const startTime = performance.now();
    try {
        let aiRes, usageData;
        const apiSettings = getApiSettings();
        const historyForApi = isNewSession ? [userMessage] : state.chatSessionsCache.find(s => s.id === state.currentSessionId)?.messages || [userMessage];

        if (apiSettings.provider && apiSettings.apiKey && apiSettings.selectedModel) {
            // Use user's paid API
            const requestDetails = buildApiRequest(apiSettings.provider, apiSettings.selectedModel, historyForApi, apiSettings.maxOutputTokens);
            const res = await fetch(requestDetails.url, requestDetails.options);
            if (!res.ok) { const errorBody = await res.text(); throw new Error(`API Error ${res.status}: ${errorBody}`); }
            const result = await res.json();
            const parsed = parseApiResponse(apiSettings.provider, result);
            aiRes = parsed.content;
            usageData = parsed.usage;
            if (usageData) { 
                apiSettings.tokenUsage.prompt += usageData.prompt; 
                apiSettings.tokenUsage.completion += usageData.completion; 
                saveApiSettings(false); // Save without closing modal
            }
        } else {
            // Use default free Google API
            const lastUserMessage = historyForApi[historyForApi.length - 1].content;
            const promptWithReasoning = `You are Ailey. Based on the following query, provide a step-by-step reasoning process if the query is complex. For simple queries, omit the reasoning part. The reasoning, if present, must follow the format: [REASONING_START]SUMMARY:{one-line summary}|||DETAIL:{detailed explanation}SUMMARY:{another summary}|||DETAIL:{another detail}[REASONING_END]. The final answer should be in a friendly, informal Korean tone. Query: "${lastUserMessage}"`;
            const apiMessages = [{ role: 'user', parts: [{ text: promptWithReasoning }] }];
            const selectedDefaultModel = localStorage.getItem('selectedAiModel') || chatState.defaultModel;

            // This is a placeholder for the actual API key which should be handled securely.
            const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY'; // Replace with your key management strategy

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedDefaultModel}:generateContent?key=${GOOGLE_API_KEY}`, {
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
            // The listener will handle the rendering, but we might want to force an update
            // or ensure the new session is selected in the UI.
            updateSidebar();
        }
    }
}