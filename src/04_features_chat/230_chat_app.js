/*
--- Ailey & Bailey Canvas ---
File: 230_chat_app.js
Version: 1.0 (Bundled)
Description: Acts as the main controller for the Chat App, handling user interactions and top-level state.
*/

function getNewProjectDefaultName() {
    const baseName = "새 프로젝트";
    const existingNames = new Set(localProjectsCache.map(p => p.name));
    if (!existingNames.has(baseName)) {
        return baseName;
    }
    let i = 2;
    while (existingNames.has(`${baseName} ${i}`)) {
        i++;
    }
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
        if (newName && newName !== originalTitle) {
             renameProject(projectId, newName);
        } else {
             renderSidebarContent();
        }
    };

    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
            input.value = originalTitle;
            input.blur();
        }
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
        if (newTitle && newTitle !== originalTitle) {
            renameSession(sessionId, newTitle);
        } else {
            renderSidebarContent();
        }
    };
    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
            input.value = originalTitle;
            input.blur();
        }
    });
}

function selectSession(sessionId) {
    removeContextMenu();
    if (!sessionId) return;
    const sessionData = localChatSessionsCache.find(s => s.id === sessionId);
    if (!sessionData) return;

    currentSessionId = sessionId;
    Object.values(activeTimers).forEach(timers => timers.forEach(clearInterval));

    renderSidebarContent();
    if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
    if (chatMessages) chatMessages.style.display = 'flex';
    renderChatMessages(sessionData);

    if (chatSessionTitle) chatSessionTitle.textContent = sessionData.title || '대화';
    if (deleteSessionBtn) deleteSessionBtn.style.display = 'inline-block';
    if (chatInput) {
        chatInput.disabled = false;
        chatInput.placeholder = "AI 러닝메이트에게 질문하기..."
    }
    if (chatSendBtn) chatSendBtn.disabled = false;
    chatInput.focus();
}

function handleNewChat() { 
    currentSessionId = null; 
    Object.values(activeTimers).forEach(timers => timers.forEach(clearInterval));
    renderSidebarContent();

    if (chatMessages) {
        chatMessages.querySelectorAll('.chat-message, .ai-response-container, .reasoning-block').forEach(el => el.remove());
        chatMessages.style.display = 'flex';
    }

    if (chatWelcomeMessage) {
        chatWelcomeMessage.style.display = 'flex';
        const p = chatWelcomeMessage.querySelector('p');
        if (p) p.textContent = "아래 입력창에 질문을 입력하여 대화를 시작해보세요!";
    }
    
    if (chatSessionTitle) chatSessionTitle.textContent = 'AI 러닝메이트'; 
    if (deleteSessionBtn) deleteSessionBtn.style.display = 'none'; 
    if (chatInput) { 
        chatInput.disabled = false;
        chatInput.value = '';
        chatInput.placeholder = "AI 러닝메이트에게 질문하기..."
    } 
    if (chatSendBtn) chatSendBtn.disabled = false; 
}

function setupChatModeSelector() { 
    if (!chatModeSelector) return; 
    chatModeSelector.innerHTML = ''; 
    const modes = [
        { id: 'ailey_coaching', t: '기본 코칭', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M20,16H5.17L4,17.17V4H20V16Z" /></svg>' }, 
        { id: 'deep_learning', t: '심화 학습', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4M12,14A4,4 0 0,1 8,10H10A2,2 0 0,0 12,12A2,2 0 0,0 14,10H16A4,4 0 0,1 12,14M7.5,15.6C8.8,17.2 10.3,18 12,18C13.7,18 15.2,17.2 16.5,15.6C15.2,14.8 13.7,14 12,14C10.3,14 8.8,14.8 7.5,15.6Z" /></svg>' }, 
        { id: 'custom', t: '커스텀', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>' }
    ]; 
    modes.forEach(m => { 
        const b = document.createElement('button'); 
        b.dataset.mode = m.id; 
        b.innerHTML = `${m.i}<span>${m.t}</span>`; 
        if (m.id === selectedMode) b.classList.add('active'); 
        b.addEventListener('click', () => { 
            selectedMode = m.id; 
            chatModeSelector.querySelectorAll('button').forEach(btn => btn.classList.remove('active')); 
            b.classList.add('active'); 
            if (selectedMode === 'custom') openPromptModal();
        }); 
        chatModeSelector.appendChild(b); 
    }); 
}