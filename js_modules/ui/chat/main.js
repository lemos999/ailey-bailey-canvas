/*
 * chat/main.js: The main controller for the chat system.
 * It coordinates state, rendering, and actions.
 */
import * as Dom from '../../utils/domElements.js';
import * as State from '../../core/state.js';
import { showModal } from '../../utils/helpers.js';
import { renderChatMessages, renderSidebarContent } from './render.js';
import { handleChatSend, handleDeleteSession, toggleChatPin, renameSession } from './actions.js';
import { openPromptModal } from '../modals.js';


export function initializeChat() {
    setupChatModeSelector();
}

// --- Listener Setup ---
export function listenToChatSessions() {
    return new Promise((resolve) => {
        if (!State.chatSessionsCollectionRef) return resolve();
        if (State.unsubscribeFromChatSessions) State.unsubscribeFromChatSessions();
        const unsubscribe = State.chatSessionsCollectionRef.onSnapshot(snapshot => {
            State.setLocalChatSessionsCache(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            renderSidebarContent();
            if (State.currentSessionId) {
                const currentSessionData = State.localChatSessionsCache.find(s => s.id === State.currentSessionId);
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
        State.setUnsubscribeFromChatSessions(unsubscribe);
    });
}

export function listenToProjects() {
    return new Promise((resolve) => {
        if (!State.projectsCollectionRef) return resolve();
        if (State.unsubscribeFromProjects) State.unsubscribeFromProjects();
        const unsubscribe = State.projectsCollectionRef.onSnapshot(snapshot => {
            const oldCache = [...State.localProjectsCache];
            State.setLocalProjectsCache(snapshot.docs.map(doc => ({
                id: doc.id,
                isExpanded: oldCache.find(p => p.id === doc.id)?.isExpanded ?? true,
                ...doc.data()
            })));
            
            renderSidebarContent();

            if (State.newlyCreatedProjectId) {
                const newProjectElement = document.querySelector(+'.project-container[data-project-id=""]'+);
                if (newProjectElement) {
                    startProjectRename(State.newlyCreatedProjectId);
                    State.setNewlyCreatedProjectId(null);
                }
            }
            resolve();
        }, error => {
            console.error("Project listener error:", error);
            resolve();
        });
        State.setUnsubscribeFromProjects(unsubscribe);
    });
}

// --- UI Actions ---
export function handleNewChat() {
    State.setCurrentSessionId(null);
    Object.values(State.activeTimers).forEach(timers => timers.forEach(clearInterval));
    renderSidebarContent();
    Dom.chatMessages.innerHTML = '';
    Dom.chatMessages.style.display = 'none';
    Dom.chatWelcomeMessage.style.display = 'flex';
    Dom.chatSessionTitle.textContent = 'AI 러닝메이트';
    Dom.deleteSessionBtn.style.display = 'none';
    Dom.chatInput.disabled = false;
    Dom.chatInput.value = '';
    Dom.chatSendBtn.disabled = false;
}

function selectSession(sessionId) {
    if (!sessionId) return;
    const sessionData = State.localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionData) return;
    
    State.setCurrentSessionId(sessionId);
    Object.values(State.activeTimers).forEach(timers => timers.forEach(clearInterval));
    renderSidebarContent();
    
    Dom.chatWelcomeMessage.style.display = 'none';
    Dom.chatMessages.style.display = 'flex';
    renderChatMessages(sessionData);
    
    Dom.chatSessionTitle.textContent = sessionData.title || '대화';
    Dom.deleteSessionBtn.style.display = 'inline-block';
    Dom.chatInput.disabled = false;
    Dom.chatSendBtn.disabled = false;
    Dom.chatInput.focus();
}

// --- Project Actions ---
async function createNewProject() {
    const baseName = "새 프로젝트";
    const existingNames = new Set(State.localProjectsCache.map(p => p.name));
    let newName = baseName;
    let i = 2;
    while (existingNames.has(newName)) {
        newName = +'${baseName} '+;
        i++;
    }

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

async function deleteProject(projectId) {
    const project = State.localProjectsCache.find(p => p.id === projectId);
    if (!project) return;
    const message = +'프로젝트 ''를 삭제하시겠습니까? 프로젝트 안의 모든 대화는 '일반 대화'로 이동됩니다.'+;
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

function toggleProjectExpansion(projectId) {
    const project = State.localProjectsCache.find(p => p.id === projectId);
    if (project) {
        project.isExpanded = !project.isExpanded;
        renderSidebarContent();
    }
}

function startProjectRename(projectId) {
    const projectContainer = document.querySelector(+'.project-container[data-project-id=""]'+);
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
            renderSidebarContent(); 
        }
    };
    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); }
    });
}

function startSessionRename(sessionId) {
    const sessionItem = document.querySelector(+'.session-item[data-session-id=""]'+);
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
        if (newTitle && newTitle !== originalTitle) {
            renameSession(sessionId, newTitle);
        } else {
            renderSidebarContent();
        }
    };
    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); }
    });
}

async function moveSessionToProject(sessionId, newProjectId) {
    const session = State.localChatSessionsCache.find(s => s.id === sessionId);
    if (!session || session.projectId === newProjectId) return;
    try {
        await State.chatSessionsCollectionRef.doc(sessionId).update({ 
            projectId: newProjectId, 
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
        });
        if (newProjectId) { 
            await State.projectsCollectionRef.doc(newProjectId).update({ updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        }
    } catch (error) {
        console.error("Error moving session:", error);
        alert("세션 이동에 실패했습니다.");
    }
}


// --- Event Delegation ---
export function handleSidebarClick(e) {
    const target = e.target;
    const sessionItem = target.closest('.session-item');
    if (sessionItem) {
        if (target.closest('.session-pin-btn')) {
            e.stopPropagation();
            toggleChatPin(sessionItem.dataset.sessionId);
        } else {
            selectSession(sessionItem.dataset.sessionId);
        }
        return;
    }
    const projectHeader = target.closest('.project-header');
    if (projectHeader) {
        const projectId = projectHeader.closest('.project-container').dataset.projectId;
        if (target.closest('.project-actions-btn')) {
            e.stopPropagation();
            showProjectContextMenu(projectId, target.closest('.project-actions-btn'));
        } else if (!target.closest('input')) {
            toggleProjectExpansion(projectId);
        }
        return;
    }
}

export function handleSidebarContextMenu(e) {
    const sessionItem = e.target.closest('.session-item');
    if (sessionItem) {
        e.preventDefault();
        showSessionContextMenu(sessionItem.dataset.sessionId, e.clientX, e.clientY);
    }
}

// --- Context Menus ---
function removeContextMenu() {
    if (State.currentOpenContextMenu) {
        State.currentOpenContextMenu.remove();
        State.setCurrentOpenContextMenu(null);
    }
}

function showProjectContextMenu(projectId, buttonElement) {
    removeContextMenu();
    const rect = buttonElement.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'project-context-menu';
    menu.style.position = 'absolute';
    menu.style.top = +'${rect.bottom + 2}px'+;
    menu.style.right = '5px';
    menu.innerHTML = +'
        <button class="context-menu-item" data-action="rename">이름 변경</button>
        <button class="context-menu-item" data-action="delete">삭제</button>
    +';
    Dom.sessionListContainer.appendChild(menu);
    menu.style.display = 'block';
    State.setCurrentOpenContextMenu(menu);
    menu.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = e.target.dataset.action;
        if (action === 'rename') startProjectRename(projectId);
        else if (action === 'delete') deleteProject(projectId);
        removeContextMenu();
    });
    document.addEventListener('click', removeContextMenu, { once: true });
}

function showSessionContextMenu(sessionId, x, y) {
    removeContextMenu();
    const session = State.localChatSessionsCache.find(s => s.id === sessionId);
    if (!session) return;
    const menu = document.createElement('div');
    menu.className = 'session-context-menu';
    let moveToSubMenuHTML = State.localProjectsCache.map(p => +'<button class="context-menu-item" data-project-id="" ></button>'+).join('');
    menu.innerHTML = +'
        <button class="context-menu-item" data-action="rename">이름 변경</button>
        <div class="context-submenu-container">
            <button class="context-menu-item"><span>프로젝트로 이동</span><span class="submenu-arrow">▶</span></button>
            <div class="context-submenu">
                <button class="context-menu-item" data-project-id="null" >[일반 대화로 이동]</button>
                <div class="context-menu-separator"></div>
                
            </div>
        </div>
        <button class="context-menu-item" data-action="pin"></button>
        <div class="context-menu-separator"></div>
        <button class="context-menu-item" data-action="delete">삭제</button>
    +';
    document.body.appendChild(menu);
    menu.style.left = +'${x}px'+; menu.style.top = +'${y}px'+;
    menu.style.display = 'block';
    State.setCurrentOpenContextMenu(menu);
    menu.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = e.target.closest('.context-menu-item');
        if (!target || target.disabled) return;
        const action = target.dataset.action;
        const projectId = target.dataset.projectId;
        if (action === 'rename') startSessionRename(sessionId);
        else if (action === 'pin') toggleChatPin(sessionId);
        else if (action === 'delete') handleDeleteSession(sessionId);
        else if (projectId !== undefined) moveSessionToProject(sessionId, projectId === 'null' ? null : projectId);
        removeContextMenu();
    });
     document.addEventListener('click', removeContextMenu, { once: true });
}

// --- Drag & Drop ---
let draggedItem = null;
export function handleDragStart(e) {
    if (e.target.classList.contains('session-item')) {
        draggedItem = e.target;
        setTimeout(() => e.target.classList.add('is-dragging'), 0);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedItem.dataset.sessionId);
    } else {
        e.preventDefault();
    }
}
export function handleDragEnd() {
    if (draggedItem) draggedItem.classList.remove('is-dragging');
    draggedItem = null;
    document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => el.classList.remove('drag-over', 'drag-target-area'));
}
export function handleDragOver(e) {
    e.preventDefault();
    document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => el.classList.remove('drag-over', 'drag-target-area'));
    if (!draggedItem) return;
    const sourceSession = State.localChatSessionsCache.find(s => s.id === draggedItem.dataset.sessionId);
    const targetProjectHeader = e.target.closest('.project-header');
    if (targetProjectHeader) {
        const targetProjectId = targetProjectHeader.closest('.project-container').dataset.projectId;
        if (sourceSession && sourceSession.projectId !== targetProjectId) {
            e.dataTransfer.dropEffect = 'move';
            targetProjectHeader.classList.add('drag-over');
        } else {
            e.dataTransfer.dropEffect = 'none';
        }
    } else {
        if (sourceSession && sourceSession.projectId) {
            e.dataTransfer.dropEffect = 'move';
            Dom.sessionListContainer.classList.add('drag-target-area');
        } else {
            e.dataTransfer.dropEffect = 'none';
        }
    }
}
export async function handleDrop(e) {
    e.preventDefault();
    if (!draggedItem) return;
    const sessionId = e.dataTransfer.getData('text/plain');
    const targetProjectHeader = e.target.closest('.project-header');
    let targetProjectId = targetProjectHeader ? targetProjectHeader.closest('.project-container').dataset.projectId : null;
    
    await moveSessionToProject(sessionId, targetProjectId);
    handleDragEnd(); // Clean up classes
}


// --- Setup ---
function setupChatModeSelector() {
    if (!Dom.chatModeSelector) return;
    Dom.chatModeSelector.innerHTML = '';
    const modes = [
        { id: 'ailey_coaching', t: '기본 코칭', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M20,16H5.17L4,17.17V4H20V16Z" /></svg>' },
        { id: 'deep_learning', t: '심화 학습', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4M12,14A4,4 0 0,1 8,10H10A2,2 0 0,0 12,12A2,2 0 0,0 14,10H16A4,4 0 0,1 12,14M7.5,15.6C8.8,17.2 10.3,18 12,18C13.7,18 15.2,17.2 16.5,15.6C15.2,14.8 13.7,14 12,14C10.3,14 8.8,14.8 7.5,15.6Z" /></svg>' },
        { id: 'custom', t: '커스텀', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>' }
    ];
    modes.forEach(m => {
        const btn = document.createElement('button');
        btn.dataset.mode = m.id;
        btn.innerHTML = +'${m.i}<span></span>'+;
        if (m.id === State.selectedMode) btn.classList.add('active');
        btn.addEventListener('click', () => {
            State.setSelectedMode(m.id);
            Dom.chatModeSelector.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (State.selectedMode === 'custom') openPromptModal();
        });
        Dom.chatModeSelector.appendChild(btn);
    });
}

// Event handlers that are specific to chat but need to be attached in main.js
export const chatEventHandlers = {
    handleNewChat,
    createNewProject,
    handleChatSend,
    onChatKeydown: (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleChatSend();
        }
    },
    onDeleteSession: () => handleDeleteSession(State.currentSessionId),
    onModelChange: () => {
        const selectedValue = Dom.aiModelSelector.value;
        if (State.userApiSettings.provider && State.userApiSettings.apiKey) {
            State.userApiSettings.selectedModel = selectedValue;
            localStorage.setItem('userApiSettings', JSON.stringify(State.userApiSettings));
        } else {
            State.defaultModel = selectedValue;
            localStorage.setItem('selectedAiModel', State.defaultModel);
        }
    }
}
