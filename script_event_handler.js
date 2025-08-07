/*
--- Ailey & Bailey Canvas ---
File: script_event_handler.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 6: EVENT HANDLING] 모든 사용자 입력을 감지하고 적절한 액션을 호출하는 유일한 이벤트 위임 허브입니다.
---
*/

(function(window) {
    'use strict';

    const EventHandler = {
        init() {
            console.log("이벤트 핸들러 초기화...");
            document.body.addEventListener('click', this.handleGlobalClick.bind(this));
            document.body.addEventListener('submit', this.handleGlobalSubmit.bind(this));
            // 추가적인 이벤트 리스너 (input, keydown 등)를 여기에 등록할 수 있습니다.
        },

        handleGlobalClick(e) {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const params = target.dataset;

            this.routeAction(action, params, e);
        },

        handleGlobalSubmit(e) {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            e.preventDefault(); // 기본 submit 동작 방지

            const action = target.dataset.action;
            const params = target.dataset;

            this.routeAction(action, params, e);
        },

        routeAction(action, params, event) {
            console.log(`Action Triggered: ${action}`, params);
            const [category, actionName] = action.split('-');

            if (!category || !actionName) {
                console.warn(`잘못된 형식의 action입니다: ${action}`);
                return;
            }

            // 액션을 동적으로 찾아 실행
            // 예: "notes-create-note" -> window.Actions.Notes.create()
            try {
                let actionFunc;
                if (category === 'notes') {
                    const noteAction = this.camelCase(actionName);
                    actionFunc = window.Actions.Notes[noteAction];
                } else if (category === 'chat') {
                    const chatAction = this.camelCase(actionName);
                    actionFunc = window.Actions.Chat[chatAction];
                }

                if (typeof actionFunc === 'function') {
                    actionFunc(params); // 파라미터 전달
                } else {
                    console.warn(`정의되지 않은 action입니다: ${action}`);
                }
            } catch (error) {
                console.error(`Action 실행 중 오류 발생 [${action}]:`, error);
            }
        },

        // Helper to convert kebab-case to camelCase
        camelCase(str) {
            return str.split('-').reduce((acc, part, index) => {
                return index === 0 ? part : acc + part.charAt(0).toUpperCase() + part.slice(1);
            }, '');
        }
    };

    window.EventHandler = EventHandler;

})(window);