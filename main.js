// --- Ailey & Bailey Canvas ---
// File: main.js (Main Entry Point for ESM)
// Version: 13.0 (ESM Refactor)
// Description: This file imports all necessary modules and initializes the application.

// Importing core UI and state management modules
import { updateClock, setupSystemInfoWidget, makePanelDraggable, togglePanel } from './script_ui_helpers.js';
import { loadApiSettings, createApiSettingsModal, updateChatHeaderModelSelector } from './script_api_settings.js';
import { initializeFirebase } from './script_firebase.js';
import { initialize, attachEventListeners } from './script_main_listeners.js';
import * as state from './script_state.js';
import * as chatApp from './script_chat_app.js';
import * as notesApp from './script_notes_app.js';

// Initializing the application on script load
document.addEventListener('DOMContentLoaded', () => {
    console.log("Canvas is initializing via ESM entry point...");
    initialize();
});
