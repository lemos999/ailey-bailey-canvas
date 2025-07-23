/*
--- Ailey & Bailey Canvas ---
File: js/utils/helpers.js
Version: 11.0 (Modular)
Description: Contains pure, reusable utility functions with no side effects.
*/

/**
 * Updates the real-time clock element with the current time in Seoul.
 */
export function updateClock() {
    const clockElement = document.getElementById('real-time-clock');
    if (!clockElement) return;
    const now = new Date();
    const options = {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    clockElement.textContent = now.toLocaleString('ko-KR', options);
}

/**
 * Shows a custom modal with a message and a confirmation callback.
 * @param {string} message - The message to display in the modal.
 * @param {Function} onConfirm - The function to execute when the confirm button is clicked.
 */
export function showModal(message, onConfirm) {
    const customModal = document.getElementById('custom-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    
    if (!customModal || !modalMessage || !modalConfirmBtn || !modalCancelBtn) return;
    
    modalMessage.textContent = message;
    customModal.style.display = 'flex';
    
    // Clone and replace to remove previous listeners
    const newConfirmBtn = modalConfirmBtn.cloneNode(true);
    modalConfirmBtn.parentNode.replaceChild(newConfirmBtn, modalConfirmBtn);
    
    newConfirmBtn.addEventListener('click', () => {
        onConfirm();
        customModal.style.display = 'none';
    });
    
    modalCancelBtn.onclick = () => {
        customModal.style.display = 'none';
    };
}

/**
 * Displays a temporary status message, typically for save operations.
 * @param {string} msg - The message to display.
 * @param {boolean} success - Determines the color of the message.
 */
export function updateStatus(msg, success) {
    const autoSaveStatus = document.getElementById('auto-save-status');
    if (!autoSaveStatus) return;
    autoSaveStatus.textContent = msg;
    autoSaveStatus.style.color = success ? 'lightgreen' : 'lightcoral';
    setTimeout(() => {
        autoSaveStatus.textContent = '';
    }, 3000);
}
