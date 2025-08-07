// [책임: "DOMContentLoaded" 시점에 초기화 함수(004, 005)들을 호출]
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired. Initializing listeners...");
    // attachPanelListener와 attachThemeListener는 이 파일보다 먼저 정의되어야 합니다.
    attachPanelListener();
    attachThemeListener();
});