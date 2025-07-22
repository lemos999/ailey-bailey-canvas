/*
--- Ailey & Bailey Canvas ---
File: js/chat-ui.js
Version: 11.0 (Refactored)
Description: Manages the UI/UX aspects of the chat panel, including dynamic animations
for the reasoning block, rendering chat modes, and handling quiz UI.
*/

import * as state from './state.js';
import { openPromptModal } from './ui-manager.js';

let chatModeSelector, quizContainer, quizResults, quizSubmitBtn, startQuizBtn;

export function initializeChatUI() {
    chatModeSelector = document.getElementById('chat-mode-selector');
    quizContainer = document.getElementById('quiz-container');
    quizResults = document.getElementById('quiz-results');
    quizSubmitBtn = document.getElementById('quiz-submit-btn');
    startQuizBtn = document.getElementById('start-quiz-btn');

    setupChatModeSelector();

    if (startQuizBtn) startQuizBtn.addEventListener('click', startQuiz);
    if (quizSubmitBtn) quizSubmitBtn.addEventListener('click', handleQuizSubmit);
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
        if (m.id === state.selectedMode) b.classList.add('active');
        b.addEventListener('click', () => {
            state.setSelectedMode(m.id);
            chatModeSelector.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            b.classList.add('active');
            if (state.selectedMode === 'custom') {
                openPromptModal();
            }
        });
        chatModeSelector.appendChild(b);
    });
}

export function clearTimers(blockId) {
    if (state.activeTimers[blockId]) {
        state.activeTimers[blockId].forEach(clearInterval);
        delete state.activeTimers[blockId];
    }
}

export function startSummaryAnimation(blockElement, reasoningSteps) {
    const blockId = blockElement.id;
    clearTimers(blockId);
    state.activeTimers[blockId] = [];

    const summaryElement = blockElement.querySelector('.reasoning-summary');
    if (!summaryElement || !reasoningSteps || reasoningSteps.length === 0) return;

    let stepIndex = 0;
    const cycleSummary = () => {
        if (!reasoningSteps[stepIndex] || !reasoningSteps[stepIndex].summary) return;
        
        const summaryText = reasoningSteps[stepIndex].summary;
        typewriterEffect(summaryElement, summaryText, () => {
            const waitTimer = setTimeout(() => {
                summaryElement.style.opacity = '0';
                const fadeTimer = setTimeout(() => {
                    stepIndex = (stepIndex + 1) % reasoningSteps.length;
                    summaryElement.style.opacity = '1';
                }, 500);
                if (!state.activeTimers[blockId]) state.activeTimers[blockId] = [];
                state.activeTimers[blockId].push(fadeTimer);
            }, 2000);
            if (!state.activeTimers[blockId]) state.activeTimers[blockId] = [];
            state.activeTimers[blockId].push(waitTimer);
        });
    };
    
    cycleSummary(); // Start immediately
    const summaryInterval = setInterval(cycleSummary, 4000 + 2500); // Wait for typewriting + fade
    if (!state.activeTimers[blockId]) state.activeTimers[blockId] = [];
    state.activeTimers[blockId].push(summaryInterval);
}

export function typewriterEffect(element, text, onComplete) {
    if (!element || !text) {
        if (onComplete) onComplete();
        return;
    }

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

// --- Quiz UI Functions ---
async function startQuiz() {
    const quizModalOverlay = document.getElementById('quiz-modal-overlay');
    if (!quizModalOverlay) return;

    const keywords = Array.from(document.querySelectorAll('.keyword-chip')).map(c => c.textContent.trim()).join(', ');
    if (!keywords) {
        showModal("퀴즈를 생성할 핵심 키워드가 없습니다.", () => {});
        return;
    }

    if (quizContainer) quizContainer.innerHTML = '<div class="loading-indicator">퀴즈 생성 중...</div>';
    if (quizResults) quizResults.innerHTML = '';
    quizModalOverlay.style.display = 'flex';

    try {
        // This is a mock API call. In a real scenario, you would fetch from a server.
        const response = await new Promise(resolve => setTimeout(() => resolve(JSON.stringify({ 
            "questions": [{
                "q": `(예시) '${keywords}'(와)과 관련된 다음 설명 중 옳지 않은 것은?`,
                "o": ["선택지 1", "선택지 2 (정답)", "선택지 3", "선택지 4"],
                "a": "선택지 2 (정답)"
            }]
        })), 500));
        
        const quizData = JSON.parse(response);
        state.setCurrentQuizData(quizData);
        renderQuiz(quizData);

    } catch (e) {
        if(quizContainer) quizContainer.innerHTML = '퀴즈 생성에 실패했습니다.';
    }
}

function renderQuiz(data) {
    if (!quizContainer || !data.questions) return;
    quizContainer.innerHTML = '';

    data.questions.forEach((q, i) => {
        const questionBlock = document.createElement('div');
        questionBlock.className = 'quiz-question-block';
        
        const questionText = document.createElement('p');
        questionText.textContent = `${i + 1}. ${q.q}`;
        
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'quiz-options';
        
        q.o.forEach(opt => {
            const label = document.createElement('label');
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `q-${i}`;
            radio.value = opt;
            label.append(radio, ` ${opt}`);
            optionsDiv.appendChild(label);
        });
        
        questionBlock.append(questionText, optionsDiv);
        quizContainer.appendChild(questionBlock);
    });
}

function handleQuizSubmit() {
    if (!state.currentQuizData || !quizResults) return;

    let score = 0;
    const questions = state.currentQuizData.questions;

    // Check if all questions are answered
    if (questions.some((q, i) => !document.querySelector(`input[name="q-${i}"]:checked`))) {
        quizResults.textContent = "모든 문제에 답해주세요!";
        return;
    }
    
    questions.forEach((q, i) => {
        const selectedOption = document.querySelector(`input[name="q-${i}"]:checked`);
        if (selectedOption && selectedOption.value === q.a) {
            score++;
        }
    });
    
    quizResults.textContent = `결과: ${questions.length}개 중 ${score}개 정답!`;
}