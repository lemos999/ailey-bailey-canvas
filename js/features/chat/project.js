import { state, setState } from '../../core/state.js';
import { renderSidebarContent } from './sidebar.js';

export function listenToProjects() {
    return new Promise((resolve) => {
        if (!state.projectsCollectionRef) return resolve();
        if (state.unsubscribeFromProjects) state.unsubscribeFromProjects();
        const unsub = state.projectsCollectionRef.onSnapshot(snapshot => {
            const oldCache = [...state.localProjectsCache];
            const newCache = snapshot.docs.map(doc => ({
                id: doc.id,
                isExpanded: oldCache.find(p => p.id === doc.id)?.isExpanded ?? true,
                ...doc.data()
            }));
            setState('localProjectsCache', newCache);
            renderSidebarContent();
            if (state.newlyCreatedProjectId) {
                const newProjectElement = document.querySelector(.project-container[data-project-id=""]);
                if (newProjectElement) {
                    startProjectRename(state.newlyCreatedProjectId);
                    setState('newlyCreatedProjectId', null);
                }
            }
            resolve();
        }, error => {
            console.error("Project listener error:", error);
            resolve();
        });
        setState('unsubscribeFromProjects', unsub);
    });
}

function getNewProjectDefaultName() {
    const baseName = "새 프로젝트";
    const existingNames = new Set(state.localProjectsCache.map(p => p.name));
    if (!existingNames.has(baseName)) return baseName;
    let i = 2;
    while (existingNames.has(${baseName} )) { i++; }
    return ${baseName} ;
}

export async function createNewProject() {
    if (!state.projectsCollectionRef) return;
    const newName = getNewProjectDefaultName();
    try {
        const newProjectRef = await state.projectsCollectionRef.add({
            name: newName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        setState('newlyCreatedProjectId', newProjectRef.id);
    } catch (error) { console.error("Error creating new project:", error); }
}

async function renameProject(projectId, newName) {
    if (!newName || !newName.trim() || !projectId || !state.projectsCollectionRef) return;
    try {
        await state.projectsCollectionRef.doc(projectId).update({ 
            name: newName.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) { console.error("Error renaming project:", error); }
}

export async function deleteProject(projectId) {
    if (!state.projectsCollectionRef || !state.db) return;
    const project = state.localProjectsCache.find(p => p.id === projectId);
    if (!project) return;
    
    // Using confirm for simplicity as showModal is in another module. Could be improved with event emitter.
    if(confirm(프로젝트 ''를 삭제하시겠습니까? 프로젝트 안의 모든 대화는 '일반 대화'로 이동됩니다.)) {
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
        } catch (error) { console.error("Error deleting project:", error); }
    }
}

export function toggleProjectExpansion(projectId) {
    const project = state.localProjectsCache.find(p => p.id === projectId);
    if (project) {
        project.isExpanded = !project.isExpanded;
        renderSidebarContent();
    }
}

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
        if (newName && newName !== originalTitle) {
             renameProject(projectId, newName);
        }
         renderSidebarContent();
    };
    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); }
    });
}
