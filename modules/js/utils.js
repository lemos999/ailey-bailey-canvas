/* Module: Utility Functions */
import * as ui from './_uiElements.js';

export function makePanelDraggable(panelElement) {
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
        if (e.target.closest('button, input, select, .close-btn, #delete-session-btn, #chat-mode-selector, #api-settings-btn')) return;
        isDragging = true;
        panelElement.classList.add('is-dragging');
        offset = { x: panelElement.offsetLeft - e.clientX, y: panelElement.offsetTop - e.clientY };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

export function togglePanel(panelElement, forceShow = null) {
    if (!panelElement) return;
    const show = forceShow !== null ? forceShow : panelElement.style.display !== 'flex';
    panelElement.style.display = show ? 'flex' : 'none';
}

export function showModal(message, onConfirm) {
    if (!ui.customModal || !ui.modalMessage || !ui.modalConfirmBtn || !ui.modalCancelBtn) return;
    ui.modalMessage.textContent = message;
    ui.customModal.style.display = 'flex';
    ui.modalConfirmBtn.onclick = () => {
        onConfirm();
        ui.customModal.style.display = 'none';
    };
    ui.modalCancelBtn.onclick = () => {
        ui.customModal.style.display = 'none';
    };
}

export function updateStatus(msg, success) {
    if (!ui.autoSaveStatus) return;
    ui.autoSaveStatus.textContent = msg;
    ui.autoSaveStatus.style.color = success ? 'lightgreen' : 'lightcoral';
    setTimeout(() => {
        if (ui.autoSaveStatus) ui.autoSaveStatus.textContent = '';
    }, 3000);
}

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