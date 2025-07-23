// js/ui/apiSettings.js
// API 설정 모달, 시스템 초기화, 데이터 백업/복원 등
// 시스템 관리 기능과 관련된 모든 로직을 캡슐화합니다.

import * as DOM from '../utils/domElements.js';
import * as State from '../core/state.js';
import { showModal } from './modals.js';

/**
 * API 설정 및 시스템 관리 기능의 이벤트 리스너를 설정합니다.
 */
export function initializeApiSettings() {
    loadApiSettings();
    updateChatHeaderModelSelector();

    if (DOM.apiSettingsBtn) DOM.apiSettingsBtn.addEventListener('click', openApiSettingsModal);
    if (DOM.apiSettingsCancelBtn) DOM.apiSettingsCancelBtn.addEventListener('click', closeApiSettingsModal);
    if (DOM.apiSettingsSaveBtn) DOM.apiSettingsSaveBtn.addEventListener('click', () => saveApiSettings(true));
    if (DOM.verifyApiKeyBtn) DOM.verifyApiKeyBtn.addEventListener('click', handleVerifyApiKey);
    if (DOM.resetTokenUsageBtn) DOM.resetTokenUsageBtn.addEventListener('click', resetTokenUsage);
    
    if (DOM.apiSettingsModalOverlay) {
        DOM.apiSettingsModalOverlay.addEventListener('click', (e) => { 
            if (e.target === DOM.apiSettingsModalOverlay) closeApiSettingsModal(); 
        });
    }

    if (DOM.aiModelSelector) {
        DOM.aiModelSelector.addEventListener('change', () => {
            const selectedValue = DOM.aiModelSelector.value;
            if (State.userApiSettings.provider && State.userApiSettings.apiKey) {
                const newSettings = { ...State.userApiSettings, selectedModel: selectedValue };
                State.setUserApiSettings(newSettings);
                localStorage.setItem('userApiSettings', JSON.stringify(newSettings));
            } else {
                State.defaultModel = selectedValue;
                localStorage.setItem('selectedAiModel', selectedValue);
            }
        });
    }
}

/**
 * 동적으로 API 설정 모달의 HTML 구조를 생성하여 body에 추가합니다.
 */
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

    // Add a file importer input for the restore functionality
    const importer = document.createElement('input');
    importer.type = 'file';
    importer.id = 'file-importer';
    importer.accept = '.json';
    importer.style.display = 'none';
    document.body.appendChild(importer);
}

function openApiSettingsModal() {
    loadApiSettings();
    DOM.apiKeyInput.value = State.userApiSettings.apiKey;
    DOM.maxOutputTokensInput.value = State.userApiSettings.maxOutputTokens;
    populateModelSelector(State.userApiSettings.availableModels, State.userApiSettings.provider, State.userApiSettings.selectedModel);
    if (State.userApiSettings.apiKey) {
         DOM.apiKeyStatus.textContent = ? [] 키가 활성화되어 있습니다.;
         DOM.apiKeyStatus.className = 'status-success';
    } else {
         DOM.apiKeyStatus.textContent = '';
         DOM.apiKeyStatus.className = '';
    }
    renderTokenUsage();
    DOM.apiSettingsModalOverlay.style.display = 'flex';
}

function closeApiSettingsModal() {
    DOM.apiSettingsModalOverlay.style.display = 'none';
    loadApiSettings(); 
    updateChatHeaderModelSelector();
}

function loadApiSettings() {
    const savedSettings = localStorage.getItem('userApiSettings');
    if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (!parsed.tokenUsage) { parsed.tokenUsage = { prompt: 0, completion: 0 }; }
        if (!parsed.availableModels) { parsed.availableModels = []; }
        State.setUserApiSettings(parsed);
    }
}

function saveApiSettings(closeModal = true) {
    const key = DOM.apiKeyInput.value.trim();
    let newSettings = { ...State.userApiSettings };

    if (key) {
        newSettings.apiKey = key;
        newSettings.selectedModel = DOM.apiModelSelect.value;
        newSettings.maxOutputTokens = Number(DOM.maxOutputTokensInput.value) || 2048;
        if (DOM.apiModelSelect && DOM.apiModelSelect.options.length > 0 && !DOM.apiModelSelect.disabled) {
             newSettings.availableModels = Array.from(DOM.apiModelSelect.options).map(opt => opt.value);
        }
    } else {
        newSettings = { provider: null, apiKey: '', selectedModel: '', availableModels: [], maxOutputTokens: 2048, tokenUsage: { prompt: 0, completion: 0 } };
    }
    
    State.setUserApiSettings(newSettings);
    localStorage.setItem('userApiSettings', JSON.stringify(newSettings));
    updateChatHeaderModelSelector();

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
    const key = DOM.apiKeyInput.value.trim();
    if (!key) { DOM.apiKeyStatus.textContent = 'API 키를 입력해주세요.'; DOM.apiKeyStatus.className = 'status-error'; return; }
    
    const provider = detectProvider(key);
    if (!provider) { DOM.apiKeyStatus.textContent = '알 수 없는 형식의 API 키입니다. (OpenAI, Anthropic, Google 지원)'; DOM.apiKeyStatus.className = 'status-error'; return; }
    
    const newSettings = { ...State.userApiSettings, provider: provider };
    State.setUserApiSettings(newSettings);

    DOM.apiKeyStatus.textContent = [] 키 검증 및 모델 목록 로딩 중...; DOM.apiKeyStatus.className = 'status-loading'; DOM.verifyApiKeyBtn.disabled = true;
    
    try {
        const models = await fetchAvailableModels(provider, key);
        populateModelSelector(models, provider);
        DOM.apiKeyStatus.textContent = ? [] 키 검증 완료! 모델을 선택하고 저장하세요.; DOM.apiKeyStatus.className = 'status-success'; DOM.apiModelSelect.disabled = false;
    } catch (error) {
        console.error("API Key Verification Error:", error);
        DOM.apiKeyStatus.textContent = ? [] 키 검증 실패: ; DOM.apiKeyStatus.className = 'status-error'; DOM.apiModelSelect.innerHTML = '<option>키 검증에 실패했습니다</option>'; DOM.apiModelSelect.disabled = true;
    } finally {
        DOM.verifyApiKeyBtn.disabled = false;
    }
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
    DOM.apiModelSelect.innerHTML = '';
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
            DOM.apiModelSelect.appendChild(option);
        });
        DOM.apiModelSelect.disabled = false;
    } else {
        DOM.apiModelSelect.innerHTML = '<option>사용 가능한 모델 없음</option>';
        DOM.apiModelSelect.disabled = true;
    }
}

function updateChatHeaderModelSelector() {
    if (!DOM.aiModelSelector) return;
    const DEFAULT_MODELS = [
        { value: 'gemini-1.5-flash-preview-0514', text: '?? Gemini 1.5 Flash (최신)' },
        { value: 'gemini-1.0-pro', text: '?? Gemini 1.0 Pro (안정)' }
    ];
    DOM.aiModelSelector.innerHTML = '';

    if (State.userApiSettings.provider && State.userApiSettings.apiKey) {
        const models_to_show = State.userApiSettings.availableModels || [];
        if (models_to_show.length === 0 && State.userApiSettings.selectedModel) {
            models_to_show.push(State.userApiSettings.selectedModel);
        }
        models_to_show.forEach(modelId => {
            const option = document.createElement('option');
            option.value = modelId;
            option.textContent = [개인] ;
            DOM.aiModelSelector.appendChild(option);
        });
        DOM.aiModelSelector.value = State.userApiSettings.selectedModel;
        DOM.aiModelSelector.title = ${State.userApiSettings.provider} 모델을 선택합니다. (개인 키 사용 중);
    } else {
        DEFAULT_MODELS.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.text;
            DOM.aiModelSelector.appendChild(option);
        });
        const savedDefaultModel = localStorage.getItem('selectedAiModel') || State.defaultModel;
        DOM.aiModelSelector.value = savedDefaultModel;
        DOM.aiModelSelector.title = 'AI 모델을 선택합니다.';
    }
}

function renderTokenUsage() {
    const { prompt, completion } = State.userApiSettings.tokenUsage;
    const total = prompt + completion;
    DOM.tokenUsageDisplay.innerHTML = <span>입력: </span> | <span>출력: </span> | <strong>총합: </strong>;
}

function resetTokenUsage() {
    showModal('누적 토큰 사용량을 정말로 초기화하시겠습니까?', () => {
        const newSettings = { ...State.userApiSettings, tokenUsage: { prompt: 0, completion: 0 } };
        State.setUserApiSettings(newSettings);
        saveApiSettings(false);
        renderTokenUsage();
    });
}


// --- System Management Functions ---

export async function handleSystemReset() {
    const message = "정말로 이 캔버스의 모든 프로젝트, 채팅, 메모 기록을 영구적으로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.";
    showModal(message, async () => {
        if (!State.db || !State.currentUser) { alert("초기화 실패: DB 연결을 확인해주세요."); return; }
        
        const { updateStatus } = await import('./modals.js').then(m => m);
        updateStatus("시스템 초기화 중...", true);
        const batch = State.db.batch();
        try {
            const notesSnapshot = await State.notesCollection.get();
            notesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            const chatsSnapshot = await State.chatSessionsCollectionRef.get();
            chatsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            const projectsSnapshot = await State.projectsCollectionRef.get();
            projectsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            
            localStorage.removeItem('userApiSettings');
            localStorage.removeItem('selectedAiModel');

            alert("? 모든 데이터가 성공적으로 삭제되었습니다. 페이지를 새로고침하여 시스템을 다시 시작합니다.");
            location.reload();
        } catch (error) {
            console.error("? 시스템 초기화 실패:", error);
            alert(시스템 초기화 중 오류가 발생했습니다: );
            updateStatus("초기화 실패 ?", false);
        }
    });
}

export function exportAllData() {
    if (State.localNotesCache.length === 0 && State.localChatSessionsCache.length === 0 && State.localProjectsCache.length === 0) {
        showModal("백업할 데이터가 없습니다.", () => {});
        return;
    }
    const processTimestamp = (item) => {
        const newItem = { ...item };
        if (newItem.createdAt?.toDate) newItem.createdAt = newItem.createdAt.toDate().toISOString();
        if (newItem.updatedAt?.toDate) newItem.updatedAt = newItem.updatedAt.toDate().toISOString();
        if (Array.isArray(newItem.messages)) {
            newItem.messages = newItem.messages.map(msg => {
                const newMsg = { ...msg };
                if (newMsg.timestamp?.toDate) newMsg.timestamp = newMsg.timestamp.toDate().toISOString();
                return newMsg;
            });
        }
        return newItem;
    };
    const dataToExport = {
        backupVersion: '2.0',
        backupDate: new Date().toISOString(),
        notes: State.localNotesCache.map(processTimestamp),
        chatSessions: State.localChatSessionsCache.map(processTimestamp),
        projects: State.localProjectsCache.map(processTimestamp)
    };
    const str = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = iley-canvas-backup-.json;
    a.click();
    URL.revokeObjectURL(url);
}

export function handleRestoreClick() {
    const fileImporter = document.getElementById('file-importer');
    if (fileImporter) fileImporter.click();
}

export async function importAllData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.backupVersion !== '2.0') { throw new Error("호환되지 않는 백업 파일 버전입니다."); }
            const message = 파일에서 개의 프로젝트, 개의 채팅, 개의 메모를 발견했습니다. 현재 데이터를 덮어씁니다. 계속하시겠습니까?;
            
            showModal(message, async () => {
                try {
                    const { updateStatus } = await import('./modals.js').then(m => m);
                    updateStatus('복원 중...', true);
                    const batch = State.db.batch();
                    const toFirestoreTimestamp = ts => ts ? firebase.firestore.Timestamp.fromDate(new Date(ts)) : firebase.firestore.FieldValue.serverTimestamp();
                    
                    (data.notes || []).forEach(note => { const { id, ...dataToWrite } = note; dataToWrite.createdAt = toFirestoreTimestamp(note.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(note.updatedAt); batch.set(State.notesCollection.doc(id), dataToWrite); });
                    (data.chatSessions || []).forEach(session => { const { id, ...dataToWrite } = session; dataToWrite.createdAt = toFirestoreTimestamp(session.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(session.updatedAt); if(dataToWrite.messages) dataToWrite.messages.forEach(m=>m.timestamp=toFirestoreTimestamp(m.timestamp)); batch.set(State.chatSessionsCollectionRef.doc(id), dataToWrite); });
                    (data.projects || []).forEach(project => { const { id, ...dataToWrite } = project; dataToWrite.createdAt = toFirestoreTimestamp(project.createdAt); dataToWrite.updatedAt = toFirestoreTimestamp(project.updatedAt); batch.set(State.projectsCollectionRef.doc(id), dataToWrite); });
                    
                    await batch.commit();
                    updateStatus('복원 완료 ?', true);
                    showModal("데이터 복원이 완료되었습니다. 페이지를 새로고침합니다.", () => location.reload());
                } catch (error) {
                    console.error("데이터 복원 실패:", error);
                    updateStatus('복원 실패 ?', false);
                    showModal(데이터 복원 중 오류: , () => {});
                }
            });
        } catch (error) {
            console.error("File parsing error:", error);
            showModal(파일 읽기 오류: , () => {});
        }
        finally {
            event.target.value = null; // Reset file input
        }
    };
    reader.readAsText(file);
}

