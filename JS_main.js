/* --- JS_main.js (Main Entry Point) --- */
import { initializeFirebase } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_firebase-config.js';
import { getDomElements, updateClock, togglePanel, makePanelDraggable } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_ui-helpers.js';
import { initializeNotes } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_notes-module.js';
import { initializeChatEventListeners } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_chat-events.js';
import { createApiSettingsModal, initializeApiSettingsEventListeners } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_api-settings.js';
import { startQuiz, handleSubmitQuiz } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_quiz.js';
import { setLastSelectedText } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_state.js';
// ... other top-level initializations

function initializeApp() {
    document.removeEventListener('DOMContentLoaded', initializeApp);
    
    const dom = getDomElements();

    updateClock();
    setInterval(updateClock, 1000);
    
    createApiSettingsModal();
    
    initializeFirebase().then(() => {
        // Draggable panels
        makePanelDraggable(dom.chatPanel);
        makePanelDraggable(dom.notesAppPanel);
        
        // Initialize features
        initializeNotes();
        initializeChatEventListeners();
        // initializeApiSettingsEventListeners();
        
        // Global event listeners
        dom.startQuizBtn?.addEventListener('click', startQuiz);
        dom.quizSubmitBtn?.addEventListener('click', handleSubmitQuiz);
        dom.themeToggle?.addEventListener('click', () => {
            dom.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', dom.body.classList.contains('dark-mode') ? 'dark' : 'light');
        });
        if (localStorage.getItem('theme') === 'dark') {
            dom.body.classList.add('dark-mode');
        }
        
        console.log("Ailey & Bailey Canvas (v2.0 Flat-File) Initialized.");
    }).catch(error => {
        console.error("Application failed to initialize:", error);
        document.body.innerHTML = <div style="text-align:center; padding: 50px; font-size: 1.2em;">애플리케이션 초기화 실패: \.</div>;
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
