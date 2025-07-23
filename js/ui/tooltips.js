// js/ui/tooltips.js
// 키워드 칩 툴팁, 인라인 툴팁, 텍스트 선택 팝오버를 관리합니다.

import * as DOM from '../utils/domElements.js';
import * as State from '../core/state.js';
// Note: handlePopoverAddNote requires addNote from notes.js. This will be handled in main.js.

/**
 * 툴팁 및 팝오버 관련 이벤트 리스너를 설정합니다.
 * @param {object} callbacks - 다른 모듈의 콜백 함수들 { handlePopoverAddNote }
 */
export function initializeTooltipsAndPopovers(callbacks) {
    document.addEventListener('click', (e) => {
        handleTextSelection(e);
        if (!e.target.closest('.session-context-menu, .project-context-menu')) {
             const { removeContextMenu } = callbacks;
             if(removeContextMenu) removeContextMenu();
        }
    });
    
    if (DOM.popoverAskAi) DOM.popoverAskAi.addEventListener('click', handlePopoverAskAi);
    if (DOM.popoverAddNote) DOM.popoverAddNote.addEventListener('click', callbacks.handlePopoverAddNote);

    setupInitialTooltips();
}

/**
 * 페이지 로드 시 정적으로 존재하는 툴팁들을 초기화합니다.
 */
function setupInitialTooltips() {
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

/**
 * 텍스트 선택 이벤트를 처리하고 팝오버를 표시합니다.
 * @param {MouseEvent} e - 마우스 이벤트 객체
 */
function handleTextSelection(e) {
    // 패널 내부에서는 팝오버가 뜨지 않도록 처리
    if (e.target.closest('.draggable-panel, #selection-popover, .fixed-tool-container, #system-info-widget, .project-context-menu, .session-context-menu')) return;
    
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length > 3) {
        State.setLastSelectedText(selectedText);
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const popover = DOM.selectionPopover;
        
        let top = rect.top + window.scrollY - popover.offsetHeight - 10;
        let left = rect.left + window.scrollX + (rect.width / 2) - (popover.offsetWidth / 2);
        
        // 팝오버가 화면 상단을 벗어나지 않도록 처리
        if (top < window.scrollY) {
            top = rect.bottom + window.scrollY + 10;
        }
        
        // 팝오버가 화면 좌우를 벗어나지 않도록 처리
        left = Math.max(5, Math.min(left, window.innerWidth - popover.offsetWidth - 5));
        
        popover.style.top = ${top}px;
        popover.style.left = ${left}px;
        popover.style.display = 'flex';

    } else if (!e.target.closest('#selection-popover')) {
        DOM.selectionPopover.style.display = 'none';
    }
}

/**
 * 'AI에게 질문' 팝오버 버튼 클릭을 처리합니다.
 */
function handlePopoverAskAi() {
    if (!State.lastSelectedText || !DOM.chatInput) return;
    
    // chat.js의 handleNewChat을 직접 호출하는 대신, 이벤트를 통해 요청하거나 main에서 처리해야 함.
    // 여기서는 간단하게 구현
    const { togglePanel } = await import('./panels.js').then(m => m);
    const { handleNewChat } = await import('./chat/main.js').then(m => m);

    togglePanel(DOM.chatPanel, true);
    handleNewChat();
    
    setTimeout(() => {
        DOM.chatInput.value = ""\n\n이 내용에 대해 더 자세히 설명해줄래?;
        DOM.chatInput.style.height = (DOM.chatInput.scrollHeight) + 'px';
        DOM.chatInput.focus();
    }, 100);
    
    DOM.selectionPopover.style.display = 'none';
}
