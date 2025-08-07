/*
--- Ailey & Bailey Canvas ---
File: script_ui_notes_project_item.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 4: UI] 단일 노트 프로젝트(폴더) 아이템 UI 생성을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const ProjectItem = {
        create(project, allNotes) {
            const projectContainer = document.createElement('div');
            projectContainer.className = 'note-project-container';
            projectContainer.dataset.projectId = project.id;

            projectContainer.innerHTML = `
                <div class="note-project-header" data-action="notes-toggle-project" data-project-id="${project.id}">
                    <span class="note-project-toggle-icon ${project.isExpanded !== false ? 'expanded' : ''}"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" /></svg></span>
                    <span class="note-project-icon"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2Z" /></svg></span>
                    <span class="note-project-title">${project.name}</span>
                    <span class="note-count">(${allNotes.filter(n => n.projectId === project.id).length})</span>
                </div>
                <div class="notes-in-project ${project.isExpanded !== false ? 'expanded' : ''}"></div>
            `;

            const notesContainer = projectContainer.querySelector('.notes-in-project');
            allNotes.filter(n => n.projectId === project.id && !n.isPinned)
                .sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0))
                .forEach(note => notesContainer.appendChild(window.UI.NotesNoteItem.create(note)));

            return projectContainer;
        }
    };

    window.UI = window.UI || {};
    window.UI.NotesProjectItem = ProjectItem;

})(window);