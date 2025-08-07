/*
--- Ailey & Bailey Canvas ---
File: script_ui_notes_note_item.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 4: UI] 단일 노트 아이템 UI 생성을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const NoteItem = {
        create(noteData) {
            const item = document.createElement('div');
            item.className = 'note-item';
            item.dataset.id = noteData.id;
            item.draggable = true;
            if (noteData.isPinned) item.classList.add('pinned');
            item.setAttribute('data-action', 'notes-open-note');

            item.innerHTML = `
                <div class="note-item-content">
                    <div class="note-item-title">${noteData.title || '무제 노트'}</div>
                    <div class="note-item-date">${noteData.updatedAt?.toDate().toLocaleString('ko-KR',{dateStyle:'short',timeStyle:'short'})||'날짜 없음'}</div>
                </div>
            `;
            return item;
        }
    };

    window.UI = window.UI || {};
    window.UI.NotesNoteItem = NoteItem;

})(window);