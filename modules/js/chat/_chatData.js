/* Module: Chat Data Manager */
import * as ui from '../_uiElements.js';
import * as state from '../_state.js';
import { showModal, updateStatus, togglePanel } from '../_utils.js';
import { renderSidebarContent, renderChatMessages, handleNewChat, showSessionContextMenu } from './_chatUI.js';

// --- Project Functions ---
export async function createNewProject() {
    const getNewProjectDefaultName = () => {
        const baseName = "새 프로젝트";
        const existingNames = new Set(state.localProjectsCache.map(p => p.name));
        if (!existingNames.has(baseName)) return baseName;
        let i = 2;
        while (existingNames.has(`${baseName} ${i}`)) { i++; }
        return `${baseName} ${i}`;
    };
    const newName = getNewProjectDefaultName();
    try {
        const newProjectRef = await state.projectsCollectionRef.add({
            name: newName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        state.setNewlyCreatedProjectId(newProjectRef.id);
    } catch (error) {
        console.error("Error creating new project:", error);
        alert("프로젝트 생성에 실패했습니다.");
    }
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

export async function deleteProject(projectId) {
    const project = state.localProjectsCache.find(p => p.id === projectId);
    if (!project) return;
    const message = `프로젝트 '${project.name}'를 삭제하시겠습니까? 프로젝트 안의 모든 대화는 '일반 대화'로 이동됩니다.`;
    showModal(message, async () => {
        try {
            const batch = state.db.batch();
            const sessionsToMove = state.localChatSessionsCache.filter(s => s.projectId === projectId);
            sessionsToMove.forEach(session => {
                const sessionRef = state.chatSessionsCollectionRef.doc(session.id);
                batch.update(sessionRef, { projectId: null });
            });
            const projectRef = state.projectsCollectionRef.doc(projectId);
            batch.delete(projectRef);
            await batch.commit();
        } catch (error) {
            console.error("Error deleting project:", error);
            alert("프로젝트 삭제에 실패했습니다.");
        }
    });
}

export function toggleProjectExpansion(projectId) {
    const project = state.localProjectsCache.find(p => p.id === projectId);
    if (project) {
        project.isExpanded = !project.isExpanded;
        renderSidebarContent();
    }
}

export function showProjectContextMenu(projectId, buttonElement) {
    if(state.currentOpenContextMenu) state.currentOpenContextMenu.remove();
    state.setCurrentOpenContextMenu(null);
    const rect = buttonElement.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'project-context-menu'; 
    menu.style.position = 'absolute';
    menu.style.top = `${rect.bottom + 2}px`;
    menu.style.right = '5px';
    menu.innerHTML = `
        <button class="context-menu-item" data-action="rename">이름 변경</button>
        <div class="context-menu-separator"></div>
        <button class="context-menu-item" data-action="delete">삭제</button>
    `;
    ui.sessionListContainer.appendChild(menu);
    menu.style.display = 'block';
    state.setCurrentOpenContextMenu(menu);

    menu.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = e.target.closest('.context-menu-item').dataset.action;
        if (action === 'rename') startProjectRename(projectId);
        else if (action === 'delete') deleteProject(projectId);
        if(state.currentOpenContextMenu) state.currentOpenContextMenu.remove();
        state.setCurrentOpenContextMenu(null);
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
        if (newName && newName !== originalTitle) renameProject(projectId, newName);
        else renderSidebarContent();
    };
    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); }
    });
}

// --- Session Functions ---
export function selectSession(sessionId) {
    if(state.currentOpenContextMenu) state.currentOpenContextMenu.remove();
    state.setCurrentOpenContextMenu(null);
    if (!sessionId) return;
    const sessionData = state.localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionData) return;
    state.setCurrentSessionId(sessionId);
    Object.values(state.activeTimers).forEach(timers => timers.forEach(clearInterval));
    renderSidebarContent();
    if (ui.chatWelcomeMessage) ui.chatWelcomeMessage.style.display = 'none';
    if (ui.chatMessages) ui.chatMessages.style.display = 'flex';
    renderChatMessages(sessionData);
    if (ui.chatSessionTitle) ui.chatSessionTitle.textContent = sessionData.title || '대화';
    if (ui.deleteSessionBtn) ui.deleteSessionBtn.style.display = 'inline-block';
    if (ui.chatInput) ui.chatInput.disabled = false;
    if (ui.chatSendBtn) ui.chatSendBtn.disabled = false;
    ui.chatInput.focus();
}

export function handleDeleteSession(sessionId) {
    if (!sessionId) return;
    const sessionToDelete = state.localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionToDelete) return;
    showModal(`'${sessionToDelete?.title || '이 대화'}'를 삭제하시겠습니까?`, () => {
        if (state.chatSessionsCollectionRef) {
            state.chatSessionsCollectionRef.doc(sessionId).delete().then(() => {
                if (state.currentSessionId === sessionId) handleNewChat();
            }).catch(e => console.error("세션 삭제 실패:", e));
        }
    });
}

export async function toggleChatPin(sessionId) {
    if (!state.chatSessionsCollectionRef || !sessionId) return;
    const sessionRef = state.chatSessionsCollectionRef.doc(sessionId);
    const currentSession = state.localChatSessionsCache.find(s => s.id === sessionId);
    if (!currentSession) return;
    try {
        await sessionRef.update({ 
            isPinned: !(currentSession.isPinned || false),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
        });
    } catch (error) { console.error("Error toggling pin status:", error); }
}

export async function moveSessionToProject(sessionId, newProjectId) {
    const session = state.localChatSessionsCache.find(s => s.id === sessionId);
    const targetProjectId = newProjectId === 'null' ? null : newProjectId;
    if (!session || session.projectId === targetProjectId) return;
    try {
        await state.chatSessionsCollectionRef.doc(sessionId).update({ projectId: targetProjectId, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        if (targetProjectId) { await state.projectsCollectionRef.doc(targetProjectId).update({ updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); }
    } catch (error) { console.error("Error moving session:", error); alert("세션 이동에 실패했습니다."); }
}

export async function renameSession(sessionId, newTitle) {
    if (!newTitle || !sessionId) return;
    try {
        await state.chatSessionsCollectionRef.doc(sessionId).update({ title: newTitle, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    } catch (error) { console.error("Error renaming session:", error); alert("세션 이름 변경에 실패했습니다."); }
}

export function startSessionRename(sessionId) {
    const sessionItem = document.querySelector(`.session-item[data-session-id="${sessionId}"]`);
    if (!sessionItem) return;
    const titleSpan = sessionItem.querySelector('.session-item-title');
    if (!titleSpan) return;
    const originalTitle = titleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text'; input.className = 'project-title-input'; input.value = originalTitle;
    titleSpan.replaceWith(input);
    input.focus(); input.select();
    const finishEditing = () => {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== originalTitle) renameSession(sessionId, newTitle);
        else renderSidebarContent();
    };
    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); }
    });
}

// --- Chat Send Logic ---
export async function handleChatSend() {
    if (!ui.chatInput || ui.chatInput.disabled) return;
    const query = ui.chatInput.value.trim();
    if (!query) return;

    ui.chatInput.value = '';
    ui.chatInput.style.height = 'auto';
    ui.chatInput.disabled = true;
    ui.chatSendBtn.disabled = true;

    const userMessage = { role: 'user', content: query, timestamp: new Date() };
    const loadingMessage = { role: 'ai', status: 'loading', id: `loading-${Date.now()}` };
    let sessionRef;
    let isNewSession = false;

    if (!state.currentSessionId) {
        isNewSession = true;
        if (ui.chatWelcomeMessage) ui.chatWelcomeMessage.style.display = 'none';
        if (ui.chatMessages) ui.chatMessages.style.display = 'flex';
        renderChatMessages({ messages: [userMessage, loadingMessage] });
        const newSession = {
            title: query.substring(0, 40) + (query.length > 40 ? '...' : ''),
            messages: [userMessage],
            mode: state.selectedMode,
            projectId: null,
            isPinned: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        sessionRef = await state.chatSessionsCollectionRef.add(newSession);
        state.setCurrentSessionId(sessionRef.id);
    } else {
        sessionRef = state.chatSessionsCollectionRef.doc(state.currentSessionId);
        const currentSessionData = state.localChatSessionsCache.find(s => s.id === state.currentSessionId);
        renderChatMessages({ messages: [...(currentSessionData.messages || []), userMessage, loadingMessage] });
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
                const newSettings = {...state.userApiSettings};
                newSettings.tokenUsage.prompt += usageData.prompt;
                newSettings.tokenUsage.completion += usageData.completion;
                state.setUserApiSettings(newSettings);
                const { saveApiSettings } = require('../_apiManager.js');
                saveApiSettings(false);
            }
        } else {
            let promptWithReasoning = `You are Ailey. Based on the following query, provide a step-by-step reasoning process if the query is complex. For simple queries, omit the reasoning part. The reasoning, if present, must follow the format: [REASONING_START]SUMMARY:{one-line summary}|||DETAIL:{detailed explanation}[REASONING_END]. The final answer should be in a friendly, informal Korean tone. Query: "${query}"`;
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
        ui.chatInput.disabled = false;
        ui.chatSendBtn.disabled = false;
        ui.chatInput.focus();
        if (isNewSession) renderSidebarContent();
    }
}

function buildApiRequest(provider, model, messages, maxTokens) {
    const history = messages.map(msg => ({ role: msg.role === 'ai' ? 'assistant' : 'user', content: msg.content }));
    if (provider === 'openai') { return { url: 'https://api.openai.com/v1/chat/completions', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.userApiSettings.apiKey}` }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) } }; }
    else if (provider === 'anthropic') { return { url: 'https://api.anthropic.com/v1/messages', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': state.userApiSettings.apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) } }; }
    else if (provider === 'google_paid') {
        const googleHistory = messages.map(msg => ({ role: msg.role === 'ai' ? 'model' : 'user', parts: [{ text: msg.content }] }));
        return { url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${state.userApiSettings.apiKey}`, options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: googleHistory, generationConfig: { maxOutputTokens: Number(maxTokens) || 2048 } }) } };
    }
    throw new Error(`Unsupported provider: ${provider}`);
}

function parseApiResponse(provider, result) {
    try {
        if (provider === 'openai') return { content: result.choices[0].message.content, usage: { prompt: result.usage.prompt_tokens, completion: result.usage.completion_tokens } };
        else if (provider === 'anthropic') return { content: result.content[0].text, usage: { prompt: result.usage.input_tokens, completion: result.usage.output_tokens } };
        else if (provider === 'google_paid') return { content: result.candidates[0].content.parts[0].text, usage: null };
    } catch (error) {
        console.error(`Error parsing ${provider} response:`, error, result);
        return { content: 'API 응답을 파싱하는 중 오류가 발생했습니다.', usage: null };
    }
    return { content: '알 수 없는 제공사입니다.', usage: null };
}

// --- Data Backup & Restore ---
export async function handleSystemReset() {
    const message = "정말로 이 캔버스의 모든 프로젝트, 채팅, 메모 기록을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.";
    showModal(message, async () => {
        if (!state.db || !state.currentUser) { alert("초기화 실패: DB 연결을 확인해주세요."); return; }
        updateStatus("시스템 초기화 중...", true);
        const batch = state.db.batch();
        try {
            const notesSnapshot = await state.notesCollection.get();
            notesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            const chatsSnapshot = await state.chatSessionsCollectionRef.get();
            chatsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            const projectsSnapshot = await state.projectsCollectionRef.get();
            projectsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            localStorage.removeItem('userApiSettings');
            localStorage.removeItem('selectedAiModel');
            alert("✅ 모든 데이터가 성공적으로 삭제되었습니다. 페이지를 새로고침하여 시스템을 다시 시작합니다.");
            location.reload();
        } catch (error) { console.error("❌ 시스템 초기화 실패:", error); alert(`시스템 초기화 중 오류가 발생했습니다: ${error.message}`); updateStatus("초기화 실패 ❌", false); }
    });
}

export function exportAllData() {
    if (state.localNotesCache.length === 0 && state.localChatSessionsCache.length === 0 && state.localProjectsCache.length === 0) {
        showModal("백업할 데이터가 없습니다.", () => {});
        return;
    }
    const processTimestamp = (item) => {
        const newItem = { ...item };
        if (newItem.createdAt?.toDate) newItem.createdAt = newItem.createdAt.toDate().toISOString();
        if (newItem.updatedAt?.toDate) newItem.updatedAt = newItem.updatedAt.toDate().toISOString();
        if (Array.isArray(newItem.messages)) {
            newItem.messages = newItem.messages.map(msg => {
                const newMsg = { ...msg };
                if (newMsg.timestamp?.toDate) newMsg.timestamp = newMsg.timestamp.toDate().toISOString();
                return newMsg;
            });
        }
        return newItem;
    };
    const dataToExport = {
        backupVersion: '2.0',
        backupDate: new Date().toISOString(),
        notes: state.localNotesCache.map(processTimestamp),
        chatSessions: state.localChatSessionsCache.map(processTimestamp),
        projects: state.localProjectsCache.map(processTimestamp)
    };
    const str = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ailey-canvas-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

export function handleRestoreClick() {
    if (ui.fileImporter) ui.fileImporter.click();
}

export async function importAllData(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.backupVersion !== '2.0') { throw new Error("호환되지 않는 백업 파일 버전입니다."); }
            const message = `파일에서 ${data.projects?.length||0}개의 프로젝트, ${data.chatSessions?.length||0}개의 채팅, ${data.notes?.length||0}개의 메모를 발견했습니다. 현재 데이터를 덮어씁니다. 계속하시겠습니까?`;
            showModal(message, async () => {
                try {
                    updateStatus('복원 중...', true);
                    const batch = state.db.batch();
                    const toFirestoreTimestamp = ts => ts ? firebase.firestore.Timestamp.fromDate(new Date(ts)) : firebase.firestore.FieldValue.serverTimestamp();
                    (data.notes || []).forEach(note => { const { id, ...dataToWrite } = note; dataToWrite.createdAt = toFirestoreTimestamp(note.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(note.updatedAt); batch.set(state.notesCollection.doc(id), dataToWrite); });
                    (data.chatSessions || []).forEach(session => { const { id, ...dataToWrite } = session; dataToWrite.createdAt = toFirestoreTimestamp(session.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(session.updatedAt); if(dataToWrite.messages) dataToWrite.messages.forEach(m=>m.timestamp=toFirestoreTimestamp(m.timestamp)); batch.set(state.chatSessionsCollectionRef.doc(id), dataToWrite); });
                    (data.projects || []).forEach(project => { const { id, ...dataToWrite } = project; dataToWrite.createdAt = toFirestoreTimestamp(project.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(project.updatedAt); batch.set(state.projectsCollectionRef.doc(id), dataToWrite); });
                    await batch.commit();
                    updateStatus('복원 완료 ✓', true);
                    showModal("데이터 복원이 완료되었습니다. 페이지를 새로고침합니다.", () => location.reload());
                } catch (error) { console.error("데이터 복원 실패:", error); updateStatus('복원 실패 ❌', false); showModal(`데이터 복원 중 오류: ${error.message}`, () => {}); }
            });
        } catch (error) { console.error("File parsing error:", error); showModal(`파일 읽기 오류: ${error.message}`, () => {}); }
        finally { event.target.value = null; }
    };
    reader.readAsText(file);
}