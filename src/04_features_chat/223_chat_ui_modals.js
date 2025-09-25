/* --- Ailey & Bailey Canvas --- */
// File: 223_chat_ui_modals.js
// Version: 3.3 (Debugger Enhancement)
// Description: Added detailed trace log for AI model changes and clarified event name.

// Renders the quick-select dropdown for prompt templates inside the popover
function renderQuickPromptSelect() {
    if (!quickPromptSelect) return;
    const sortedTemplates = [...promptTemplatesCache].sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return (a.name || '').localeCompare(b.name || '', 'ko');
    });
    quickPromptSelect.innerHTML = ''; // Clear existing options
    let defaultTemplateId = null;
    sortedTemplates.forEach(template => {
        if (template.isDefault) defaultTemplateId = template.id;
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = template.name;
        quickPromptSelect.appendChild(option);
    });
    if (activePromptId && sortedTemplates.some(t => t.id === activePromptId)) {
        quickPromptSelect.value = activePromptId;
    } else {
        activePromptId = defaultTemplateId;
        if (activePromptId) {
            quickPromptSelect.value = activePromptId;
        }
    }
    updateSettingsDisplayText();
}

// Renders the list of prompt templates in the manager modal
function renderPromptManager() {
    if (!templateListContainer) return;
    const sortedTemplates = [...promptTemplatesCache].sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return (a.name || '').localeCompare(b.name || '', 'ko');
    });
    if (sortedTemplates.length === 0) {
        templateListContainer.innerHTML = '<div class="empty-list-message">템플릿이 없습니다.<br>새 템플릿을 추가해보세요.</div>';
        return;
    }
    templateListContainer.innerHTML = sortedTemplates.map(template => `
        <div class="template-list-item ${template.id === selectedTemplateId ? 'active' : ''} ${template.isDefault ? 'is-default' : ''}" data-id="${template.id}">
            <span class="item-name">${template.name || '제목 없음'}</span>
        </div>
    `).join('');
}

function showProjectContextMenu(projectId, event) {
    const items = [
        { label: '이름 변경', action: () => startProjectRename(projectId) },
        { label: '삭제', action: () => deleteProject(projectId) }
    ];
    createContextMenu(items, event);
}

function showSessionContextMenu(sessionId, event) {
    const session = localChatSessionsCache.find(s => s.id === sessionId);
    if (!session) return;

    const moveToSubMenuItems = localProjectsCache
        .filter(p => p && p.name)
        .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
        .map(p => ({
            label: p.name,
            disabled: session.projectId === p.id,
            action: () => moveSessionToProject(sessionId, p.id)
        }));

    const items = [
        { label: '이름 변경', action: () => startSessionRename(sessionId) },
        {
            label: '프로젝트로 이동',
            submenu: [
                { label: '[일반 대화로 이동]', disabled: !session.projectId, action: () => moveSessionToProject(sessionId, null) },
                ...(moveToSubMenuItems.length > 0 ? [{ separator: true }, ...moveToSubMenuItems] : [])
            ]
        },
        { label: session.isPinned ? '고정 해제' : '고정하기', action: () => toggleChatPin(sessionId) },
        { separator: true },
        { label: '삭제', action: () => handleDeleteSession(sessionId) }
    ];

    createContextMenu(items, event);
}

function updateChatHeaderModelSelector() {
    if (!aiModelSelector) return;
    const previousModel = aiModelSelector.value;
    const DEFAULT_MODELS = [
        { value: 'gemini-2.5-flash-preview-04-17', text: '⚡️ Gemini 2.5 Flash (최신)' },
        { value: 'gemini-2.0-flash', text: '💡 Gemini 2.0 Flash (안정)' }
    ];
    aiModelSelector.innerHTML = '';
    if (userApiSettings.provider && userApiSettings.apiKey) {
        const models_to_show = userApiSettings.availableModels || [];
        if(models_to_show.length === 0 && userApiSettings.selectedModel) {
            models_to_show.push(userApiSettings.selectedModel);
        }
        models_to_show.forEach(modelId => {
            const option = document.createElement('option');
            option.value = modelId;
            option.textContent = `[개인] ${modelId}`.substring(0, 30);
            aiModelSelector.appendChild(option);
        });
        aiModelSelector.value = userApiSettings.selectedModel;
    } else {
        DEFAULT_MODELS.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.text;
            aiModelSelector.appendChild(option);
        });
        const savedDefaultModel = localStorage.getItem('selectedAiModel') || defaultModel;
        aiModelSelector.value = savedDefaultModel;
    }
    updateSettingsDisplayText();
    const newModel = aiModelSelector.value;
    if (previousModel && previousModel !== newModel) {
        // This trace confirms that the UI has been successfully updated to reflect a state change.
        trace("UI.StateSync", "ModelChangeReflected", { from: previousModel, to: newModel });
    }
}

function updateSettingsDisplayText() {
    if (!settingsDisplayText || !aiModelSelector || !quickPromptSelect) return;
    const selectedModelOption = aiModelSelector.options[aiModelSelector.selectedIndex];
    const modelText = selectedModelOption ? selectedModelOption.textContent.replace('[개인] ', '') : '모델 선택';
    const selectedPromptOption = quickPromptSelect.options[quickPromptSelect.selectedIndex];
    const promptText = selectedPromptOption ? selectedPromptOption.textContent : '템플릿 선택';
    settingsDisplayText.textContent = `${modelText} | ${promptText}`;
}