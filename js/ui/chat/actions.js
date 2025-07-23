/*
--- Ailey & Bailey Canvas ---
File: js/ui/chat/actions.js
Version: 11.0 (Modular)
Description: Handles user actions within the chat like sending messages, managing projects, etc.
*/

import { getState, updateState } from '../../core/state.js';
import { showModal } from '../../utils/helpers.js';
import { chatInput, chatSendBtn, chatWelcomeMessage, chatMessages } from '../../utils/domElements.js';
import { renderChatMessages, renderSidebarContent, startProjectRename } from './render.js';

/**
 * Main function to handle sending a chat message from the user.
 */
export async function handleChatSend() {
    if (!chatInput || chatInput.disabled) return;
    const query = chatInput.value.trim();
    if (!query) return;

    chatInput.value = '';
    chatInput.style.height = 'auto';
    chatInput.disabled = true;
    chatSendBtn.disabled = true;

    let { currentSessionId, localChatSessionsCache, chatSessionsCollectionRef, selectedMode, userApiSettings } = getState();

    const userMessage = { role: 'user', content: query, timestamp: new Date() };
    const loadingMessage = { role: 'ai', status: 'loading', id: loading-\ };
    let sessionRef;
    let currentMessages = [];
    let isNewSession = false;

    if (!currentSessionId) {
        isNewSession = true;
        const activeProject = document.querySelector('.project-header.active-drop-target');
        const newSessionProjectId = activeProject ? activeProject.closest('.project-container').dataset.projectId : null;
        if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
        if (chatMessages) chatMessages.style.display = 'flex';
        
        currentMessages = [userMessage, loadingMessage];
        renderChatMessages({ messages: currentMessages }); // Render immediately with loading state
        
        const newSession = {
            title: query.substring(0, 40) + (query.length > 40 ? '...' : ''),
            messages: [userMessage],
            mode: selectedMode,
            projectId: newSessionProjectId,
            isPinned: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        sessionRef = await chatSessionsCollectionRef.add(newSession);
        updateState('currentSessionId', sessionRef.id);
        currentSessionId = sessionRef.id;

    } else {
        sessionRef = chatSessionsCollectionRef.doc(currentSessionId);
        const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId);
        currentMessages = [...(currentSessionData.messages || []), userMessage, loadingMessage];
        
        renderChatMessages({ messages: currentMessages }); // Render immediately with loading state
        
        await sessionRef.update({
            messages: firebase.firestore.FieldValue.arrayUnion(userMessage),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    const startTime = performance.now();
    try {
        const { defaultModel } = getState();
        let aiRes, usageData;
        const historyForApi = (isNewSession ? [userMessage] : localChatSessionsCache.find(s => s.id === currentSessionId)?.messages || [userMessage]);

        // Prioritize user's own API key
        if (userApiSettings.provider && userApiSettings.apiKey && userApiSettings.selectedModel) {
            const requestDetails = buildApiRequest(userApiSettings.provider, userApiSettings.selectedModel, historyForApi, userApiSettings.maxOutputTokens);
            const res = await fetch(requestDetails.url, requestDetails.options);
            if (!res.ok) { const errorBody = await res.text(); throw new Error(API Error \: \); }
            const result = await res.json();
            const parsed = parseApiResponse(userApiSettings.provider, result);
            aiRes = parsed.content;
            usageData = parsed.usage;
            if (usageData) {
                userApiSettings.tokenUsage.prompt += usageData.prompt;
                userApiSettings.tokenUsage.completion += usageData.completion;
                updateState('userApiSettings', userApiSettings);
                saveApiSettings(false); // Save without closing modal
            }
        } else {
            // Fallback to default API
            const lastUserMessage = historyForApi[historyForApi.length - 1].content;
            const promptWithReasoning = You are Ailey. Based on the following query, provide a step-by-step reasoning process if the query is complex. For simple queries, omit the reasoning part. The reasoning, if present, must follow the format: [REASONING_START]SUMMARY:{one-line summary}|||DETAIL:{detailed explanation}SUMMARY:{another summary}|||DETAIL:{another detail}[REASONING_END]. The final answer should be in a friendly, informal Korean tone. Query: "\";
            const apiMessages = [{ role: 'user', parts: [{ text: promptWithReasoning }] }];
            const selectedDefaultModel = localStorage.getItem('selectedAiModel') || defaultModel;
            // The API key for the default model should be securely handled, e.g., via a backend proxy or injected config.
            // This is a placeholder for the actual API key.
            const DEFAULT_API_KEY = "YOUR_DEFAULT_GOOGLE_API_KEY"; 
            const res = await fetch(https://generativelanguage.googleapis.com/v1beta/models/\:generateContent?key=\, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: apiMessages })
            });
            if (!res.ok) throw new Error(Google API Error \);
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
        const errorMessage = { role: 'ai', content: API 오류가 발생했습니다: \, timestamp: new Date() };
        if(sessionRef) {
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

/**
 * Builds the appropriate API request based on the provider.
 */
function buildApiRequest(provider, model, messages, maxTokens) {
    const { apiKey } = getState().userApiSettings;
    const history = messages.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.content
    }));

    if (provider === 'openai') {
        return { url: 'https://api.openai.com/v1/chat/completions', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': Bearer \ }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) } };
    } else if (provider === 'anthropic') {
         return { url: 'https://api.anthropic.com/v1/messages', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) } };
    } else if (provider === 'google_paid') {
        const googleHistory = messages.map(msg => ({ role: msg.role === 'ai' ? 'model' : 'user', parts: [{ text: msg.content }] }));
        return { url: https://generativelanguage.googleapis.com/v1beta/models/\:generateContent?key=\, options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: googleHistory, generationConfig: { maxOutputTokens: Number(maxTokens) || 2048 } }) } };
    }
    throw new Error(Unsupported provider: \);
}

/**
 * Parses the response from different API providers into a standardized format.
 */
function parseApiResponse(provider, result) {
    try {
        if (provider === 'openai') { return { content: result.choices[0].message.content, usage: { prompt: result.usage.prompt_tokens, completion: result.usage.completion_tokens } }; }
        else if (provider === 'anthropic') { return { content: result.content[0].text, usage: { prompt: result.usage.input_tokens, completion: result.usage.output_tokens } }; }
        else if (provider === 'google_paid') { return { content: result.candidates[0].content.parts[0].text, usage: null }; }
    } catch (error) {
        console.error(Error parsing \ response:, error, result);
        return { content: 'API 응답을 파싱하는 중 오류가 발생했습니다.', usage: null };
    }
    return { content: '알 수 없는 제공사입니다.', usage: null };
}


/**
 * Toggles the pinned status of a chat session.
 * @param {string} sessionId The ID of the session to pin/unpin.
 */
export async function toggleChatPin(sessionId) {
    const { chatSessionsCollectionRef, localChatSessionsCache } = getState();
    if (!chatSessionsCollectionRef || !sessionId) return;
    
    const sessionRef = chatSessionsCollectionRef.doc(sessionId);
    const currentSession = localChatSessionsCache.find(s => s.id === sessionId);
    if (!currentSession) return;
    
    try {
        await sessionRef.update({
            isPinned: !(currentSession.isPinned || false),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error toggling pin status:", error);
    }
}

/**
 * Creates a new project with a default name.
 */
export async function createNewProject() {
    const { projectsCollectionRef, localProjectsCache } = getState();
    const baseName = "새 프로젝트";
    let newName = baseName;
    const existingNames = new Set(localProjectsCache.map(p => p.name));
    
    if (existingNames.has(baseName)) {
        let i = 2;
        while (existingNames.has(\ \)) {
            i++;
        }
        newName = \ \;
    }

    try {
        const newProjectRef = await projectsCollectionRef.add({
            name: newName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        updateState('newlyCreatedProjectId', newProjectRef.id);
    } catch (error) {
        console.error("Error creating new project:", error);
        alert("프로젝트 생성에 실패했습니다.");
    }
}

/**
 * Renames a project.
 * @param {string} projectId The ID of the project to rename.
 * @param {string} newName The new name for the project.
 */
export async function renameProject(projectId, newName) {
    const { projectsCollectionRef } = getState();
    if (!newName || !newName.trim() || !projectId) return;
    try {
        await projectsCollectionRef.doc(projectId).update({
            name: newName.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error renaming project:", error);
        alert("프로젝트 이름 변경에 실패했습니다.");
    }
}

/**
 * Deletes a project and moves its sessions to 'unassigned'.
 * @param {string} projectId The ID of the project to delete.
 */
export async function deleteProject(projectId) {
    const { projectsCollectionRef, localProjectsCache, localChatSessionsCache, db } = getState();
    const project = localProjectsCache.find(p => p.id === projectId);
    if (!project) return;

    const message = 프로젝트 '\'를 삭제하시겠습니까? 프로젝트 안의 모든 대화는 '일반 대화'로 이동됩니다.;
    showModal(message, async () => {
        try {
            const batch = db.batch();
            const sessionsToMove = localChatSessionsCache.filter(s => s.projectId === projectId);
            
            sessionsToMove.forEach(session => {
                const sessionRef = projectsCollectionRef.firestore.collection(session.ref.parent.path).doc(session.id);
                batch.update(sessionRef, { projectId: null });
            });

            const projectRef = projectsCollectionRef.doc(projectId);
            batch.delete(projectRef);

            await batch.commit();
        } catch (error) {
            console.error("Error deleting project:", error);
            alert("프로젝트 삭제에 실패했습니다.");
        }
    });
}
