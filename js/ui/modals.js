/*
--- Ailey & Bailey Canvas ---
File: js/ui/modals.js
Version: 11.1 (Modular Hotfix)
Description: Handles logic for all modals. Escaped  + "" + $ characters.
*/

import { getState, updateState } from '../core/state.js';
import { quizModalOverlay, quizContainer, quizResults, promptModalOverlay, customPromptInput } from '../utils/domElements.js';
import { showModal } from '../utils/helpers.js';

export async function startQuiz() {
    if (!quizModalOverlay) return;
    const keywords = Array.from(document.querySelectorAll('.keyword-chip')).map(c => c.textContent.trim()).join(', ');
    if (!keywords) { showModal("퀴즈를 생성할 키워드가 없습니다.", () => {}); return; }
    if (quizContainer) quizContainer.innerHTML = '<div>퀴즈 생성 중...</div>';
    if (quizResults) quizResults.innerHTML = '';
    quizModalOverlay.style.display = 'flex';
    try {
        const response = await new Promise(resolve => setTimeout(() => resolve(JSON.stringify({
            "questions": [{"q": "Example Question?", "o": ["A", "B", "C"], "a": "A"}]
        })), 500));
        updateState('currentQuizData', JSON.parse(response));
        renderQuiz(getState().currentQuizData);
    } catch (e) {
        if (quizContainer) quizContainer.innerHTML = '퀴즈 생성에 실패했습니다.';
    }
}

function renderQuiz(data) {
    if (!quizContainer || !data.questions) return;
    quizContainer.innerHTML = '';
    data.questions.forEach((q, i) => {
        const questionBlock = document.createElement('div');
        questionBlock.className = 'quiz-question-block';
        questionBlock.innerHTML = <p> + "" + ` + "" + $ + {i + 1}.  + "" + $ + {q.q}</p>;
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'quiz-options';
        q.o.forEach(opt => {
            const label = document.createElement('label');
            label.innerHTML = <input type="radio" name="q- + "" + $ + {i}" value=" + "" + $ + {opt}">  + "" + $ + {opt};
            optionsContainer.appendChild(label);
        });
        questionBlock.appendChild(optionsContainer);
        quizContainer.appendChild(questionBlock);
    });
}

export function submitQuiz() {
    const { currentQuizData } = getState();
    if (!currentQuizData || !quizResults) return;
    let score = 0;
    const allAnswered = currentQuizData.questions.every((q, i) => document.querySelector(input[name="q- + "" + $ + {i}"]:checked));
    if (!allAnswered) { quizResults.textContent = "모든 문제에 답해주세요!"; return; }
    currentQuizData.questions.forEach((q, i) => {
        const userAnswer = document.querySelector(input[name="q- + "" + $ + {i}"]:checked).value;
        if (userAnswer === q.a) score++;
    });
    quizResults.textContent = 결과:  + "" + $ + {currentQuizData.questions.length}개 중  + "" + $ + {score}개 정답!;
}

export function openPromptModal() {
    const { customPrompt } = getState();
    if (customPromptInput) customPromptInput.value = customPrompt;
    if (promptModalOverlay) promptModalOverlay.style.display = 'flex';
}

export function closePromptModal() { if (promptModalOverlay) promptModalOverlay.style.display = 'none'; }

export function saveCustomPrompt() {
    if (customPromptInput) {
        const newPrompt = customPromptInput.value;
        updateState('customPrompt', newPrompt);
        localStorage.setItem('customTutorPrompt', newPrompt);
        closePromptModal();
    }
}
