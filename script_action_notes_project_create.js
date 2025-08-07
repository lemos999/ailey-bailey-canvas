/*
--- Ailey & Bailey Canvas ---
File: script_action_notes_project_create.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 5: ACTION] 새로운 노트 프로젝트(폴더)를 생성하는 로직을 책임집니다.
---
*/

(function(window) {
    'use strict';

    function getNewDefaultName() {
        const baseName = "새 폴더";
        let i = 1;
        let newName = baseName;
        const existingNames = new Set(localNoteProjectsCache.map(p => p.name));
        while (existingNames.has(newName)) {
            newName = `${baseName} ${++i}`;
        }
        return newName;
    }

    async function createNewNoteProject() {
        try {
            const newProjectData = { name: getNewDefaultName() };
            const newProjectId = await window.Data.NoteProjects.add(newProjectData);
            console.log("새 노트 폴더 생성 성공:", newProjectId);
            // 생성 후 이름 변경 UI 시작 로직은 다른 곳에서 호출
            newlyCreatedNoteProjectId = newProjectId;
        } catch (error) {
            console.error("새 노트 폴더 생성 실패:", error);
        }
    }

    window.Actions = window.Actions || {};
    window.Actions.Notes = window.Actions.Notes || {};
    window.Actions.Notes.createProject = createNewNoteProject;

})(window);