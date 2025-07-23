/* --- Module: Main Content Interactions --- */
import * as dom from 'https://lemos999.github.io/ailey-bailey-canvas/modules/dom.js';
import { 
    setLastSelectedText, 
    setCurrentQuizData,
    getCurrentQuizData 
} from 'https://lemos999.github.io/ailey-bailey-canvas/modules/state.js';
import { showModal } from 'https://lemos999.github.io/ailey-bailey-canvas/modules/ui.js';

// 순환 종속성 회피를 위해 main script.js에서 함수를 받아와 사용합니다.
let popoverAskAiHandler;
let popoverAddNoteHandler;

export function setPopoverHandlers(askAiHandler, addNoteHandler) {
    popoverAskAiHandler = askAiHandler;
    popoverAddNoteHandler = addNoteHandler;
}

export function setupNavigator() {
    if (!dom.scrollNav || !dom.learningContent) return;
    const headers = dom.learningContent.querySelectorAll('h2, #section-4 h3, #section-5 h3, #section-6 h3');
    if (headers.length === 0) {
        dom.scrollNav.style.display = 'none';
        if(dom.wrapper) dom.wrapper.classList.add('toc-hidden');
        return;
    }
    dom.scrollNav.style.display = 'block';
    if(dom.wrapper) dom.wrapper.classList.remove('toc-hidden');
    const navList = document.createElement('ul');
    headers.forEach((header, index) => {
        let targetElement = header.closest('.content-section');
        if (targetElement && !targetElement.id) targetElement.id = 
av-target-\;
        if (targetElement) {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            let navText = header.textContent.trim().replace(/\[|\]|??|?|??/g, '').trim();
            link.textContent = navText.substring(0, 25);
            link.href = #\;
            if (header.tagName === 'H3') {
                link.style.paddingLeft = '25px';
                link.style.fontSize = '0.9em';
            }
            listItem.appendChild(link);
            navList.appendChild(listItem);
        }
    });
    dom.scrollNav.innerHTML = '<h3>학습 내비게이션</h3>';
    dom.scrollNav.appendChild(navList);

    const links = dom.scrollNav.querySelectorAll('a');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const id = entry.target.getAttribute('id');
            const navLink = dom.scrollNav.querySelector([href="#\"]);
            if (navLink && entry.isIntersecting && entry.intersectionRatio > 0.5) {
                links.forEach(l => l.classList.remove('active'));
                navLink.classList.add('active');
            }
        });
    }, { rootMargin: "0px 0px -70% 0px", threshold: 0.6 });

    headers.forEach(header => {
        const target = header.closest('.content-section');
        if (target) observer.observe(target);
    });
}

export function initializeTooltips() {
    document.querySelectorAll('.keyword-chip[data-tooltip]').forEach(chip => {
        if (chip.querySelector('.tooltip')) {
            chip.classList.add('has-tooltip');
            chip.querySelector('.tooltip').textContent = chip.dataset.tooltip;
        }
    });
    document.querySelectorAll('.content-section strong[data-tooltip]').forEach(highlight => {
        if (!highlight.querySelector('.tooltip')) {
            highlight.classList.add('has-tooltip');
            const tooltipElement = document.createElement('span');
            tooltipElement.className = 'tooltip';
            tooltipElement.textContent = highlight.dataset.tooltip;
            highlight.appendChild(tooltipElement);
        }
    });
}

export function handleTextSelection(e) {
    if (e.target.closest('.draggable-panel, #selection-popover, .fixed-tool-container, #system-info-widget, .project-context-menu, .session-context-menu')) return;
    
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 3) {
        setLastSelectedText(selectedText);
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const popover = dom.selectionPopover;

        let top = rect.top + window.scrollY - popover.offsetHeight - 10;
        let left = rect.left + window.scrollX + (rect.width / 2) - (popover.offsetWidth / 2);

        if (top < window.scrollY) {
            top = rect.bottom + window.scrollY + 10;
        }
        
        left = Math.max(5, Math.min(left, window.innerWidth - popover.offsetWidth - 5));

        popover.style.top = \px;
        popover.style.left = \px;
        popover.style.display = 'flex';
    } else if (!e.target.closest('#selection-popover')) {
        dom.selectionPopover.style.display = 'none';
    }
}

export async function startQuiz() {
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

export function renderQuiz(data) {
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
