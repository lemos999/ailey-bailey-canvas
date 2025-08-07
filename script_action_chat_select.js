/*
--- Ailey & Bailey Canvas ---
File: script_action_chat_select.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 5: ACTION] 특정 채팅 세션을 선택하는 로직을 책임집니다.
---
*/

(function(window) {
    'use strict';

    function selectSession(sessionId) {
        if (!sessionId || currentSessionId === sessionId) return;

        const sessionData = localChatSessionsCache.find(s => s.id === sessionId);
        if (!sessionData) {
            console.error(`세션(ID: ${sessionId})을 찾을 수 없습니다.`);
            return;
        }

        currentSessionId = sessionId;
        console.log(`세션 ${sessionId} 선택됨.`);
        // UI 렌더링 및 상태 업데이트는 각 UI 모듈에서 리스너를 통해 처리합니다.
        // 예를 들어, 데이터 변경시 UI 렌더러가 자동으로 업데이트합니다.
    }

    window.Actions = window.Actions || {};
    window.Actions.Chat = window.Actions.Chat || {};
    window.Actions.Chat.selectSession = selectSession;

})(window);