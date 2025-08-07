// --- Bundled JS --- 

// --- From test_script1.js ---
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

// --- From test_script2.js ---
// 이 스크립트는 DOMContentLoaded와는 별개로, 로드되는 즉시 실행됩니다.
console.log('SUCCESS: test_bundle.js has been loaded and is executing.');
applyChanges();