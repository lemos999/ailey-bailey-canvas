/*
--- Module: api.ui.js ---
Description: Manages the UI for the API settings modal.
*/

export function createApiSettingsModal() {
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

    // Also create the button in the chat header
    const chatHeader = document.querySelector('#chat-main-view .panel-header > div');
    const apiSettingsBtn = document.createElement('span');
    apiSettingsBtn.id = 'api-settings-btn';
    apiSettingsBtn.title = '개인 API 설정';
    apiSettingsBtn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>`;
    if (chatHeader) {
        chatHeader.appendChild(apiSettingsBtn);
    }

    return {
        apiSettingsModalOverlay: modal,
        apiSettingsBtn: apiSettingsBtn,
        apiKeyInput: document.getElementById('api-key-input'),
        verifyApiKeyBtn: document.getElementById('verify-api-key-btn'),
        apiKeyStatus: document.getElementById('api-key-status'),
        apiModelSelect: document.getElementById('api-model-select'),
        maxOutputTokensInput: document.getElementById('max-output-tokens-input'),
        tokenUsageDisplay: document.getElementById('token-usage-display'),
        resetTokenUsageBtn: document.getElementById('reset-token-usage-btn'),
        apiSettingsSaveBtn: document.getElementById('api-settings-save-btn'),
        apiSettingsCancelBtn: document.getElementById('api-settings-cancel-btn'),
    };
}

export function openApiSettingsModal(settings, ui) {
    ui.apiKeyInput.value = settings.apiKey;
    ui.maxOutputTokensInput.value = settings.maxOutputTokens;
    populateModelSelector(ui.apiModelSelect, settings.availableModels, settings.provider, settings.selectedModel);

    if (settings.apiKey) {
         ui.apiKeyStatus.textContent = `✅ [${settings.provider}] 키가 활성화되어 있습니다.`;
         ui.apiKeyStatus.className = 'status-success';
    } else {
         ui.apiKeyStatus.textContent = '';
         ui.apiKeyStatus.className = '';
    }

    renderTokenUsage(ui.tokenUsageDisplay, settings.tokenUsage);
    ui.apiSettingsModalOverlay.style.display = 'flex';
}

export function closeApiSettingsModal(uiElements, onSettingsUpdate) {
    uiElements.apiSettingsModalOverlay.style.display = 'none';
    // Optionally, pass back the latest state of settings
    // This part is tricky, the main logic should handle the state
    // onSettingsUpdate(currentSettings);
}

export function populateModelSelector(selectElement, models, provider, selectedModel = null) {
    selectElement.innerHTML = '';
    const effectiveModels = models || [];

    if (provider && effectiveModels.length === 0) {
        // Fallback for providers with static lists if models array is empty
        if (provider === 'anthropic') {
            effectiveModels.push('claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307');
        }
    }

    if (effectiveModels.length > 0) {
        effectiveModels.forEach(modelId => {
            const option = document.createElement('option');
            option.value = modelId;
            option.textContent = modelId;
            if (modelId === selectedModel) {
                option.selected = true;
            }
            selectElement.appendChild(option);
        });
        selectElement.disabled = false;
    } else {
        selectElement.innerHTML = '<option>사용 가능한 모델 없음</option>';
        selectElement.disabled = true;
    }
}

export function updateChatHeaderModelSelector(aiModelSelector, apiSettings) {
    if (!aiModelSelector) return;

    const DEFAULT_MODELS = [
        { value: 'gemini-2.5-flash-preview-04-17', text: '⚡️ Gemini 2.5 Flash (최신)' },
        { value: 'gemini-2.0-flash', text: '💡 Gemini 2.0 Flash (안정)' }
    ];

    aiModelSelector.innerHTML = '';

    if (apiSettings.provider && apiSettings.apiKey) {
        const models_to_show = apiSettings.availableModels || [];
        if (models_to_show.length === 0 && apiSettings.selectedModel) {
            models_to_show.push(apiSettings.selectedModel);
        }
        models_to_show.forEach(modelId => {
            const option = document.createElement('option');
            option.value = modelId;
            option.textContent = `[개인] ${modelId}`;
            aiModelSelector.appendChild(option);
        });
        aiModelSelector.value = apiSettings.selectedModel;
        aiModelSelector.title = `${apiSettings.provider} 모델을 선택합니다. (개인 키 사용 중)`;
    } else {
        DEFAULT_MODELS.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.text;
            aiModelSelector.appendChild(option);
        });
        const savedDefaultModel = localStorage.getItem('selectedAiModel') || DEFAULT_MODELS[0].value;
        aiModelSelector.value = savedDefaultModel;
        aiModelSelector.title = 'AI 모델을 선택합니다.';
    }
}

export function renderTokenUsage(displayElement, tokenUsage) {
    if (!displayElement || !tokenUsage) return;
    const { prompt, completion } = tokenUsage;
    const total = prompt + completion;
    displayElement.innerHTML = `<span>입력: ${prompt.toLocaleString()}</span> | <span>출력: ${completion.toLocaleString()}</span> | <strong>총합: ${total.toLocaleString()}</strong>`;
}