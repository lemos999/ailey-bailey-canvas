// [책임: "togglePanel" 유틸리티 함수 단 하나만 정의]
function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
        const isVisible = panel.style.display === 'block';
        panel.style.display = isVisible ? 'none' : 'block';
        console.log(`Panel ${panelId} is now ${isVisible ? 'hidden' : 'visible'}`);
    }
}