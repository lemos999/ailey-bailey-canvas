/*
--- Ailey & Bailey Canvas ---
File: script_action_chat_create.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 5: ACTION] 새로운 채팅 세션을 시작하는 로직을 책임집니다.
---
*/

(function(window) {
    'use strict';

    function createNewChat() {
        currentSessionId = null;
        // UI 업데이트는 UI 렌더러가 담당합니다.
        // 예: window.UI.ChatMessageRenderer.renderWelcome();
        // 예: window.UI.ChatSidebarRenderer.updateSelection();
        console.log("새 대화 시작 상태로 전환.");
    }

    window.Actions = window.Actions || {};
    window.Actions.Chat = window.Actions.Chat || {};
    window.Actions.Chat.createNew = createNewChat;

})(window);