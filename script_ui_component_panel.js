/*
--- Ailey & Bailey Canvas ---
File: script_ui_component_panel.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 4: UI] 모든 드래그 가능한 패널(Panel)의 생성 및 드래그 기능을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const PanelComponent = {
        makeDraggable(panelElement) {
            if(!panelElement) return;
            const header = panelElement.querySelector('.panel-header');
            if(!header) return;

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
                // 버튼, 입력 필드 등 상호작용 요소를 클릭했을 때는 드래그를 시작하지 않습니다.
                if (e.target.closest('button, input, select, a, .close-btn')) return;
                isDragging = true;
                panelElement.classList.add('is-dragging');
                offset = { x: panelElement.offsetLeft - e.clientX, y: panelElement.offsetTop - e.clientY };
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        },

        toggle(panelElement, forceShow = null) {
            if (!panelElement) return;
            const show = forceShow !== null ? forceShow : panelElement.style.display !== 'flex';
            panelElement.style.display = show ? 'flex' : 'none';
        }
    };

    window.UI = window.UI || {};
    window.UI.Panel = PanelComponent;

})(window);