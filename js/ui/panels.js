// js/ui/panels.js
// 드래그 가능한 패널, 고정 툴바 등 전반적인 패널 동작을 관리합니다.

import * as DOM from '../utils/domElements.js';

/**
 * 패널 관련 이벤트 리스너를 설정합니다.
 */
export function initializePanels() {
    if (DOM.chatPanel) makePanelDraggable(DOM.chatPanel);
    if (DOM.notesAppPanel) makePanelDraggable(DOM.notesAppPanel);

    if (DOM.chatToggleBtn) DOM.chatToggleBtn.addEventListener('click', () => togglePanel(DOM.chatPanel));
    if (DOM.chatPanel) DOM.chatPanel.querySelector('.close-btn')?.addEventListener('click', () => togglePanel(DOM.chatPanel, false));
    
    if (DOM.notesAppToggleBtn) {
        DOM.notesAppToggleBtn.addEventListener('click', () => {
            togglePanel(DOM.notesAppPanel);
            // 패널이 열릴 때 노트 목록을 렌더링하도록 강제
            if(DOM.notesAppPanel.style.display === 'flex') {
                const renderNoteList = await import('./notes.js').then(m => m.renderNoteList);
                renderNoteList();
            }
        });
    }
}

/**
 * 특정 패널을 드래그 가능하게 만듭니다.
 * @param {HTMLElement} panelElement - 드래그 가능하게 만들 패널 요소
 */
function makePanelDraggable(panelElement) {
    if (!panelElement) return;
    const header = panelElement.querySelector('.panel-header');
    if (!header) return;

    let isDragging = false, offset = { x: 0, y: 0 };

    const onMouseMove = (e) => {
        if (isDragging) {
            panelElement.style.left = (e.clientX + offset.x) + 'px';
            panelElement.style.top = (e.clientY + offset.y) + 'px';
        }
    };
    
    const onMouseUp = () => {
        isDragging = false;
        panelElement.classList.remove('is-dragging');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    header.addEventListener('mousedown', e => {
        // 버튼이나 입력 요소 클릭 시 드래그 방지
        if (e.target.closest('button, input, select, .close-btn, #delete-session-btn, #chat-mode-selector, #api-settings-btn')) return;
        
        isDragging = true;
        panelElement.classList.add('is-dragging');
        offset = {
            x: panelElement.offsetLeft - e.clientX,
            y: panelElement.offsetTop - e.clientY
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

/**
 * 패널의 표시 상태를 토글합니다.
 * @param {HTMLElement} panelElement - 토글할 패널 요소
 * @param {boolean | null} forceShow - 강제로 표시/숨김 여부
 */
function togglePanel(panelElement, forceShow = null) {
    if (!panelElement) return;
    const show = forceShow !== null ? forceShow : panelElement.style.display !== 'flex';
    panelElement.style.display = show ? 'flex' : 'none';
}
