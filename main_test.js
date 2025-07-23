// main_test.js
// 이 스크립트는 하위 폴더의 모듈을 임포트하려고 시도합니다.

try {
    const { message } = await import('./js_test/module_test.js');
    console.log('[SUCCESS] ' + message);
    console.log('[SUCCESS] Hello from main_test.js!');
} catch (error) {
    console.error('[FAIL] Failed to import sub-module. Error:', error);
}
