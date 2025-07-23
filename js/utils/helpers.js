/*
--- Ailey & Bailey Canvas ---
File: js/utils/helpers.js
Version: 11.1 (Modular Hotfix)
Description: Contains pure, reusable utility functions with no side effects.
*/
export function updateClock() {
    const clockElement = document.getElementById('real-time-clock');
    if (!clockElement) return;
    const now = new Date();
    const options = {
        timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric',
        weekday: 'long', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
    };
    clockElement.textContent = now.toLocaleString('ko-KR', options);
}

export function showModal(message, onConfirm) {
    const customModal = document.getElementById('custom-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    if (!customModal || !modalMessage || !modalConfirmBtn || !modalCancelBtn) return;
    modalMessage.textContent = message;
    customModal.style.display = 'flex';
    const newConfirmBtn = modalConfirmBtn.cloneNode(true);
    modalConfirmBtn.parentNode.replaceChild(newConfirmBtn, modalConfirmBtn);
    newConfirmBtn.addEventListener('click', () => {
        onConfirm();
        customModal.style.display = 'none';
    });
    modalCancelBtn.onclick = () => { customModal.style.display = 'none'; };
}

export function updateStatus(msg, success) {
    const autoSaveStatus = document.getElementById('auto-save-status');
    if (!autoSaveStatus) return;
    autoSaveStatus.textContent = msg;
    autoSaveStatus.style.color = success ? 'lightgreen' : 'lightcoral';
    setTimeout(() => { autoSaveStatus.textContent = ''; }, 3000);
}
