/* --- JS_chat-module.js --- */
import { db, chatSessionsCollectionRef, projectsCollectionRef } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_firebase-config.js';
import * as state from 'https://lemos999.github.io/ailey-bailey-canvas/JS_state.js';
import { showModal, removeContextMenu } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_ui-helpers.js';
import { renderSidebarContent, renderChatMessages, getChatDomElements } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_chat-ui.js';
import { buildApiRequest, parseApiResponse } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_api-handler.js';
import { saveApiSettings } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_api-settings.js';

export function listenToChatSessions() {
    return new Promise((resolve) => {
        if (!chatSessionsCollectionRef) return resolve();
        let unsubscribe = state.getUnsubscribeFromChatSessions();
        if (unsubscribe) unsubscribe();

        unsubscribe = chatSessionsCollectionRef.onSnapshot(snapshot => {
            const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            state.setLocalChatSessionsCache(sessions);
            renderSidebarContent();
            const currentSessionId = state.getCurrentSessionId();
            if (currentSessionId) {
                const currentSessionData = sessions.find(s => s.id === currentSessionId);
                if (!currentSessionData) {
                    handleNewChat();
                } else {
                    renderChatMessages(currentSessionData);
                }
            }
            resolve();
        }, error => {
            console.error("Chat session listener error:", error);
            resolve();
        });
        state.setUnsubscribeFromChatSessions(unsubscribe);
    });
}

export function listenToProjects() {
    return new Promise((resolve) => {
        if (!projectsCollectionRef) return resolve();
        let unsubscribe = state.getUnsubscribeFromProjects();
        if (unsubscribe) unsubscribe();

        unsubscribe = projectsCollectionRef.onSnapshot(snapshot => {
            const oldCache = state.getLocalProjectsCache();
            const projects = snapshot.docs.map(doc => ({
                id: doc.id,
                isExpanded: oldCache.find(p => p.id === doc.id)?.isExpanded ?? true,
                ...doc.data()
            }));
            state.setLocalProjectsCache(projects);
            renderSidebarContent();
            
            const newlyCreatedProjectId = state.getNewlyCreatedProjectId();
            if (newlyCreatedProjectId) {
                const newProjectElement = document.querySelector(.project-container[data-project-id="\"]);
                if (newProjectElement) {
                    startProjectRename(newlyCreatedProjectId);
                    state.setNewlyCreatedProjectId(null);
                }
            }
            resolve();
        }, error => {
            console.error("Project listener error:", error);
            resolve();
        });
        state.setUnsubscribeFromProjects(unsubscribe);
    });
}

export function selectSession(sessionId) {
    const dom = getChatDomElements();
    removeContextMenu();
    if (!sessionId) return;
    const sessionData = state.getLocalChatSessionsCache().find(s => s.id === sessionId);
    if (!sessionData) return;
    state.setCurrentSessionId(sessionId);
    Object.values(state.getActiveTimers()).forEach(timers => timers.forEach(clearInterval));
    renderSidebarContent();
    dom.chatWelcomeMessage.style.display = 'none';
    dom.chatMessages.style.display = 'flex';
    renderChatMessages(sessionData);
    dom.chatSessionTitle.textContent = sessionData.title || '대화';
    dom.deleteSessionBtn.style.display = 'inline-block';
    dom.chatInput.disabled = false;
    dom.chatSendBtn.disabled = false;
    dom.chatInput.focus();
}

export function handleNewChat() {
    const dom = getChatDomElements();
    state.setCurrentSessionId(null);
    Object.values(state.getActiveTimers()).forEach(timers => timers.forEach(clearInterval));
    renderSidebarContent();
    dom.chatMessages.innerHTML = '';
    dom.chatMessages.style.display = 'none';
    dom.chatWelcomeMessage.style.display = 'flex';
    dom.chatSessionTitle.textContent = 'AI 러닝메이트';
    dom.deleteSessionBtn.style.display = 'none';
    dom.chatInput.disabled = false;
    dom.chatInput.value = '';
    dom.chatSendBtn.disabled = false;
}

export async function handleChatSend() {
    const dom = getChatDomElements();
    if (dom.chatInput.disabled) return;
    const query = dom.chatInput.value.trim();
    if (!query) return;

    dom.chatInput.value = '';
    dom.chatInput.style.height = 'auto';
    dom.chatInput.disabled = true;
    dom.chatSendBtn.disabled = true;

    let sessionRef;
    let isNewSession = !state.getCurrentSessionId();

    if (isNewSession) {
        const newSessionData = {
            title: query.substring(0, 40) + (query.length > 40 ? '...' : ''),
            messages: [{ role: 'user', content: query, timestamp: firebase.firestore.FieldValue.serverTimestamp() }],
            mode: state.getSelectedMode(),
            projectId: document.querySelector('.project-header.active-drop-target')?.closest('.project-container')?.dataset.projectId || null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        sessionRef = await chatSessionsCollectionRef.add(newSessionData);
        state.setCurrentSessionId(sessionRef.id);
    } else {
        sessionRef = chatSessionsCollectionRef.doc(state.getCurrentSessionId());
        await sessionRef.update({
            messages: firebase.firestore.FieldValue.arrayUnion({ role: 'user', content: query, timestamp: firebase.firestore.FieldValue.serverTimestamp() }),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    const currentSession = state.getLocalChatSessionsCache().find(s => s.id === sessionRef.id);
    const messagesForRender = [...(currentSession?.messages.map(m=>({...m, timestamp:m.timestamp?.toDate()})) || []), { role: 'user', content: query }, { role: 'ai', status: 'loading', id: loading-\ }];
    renderChatMessages({ messages: messagesForRender });

    const startTime = performance.now();
    try {
        const apiSettings = state.getUserApiSettings();
        const history = state.getLocalChatSessionsCache().find(s => s.id === sessionRef.id)?.messages.map(m => ({...m, timestamp: m.timestamp?.toDate()})) || [];
        let aiRes, usageData;

        if (apiSettings.provider && apiSettings.apiKey && apiSettings.selectedModel) {
            const request = buildApiRequest(apiSettings.provider, apiSettings.selectedModel, history, apiSettings.maxOutputTokens);
            const res = await fetch(request.url, request.options);
            if (!res.ok) throw new Error(API Error \: \);
            const result = await res.json();
            const parsed = parseApiResponse(apiSettings.provider, result);
            aiRes = parsed.content;
            if (parsed.usage) {
                apiSettings.tokenUsage.prompt += parsed.usage.prompt;
                apiSettings.tokenUsage.completion += parsed.usage.completion;
                saveApiSettings(false);
            }
        } else {
            const prompt = You are Ailey. Based on the following query, provide a step-by-step reasoning process if the query is complex. For simple queries, omit the reasoning part. The reasoning, if present, must follow the format: [REASONING_START]SUMMARY:{one-line summary}|||DETAIL:{detailed explanation}[REASONING_END]. The final answer should be in a friendly, informal Korean tone. Query: "\";
            const model = localStorage.getItem('selectedAiModel') || state.getDefaultModel();
            const res = await fetch(https://generativelanguage.googleapis.com/v1beta/models/\:generateContent?key=, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
            });
            if (!res.ok) throw new Error(Google API Error \);
            const result = await res.json();
            aiRes = result.candidates?.[0]?.content?.parts?.[0]?.text || "답변을 가져올 수 없습니다.";
        }

        const duration = ((performance.now() - startTime) / 1000).toFixed(2);
        const aiMessage = { role: 'ai', content: aiRes, timestamp: firebase.firestore.FieldValue.serverTimestamp(), duration: duration };
        
        await sessionRef.update({
            messages: firebase.firestore.FieldValue.arrayUnion(aiMessage),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

    } catch (e) {
        console.error("Chat send error:", e);
        const errorMessage = { role: 'ai', content: API 오류가 발생했습니다: \, timestamp: firebase.firestore.FieldValue.serverTimestamp() };
        await sessionRef.update({ messages: firebase.firestore.FieldValue.arrayUnion(errorMessage) });
    } finally {
        dom.chatInput.disabled = false;
        dom.chatSendBtn.disabled = false;
        dom.chatInput.focus();
    }
}
