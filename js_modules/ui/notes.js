// [V3] /js_modules/ui/notes.js
import { appState } from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/core/state.js';
import { log } from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/utils/logger.js';
log('NOTES', 'Notes module loaded.');

export function addNote(renderCallback) {
    log('NOTES', 'Executing addNote...');
    appState.notesCount++;
    appState.lastAction = 'ADD_NOTE';
    log('NOTES', Global state 'notesCount' changed to: " + appState.notesCount);
    renderCallback();
}
