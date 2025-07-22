/* js/events/_panelEvents.js */
import * as state from '../_state.js';
import { togglePanel, renderSidebarContent, createApiSettingsModal, openApiSettingsModal, closeApiSettingsModal, saveApiSettings, handleVerifyApiKey, resetTokenUsage, updateChatHeaderModelSelector, loadApiSettings } from '../ui/_createPanel.js';
import { handleNewChat, createNewProject, handleChatSend, handleDeleteSession, selectSession, toggleChatPin } from './_sessionEvents.js';
import { showModal } from '../_utils.js';
import { exportAllData, importAllData, handleSystemReset } from './_dataEvents.js';

export function initializePanelEventListeners() {
    const chatPanel = document.getElementById('chat-panel');
    const notesAppPanel = document.getElementById('notes-app-panel');
    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    const notesAppToggleBtn = document.getElementById('notes-app-toggle-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const newProjectBtn = document.getElementById('new-project-btn');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const deleteSessionBtn = document.getElementById('delete-session-btn');
    const searchSessionsInput = document.getElementById('search-sessions-input');
    const apiSettingsBtn = document.getElementById('api-settings-btn');
    const apiSettingsCancelBtn = document.getElementById('api-settings-cancel-btn');
    const apiSettingsSaveBtn = document.getElementById('api-settings-save-btn');
    const verifyApiKeyBtn = document.getElementById('verify-api-key-btn');
    const resetTokenUsageBtn = document.getElementById('reset-token-usage-btn');
    const apiSettingsModalOverlay = document.getElementById('api-settings-modal-overlay');

    if (chatToggleBtn) chatToggleBtn.addEventListener('click', () => togglePanel(chatPanel));
    if (chatPanel) chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(chatPanel, false));
    if (notesAppToggleBtn) notesAppToggleBtn.addEventListener('click', () => { 
        togglePanel(notesAppPanel); 
        if(notesAppPanel.style.display === 'flex') renderNoteList(); 
    });
    if (newChatBtn) newChatBtn.addEventListener('click', handleNewChat);
    if (newProjectBtn) newProjectBtn.addEventListener('click', createNewProject);
    if (chatForm) chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });
    if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } });
    if (deleteSessionBtn) deleteSessionBtn.addEventListener('click', () => handleDeleteSession(state.currentSessionId));
    if (searchSessionsInput) searchSessionsInput.addEventListener('input', renderSidebarContent);
    if (apiSettingsBtn) apiSettingsBtn.addEventListener('click', openApiSettingsModal);
    if (apiSettingsCancelBtn) apiSettingsCancelBtn.addEventListener('click', closeApiSettingsModal);
    if (apiSettingsSaveBtn) apiSettingsSaveBtn.addEventListener('click', () => saveApiSettings(true));
    if (verifyApiKeyBtn) verifyApiKeyBtn.addEventListener('click', handleVerifyApiKey);
    if (resetTokenUsageBtn) resetTokenUsageBtn.addEventListener('click', resetTokenUsage);
    if (apiSettingsModalOverlay) apiSettingsModalOverlay.addEventListener('click', (e) => { if (e.target === apiSettingsModalOverlay) closeApiSettingsModal(); });

}
