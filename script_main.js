/*
--- Ailey & Bailey Canvas ---
File: script_main.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 0: ENTRY POINT] 애플리케이션의 유일한 시작점입니다.
             App.run()을 호출하는 단일 책임을 가집니다.
---
*/

// 애플리케이션의 모든 모듈이 로드된 후 실행됩니다.
document.addEventListener('DOMContentLoaded', () => {
    if (window.App) {
        window.App.run();
    } else {
        console.error("애플리케이션의 핵심 모듈(App)을 찾을 수 없습니다.");
    }
});