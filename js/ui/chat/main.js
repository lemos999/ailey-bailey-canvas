// js/ui/chat/main.js
// 채팅 패널의 모든 기능을 총괄하고 이벤트 리스너를 설정합니다.

import * as DOM from '../../utils/domElements.js';
import * as State from '../../core/state.js';
import { renderSidebarContent, renderChatMessages } from './render.js';
import { handleChatSend } from './actions.js';
import { showModal } from '../modals.js';
import { openPromptModal } from '../modals.js';

/**
 * 채팅 패널의 모든 이벤트 리스너를 설정합니다.
 */
export function initializeChat() {
    if (DOM.chatForm) DOM.chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });
    if (DOM.chatInput) DOM.chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } });
    if (DOM.deleteSessionBtn) DOM.deleteSessionBtn.addEventListener('click', () => handleDeleteSession(State.currentSessionId));
    if (DOM.newChatBtn) DOM.newChatBtn.addEventListener('click', handleNewChat);
    if (DOM.newProjectBtn) DOM.newProjectBtn.addEventListener('click', createNewProject);
    if (DOM.searchSessionsInput) DOM.searchSessionsInput.addEventListener('input', renderSidebarContent);
    if (DOM.chatModeSelector) setupChatModeSelector();

    if (DOM.sessionListContainer) {
        setupSessionListEventListeners();
    }
}

/**
 * 채팅 사이드바의 이벤트 리스너를 설정합니다 (클릭, 드래그앤드롭 등).
 */
function setupSessionListEventListeners() {
    DOM.sessionListContainer.addEventListener('click', (e) => {
        if (!e.target.closest('.project-context-menu')) { removeContextMenu(); }
        const sessionItem = e.target.closest('.session-item');
        if (sessionItem) {
            const pinButton = e.target.closest('.session-pin-btn');
            if (pinButton) { e.stopPropagation(); toggleChatPin(sessionItem.dataset.sessionId); }
            else { selectSession(sessionItem.dataset.sessionId); }
            return;
        }
        const projectHeader = e.target.closest('.project-header');
        if (projectHeader) {
            const actionsButton = e.target.closest('.project-actions-btn');
            const projectId = projectHeader.closest('.project-container').dataset.projectId;
            if (actionsButton) { e.stopPropagation(); showProjectContextMenu(projectId, actionsButton); }
            else if (!e.target.closest('input')) { toggleProjectExpansion(projectId); }
            return;
        }
    });

    DOM.sessionListContainer.addEventListener('contextmenu', (e) => {
        const sessionItem = e.target.closest('.session-item');
        if (sessionItem) { e.preventDefault(); removeContextMenu(); showSessionContextMenu(sessionItem.dataset.sessionId, e.clientX, e.clientY); }
    });

    let draggedItem = null;
    DOM.sessionListContainer.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('session-item')) {
            draggedItem = e.target;
            setTimeout(() => e.target.classList.add('is-dragging'), 0);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedItem.dataset.sessionId);
        } else { e.preventDefault(); }
    });

    DOM.sessionListContainer.addEventListener('dragend', () => {
        if(draggedItem) { draggedItem.classList.remove('is-dragging'); draggedItem = null; }
        document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => { el.classList.remove('drag-over', 'drag-target-area'); });
    });

    DOM.sessionListContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        const targetProjectHeader = e.target.closest('.project-header');
        document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => { el.classList.remove('drag-over', 'drag-target-area'); });
        if (!draggedItem) return;
        const sourceSessionId = draggedItem.dataset.sessionId;
        const sourceSession = State.localChatSessionsCache.find(s => s.id === sourceSessionId);
        if (targetProjectHeader) { 
            const targetProjectId = targetProjectHeader.closest('.project-container').dataset.projectId;
            if (sourceSession && sourceSession.projectId !== targetProjectId) { e.dataTransfer.dropEffect = 'move'; targetProjectHeader.classList.add('drag-over'); }
            else { e.dataTransfer.dropEffect = 'none'; }
        } else { 
             if (sourceSession && sourceSession.projectId) { e.dataTransfer.dropEffect = 'move'; DOM.sessionListContainer.classList.add('drag-target-area'); }
             else { e.dataTransfer.dropEffect = 'none'; }
        }
    });
    
    DOM.sessionListContainer.addEventListener('dragleave', (e) => { if (e.target === DOM.sessionListContainer) { DOM.sessionListContainer.classList.remove('drag-target-area'); } });

    DOM.sessionListContainer.addEventListener('drop', async (e) => {
        e.preventDefault();
         document.querySelectorAll('.project-header.drag-over, .session-list-container.drag-target-area').forEach(el => { el.classList.remove('drag-over', 'drag-target-area'); });
        if (!draggedItem) return;
        const sessionId = e.dataTransfer.getData('text/plain');
        const targetProjectHeader = e.target.closest('.project-header');
        let targetProjectId = null; let shouldUpdate = false;
        const sourceSession = State.localChatSessionsCache.find(s => s.id === sessionId);
        if (!sourceSession) return;
        if (targetProjectHeader) { targetProjectId = targetProjectHeader.closest('.project-container').dataset.projectId; if (sourceSession.projectId !== targetProjectId) { shouldUpdate = true; } }
        else { if (sourceSession.projectId) { targetProjectId = null; shouldUpdate = true; } }
        if (shouldUpdate) {
            try {
                const updates = { projectId: targetProjectId, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
                await State.chatSessionsCollectionRef.doc(sessionId).update(updates);
                if (targetProjectId) { await State.projectsCollectionRef.doc(targetProjectId).update({ updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); }
            } catch (error) { console.error("Failed to move session:", error); }
        }
    });
}

/**
 * 채팅 모드 선택 UI를 설정합니다.
 */
function setupChatModeSelector() {
    if (!DOM.chatModeSelector) return;
    DOM.chatModeSelector.innerHTML = '';
    const modes = [
        { id: 'ailey_coaching', t: '기본 코칭', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M20,16H5.17L4,17.17V4H20V16Z" /></svg>' },
        { id: 'deep_learning', t: '심화 학습', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4M12,14A4,4 0 0,1 8,10H10A2,2 0 0,0 12,12A2,2 0 0,0 14,10H16A4,4 0 0,1 12,14M7.5,15.6C8.8,17.2 10.3,18 12,18C13.7,18 15.2,17.2 16.5,15.6C15.2,14.8 13.7,14 12,14C10.3,14 8.8,14.8 7.5,15.6Z" /></svg>' },
        { id: 'custom', t: '커스텀', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>' }
    ];
    modes.forEach(m => {
        const b = document.createElement('button');
        b.dataset.mode = m.id;
        b.innerHTML = ${m.i}<span></span>;
        if (m.id === State.selectedMode) b.classList.add('active');
        b.addEventListener('click', () => {
            State.setSelectedMode(m.id);
            DOM.chatModeSelector.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            b.classList.add('active');
            if (State.selectedMode === 'custom') openPromptModal();
        });
        DOM.chatModeSelector.appendChild(b);
    });
}


// --- Project & Session Management Functions ---
/**
 * 새 채팅을 시작하거나 현재 채팅 상태를 초기화합니다.
 */
export function handleNewChat() {
    State.setCurrentSessionId(null);
    Object.values(State.activeTimers).forEach(timers => timers.forEach(clearInterval));
    renderSidebarContent();
    if (DOM.chatMessages) {
        DOM.chatMessages.innerHTML = '';
        DOM.chatMessages.style.display = 'none';
    }
    if (DOM.chatWelcomeMessage) DOM.chatWelcomeMessage.style.display = 'flex';
    if (DOM.chatSessionTitle) DOM.chatSessionTitle.textContent = 'AI 러닝메이트';
    if (DOM.deleteSessionBtn) DOM.deleteSessionBtn.style.display = 'none';
    if (DOM.chatInput) {
        DOM.chatInput.disabled = false;
        DOM.chatInput.value = '';
    }
    if (DOM.chatSendBtn) DOM.chatSendBtn.disabled = false;
}

/**
 * 특정 세션을 선택하고 UI를 업데이트합니다.
 * @param {string} sessionId - 선택할 세션의 ID
 */
export function selectSession(sessionId) {
    removeContextMenu();
    if (!sessionId) return;
    const sessionData = State.localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionData) return;
    
    State.setCurrentSessionId(sessionId);
    Object.values(State.activeTimers).forEach(timers => timers.forEach(clearInterval));
    
    renderSidebarContent();
    if (DOM.chatWelcomeMessage) DOM.chatWelcomeMessage.style.display = 'none';
    if (DOM.chatMessages) DOM.chatMessages.style.display = 'flex';
    renderChatMessages(sessionData);
    if (DOM.chatSessionTitle) DOM.chatSessionTitle.textContent = sessionData.title || '대화';
    if (DOM.deleteSessionBtn) DOM.deleteSessionBtn.style.display = 'inline-block';
    if (DOM.chatInput) DOM.chatInput.disabled = false;
    if (DOM.chatSendBtn) DOM.chatSendBtn.disabled = false;
    DOM.chatInput.focus();
}

/**
 * 세션 삭제 확인 모달을 띄우고 삭제를 진행합니다.
 * @param {string} sessionId - 삭제할 세션 ID
 */
export function handleDeleteSession(sessionId) {
    if (!sessionId) return;
    const sessionToDelete = State.localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionToDelete) return;
    
    showModal(''를 삭제하시겠습니까?, () => {
        if (State.chatSessionsCollectionRef) {
            State.chatSessionsCollectionRef.doc(sessionId).delete().then(() => {
                if (State.currentSessionId === sessionId) {
                    handleNewChat();
                }
            }).catch(e => console.error("세션 삭제 실패:", e));
        }
    });
}

/**
 * 세션의 고정 상태를 토글합니다.
 * @param {string} sessionId - 고정할 세션 ID
 */
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

/**
 * 세션 이름을 변경하기 위해 입력 필드를 활성화합니다.
 * @param {string} sessionId - 이름을 변경할 세션 ID
 */
export function startSessionRename(sessionId) {
    const sessionItem = document.querySelector(.session-item[data-session-id=""]);
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
        if (newTitle && newTitle !== originalTitle) { renameSession(sessionId, newTitle); }
        else { renderSidebarContent(); }
    };
    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { input.blur(); }
        else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); }
    });
}

/**
 * Firestore에서 세션 이름을 변경합니다.
 * @param {string} sessionId - 세션 ID
 * @param {string} newTitle - 새로운 제목
 */
async function renameSession(sessionId, newTitle) {
    if (!newTitle || !sessionId) return;
    try { await State.chatSessionsCollectionRef.doc(sessionId).update({ title: newTitle, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); }
    catch (error) { console.error("Error renaming session:", error); }
}

/**
 * 새 프로젝트를 생성합니다.
 */
async function createNewProject() {
    const baseName = "새 프로젝트";
    const existingNames = new Set(State.localProjectsCache.map(p => p.name));
    let newName = baseName;
    if (existingNames.has(baseName)) {
        let i = 2;
        while (existingNames.has(${baseName} )) { i++; }
        newName = ${baseName} ;
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
    }
}

/**
 * 프로젝트 이름을 변경합니다.
 * @param {string} projectId - 프로젝트 ID
 * @param {string} newName - 새로운 이름
 */
async function renameProject(projectId, newName) {
    if (!newName || !newName.trim() || !projectId) return;
    try {
        await State.projectsCollectionRef.doc(projectId).update({ 
            name: newName.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) { console.error("Error renaming project:", error); }
}

/**
 * 프로젝트를 삭제하고 포함된 세션을 '일반 대화'로 이동시킵니다.
 * @param {string} projectId - 삭제할 프로젝트 ID
 */
async function deleteProject(projectId) {
    const project = State.localProjectsCache.find(p => p.id === projectId);
    if (!project) return;

    const message = 프로젝트 ''를 삭제하시겠습니까? 프로젝트 안의 모든 대화는 '일반 대화'로 이동됩니다.;
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
        } catch (error) { console.error("Error deleting project:", error); }
    });
}

/**
 * 프로젝트 폴더의 확장/축소 상태를 토글합니다.
 * @param {string} projectId - 프로젝트 ID
 */
function toggleProjectExpansion(projectId) {
    const project = State.localProjectsCache.find(p => p.id === projectId);
    if (project) {
        project.isExpanded = !project.isExpanded;
        renderSidebarContent();
    }
}

/**
 * 프로젝트 이름 변경 UI를 시작합니다.
 * @param {string} projectId - 프로젝트 ID
 */
export function startProjectRename(projectId) {
    const projectContainer = document.querySelector(.project-container[data-project-id=""]);
    if (!projectContainer) return;
    const titleSpan = projectContainer.querySelector('.project-title');
    if (!titleSpan) return;

    const originalTitle = titleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text'; input.className = 'project-title-input'; input.value = originalTitle;

    titleSpan.replaceWith(input);
    input.focus(); input.select();

    const finishEditing = () => {
        const newName = input.value.trim();
        if (newName && newName !== originalTitle) { renameProject(projectId, newName); }
         renderSidebarContent();
    };

    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { input.blur(); }
        else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); }
    });
}


// --- Context Menu Functions ---
/**
 * 열려있는 컨텍스트 메뉴를 닫습니다.
 */
function removeContextMenu() {
    if (State.currentOpenContextMenu) {
        State.currentOpenContextMenu.remove();
        State.setCurrentOpenContextMenu(null);
    }
}

/**
 * 프로젝트 컨텍스트 메뉴를 표시합니다.
 * @param {string} projectId - 프로젝트 ID
 * @param {HTMLElement} buttonElement - 메뉴를 연 버튼 요소
 */
function showProjectContextMenu(projectId, buttonElement) {
    removeContextMenu();
    const rect = buttonElement.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'project-context-menu'; 
    menu.style.top = ${rect.bottom + 2}px;
    menu.style.right = '5px';
    menu.innerHTML = 
        <button class="context-menu-item" data-action="rename">이름 변경</button>
        <button class="context-menu-item" data-action="delete">삭제</button>
    ;
    
    DOM.sessionListContainer.appendChild(menu);
    menu.style.display = 'block';
    State.setCurrentOpenContextMenu(menu);

    menu.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = e.target.closest('.context-menu-item')?.dataset.action;
        if (action === 'rename') {
            startProjectRename(projectId);
        } else if (action === 'delete') {
            deleteProject(projectId);
        }
        removeContextMenu();
    });
}

/**
 * 세션 컨텍스트 메뉴를 표시합니다.
 * @param {string} sessionId - 세션 ID
 * @param {number} x - x 좌표
 * @param {number} y - y 좌표
 */
export function showSessionContextMenu(sessionId, x, y) {
    const session = State.localChatSessionsCache.find(s => s.id === sessionId);
    if (!session) return;
    removeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'session-context-menu'; 
    let moveToSubMenuHTML = State.localProjectsCache.map(p => <button class="context-menu-item" data-project-id="" ></button>).join('');
    const moveToMenu = 
        <div class="context-submenu-container">
            <button class="context-menu-item" data-action="move-to"><span>프로젝트로 이동</span><span class="submenu-arrow">▶</span></button>
            <div class="context-submenu">
                <button class="context-menu-item" data-project-id="null" >[일반 대화로 이동]</button>
                <div class="context-menu-separator"></div>
                
            </div>
        </div>
    ;
    const createdAt = session.createdAt?.toDate()?.toLocaleString('ko-KR') || 'N/A';
    const updatedAt = session.updatedAt?.toDate()?.toLocaleString('ko-KR') || 'N/A';
    menu.innerHTML = 
        <button class="context-menu-item" data-action="rename">이름 변경</button>
        
        <button class="context-menu-item" data-action="pin"></button>
        <div class="context-menu-separator"></div>
        <button class="context-menu-item" data-action="delete">삭제</button>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item disabled">생성: </div>
        <div class="context-menu-item disabled">수정: </div>
    ;
    document.body.appendChild(menu);
    const menuWidth = menu.offsetWidth; const menuHeight = menu.offsetHeight;
    const bodyWidth = document.body.clientWidth; const bodyHeight = document.body.clientHeight;
    menu.style.left = ${x + menuWidth > bodyWidth ? x - menuWidth : x}px;
    menu.style.top = ${y + menuHeight > bodyHeight ? y - menuHeight : y}px;
    menu.style.display = 'block';
    State.setCurrentOpenContextMenu(menu);
    menu.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = e.target.closest('.context-menu-item');
        if (!target || target.disabled) return;
        const action = target.dataset.action;
        const projectId = target.dataset.projectId;
        if (action === 'rename') { startSessionRename(sessionId); }
        else if (action === 'pin') { toggleChatPin(sessionId); }
        else if (action === 'delete') { handleDeleteSession(sessionId); }
        else if (projectId !== undefined) { moveSessionToProject(sessionId, projectId === 'null' ? null : projectId); }
        removeContextMenu();
    });
}

/**
 * 세션을 다른 프로젝트로 이동시킵니다.
 * @param {string} sessionId - 이동할 세션 ID
 * @param {string|null} newProjectId - 새로운 프로젝트 ID (null이면 일반 대화로)
 */
export async function moveSessionToProject(sessionId, newProjectId) {
    const session = State.localChatSessionsCache.find(s => s.id === sessionId);
    if (!session || session.projectId === newProjectId) return;
    try {
        await State.chatSessionsCollectionRef.doc(sessionId).update({ projectId: newProjectId, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        if (newProjectId) { await State.projectsCollectionRef.doc(newProjectId).update({ updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); }
    } catch (error) { console.error("Error moving session:", error); }
}
