import { state, setState } from '../../core/state.js';
import { dom } from '../../ui/dom.js';
import { showModal } from '../../core/utils.js';
import { updateChatHeaderModelSelector } from '../chat/ui.js';

function createApiSettingsModal() {
    const modal = document.createElement('div');
    modal.id = 'api-settings-modal-overlay';
    modal.className = 'custom-modal-overlay';
    modal.innerHTML = 
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
    ;
    document.body.appendChild(modal);

    // Update dom object with newly created elements
    dom.apiSettingsModalOverlay = document.getElementById('api-settings-modal-overlay');
    dom.apiKeyInput = document.getElementById('api-key-input');
    dom.verifyApiKeyBtn = document.getElementById('verify-api-key-btn');
    dom.apiKeyStatus = document.getElementById('api-key-status');
    dom.apiModelSelect = document.getElementById('api-model-select');
    dom.maxOutputTokensInput = document.getElementById('max-output-tokens-input');
    dom.tokenUsageDisplay = document.getElementById('token-usage-display');
    dom.resetTokenUsageBtn = document.getElementById('reset-token-usage-btn');
    dom.apiSettingsSaveBtn = document.getElementById('api-settings-save-btn');
    dom.apiSettingsCancelBtn = document.getElementById('api-settings-cancel-btn');
}

function openApiSettingsModal() {
    loadApiSettings();
    dom.apiKeyInput.value = state.userApiSettings.apiKey;
    dom.maxOutputTokensInput.value = state.userApiSettings.maxOutputTokens;
    populateModelSelector(state.userApiSettings.availableModels, state.userApiSettings.provider, state.userApiSettings.selectedModel);
    if (state.userApiSettings.apiKey) {
         dom.apiKeyStatus.textContent = ? [] 키가 활성화되어 있습니다.;
         dom.apiKeyStatus.className = 'status-success';
    } else {
         dom.apiKeyStatus.textContent = '';
         dom.apiKeyStatus.className = '';
    }
    renderTokenUsage();
    dom.apiSettingsModalOverlay.style.display = 'flex';
}

function closeApiSettingsModal() {
    dom.apiSettingsModalOverlay.style.display = 'none';
    loadApiSettings(); 
    updateChatHeaderModelSelector();
}

function loadApiSettings() {
    const savedSettings = localStorage.getItem('userApiSettings');
    if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (!parsed.tokenUsage) { parsed.tokenUsage = { prompt: 0, completion: 0 }; }
        if (!parsed.availableModels) { parsed.availableModels = []; }
        setState('userApiSettings', parsed);
    }
}

function saveApiSettings(closeModal = true) {
    const key = dom.apiKeyInput.value.trim();
    let newSettings = { ...state.userApiSettings };
    if (key) {
        newSettings.apiKey = key;
        newSettings.selectedModel = dom.apiModelSelect.value;
        newSettings.maxOutputTokens = Number(dom.maxOutputTokensInput.value) || 2048;
        if (dom.apiModelSelect && dom.apiModelSelect.options.length > 0 && !dom.apiModelSelect.disabled) {
             newSettings.availableModels = Array.from(dom.apiModelSelect.options).map(opt => opt.value);
        }
    } else {
        newSettings = { provider: null, apiKey: '', selectedModel: '', availableModels: [], maxOutputTokens: 2048, tokenUsage: { prompt: 0, completion: 0 } };
    }
    setState('userApiSettings', newSettings);
    localStorage.setItem('userApiSettings', JSON.stringify(newSettings));
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
    const key = dom.apiKeyInput.value.trim();
    if (!key) { dom.apiKeyStatus.textContent = 'API 키를 입력해주세요.'; dom.apiKeyStatus.className = 'status-error'; return; }
    const provider = detectProvider(key);
    if (!provider) { dom.apiKeyStatus.textContent = '알 수 없는 형식의 API 키입니다.'; dom.apiKeyStatus.className = 'status-error'; return; }
    setState('userApiSettings', { ...state.userApiSettings, provider });
    dom.apiKeyStatus.textContent = [] 키 검증 및 모델 목록 로딩 중...; dom.apiKeyStatus.className = 'status-loading'; dom.verifyApiKeyBtn.disabled = true;
    try {
        const models = await fetchAvailableModels(provider, key);
        populateModelSelector(models, provider);
        dom.apiKeyStatus.textContent = ? [] 키 검증 완료! 모델을 선택하고 저장하세요.; dom.apiKeyStatus.className = 'status-success'; dom.apiModelSelect.disabled = false;
    } catch (error) {
        console.error("API Key Verification Error:", error);
        dom.apiKeyStatus.textContent = ? [] 키 검증 실패: ; dom.apiKeyStatus.className = 'status-error'; dom.apiModelSelect.innerHTML = '<option>키 검증에 실패했습니다</option>'; dom.apiModelSelect.disabled = true;
    } finally { dom.verifyApiKeyBtn.disabled = false; }
}

async function fetchAvailableModels(provider, key) {
    if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', { headers: { 'Authorization': Bearer  } });
        if (!response.ok) throw new Error('OpenAI 서버에서 모델 목록을 가져올 수 없습니다.');
        const data = await response.json();
        return data.data.filter(m => m.id.includes('gpt')).map(m => m.id).sort().reverse();
    } else if (provider === 'anthropic') {
        return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-2.1'];
    } else if (provider === 'google_paid') {
        const response = await fetch(https://generativelanguage.googleapis.com/v1beta/models?key=);
        if (!response.ok) throw new Error('Google 서버에서 모델 목록을 가져올 수 없습니다.');
        const data = await response.json();
        return data.models.map(m => m.name.replace('models/', '')).filter(m => m.includes('gemini'));
    }
    return [];
}

function populateModelSelector(models, provider, selectedModel = null) {
    dom.apiModelSelect.innerHTML = '';
    const effectiveModels = models || [];
    if (provider && effectiveModels.length === 0) { if (provider === 'anthropic') { effectiveModels.push('claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'); } }
    if (effectiveModels.length > 0) { effectiveModels.forEach(modelId => { const option = document.createElement('option'); option.value = modelId; option.textContent = modelId; if (modelId === selectedModel) { option.selected = true; } dom.apiModelSelect.appendChild(option); }); dom.apiModelSelect.disabled = false; }
    else { dom.apiModelSelect.innerHTML = '<option>사용 가능한 모델 없음</option>'; dom.apiModelSelect.disabled = true; }
}

function renderTokenUsage() {
    const { prompt, completion } = state.userApiSettings.tokenUsage;
    const total = prompt + completion;
    dom.tokenUsageDisplay.innerHTML = <span>입력: </span> | <span>출력: </span> | <strong>총합: </strong>;
}

function resetTokenUsage() { showModal('누적 토큰 사용량을 정말로 초기화하시겠습니까?', () => { setState('userApiSettings', { ...state.userApiSettings, tokenUsage: { prompt: 0, completion: 0 } }); saveApiSettings(false); renderTokenUsage(); }); }

export function initializeApiSettings() {
    createApiSettingsModal();
    loadApiSettings();
    updateChatHeaderModelSelector();

    const chatHeader = document.querySelector('#chat-main-view .panel-header > div');
    if (chatHeader) {
        dom.apiSettingsBtn = document.createElement('span'); dom.apiSettingsBtn.id = 'api-settings-btn'; dom.apiSettingsBtn.title = '개인 API 설정';
        dom.apiSettingsBtn.innerHTML = <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>;
        chatHeader.appendChild(dom.apiSettingsBtn);
        dom.apiSettingsBtn.addEventListener('click', openApiSettingsModal);
    }

    dom.apiSettingsCancelBtn.addEventListener('click', closeApiSettingsModal);
    dom.apiSettingsSaveBtn.addEventListener('click', () => saveApiSettings(true));
    dom.verifyApiKeyBtn.addEventListener('click', handleVerifyApiKey);
    dom.resetTokenUsageBtn.addEventListener('click', resetTokenUsage);
    dom.apiSettingsModalOverlay.addEventListener('click', (e) => { if (e.target === dom.apiSettingsModalOverlay) closeApiSettingsModal(); });
}
