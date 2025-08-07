// [검증 포인트 2] 이 파일이 HTML에서 type="module"로 로드되고, import 구문이 올바르게 동작하는지 확인합니다.
console.log('SUCCESS: test_main.js has been loaded and is executing.');

// 절대 경로를 사용하여 GitHub Pages의 다른 파일을 import 합니다.
import { getSuccessMessage } from 'https://lemos999.github.io/ailey-bailey-canvas/test_module.js';

document.addEventListener('DOMContentLoaded', () => {
    const messageElement = document.getElementById('message');
    if (messageElement) {
        try {
            const message = getSuccessMessage();
            messageElement.textContent = message;
            messageElement.style.color = 'green';
            messageElement.style.fontWeight = 'bold';
            console.log('SUCCESS: DOM update was successful.');
        } catch (error) {
            messageElement.textContent = '오류: getSuccessMessage 함수 실행 중 문제 발생. ' + error.message;
            messageElement.style.color = 'red';
            console.error('ERROR: Failed to execute getSuccessMessage.', error);
        }
    } else {
        console.error('ERROR: The "message" element was not found in the DOM.');
    }
});