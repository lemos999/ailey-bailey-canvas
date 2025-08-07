// [책임: "테마 토글" 이벤트 리스너 부착 함수 정의]
function attachThemeListener() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => { toggleTheme(); });
        console.log("Theme toggle listener attached.");
    }
}