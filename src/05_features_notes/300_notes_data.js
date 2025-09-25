/* --- Ailey & Bailey Canvas --- */
// File: 300_notes_data.js
// Version: 1.1 (Infinite Scroll Data Fetching)
// Description: Implemented pagination for notes data.

const NOTES_PER_PAGE = 30;

function listenToNotes() { 
    return new Promise(resolve => { 
        if (!notesCollectionRef) return resolve(); 
        if (unsubscribeFromNotes) unsubscribeFromNotes();
        
        // [NEW] Apply initial limit
        let query = notesCollectionRef.orderBy("updatedAt", "desc").limit(NOTES_PER_PAGE);

        unsubscribeFromNotes = query.onSnapshot(s => { 
            localNotesCache = s.docs.map(d => ({ id: d.id, ...d.data() })); 
            if (localNotesCache.length > 0) {
                lastVisibleNoteTimestamp = localNotesCache[localNotesCache.length - 1].updatedAt;
            }
            hasMoreNotes = localNotesCache.length === NOTES_PER_PAGE;
            if (document.getElementById('notes-app-panel')?.style.display === 'flex') {
                renderNoteList();
            }
            resolve(); 
        }, e => { console.error("노트 수신 오류:", e); resolve(); }); 
    }); 
}

async function fetchMoreNotes() {
    if (!notesCollectionRef || !lastVisibleNoteTimestamp) return [];
    trace("Firestore", "note.fetchMore", {}, { lastVisibleNoteTimestamp });

    try {
        const query = notesCollectionRef
            .orderBy("updatedAt", "desc")
            .startAfter(lastVisibleNoteTimestamp)
            .limit(NOTES_PER_PAGE);
        
        const snapshot = await query.get();
        const newNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (newNotes.length > 0) {
            lastVisibleNoteTimestamp = newNotes[newNotes.length - 1].updatedAt;
            localNotesCache.push(...newNotes);
        }

        hasMoreNotes = newNotes.length === NOTES_PER_PAGE;
        trace("Firestore", "note.fetchMore.success", { fetched: newNotes.length }, { hasMoreNotes });
        return newNotes;
    } catch (error) {
        console.error("Error fetching more notes:", error);
        trace("Firestore", "note.fetchMore.error", { error: error.message }, {}, "ERROR");
        return [];
    }
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

async function addNote(content = '') {
    if (!notesCollectionRef) return null;
    trace("Firestore", "note.add", { hasContent: !!content });
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
        trace("Firestore", "note.add.error", { error: e.message }, {}, "ERROR");
        return null;
    }
}

function deleteNote(noteId) {
    trace("UI", "note.delete.init", { noteId });
    showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => {
        if (notesCollectionRef && noteId) {
            notesCollectionRef.doc(noteId).delete().catch(e => {
                console.error("메모 삭제 실패:", e);
                trace("Firestore", "note.delete.error", { noteId, error: e.message }, {}, "ERROR");
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
    trace("Firestore", "note.rename", { noteId, newTitle });
    try {
        await notesCollectionRef.doc(noteId).update({
            title: newTitle.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error renaming note:", error);
        trace("Firestore", "note.rename.error", { noteId, error: error.message }, {}, "ERROR");
        alert("노트 이름 변경에 실패했습니다.");
    }
}

async function togglePin(noteId) {
    if (!notesCollectionRef) return;
    const note = localNotesCache.find(n => n.id === noteId);
    if (note) {
        trace("Firestore", "note.togglePin", { noteId, isPinned: !note.isPinned });
        try {
            await notesCollectionRef.doc(noteId).update({
                isPinned: !note.isPinned
            });
        } catch (error) {
            console.error("Error toggling pin:", error);
            trace("Firestore", "note.togglePin.error", { noteId, error: error.message }, {}, "ERROR");
            alert("노트 고정 상태 변경에 실패했습니다.");
        }
    }
}

async function moveNoteToProject(noteId, projectId) {
    if (!notesCollectionRef || !noteId) return;
    const targetProjectId = projectId === "null" ? null : projectId;
    trace("Firestore", "note.moveToProject", { noteId, targetProjectId });
    try {
        await notesCollectionRef.doc(noteId).update({
            projectId: targetProjectId,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error moving note:", error);
        trace("Firestore", "note.moveToProject.error", { noteId, error: error.message }, {}, "ERROR");
        alert("노트 이동에 실패했습니다.");
    }
}

async function createNewNoteProject() {
    if (!noteProjectsCollectionRef) return;
    trace("Firestore", "noteProject.create");
    try {
        const newProjectRef = await noteProjectsCollectionRef.add({
            name: getNewNoteProjectDefaultName(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        newlyCreatedNoteProjectId = newProjectRef.id;
    } catch (error) {
        console.error("Error creating new note project:", error);
        trace("Firestore", "noteProject.create.error", { error: error.message }, {}, "ERROR");
        alert("새 폴더 생성에 실패했습니다.");
    }
}

async function renameNoteProject(projectId, newName) {
    if (!newName?.trim() || !projectId || !noteProjectsCollectionRef) return;
    trace("Firestore", "noteProject.rename", { projectId, newName });
    try {
        await noteProjectsCollectionRef.doc(projectId).update({
            name: newName.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("Error renaming note project:", error);
        trace("Firestore", "noteProject.rename.error", { projectId, error: error.message }, {}, "ERROR");
        alert("폴더 이름 변경에 실패했습니다.");
    }
}

async function deleteNoteProject(projectId) {
    const project = localNoteProjectsCache.find(p => p.id === projectId);
    if (!project) return;
    trace("UI", "noteProject.delete.init", { projectId, name: project.name });
    showModal(`폴더 '${project.name}'를 삭제하시겠습니까? 폴더 안의 모든 메모는 '일반 메모'로 이동됩니다.`, async () => {
        try {
            const batch = db.batch();
            localNotesCache.filter(n => n.projectId === projectId).forEach(note => {
                batch.update(notesCollectionRef.doc(note.id), { projectId: null });
            });
            batch.delete(noteProjectsCollectionRef.doc(projectId));
            await batch.commit();
            trace("Firestore", "noteProject.delete.success", { projectId });
        } catch (error) {
            console.error("Error deleting note project:", error);
            trace("Firestore", "noteProject.delete.error", { projectId, error: error.message }, {}, "ERROR");
            alert("폴더 삭제에 실패했습니다.");
        }
    });
}