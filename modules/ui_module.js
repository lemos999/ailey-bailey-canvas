// This is a dynamic JavaScript module
console.log("SUCCESS: ui_module.js has been loaded and is executing.");
const button = document.getElementById('card-btn');
const statusText = document.getElementById('status-text');

if (button && statusText) {
    button.addEventListener('click', () => {
        alert("버튼 클릭 성공! ui_module.js의 이벤트 리스너가 정상적으로 작동합니다.");
    });
    statusText.textContent = "성공: ui_module.js가 성공적으로 실행되어 이벤트 리스너를 부착했습니다!";
    statusText.style.color = "green";
    button.textContent = "기능 테스트 성공! ✅";
} else {
    console.error("ERROR: Could not find button or status text. The module might have run before the template was rendered.");
}