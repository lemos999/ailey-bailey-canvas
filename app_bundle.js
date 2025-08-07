// --- Hyper-granular Bundled JS ---


// --- From app_001_state.js ---
// [책임: "body" 변수 단 하나만 선언]
const body = document.body;


// --- From app_002_util_togglePanel.js ---
// [책임: "togglePanel" 유틸리티 함수 단 하나만 정의]
function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
        const isVisible = panel.style.display === 'block';
        panel.style.display = isVisible ? 'none' : 'block';
        console.log(`Panel ${panelId} is now ${isVisible ? 'hidden' : 'visible'}`);
    }
}


// --- From app_003_feature_theme.js ---
// [책임: "toggleTheme" 기능 함수 단 하나만 정의 (app_001_state에 의존)]
function toggleTheme() {
    // "body" 변수는 app_001_state.js에서 먼저 선언되어야 합니다.
    body.classList.toggle('dark-mode');
    console.log(`Theme toggled. Current classList: ${body.classList}`);
}


// --- From app_004_init_panel.js ---
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


// --- From app_005_init_theme.js ---
// [책임: "테마 토글" 이벤트 리스너 단 하나만 부착 (app_003_feature_theme에 의존)]
function attachThemeListener() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            // "toggleTheme" 함수는 app_003_feature_theme.js에서 먼저 정의되어야 합니다.
            toggleTheme();
        });
        console.log("Theme toggle listener attached.");
    }
}


// --- From app_006_main.js ---
// [책임: "DOMContentLoaded" 시점에 초기화 함수(004, 005)들을 호출]
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired. Initializing listeners...");
    // attachPanelListener와 attachThemeListener는 이 파일보다 먼저 정의되어야 합니다.
    attachPanelListener();
    attachThemeListener();
});