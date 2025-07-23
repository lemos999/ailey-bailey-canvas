/*
--- Ailey & Bailey Canvas ---
File: js/ui/chat/render.js
Version: 11.0 (Modular)
Description: Handles all rendering logic for the chat UI, including messages, sidebar, etc.
*/

import { getState, updateState } from '../../core/state.js';
import { selectSession, handleDeleteSession } from './state.js';
import { toggleChatPin, renameProject, deleteProject, createNewProject } from './actions.js';
import { chatMessages, sessionListContainer, searchSessionsInput } from '../../utils/domElements.js';

/**
 * Renders all messages for a given session.
 * @param {object} sessionData The session object containing messages.
 */
export function renderChatMessages(sessionData) {
    if (!chatMessages || !sessionData) return;

    const messages = sessionData.messages || [];
    chatMessages.innerHTML = '';
    const { currentSessionId } = getState();

    messages.forEach((msg, index) => {
        if (msg.role === 'user') {
            const d = document.createElement('div');
            d.className = chat-message user;
            d.textContent = msg.content;
            chatMessages.appendChild(d);
        } else if (msg.role === 'ai') {
            if (msg.status === 'loading') {
                const loadingBlock = document.createElement('div');
                loadingBlock.className = 'reasoning-block loading';
                loadingBlock.id = msg.id;
                loadingBlock.innerHTML = 
                    <div class="reasoning-header">
                        <span class="toggle-icon">▶</span>
                        <span class="reasoning-summary blinking-cursor">AI가 생각하는 중...</span>
                    </div>
                ;
                chatMessages.appendChild(loadingBlock);
                return;
            }

            const aiContainer = document.createElement('div');
            aiContainer.className = 'ai-response-container';
            const content = msg.content;
            const reasoningRegex = /\[REASONING_START\]([\s\S]*?)\[REASONING_END\]/;
            const match = content.match(reasoningRegex);

            if (match) {
                const reasoningBlockId = easoning-\-\;
                const reasoningRaw = match[1];
                const finalAnswer = content.replace(reasoningRegex, '').trim();
                const reasoningSteps = reasoningRaw.split('SUMMARY:').filter(s => s.trim() !== '').map(step => {
                    const parts = step.split('|||DETAIL:');
                    return { summary: parts[0]?.trim(), detail: parts[1]?.trim() };
                });

                const rBlock = document.createElement('div');
                rBlock.className = 'reasoning-block';
                rBlock.id = reasoningBlockId;
                rBlock.dataset.steps = JSON.stringify(reasoningSteps);
                rBlock.innerHTML = 
                    <div class="reasoning-header">
                        <span class="toggle-icon">▶</span>
                        <span>AI의 추론 과정...</span>
                        <span class="reasoning-summary"></span>
                    </div>
                    <div class="reasoning-content"></div>
                ;
                aiContainer.appendChild(rBlock);
                startSummaryAnimation(rBlock, reasoningSteps);

                if (finalAnswer) {
                    const finalAnswerDiv = document.createElement('div');
                    finalAnswerDiv.className = 'chat-message ai';
                    finalAnswerDiv.innerHTML = finalAnswer.replace(/\*\*(.*?)\*\*/g, '<strong>\</strong>').replace(/\n/g, '<br>');
                    aiContainer.appendChild(finalAnswerDiv);
                }
            } else {
                const d = document.createElement('div');
                d.className = 'chat-message ai';
                d.innerHTML = content.replace(/\*\*(.*?)\*\*/g, '<strong>\</strong>').replace(/\n/g, '<br>');
                aiContainer.appendChild(d);
            }

            if (msg.duration) {
                const metaDiv = document.createElement('div');
                metaDiv.className = 'ai-response-meta';
                metaDiv.innerHTML = 
                    <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" /></svg>
                    <span>응답 생성: \초</span>
                ;
                aiContainer.appendChild(metaDiv);
            }
            chatMessages.appendChild(aiContainer);
        }
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Renders the entire sidebar content including projects and sessions.
 */
export function renderSidebarContent() {
    const { localProjectsCache, localChatSessionsCache } = getState();
    if (!sessionListContainer) return;
    const searchTerm = searchSessionsInput.value.toLowerCase();
    sessionListContainer.innerHTML = '';

    const fragment = document.createDocumentFragment();

    // Render projects
    const projectGroupHeader = document.createElement('div');
    projectGroupHeader.className = 'session-group-header';
    projectGroupHeader.textContent = '?? 프로젝트';
    fragment.appendChild(projectGroupHeader);

    const sortedProjects = [...localProjectsCache].sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
    sortedProjects.forEach(project => {
        const projectContainer = createProjectItem(project);
        fragment.appendChild(projectContainer);
    });

    // Render unassigned sessions
    const unassignedSessions = localChatSessionsCache.filter(s => !s.projectId && (s.title || '새 대화').toLowerCase().includes(searchTerm));
    if (unassignedSessions.length > 0) {
        const generalGroupHeader = document.createElement('div');
        generalGroupHeader.className = 'session-group-header';
        generalGroupHeader.textContent = '?? 일반 대화';
        fragment.appendChild(generalGroupHeader);
        
        unassignedSessions.forEach(session => {
             const sessionItem = createSessionItem(session);
             fragment.appendChild(sessionItem);
        });
    }

    sessionListContainer.appendChild(fragment);
}

function createProjectItem(project) {
    const { localChatSessionsCache } = getState();
    const projectContainer = document.createElement('div');
    projectContainer.className = 'project-container';
    projectContainer.dataset.projectId = project.id;

    const projectHeader = document.createElement('div');
    projectHeader.className = 'project-header';
    projectHeader.innerHTML = 
        <span class="project-toggle-icon \">
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" /></svg>
        </span>
        <span class="project-icon">
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2Z" /></svg>
        </span>
        <span class="project-title">\</span>
        <button class="project-actions-btn" title="프로젝트 메뉴">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" /></svg>
        </button>
    ;
    
    const sessionsContainer = document.createElement('div');
    sessionsContainer.className = sessions-in-project \;
    
    const sessionsInProject = localChatSessionsCache
        .filter(s => s.projectId === project.id)
        .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
        
    sessionsInProject.forEach(session => {
        sessionsContainer.appendChild(createSessionItem(session));
    });
    
    projectContainer.appendChild(projectHeader);
    projectContainer.appendChild(sessionsContainer);
    return projectContainer;
}

function createSessionItem(session) {
    const { currentSessionId } = getState();
    const item = document.createElement('div');
    item.className = 'session-item';
    item.dataset.sessionId = session.id;
    item.draggable = true;
    if (session.id === currentSessionId) item.classList.add('active');

    const title = session.title || '새 대화';
    const pinIconSVG = <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>;

    item.innerHTML = 
        <div class="session-item-title">\</div>
        <button class="session-pin-btn \" title="\">
            \
        </button>
    ;
    return item;
}

export function startProjectRename(projectId) {
    const projectContainer = document.querySelector(.project-container[data-project-id="\"]);
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
        } else {
             renderSidebarContent(); // Re-render to restore original state if rename is cancelled
        }
    };

    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        else if (e.key === 'Escape') {
            input.value = originalTitle;
            input.blur();
        }
    });
}


function typewriterEffect(element, text, onComplete) {
    if (!element || !text) { if (onComplete) onComplete(); return; }
    element.innerHTML = '';
    element.classList.add('blinking-cursor');
    let i = 0;
    const blockId = element.closest('.reasoning-block')?.id;
    let { activeTimers } = getState();

    const typingInterval = setInterval(() => {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
        } else {
            clearInterval(typingInterval);
            element.classList.remove('blinking-cursor');
            if (onComplete) onComplete();
        }
    }, 30);

    if (blockId && activeTimers[blockId]) {
        activeTimers[blockId].push(typingInterval);
    }
}


function startSummaryAnimation(blockElement, reasoningSteps) {
    const blockId = blockElement.id;
    let { activeTimers } = getState();
    if (activeTimers[blockId]) {
        activeTimers[blockId].forEach(clearInterval);
    }
    activeTimers[blockId] = [];
    updateState('activeTimers', activeTimers);

    const summaryElement = blockElement.querySelector('.reasoning-summary');
    if (!summaryElement || !reasoningSteps || reasoningSteps.length === 0) return;

    let stepIndex = 0;
    const cycleSummary = () => {
        if (!reasoningSteps[stepIndex] || !reasoningSteps[stepIndex].summary) return;
        const summaryText = reasoningSteps[stepIndex].summary;
        typewriterEffect(summaryElement, summaryText, () => {
            const waitTimer = setTimeout(() => {
                summaryElement.style.opacity = '0';
                const fadeTimer = setTimeout(() => {
                    stepIndex = (stepIndex + 1) % reasoningSteps.length;
                    summaryElement.style.opacity = '1';
                }, 500);
                activeTimers[blockId].push(fadeTimer);
            }, 2000);
            activeTimers[blockId].push(waitTimer);
        });
    };
    
    cycleSummary();
    const summaryInterval = setInterval(cycleSummary, 4000);
    activeTimers[blockId].push(summaryInterval);
    updateState('activeTimers', activeTimers);
}
