/* --- Ailey & Bailey Canvas --- */
// File: 230_chat_app.js
// Version: 5.8 (State Sync Fix)
// Description: Correctly updates central state from header UI before saving.

let draggedSessionId = null;

function handleFileAttachClick() {
    if (chatFileInput) {
        chatFileInput.click();
    }
}

function handleFileSelected(event) {
    const file = event.target.files[0];
    if (!file) {
        removeAttachment();
        return;
    }
    trace('handleFileSelected: File picked', { name: file.name, size: file.size, type: file.type });

    const reader = new FileReader();
    reader.onload = function(e) {
        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';

        attachedFile = {
            name: file.name,
            content: e.target.result,
            type: isImage ? 'image' : (isPdf ? 'pdf' : 'text')
        };
        trace('handleFileSelected: File read successfully', { type: attachedFile.type });
        
        if (attachedFileDisplay) {
            let previewHTML = '';
            if (isImage) {
                previewHTML = `<img src="${e.target.result}" alt="Preview" class="attachment-preview-img">`;
            } else if (isPdf) {
                previewHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M9.5,11.5A1.5,1.5 0 0,1 8,10A1.5,1.5 0 0,1 9.5,8.5A1.5,1.5 0 0,1 11,10A1.5,1.5 0 0,1 9.5,11.5M14.5,10.5H12.5V15H11V10.5H9V9H14.5V10.5M18.5,10.5H16.5V15H15V9H18.5V10.5Z" /></svg>';
            } else {
                previewHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M13,9V3.5L18.5,9H13Z" /></svg>';
            }

            attachedFileDisplay.innerHTML = `
                <div class="file-info">
                    ${previewHTML}
                    <span>${file.name}</span>
                </div>
                <button class="remove-file-btn" title="첨부 파일 제거">&times;</button>
            `;
            attachedFileDisplay.querySelector('.remove-file-btn').addEventListener('click', removeAttachment);
            attachedFileDisplay.style.display = 'flex';
        }
    };
    reader.onerror = function() {
        trace('handleFileSelected: File read error');
        alert("파일을 읽는 중 오류가 발생했습니다.");
        removeAttachment();
    };

    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        reader.readAsDataURL(file);
    } else {
        reader.readAsText(file);
    }
}

function removeAttachment() {
    trace('removeAttachment: Attachment cleared');
    attachedFile = null;
    if (chatFileInput) {
        chatFileInput.value = '';
    }
    if (attachedFileDisplay) {
        attachedFileDisplay.style.display = 'none';
        attachedFileDisplay.innerHTML = '';
    }
}

async function handleSaveTemplate() {
    if (!templateNameInput || !templatePromptTextarea) return;
    const name = templateNameInput.value.trim();
    const promptText = templatePromptTextarea.value.trim();
    if (!name) {
        alert("템플릿 이름을 입력해주세요.");
        templateNameInput.focus();
        return;
    }
    const data = { name, promptText };
    if (selectedTemplateId) {
        const existingTemplate = promptTemplatesCache.find(t => t.id === selectedTemplateId);
        if (existingTemplate.isDefault) {
            alert("기본 템플릿은 수정할 수 없습니다.");
            return;
        }
        await updatePromptTemplate(selectedTemplateId, data);
    } else {
        const newTemplateId = await addPromptTemplate({ ...data, isDefault: false });
        if (newTemplateId) selectTemplate(newTemplateId);
    }
}

function handleDeleteTemplate() {
    if (!selectedTemplateId) return;
    const template = promptTemplatesCache.find(t => t.id === selectedTemplateId);
    if (!template || template.isDefault) {
        alert("기본 템플릿은 삭제할 수 없습니다.");
        return;
    }
    showModal(`템플릿 "${template.name}"을(를) 정말 삭제하시겠습니까?`, async () => {
        await deletePromptTemplate(selectedTemplateId);
        selectTemplate(null);
    });
}

function selectTemplate(templateId) {
    selectedTemplateId = templateId;
    if (templateId) {
        const template = promptTemplatesCache.find(t => t.id === templateId);
        if (template) {
            templateNameInput.value = template.name || '';
            templatePromptTextarea.value = template.promptText || '';
            const isDefault = template.isDefault || false;
            deleteTemplateBtn.disabled = isDefault;
            saveTemplateBtn.disabled = isDefault;
            templateNameInput.disabled = isDefault;
            templatePromptTextarea.disabled = isDefault;
        } else {
            selectedTemplateId = null;
        }
    } else {
        templateNameInput.value = '';
        templatePromptTextarea.value = '';
        deleteTemplateBtn.disabled = true;
        saveTemplateBtn.disabled = false;
        templateNameInput.disabled = false;
        templatePromptTextarea.disabled = false;
    }
    renderPromptManager();
}

function handleAddNewTemplateClick() {
    selectTemplate(null);
    if(templateNameInput) templateNameInput.focus();
}

function getNewProjectDefaultName() {
    const baseName = "새 프로젝트";
    const existingNames = new Set(localProjectsCache.map(p => p.name));
    if (!existingNames.has(baseName)) return baseName;
    let i = 2;
    while (existingNames.has(`${baseName} ${i}`)) i++;
    return `${baseName} ${i}`;
}

function toggleProjectExpansion(projectId) {
    const project = localProjectsCache.find(p => p.id === projectId);
    if (project) {
        project.isExpanded = !project.isExpanded;
        renderSidebarContent();
    }
}

function startProjectRename(projectId) {
    const projectContainer = document.querySelector(`.project-container[data-project-id="${projectId}"]`);
    if (!projectContainer) return;
    const titleSpan = projectContainer.querySelector('.project-title');
    if (!titleSpan) return;
    const originalTitle = titleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'project-title-input';
    input.value = originalTitle;
    titleSpan.replaceWith(input);
    input.focus();
    input.select();
    const finishEditing = () => {
        const newName = input.value.trim();
        if (newName && newName !== originalTitle) renameProject(projectId, newName);
        else renderSidebarContent();
    };
    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); }
    });
}

function startSessionRename(sessionId) {
    const sessionItem = document.querySelector(`.session-item[data-session-id="${sessionId}"]`);
    if (!sessionItem) return;
    const titleSpan = sessionItem.querySelector('.session-item-title');
    if (!titleSpan) return;
    const originalTitle = titleSpan.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'project-title-input';
    input.value = originalTitle;
    titleSpan.replaceWith(input);
    input.focus();
    input.select();
    const finishEditing = () => {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== originalTitle) renameSession(sessionId, newTitle);
        else renderSidebarContent();
    };
    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); }
    });
}

function setTempChatMode(isActive) {
    trace('setTempChatMode called', { isActive });
    if (isQuickQueryTempMode === isActive) return;

    isQuickQueryTempMode = isActive;

    if (quickQueryTempToggle) {
        quickQueryTempToggle.classList.toggle('active', isActive);
    }
    if (tempSessionToggle) {
        tempSessionToggle.classList.toggle('active', isActive);
    }
    if (quickQueryInput) {
        quickQueryInput.placeholder = isActive ? "임시 질문 (기록 안됨)..." : "빠른 질문...";
    }
    
    if (!isActive) {
        temporarySession.messages = [];
        temporarySession.contextSent = false;
    }

    handleNewChat(isActive);
}

function resetSessionState() {
    currentSessionState = {
        isLoadingMore: false,
        hasMoreMessages: true,
        oldestMessageTimestamp: null,
        lastMessageTimestamp: null
    };
    if (unsubscribeFromMessages) {
        unsubscribeFromMessages();
        unsubscribeFromMessages = null;
    }
    trace("State", "resetSessionState", {}, { newState: currentSessionState });
}

async function selectSession(sessionId) {
    // [DEBUG] Log session switch start
    trace("UI.Session", "selectSession.start", { new: sessionId, old: currentSessionId }, { sessionId: sessionId });
    if (sessionId === currentSessionId) {
        trace("selectSession aborted", { reason: "Session already active" });
        return;
    }
    trace("selectSession called", { newSession: sessionId, oldSession: currentSessionId });
    if (!sessionId) return;

    setTempChatMode(false);

    resetSessionState();

    const previousSessionId = currentSessionId;
    if (previousSessionId && activeStreams[previousSessionId] && activeStreams[previousSessionId].isRendering) {
        trace("selectSession: Cleaning up rendering state for previous session.", { prevSessionId: previousSessionId });
        activeStreams[previousSessionId].isRendering = false;
    }

    let sessionData = localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionData) {
        trace("selectSession: Session data not in cache. Retrying in 100ms");
        await new Promise(resolve => setTimeout(resolve, 100));
        sessionData = localChatSessionsCache.find(s => s.id === sessionId);
        if (!sessionData) {             console.warn("Could not find session data even after delay:", sessionId);
            trace("UI.Session", "selectSession.error", { reason: "Session not in cache", sessionId: sessionId }, {}, "ERROR");
            return; }
    }

    if (completedButUnseenResponses.has(sessionId)) {
        completedButUnseenResponses.delete(sessionId);
    }

    if (chatMessages) chatMessages.innerHTML = '';
    Object.values(activeTimers).forEach(timers => timers.forEach(clearInterval));

    currentSessionId = sessionId;
    renderSidebarContent();

    if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
    if (chatMessages) chatMessages.style.display = 'flex';

    const initialMessages = await fetchPastMessages(sessionId, null);
    const sessionInCache = localChatSessionsCache.find(s => s.id === sessionId);
    if (sessionInCache) {
        sessionInCache.messages = initialMessages.slice().reverse();
    }
    
    if(initialMessages.length < MESSAGES_PER_PAGE) {
        currentSessionState.hasMoreMessages = false;
    }
    if(initialMessages.length > 0) {
        currentSessionState.oldestMessageTimestamp = initialMessages[initialMessages.length - 1].timestamp;
        currentSessionState.lastMessageTimestamp = initialMessages[0].timestamp;
    }

    renderChatMessages({ messages: initialMessages.slice().reverse() });
    listenToNewMessages(sessionId);

    if (pendingResponses.has(sessionId)) {
        // The listener will now handle rendering the loader/message, so no optimistic UI needed here.
    }

    if (chatSessionTitle) chatSessionTitle.textContent = sessionData.title || '대화';

    const isBlocked = pendingResponses.has(sessionId);
    if (chatInput) {
        chatInput.disabled = isBlocked;
        chatInput.placeholder = isBlocked ? "생각중..." : "Ailey & Bailey에게 질문하기...";
    }
    if (chatSendBtn) chatSendBtn.disabled = isBlocked;
    if (!isBlocked && chatInput) chatInput.focus();
}

function handleNewChat(isTemporary = false) {
    trace("handleNewChat called", { isTemporary });
    if (isTemporary) {
        if (currentSessionId === 'temporary-chat') {
             if (temporarySession.messages.length > 0) renderChatMessages(temporarySession);
             return;
        }
        temporarySession = { messages: [], contextSent: false };
    }

    currentSessionId = isTemporary ? 'temporary-chat' : null;
    if (tempSessionToggle) tempSessionToggle.classList.toggle('active', isTemporary);

    resetSessionState();

    Object.values(activeTimers).forEach(timers => timers.forEach(clearInterval));
    renderSidebarContent();

    if (chatMessages) chatMessages.innerHTML = '';
    if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'flex';

    if (chatSessionTitle) chatSessionTitle.textContent = isTemporary ? '임시 채팅' : 'Ailey & Bailey';

    if (chatInput) {
        chatInput.disabled = false;
        chatInput.value = '';
        chatInput.placeholder = isTemporary ? "이 대화는 기록되지 않습니다..." : "Ailey & Bailey에게 질문하기...";
    }
    if (chatSendBtn) chatSendBtn.disabled = false;
}

function setupUnifiedSettingsControl() {
    if (!settingsButton || !settingsPopover) return;
    settingsButton.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsPopover.classList.toggle('show');
    });
    aiModelSelector.addEventListener('change', () => {
        const newModel = aiModelSelector.value;
        // [CORE FIX] Step 1: Log the user's intent immediately for debugging.
        trace("UI.Action", "ModelChanged (via Header)", { from: userApiSettings.selectedModel || localStorage.getItem('selectedAiModel'), to: newModel });

        // [CORE FIX] Step 2: Update the central state object (the single source of truth).
        if (userApiSettings.provider) {
            userApiSettings.selectedModel = newModel;
        } else {
            localStorage.setItem('selectedAiModel', newModel);
        }
        
        // [CORE FIX] Step 3: Trigger a save using the now-updated central state.
        saveUserSettingsToFirebase();
        // [CORE FIX] Step 4: Update the UI display based on the new state.
        updateSettingsDisplayText();
        // Step 5: Close the popover.
        settingsPopover.classList.remove('show');
    });
    quickPromptSelect.addEventListener('change', () => {
        activePromptId = quickPromptSelect.value;
        updateSettingsDisplayText();
        settingsPopover.classList.remove('show');
        saveUserSettingsToFirebase();
    });
}

function getLatestSession() {
    if (!localChatSessionsCache || localChatSessionsCache.length === 0) return null;
    return [...localChatSessionsCache].sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0))[0];
}

function handleDragStart(e) {
    const sessionItem = e.target.closest('.session-item');
    if (sessionItem && !sessionItem.classList.contains('temporary')) {
        draggedSessionId = sessionItem.dataset.sessionId;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedSessionId);
        setTimeout(() => sessionItem.classList.add('is-dragging'), 0);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    const dropTarget = e.target.closest('.session-item, .project-header');
    if (dropTarget) {
        const targetId = dropTarget.dataset.sessionId || dropTarget.closest('.project-container')?.dataset.projectId;
        if (targetId !== draggedSessionId) dropTarget.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    const dropTarget = e.target.closest('.session-item, .project-header');
    if (dropTarget) dropTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    if (!draggedSessionId) return;
    const dropTarget = e.target.closest('.session-item, .project-header');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    if (dropTarget) {
        if (dropTarget.classList.contains('session-item')) {
            const targetSessionId = dropTarget.dataset.sessionId;
            if (draggedSessionId !== targetSessionId) createProjectFromSessions([draggedSessionId, targetSessionId]);
        } else if (dropTarget.classList.contains('project-header')) {
            const targetProjectId = dropTarget.closest('.project-container').dataset.projectId;
            moveSessionToProject(draggedSessionId, targetProjectId);
        }
    }
    const draggedElement = document.querySelector(`.session-item[data-session-id="${draggedSessionId}"]`);
    if (draggedElement) draggedElement.classList.remove('is-dragging');
    draggedSessionId = null;
}