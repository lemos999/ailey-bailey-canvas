/*
--- Ailey & Bailey Canvas ---
File: script_ui_chat_session_item.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 4: UI] 단일 채팅 세션 아이템 UI 생성을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const SessionItem = {
        create(session) {
            const item = document.createElement('div');
            item.className = 'session-item';
            item.dataset.sessionId = session.id;
            if (session.id === currentSessionId) item.classList.add('active');
            item.setAttribute('data-action', 'chat-select-session');
            item.innerHTML = `<div class="session-item-title">${session.title || '새 대화'}</div>`;
            return item;
        }
    };

    window.UI = window.UI || {};
    window.UI.ChatSessionItem = SessionItem;

})(window);