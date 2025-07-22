/*
--- Ailey & Bailey Canvas ---
File: quiz.js
Version: 12.0 (Chat Module Refactor)
Architect: [Username] & System Architect CodeMaster
Description: This module encapsulates all logic related to the 'Key Concept Quiz' feature, including starting a quiz, rendering questions, and handling submissions.
*/

import { state } from './state.js';
import { showModal } from './ui-helpers.js';

let quizModalOverlay, startQuizBtn, quizContainer, quizSubmitBtn, quizResults;

export function initializeQuiz() {
    queryElements();
    setupEventListeners();
}

function queryElements() {
    quizModalOverlay = document.getElementById('quiz-modal-overlay');
    startQuizBtn = document.getElementById('start-quiz-btn');
    quizContainer = document.getElementById('quiz-container');
    quizSubmitBtn = document.getElementById('quiz-submit-btn');
    quizResults = document.getElementById('quiz-results');
}

function setupEventListeners() {
    if (startQuizBtn) startQuizBtn.addEventListener('click', startQuiz);
    if (quizSubmitBtn) quizSubmitBtn.addEventListener('click', handleQuizSubmit);
    if (quizModalOverlay) quizModalOverlay.addEventListener('click', e => {
        if (e.target === quizModalOverlay) quizModalOverlay.style.display = 'none';
    });
}

async function startQuiz() {
    if (!quizModalOverlay) return;

    const keywords = Array.from(document.querySelectorAll('.keyword-chip')).map(c => c.textContent.trim()).join(', ');
    if (!keywords) {
        showModal("퀴즈를 생성할 핵심 키워드가 없습니다.", () => {});
        return;
    }

    if (quizContainer) quizContainer.innerHTML = '<div>퀴즈 생성 중...</div>';
    if (quizResults) quizResults.innerHTML = '';
    quizModalOverlay.style.display = 'flex';

    try {
        // In a real-world scenario, this would be an API call to an AI to generate a quiz.
        // For this system, we simulate a simple quiz based on the first keyword.
        const firstKeyword = keywords.split(',')[0];
        const simulatedQuestion = {
            q: `"${firstKeyword}"에 대한 설명으로 가장 적절한 것은 무엇일까요?`,
            o: [
                "관련성이 높은 예시 선택지 1",
                "관련성이 낮은 예시 선택지 2",
                "완전히 틀린 예시 선택지 3",
                "헷갈리는 예시 선택지 4"
            ],
            a: "관련성이 높은 예시 선택지 1" // Correct answer
        };
        state.currentQuizData = { questions: [simulatedQuestion] };
        
        renderQuiz(state.currentQuizData);

    } catch (e) {
        console.error("Quiz generation failed:", e);
        if(quizContainer) quizContainer.innerHTML = '퀴즈 생성에 실패했습니다. 다시 시도해주세요.';
    }
}

function renderQuiz(data) {
    if (!quizContainer || !data || !data.questions) return;
    
    quizContainer.innerHTML = '';
    
    data.questions.forEach((q, i) => {
        const block = document.createElement('div');
        block.className = 'quiz-question-block';
        
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
            
            label.appendChild(radio);
            label.appendChild(document.createTextNode(` ${opt}`));
            optionsDiv.appendChild(label);
        });
        
        block.appendChild(questionText);
        block.appendChild(optionsDiv);
        quizContainer.appendChild(block);
    });
}

function handleQuizSubmit() {
    if (!state.currentQuizData || !quizResults || !quizContainer) return;

    let score = 0;
    let allAnswered = true;

    state.currentQuizData.questions.forEach((q, i) => {
        const checked = quizContainer.querySelector(`input[name="q-${i}"]:checked`);
        if (!checked) {
            allAnswered = false;
        } else if (checked.value === q.a) {
            score++;
        }
    });

    if (!allAnswered) {
        quizResults.textContent = "모든 문제에 답해주세요!";
        quizResults.style.color = 'orange';
        return;
    }

    const total = state.currentQuizData.questions.length;
    quizResults.textContent = `결과: ${total}개 중 ${score}개 정답!`;
    quizResults.style.color = score === total ? 'lightgreen' : 'lightcoral';
}