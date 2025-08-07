console.log("Interactive shell framework (hybrid_main.js) loaded.");

const generateBtn = document.getElementById('generate-command-btn');
const injectBtn = document.getElementById('inject-content-btn');
const pasteArea = document.getElementById('paste-area');
const appContainer = document.getElementById('app-container');

if (generateBtn && pasteArea) {
    generateBtn.addEventListener('click', () => {
        const command = '!query --topic="이순신" --format="html-fragment"';
        pasteArea.value = command;
        navigator.clipboard.writeText(command).then(() => {
            alert(`명령어가 클립보드에 복사되었습니다:\n\n${command}`);
        }).catch(err => {
            console.error('Clipboard copy failed', err);
        });
    });
}

if (injectBtn && pasteArea && appContainer) {
    injectBtn.addEventListener('click', () => {
        const contentToInject = pasteArea.value;
        if (contentToInject.trim() === '' || contentToInject.startsWith('!query')) {
            alert("Gemini로부터 받은 HTML 코드를 먼저 붙여넣어 주세요.");
            return;
        }
        appContainer.innerHTML = contentToInject;
        console.log("Content injected into #app-container.");
        pasteArea.value = '';
    });
}