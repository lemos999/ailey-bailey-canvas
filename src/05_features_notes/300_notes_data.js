/*
--- Ailey & Bailey Canvas ---
File: 300_notes_data.js
Version: 1.0 (Bundled)
Description: Handles all data layer interactions with Firebase Firestore for the Notes App.
*/

// --- Notes Data Listeners (moved from firebase.js) ---
function listenToNotes() { 
    return new Promise(resolve => { 
        if (!notesCollectionRef) return resolve(); 
        if (unsubscribeFromNotes) unsubscribeFromNotes(); 
        unsubscribeFromNotes = notesCollectionRef.onSnapshot(s => { 
            localNotesCache = s.docs.map(d => ({ id: d.id, ...d.data() })); 
            if (document.getElementById('notes-app-panel')?.style.display === 'flex') renderNoteList(); 
            resolve(); 
        }, e => { console.error("노트 수신 오류:", e); resolve(); }); 
    }); 
}

function listenToNoteProjects() {
    return new Promise((resolve) => {
        if (!noteProjectsCollectionRef) return resolve();
        if (unsubscribeFromNoteProjects) unsubscribeFromNoteProjects();
        unsubscribeFromNoteProjects = noteProjectsCollectionRef.onSnapshot(snapshot => {
            const oldCache = [...localNoteProjectsCache];
            localNoteProjectsCache = snapshot.docs.map(doc => ({
                id: doc.id,
                isExpanded: oldCache.find(p => p.id === doc.id)?.isExpanded ?? true, ...doc.data()
            }));
            if (document.getElementById('notes-app-panel')?.style.display === 'flex') renderNoteList();
            if (newlyCreatedNoteProjectId) {
                const newProjectElement = document.querySelector(`.note-project-container[data-project-id="${newlyCreatedNoteProjectId}"]`);
                if (newProjectElement) { startNoteProjectRename(newlyCreatedNoteProjectId); newlyCreatedNoteProjectId = null; }
            }
            resolve();
        }, error => { console.error("Note Project listener error:", error); resolve(); });
    });
}

function listenToTags() {
    return new Promise((resolve) => {
        if (!tagsCollectionRef) return resolve();
        if (unsubscribeFromTags) unsubscribeFromTags();
        unsubscribeFromTags = tagsCollectionRef.onSnapshot(snapshot => {
            localTagsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            resolve();
        }, error => { console.error("Tags listener error:", error); resolve(); });
    });
}

function listenToNoteTemplates() {
    return new Promise((resolve) => {
        if (!noteTemplatesCollectionRef) return resolve();
        if (unsubscribeFromNoteTemplates) unsubscribeFromNoteTemplates();
        unsubscribeFromNoteTemplates = noteTemplatesCollectionRef.onSnapshot(snapshot => {
            noteTemplatesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            resolve();
        }, error => { console.error("Note Templates listener error:", error); resolve(); });
    });
}

// --- Notes Data Management Functions ---
async function addNote(content = '') {
    if (!notesCollectionRef) return null;
    try {
        const activeProject = document.querySelector('.note-project-header.active-drop-target');
        const projectId = activeProject ? activeProject.closest('.note-project-container').dataset.projectId : null;
        
        const ref = await notesCollectionRef.add({
            title: '',
            content: content,
            projectId: projectId,
            isPinned: false,
            tags: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return ref.id;
    } catch (e) {
        console.error("새 메모 추가 실패:", e);
        return null;
    }
}

function deleteNote(noteId) {
    showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => {
        if (notesCollectionRef && noteId) {
            notesCollectionRef.doc(noteId).delete().catch(e => {
                console.error("메모 삭제 실패:", e);
                alert("메모 삭제에 실패했습니다.");
            });
            if (currentNoteId === noteId) {
                switchView('list');
            }
        }
    });
}

async function renameNote(noteId, newTitle) {
    if (!newTitle?.trim() || !noteId || !notesCollectionRef) return;
    try {
        await notesCollectionRef.doc(noteId).update({
            title: newTitle.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error renaming note:", error);
        alert("노트 이름 변경에 실패했습니다.");
    }
}

async function togglePin(noteId) {
    if (!notesCollectionRef) return;
    const note = localNotesCache.find(n => n.id === noteId);
    if (note) {
        try {
            await notesCollectionRef.doc(noteId).update({
                isPinned: !note.isPinned
            });
        } catch (error) {
            console.error("Error toggling pin:", error);
            alert("노트 고정 상태 변경에 실패했습니다.");
        }
    }
}

async function moveNoteToProject(noteId, projectId) {
    if (!notesCollectionRef || !noteId) return;
    const targetProjectId = projectId === "null" ? null : projectId;
    try {
        await notesCollectionRef.doc(noteId).update({
            projectId: targetProjectId,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error moving note:", error);
        alert("노트 이동에 실패했습니다.");
    }
}

async function createNewNoteProject() {
    if (!noteProjectsCollectionRef) return;
    try {
        const newProjectRef = await noteProjectsCollectionRef.add({
            name: getNewNoteProjectDefaultName(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        newlyCreatedNoteProjectId = newProjectRef.id;
    } catch (error) {
        console.error("Error creating new note project:", error);
        alert("새 폴더 생성에 실패했습니다.");
    }
}

async function renameNoteProject(projectId, newName) {
    if (!newName?.trim() || !projectId || !noteProjectsCollectionRef) return;
    try {
        await noteProjectsCollectionRef.doc(projectId).update({
            name: newName.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error renaming note project:", error);
        alert("폴더 이름 변경에 실패했습니다.");
    }
}

async function deleteNoteProject(projectId) {
    const project = localNoteProjectsCache.find(p => p.id === projectId);
    if (!project) return;

    showModal(`폴더 '${project.name}'를 삭제하시겠습니까? 폴더 안의 모든 메모는 '일반 메모'로 이동됩니다.`, async () => {
        try {
            const batch = db.batch();
            localNotesCache.filter(n => n.projectId === projectId).forEach(note => {
                batch.update(notesCollectionRef.doc(note.id), { projectId: null });
            });
            batch.delete(noteProjectsCollectionRef.doc(projectId));
            await batch.commit();
        } catch (error) {
            console.error("Error deleting note project:", error);
            alert("폴더 삭제에 실패했습니다.");
        }
    });
}