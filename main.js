// [Node.js Gen] /main.js (JavaScript Entry Point)
import { appState, renderState } from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/core/state.js';
import { log } from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/utils/logger.js';
import { toggleChatVisibility } from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/ui/chat/actions.js';
import { addNote } from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/ui/notes.js';
import { performUtilityTask } from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/utils/helpers.js';

log('MAIN', 'Application entry point loaded. All modules imported.');

const chatBtn = document.getElementById('test-chat-toggle');
const noteBtn = document.getElementById('test-add-note');
const utilBtn = document.getElementById('test-util-log');

document.addEventListener('DOMContentLoaded', () => {
    log('MAIN', 'DOM fully loaded. Initializing...');
    
    if (chatBtn) chatBtn.addEventListener('click', () => toggleChatVisibility());
    if (noteBtn) noteBtn.addEventListener('click', () => addNote());
    if (utilBtn) utilBtn.addEventListener('click', () => performUtilityTask());

    renderState(); // 초기 상태 렌더링
});
