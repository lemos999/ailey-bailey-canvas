// [책임: "DOMContentLoaded" 시점에 초기화 함수들을 호출]
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired. Initializing listeners...");
    attachPanelListener();
    attachThemeListener();
});