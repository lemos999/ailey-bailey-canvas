// [책임: "패널 토글" 이벤트 리스너 부착 함수 정의]
function attachPanelListener() {
    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    if (chatToggleBtn) {
        chatToggleBtn.addEventListener('click', () => { togglePanel('chat-panel'); });
        console.log("Panel toggle listener attached.");
    }
}