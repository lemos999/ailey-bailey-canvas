/*
--- Ailey & Bailey Canvas ---
File: script_ui_notes_view.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 4: UI] 노트 앱의 전체 뷰(목록/에디터) 전환을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const NotesView = {
        switch(view) {
            if (view === 'editor') {
                noteListView?.classList.remove('active');
                noteEditorView?.classList.add('active');
            } else { // list
                noteEditorView?.classList.remove('active');
                noteListView?.classList.add('active');
                currentNoteId = null; // 현재 활성 노트 ID 초기화
            }
        }
    };

    window.UI = window.UI || {};
    window.UI.NotesView = NotesView;

})(window);