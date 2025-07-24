/* Module: chatData.js - Manages chat session and project data operations. */
import * as State from '../state.js';
import * as UI from '../ui.js';
import { showModal } from '../utils.js';
import { renderSidebarContent, handleNewChat } from './chatManager.js';
import { defaultModel } from '../config.js';

export function getNewProjectDefaultName() {
    const baseName = "새 프로젝트";
    const existingNames = new Set(State.localProjectsCache.map(p => p.name));
    if (!existingNames.has(baseName)) {
        return baseName;
    }
    let i = 2;
    while (existingNames.has(`${baseName} ${i}`)) {
        i++;
    }
    return `${baseName} ${i}`;
}

export async function createNewProject() {
    const newName = getNewProjectDefaultName();
    try {
        const newProjectRef = await State.projectsCollectionRef.add({
            name: newName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        State.setNewlyCreatedProjectId(newProjectRef.id);
    } catch (error) {
        console.error("Error creating new project:", error);
        alert("프로젝트 생성에 실패했습니다.");
    }
}

async function renameProject(projectId, newName) {
    if (!newName || !newName.trim() || !projectId) return;
    try {
        await State.projectsCollectionRef.doc(projectId).update({
            name: newName.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error renaming project:", error);
        alert("프로젝트 이름 변경에 실패했습니다.");
    }
}

export function deleteProject(projectId) {
    const project = State.localProjectsCache.find(p => p.id === projectId);
    if (!project) return;
    const message = `프로젝트 '${project.name}'를 삭제하시겠습니까? 프로젝트 안의 모든 대화는 '일반 대화'로 이동됩니다.`;
    showModal(message, async () => {
        try {
            const batch = State.db.batch();
            const sessionsToMove = State.localChatSessionsCache.filter(s => s.projectId === projectId);
            sessionsToMove.forEach(session => {
                const sessionRef = State.chatSessionsCollectionRef.doc(session.id);
                batch.update(sessionRef, { projectId: null });
            });
            const projectRef = State.projectsCollectionRef.doc(projectId);
            batch.delete(projectRef);
            await batch.commit();
        } catch (error) {
            console.error("Error deleting project:", error);
            alert("프로젝트 삭제에 실패했습니다.");
        }
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
        renderSidebarContent();
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

export function handleDeleteSession(sessionId) {
    if (!sessionId) return;
    const sessionToDelete = State.localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionToDelete) return;
    showModal(`'${sessionToDelete?.title || '이 대화'}'를 삭제하시겠습니까?`, () => {
        if (State.chatSessionsCollectionRef) {
            State.chatSessionsCollectionRef.doc(sessionId).delete().then(() => {
                console.log("Session deleted successfully");
                if (State.currentSessionId === sessionId) {
                    handleNewChat();
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
    } catch (error) {
        console.error("Error toggling pin status:", error);
    }
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

export async function moveSessionToProject(sessionId, newProjectId) {
    const session = State.localChatSessionsCache.find(s => s.id === sessionId);
    if (!session || session.projectId === newProjectId) return;
    try {
        await State.chatSessionsCollectionRef.doc(sessionId).update({
            projectId: newProjectId,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (newProjectId) {
            await State.projectsCollectionRef.doc(newProjectId).update({
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error("Error moving session:", error);
        alert("세션 이동에 실패했습니다.");
    }
}

export async function handleChatSend() {
    if (!UI.chatInput || UI.chatInput.disabled) return;
    const query = UI.chatInput.value.trim();
    if (!query) return;

    UI.chatInput.value = '';
    UI.chatInput.style.height = 'auto';
    UI.chatInput.disabled = true;
    UI.chatSendBtn.disabled = true;

    const userMessage = { role: 'user', content: query, timestamp: new Date() };
    const loadingMessage = { role: 'ai', status: 'loading', id: `loading-${Date.now()}` };
    let sessionRef;
    let currentMessages = [];
    let isNewSession = false;

    if (!State.currentSessionId) {
        isNewSession = true;
        const activeProject = document.querySelector('.project-header.active-drop-target');
        const newSessionProjectId = activeProject ? activeProject.closest('.project-container').dataset.projectId : null;
        if (UI.chatWelcomeMessage) UI.chatWelcomeMessage.style.display = 'none';
        if (UI.chatMessages) UI.chatMessages.style.display = 'flex';
        currentMessages = [userMessage, loadingMessage];
        // Render immediately with loading state
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
        // Render immediately with loading state
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

        if (State.userApiSettings.provider && State.userApiSettings.apiKey && State.userApiSettings.selectedModel) {
            const requestDetails = buildApiRequest(State.userApiSettings.provider, State.userApiSettings.selectedModel, historyForApi, State.userApiSettings.maxOutputTokens);
            const res = await fetch(requestDetails.url, requestDetails.options);
            if (!res.ok) { const errorBody = await res.text(); throw new Error(`API Error ${res.status}: ${errorBody}`); }
            const result = await res.json();
            const parsed = parseApiResponse(State.userApiSettings.provider, result);
            aiRes = parsed.content;
            usageData = parsed.usage;
            if (usageData) {
                const settings = { ...State.userApiSettings };
                settings.tokenUsage.prompt += usageData.prompt;
                settings.tokenUsage.completion += usageData.completion;
                State.setUserApiSettings(settings);
                localStorage.setItem('userApiSettings', JSON.stringify(settings));
            }
        } else {
            let promptWithReasoning;
            const lastUserMessage = historyForApi[historyForApi.length - 1].content;
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
        UI.chatInput.disabled = false;
        UI.chatSendBtn.disabled = false;
        UI.chatInput.focus();
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
        return { url: 'https://api.openai.com/v1/chat/completions', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${State.userApiSettings.apiKey}` }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) } };
    } else if (provider === 'anthropic') {
         return { url: 'https://api.anthropic.com/v1/messages', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': State.userApiSettings.apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) } };
    } else if (provider === 'google_paid') {
        const googleHistory = messages.map(msg => ({ role: msg.role === 'ai' ? 'model' : 'user', parts: [{ text: msg.content }] }));
        return { url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${State.userApiSettings.apiKey}`, options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: googleHistory, generationConfig: { maxOutputTokens: Number(maxTokens) || 2048 } }) } };
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