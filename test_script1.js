// 이 함수는 test_script2.js 보다 먼저 번들 파일에 포함되어야 합니다.
function applyChanges() {
    console.log('SUCCESS: applyChanges() has been called.');
    const messageElement = document.getElementById('message');
    const jsStatusElement = document.getElementById('js-status');

    if (messageElement) {
        messageElement.textContent = '성공: 번들된 JS 파일이 올바르게 실행되었습니다!';
    }
    if (jsStatusElement) {
        jsStatusElement.textContent = '🟢'; // JS 로드 성공 표시
    }
}