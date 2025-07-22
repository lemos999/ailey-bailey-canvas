/* js/_utils.js */
import * as state from './_state.js';

export function getRelativeDateGroup(timestamp, isPinned = false) {
    if (isPinned) {
        return { key: 0, label: '📌 고정됨' };
    }

    if (!timestamp) {
        return { key: 99, label: '날짜 정보 없음' };
    }

    const now = new Date();
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    
    now.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const diffTime = now.getTime() - date.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays < 1) return { key: 1, label: '오늘' };
    if (diffDays < 2) return { key: 2, label: '어제' };
    if (diffDays < 7) return { key: 3, label: '지난 7일' };

    const nowMonth = now.getMonth();
    const dateMonth = date.getMonth();
    const nowYear = now.getFullYear();
    const dateYear = date.getFullYear();

    if (nowYear === dateYear && nowMonth === dateMonth) {
        return { key: 4, label: '이번 달' };
    }

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    if (dateYear === lastMonth.getFullYear() && dateMonth === lastMonth.getMonth()) {
         return { key: 5, label: '지난 달' };
    }

    return { key: 6 + (nowYear - dateYear) * 12 + (nowMonth - dateMonth), label: `${dateYear}년 ${dateMonth + 1}월` };
}

export function updateClock() { 
    const clockElement = document.getElementById('real-time-clock'); 
    if (!clockElement) return; 
    const now = new Date(); 
    const options = { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }; 
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
    modalConfirmBtn.onclick = () => { onConfirm(); customModal.style.display = 'none'; }; 
    modalCancelBtn.onclick = () => { customModal.style.display = 'none'; }; 
}

export function updateStatus(msg, success) { 
    const autoSaveStatus = document.getElementById('auto-save-status');
    if (!autoSaveStatus) return; 
    autoSaveStatus.textContent = msg; 
    autoSaveStatus.style.color = success ? 'lightgreen' : 'lightcoral'; 
    setTimeout(() => { autoSaveStatus.textContent = ''; }, 3000); 
}

export function detectProvider(key) {
    if (key.startsWith('sk-ant-api')) return 'anthropic';
    if (key.startsWith('sk-')) return 'openai';
    if (key.length > 35 && key.startsWith('AIza')) return 'google_paid';
    return null;
}
