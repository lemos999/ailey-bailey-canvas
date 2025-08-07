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