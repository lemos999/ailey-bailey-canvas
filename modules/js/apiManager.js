/* Module: API Settings Manager (BYOK) */
import * as uiRaw from './_uiElements.js';
import * as state from './_state.js';
import { showModal } from './_utils.js';
import { updateChatHeaderModelSelector } from './chat/_chatUI.js';

let ui = uiRaw; // To handle dynamically created elements

export function initializeApiManager() {
    createApiSettingsModal();
    loadApiSettings();
    updateChatHeaderModelSelector();

    if (ui.apiSettingsBtn) ui.apiSettingsBtn.addEventListener('click', openApiSettingsModal);
    if (ui.apiSettingsCancelBtn) ui.apiSettingsCancelBtn.addEventListener('click', closeApiSettingsModal);
    if (ui.apiSettingsSaveBtn) ui.apiSettingsSaveBtn.addEventListener('click', () => saveApiSettings(true));
    if (ui.verifyApiKeyBtn) ui.verifyApiKeyBtn.addEventListener('click', handleVerifyApiKey);
    if (ui.resetTokenUsageBtn) ui.resetTokenUsageBtn.addEventListener('click', resetTokenUsage);
    if (ui.apiSettingsModalOverlay) ui.apiSettingsModalOverlay.addEventListener('click', (e) => {
        if (e.target === ui.apiSettingsModalOverlay) closeApiSettingsModal();
    });
}

function createApiSettingsModal() {
    const modal = document.createElement('div');
    modal.id = 'api-settings-modal-overlay';
    modal.className = 'custom-modal-overlay';
    modal.innerHTML = `
        <div class="custom-modal api-settings-modal">
            <h3><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg> 개인 API 설정 (BYOK)</h3>
            <p class="api-modal-desc">기본 제공되는 모델 외에, 개인 API 키를 사용하여 더 다양하고 강력한 모델을 이용할 수 있습니다.</p>
            <div class="api-form-section">
                <label for="api-key-input">API 키</label>
                <div class="api-key-wrapper">
                    <input type="password" id="api-key-input" placeholder="sk-..., sk-ant-..., 또는 Google API 키를 입력하세요">
                    <button id="verify-api-key-btn">키 검증 & 모델 로드</button>
                </div>
                <div id="api-key-status"></div>
            </div>
            <div class="api-form-section">
                <label for="api-model-select">사용 모델</label>
                <select id="api-model-select" disabled>
                    <option value="">API 키를 먼저 검증해주세요</option>
                </select>
            </div>
            <div class="api-form-section">
                <label>토큰 한도 설정</label>
                <div class="token-limit-wrapper">
                    <input type="number" id="max-output-tokens-input" placeholder="최대 출력 (예: 2048)">
                </div>
                <small>모델이 생성할 응답의 최대 길이를 제한합니다. (입력값 없을 시 모델 기본값 사용)</small>
            </div>
            <div class="api-form-section token-usage-section">
                <label>누적 토큰 사용량 (개인 키)</label>
                <div id="token-usage-display">
                    <span>입력: 0</span> | <span>출력: 0</span> | <strong>총합: 0</strong>
                </div>
                <button id="reset-token-usage-btn">사용량 초기화</button>
                <small>Google 유료 모델은 응답에 토큰 정보를 포함하지 않아 집계되지 않습니다.</small>
            </div>
            <div class="custom-modal-actions">
                <button id="api-settings-cancel-btn" class="modal-btn">취소</button>
                <button id="api-settings-save-btn" class="modal-btn">저장</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const chatHeader = document.querySelector('#chat-main-view .panel-header > div');
    const apiSettingsBtn = document.createElement('span');
    apiSettingsBtn.id = 'api-settings-btn';
    apiSettingsBtn.title = '개인 API 설정';
    apiSettingsBtn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>`;
    if (chatHeader) chatHeader.appendChild(apiSettingsBtn);
    
    // 동적으로 생성된 요소들을 uiElements 모듈에 등록
    const { setApiSettingsElements } = require('./uiElements.js');
    setApiSettingsElements({
        apiSettingsBtn: apiSettingsBtn,
        apiSettingsModalOverlay: document.getElementById('api-settings-modal-overlay'),
        apiKeyInput: document.getElementById('api-key-input'),
        verifyApiKeyBtn: document.getElementById('verify-api-key-btn'),
        apiKeyStatus: document.getElementById('api-key-status'),
        apiModelSelect: document.getElementById('api-model-select'),
        maxOutputTokensInput: document.getElementById('max-output-tokens-input'),
        tokenUsageDisplay: document.getElementById('token-usage-display'),
        resetTokenUsageBtn: document.getElementById('reset-token-usage-btn'),
        apiSettingsSaveBtn: document.getElementById('api-settings-save-btn'),
        apiSettingsCancelBtn: document.getElementById('api-settings-cancel-btn'),
    });
    ui = require('./uiElements.js'); // Re-import to get dynamic elements
}

function openApiSettingsModal() {
    loadApiSettings();
    ui.apiKeyInput.value = state.userApiSettings.apiKey;
    ui.maxOutputTokensInput.value = state.userApiSettings.maxOutputTokens;
    populateModelSelector(state.userApiSettings.availableModels, state.userApiSettings.provider, state.userApiSettings.selectedModel);
    if (state.userApiSettings.apiKey) {
         ui.apiKeyStatus.textContent = `✅ [${state.userApiSettings.provider}] 키가 활성화되어 있습니다.`;
         ui.apiKeyStatus.className = 'status-success';
    } else {
         ui.apiKeyStatus.textContent = '';
         ui.apiKeyStatus.className = '';
    }
    renderTokenUsage();
    ui.apiSettingsModalOverlay.style.display = 'flex';
}

function closeApiSettingsModal() {
    ui.apiSettingsModalOverlay.style.display = 'none';
    loadApiSettings(); 
    updateChatHeaderModelSelector();
}

function loadApiSettings() {
    const savedSettings = localStorage.getItem('userApiSettings');
    if (savedSettings) {
        const newSettings = JSON.parse(savedSettings);
        if (!newSettings.tokenUsage) { newSettings.tokenUsage = { prompt: 0, completion: 0 }; }
        if (!newSettings.availableModels) { newSettings.availableModels = []; }
        state.setUserApiSettings(newSettings);
    }
}

function saveApiSettings(closeModal = true) {
    const key = ui.apiKeyInput.value.trim();
    if (key) {
        const newSettings = { ...state.userApiSettings };
        newSettings.apiKey = key;
        newSettings.selectedModel = ui.apiModelSelect.value;
        newSettings.maxOutputTokens = Number(ui.maxOutputTokensInput.value) || 2048;
        if (ui.apiModelSelect && ui.apiModelSelect.options.length > 0 && !ui.apiModelSelect.disabled) {
             newSettings.availableModels = Array.from(ui.apiModelSelect.options).map(opt => opt.value);
        }
        state.setUserApiSettings(newSettings);
    } else {
        state.setUserApiSettings({ provider: null, apiKey: '', selectedModel: '', availableModels: [], maxOutputTokens: 2048, tokenUsage: { prompt: 0, completion: 0 } });
    }
    localStorage.setItem('userApiSettings', JSON.stringify(state.userApiSettings));
    updateChatHeaderModelSelector();
    if (closeModal) { closeApiSettingsModal(); }
}

function detectProvider(key) {
    if (key.startsWith('sk-ant-api')) return 'anthropic';
    if (key.startsWith('sk-')) return 'openai';
    if (key.length > 35 && key.startsWith('AIza')) return 'google_paid';
    return null;
}

async function handleVerifyApiKey() {
    const key = ui.apiKeyInput.value.trim();
    if (!key) { ui.apiKeyStatus.textContent = 'API 키를 입력해주세요.'; ui.apiKeyStatus.className = 'status-error'; return; }
    const provider = detectProvider(key);
    if (!provider) { ui.apiKeyStatus.textContent = '알 수 없는 형식의 API 키입니다. (OpenAI, Anthropic, Google 지원)'; ui.apiKeyStatus.className = 'status-error'; return; }
    
    const newSettings = { ...state.userApiSettings, provider: provider };
    state.setUserApiSettings(newSettings);

    ui.apiKeyStatus.textContent = `[${provider}] 키 검증 및 모델 목록 로딩 중...`;
    ui.apiKeyStatus.className = 'status-loading';
    ui.verifyApiKeyBtn.disabled = true;
    
    try {
        const models = await fetchAvailableModels(provider, key);
        populateModelSelector(models, provider);
        ui.apiKeyStatus.textContent = `✅ [${provider}] 키 검증 완료! 모델을 선택하고 저장하세요.`;
        ui.apiKeyStatus.className = 'status-success';
        ui.apiModelSelect.disabled = false;
    } catch (error) {
        console.error("API Key Verification Error:", error);
        ui.apiKeyStatus.textContent = `❌ [${provider}] 키 검증 실패: ${error.message}`;
        ui.apiKeyStatus.className = 'status-error';
        ui.apiModelSelect.innerHTML = '<option>키 검증에 실패했습니다</option>';
        ui.apiModelSelect.disabled = true;
    } finally {
        ui.verifyApiKeyBtn.disabled = false;
    }
}

async function fetchAvailableModels(provider, key) {
    if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', { headers: { 'Authorization': `Bearer ${key}` } });
        if (!response.ok) throw new Error('OpenAI 서버에서 모델 목록을 가져올 수 없습니다.');
        const data = await response.json();
        return data.data.filter(m => m.id.includes('gpt')).map(m => m.id).sort().reverse();
    } else if (provider === 'anthropic') {
        return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-2.1'];
    } else if (provider === 'google_paid') {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (!response.ok) throw new Error('Google 서버에서 모델 목록을 가져올 수 없습니다.');
        const data = await response.json();
        return data.models.map(m => m.name.replace('models/', '')).filter(m => m.includes('gemini'));
    }
    return [];
}

function populateModelSelector(models, provider, selectedModel = null) {
    ui.apiModelSelect.innerHTML = '';
    const effectiveModels = models || [];
    if (provider && effectiveModels.length === 0) {
        if (provider === 'anthropic') {
            effectiveModels.push('claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307');
        }
    }
    if (effectiveModels.length > 0) {
        effectiveModels.forEach(modelId => {
            const option = document.createElement('option');
            option.value = modelId;
            option.textContent = modelId;
            if (modelId === selectedModel) { option.selected = true; }
            ui.apiModelSelect.appendChild(option);
        });
        ui.apiModelSelect.disabled = false;
    } else {
        ui.apiModelSelect.innerHTML = '<option>사용 가능한 모델 없음</option>';
        ui.apiModelSelect.disabled = true;
    }
}

function renderTokenUsage() {
    const { prompt, completion } = state.userApiSettings.tokenUsage;
    const total = prompt + completion;
    ui.tokenUsageDisplay.innerHTML = `<span>입력: ${prompt.toLocaleString()}</span> | <span>출력: ${completion.toLocaleString()}</span> | <strong>총합: ${total.toLocaleString()}</strong>`;
}

function resetTokenUsage() {
    showModal('누적 토큰 사용량을 정말로 초기화하시겠습니까?', () => {
        const newSettings = { ...state.userApiSettings, tokenUsage: { prompt: 0, completion: 0 } };
        state.setUserApiSettings(newSettings);
        saveApiSettings(false);
        renderTokenUsage();
    });
}