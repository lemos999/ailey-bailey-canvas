// [책임: "패널 토글" 이벤트 리스너 단 하나만 부착 (app_002_util_togglePanel에 의존)]
function attachPanelListener() {
    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    if (chatToggleBtn) {
        chatToggleBtn.addEventListener('click', () => {
            // "togglePanel" 함수는 app_002_util_togglePanel.js에서 먼저 정의되어야 합니다.
            togglePanel('chat-panel');
        });
        console.log("Panel toggle listener attached.");
    }
}