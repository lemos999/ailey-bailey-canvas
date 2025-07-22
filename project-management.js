
function listenToProjects() {
    return new Promise((resolve) => {
        if (!projectsCollectionRef) return resolve();
        if (unsubscribeFromProjects) unsubscribeFromProjects();
        unsubscribeFromProjects = projectsCollectionRef.onSnapshot(snapshot => {
            const oldCache = [...localProjectsCache];
            localProjectsCache = snapshot.docs.map(doc => ({
                id: doc.id,
                isExpanded: oldCache.find(p => p.id === doc.id)?.isExpanded ?? true,
                ...doc.data()
            }));

            renderSidebarContent();

            if (newlyCreatedProjectId) {
                const newProjectElement = document.querySelector(`.project-container[data-project-id="${newlyCreatedProjectId}"]`);
                if (newProjectElement) {
                    startProjectRename(newlyCreatedProjectId);
                    newlyCreatedProjectId = null;
                }
            }

            resolve();
        }, error => {
            console.error("Project listener error:", error);
            resolve();
        });
    });
}

function getNewProjectDefaultName() {
    const baseName = "새 프로젝트";
    const existingNames = new Set(localProjectsCache.map(p => p.name));
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
                batch.update(sessionRef, {
                    projectId: null
                });
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

function toggleProjectExpansion(projectId) {
    const project = localProjectsCache.find(p => p.id === projectId);
    if (project) {
        project.isExpanded = !project.isExpanded;
        renderSidebarContent();
    }
}

function removeContextMenu() {
    currentOpenContextMenu?.remove();
    currentOpenContextMenu = null;
}

function showProjectContextMenu(projectId, buttonElement) {
    removeContextMenu();
    const rect = buttonElement.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'project-context-menu';
    menu.style.position = 'absolute';
    menu.style.top = `${rect.bottom + 2}px`;
    menu.style.right = '5px';
    menu.innerHTML = `
        <button data-action="rename">이름 변경</button>
        <button data-action="delete">삭제</button>
    `;

    sessionListContainer.appendChild(menu);
    menu.style.display = 'block';
    currentOpenContextMenu = menu;

    menu.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = e.target.dataset.action;
        if (action === 'rename') {
            startProjectRename(projectId);
        } else if (action === 'delete') {
            deleteProject(projectId);
        }
        removeContextMenu();
    });
}

function startProjectRename(projectId) {
    const projectContainer = document.querySelector(`.project-container[data-project-id="${projectId}"]`);
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
        }
        renderSidebarContent();
    };

    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
            input.value = originalTitle;
            input.blur();
        }
    });
}
