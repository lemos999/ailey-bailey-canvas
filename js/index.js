/*
--- Ailey & Bailey Canvas - Main JS Entry Point ---
Version: 1.0 (Modular)
Description: This file imports all necessary modules and initializes the application.
             It is the single entry point for the entire JavaScript application.
*/

import { initializeFirebase, setupAuthListener } from './core/firebase.js';
import { loadState, getElements, getDb, getAuth } from './core/state.js';
import { initCoreUI, updateClock, setupSystemInfoWidget, makePanelsDraggable } from './core/ui.js';
import { initApi, getApiSettings } from './features/api/api.main.js';
import { initChatSystem } from './features/chat/chat.main.js';
import { initNotesApp } from './features/notes/notes.main.js';
import { initLearningContent } from './features/learningContent/toc.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load critical state and DOM elements first
    loadState();
    const elements = getElements();

    // 2. Initialize core functionalities
    updateClock();
    setInterval(updateClock, 1000);
    makePanelsDraggable();

    try {
        // 3. Initialize Firebase and authenticate user
        await initializeFirebase();
        const user = await setupAuthListener();

        if (user) {
            const db = getDb();
            const auth = getAuth();
            console.log("User authenticated, proceeding with full initialization.");

            // 4. Setup UI elements that depend on user auth
            setupSystemInfoWidget(user);

            // 5. Initialize all feature modules
            const apiSettings = initApi(elements);
            initChatSystem(elements, db, auth, apiSettings);
            initNotesApp(elements, db, auth);
            initLearningContent(elements);

            // 6. Initialize any remaining core UI components
            initCoreUI(elements, db, auth);

        } else {
            console.error("Authentication failed. Application cannot start.");
            // Display an error message to the user on the UI
            document.body.innerHTML = '<h1>Authentication failed. Please refresh and try again.</h1>';
        }
    } catch (error) {
        console.error("Failed to initialize application:", error);
        document.body.innerHTML = `<h1>Error: ${error.message}</h1><p>Could not initialize the application. Please check the console for details.</p>`;
    }
});