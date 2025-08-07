/*
--- Ailey & Bailey Canvas ---
File: script_ui_notes_editor.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 4: UI] Toast UI 에디터 인스턴스 관리 및 관련 UI 제어를 책임집니다.
---
*/

(function(window) {
    'use strict';

    let toastEditorInstance = null;

    const Editor = {
        getInstance() { return toastEditorInstance; },

        create(note) {
            // ... Toast UI Editor 생성 로직 ...
        },

        destroy() {
            if (toastEditorInstance) {
                toastEditorInstance.destroy();
                toastEditorInstance = null;
            }
        },

        getContent() {
            return toastEditorInstance ? toastEditorInstance.getMarkdown() : '';
        }
    };

    window.UI = window.UI || {};
    window.UI.NotesEditor = Editor;

})(window);