/* js/events/_globalEvents.js */
import * as state from '../_state.js';
import { handlePopoverAskAi, handlePopoverAddNote, handleTextSelection } from './_popoverEvents.js';
import { removeContextMenu } from '../ui/_contextMenu.js';
import { initializePanelEventListeners } from './_panelEvents.js';
import { initializeNoteEventListeners } from './_noteEvents.js';
import { initializeDataEventListeners } from './_dataEvents.js';
import { initializeQuizEventListeners } from './_quizEvents.js';
import { initializeThemeEventListeners } from './_themeEvents.js';
import { initializeTocEventListeners } from './_tocEvents.js';
import { setupSystemInfoWidget, setupNavigator, initializeTooltips } from '../ui/_createPanel.js';
import { updateClock } from '../_utils.js';
import { initializeFirebase } from '../_api.js';

export function initializeGlobalEventListeners() {
    document.addEventListener('click', (e) => { 
        handleTextSelection(e); 
        if (!e.target.closest('.session-context-menu, .project-context-menu')) { 
            removeContextMenu(); 
        } 
    });
}

export function initializeAllEventListeners() {
    updateClock(); 
    setInterval(updateClock, 1000);
    initializeFirebase().then(() => { 
        setupNavigator(); 
        setupChatModeSelector(); 
        initializeTooltips(); 
        makePanelDraggable(document.getElementById('chat-panel')); 
        makePanelDraggable(document.getElementById('notes-app-panel')); 
    });
    
    initializePanelEventListeners();
    initializeNoteEventListeners();
    initializeDataEventListeners();
    initializeQuizEventListeners();
    initializeThemeEventListeners();
    initializeTocEventListeners();
    initializeGlobalEventListeners();
    initializePopoverEventListeners();
}
