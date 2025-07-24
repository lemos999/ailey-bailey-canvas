/* Module: Base UI Setup and Global Event Listeners */
import * as ui from './_uiElements.js';
import * as state from './_state.js';
import { togglePanel, showModal } from './_utils.js';
import { renderNoteList } from './_notesManager.js';
import { handleNewChat } from './chat/_chatUI.js';
import { createNewProject, handleSystemReset, exportAllData, handleRestoreClick } from './chat/_chatData.js';
import { openPromptModal } from './chat/_chatManager.js';

export function initializeBaseUI() {
    if (!ui.body || !ui.wrapper) {
        console.error("Core layout elements not found.");
        return;
    }
    updateClock();
    setInterval(updateClock, 1000);
    initializeTooltips();
    setupNavigator();
    makePanelDraggable(ui.chatPanel);
    makePanelDraggable(ui.notesAppPanel);
}

export function setupGlobalEventListeners() {
    document.addEventListener('click', (e) => {
        handleTextSelection(e);
        const { currentOpenContextMenu } = state;
        const { setCurrentOpenContextMenu } = require('./state.js'); // Dynamic import for setter
        if (!e.target.closest('.session-context-menu, .project-context-menu')) {
            currentOpenContextMenu?.remove();
            setCurrentOpenContextMenu(null);
        }
    });

    if (ui.themeToggle) {
        ui.themeToggle.addEventListener('click', () => {
            ui.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', ui.body.classList.contains('dark-mode') ? 'dark' : 'light');
        });
        if(localStorage.getItem('theme') === 'dark') {
            ui.body.classList.add('dark-mode');
        }
    }

    if (ui.tocToggleBtn) {
        ui.tocToggleBtn.addEventListener('click', () => {
            ui.wrapper.classList.toggle('toc-hidden');
            ui.systemInfoWidget?.classList.toggle('tucked');
        });
    }

    // Panel Toggles
    if (ui.chatToggleBtn) ui.chatToggleBtn.addEventListener('click', () => togglePanel(ui.chatPanel));
    if (ui.chatPanel) ui.chatPanel.querySelector('.close-btn').addEventListener('click', () => togglePanel(ui.chatPanel, false));
    if (ui.notesAppToggleBtn) {
        ui.notesAppToggleBtn.addEventListener('click', () => {
            togglePanel(ui.notesAppPanel);
            if(ui.notesAppPanel.style.display === 'flex') renderNoteList();
        });
    }

    // Popover Buttons
    if (ui.popoverAskAi) ui.popoverAskAi.addEventListener('click', handlePopoverAskAi);
    if (ui.popoverAddNote) ui.popoverAddNote.addEventListener('click', handlePopoverAddNote);
    
    // Quiz Buttons
    if (ui.startQuizBtn) ui.startQuizBtn.addEventListener('click', startQuiz);
    if (ui.quizSubmitBtn) ui.quizSubmitBtn.addEventListener('click', handleQuizSubmit);
    if (ui.quizModalOverlay) ui.quizModalOverlay.addEventListener('click', e => { if (e.target === ui.quizModalOverlay) ui.quizModalOverlay.style.display = 'none'; });

    // Backup & Restore
    if (ui.exportNotesBtn) ui.exportNotesBtn.addEventListener('click', exportAllData);
    if (ui.restoreDataBtn) ui.restoreDataBtn.addEventListener('click', handleRestoreClick);
    if (ui.fileImporter) ui.fileImporter.addEventListener('change', (event) => {
        const { importAllData } = require('./chat/_chatData.js');
        importAllData(event);
    });
    if (ui.systemResetBtn) ui.systemResetBtn.addEventListener('click', handleSystemReset);

}

function updateClock() {
    const clockElement = document.getElementById('real-time-clock');
    if (!clockElement) return;
    const now = new Date();
    const options = { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
    clockElement.textContent = now.toLocaleString('ko-KR', options);
}

export function setupSystemInfoWidget(canvasId, currentUser) {
    if (!ui.systemInfoWidget || !currentUser) return;
    const canvasIdDisplay = document.getElementById('canvas-id-display');
    if (canvasIdDisplay) {
        canvasIdDisplay.textContent = canvasId.substring(0, 8) + '...';
    }
    const copyBtn = document.getElementById('copy-canvas-id');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(canvasId).then(() => {
                copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" /></svg>';
                setTimeout(() => {
                    copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" /></svg>';
                }, 1500);
            });
        });
    }
    const tooltip = document.createElement('div');
    tooltip.className = 'system-tooltip';
    tooltip.innerHTML = `<div><strong>Canvas ID:</strong> ${canvasId}</div><div><strong>User ID:</strong> ${currentUser.uid}</div>`;
    ui.systemInfoWidget.appendChild(tooltip);
}

function initializeTooltips() {
    document.querySelectorAll('.keyword-chip[data-tooltip]').forEach(chip => {
        if (chip.querySelector('.tooltip')) {
            chip.classList.add('has-tooltip');
            chip.querySelector('.tooltip').textContent = chip.dataset.tooltip;
        }
    });
    document.querySelectorAll('.content-section strong[data-tooltip]').forEach(highlight => {
        if(!highlight.querySelector('.tooltip')) {
            highlight.classList.add('has-tooltip');
            const tooltipElement = document.createElement('span');
            tooltipElement.className = 'tooltip';
            tooltipElement.textContent = highlight.dataset.tooltip;
            highlight.appendChild(tooltipElement);
        }
    });
}

function setupNavigator() {
    const scrollNav = document.getElementById('scroll-nav');
    if (!scrollNav || !ui.learningContent) return;
    const headers = ui.learningContent.querySelectorAll('h2, #section-4 h3, #section-5 h3, #section-6 h3');
    if (headers.length === 0) {
        scrollNav.style.display = 'none';
        if(ui.wrapper) ui.wrapper.classList.add('toc-hidden');
        return;
    }
    scrollNav.style.display = 'block';
    if(ui.wrapper) ui.wrapper.classList.remove('toc-hidden');
    const navList = document.createElement('ul');
    headers.forEach((header, index) => {
        let targetElement = header.closest('.content-section');
        if (targetElement && !targetElement.id) targetElement.id = `nav-target-${index}`;
        if (targetElement) {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            let navText = header.textContent.trim().replace(/[\[\]🤓⏳📖]/g, '').trim();
            link.textContent = navText.substring(0, 25);
            link.href = `#${targetElement.id}`;
            if (header.tagName === 'H3') {
                link.style.paddingLeft = '25px';
                link.style.fontSize = '0.9em';
            }
            listItem.appendChild(link);
            navList.appendChild(listItem);
        }
    });
    scrollNav.innerHTML = '<h3>학습 내비게이션</h3>';
    scrollNav.appendChild(navList);
    const links = scrollNav.querySelectorAll('a');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const id = entry.target.getAttribute('id');
            const navLink = scrollNav.querySelector(`a[href="#${id}"]`);
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

function handleTextSelection(e) {
    if (e.target.closest('.draggable-panel, #selection-popover, .fixed-tool-container, #system-info-widget, .project-context-menu, .session-context-menu')) return;
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (state.currentOpenContextMenu) state.currentOpenContextMenu.remove();
    state.setCurrentOpenContextMenu(null);

    if (selectedText.length > 3) {
        state.setLastSelectedText(selectedText);
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const popover = ui.selectionPopover;
        let top = rect.top + window.scrollY - popover.offsetHeight - 10;
        let left = rect.left + window.scrollX + (rect.width / 2) - (popover.offsetWidth / 2);
        popover.style.top = `${top < window.scrollY ? rect.bottom + window.scrollY + 10 : top}px`;
        popover.style.left = `${Math.max(5, Math.min(left, window.innerWidth - popover.offsetWidth - 5))}px`;
        popover.style.display = 'flex';
    } else if (!e.target.closest('#selection-popover')) {
        ui.selectionPopover.style.display = 'none';
    }
}

function handlePopoverAskAi() {
    if (!state.lastSelectedText || !ui.chatInput) return;
    togglePanel(ui.chatPanel, true);
    handleNewChat();
    setTimeout(() => {
        ui.chatInput.value = `"${state.lastSelectedText}"\n\n이 내용에 대해 더 자세히 설명해줄래?`;
        ui.chatInput.style.height = (ui.chatInput.scrollHeight) + 'px';
        ui.chatInput.focus();
    }, 100);
    ui.selectionPopover.style.display = 'none';
}

function handlePopoverAddNote() {
    if (!state.lastSelectedText) return;
    const { addNote } = require('./notesManager.js');
    addNote(`> ${state.lastSelectedText}\n\n`);
    ui.selectionPopover.style.display = 'none';
}

async function startQuiz() {
    if (!ui.quizModalOverlay) return;
    const keywords = Array.from(document.querySelectorAll('.keyword-chip')).map(c => c.textContent.trim()).join(', ');
    if (!keywords) {
        showModal("퀴즈를 생성할 키워드가 없습니다.", ()=>{});
        return;
    }
    if (ui.quizContainer) ui.quizContainer.innerHTML = '<div class="loading-indicator">퀴즈 생성 중...</div>';
    if (ui.quizResults) ui.quizResults.innerHTML = '';
    ui.quizModalOverlay.style.display = 'flex';
    try {
        // This should be an actual API call in a real scenario
        const mockResponse = await new Promise(resolve => setTimeout(() => resolve(JSON.stringify({ "questions": [{"q":"(예시) 이 기능의 주요 목적은 무엇입니까?","o":["코드 단축","모듈화","디자인 변경","데이터베이스 교체"],"a":"모듈화"}]})), 500));
        const { setCurrentQuizData } = require('./state.js');
        const data = JSON.parse(mockResponse);
        setCurrentQuizData(data);
        renderQuiz(data);
    } catch (e) {
        if(ui.quizContainer) ui.quizContainer.innerHTML = '퀴즈 생성에 실패했습니다.';
    }
}

function renderQuiz(data) {
    if (!ui.quizContainer || !data.questions) return;
    ui.quizContainer.innerHTML = '';
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
        ui.quizContainer.appendChild(block);
    });
}

function handleQuizSubmit() {
    if (!state.currentQuizData || !ui.quizResults) return;
    let score = 0;
    if (state.currentQuizData.questions.some((q, i) => !document.querySelector(`input[name="q-${i}"]:checked`))) {
        ui.quizResults.textContent = "모든 문제에 답해주세요!";
        return;
    }
    state.currentQuizData.questions.forEach((q, i) => {
        if(document.querySelector(`input[name="q-${i}"]:checked`).value === q.a) score++;
    });
    ui.quizResults.textContent = `결과: ${state.currentQuizData.questions.length} 중 ${score} 정답!`;
}