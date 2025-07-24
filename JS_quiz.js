/* --- JS_quiz.js --- */
import { setCurrentQuizData, getCurrentQuizData } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_state.js';
import { showModal } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_ui-helpers.js';

export function getQuizDomElements() {
    return {
        quizModalOverlay: document.getElementById('quiz-modal-overlay'),
        quizContainer: document.getElementById('quiz-container'),
        quizSubmitBtn: document.getElementById('quiz-submit-btn'),
        quizResults: document.getElementById('quiz-results'),
        startQuizBtn: document.getElementById('start-quiz-btn')
    };
}

export async function startQuiz() {
    const dom = getQuizDomElements();
    if (!dom.quizModalOverlay) return;
    const keywords = Array.from(document.querySelectorAll('.keyword-chip')).map(c => c.textContent.trim()).join(', ');
    if (!keywords) {
        showModal("퀴즈를 생성할 핵심 키워드가 없습니다.", () => {});
        return;
    }

    if (dom.quizContainer) dom.quizContainer.innerHTML = '<p>AI가 퀴즈를 생성하는 중입니다... 잠시만 기다려주세요.</p>';
    if (dom.quizResults) dom.quizResults.innerHTML = '';
    dom.quizModalOverlay.style.display = 'flex';

    try {
        const fakeApiResponse = await new Promise(resolve => setTimeout(() => resolve(JSON.stringify({
            "questions": [
                {
                    "q": "다음 중 학습 내용과 가장 관련이 깊은 키워드는 무엇입니까? (예시)",
                    "o": [...new Set(keywords.split(', ').slice(0, 3)), "관련 없는 선택지"],
                    "a": keywords.split(', ')[0]
                },
                {
                    "q": "이 학습의 주요 목표는 무엇이었나요? (예시)",
                    "o": ["목표 1", "목표 2", "목표 3", "관련 없는 목표"],
                    "a": "목표 1"
                }
            ]
        })), 1000));
        
        const quizData = JSON.parse(fakeApiResponse);
        setCurrentQuizData(quizData);
        renderQuiz(quizData);
    } catch (e) {
        if (dom.quizContainer) dom.quizContainer.innerHTML = '<p>퀴즈 생성 중 오류가 발생했습니다.</p>';
        console.error("Quiz generation failed:", e);
    }
}

function renderQuiz(data) {
    const dom = getQuizDomElements();
    if (!dom.quizContainer || !data || !data.questions) return;
    dom.quizContainer.innerHTML = '';
    data.questions.forEach((q, i) => {
        const questionBlock = document.createElement('div');
        questionBlock.className = 'quiz-question-block';
        const p = document.createElement('p');
        p.textContent = \. \;
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'quiz-options';
        q.o.forEach(opt => {
            const label = document.createElement('label');
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = q-\;
            radio.value = opt;
            label.append(radio,  \);
            optionsDiv.appendChild(label);
        });
        questionBlock.append(p, optionsDiv);
        dom.quizContainer.appendChild(questionBlock);
    });
}

export function handleSubmitQuiz() {
    const dom = getQuizDomElements();
    const currentQuizData = getCurrentQuizData();
    if (!currentQuizData || !dom.quizResults) return;

    let score = 0;
    let allAnswered = true;
    currentQuizData.questions.forEach((q, i) => {
        const checked = document.querySelector(input[name="q-\"]:checked);
        if (checked) {
            if (checked.value === q.a) {
                score++;
            }
        } else {
            allAnswered = false;
        }
    });

    if (!allAnswered) {
        dom.quizResults.textContent = "모든 문제에 답해주세요!";
        dom.quizResults.style.color = "orange";
        return;
    }
    
    dom.quizResults.textContent = 결과: \개 중 \개 정답!;
    dom.quizResults.style.color = (score === currentQuizData.questions.length) ? "lightgreen" : "lightcoral";
}
