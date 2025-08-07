// [검증 포인트 1] 이 파일이 GitHub에서 올바르게 제공되고, export 구문이 유효한지 확인합니다.
console.log('SUCCESS: test_module.js has been loaded and is executing.');

export function getSuccessMessage() {
    return '성공: GitHub에서 원격 모듈(test_module.js)을 성공적으로 import 했습니다!';
}