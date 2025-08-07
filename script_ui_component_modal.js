/*
--- Ailey & Bailey Canvas ---
File: script_ui_component_modal.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 4: UI] 모든 종류의 모달(Modal) UI 생성 및 제어를 책임집니다.
---
*/

(function(window) {
    'use strict';

    const ModalComponent = {
        show(message, onConfirm) {
            if (!customModal || !modalMessage || !modalConfirmBtn || !modalCancelBtn) return;
            modalMessage.textContent = message;
            customModal.style.display = 'flex';

            // 기존 이벤트 리스너를 제거하여 중복 실행을 방지합니다.
            const newConfirmBtn = modalConfirmBtn.cloneNode(true);
            modalConfirmBtn.parentNode.replaceChild(newConfirmBtn, modalConfirmBtn);
            modalConfirmBtn = newConfirmBtn;

            const newCancelBtn = modalCancelBtn.cloneNode(true);
            modalCancelBtn.parentNode.replaceChild(newCancelBtn, modalCancelBtn);
            modalCancelBtn = newCancelBtn;

            modalConfirmBtn.addEventListener('click', () => {
                onConfirm();
                this.hide();
            });

            modalCancelBtn.addEventListener('click', () => {
                this.hide();
            });
        },

        hide() {
            if (customModal) customModal.style.display = 'none';
        }
    };

    window.UI = window.UI || {};
    window.UI.Modal = ModalComponent;

})(window);