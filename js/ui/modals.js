// js/ui/modals.js
// 모든 종류의 모달(확인, 프롬프트, API 설정, 퀴즈)을 관리합니다.

import * as DOM from '../utils/domElements.js';
import * as State from '../core/state.js';

/**
 * 모달 관련 이벤트 리스너를 설정합니다.
 */
export function initializeModals() {
    // Custom Prompt Modal
    if (DOM.promptSaveBtn) DOM.promptSaveBtn.addEventListener('click', saveCustomPrompt);
    if (DOM.promptCancelBtn) DOM.promptCancelBtn.addEventListener('click', closePromptModal);
    
    // Quiz Modal
    if (DOM.startQuizBtn) DOM.startQuizBtn.addEventListener('click', startQuiz);
    if (DOM.quizSubmitBtn) DOM.quizSubmitBtn.addEventListener('click', handleQuizSubmit);
    if (DOM.quizModalOverlay) DOM.quizModalOverlay.addEventListener('click', e => { if (e.target === DOM.quizModalOverlay) DOM.quizModalOverlay.style.display = 'none'; });
}

/**
 * 확인/취소 모달을 표시합니다.
 * @param {string} message - 모달에 표시할 메시지
 * @param {Function} onConfirm - 확인 버튼 클릭 시 실행될 콜백 함수
 */
export function showModal(message, onConfirm) {
    if (!DOM.customModal || !DOM.modalMessage || !DOM.modalConfirmBtn || !DOM.modalCancelBtn) return;
    
    DOM.modalMessage.textContent = message;
    DOM.customModal.style.display = 'flex';
    
    DOM.modalConfirmBtn.onclick = () => {
        onConfirm();
        DOM.customModal.style.display = 'none';
    };
    
    DOM.modalCancelBtn.onclick = () => {
        DOM.customModal.style.display = 'none';
    };
}

/**
 * 노트 자동 저장 상태 메시지를 표시합니다.
 * @param {string} msg - 표시할 메시지
 * @param {boolean} success - 성공 여부 (스타일 변경용)
 */
export function updateStatus(msg, success) {
    if (!DOM.autoSaveStatus) return;
    DOM.autoSaveStatus.textContent = msg;
    DOM.autoSaveStatus.style.color = success ? 'lightgreen' : 'lightcoral';
    setTimeout(() => {
        DOM.autoSaveStatus.textContent = '';
    }, 3000);
}

// --- Custom Prompt Modal ---
export function openPromptModal() {
    if (DOM.customPromptInput) DOM.customPromptInput.value = State.customPrompt;
    if (DOM.promptModalOverlay) DOM.promptModalOverlay.style.display = 'flex';
}

function closePromptModal() {
    if (DOM.promptModalOverlay) DOM.promptModalOverlay.style.display = 'none';
}

function saveCustomPrompt() {
    if (DOM.customPromptInput) {
        const newPrompt = DOM.customPromptInput.value;
        State.setCustomPrompt(newPrompt);
        localStorage.setItem('customTutorPrompt', newPrompt);
        closePromptModal();
    }
}


// --- Quiz Modal ---
async function startQuiz() {
    if (!DOM.quizModalOverlay) return;
    const keywords = Array.from(document.querySelectorAll('.keyword-chip')).map(c => c.textContent.trim()).join(', ');
    if (!keywords) {
        showModal("퀴즈를 생성할 핵심 키워드가 없습니다.", () => {});
        return;
    }

    if (DOM.quizContainer) DOM.quizContainer.innerHTML = '<div class="loading-indicator">퀴즈 생성 중...</div>';
    if (DOM.quizResults) DOM.quizResults.innerHTML = '';
    DOM.quizModalOverlay.style.display = 'flex';

    try {
        // This part needs to be connected to the AI logic. For now, it's a placeholder.
        const response = await new Promise(resolve => setTimeout(() => resolve(JSON.stringify({
            "questions": [{
                "q": (예시) ''와(과) 관련된 설명으로 올바른 것은?,
                "o": ["보기 1", "보기 2", "정답 보기", "보기 4"],
                "a": "정답 보기"
            }]
        })), 500));
        
        const quizData = JSON.parse(response);
        State.setCurrentQuizData(quizData);
        renderQuiz(quizData);

    } catch (e) {
        if (DOM.quizContainer) DOM.quizContainer.innerHTML = '퀴즈 생성에 실패했습니다.';
    }
}

function renderQuiz(data) {
    if (!DOM.quizContainer || !data.questions) return;
    DOM.quizContainer.innerHTML = '';
    data.questions.forEach((q, i) => {
        const block = document.createElement('div');
        block.className = 'quiz-question-block';
        const p = document.createElement('p');
        p.textContent = ${i + 1}. ;
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'quiz-options';
        q.o.forEach(opt => {
            const label = document.createElement('label');
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = q-;
            radio.value = opt;
            label.append(radio,  );
            optionsDiv.appendChild(label);
        });
        block.append(p, optionsDiv);
        DOM.quizContainer.appendChild(block);
    });
}

function handleQuizSubmit() {
    if (!State.currentQuizData || !DOM.quizResults) return;
    
    const questions = State.currentQuizData.questions;
    if (questions.some((q, i) => !document.querySelector(input[name="q-"]:checked))) {
        DOM.quizResults.textContent = "모든 문제에 답해주세요!";
        return;
    }
    
    let score = 0;
    questions.forEach((q, i) => {
        const userAnswer = document.querySelector(input[name="q-"]:checked).value;
        if(userAnswer === q.a) score++;
    });
    
    DOM.quizResults.textContent = 결과:  문제 중 개 정답!;
}
