/*
--- Module: api.main.js ---
Description: Handles API settings logic, including verification and model fetching.
*/
import { showModal } from '../../core/ui.js';
import { createApiSettingsModal, openApiSettingsModal, closeApiSettingsModal, populateModelSelector, updateChatHeaderModelSelector, renderTokenUsage } from './api.ui.js';

let apiSettings = {
    provider: null,
    apiKey: '',
    selectedModel: '',
    availableModels: [],
    maxOutputTokens: 2048,
    tokenUsage: { prompt: 0, completion: 0 }
};

export function getApiSettings() {
    return apiSettings;
}

export function initApi(elements) {
    // Dynamically create the modal and its elements
    const uiElements = createApiSettingsModal();

    // Add listeners
    uiElements.apiSettingsBtn.addEventListener('click', () => openApiSettingsModal(apiSettings, uiElements));
    uiElements.apiSettingsCancelBtn.addEventListener('click', () => closeApiSettingsModal(uiElements, (newSettings) => { apiSettings = newSettings; }));
    uiElements.apiSettingsSaveBtn.addEventListener('click', () => {
        saveApiSettings(true, uiElements);
        closeApiSettingsModal(uiElements, (newSettings) => { apiSettings = newSettings; });
    });
    uiElements.verifyApiKeyBtn.addEventListener('click', () => handleVerifyApiKey(uiElements));
    uiElements.resetTokenUsageBtn.addEventListener('click', () => resetTokenUsage(uiElements));
    uiElements.apiSettingsModalOverlay.addEventListener('click', (e) => {
        if (e.target === uiElements.apiSettingsModalOverlay) {
            closeApiSettingsModal(uiElements, (newSettings) => { apiSettings = newSettings; });
        }
    });

    loadApiSettings();
    updateChatHeaderModelSelector(elements.aiModelSelector, apiSettings);

    return apiSettings; // Return the loaded settings
}

export function loadApiSettings() {
    const savedSettings = localStorage.getItem('userApiSettings');
    if (savedSettings) {
        apiSettings = JSON.parse(savedSettings);
        if (!apiSettings.tokenUsage) { apiSettings.tokenUsage = { prompt: 0, completion: 0 }; }
        if (!apiSettings.availableModels) { apiSettings.availableModels = []; }
    }
}

export function saveApiSettings(closeModal = true, uiElements) {
    const key = uiElements.apiKeyInput.value.trim();
    if (key) {
        apiSettings.apiKey = key;
        apiSettings.selectedModel = uiElements.apiModelSelect.value;
        apiSettings.maxOutputTokens = Number(uiElements.maxOutputTokensInput.value) || 2048;
        if (uiElements.apiModelSelect && uiElements.apiModelSelect.options.length > 0 && !uiElements.apiModelSelect.disabled) {
            apiSettings.availableModels = Array.from(uiElements.apiModelSelect.options).map(opt => opt.value);
        }
    } else {
        // Reset to default if key is removed
        apiSettings = { provider: null, apiKey: '', selectedModel: '', availableModels: [], maxOutputTokens: 2048, tokenUsage: { prompt: 0, completion: 0 } };
    }
    localStorage.setItem('userApiSettings', JSON.stringify(apiSettings));

    const { aiModelSelector } = getElements();
    updateChatHeaderModelSelector(aiModelSelector, apiSettings);

    if (closeModal) {
        closeApiSettingsModal(uiElements, (newSettings) => { apiSettings = newSettings; });
    }
}

function detectProvider(key) {
    if (key.startsWith('sk-ant-api')) return 'anthropic';
    if (key.startsWith('sk-')) return 'openai';
    if (key.length > 35 && key.startsWith('AIza')) return 'google_paid';
    return null;
}

async function handleVerifyApiKey(ui) {
    const key = ui.apiKeyInput.value.trim();
    if (!key) {
        ui.apiKeyStatus.textContent = 'API 키를 입력해주세요.';
        ui.apiKeyStatus.className = 'status-error';
        return;
    }
    const provider = detectProvider(key);
    if (!provider) {
        ui.apiKeyStatus.textContent = '알 수 없는 형식의 API 키입니다. (OpenAI, Anthropic, Google 지원)';
        ui.apiKeyStatus.className = 'status-error';
        return;
    }
    apiSettings.provider = provider;
    ui.apiKeyStatus.textContent = `[${provider}] 키 검증 및 모델 목록 로딩 중...`;
    ui.apiKeyStatus.className = 'status-loading';
    ui.verifyApiKeyBtn.disabled = true;

    try {
        const models = await fetchAvailableModels(provider, key);
        apiSettings.availableModels = models; // Store fetched models
        populateModelSelector(ui.apiModelSelect, models, provider);
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
        // Anthropic doesn't have a public models endpoint, so we use a static list
        return ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-2.1'];
    } else if (provider === 'google_paid') {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (!response.ok) throw new Error('Google 서버에서 모델 목록을 가져올 수 없습니다.');
        const data = await response.json();
        return data.models.map(m => m.name.replace('models/', '')).filter(m => m.includes('gemini'));
    }
    return [];
}

function resetTokenUsage(uiElements) {
    showModal('누적 토큰 사용량을 정말로 초기화하시겠습니까?', () => {
        apiSettings.tokenUsage = { prompt: 0, completion: 0 };
        saveApiSettings(false, uiElements);
        renderTokenUsage(uiElements.tokenUsageDisplay, apiSettings.tokenUsage);
    });
}

export function buildApiRequest(provider, model, messages, maxTokens) {
    const history = messages.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.content
    }));

    if (provider === 'openai') {
        return { url: 'https://api.openai.com/v1/chat/completions', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiSettings.apiKey}` }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) } };
    } else if (provider === 'anthropic') {
         return { url: 'https://api.anthropic.com/v1/messages', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiSettings.apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 }) } };
    } else if (provider === 'google_paid') {
        const googleHistory = messages.map(msg => ({ role: msg.role === 'ai' ? 'model' : 'user', parts: [{ text: msg.content }] }));
        return { url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiSettings.apiKey}`, options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: googleHistory, generationConfig: { maxOutputTokens: Number(maxTokens) || 2048 } }) } };
    }
    throw new Error(`Unsupported provider: ${provider}`);
}

export function parseApiResponse(provider, result) {
    try {
        if (provider === 'openai') { return { content: result.choices[0].message.content, usage: { prompt: result.usage.prompt_tokens, completion: result.usage.completion_tokens } }; }
        else if (provider === 'anthropic') { return { content: result.content[0].text, usage: { prompt: result.usage.input_tokens, completion: result.usage.output_tokens } }; }
        else if (provider === 'google_paid') { return { content: result.candidates[0].content.parts[0].text, usage: null }; } // Google V1 API does not return usage data in response body
    } catch (error) {
        console.error(`Error parsing ${provider} response:`, error, result);
        return { content: 'API 응답을 파싱하는 중 오류가 발생했습니다.', usage: null };
    }
    return { content: '알 수 없는 제공사입니다.', usage: null };
}