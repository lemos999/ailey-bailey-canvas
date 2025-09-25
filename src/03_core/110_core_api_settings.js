/* --- Ailey & Bailey Canvas --- */
// File: 110_core_api_settings.js
// Version: 2.7 (Immediate Save & Debug Trace)
// Description: Added an event listener to the modal's model selector for immediate saving upon change.

async function loadUserSettingsFromFirebase() {
    if (!userSettingsRef) return;

    try {
        const doc = await userSettingsRef.get();
        if (doc.exists) {
            const settings = doc.data();
            // Load API settings
            if (settings.apiSettings) {
                userApiSettings = { ...userApiSettings, ...settings.apiSettings };
                if (!userApiSettings.tokenUsage) { // backward compatibility
                    userApiSettings.tokenUsage = { prompt: 0, completion: 0 };
                }
                // [ADDED] Backward compatibility for panelStates
                userApiSettings.panelStates = userApiSettings.panelStates || {};
            } else {
                 userApiSettings = { provider: null, apiKey: '', selectedModel: '', availableModels: [], maxOutputTokens: 65536, tokenUsage: { prompt: 0, completion: 0 }, panelStates: {} };
            }

            // Load last used prompt ID
            if (settings.activePromptId) {
                activePromptId = settings.activePromptId;
            }

            // Load and apply theme
            const theme = settings.theme || 'dark';
            document.body.classList.toggle('dark-mode', theme === 'dark');
            if (window.toastEditorInstance) {
                window.toastEditorInstance.setTheme(theme === 'dark' ? 'dark' : 'default');
            }
            trace("System", "loadUserSettings.success", { model: userApiSettings.selectedModel || 'default', theme: theme, promptId: activePromptId?.substring(0,5) || 'default' });
        } else {
            trace("System", "loadUserSettings.default");
            await saveUserSettingsToFirebase(true); // Create default settings document, silent fail
        }
    } catch (error) {
        console.error("Error loading user settings from Firebase:", error);
        trace("System", "loadUserSettings.error", { error: error.message }, {}, "ERROR");
    }
    updateChatHeaderModelSelector();
}

async function saveUserSettingsToFirebase(isSilent = false) {
    if (!userSettingsRef) return;
    const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    const settingsToSave = {
        apiSettings: userApiSettings,
        theme: currentTheme,
        activePromptId: activePromptId
    };

    try {
        await userSettingsRef.set(settingsToSave, { merge: true });
        if (!isSilent) {
            trace("Firestore", "saveUserSettings.success", { model: settingsToSave.apiSettings.selectedModel || 'default', theme: settingsToSave.theme });
        }
    } catch (error) {
        console.error("Error saving user settings to Firebase:", error);
        if (!isSilent) {
            trace("Firestore", "saveUserSettings.error", { error: error.message }, {}, "ERROR");
        }
    }
}

async function resetApiKeyInFirebase() {
    userApiSettings = { provider: null, apiKey: '', selectedModel: '', availableModels: [], maxOutputTokens: 65536, tokenUsage: { prompt: 0, completion: 0 }, panelStates: {} };
    await saveUserSettingsToFirebase();
    openApiSettingsModal();
    showToastNotification("✅ API 설정이 초기화되었습니다.", "", `settings-reset-${Date.now()}`);
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
                    <input type="text" id="max-output-tokens-input" placeholder="65536" oninput="this.value = this.value.replace(/[^0-9]/g, '')">
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
                <button id="api-settings-reset-btn" class="modal-btn">API 초기화</button>
                <button id="api-settings-cancel-btn" class="modal-btn">취소</button>
                <button id="api-settings-save-btn" class="modal-btn">저장</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
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
    apiSettingsResetBtn = document.getElementById('api-settings-reset-btn');

    // [ADDED] Event listener for immediate saving on model change within the modal
    apiModelSelect.addEventListener('change', () => {
        trace("UI.Action", "ModelChanged.FromModal", { new: apiModelSelect.value });
        saveApiSettings(false); // Save immediately, but don't close the modal
    });
}

function openApiSettingsModal() {
    if (!apiSettingsModalOverlay) return;
    apiKeyInput.value = userApiSettings.apiKey;
    maxOutputTokensInput.value = userApiSettings.maxOutputTokens;
    populateModelSelector(userApiSettings.availableModels, userApiSettings.provider, userApiSettings.selectedModel);
    if (userApiSettings.apiKey) {
         apiKeyStatus.textContent = `✅ [${userApiSettings.provider}] 키가 활성화되어 있습니다.`;
         apiKeyStatus.className = 'status-success';
    } else {
         apiKeyStatus.textContent = '';
         apiKeyStatus.className = '';
    }
    renderTokenUsage();
    apiSettingsModalOverlay.style.display = 'flex';
}

function closeApiSettingsModal() {
    if (!apiSettingsModalOverlay) return;
    apiSettingsModalOverlay.style.display = 'none';
    updateChatHeaderModelSelector();
}

async function saveApiSettings(closeModal = true) {
    userApiSettings.maxOutputTokens = Number(maxOutputTokensInput.value) || 65536;

    const key = apiKeyInput.value.trim();
    if (key) {
        userApiSettings.apiKey = key;
        // The model is now updated on 'change', but we read it again to be safe.
        userApiSettings.selectedModel = apiModelSelect.value;
        if (apiModelSelect && apiModelSelect.options.length > 0 && !apiModelSelect.disabled) {
             userApiSettings.availableModels = Array.from(apiModelSelect.options).map(opt => opt.value);
        }
    } else {
        userApiSettings.provider = null;
        userApiSettings.apiKey = '';
        userApiSettings.selectedModel = '';
        userApiSettings.availableModels = [];
        userApiSettings.tokenUsage = { prompt: 0, completion: 0 };
    }

    await saveUserSettingsToFirebase();
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
    const key = apiKeyInput.value.trim();
    if (!key) { apiKeyStatus.textContent = 'API 키를 입력해주세요.'; apiKeyStatus.className = 'status-error'; return; }
    const provider = detectProvider(key);
    if (!provider) { apiKeyStatus.textContent = '알 수 없는 형식의 API 키입니다. (OpenAI, Anthropic, Google 지원)'; apiKeyStatus.className = 'status-error'; return; }
    userApiSettings.provider = provider;
    apiKeyStatus.textContent = `[${provider}] 키 검증 및 모델 목록 로딩 중...`; apiKeyStatus.className = 'status-loading'; verifyApiKeyBtn.disabled = true;
    try {
        const models = await fetchAvailableModels(provider, key);
        populateModelSelector(models, provider);
        apiKeyStatus.textContent = `✅ [${provider}] 키 검증 완료! 모델을 선택하고 저장하세요.`; apiKeyStatus.className = 'status-success'; apiModelSelect.disabled = false;
    } catch (error) {
        console.error("API Key Verification Error:", error);
        apiKeyStatus.textContent = `❌ [${provider}] 키 검증 실패: ${error.message}`; apiKeyStatus.className = 'status-error'; apiModelSelect.innerHTML = '<option>키 검증에 실패했습니다</option>'; apiModelSelect.disabled = true;
    } finally { verifyApiKeyBtn.disabled = false; }
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
    apiModelSelect.innerHTML = '';
    const effectiveModels = models || [];
    if (provider && effectiveModels.length === 0) { if (provider === 'anthropic') { effectiveModels.push('claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'); } }
    if (effectiveModels.length > 0) { effectiveModels.forEach(modelId => { const option = document.createElement('option'); option.value = modelId; option.textContent = modelId; if (modelId === selectedModel) { option.selected = true; } apiModelSelect.appendChild(option); }); apiModelSelect.disabled = false; }
    else { apiModelSelect.innerHTML = '<option>사용 가능한 모델 없음</option>'; apiModelSelect.disabled = true; }
}

function renderTokenUsage() {
    if (!tokenUsageDisplay) return;
    const { prompt, completion } = userApiSettings.tokenUsage;
    const total = prompt + completion;
    tokenUsageDisplay.innerHTML = `<span>입력: ${prompt.toLocaleString()}</span> | <span>출력: ${completion.toLocaleString()}</span> | <strong>총합: ${total.toLocaleString()}</strong>`;
}

function resetTokenUsage() { showModal('누적 토큰 사용량을 정말로 초기화하시겠습니까?', async () => { userApiSettings.tokenUsage = { prompt: 0, completion: 0 }; await saveUserSettingsToFirebase(); renderTokenUsage(); }); }