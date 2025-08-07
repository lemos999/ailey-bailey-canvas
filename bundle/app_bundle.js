// --- Directory-based Bundled JS ---


// --- From src/core/app_001_state.js ---
// [책임: "body" 변수 단 하나만 선언]
const body = document.body;


// --- From src/utils/app_002_util_togglePanel.js ---
// [책임: "togglePanel" 유틸리티 함수 단 하나만 정의]
function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
        const isVisible = panel.style.display === 'block';
        panel.style.display = isVisible ? 'none' : 'block';
        console.log(`Panel ${panelId} is now ${isVisible ? 'hidden' : 'visible'}`);
    }
}


// --- From src/features/app_003_feature_theme.js ---
// [책임: "toggleTheme" 기능 함수 단 하나만 정의]
function toggleTheme() {
    body.classList.toggle('dark-mode');
    console.log(`Theme toggled. Current classList: ${body.classList}`);
}


// --- From src/initializers/app_004_init_panel.js ---
// [책임: "패널 토글" 이벤트 리스너 부착 함수 정의]
function attachPanelListener() {
    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    if (chatToggleBtn) {
        chatToggleBtn.addEventListener('click', () => { togglePanel('chat-panel'); });
        console.log("Panel toggle listener attached.");
    }
}


// --- From src/initializers/app_005_init_theme.js ---
// [책임: "테마 토글" 이벤트 리스너 부착 함수 정의]
function attachThemeListener() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => { toggleTheme(); });
        console.log("Theme toggle listener attached.");
    }
}


// --- From main/app_006_main.js ---
// [책임: "DOMContentLoaded" 시점에 초기화 함수들을 호출]
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired. Initializing listeners...");
    attachPanelListener();
    attachThemeListener();
});