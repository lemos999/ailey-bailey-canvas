/*
--- Ailey & Bailey Canvas ---
File: api-settings.js
Version: 12.0 (Chat Module Refactor)
Architect: [Username] & System Architect CodeMaster
Description: This dedicated module handles all functionality related to the 'API Settings' modal, including UI interaction, data persistence to local storage, and API key validation logic.
*/

import { state } from './state.js';
import { showModal } from './ui-helpers.js';
import { updateChatHeaderModelSelector } from './chat-ui.js';

// --- Element Cache ---
let apiSettingsModalOverlay, apiKeyInput, verifyApiKeyBtn, apiKeyStatus,
    apiModelSelect, maxOutputTokensInput, tokenUsageDisplay, resetTokenUsageBtn,
    apiSettingsSaveBtn, apiSettingsCancelBtn, apiSettingsBtn;

function queryElements() {
    apiSettingsBtn = document.getElementById('api-settings-btn');
    apiSettingsModalOverlay = document.getElementById('api-settings-modal-overlay');
    apiKeyInput = document.getElementById('api-key-input');
    verifyApiKeyBtn = document.getElementById('verify-api-key-btn');
    apiKeyStatus = document.getElementById('api-key-status');
    apiModelSelect = document.getElementById('api-model-select');
    maxOutputTokensInput = document.getElementById('max-output-tokens-input');
    tokenUsageDisplay = document.getElementById('token-usage-display');
    resetTokenUsageBtn = document.getElementById('reset-token-usage-btn');
    apiSettingsSaveBtn = document.getElementById('api-settings-save-btn');
    apiSettingsCancelBtn = document.getElementById('api-settings-cancel-btn');
}

export function initializeApiSettings() {
    queryElements();
    loadApiSettings(); // Load settings on initialization
    setupEventListeners();
}

function setupEventListeners() {
    if (apiSettingsBtn) apiSettingsBtn.addEventListener('click', openApiSettingsModal);
    if (apiSettingsCancelBtn) apiSettingsCancelBtn.addEventListener('click', closeApiSettingsModal);
    if (apiSettingsSaveBtn) apiSettingsSaveBtn.addEventListener('click', () => saveApiSettings(true));
    if (verifyApiKeyBtn) verifyApiKeyBtn.addEventListener('click', handleVerifyApiKey);
    if (resetTokenUsageBtn) resetTokenUsageBtn.addEventListener('click', resetTokenUsage);
    if (apiSettingsModalOverlay) apiSettingsModalOverlay.addEventListener('click', (e) => {
        if (e.target === apiSettingsModalOverlay) closeApiSettingsModal();
    });
}

function openApiSettingsModal() {
    loadApiSettings();
    if (!apiSettingsModalOverlay) return;
    
    apiKeyInput.value = state.userApiSettings.apiKey;
    maxOutputTokensInput.value = state.userApiSettings.maxOutputTokens;
    updateChatHeaderModelSelector(state.userApiSettings, true); // Update modal selector
    
    if (state.userApiSettings.apiKey && state.userApiSettings.provider) {
         apiKeyStatus.textContent = `✅ [${state.userApiSettings.provider}] 키가 활성화되어 있습니다.`;
         apiKeyStatus.className = 'status-success';
    } else {
         apiKeyStatus.textContent = '';
         apiKeyStatus.className = '';
    }
    
    // The renderTokenUsage function should be imported from chat-ui.js
    const uiModule = import('./chat-ui.js');
    uiModule.then(ui => ui.renderTokenUsage());

    apiSettingsModalOverlay.style.display = 'flex';
}

function closeApiSettingsModal() {
    if (!apiSettingsModalOverlay) return;
    apiSettingsModalOverlay.style.display = 'none';
    loadApiSettings(); 
    updateChatHeaderModelSelector(state.userApiSettings, false); // Update main header selector
}

function loadApiSettings() {
    const savedSettings = localStorage.getItem('userApiSettings');
    if (savedSettings) {
        state.userApiSettings = JSON.parse(savedSettings);
        if (!state.userApiSettings.tokenUsage) state.userApiSettings.tokenUsage = { prompt: 0, completion: 0 };
        if (!state.userApiSettings.availableModels) state.userApiSettings.availableModels = [];
    }
}

export function saveApiSettings(closeModal = true) {
    const key = apiKeyInput.value.trim();
    if (key) {
        state.userApiSettings.apiKey = key;
        state.userApiSettings.selectedModel = apiModelSelect.value;
        state.userApiSettings.maxOutputTokens = Number(maxOutputTokensInput.value) || 2048;
        if (apiModelSelect && apiModelSelect.options.length > 0 && !apiModelSelect.disabled) {
             state.userApiSettings.availableModels = Array.from(apiModelSelect.options).map(opt => opt.value);
        }
    } else {
        // Clear settings if key is removed
        state.userApiSettings = { provider: null, apiKey: '', selectedModel: '', availableModels: [], maxOutputTokens: 2048, tokenUsage: { prompt: 0, completion: 0 } };
    }
    localStorage.setItem('userApiSettings', JSON.stringify(state.userApiSettings));
    updateChatHeaderModelSelector(state.userApiSettings, false);
    if (closeModal) {
        closeApiSettingsModal();
    }
}

function detectProvider(key) {
    if (key.startsWith('sk-ant-api')) return 'anthropic';
    if (key.startsWith('sk-')) return 'openai';
    if (key.length > 35 && key.startsWith('AIza')) return 'google_paid';
    return null;
}

async function handleVerifyApiKey() {
    const key = apiKeyInput.value.trim();
    if (!key) {
        apiKeyStatus.textContent = 'API 키를 입력해주세요.';
        apiKeyStatus.className = 'status-error';
        return;
    }
    
    const provider = detectProvider(key);
    if (!provider) {
        apiKeyStatus.textContent = '알 수 없는 형식의 API 키입니다. (OpenAI, Anthropic, Google 지원)';
        apiKeyStatus.className = 'status-error';
        return;
    }
    
    state.userApiSettings.provider = provider;
    apiKeyStatus.textContent = `[${provider}] 키 검증 및 모델 목록 로딩 중...`;
    apiKeyStatus.className = 'status-loading';
    verifyApiKeyBtn.disabled = true;
    
    try {
        const models = await fetchAvailableModels(provider, key);
        state.userApiSettings.availableModels = models;
        const uiModule = import('./chat-ui.js');
        uiModule.then(ui => ui.populateModelSelector(models, provider));
        apiKeyStatus.textContent = `✅ [${provider}] 키 검증 완료! 모델을 선택하고 저장하세요.`;
        apiKeyStatus.className = 'status-success';
        apiModelSelect.disabled = false;
    } catch (error) {
        console.error("API Key Verification Error:", error);
        apiKeyStatus.textContent = `❌ [${provider}] 키 검증 실패: ${error.message}`;
        apiKeyStatus.className = 'status-error';
        apiModelSelect.innerHTML = '<option>키 검증에 실패했습니다</option>';
        apiModelSelect.disabled = true;
    } finally {
        verifyApiKeyBtn.disabled = false;
    }
}

async function fetchAvailableModels(provider, key) {
    if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', { headers: { 'Authorization': `Bearer ${key}` } });
        if (!response.ok) throw new Error('OpenAI 서버에서 모델 목록을 가져올 수 없습니다.');
        const data = await response.json();
        return data.data.filter(m => m.id.includes('gpt')).map(m => m.id).sort().reverse();
    } else if (provider === 'anthropic') {
        // Anthropic doesn't have a public models API, so we use a static list of common models.
        return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-2.1'];
    } else if (provider === 'google_paid') {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (!response.ok) throw new Error('Google 서버에서 모델 목록을 가져올 수 없습니다.');
        const data = await response.json();
        return data.models.map(m => m.name.replace('models/', '')).filter(m => m.includes('gemini'));
    }
    return [];
}

function resetTokenUsage() {
    showModal('누적 토큰 사용량을 정말로 초기화하시겠습니까?', () => {
        state.userApiSettings.tokenUsage = { prompt: 0, completion: 0 };
        saveApiSettings(false);
        const uiModule = import('./chat-ui.js');
        uiModule.then(ui => ui.renderTokenUsage());
    });
}