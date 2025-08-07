// Phase 1: test_bundle.js
console.log("SUCCESS: test_bundle.js has been loaded and is executing.");
function applyTestStyling() {
    const dynamicHeader = document.querySelector('#content-wrapper h2');
    if (dynamicHeader) {
        dynamicHeader.style.color = 'green';
        dynamicHeader.textContent += " (스타일 적용 완료!)";
        console.log("SUCCESS: Dynamic content styling applied.");
    }
}
applyTestStyling();