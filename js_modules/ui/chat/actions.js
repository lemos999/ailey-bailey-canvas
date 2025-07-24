// [V3] /js_modules/ui/chat/actions.js
import { appState } from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/core/state.js';
import { log } from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/utils/logger.js';
log('CHAT', 'Chat Actions module loaded.');

export function toggleChatVisibility(renderCallback) {
    log('CHAT', 'Executing toggleChatVisibility...');
    appState.isChatVisible = !appState.isChatVisible;
    appState.lastAction = 'TOGGLE_CHAT';
    log('CHAT', Global state 'isChatVisible' changed to: " + appState.isChatVisible);
    renderCallback(); // 상태 변경 후 렌더링 콜백 실행
}
