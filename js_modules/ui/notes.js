// [Node.js Gen] /js_modules/ui/notes.js
import { appState, renderState } from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/core/state.js';
import { log } from 'https://lemos999.github.io/ailey-bailey-canvas/js_modules/utils/logger.js';
log('NOTES', 'Notes module loaded.');

export function addNote() {
    log('NOTES', 'Executing addNote...');
    appState.notesCount++;
    appState.lastAction = 'ADD_NOTE';
    log('NOTES', `Global state 'notesCount' changed to: ${appState.notesCount}`);
    renderState();
}
