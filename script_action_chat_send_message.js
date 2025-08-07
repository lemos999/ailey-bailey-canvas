/*
--- Ailey & Bailey Canvas ---
File: script_action_chat_send_message.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 5: ACTION] AI에게 채팅 메시지를 보내고 응답을 받아 처리하는 전체 프로세스를 책임집니다.
---
*/

(function(window) {
    'use strict';

    async function sendMessage() {
        const query = chatInput.value.trim();
        if (!query) return;

        // UI 상태 업데이트
        chatInput.value = '';
        chatInput.disabled = true;

        const userMessage = { role: 'user', content: query, timestamp: new Date() };

        // 세션 관리 로직
        let sessionId = currentSessionId;
        if (!sessionId) {
            const newSessionData = { title: query.substring(0, 40), messages: [userMessage] };
            sessionId = await window.Data.ChatSessions.add(newSessionData);
            currentSessionId = sessionId;
        } else {
            await window.Data.ChatSessions.addMessage(sessionId, userMessage);
        }

        // AI API 호출 로직
        try {
            const provider = userApiSettings.provider || 'google'; // 기본값은 google
            const apiKey = userApiSettings.apiKey; // 키가 없으면 기본 API 사용 가정
            const model = userApiSettings.selectedModel;
            const maxTokens = userApiSettings.maxOutputTokens;
            const history = localChatSessionsCache.find(s => s.id === sessionId)?.messages || [userMessage];

            const apiService = window.Services.Api[provider];
            const request = apiService.buildRequest(model, history, maxTokens, apiKey);

            const response = await fetch(request.url, request.options);
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

            const result = await response.json();
            const parsed = apiService.parseResponse(result);

            const aiMessage = { role: 'ai', content: parsed.content, timestamp: new Date() };
            await window.Data.ChatSessions.addMessage(sessionId, aiMessage);

        } catch (error) {
            console.error("AI 응답 처리 실패:", error);
            const errorMessage = { role: 'ai', content: `오류: ${error.message}`, timestamp: new Date() };
            await window.Data.ChatSessions.addMessage(sessionId, errorMessage);
        } finally {
            chatInput.disabled = false;
            chatInput.focus();
        }
    }

    window.Actions = window.Actions || {};
    window.Actions.Chat = window.Actions.Chat || {};
    window.Actions.Chat.sendMessage = sendMessage;

})(window);