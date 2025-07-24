// [Node.js Gen] /js_modules/core/state.js
import { log } from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/utils/logger.js';
log('STATE', 'State module loaded.');

export const appState = {
    isChatVisible: false,
    notesCount: 0,
    lastAction: null
};

// State Renderer - 이제 state 모듈이 렌더링을 책임집니다.
export function renderState() {
    const stateDisplay = document.getElementById('current-state-json');
    log('RENDER', 'Updating state display on screen.');
    if (stateDisplay) {
        stateDisplay.textContent = JSON.stringify(appState, null, 2);
    }
}
