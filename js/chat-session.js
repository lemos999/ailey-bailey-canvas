/*
--- Ailey & Bailey Canvas ---
File: js/chat-session.js
Version: 11.0 (Refactored)
Description: Manages the lifecycle of chat sessions and projects, including creation,
renaming, deletion, moving, pinning, and filtering.
*/

import * as state from './state.js';
import { getRelativeDateGroup } from './firebase-service.js';
import { showModal, removeContextMenu } from './ui-manager.js';
import { selectSession, startSessionRename, showSessionContextMenu } from './chat-core.js';
import { startProjectRename } from './chat-core.js';


let sessionListContainer, searchSessionsInput;

export function initializeChatSessionManager() {
    sessionListContainer = document.getElementById('session-list-container');
    searchSessionsInput = document.getElementById('search-sessions-input');

    if (searchSessionsInput) {
        searchSessionsInput.addEventListener('input', renderSidebarContent);
    }
    
    if (sessionListContainer) {
        sessionListContainer.addEventListener('click', handleSidebarClick);
        sessionListContainer.addEventListener('contextmenu', handleSidebarContextMenu);
        
        // Drag and Drop listeners
        let draggedItem = null;
        sessionListContainer.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('session-item')) {
                draggedItem = e.target;
                setTimeout(() => e.target.classList.add('is-dragging'), 0);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', draggedItem.dataset.sessionId);
            } else { e.preventDefault(); }
        });

        sessionListContainer.addEventListener('dragend', () => {
            if(draggedItem) { draggedItem.classList.remove('is-dragging'); draggedItem = null; }
            document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => { el.classList.remove('drag-over', 'drag-target-area'); });
        });

        sessionListContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            const targetProjectHeader = e.target.closest('.project-header');
            document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => { el.classList.remove('drag-over', 'drag-target-area'); });
            if (!draggedItem) return;
            const sourceSessionId = draggedItem.dataset.sessionId;
            const sourceSession = state.localChatSessionsCache.find(s => s.id === sourceSessionId);
            if (!sourceSession) { e.dataTransfer.dropEffect = 'none'; return; }

            if (targetProjectHeader) { 
                const targetProjectId = targetProjectHeader.closest('.project-container').dataset.projectId;
                if (sourceSession.projectId !== targetProjectId) { 
                    e.dataTransfer.dropEffect = 'move'; 
                    targetProjectHeader.classList.add('drag-over');
                } else { 
                    e.dataTransfer.dropEffect = 'none'; 
                }
            } else { 
                 if (sourceSession.projectId) { 
                     e.dataTransfer.dropEffect = 'move'; 
                     sessionListContainer.classList.add('drag-target-area'); 
                 } else { 
                     e.dataTransfer.dropEffect = 'none'; 
                 }
            }
        });
        
        sessionListContainer.addEventListener('dragleave', (e) => { 
            if (e.target.classList.contains('project-header')) {
                e.target.classList.remove('drag-over');
            }
            if (e.target === sessionListContainer) {
                 sessionListContainer.classList.remove('drag-target-area'); 
            }
        });

        sessionListContainer.addEventListener('drop', handleDrop);
    }
}

function handleSidebarClick(e) {
    if (!e.target.closest('.project-context-menu')) {
        removeContextMenu();
    }
    const sessionItem = e.target.closest('.session-item');
    if (sessionItem) {
        const pinButton = e.target.closest('.session-pin-btn');
        if (pinButton) {
            e.stopPropagation();
            toggleChatPin(sessionItem.dataset.sessionId);
        } else {
            selectSession(sessionItem.dataset.sessionId);
        }
        return;
    }
    const projectHeader = e.target.closest('.project-header');
    if (projectHeader) {
        const actionsButton = e.target.closest('.project-actions-btn');
        const projectId = projectHeader.closest('.project-container').dataset.projectId;
        if (actionsButton) {
            e.stopPropagation();
            showProjectContextMenu(projectId, actionsButton);
        } else if (!e.target.closest('input')) {
            toggleProjectExpansion(projectId);
        }
    }
}

function handleSidebarContextMenu(e) {
    const sessionItem = e.target.closest('.session-item');
    if (sessionItem) {
        e.preventDefault();
        removeContextMenu();
        showSessionContextMenu(sessionItem.dataset.sessionId, e.clientX, e.clientY);
    }
}

async function handleDrop(e) {
    e.preventDefault();
    document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => { el.classList.remove('drag-over', 'drag-target-area'); });
    
    const draggedItem = document.querySelector('.session-item.is-dragging');
    if (!draggedItem) return;

    const sessionId = e.dataTransfer.getData('text/plain');
    const targetProjectHeader = e.target.closest('.project-header');
    let targetProjectId = null;
    let shouldUpdate = false;

    const sourceSession = state.localChatSessionsCache.find(s => s.id === sessionId);
    if (!sourceSession) return;

    if (targetProjectHeader) {
        targetProjectId = targetProjectHeader.closest('.project-container').dataset.projectId;
        if (sourceSession.projectId !== targetProjectId) {
            shouldUpdate = true;
        }
    } else {
        if (sourceSession.projectId) {
            targetProjectId = null; // Moving to 'unassigned'
            shouldUpdate = true;
        }
    }

    if (shouldUpdate) {
        try {
            const updates = { 
                projectId: targetProjectId, 
                updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
            };
            await state.chatSessionsCollectionRef.doc(sessionId).update(updates);
            if (targetProjectId) {
                await state.projectsCollectionRef.doc(targetProjectId).update({ 
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
                });
            }
        } catch (error) {
            console.error("Failed to move session:", error);
        }
    }
}


export function renderSidebarContent() {
    if (!sessionListContainer) return;
    const searchTerm = searchSessionsInput.value.toLowerCase();
    sessionListContainer.innerHTML = ''; 

    const fragment = document.createDocumentFragment();

    // Filter projects and sessions based on search term
    const filteredProjects = state.localProjectsCache.filter(p => p.name?.toLowerCase().includes(searchTerm));
    const filteredSessions = state.localChatSessionsCache.filter(s => (s.title || '새 대화').toLowerCase().includes(searchTerm));
    
    const projectsToShow = searchTerm ? filteredProjects : state.localProjectsCache;
    const sessionsToShow = searchTerm ? filteredSessions : state.localChatSessionsCache;

    if (projectsToShow.length > 0) {
        const projectGroupHeader = document.createElement('div');
        projectGroupHeader.className = 'session-group-header';
        projectGroupHeader.textContent = '📁 프로젝트';
        fragment.appendChild(projectGroupHeader);

        const sortedProjects = [...projectsToShow].sort((a, b) => {
             const timeA = a.updatedAt?.toMillis() || a.createdAt?.toMillis() || 0;
             const timeB = b.updatedAt?.toMillis() || b.createdAt?.toMillis() || 0;
             return timeB - timeA;
        });

        sortedProjects.forEach(project => {
            const sessionsInProject = sessionsToShow
                .filter(s => s.projectId === project.id)
                .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
            
            // If searching, and project name doesn't match, and no sessions inside match, skip rendering the project
            if (searchTerm && !project.name.toLowerCase().includes(searchTerm) && sessionsInProject.length === 0) {
                return;
            }

            fragment.appendChild(createProjectItem(project, sessionsInProject, searchTerm));
        });
    }

    const unassignedSessions = sessionsToShow.filter(s => !s.projectId);

    if (unassignedSessions.length > 0) {
        const generalGroupHeader = document.createElement('div');
        generalGroupHeader.className = 'session-group-header';
        generalGroupHeader.textContent = '💬 일반 대화';
        fragment.appendChild(generalGroupHeader);

        unassignedSessions.forEach(session => {
            const timestamp = session.updatedAt || session.createdAt;
            session.dateGroup = getRelativeDateGroup(timestamp, session.isPinned);
        });

        const groupedSessions = unassignedSessions.reduce((acc, session) => {
            const label = session.dateGroup.label;
            if (!acc[label]) {
                acc[label] = { key: session.dateGroup.key, items: [] };
            }
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

    sessionListContainer.appendChild(fragment);
}


function createProjectItem(project, sessionsInProject, searchTerm) {
    const projectContainer = document.createElement('div');
    projectContainer.className = 'project-container';
    projectContainer.dataset.projectId = project.id;

    const projectHeader = document.createElement('div');
    projectHeader.className = 'project-header';

    const createdAt = project.createdAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) || '정보 없음';
    const updatedAt = project.updatedAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) || createdAt;
    projectHeader.title = `생성: ${createdAt}\n최종 수정: ${updatedAt}`;

    projectHeader.innerHTML = `
        <span class="project-toggle-icon ${project.isExpanded ? 'expanded' : ''}">
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" /></svg>
        </span>
        <span class="project-icon">
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2Z" /></svg>
        </span>
        <span class="project-title">${project.name}</span>
        <button class="project-actions-btn" title="프로젝트 메뉴">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z" /></svg>
        </button>
    `;

    const sessionsContainer = document.createElement('div');
    sessionsContainer.className = `sessions-in-project ${project.isExpanded ? 'expanded' : ''}`;
    sessionsInProject.forEach(session => {
        sessionsContainer.appendChild(createSessionItem(session));
    });

    projectContainer.appendChild(projectHeader);
    projectContainer.appendChild(sessionsContainer);
    return projectContainer;
}

export function createSessionItem(session) {
    const item = document.createElement('div');
    item.className = 'session-item';
    item.dataset.sessionId = session.id;
    item.draggable = true;
    if (session.id === state.currentSessionId) item.classList.add('active');
    
    const createdAt = session.createdAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) || '정보 없음';
    const updatedAt = session.updatedAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) || createdAt;
    item.title = `생성: ${createdAt}\n최종 수정: ${updatedAt}`;
    
    const pinIconSVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>`;
    
    const titleSpan = document.createElement('div');
    titleSpan.className = 'session-item-title';
    titleSpan.textContent = session.title || '새 대화';

    const pinButton = document.createElement('button');
    pinButton.className = `session-pin-btn ${session.isPinned ? 'pinned-active' : ''}`;
    pinButton.title = session.isPinned ? '고정 해제' : '고정하기';
    pinButton.innerHTML = pinIconSVG;

    item.appendChild(titleSpan);
    item.appendChild(pinButton);
    
    return item;
}

export function showProjectContextMenu(projectId, buttonElement) {
    removeContextMenu();
    const rect = buttonElement.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'project-context-menu'; 
    menu.style.position = 'absolute';
    menu.style.top = `${rect.bottom + 2}px`;
    menu.style.right = '5px';
    menu.innerHTML = `
        <button class="context-menu-item" data-action="rename">이름 변경</button>
        <button class="context-menu-item" data-action="delete">삭제</button>
    `;
    
    sessionListContainer.appendChild(menu);
    menu.style.display = 'block';
    state.setCurrentOpenContextMenu(menu);

    menu.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = e.target.closest('.context-menu-item').dataset.action;
        if (action === 'rename') {
            startProjectRename(projectId);
        } else if (action === 'delete') {
            deleteProject(projectId);
        }
        removeContextMenu();
    });
}


function getNewProjectDefaultName() {
    const baseName = "새 프로젝트";
    const existingNames = new Set(state.localProjectsCache.map(p => p.name));
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

async function deleteProject(projectId) {
    const project = state.localProjectsCache.