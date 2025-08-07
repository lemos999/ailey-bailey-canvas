// [책임: "toggleTheme" 기능 함수 단 하나만 정의]
function toggleTheme() {
    body.classList.toggle('dark-mode');
    console.log(`Theme toggled. Current classList: ${body.classList}`);
}