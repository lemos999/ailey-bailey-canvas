import { state, setState } from '../../core/state.js';
import { dom } from '../../ui/dom.js';
import { showModal } from '../../core/utils.js';

async function startQuiz() {
    if (!dom.quizModalOverlay) return;
    const keywords = Array.from(document.querySelectorAll('.keyword-chip')).map(c => c.textContent.trim()).join(', ');
    if (!keywords) {
        showModal("퀴즈를 생성할 핵심 키워드가 없습니다.", ()=>{});
        return;
    }
    if (dom.quizContainer) dom.quizContainer.innerHTML = '<div>퀴즈 생성 중...</div>';
    if (dom.quizResults) dom.quizResults.innerHTML = '';
    dom.quizModalOverlay.style.display = 'flex';

    try {
        // This is a placeholder for an actual API call.
        // In a real scenario, you would fetch from your AI service.
        const mockResponse = {
            "questions": [
                {
                    "q": '' 중 한 가지 개념과 관련된 질문입니다.,
                    "o": ["선택지 1", "선택지 2", "정답", "선택지 4"],
                    "a": "정답"
                }
            ]
        };
        await new Promise(r => setTimeout(r, 500)); // Simulate network delay
        setState('currentQuizData', mockResponse);
        renderQuiz(state.currentQuizData);
    } catch (e) {
        if(dom.quizContainer) dom.quizContainer.innerHTML = '퀴즈 생성에 실패했습니다.';
        console.error("Quiz generation failed:", e);
    }
}

function renderQuiz(data) {
    if (!dom.quizContainer || !data || !data.questions) return;
    dom.quizContainer.innerHTML = '';
    data.questions.forEach((q, i) => {
        const questionBlock = document.createElement('div');
        questionBlock.className = 'quiz-question-block';
        
        const questionText = document.createElement('p');
        questionText.textContent = ${i + 1}. ;
        
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
        
        questionBlock.append(questionText, optionsDiv);
        dom.quizContainer.appendChild(questionBlock);
    });
}

function handleSubmitQuiz() {
    if (!state.currentQuizData || !dom.quizResults) return;
    let score = 0;
    const totalQuestions = state.currentQuizData.questions.length;

    if (state.currentQuizData.questions.some((q, i) => !document.querySelector(input[name="q-"]:checked))) {
        dom.quizResults.textContent = "모든 문제에 답해주세요!";
        return;
    }

    state.currentQuizData.questions.forEach((q, i) => {
        const userAnswer = document.querySelector(input[name="q-"]:checked).value;
        if (userAnswer === q.a) {
            score++;
        }
    });

    dom.quizResults.textContent = 결과: 개 중 개 정답!;
}

export function initializeQuiz() {
    if (dom.startQuizBtn) dom.startQuizBtn.addEventListener('click', startQuiz);
    if (dom.quizSubmitBtn) dom.quizSubmitBtn.addEventListener('click', handleSubmitQuiz);
    if (dom.quizModalOverlay) {
        dom.quizModalOverlay.addEventListener('click', e => {
            if (e.target === dom.quizModalOverlay) {
                dom.quizModalOverlay.style.display = 'none';
            }
        });
    }
}
