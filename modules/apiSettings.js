/* --- Module: API Settings Feature --- */
import { dynamicElements as dElements, aiModelSelector } from 'https://lemos999.github.io/ailey-bailey-canvas/modules/dom.js';
import { getUserApiSettings, setUserApiSettings, setDefaultModel, getDefaultModel } from 'https://lemos999.github.io/ailey-bailey-canvas/modules/state.js';
import { showModal } from 'https://lemos999.github.io/ailey-bailey-canvas/modules/ui.js';

export function createApiSettingsModal() {
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
                <select id="api-model-select" disabled><option value="">API 키를 먼저 검증해주세요</option></select>
            </div>
            <div class="api-form-section">
                <label>토큰 한도 설정</label>
                <div class="token-limit-wrapper"><input type="number" id="max-output-tokens-input" placeholder="최대 출력 (예: 2048)"></div>
                <small>모델이 생성할 응답의 최대 길이를 제한합니다. (입력값 없을 시 모델 기본값 사용)</small>
            </div>
            <div class="api-form-section token-usage-section">
                <label>누적 토큰 사용량 (개인 키)</label>
                <div id="token-usage-display"><span>입력: 0</span> | <span>출력: 0</span> | <strong>총합: 0</strong></div>
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

    dElements.apiSettingsModalOverlay = document.getElementById('api-settings-modal-overlay');
    dElements.apiKeyInput = document.getElementById('api-key-input');
    dElements.verifyApiKeyBtn = document.getElementById('verify-api-key-btn');
    dElements.apiKeyStatus = document.getElementById('api-key-status');
    dElements.apiModelSelect = document.getElementById('api-model-select');
    dElements.maxOutputTokensInput = document.getElementById('max-output-tokens-input');
    dElements.tokenUsageDisplay = document.getElementById('token-usage-display');
    dElements.resetTokenUsageBtn = document.getElementById('reset-token-usage-btn');
    dElements.apiSettingsSaveBtn = document.getElementById('api-settings-save-btn');
    dElements.apiSettingsCancelBtn = document.getElementById('api-settings-cancel-btn');
}

export function openApiSettingsModal() {
    loadApiSettings();
    const settings = getUserApiSettings();
    dElements.apiKeyInput.value = settings.apiKey;
    dElements.maxOutputTokensInput.value = settings.maxOutputTokens;
    populateModelSelector(settings.availableModels, settings.provider, settings.selectedModel);
    if (settings.apiKey) {
        dElements.apiKeyStatus.textContent = ? [\] 키가 활성화되어 있습니다.;
        dElements.apiKeyStatus.className = 'status-success';
    } else {
        dElements.apiKeyStatus.textContent = '';
        dElements.apiKeyStatus.className = '';
    }
    renderTokenUsage();
    dElements.apiSettingsModalOverlay.style.display = 'flex';
}

export function closeApiSettingsModal() {
    dElements.apiSettingsModalOverlay.style.display = 'none';
    loadApiSettings();
    updateChatHeaderModelSelector();
}

export function loadApiSettings() {
    const savedSettings = localStorage.getItem('userApiSettings');
    if (savedSettings) {
        let parsed = JSON.parse(savedSettings);
        if (!parsed.tokenUsage) parsed.tokenUsage = { prompt: 0, completion: 0 };
        if (!parsed.availableModels) parsed.availableModels = [];
        setUserApiSettings(parsed);
    }
}

export function saveApiSettings(closeModal = true) {
    let settings = getUserApiSettings();
    const key = dElements.apiKeyInput.value.trim();
    if (key) {
        settings.apiKey = key;
        settings.selectedModel = dElements.apiModelSelect.value;
        settings.maxOutputTokens = Number(dElements.maxOutputTokensInput.value) || 2048;
        if (dElements.apiModelSelect && dElements.apiModelSelect.options.length > 0 && !dElements.apiModelSelect.disabled) {
            settings.availableModels = Array.from(dElements.apiModelSelect.options).map(opt => opt.value);
        }
    } else {
        settings = { provider: null, apiKey: '', selectedModel: '', availableModels: [], maxOutputTokens: 2048, tokenUsage: { prompt: 0, completion: 0 } };
    }
    setUserApiSettings(settings);
    localStorage.setItem('userApiSettings', JSON.stringify(settings));
    updateChatHeaderModelSelector();
    if (closeModal) closeApiSettingsModal();
}

function detectProvider(key) {
    if (key.startsWith('sk-ant-api')) return 'anthropic';
    if (key.startsWith('sk-')) return 'openai';
    if (key.length > 35 && key.startsWith('AIza')) return 'google_paid';
    return null;
}

export async function handleVerifyApiKey() {
    const key = dElements.apiKeyInput.value.trim();
    if (!key) { dElements.apiKeyStatus.textContent = 'API 키를 입력해주세요.'; dElements.apiKeyStatus.className = 'status-error'; return; }
    const provider = detectProvider(key);
    if (!provider) { dElements.apiKeyStatus.textContent = '알 수 없는 형식의 API 키입니다.'; dElements.apiKeyStatus.className = 'status-error'; return; }
    
    let settings = getUserApiSettings();
    settings.provider = provider;
    setUserApiSettings(settings);

    dElements.apiKeyStatus.textContent = [\] 키 검증 및 모델 목록 로딩 중...;
    dElements.apiKeyStatus.className = 'status-loading';
    dElements.verifyApiKeyBtn.disabled = true;

    try {
        const models = await fetchAvailableModels(provider, key);
        populateModelSelector(models, provider);
        dElements.apiKeyStatus.textContent = ? [\] 키 검증 완료! 모델을 선택하고 저장하세요.;
        dElements.apiKeyStatus.className = 'status-success';
        dElements.apiModelSelect.disabled = false;
    } catch (error) {
        dElements.apiKeyStatus.textContent = ? [\] 키 검증 실패: \;
        dElements.apiKeyStatus.className = 'status-error';
    } finally {
        dElements.verifyApiKeyBtn.disabled = false;
    }
}

async function fetchAvailableModels(provider, key) {
    if (provider === 'openai') {
        const r = await fetch('https://api.openai.com/v1/models', { headers: { 'Authorization': Bearer \ } });
        if (!r.ok) throw new Error('모델 목록 로딩 실패');
        return (await r.json()).data.filter(m => m.id.includes('gpt')).map(m => m.id).sort().reverse();
    }
    if (provider === 'anthropic') return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-2.1'];
    if (provider === 'google_paid') {
        const r = await fetch(https://generativelanguage.googleapis.com/v1beta/models?key=\);
        if (!r.ok) throw new Error('모델 목록 로딩 실패');
        return (await r.json()).models.map(m => m.name.replace('models/', '')).filter(m => m.includes('gemini'));
    }
    return [];
}

function populateModelSelector(models, provider, selected = null) {
    dElements.apiModelSelect.innerHTML = '';
    if (models?.length) {
        models.forEach(id => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = id;
            if (id === selected) opt.selected = true;
            dElements.apiModelSelect.appendChild(opt);
        });
        dElements.apiModelSelect.disabled = false;
    } else {
        dElements.apiModelSelect.innerHTML = '<option>사용 가능한 모델 없음</option>';
        dElements.apiModelSelect.disabled = true;
    }
}

export function updateChatHeaderModelSelector() {
    if (!aiModelSelector) return;
    const settings = getUserApiSettings();
    const DEFAULT_MODELS = [ { value: 'gemini-2.5-flash-preview-04-17', text: '?? Gemini 2.5 Flash (최신)' }, { value: 'gemini-2.0-flash', text: '?? Gemini 2.0 Flash (안정)' } ];
    aiModelSelector.innerHTML = '';

    if (settings.provider && settings.apiKey) {
        settings.availableModels.forEach(id => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = [개인] \;
            aiModelSelector.appendChild(opt);
        });
        aiModelSelector.value = settings.selectedModel;
    } else {
        DEFAULT_MODELS.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.value;
            opt.textContent = m.text;
            aiModelSelector.appendChild(opt);
        });
        aiModelSelector.value = localStorage.getItem('selectedAiModel') || getDefaultModel();
    }
}

function renderTokenUsage() {
    const { prompt, completion } = getUserApiSettings().tokenUsage;
    dElements.tokenUsageDisplay.innerHTML = <span>입력: \</span> | <span>출력: \</span> | <strong>총합: \</strong>;
}

export function resetTokenUsage() {
    showModal('누적 토큰 사용량을 정말로 초기화하시겠습니까?', () => {
        let settings = getUserApiSettings();
        settings.tokenUsage = { prompt: 0, completion: 0 };
        setUserApiSettings(settings);
        saveApiSettings(false);
        renderTokenUsage();
    });
}
