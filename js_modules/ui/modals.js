/*
 * modals.js: Handles logic for various modals (Quiz, Prompt, Confirm).
 */
import * as Dom from '../utils/domElements.js';
import * as State from '../core/state.js';
import { showModal } from '../utils/helpers.js';

export function openPromptModal() {
    if (Dom.customPromptInput) Dom.customPromptInput.value = State.customPrompt;
    if (Dom.promptModalOverlay) Dom.promptModalOverlay.style.display = 'flex';
}

export function closePromptModal() {
    if (Dom.promptModalOverlay) Dom.promptModalOverlay.style.display = 'none';
}

export function saveCustomPrompt() {
    if (Dom.customPromptInput) {
        State.setCustomPrompt(Dom.customPromptInput.value);
        localStorage.setItem('customTutorPrompt', State.customPrompt);
        closePromptModal();
    }
}

export async function startQuiz() {
    if (!Dom.quizModalOverlay) return;
    const keywords = Array.from(document.querySelectorAll('.keyword-chip')).map(c => c.textContent.trim()).join(', ');
    if (!keywords) {
        showModal("퀴즈 생성 키워드가 없습니다.", () => {});
        return;
    }
    if (Dom.quizContainer) Dom.quizContainer.innerHTML = '<div class="loading-indicator">퀴즈 생성 중...</div>';
    if (Dom.quizResults) Dom.quizResults.innerHTML = '';
    Dom.quizModalOverlay.style.display = 'flex';
    try {
        // This is a placeholder for the actual API call to generate a quiz.
        const response = await new Promise(resolve => setTimeout(() => resolve(JSON.stringify({
            "questions": [{
                "q": "(Example) What is the capital of France?",
                "o": ["Berlin", "Madrid", "Paris", "Rome"],
                "a": "Paris"
            }]
        })), 500));
        State.setCurrentQuizData(JSON.parse(response));
        renderQuiz(State.currentQuizData);
    } catch (e) {
        if (Dom.quizContainer) Dom.quizContainer.innerHTML = '퀴즈 생성에 실패했습니다.';
    }
}

function renderQuiz(data) {
    if (!Dom.quizContainer || !data.questions) return;
    Dom.quizContainer.innerHTML = '';
    data.questions.forEach((q, i) => {
        const block = document.createElement('div');
        block.className = 'quiz-question-block';
        const p = document.createElement('p');
        p.textContent = `${i + 1}. ${q.q}`;
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
        block.append(p, optionsDiv);
        Dom.quizContainer.appendChild(block);
    });
}

export function handleSubmitQuiz() {
    if (!State.currentQuizData || !Dom.quizResults) return;
    let score = 0;
    const allAnswered = State.currentQuizData.questions.every((q, i) =>
        document.querySelector(`input[name="q-${i}"]:checked`)
    );
    if (!allAnswered) {
        Dom.quizResults.textContent = "모든 문제에 답해주세요!";
        return;
    }
    State.currentQuizData.questions.forEach((q, i) => {
        const userAnswer = document.querySelector(`input[name="q-${i}"]:checked`).value;
        if (userAnswer === q.a) {
            score++;
        }
    });
    Dom.quizResults.textContent = `결과: ${State.currentQuizData.questions.length} 중 ${score} 정답!`;
}
