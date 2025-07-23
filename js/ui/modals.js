/*
--- Ailey & Bailey Canvas ---
File: js/ui/modals.js
Version: 11.0 (Modular)
Description: Handles logic for all modals (quiz, custom prompt, etc.).
*/

import { getState, updateState } from '../core/state.js';
import { quizModalOverlay, quizContainer, quizResults, promptModalOverlay, customPromptInput } from '../utils/domElements.js';
import { showModal } from '../utils/helpers.js';

let currentQuizData = null;

/**
 * Initiates and displays a quiz based on keywords found on the page.
 */
export async function startQuiz() {
    if (!quizModalOverlay) return;

    const keywords = Array.from(document.querySelectorAll('.keyword-chip')).map(c => c.textContent.trim()).join(', ');
    if (!keywords) {
        showModal("퀴즈를 생성할 키워드가 없습니다.", () => {});
        return;
    }

    if (quizContainer) quizContainer.innerHTML = '<div class="loading-indicator">퀴즈 생성 중...</div>';
    if (quizResults) quizResults.innerHTML = '';
    quizModalOverlay.style.display = 'flex';

    try {
        // This is a placeholder for an actual API call to generate a quiz.
        // For now, it returns a static example after a short delay.
        const response = await new Promise(resolve => setTimeout(() => resolve(JSON.stringify({
            "questions": [{
                "q": "What is the capital of France? (Example)",
                "o": ["Berlin", "Madrid", "Paris", "Rome"],
                "a": "Paris"
            }]
        })), 500));
        
        currentQuizData = JSON.parse(response);
        renderQuiz(currentQuizData);
    } catch (e) {
        if(quizContainer) quizContainer.innerHTML = '퀴즈 생성에 실패했습니다.';
        console.error("Quiz generation failed:", e);
    }
}

/**
 * Renders the quiz questions and options inside the quiz container.
 * @param {object} data - The quiz data object.
 */
function renderQuiz(data) {
    if (!quizContainer || !data.questions) return;
    quizContainer.innerHTML = '';
    data.questions.forEach((q, i) => {
        const questionBlock = document.createElement('div');
        questionBlock.className = 'quiz-question-block';
        
        const questionText = document.createElement('p');
        questionText.textContent = \. \;
        
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'quiz-options';
        
        q.o.forEach(opt => {
            const label = document.createElement('label');
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = q-\;
            radio.value = opt;
            label.append(radio,  \);
            optionsContainer.appendChild(label);
        });
        
        questionBlock.append(questionText, optionsContainer);
        quizContainer.appendChild(questionBlock);
    });
}

/**
 * Submits the quiz and displays the results.
 */
export function submitQuiz() {
    if (!currentQuizData || !quizResults) return;

    let score = 0;
    const allAnswered = currentQuizData.questions.every((q, i) => {
        return document.querySelector(input[name="q-\"]:checked);
    });

    if (!allAnswered) {
        quizResults.textContent = "모든 문제에 답해주세요!";
        return;
    }

    currentQuizData.questions.forEach((q, i) => {
        const userAnswer = document.querySelector(input[name="q-\"]:checked).value;
        if (userAnswer === q.a) {
            score++;
        }
    });

    quizResults.textContent = 결과: \개 중 \개 정답!;
}

/**
 * Opens the custom prompt modal.
 */
export function openPromptModal() {
    const { customPrompt } = getState();
    if (customPromptInput) customPromptInput.value = customPrompt;
    if (promptModalOverlay) promptModalOverlay.style.display = 'flex';
}

/**
 * Closes the custom prompt modal.
 */
export function closePromptModal() {
    if (promptModalOverlay) promptModalOverlay.style.display = 'none';
}

/**
 * Saves the custom prompt from the modal to state and local storage.
 */
export function saveCustomPrompt() {
    if (customPromptInput) {
        const newPrompt = customPromptInput.value;
        updateState('customPrompt', newPrompt);
        localStorage.setItem('customTutorPrompt', newPrompt);
        closePromptModal();
    }
}
