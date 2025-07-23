/*
--- Module: chat.sessions.js ---
Description: Manages CRUD operations and state for chat sessions and projects.
*/
import { getState, getChatSessionsCollection, getProjectsCollection, setChatSessionsCache, setProjectsCache, setCurrentSessionId, setNewlyCreatedProjectId, setCurrentOpenContextMenu } from '../../core/state.js';
import { updateSidebar, renderChatMessages, handleNewChatUI } from './chat.ui.js';
import { showModal } from '../../core/ui.js';

let unsubscribes = {
    sessions: null,
    projects: null,
};

export function listenToSessions() {
    const collection = getChatSessionsCollection();
    if (!collection) return;
    if (unsubscribes.sessions) unsubscribes.sessions();

    unsubscribes.sessions = collection.onSnapshot(snapshot => {
        const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setChatSessionsCache(sessions);
        updateSidebar();

        const state = getState();
        if (state.currentSessionId) {
            const currentData = sessions.find(s => s.id === state.currentSessionId);
            if (currentData) {
                renderChatMessages(currentData);
            } else {
                // Current session was deleted, reset view
                handleNewChatUI();
            }
        }
    }, error => console.error("Session listener error:", error));
}

export function listenToProjects() {
    const collection = getProjectsCollection();
    if (!collection) return;
    if (unsubscribes.projects) unsubscribes.projects();

    unsubscribes.projects = collection.onSnapshot(snapshot => {
        const state = getState();
        const oldCache = [...state.projectsCache];
        const projects = snapshot.docs.map(doc => ({
            id: doc.id,
            isExpanded: oldCache.find(p => p.id === doc.id)?.isExpanded ?? true,
            ...doc.data()
        }));
        setProjectsCache(projects);
        updateSidebar();
    }, error => console.error("Project listener error:", error));
}

export function selectSession(sessionId) {
    removeCurrentContextMenu();
    if (!sessionId) return;

    const state = getState();
    const sessionData = state.chatSessionsCache.find(s => s.id === sessionId);
    if (!sessionData) return;

    setCurrentSessionId(sessionId);
    Object.values(state.activeTimers).forEach(timers => timers.forEach(clearInterval));
    state.activeTimers = {};

    updateSidebar();

    const { chatWelcomeMessage, chatMessages, chatSessionTitle, deleteSessionBtn, chatInput, chatSendBtn } = state.elements;
    if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
    if (chatMessages) chatMessages.style.display = 'flex';

    renderChatMessages(sessionData);

    if (chatSessionTitle) chatSessionTitle.textContent = sessionData.title || '대화';
    if (deleteSessionBtn) deleteSessionBtn.style.display = 'inline-block';
    if (chatInput) chatInput.disabled = false;
    if (chatSendBtn) chatSendBtn.disabled = false;
    chatInput.focus();
}

export async function createNewProject() {
    const projectsCollection = getProjectsCollection();
    const state = getState();

    const baseName = "새 프로젝트";
    const existingNames = new Set(state.projectsCache.map(p => p.name));
    let newName = baseName;
    let i = 2;
    while (existingNames.has(newName)) {
        newName = `${baseName} ${i}`;
        i++;
    }

    try {
        const newProjectRef = await projectsCollection.add({
            name: newName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        setNewlyCreatedProjectId(newProjectRef.id);
    } catch (error) {
        console.error("Error creating new project:", error);
        alert("프로젝트 생성에 실패했습니다.");
    }
}

async function renameProject(projectId, newName) {
    if (!newName || !newName.trim() || !projectId) return;
    const projectsCollection = getProjectsCollection();
    try {
        await projectsCollection.doc(projectId).update({ 
            name: newName.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error renaming project:", error);
        alert("프로젝트 이름 변경에 실패했습니다.");
    }
}

function removeCurrentContextMenu() {
    const state = getState();
    if (state.currentOpenContextMenu) {
        state.currentOpenContextMenu.remove();
        setCurrentOpenContextMenu(null);
    }
}

export function showSessionContextMenu(sessionId, x, y) {
    const state = getState();
    const session = state.chatSessionsCache.find(s => s.id === sessionId);
    if (!session) return;
    removeCurrentContextMenu();

    const menu = document.createElement('div');
    menu.className = 'session-context-menu';

    let moveToSubMenuHTML = state.projectsCache.map(p => `<button class="context-menu-item" data-project-id="${p.id}" ${session.projectId === p.id ? 'disabled' : ''}>${p.name}</button>`).join('');
    const moveToMenu = `
        <div class="context-submenu-container">
            <button class="context-menu-item" data-action="move-to"><span>프로젝트로 이동</span><span class="submenu-arrow">▶</span></button>
            <div class="context-submenu">
                <button class="context-menu-item" data-project-id="null" ${!session.projectId ? 'disabled' : ''}>[일반 대화로 이동]</button>
                <div class="context-menu-separator"></div>
                ${moveToSubMenuHTML}
            </div>
        </div>`;

    const createdAt = session.createdAt?.toDate()?.toLocaleString('ko-KR') || 'N/A';
    const updatedAt = session.updatedAt?.toDate()?.toLocaleString('ko-KR') || 'N/A';

    menu.innerHTML = `
        <button class="context-menu-item" data-action="rename">이름 변경</button>
        ${moveToMenu}
        <button class="context-menu-item" data-action="pin">${session.isPinned ? '고정 해제' : '고정하기'}</button>
        <div class="context-menu-separator"></div>
        <button class="context-menu-item" data-action="delete">삭제</button>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item disabled">생성: ${createdAt}</div>
        <div class="context-menu-item disabled">수정: ${updatedAt}</div>`;

    document.body.appendChild(menu);

    const menuRect = menu.getBoundingClientRect();
    const bodyRect = document.body.getBoundingClientRect();
    menu.style.left = `${x + menuRect.width > bodyRect.width ? x - menuRect.width : x}px`;
    menu.style.top = `${y + menuRect.height > bodyRect.height ? y - menuRect.height : y}px`;
    menu.style.display = 'block';
    setCurrentOpenContextMenu(menu);

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

        removeCurrentContextMenu();
    });
}

export async function toggleChatPin(sessionId) {
    const collection = getChatSessionsCollection();
    const session = getState().chatSessionsCache.find(s => s.id === sessionId);
    if (!collection || !session) return;
    try {
        await collection.doc(sessionId).update({ 
            isPinned: !(session.isPinned || false),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
        });
    } catch (error) { console.error("Error toggling pin status:", error); }
}

export async function moveSessionToProject(sessionId, newProjectId) {
    const state = getState();
    const session = state.chatSessionsCache.find(s => s.id === sessionId);
    if (!session || (session.projectId || null) === (newProjectId || null)) return;

    try {
        const sessionRef = getChatSessionsCollection().doc(sessionId);
        await sessionRef.update({ projectId: newProjectId, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });

        if (newProjectId) {
            const projectRef = getProjectsCollection().doc(newProjectId);
            await projectRef.update({ updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        }
    } catch (error) {
        console.error("Error moving session:", error);
        alert("세션 이동에 실패했습니다.");
    }
}

export function startSessionRename(sessionId) {
    const sessionItem = document.querySelector(`.session-item[data-session-id="${sessionId}"]`);
    if (!sessionItem) return;
    const titleSpan = sessionItem.querySelector('.session-item-title');
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
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== originalTitle) {
            renameSession(sessionId, newTitle);
        } else {
            // Restore original if unchanged or empty
            updateSidebar();
        }
    };

    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); }
    });
}

async function renameSession(sessionId, newTitle) {
    if (!newTitle || !sessionId) return;
    const collection = getChatSessionsCollection();
    try {
        await collection.doc(sessionId).update({ title: newTitle, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    } catch (error) {
        console.error("Error renaming session:", error);
        alert("세션 이름 변경에 실패했습니다.");
    }
}

function handleDeleteSession(sessionId) {
    if (!sessionId) return;
    const sessionToDelete = getState().chatSessionsCache.find(s => s.id === sessionId);
    if (!sessionToDelete) return;

    showModal(`'${sessionToDelete?.title || '이 대화'}'를 삭제하시겠습니까?`, async () => {
        const collection = getChatSessionsCollection();
        try {
            await collection.doc(sessionId).delete();
            console.log("Session deleted successfully");
            if (getState().currentSessionId === sessionId) {
                handleNewChatUI();
            }
        } catch (e) {
            console.error("세션 삭제 실패:", e);
        }
    });
}