/*
--- Ailey & Bailey Canvas ---
File: js/chat-session.js
Version: 11.0 (Refactored)
Architect: [Username] & System Architect Ailey
Description: Manages the lifecycle and data of chat sessions and projects, including creation, deletion, renaming, and moving sessions between projects.
*/

import * as state from './state.js';
import { showModal } from './ui-manager.js';
import { handleNewChat, selectSession, renderSidebarContent, startSessionRename, showSessionContextMenu, removeContextMenu } from './chat-ui.js';

let searchSessionsInput;

export function initializeChatSessionManager() {
    searchSessionsInput = document.getElementById('search-sessions-input');
    
    const newChatBtn = document.getElementById('new-chat-btn');
    const newProjectBtn = document.getElementById('new-project-btn');
    
    if (newChatBtn) newChatBtn.addEventListener('click', handleNewChat);
    if (newProjectBtn) newProjectBtn.addEventListener('click', createNewProject);
    if (searchSessionsInput) searchSessionsInput.addEventListener('input', renderSidebarContent);
}

export function handleSessionsUpdate(sessions) {
    state.setLocalChatSessionsCache(sessions);
    renderSidebarContent();
    if (state.currentSessionId) {
        const currentSessionData = state.localChatSessionsCache.find(s => s.id === state.currentSessionId);
        if (!currentSessionData) {
            handleNewChat();
        } else {
            // Re-render messages with updated data (e.g., from another device)
            const { renderChatMessages } = await import('./chat-core.js');
            renderChatMessages(currentSessionData);
        }
    }
}

export function handleProjectsUpdate(projects) {
    const oldCache = [...state.localProjectsCache];
    const newProjects = projects.map(doc => ({
        id: doc.id,
        isExpanded: oldCache.find(p => p.id === doc.id)?.isExpanded ?? true,
        ...doc
    }));
    state.setLocalProjectsCache(newProjects);
    
    renderSidebarContent();

    if (state.newlyCreatedProjectId) {
        const newProjectElement = document.querySelector(`.project-container[data-project-id="${state.newlyCreatedProjectId}"]`);
        if (newProjectElement) {
            startProjectRename(state.newlyCreatedProjectId);
            state.setNewlyCreatedProjectId(null);
        }
    }
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

async function createNewProject() {
    if (!state.projectsCollectionRef) return;
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
    if (!newName || !newName.trim() || !projectId || !state.projectsCollectionRef) return;
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

export function deleteProject(projectId) {
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

export function handleDeleteSession(sessionId) {
    if (!sessionId) return;
    const sessionToDelete = state.localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionToDelete) return;
    
    showModal(`'${sessionToDelete?.title || '이 대화'}'를 삭제하시겠습니까?`, () => {
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
    if (!session || session.projectId === newProjectId || !state.chatSessionsCollectionRef) return;
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
    } catch (error) {
        console.error("Error moving session:", error);
        alert("세션 이동에 실패했습니다.");
    }
}

export async function renameSession(sessionId, newTitle) {
    if (!newTitle || !sessionId || !state.chatSessionsCollectionRef) return;
    try {
        await state.chatSessionsCollectionRef.doc(sessionId).update({
            title: newTitle,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error renaming session:", error);
        alert("세션 이름 변경에 실패했습니다.");
    }
}

export function getRelativeDateGroup(timestamp, isPinned = false) {
    if (isPinned) {
        return { key: 0, label: '📌 고정됨' };
    }

    if (!timestamp) {
        return { key: 99, label: '날짜 정보 없음' };
    }

    const now = new Date();
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    
    now.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const diffTime = now.getTime() - date.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

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

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    if (dateYear === lastMonth.getFullYear() && dateMonth === lastMonth.getMonth()) {
         return { key: 5, label: '지난 달' };
    }

    return { key: 6 + (nowYear - dateYear) * 12 + (nowMonth - dateMonth), label: `${dateYear}년 ${dateMonth + 1}월` };
}