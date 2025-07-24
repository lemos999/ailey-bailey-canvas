/* Module: Chat Manager (Controller) */
import * as ui from '../_uiElements.js';
import * as state from '../_state.js';
import { handleNewChat, showSessionContextMenu, updateChatHeaderModelSelector } from './_chatUI.js';
import { createNewProject, handleDeleteSession, toggleChatPin, handleChatSend, moveSessionToProject, renameSession } from './_chatData.js';
import { togglePanel } from '../_utils.js';

export function initializeChat() {
    setupChatModeSelector();
    if (ui.chatForm) ui.chatForm.addEventListener('submit', e => { e.preventDefault(); handleChatSend(); });
    if (ui.chatInput) ui.chatInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } });
    if (ui.deleteSessionBtn) ui.deleteSessionBtn.addEventListener('click', () => handleDeleteSession(state.currentSessionId));
    if (ui.newChatBtn) ui.newChatBtn.addEventListener('click', handleNewChat);
    if (ui.newProjectBtn) ui.newProjectBtn.addEventListener('click', createNewProject);
    if (ui.promptSaveBtn) ui.promptSaveBtn.addEventListener('click', saveCustomPrompt);
    if (ui.promptCancelBtn) ui.promptCancelBtn.addEventListener('click', closePromptModal);
    
    if (ui.aiModelSelector) {
        ui.aiModelSelector.addEventListener('change', () => {
            const selectedValue = ui.aiModelSelector.value;
            if (state.userApiSettings.provider && state.userApiSettings.apiKey) {
                const newSettings = {...state.userApiSettings, selectedModel: selectedValue };
                state.setUserApiSettings(newSettings);
                localStorage.setItem('userApiSettings', JSON.stringify(state.userApiSettings));
            } else {
                state.defaultModel = selectedValue;
                localStorage.setItem('selectedAiModel', state.defaultModel);
            }
        });
    }

    if (ui.sessionListContainer) {
        ui.sessionListContainer.addEventListener('contextmenu', (e) => {
            const sessionItem = e.target.closest('.session-item');
            if (sessionItem) {
                e.preventDefault();
                const { currentOpenContextMenu } = state;
                const { setCurrentOpenContextMenu } = require('../_state.js');
                if(currentOpenContextMenu) currentOpenContextMenu.remove();
                setCurrentOpenContextMenu(null);
                showSessionContextMenu(sessionItem.dataset.sessionId, e.clientX, e.clientY);
            }
        });
    }
}

function setupChatModeSelector() {
    if (!ui.chatModeSelector) return;
    ui.chatModeSelector.innerHTML = '';
    const modes = [
        { id: 'ailey_coaching', t: '기본 코칭', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M20,16H5.17L4,17.17V4H20V16Z" /></svg>' },
        { id: 'deep_learning', t: '심화 학습', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4M12,14A4,4 0 0,1 8,10H10A2,2 0 0,0 12,12A2,2 0 0,0 14,10H16A4,4 0 0,1 12,14M7.5,15.6C8.8,17.2 10.3,18 12,18C13.7,18 15.2,17.2 16.5,15.6C15.2,14.8 13.7,14 12,14C10.3,14 8.8,14.8 7.5,15.6Z" /></svg>' },
        { id: 'custom', t: '커스텀', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>' }
    ];
    modes.forEach(m => {
        const b = document.createElement('button');
        b.dataset.mode = m.id;
        b.innerHTML = `${m.i}<span>${m.t}</span>`;
        if (m.id === state.selectedMode) b.classList.add('active');
        b.addEventListener('click', () => {
            state.setSelectedMode(m.id);
            ui.chatModeSelector.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            b.classList.add('active');
            if (state.selectedMode === 'custom') openPromptModal();
        });
        ui.chatModeSelector.appendChild(b);
    });
}

export function openPromptModal() {
    if (ui.customPromptInput) ui.customPromptInput.value = state.customPrompt;
    if (ui.promptModalOverlay) ui.promptModalOverlay.style.display = 'flex';
}

function closePromptModal() {
    if (ui.promptModalOverlay) ui.promptModalOverlay.style.display = 'none';
}

function saveCustomPrompt() {
    if (ui.customPromptInput) {
        state.setCustomPrompt(ui.customPromptInput.value);
        localStorage.setItem('customTutorPrompt', state.customPrompt);
        closePromptModal();
    }
}