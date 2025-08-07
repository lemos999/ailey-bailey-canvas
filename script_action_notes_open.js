/*
--- Ailey & Bailey Canvas ---
File: script_action_notes_open.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 5: ACTION] 특정 노트를 에디터에서 여는 로직을 책임집니다.
---
*/

(function(window) {
    'use strict';

    function openNoteEditor(noteId) {
        const note = localNotesCache.find(n => n.id === noteId);
        if (!note) {
            console.error(`노트(ID: ${noteId})를 찾을 수 없습니다.`);
            return;
        }
        
        currentNoteId = noteId;
        window.UI.NotesView.switch('editor');
        window.UI.NotesEditor.create(note);
        
        if (noteTitleInput) {
            noteTitleInput.value = note.title || '';
            noteTitleInput.focus();
        }
    }

    window.Actions = window.Actions || {};
    window.Actions.Notes = window.Actions.Notes || {};
    window.Actions.Notes.open = openNoteEditor;

})(window);