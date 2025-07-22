/**
 * file: _api-settings.js
 * description: Manages all user-provided API key settings, including modal UI, local storage, and validation.
 */

// --- 1. UI Element Creation and Management ---

function createApiSettingsModal() {
    if (document.getElementById('api-settings-modal-overlay')) return;

    const modalHTML = `
        <div id="api-settings-modal-overlay" class="custom-modal-overlay">
            <div id="api-settings-modal" class="custom-modal api-settings-modal">
                <h3><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg> 개인 API 키 설정</h3>
                <p class="api-modal-desc">개인의 OpenAI, Anthropic, Google AI API 키를 등록하여 기본 모델 대신 사용할 수 있습니다.</p>

                <div class="api-form-section">
                    <label for="api-key-input">API 키</label>
                    <div class="api-key-wrapper">
                        <input type="password" id="api-key-input" placeholder="sk-xxxxxxxx 또는 gsk_xxxxxxxx">
                        <button id="verify-api-key-btn">키 확인</button>
                    </div>
                    <div id="api-key-status"></div>
                </div>

                <div class="api-form-section">
                    <label for="api-model-select">사용 가능 모델</label>
                    <select id="api-model-select" disabled></select>
                    <small>API 키를 확인하면 사용 가능한 모델 목록이 나타납니다.</small>
                </div>
                
                <div class="api-form-section token-limit-wrapper">
                    <label for="max-output-tokens-input">최대 출력 토큰</label>
                    <input type="number" id="max-output-tokens-input" min="128" max="8192" step="128" value="2048">
                </div>

                <div class="api-form-section">
                    <label>누적 토큰 사용량</label>
                    <div class="token-usage-section">
                         <div id="token-usage-display"></div>
                         <button id="reset-token-usage-btn">사용량 초기화</button>
                    </div>
                </div>

                <div class="custom-modal-actions">
                    <button id="api-settings-cancel-btn" class="modal-btn">취소</button>
                    <button id="api-settings-save-btn" class="modal-btn">저장</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Assign newly created elements to global variables
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

function openApiSettingsModal() {
    if (!apiSettingsModalOverlay) return;
    
    apiKeyInput.value = userApiSettings.apiKey || '';
    maxOutputTokensInput.value = userApiSettings.maxOutputTokens || 2048;
    
    updateApiModelSelector(userApiSettings.availableModels, userApiSettings.selectedModel);
    updateTokenUsageDisplay();

    if (userApiSettings.provider && userApiSettings.apiKey) {
        apiKeyStatus.textContent = `${userApiSettings.provider} 키가 확인되었습니다.`;
        apiKeyStatus.className = 'status-success';
    } else {
        apiKeyStatus.textContent = '';
        apiKeyStatus.className = '';
    }

    apiSettingsModalOverlay.style.display = 'flex';
}

function closeApiSettingsModal() {
    if (apiSettingsModalOverlay) {
        apiSettingsModalOverlay.style.display = 'none';
    }
}


// --- 2. Data Loading, Saving, and Validation ---

function loadApiSettings() {
    try {
        const storedSettings = localStorage.getItem('userApiSettings');
        if (storedSettings) {
            const parsed = JSON.parse(storedSettings);
            // Merge with defaults to ensure all keys exist
            userApiSettings = { ...userApiSettings, ...parsed };
        }
    } catch (e) {
        console.error("Failed to load API settings from localStorage", e);
    }
}

function saveApiSettings(showConfirmation = true) {
    userApiSettings.apiKey = apiKeyInput.value.trim();
    userApiSettings.selectedModel = apiModelSelect.value;
    userApiSettings.maxOutputTokens = Number(maxOutputTokensInput.value);

    try {
        localStorage.setItem('userApiSettings', JSON.stringify(userApiSettings));
        if (showConfirmation) {
            alert("API 설정이 저장되었습니다.");
            closeApiSettingsModal();
        }
        updateChatHeaderModelSelector();
        updateTokenUsageDisplay();
    } catch (e) {
        console.error("Failed to save API settings to localStorage", e);
        if (showConfirmation) {
            alert("설정 저장에 실패했습니다.");
        }
    }
}

async function handleVerifyApiKey() {
    const key = apiKeyInput.value.trim();
    if (!key) {
        apiKeyStatus.textContent = 'API 키를 입력해주세요.';
        apiKeyStatus.className = 'status-error';
        return;
    }

    verifyApiKeyBtn.disabled = true;
    apiKeyStatus.textContent = 'API 키를 확인하는 중...';
    apiKeyStatus.className = 'status-loading';
    apiModelSelect.innerHTML = '';
    apiModelSelect.disabled = true;

    let provider = null;
    let testEndpoint = '';
    let requestOptions = {};
    let modelParser;

    if (key.startsWith('sk-')) {
        provider = 'openai';
        testEndpoint = 'https://api.openai.com/v1/models';
        requestOptions = { headers: { 'Authorization': `Bearer ${key}` } };
        modelParser = (data) => data.data.filter(m => m.id.includes('gpt')).map(m => m.id).sort().reverse();
    } else if (key.startsWith('gsk_')) {
         provider = 'google_paid';
         testEndpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
         modelParser = (data) => data.models.map(m => m.name.replace('models/', '')).filter(m => m.includes('gemini')).sort().reverse();
    } else {
        // Simple check for Anthropic, though their keys don't have a standard prefix
        provider = 'anthropic';
        testEndpoint = 'https://api.anthropic.com/v1/messages'; // Anthropic has no model list endpoint
        requestOptions = { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({ model: "claude-3-haiku-20240307", messages: [{role:"user", content:"."}], max_tokens: 1 })
        };
        // For Anthropic, we just check if a dummy call works, and provide a manual model list.
        modelParser = () => ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-2.1'];
    }

    try {
        if (provider === 'anthropic') {
            const response = await fetch(testEndpoint, requestOptions);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || `HTTP error ${response.status}`);
            }
            userApiSettings.availableModels = modelParser();
        } else {
            const response = await fetch(testEndpoint, requestOptions);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || `HTTP error ${response.status}`);
            }
            const data = await response.json();
            userApiSettings.availableModels = modelParser(data);
        }

        userApiSettings.provider = provider;
        userApiSettings.apiKey = key;
        apiKeyStatus.textContent = `${provider} 키가 성공적으로 확인되었습니다!`;
        apiKeyStatus.className = 'status-success';
        updateApiModelSelector(userApiSettings.availableModels, userApiSettings.availableModels[0]);
        userApiSettings.selectedModel = apiModelSelect.value;
        
    } catch (error) {
        console.error("API key verification failed:", error);
        apiKeyStatus.textContent = `키 확인 실패: ${error.message}`;
        apiKeyStatus.className = 'status-error';
        userApiSettings.provider = null;
        userApiSettings.apiKey = '';
        userApiSettings.availableModels = [];
    } finally {
        verifyApiKeyBtn.disabled = false;
    }
}


// --- 3. UI Update Helpers ---

function updateTokenUsageDisplay() {
    if (!tokenUsageDisplay) return;
    const usage = userApiSettings.tokenUsage || { prompt: 0, completion: 0 };
    tokenUsageDisplay.innerHTML = `
        <span><strong>입력:</strong> ${usage.prompt.toLocaleString()}</span>
        <span><strong>출력:</strong> ${usage.completion.toLocaleString()}</span>
        <span><strong>총합:</strong> ${(usage.prompt + usage.completion).toLocaleString()}</span>
    `;
}

function resetTokenUsage() {
    if (confirm("정말로 누적 토큰 사용량을 초기화하시겠습니까?")) {
        userApiSettings.tokenUsage = { prompt: 0, completion: 0 };
        saveApiSettings(false);
    }
}

function updateApiModelSelector(models, selected) {
    if (!apiModelSelect) return;
    apiModelSelect.innerHTML = '';
    if (models && models.length > 0) {
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            if (model === selected) {
                option.selected = true;
            }
            apiModelSelect.appendChild(option);
        });
        apiModelSelect.disabled = false;
    } else {
        apiModelSelect.disabled = true;
    }
}

function updateChatHeaderModelSelector() {
    if (!aiModelSelector) return;

    aiModelSelector.innerHTML = ''; // Clear existing options

    if (userApiSettings.provider && userApiSettings.apiKey && userApiSettings.selectedModel) {
        // User has a valid custom API key
        const customOption = document.createElement('option');
        customOption.value = userApiSettings.selectedModel;
        customOption.textContent = `⚙️ ${userApiSettings.selectedModel}`;
        customOption.selected = true;
        aiModelSelector.appendChild(customOption);
        
        const defaultFlash = document.createElement('option');
        defaultFlash.value = 'gemini-1.5-flash-preview-0514';
        defaultFlash.textContent = '⚡️ Gemini 1.5 Flash (기본)';
        aiModelSelector.appendChild(defaultFlash);

    } else {
        // Default options
        const defaultFlash = document.createElement('option');
        defaultFlash.value = 'gemini-1.5-flash-preview-0514';
        defaultFlash.textContent = '⚡️ Gemini 1.5 Flash (최신)';
        defaultFlash.selected = (localStorage.getItem('selectedAiModel') || defaultModel) === defaultFlash.value;
        aiModelSelector.appendChild(defaultFlash);
    }
    
    // Set the value from localStorage if it exists, otherwise use the state
    const storedModel = localStorage.getItem('selectedAiModel');
    if (!userApiSettings.provider && storedModel) {
        aiModelSelector.value = storedModel;
    }
}