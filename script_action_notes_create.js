/*
--- Ailey & Bailey Canvas ---
File: script_action_notes_create.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 5: ACTION] 새로운 노트를 생성하는 비즈니스 로직을 책임집니다.
---
*/

(function(window) {
    'use strict';

    async function createNewNote(content = '') {
        try {
            const newNoteData = {
                title: '',
                content: content,
                projectId: null, // 기본적으로 프로젝트 없음
                isPinned: false,
                tags: []
            };
            const newNoteId = await window.Data.Notes.add(newNoteData);
            console.log("새 노트 생성 성공:", newNoteId);
            // 생성 후 에디터 여는 로직은 다른 액션에서 담당
            return newNoteId;
        } catch (error) {
            console.error("새 노트 생성 실패:", error);
            // 에러 UI 표시는 UI 모듈의 책임
            return null;
        }
    }

    window.Actions = window.Actions || {};
    window.Actions.Notes = window.Actions.Notes || {};
    window.Actions.Notes.create = createNewNote;

})(window);