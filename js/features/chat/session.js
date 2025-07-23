import { state, setState } from '../../core/state.js';
import { dom } from '../../ui/dom.js';
import { showModal } from '../../core/utils.js';
import { renderChatMessages, clearTimers } from './ui.js';
import { renderSidebarContent } from './sidebar.js';

export function listenToChatSessions() {
    return new Promise((resolve) => {
        if (!state.chatSessionsCollectionRef) return resolve();
        if (state.unsubscribeFromChatSessions) state.unsubscribeFromChatSessions();
        const unsub = state.chatSessionsCollectionRef.onSnapshot(snapshot => {
            setState('localChatSessionsCache', snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            renderSidebarContent();
            if (state.currentSessionId) {
                const currentSessionData = state.localChatSessionsCache.find(s => s.id === state.currentSessionId);
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
        setState('unsubscribeFromChatSessions', unsub);
    });
}

export function selectSession(sessionId) {
    if (state.currentOpenContextMenu) state.currentOpenContextMenu.remove();
    if (!sessionId) return;
    const sessionData = state.localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionData) return;
    
    setState('currentSessionId', sessionId);
    Object.values(state.activeTimers).forEach(timers => timers.forEach(clearInterval));
    setState('activeTimers', {});

    renderSidebarContent();
    if (dom.chatWelcomeMessage) dom.chatWelcomeMessage.style.display = 'none';
    if (dom.chatMessages) dom.chatMessages.style.display = 'flex';
    renderChatMessages(sessionData);
    if (dom.chatSessionTitle) dom.chatSessionTitle.textContent = sessionData.title || '대화';
    if (dom.deleteSessionBtn) dom.deleteSessionBtn.style.display = 'inline-block';
    if (dom.chatInput) {
        dom.chatInput.disabled = false;
        dom.chatInput.focus();
    }
    if (dom.chatSendBtn) dom.chatSendBtn.disabled = false;
}

export function handleNewChat() {
    setState('currentSessionId', null);
    Object.values(state.activeTimers).forEach(timers => timers.forEach(clearInterval));
    setState('activeTimers', {});
    
    renderSidebarContent();
    if (dom.chatMessages) {
        dom.chatMessages.innerHTML = '';
        dom.chatMessages.style.display = 'none';
    }
    if (dom.chatWelcomeMessage) dom.chatWelcomeMessage.style.display = 'flex';
    if (dom.chatSessionTitle) dom.chatSessionTitle.textContent = 'AI 러닝메이트';
    if (dom.deleteSessionBtn) dom.deleteSessionBtn.style.display = 'none';
    if (dom.chatInput) {
        dom.chatInput.disabled = false;
        dom.chatInput.value = '';
    }
    if (dom.chatSendBtn) dom.chatSendBtn.disabled = false;
}

export function handleDeleteSession(sessionId) {
    if (!sessionId) return;
    const sessionToDelete = state.localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionToDelete) return;
    
    showModal(''를 삭제하시겠습니까?, () => {
        if (state.chatSessionsCollectionRef) {
            state.chatSessionsCollectionRef.doc(sessionId).delete().then(() => {
                console.log("Session deleted successfully");
                if (state.currentSessionId === sessionId) {
                    handleNewChat();
                }
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
    if (!session || session.projectId === newProjectId) return;
    try {
        await state.chatSessionsCollectionRef.doc(sessionId).update({ 
            projectId: newProjectId, 
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
        });
        if (newProjectId && state.projectsCollectionRef) { 
            await state.projectsCollectionRef.doc(newProjectId).update({ 
                updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
            }); 
        }
    } catch (error) { console.error("Error moving session:", error); alert("세션 이동에 실패했습니다."); }
}

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

async function renameSession(sessionId, newTitle) {
    if (!newTitle || !sessionId || !state.chatSessionsCollectionRef) return;
    try { await state.chatSessionsCollectionRef.doc(sessionId).update({ title: newTitle, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); }
    catch (error) { console.error("Error renaming session:", error); alert("세션 이름 변경에 실패했습니다."); }
}
