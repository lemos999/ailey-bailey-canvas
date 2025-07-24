// [V3] /main.js (JavaScript Entry Point)
import { appState } from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/core/state.js';
import { log } from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/utils/logger.js';
import { toggleChatVisibility } from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/ui/chat/actions.js';
import { addNote } from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/ui/notes.js';
import { performUtilityTask } from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/utils/helpers.js';

log('MAIN', 'Application entry point loaded. All modules imported.');

// --- UI Elements ---
const chatBtn = document.getElementById('test-chat-toggle');
const noteBtn = document.getElementById('test-add-note');
const utilBtn = document.getElementById('test-util-log');
const stateDisplay = document.getElementById('current-state-json');

// --- State Renderer ---
function renderState() {
    log('RENDER', 'Updating state display on screen.');
    if (stateDisplay) {
        stateDisplay.textContent = JSON.stringify(appState, null, 2);
    }
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    log('MAIN', 'DOM fully loaded. Initializing...');
    
    if (chatBtn) {
        chatBtn.addEventListener('click', () => {
            // 콜백으로 renderState 함수를 넘겨 상태 변경 후 UI가 업데이트되도록 함
            toggleChatVisibility(renderState);
        });
    }

    if (noteBtn) {
        noteBtn.addEventListener('click', () => {
            addNote(renderState);
        });
    }

    if (utilBtn) {
        utilBtn.addEventListener('click', performUtilityTask);
    }

    // 초기 상태 렌더링
    renderState();
});
