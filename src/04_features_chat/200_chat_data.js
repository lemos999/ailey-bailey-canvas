/*
--- Ailey & Bailey Canvas ---
File: 200_chat_data.js
Version: 1.0 (Bundled)
Description: Handles all data layer interactions with Firebase Firestore for the chat application.
*/

// --- Chat Data Listeners (moved from firebase.js) ---
function listenToProjects() {
    return new Promise((resolve) => {
        if (!projectsCollectionRef) return resolve();
        if (unsubscribeFromProjects) unsubscribeFromProjects();
        unsubscribeFromProjects = projectsCollectionRef.onSnapshot(snapshot => {
            const oldCache = [...localProjectsCache];
            localProjectsCache = snapshot.docs.map(doc => ({
                id: doc.id,
                isExpanded: oldCache.find(p => p.id === doc.id)?.isExpanded ?? true, ...doc.data()
            }));
            renderSidebarContent();
            if (newlyCreatedProjectId) {
                const newProjectElement = document.querySelector(`.project-container[data-project-id="${newlyCreatedProjectId}"]`);
                if (newProjectElement) { startProjectRename(newlyCreatedProjectId); newlyCreatedProjectId = null; }
            }
            resolve();
        }, error => { console.error("Project listener error:", error); resolve(); });
    });
}

function listenToChatSessions() {
    return new Promise((resolve) => {
        if (!chatSessionsCollectionRef) return resolve();
        if (unsubscribeFromChatSessions) unsubscribeFromChatSessions();
        unsubscribeFromChatSessions = chatSessionsCollectionRef.onSnapshot(snapshot => {
            localChatSessionsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderSidebarContent();
            if (currentSessionId) {
                const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId);
                if (!currentSessionData) handleNewChat();
                else renderChatMessages(currentSessionData);
            }
            resolve();
        }, error => { console.error("Chat session listener error:", error); resolve(); });
    });
}

// --- Chat Data Management Functions ---
async function createNewProject() {
    const newName = getNewProjectDefaultName();
    try {
        const newProjectRef = await projectsCollectionRef.add({
            name: newName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        newlyCreatedProjectId = newProjectRef.id;
    } catch (error) {
        console.error("Error creating new project:", error);
        alert("프로젝트 생성에 실패했습니다.");
    }
}

async function renameProject(projectId, newName) {
    if (!newName || !newName.trim() || !projectId) return;
    try {
        await projectsCollectionRef.doc(projectId).update({
            name: newName.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error renaming project:", error);
        alert("프로젝트 이름 변경에 실패했습니다.");
    }
}

async function deleteProject(projectId) {
    const project = localProjectsCache.find(p => p.id === projectId);
    if (!project) return;

    const message = `프로젝트 '${project.name}'를 삭제하시겠습니까? 프로젝트 안의 모든 대화는 '일반 대화'로 이동됩니다.`;
    showModal(message, async () => {
        try {
            const batch = db.batch();
            const sessionsToMove = localChatSessionsCache.filter(s => s.projectId === projectId);
            sessionsToMove.forEach(session => {
                const sessionRef = chatSessionsCollectionRef.doc(session.id);
                batch.update(sessionRef, { projectId: null });
            });
            const projectRef = projectsCollectionRef.doc(projectId);
            batch.delete(projectRef);
            await batch.commit();
        } catch (error) {
            console.error("Error deleting project:", error);
            alert("프로젝트 삭제에 실패했습니다.");
        }
    });
}

async function moveSessionToProject(sessionId, newProjectId) {
    const session = localChatSessionsCache.find(s => s.id === sessionId);
    if (!session || session.projectId === newProjectId) return;

    try {
        await chatSessionsCollectionRef.doc(sessionId).update({
            projectId: newProjectId,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (newProjectId) {
            await projectsCollectionRef.doc(newProjectId).update({
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error("Error moving session:", error);
        alert("세션 이동에 실패했습니다.");
    }
}

async function toggleChatPin(sessionId) {
    if (!chatSessionsCollectionRef || !sessionId) return;
    const sessionRef = chatSessionsCollectionRef.doc(sessionId);
    const currentSession = localChatSessionsCache.find(s => s.id === sessionId);
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

async function renameSession(sessionId, newTitle) {
    if (!newTitle || !sessionId) return;
    try {
        await chatSessionsCollectionRef.doc(sessionId).update({
            title: newTitle,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error renaming session:", error);
        alert("세션 이름 변경에 실패했습니다.");
    }
}

function handleDeleteSession(sessionId) {
    if (!sessionId) return;
    const sessionToDelete = localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionToDelete) return;

    showModal(`'${sessionToDelete?.title || '이 대화'}'를 삭제하시겠습니까?`, () => {
        if (chatSessionsCollectionRef) {
            chatSessionsCollectionRef.doc(sessionId).delete().then(() => {
                console.log("Session deleted successfully");
                if (currentSessionId === sessionId) {
                    handleNewChat();
                }
            }).catch(e => {
                console.error("세션 삭제 실패:", e);
                alert("세션 삭제에 실패했습니다.");
            });
        }
    });
}