/*
--- Ailey & Bailey Canvas ---
File: script_app.js
Version: 1.2 (EventHandler Integration)
Architect: [Username] & System Architect Ailey
Description: [LAYER 0: ORCHESTRATOR] 앱의 두뇌. 모든 부트스트랩 과정을 순서대로 지휘합니다.
---
*/

(function(window) {
    'use strict';

    const App = {
        async initServices() {
            console.log("서비스 계층 초기화...");
            const firebaseInitialized = await window.Services.Firebase.initialize();
            if (!firebaseInitialized) {
                alert("시스템의 핵심 서비스(Firebase)에 연결할 수 없습니다. 페이지를 새로고침 해보세요.");
                return false;
            }
            window.Services.ApiSettings.load();
            return true;
        },

        initComponents() {
            console.log("컴포넌트 계층 초기화...");
            // 추후 컴포넌트 생성/초기화 로직 추가
        },

        initEventHandlers() {
            console.log("이벤트 핸들러 계층 초기화...");
            window.EventHandler.init();
        },

        async run() {
            console.log("Ailey & Bailey Canvas - 애플리케이션 시작");

            const servicesReady = await this.initServices();
            if (servicesReady) {
                this.initComponents();
                this.initEventHandlers();
                console.log("애플리케이션 준비 완료. 사용자 입력을 기다립니다...");
            }
        }
    };

    window.App = App;

})(window);