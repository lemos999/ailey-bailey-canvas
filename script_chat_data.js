/*
--- Ailey & Bailey Canvas ---
File: script_chat_data.js
Version: 12.0 (Modular JS Refactor)
Architect: [Username] & System Architect Ailey
Description: Handles all data layer interactions with Firebase Firestore for the chat application. This includes CRUD operations for projects and chat sessions.
*/

// --- 3. Function Definitions (Chat Data Management) ---

/**
 * Firestore에 새로운 채팅 프로젝트를 생성합니다.
 */
async function createNewProject() {
    const newName = getNewProjectDefaultName(); // This helper function remains in script_chat_app.js for now as it depends on local cache state
    try {
        const newProjectRef = await projectsCollectionRef.add({
            name: newName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        newlyCreatedProjectId = newProjectRef.id; // Global state to trigger rename UI
    } catch (error) {
        console.error("Error creating new project:", error);
        alert("프로젝트 생성에 실패했습니다.");
    }
}

/**
 * 지정된 프로젝트의 이름을 변경합니다.
 * @param {string} projectId - 변경할 프로젝트의 ID
 * @param {string} newName - 새로운 프로젝트 이름
 */
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

/**
 * 지정된 프로젝트를 삭제합니다. 내부의 세션들은 '일반 대화'로 이동됩니다.
 * @param {string} projectId - 삭제할 프로젝트의 ID
 */
async function deleteProject(projectId) {
    const project = localProjectsCache.find(p => p.id === projectId);
    if (!project) return;

    const message = `프로젝트 '${project.name}'를 삭제하시겠습니까? 프로젝트 안의 모든 대화는 '일반 대화'로 이동됩니다.`;
    showModal(message, async () => {
        try {
            const batch = db.batch();

            // Find sessions belonging to this project
            const sessionsToMove = localChatSessionsCache.filter(s => s.projectId === projectId);
            sessionsToMove.forEach(session => {
                const sessionRef = chatSessionsCollectionRef.doc(session.id);
                batch.update(sessionRef, { projectId: null });
            });

            // Delete the project itself
            const projectRef = projectsCollectionRef.doc(projectId);
            batch.delete(projectRef);

            // Commit all batched writes
            await batch.commit();
        } catch (error) {
            console.error("Error deleting project:", error);
            alert("프로젝트 삭제에 실패했습니다.");
        }
    });
}

/**
 * 지정된 세션을 다른 프로젝트로 이동시킵니다.
 * @param {string} sessionId - 이동할 세션의 ID
 * @param {string | null} newProjectId - 이동할 대상 프로젝트의 ID (null이면 '일반 대화'로 이동)
 */
async function moveSessionToProject(sessionId, newProjectId) {
    const session = localChatSessionsCache.find(s => s.id === sessionId);
    if (!session || session.projectId === newProjectId) return;

    try {
        // Update the session's projectId
        await chatSessionsCollectionRef.doc(sessionId).update({
            projectId: newProjectId,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        // Also update the target project's timestamp to bring it to the top
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


/**
 * 지정된 세션의 고정 상태를 토글합니다.
 * @param {string} sessionId - 고정 상태를 변경할 세션의 ID
 */
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

/**
 * 지정된 세션의 제목을 변경합니다.
 * @param {string} sessionId - 이름을 변경할 세션의 ID
 * @param {string} newTitle - 새로운 세션 제목
 */
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


/**
 * 현재 활성화된 세션을 삭제합니다.
 * @param {string} sessionId - 삭제할 세션의 ID
 */
function handleDeleteSession(sessionId) {
    if (!sessionId) return;
    const sessionToDelete = localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionToDelete) return;

    showModal(`'${sessionToDelete?.title || '이 대화'}'를 삭제하시겠습니까?`, () => {
        if (chatSessionsCollectionRef) {
            chatSessionsCollectionRef.doc(sessionId).delete().then(() => {
                console.log("Session deleted successfully");
                if (currentSessionId === sessionId) {
                    handleNewChat(); // Go to a clean state if the active session is deleted
                }
            }).catch(e => {
                console.error("세션 삭제 실패:", e);
                alert("세션 삭제에 실패했습니다.");
            });
        }
    });
}