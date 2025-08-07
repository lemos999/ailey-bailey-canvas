/*
--- Ailey & Bailey Canvas ---
File: script_notes_data.js
Version: 12.0 (Modular JS Refactor)
Architect: [Username] & System Architect Ailey
Description: Handles all data layer interactions with Firebase Firestore for the Notes App. This includes CRUD operations for notes and note projects (folders).
*/

// --- 3. Function Definitions (Notes Data Management) ---

/**
 * 새로운 노트를 Firestore에 추가합니다.
 * @param {string} [content=''] - 노트의 초기 내용
 * @returns {string|null} 생성된 노트의 ID 또는 실패 시 null
 */
export async function addNote(content = '') {
    if (!notesCollectionRef) return null;
    try {
        const activeProject = document.querySelector('.note-project-header.active-drop-target');
        const projectId = activeProject ? activeProject.closest('.note-project-container').dataset.projectId : null;
        
        const ref = await notesCollectionRef.add({
            title: '', // 제목은 에디터에서 생성
            content: content,
            projectId: projectId,
            isPinned: false,
            tags: [], // 태그는 나중에 추가
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return ref.id; // 생성된 ID 반환
    } catch (e) {
        console.error("새 메모 추가 실패:", e);
        return null;
    }
}

/**
 * 지정된 노트를 Firestore에서 삭제합니다.
 * @param {string} noteId - 삭제할 노트의 ID
 */
export function deleteNote(noteId) {
    showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => {
        if (notesCollectionRef && noteId) {
            notesCollectionRef.doc(noteId).delete().catch(e => {
                console.error("메모 삭제 실패:", e);
                alert("메모 삭제에 실패했습니다.");
            });
            // UI 업데이트는 컨트롤러에서 처리
            if (currentNoteId === noteId) {
                switchView('list');
            }
        }
    });
}

/**
 * 지정된 노트의 이름을 Firestore에서 변경합니다.
 * @param {string} noteId - 이름을 변경할 노트의 ID
 * @param {string} newTitle - 새로운 노트 제목
 */
export async function renameNote(noteId, newTitle) {
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

/**
 * 지정된 노트의 고정 상태를 Firestore에서 토글합니다.
 * @param {string} noteId - 고정 상태를 변경할 노트의 ID
 */
export async function togglePin(noteId) {
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

/**
 * 지정된 노트를 다른 프로젝트(폴더)로 이동시킵니다.
 * @param {string} noteId - 이동할 노트의 ID
 * @param {string|null} projectId - 이동할 대상 프로젝트의 ID (null이면 '일반 메모'로 이동)
 */
export async function moveNoteToProject(noteId, projectId) {
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


/**
 * 새로운 노트 프로젝트(폴더)를 Firestore에 생성합니다.
 */
export async function createNewNoteProject() {
    if (!noteProjectsCollectionRef) return;
    try {
        const newProjectRef = await noteProjectsCollectionRef.add({
            name: getNewNoteProjectDefaultName(), // Helper is in _app.js
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        newlyCreatedNoteProjectId = newProjectRef.id; // Global state for rename UI
    } catch (error) {
        console.error("Error creating new note project:", error);
        alert("새 폴더 생성에 실패했습니다.");
    }
}

/**
 * 지정된 노트 프로젝트(폴더)의 이름을 변경합니다.
 * @param {string} projectId - 이름을 변경할 프로젝트의 ID
 * @param {string} newName - 새로운 프로젝트 이름
 */
export async function renameNoteProject(projectId, newName) {
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

/**
 * 지정된 노트 프로젝트(폴더)를 삭제합니다. 내부의 노트들은 '일반 메모'로 이동됩니다.
 * @param {string} projectId - 삭제할 프로젝트의 ID
 */
export async function deleteNoteProject(projectId) {
    const project = localNoteProjectsCache.find(p => p.id === projectId);
    if (!project) return;

    showModal(`폴더 '${project.name}'를 삭제하시겠습니까? 폴더 안의 모든 메모는 '일반 메모'로 이동됩니다.`, async () => {
        try {
            const batch = db.batch();

            // Move notes in the project to the general area
            localNotesCache.filter(n => n.projectId === projectId).forEach(note => {
                batch.update(notesCollectionRef.doc(note.id), { projectId: null });
            });

            // Delete the project
            batch.delete(noteProjectsCollectionRef.doc(projectId));

            await batch.commit();
        } catch (error) {
            console.error("Error deleting note project:", error);
            alert("폴더 삭제에 실패했습니다.");
        }
    });
}