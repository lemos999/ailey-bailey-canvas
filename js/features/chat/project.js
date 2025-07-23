// Migrated content for js/features/chat/project.js

export function listenToProjects() {
        return new Promise((resolve) => {
            if (!projectsCollectionRef) return resolve();
            if (unsubscribeFromProjects) unsubscribeFromProjects();
            unsubscribeFromProjects = projectsCollectionRef.onSnapshot(snapshot => {
                const oldCache = [...localProjectsCache];
                localProjectsCache = snapshot.docs.map(doc => ({
                    id: doc.id,
                    isExpanded: oldCache.find(p => p.id === doc.id)?.isExpanded ?? true,
                    ...doc.data()
                }

export async function createNewProject() {
        const newName = getNewProjectDefaultName();
        try {
            const newProjectRef = await projectsCollectionRef.add({
                name: newName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }

export async function renameProject(projectId, newName) {
        if (!newName || !newName.trim() || !projectId) return;
        try {
            await projectsCollectionRef.doc(projectId).update({ 
                name: newName.trim(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }

export async function deleteProject(projectId) {
        const project = localProjectsCache.find(p => p.id === projectId);
        if (!project) return;
    
        const message = `프로젝트 '${project.name}

export function toggleProjectExpansion(projectId) {
        const project = localProjectsCache.find(p => p.id === projectId);
        if (project) {
            project.isExpanded = !project.isExpanded;
            renderSidebarContent();
        }

export function startProjectRename(projectId) {
        const projectContainer = document.querySelector(`.project-container[data-project-id="${projectId}