/*
--- Ailey & Bailey Canvas ---
File: script_action_notes_save.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 5: ACTION] 현재 노트를 저장하는 로직을 책임집니다.
---
*/

(function(window) {
    'use strict';

    function generateTitleFromContent(content) {
        // ... 제목 생성 로직 ...
        return "자동 생성 제목";
    }

    async function saveCurrentNote() {
        if (!currentNoteId) return;
        const editorInstance = window.UI.NotesEditor.getInstance();
        if (!editorInstance) return;

        let titleValue = noteTitleInput.value.trim();
        const contentValue = editorInstance.getMarkdown();

        if (titleValue === '' && contentValue.trim() !== '') {
            titleValue = generateTitleFromContent(contentValue);
        }
        if (titleValue === '' && contentValue.trim() === '') {
            titleValue = '무제 노트';
        }

        const dataToUpdate = {
            title: titleValue,
            content: contentValue,
        };

        try {
            await window.Data.Notes.update(currentNoteId, dataToUpdate);
            // 상태 업데이트 UI 표시는 UI 모듈의 책임
        } catch (e) {
            console.error("메모 저장 실패:", e);
        }
    }

    window.Actions = window.Actions || {};
    window.Actions.Notes = window.Actions.Notes || {};
    window.Actions.Notes.save = saveCurrentNote;

})(window);