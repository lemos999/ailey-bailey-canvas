import { state, setState } from '../../core/state.js';
import { dom } from '../../ui/dom.js';

export function renderChatMessages(sessionData) {
    if (!dom.chatMessages || !sessionData) return;
    
    const messages = sessionData.messages || [];
    dom.chatMessages.innerHTML = '';

    messages.forEach((msg, index) => {
        if (msg.role === 'user') {
            const d = document.createElement('div');
            d.className = chat-message user;
            d.textContent = msg.content;
            dom.chatMessages.appendChild(d);
        } else if (msg.role === 'ai') {
            if (msg.status === 'loading') {
                const loadingBlock = document.createElement('div');
                loadingBlock.className = 'reasoning-block loading';
                loadingBlock.id = msg.id;
                loadingBlock.innerHTML = 
                    <div class="reasoning-header">
                        <span class="toggle-icon">▶</span>
                        <span class="reasoning-summary blinking-cursor">AI가 생각하는 중...</span>
                    </div>
                ;
                dom.chatMessages.appendChild(loadingBlock);
                return;
            }

            const aiContainer = document.createElement('div');
            aiContainer.className = 'ai-response-container';
            const content = msg.content;
            const reasoningRegex = /\[REASONING_START\]([\s\S]*?)\[REASONING_END\]/;
            const match = content.match(reasoningRegex);

            if (match) {
                const reasoningBlockId = easoning--;
                const reasoningRaw = match[1];
                const finalAnswer = content.replace(reasoningRegex, '').trim();
                const reasoningSteps = reasoningRaw.split('SUMMARY:').filter(s => s.trim() !== '').map(step => {
                    const parts = step.split('|||DETAIL:');
                    return { summary: parts[0]?.trim(), detail: parts[1]?.trim() };
                });
                
                const rBlock = document.createElement('div');
                rBlock.className = 'reasoning-block';
                rBlock.id = reasoningBlockId;
                rBlock.dataset.steps = JSON.stringify(reasoningSteps);
                rBlock.innerHTML = 
                    <div class="reasoning-header">
                        <span class="toggle-icon">▶</span>
                        <span>AI의 추론 과정...</span>
                        <span class="reasoning-summary"></span>
                    </div>
                    <div class="reasoning-content"></div>
                ;
                aiContainer.appendChild(rBlock);
                startSummaryAnimation(rBlock, reasoningSteps);

                if (finalAnswer) {
                    const finalAnswerDiv = document.createElement('div');
                    finalAnswerDiv.className = 'chat-message ai';
                    finalAnswerDiv.innerHTML = finalAnswer.replace(/\*\*(.*?)\*\*/g, '<strong></strong>').replace(/\n/g, '<br>');
                    aiContainer.appendChild(finalAnswerDiv);
                }
            } else {
                const d = document.createElement('div');
                d.className = 'chat-message ai';
                d.innerHTML = content.replace(/\*\*(.*?)\*\*/g, '<strong></strong>').replace(/\n/g, '<br>');
                aiContainer.appendChild(d);
            }

            if (msg.duration) {
                const metaDiv = document.createElement('div');
                metaDiv.className = 'ai-response-meta';
                metaDiv.innerHTML = <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" /></svg>
                    <span>응답 생성: 초</span>;
                aiContainer.appendChild(metaDiv);
            }
            dom.chatMessages.appendChild(aiContainer);
        }
    });
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
}

function clearTimers(blockId) {
    if (state.activeTimers[blockId]) {
        state.activeTimers[blockId].forEach(clearInterval);
        delete state.activeTimers[blockId];
    }
}

export function startSummaryAnimation(blockElement, reasoningSteps) {
    const blockId = blockElement.id;
    clearTimers(blockId);
    setState('activeTimers', { ...state.activeTimers, [blockId]: [] });

    const summaryElement = blockElement.querySelector('.reasoning-summary');
    if (!summaryElement || !reasoningSteps || reasoningSteps.length === 0) return;

    let stepIndex = 0;
    const cycleSummary = () => {
        if (!reasoningSteps[stepIndex] || !reasoningSteps[stepIndex].summary) return;
        typewriterEffect(summaryElement, reasoningSteps[stepIndex].summary, () => {
            const waitTimer = setTimeout(() => {
                summaryElement.style.opacity = '0';
                const fadeTimer = setTimeout(() => {
                    stepIndex = (stepIndex + 1) % reasoningSteps.length;
                    summaryElement.style.opacity = '1';
                }, 500);
                state.activeTimers[blockId].push(fadeTimer);
            }, 2000);
            state.activeTimers[blockId].push(waitTimer);
        });
    };
    
    cycleSummary();
    const summaryInterval = setInterval(cycleSummary, 4000);
    state.activeTimers[blockId].push(summaryInterval);
}

export function typewriterEffect(element, text, onComplete) {
    if (!element || !text) { if (onComplete) onComplete(); return; }
    element.innerHTML = '';
    element.classList.add('blinking-cursor');
    let i = 0;
    const blockId = element.closest('.reasoning-block')?.id;
    
    const typingInterval = setInterval(() => {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
        } else {
            clearInterval(typingInterval);
            element.classList.remove('blinking-cursor');
            if (onComplete) onComplete();
        }
    }, 30);

    if (blockId && state.activeTimers[blockId]) {
        state.activeTimers[blockId].push(typingInterval);
    }
}

export function updateChatHeaderModelSelector() {
    if (!dom.aiModelSelector) return;
    const DEFAULT_MODELS = [ { value: 'gemini-1.5-flash-latest', text: '?? Gemini 1.5 Flash (최신)' }, { value: 'gemini-pro', text: '?? Gemini Pro (안정)' } ];
    dom.aiModelSelector.innerHTML = '';
    const { provider, apiKey, availableModels, selectedModel } = state.userApiSettings;
    if (provider && apiKey) {
        const models_to_show = availableModels || [];
        if(models_to_show.length === 0 && selectedModel) { models_to_show.push(selectedModel); }
        models_to_show.forEach(modelId => { const option = document.createElement('option'); option.value = modelId; option.textContent = [개인] ; dom.aiModelSelector.appendChild(option); });
        dom.aiModelSelector.value = selectedModel; dom.aiModelSelector.title = ${provider} 모델을 선택합니다.;
    } else {
        DEFAULT_MODELS.forEach(model => { const option = document.createElement('option'); option.value = model.value; option.textContent = model.text; dom.aiModelSelector.appendChild(option); });
        const savedDefaultModel = localStorage.getItem('selectedAiModel') || state.defaultModel;
        dom.aiModelSelector.value = savedDefaultModel; dom.aiModelSelector.title = 'AI 모델을 선택합니다.';
    }
}

function openPromptModal() {
    if (dom.customPromptInput) dom.customPromptInput.value = state.customPrompt;
    if (dom.promptModalOverlay) dom.promptModalOverlay.style.display = 'flex';
}

function closePromptModal() {
    if (dom.promptModalOverlay) dom.promptModalOverlay.style.display = 'none';
}

function saveCustomPrompt() {
    if (dom.customPromptInput) {
        setState('customPrompt', dom.customPromptInput.value);
        localStorage.setItem('customTutorPrompt', state.customPrompt);
        closePromptModal();
    }
}

export function setupChatModeSelector() {
    if (!dom.chatModeSelector) return;
    dom.chatModeSelector.innerHTML = '';
    const modes = [
        { id: 'ailey_coaching', t: '기본 코칭', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M20,16H5.17L4,17.17V4H20V16Z" /></svg>' },
        { id: 'deep_learning', t: '심화 학습', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4M12,14A4,4 0 0,1 8,10H10A2,2 0 0,0 12,12A2,2 0 0,0 14,10H16A4,4 0 0,1 12,14M7.5,15.6C8.8,17.2 10.3,18 12,18C13.7,18 15.2,17.2 16.5,15.6C15.2,14.8 13.7,14 12,14C10.3,14 8.8,14.8 7.5,15.6Z" /></svg>' },
        { id: 'custom', t: '커스텀', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>' }
    ];
    modes.forEach(m => {
        const b = document.createElement('button');
        b.dataset.mode = m.id;
        b.innerHTML = ${m.i}<span></span>;
        if (m.id === state.selectedMode) b.classList.add('active');
        b.addEventListener('click', () => {
            setState('selectedMode', m.id);
            dom.chatModeSelector.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            b.classList.add('active');
            if (state.selectedMode === 'custom') openPromptModal();
        });
        dom.chatModeSelector.appendChild(b);
    });
}
