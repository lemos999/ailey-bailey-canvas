/* --- Ailey & Bailey Canvas --- */
// File: 200_chat_data.js
// Version: 2.6 (Final)
// Description: Stabilized data fetching logic for infinite scroll and real-time updates.

const MESSAGES_PER_PAGE = 25;

// --- Prompt Template Data Management ---

async function addPromptTemplate(templateData) {
    if (!promptTemplatesCollectionRef) return null;
    try {
        const docRef = await promptTemplatesCollectionRef.add({
            ...templateData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding prompt template:", error);
        alert("프롬프트 템플릿 추가에 실패했습니다.");
        return null;
    }
}

async function updatePromptTemplate(templateId, templateData) {
    if (!promptTemplatesCollectionRef || !templateId) return;
    try {
        await promptTemplatesCollectionRef.doc(templateId).update({
            ...templateData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
        console.error("Error updating prompt template:", error);
        alert("프롬프트 템플릿 업데이트에 실패했습니다.");
    }
}

async function deletePromptTemplate(templateId) {
    if (!promptTemplatesCollectionRef || !templateId) return;
    try {
        await promptTemplatesCollectionRef.doc(templateId).delete();
    } catch (error) {
        console.error("Error deleting prompt template:", error);
        alert("프롬프트 템플릿 삭제에 실패했습니다.");
    }
}

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

        const query = chatSessionsCollectionRef.orderBy("updatedAt", "desc");

        unsubscribeFromChatSessions = query.onSnapshot(snapshot => {
            const changes = snapshot.docChanges();
            let shouldRerenderSidebar = false;

            changes.forEach(change => {
                const data = { id: change.doc.id, ...change.doc.data() };
                const index = localChatSessionsCache.findIndex(s => s.id === change.doc.id);

                if (change.type === "added") {
                    if (index === -1) {
                        localChatSessionsCache.push(data);
                        shouldRerenderSidebar = true;
                    }
                } else if (change.type === "modified") {
                    if (index !== -1) {
                        const oldMessages = localChatSessionsCache[index].messages;
                        localChatSessionsCache[index] = { ...localChatSessionsCache[index], ...data };
                        if (!data.messages) {
                           localChatSessionsCache[index].messages = oldMessages;
                        }
                        shouldRerenderSidebar = true;
                    }
                } else if (change.type === "removed") {
                    if (index !== -1) {
                        localChatSessionsCache.splice(index, 1);
                        shouldRerenderSidebar = true;
                    }
                }
            });

            if (shouldRerenderSidebar) {
                 localChatSessionsCache.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
                 renderSidebarContent();
            }

            resolve();
        }, error => { console.error("Chat session listener error:", error); resolve(); });
    });
}

// --- Chat Data Management Functions ---

async function fetchPastMessages(sessionId, beforeTimestamp, limit = MESSAGES_PER_PAGE) {
    if (!chatSessionsCollectionRef) return [];
    try {
        let query = chatSessionsCollectionRef.doc(sessionId).collection("messages")
            .orderBy("timestamp", "desc")
            .limit(limit);

        if (beforeTimestamp) {
            query = query.startAfter(beforeTimestamp);
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching past messages:", error);
        return [];
    }
}

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

async function createProjectFromSessions(sessionIds) {
    if (!sessionIds || sessionIds.length < 2) return;
    const newName = getNewProjectDefaultName();
    try {
        const batch = db.batch();
        const newProjectRef = projectsCollectionRef.doc();
        batch.set(newProjectRef, {
            name: newName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        sessionIds.forEach(sessionId => {
            const sessionRef = chatSessionsCollectionRef.doc(sessionId);
            batch.update(sessionRef, { projectId: newProjectRef.id });
        });
        await batch.commit();
        newlyCreatedProjectId = newProjectRef.id;
    } catch (error) {
        console.error("Error creating project from sessions:", error);
        alert("세션을 합쳐 프로젝트 생성에 실패했습니다.");
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
        const batch = db.batch();
        const sessionRef = chatSessionsCollectionRef.doc(sessionId);
        batch.update(sessionRef, {
            projectId: newProjectId,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (newProjectId) {
            const projectRef = projectsCollectionRef.doc(newProjectId);
            batch.update(projectRef, {
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        await batch.commit();
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
            const messagesCollection = chatSessionsCollectionRef.doc(sessionId).collection("messages");
            messagesCollection.get().then(snapshot => {
                const batch = db.batch();
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                return batch.commit().then(() => {
                     chatSessionsCollectionRef.doc(sessionId).delete();
                     console.log("Session and its messages deleted successfully");
                     if (currentSessionId === sessionId) {
                        handleNewChat();
                     }
                });
            }).catch(e => {
                console.error("세션 삭제 실패:", e);
                alert("세션 삭제에 실패했습니다.");
            });
        }
    });
}