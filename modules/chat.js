/* --- Module: Chat Panel Feature --- */
import * as dom from './dom.js';
import { db, chatSessionsCollectionRef, projectsCollectionRef } from './firebase.js';
import * as state from './state.js';
import { showModal, removeContextMenu, clearTimers, typewriterEffect } from './ui.js';
import { saveApiSettings } from './apiSettings.js';

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
                    handleNewChat(); // 현재 세션이 삭제된 경우
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

function getRelativeDateGroup(timestamp, isPinned = false) {
    if (isPinned) {
        return { key: 0, label: '?? 고정됨' };
    }
    if (!timestamp) {
        return { key: 99, label: '날짜 정보 없음' };
    }
    const now = new Date();
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    now.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays < 1) return { key: 1, label: '오늘' };
    if (diffDays < 2) return { key: 2, label: '어제' };
    if (diffDays < 7) return { key: 3, label: '지난 7일' };
    
    const nowMonth = now.getMonth();
    const dateMonth = date.getMonth();
    const nowYear = now.getFullYear();
    const dateYear = date.getFullYear();

    if (nowYear === dateYear && nowMonth === dateMonth) {
        return { key: 4, label: '이번 달' };
    }
    return { key: 5, label: \년 \월 };
}

export function renderSidebarContent() {
    if (!dom.sessionListContainer) return;
    const searchTerm = dom.searchSessionsInput.value.toLowerCase();
    dom.sessionListContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();

    const localProjectsCache = state.getLocalProjectsCache();
    const localChatSessionsCache = state.getLocalChatSessionsCache();
    
    const filteredProjects = localProjectsCache.filter(p => p.name?.toLowerCase().includes(searchTerm));
    const filteredSessions = localChatSessionsCache.filter(s => (s.title || '새 대화').toLowerCase().includes(searchTerm));

    // 프로젝트 렌더링
    const sortedProjects = [...(searchTerm ? filteredProjects : localProjectsCache)].sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
    if (sortedProjects.length > 0) {
        const projectGroupHeader = document.createElement('div');
        projectGroupHeader.className = 'session-group-header';
        projectGroupHeader.textContent = '?? 프로젝트';
        fragment.appendChild(projectGroupHeader);

        sortedProjects.forEach(project => {
            const sessionsInProject = localChatSessionsCache.filter(s => s.projectId === project.id).sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
            if (searchTerm && !project.name.toLowerCase().includes(searchTerm) && sessionsInProject.filter(s => (s.title || '').toLowerCase().includes(searchTerm)).length === 0) {
                return;
            }
            fragment.appendChild(createProjectItem(project, sessionsInProject, searchTerm));
        });
    }

    // 일반 대화 렌더링
    const unassignedSessions = filteredSessions.filter(s => !s.projectId);
    if (unassignedSessions.length > 0) {
        const generalGroupHeader = document.createElement('div');
        generalGroupHeader.className = 'session-group-header';
        generalGroupHeader.textContent = '?? 일반 대화';
        fragment.appendChild(generalGroupHeader);
        
        unassignedSessions.forEach(session => {
            session.dateGroup = getRelativeDateGroup(session.updatedAt || session.createdAt, session.isPinned);
        });

        const groupedSessions = unassignedSessions.reduce((acc, session) => {
            const label = session.dateGroup.label;
            if (!acc[label]) acc[label] = { key: session.dateGroup.key, items: [] };
            acc[label].items.push(session);
            return acc;
        }, {});

        const sortedGroupLabels = Object.keys(groupedSessions).sort((a, b) => groupedSessions[a].key - groupedSessions[b].key);
        sortedGroupLabels.forEach(label => {
            const header = document.createElement('div');
            header.className = 'date-group-header';
            header.textContent = label;
            fragment.appendChild(header);
            const group = groupedSessions[label];
            group.items.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
            group.items.forEach(session => fragment.appendChild(createSessionItem(session)));
        });
    }

    dom.sessionListContainer.appendChild(fragment);
}

function createProjectItem(project, sessions, searchTerm) {
    const projectContainer = document.createElement('div');
    projectContainer.className = 'project-container';
    projectContainer.dataset.projectId = project.id;
    const projectHeader = document.createElement('div');
    projectHeader.className = 'project-header';
    projectHeader.innerHTML = 
        <span class="project-toggle-icon \"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" /></svg></span>
        <span class="project-icon"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2Z" /></svg></span>
        <span class="project-title">\</span>
        <button class="project-actions-btn" title="프로젝트 메뉴"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" /></svg></button>
    ;
    const sessionsContainer = document.createElement('div');
    sessionsContainer.className = sessions-in-project \;
    sessions.forEach(session => {
        if (!searchTerm || (session.title || '새 대화').toLowerCase().includes(searchTerm)) {
            sessionsContainer.appendChild(createSessionItem(session));
        }
    });
    projectContainer.appendChild(projectHeader);
    projectContainer.appendChild(sessionsContainer);
    return projectContainer;
}

function createSessionItem(session) {
    const item = document.createElement('div');
    item.className = 'session-item';
    item.dataset.sessionId = session.id;
    item.draggable = true;
    if (session.id === state.getCurrentSessionId()) item.classList.add('active');
    
    item.innerHTML = 
        <div class="session-item-title">\</div>
        <button class="session-pin-btn \" title="\">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>
        </button>
    ;
    return item;
}

export async function createNewProject() {
    const baseName = "새 프로젝트";
    const existingNames = new Set(state.getLocalProjectsCache().map(p => p.name));
    let newName = baseName;
    let i = 2;
    while (existingNames.has(newName)) {
        newName = \ \;
    }
    try {
        const newProjectRef = await projectsCollectionRef.add({
            name: newName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        state.setNewlyCreatedProjectId(newProjectRef.id);
    } catch (error) {
        console.error("Error creating new project:", error);
    }
}

export async function renameProject(projectId, newName) {
    if (!newName?.trim() || !projectId) return;
    await projectsCollectionRef.doc(projectId).update({ 
        name: newName.trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

export function startProjectRename(projectId) {
    const titleSpan = document.querySelector(.project-container[data-project-id="\"] .project-title);
    if (!titleSpan) return;
    const originalTitle = titleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text'; input.className = 'project-title-input'; input.value = originalTitle;
    titleSpan.replaceWith(input);
    input.focus(); input.select();
    const finish = () => {
        const newName = input.value.trim();
        if (newName && newName !== originalTitle) {
            renameProject(projectId, newName);
        }
        renderSidebarContent();
    };
    input.addEventListener('blur', finish);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); } });
}

export async function deleteProject(projectId) {
    const project = state.getLocalProjectsCache().find(p => p.id === projectId);
    if (!project) return;
    showModal(프로젝트 '\'를 삭제하시겠습니까? 안의 모든 대화는 '일반 대화'로 이동됩니다., async () => {
        const batch = db.batch();
        state.getLocalChatSessionsCache().filter(s => s.projectId === projectId).forEach(s => {
            batch.update(chatSessionsCollectionRef.doc(s.id), { projectId: null });
        });
        batch.delete(projectsCollectionRef.doc(projectId));
        await batch.commit();
    });
}

export function toggleProjectExpansion(projectId) {
    const projects = state.getLocalProjectsCache();
    const project = projects.find(p => p.id === projectId);
    if (project) {
        project.isExpanded = !project.isExpanded;
        state.setLocalProjectsCache(projects);
        renderSidebarContent();
    }
}

export function selectSession(sessionId) {
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

export function handleDeleteSession(sessionId) {
    if (!sessionId) return;
    const session = state.getLocalChatSessionsCache().find(s => s.id === sessionId);
    showModal('\'를 삭제하시겠습니까?, () => {
        chatSessionsCollectionRef.doc(sessionId).delete().then(() => {
            if (state.getCurrentSessionId() === sessionId) handleNewChat();
        });
    });
}

export async function toggleChatPin(sessionId) {
    if (!chatSessionsCollectionRef || !sessionId) return;
    const session = state.getLocalChatSessionsCache().find(s => s.id === sessionId);
    await chatSessionsCollectionRef.doc(sessionId).update({ 
        isPinned: !(session.isPinned || false),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
    });
}

export async function handleChatSend() {
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
        selectSession(sessionRef.id); // 새 세션 UI 렌더링
    } else {
        sessionRef = chatSessionsCollectionRef.doc(state.getCurrentSessionId());
        await sessionRef.update({
            messages: firebase.firestore.FieldValue.arrayUnion({ role: 'user', content: query, timestamp: firebase.firestore.FieldValue.serverTimestamp() }),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    const currentSession = state.getLocalChatSessionsCache().find(s => s.id === sessionRef.id);
    const messagesForRender = [...(currentSession?.messages || []), { role: 'user', content: query }, { role: 'ai', status: 'loading', id: loading-\ }];
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
                saveApiSettings(false); // UI 닫지 않고 저장만
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

function buildApiRequest(provider, model, messages, maxTokens) {
    const history = messages.map(msg => ({ role: msg.role === 'ai' ? 'assistant' : 'user', content: msg.content }));
    if (provider === 'openai') return { url: 'https://api.openai.com/v1/chat/completions', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': Bearer \ }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) } };
    if (provider === 'anthropic') return { url: 'https://api.anthropic.com/v1/messages', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': state.getUserApiSettings().apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) } };
    if (provider === 'google_paid') return { url: https://generativelanguage.googleapis.com/v1beta/models/\:generateContent?key=\, options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: messages.map(msg => ({ role: msg.role === 'ai' ? 'model' : 'user', parts: [{ text: msg.content }] })), generationConfig: { maxOutputTokens: Number(maxTokens) || 2048 } }) } };
    throw new Error(Unsupported provider: \);
}

function parseApiResponse(provider, result) {
    try {
        if (provider === 'openai') return { content: result.choices[0].message.content, usage: { prompt: result.usage.prompt_tokens, completion: result.usage.completion_tokens } };
        if (provider === 'anthropic') return { content: result.content[0].text, usage: { prompt: result.usage.input_tokens, completion: result.usage.output_tokens } };
        if (provider === 'google_paid') return { content: result.candidates[0].content.parts[0].text, usage: null };
    } catch (error) {
        console.error(Error parsing \ response:, error, result);
        return { content: 'API 응답을 파싱하는 중 오류가 발생했습니다.', usage: null };
    }
    return { content: '알 수 없는 제공사입니다.', usage: null };
}

export function renderChatMessages(sessionData) {
    if (!dom.chatMessages || !sessionData) return;
    const messages = sessionData.messages || [];
    dom.chatMessages.innerHTML = '';
    
    messages.forEach((msg, index) => {
        if (msg.role === 'user') {
            const d = document.createElement('div');
            d.className = 'chat-message user';
            d.textContent = msg.content;
            dom.chatMessages.appendChild(d);
        } else if (msg.role === 'ai') {
            if (msg.status === 'loading') {
                const loadingBlock = document.createElement('div');
                loadingBlock.className = 'reasoning-block loading';
                loadingBlock.id = msg.id;
                loadingBlock.innerHTML = <div class="reasoning-header"><span class="toggle-icon">▶</span><span class="reasoning-summary blinking-cursor">AI가 생각하는 중...</span></div>;
                dom.chatMessages.appendChild(loadingBlock);
                return;
            }
            
            const aiContainer = document.createElement('div');
            aiContainer.className = 'ai-response-container';
            const reasoningRegex = /\[REASONING_START\]([\s\S]*?)\[REASONING_END\]/;
            const match = msg.content.match(reasoningRegex);

            if (match) {
                const rBlock = document.createElement('div');
                rBlock.className = 'reasoning-block';
                rBlock.id = easoning-\-\;
                rBlock.dataset.steps = JSON.stringify(match[1].split('SUMMARY:').filter(s => s).map(step => ({ summary: step.split('|||DETAIL:')[0]?.trim(), detail: step.split('|||DETAIL:')[1]?.trim() })));
                rBlock.innerHTML = <div class="reasoning-header"><span class="toggle-icon">▶</span><span>AI의 추론 과정...</span><span class="reasoning-summary"></span></div><div class="reasoning-content"></div>;
                aiContainer.appendChild(rBlock);
                startSummaryAnimation(rBlock, JSON.parse(rBlock.dataset.steps));
                
                const finalAnswer = msg.content.replace(reasoningRegex, '').trim();
                if (finalAnswer) {
                    const finalDiv = document.createElement('div');
                    finalDiv.className = 'chat-message ai';
                    finalDiv.innerHTML = finalAnswer.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>\</strong>').replace(/\\n/g, '<br>');
                    aiContainer.appendChild(finalDiv);
                }
            } else {
                const d = document.createElement('div');
                d.className = 'chat-message ai';
                d.innerHTML = msg.content.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>\</strong>').replace(/\\n/g, '<br>');
                aiContainer.appendChild(d);
            }

            if (msg.duration) {
                const metaDiv = document.createElement('div');
                metaDiv.className = 'ai-response-meta';
                metaDiv.innerHTML = <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" /></svg><span>응답 생성: \초</span>;
                aiContainer.appendChild(metaDiv);
            }
            dom.chatMessages.appendChild(aiContainer);
        }
    });
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
}

function startSummaryAnimation(block, steps) {
    const blockId = block.id;
    clearTimers(blockId);
    state.getActiveTimers()[blockId] = [];
    const summaryEl = block.querySelector('.reasoning-summary');
    if (!summaryEl || !steps?.length) return;
    let index = 0;
    const cycle = () => {
        if (!steps[index]?.summary) return;
        typewriterEffect(summaryEl, steps[index].summary, () => {
            const wait = setTimeout(() => {
                summaryEl.style.opacity = '0';
                const fade = setTimeout(() => { index = (index + 1) % steps.length; summaryEl.style.opacity = '1'; }, 500);
                state.getActiveTimers()[blockId].push(fade);
            }, 2000);
            state.getActiveTimers()[blockId].push(wait);
        });
    };
    cycle();
    const interval = setInterval(cycle, 4000);
    state.getActiveTimers()[blockId].push(interval);
}
