/*
--- Ailey & Bailey Canvas ---
File: script_ui_chat_message_renderer.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 4: UI] 채팅 메시지 목록의 렌더링을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const MessageRenderer = {
        render(messages) {
            if (!chatMessages) return;
            chatMessages.innerHTML = '';
            const fragment = document.createDocumentFragment();
            messages.forEach(msg => {
                const messageElement = this.createMessageElement(msg);
                fragment.appendChild(messageElement);
            });
            chatMessages.appendChild(fragment);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        },

        createMessageElement(msg) {
            const el = document.createElement('div');
            if(msg.role === 'user') {
                 el.className = 'chat-message user';
                 el.textContent = msg.content;
            } else {
                 el.className = 'ai-response-container';
                 // ... 복잡한 AI 응답 렌더링 로직 (추론 과정 포함)
            }
            return el;
        }
    };

    window.UI = window.UI || {};
    window.UI.ChatMessageRenderer = MessageRenderer;

})(window);