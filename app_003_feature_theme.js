// [책임: "toggleTheme" 기능 함수 단 하나만 정의 (app_001_state에 의존)]
function toggleTheme() {
    // "body" 변수는 app_001_state.js에서 먼저 선언되어야 합니다.
    body.classList.toggle('dark-mode');
    console.log(`Theme toggled. Current classList: ${body.classList}`);
}