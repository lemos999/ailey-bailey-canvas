/*
--- Ailey & Bailey Canvas ---
File: script_ui_chat_project_item.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 4: UI] 단일 채팅 프로젝트 아이템 UI 생성을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const ProjectItem = {
        create(project, allSessions, searchTerm) {
            const projectContainer = document.createElement('div');
            projectContainer.className = 'project-container';
            projectContainer.dataset.projectId = project.id;
            projectContainer.innerHTML = `<!-- 프로젝트 헤더 HTML -->`;
            
            const sessionsContainer = projectContainer.querySelector('.sessions-in-project');
            allSessions.filter(s => s.projectId === project.id).forEach(session => {
                sessionsContainer.appendChild(window.UI.ChatSessionItem.create(session));
            });
            
            return projectContainer;
        }
    };

    window.UI = window.UI || {};
    window.UI.ChatProjectItem = ProjectItem;

})(window);