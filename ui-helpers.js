/*
--- Ailey & Bailey Canvas ---
File: ui-helpers.js
Version: 11.0 (JS Module Structure)
Architect: [Username] & System Architect CodeMaster
Description: A collection of helper functions for manipulating the UI, independent of specific feature logic (e.g., modals, panels, tooltips).
*/

import { state } from './state.js';

export function updateClock() {
    const clockElement = document.getElementById('real-time-clock');
    if (!clockElement) return;
    const now = new Date();
    const options = { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
    clockElement.textContent = now.toLocaleString('ko-KR', options);
}

export function setupSystemInfoWidget(currentUser) {
    const systemInfoWidget = document.getElementById('system-info-widget');
    if (!systemInfoWidget || !currentUser) return;

    const canvasId = document.querySelector('meta[name="canvas-id"]')?.content || 'global_fallback_id';
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
    systemInfoWidget.appendChild(tooltip);
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

export function makePanelDraggable(panelElement) {
    if (!panelElement) return;
    const header = panelElement.querySelector('.panel-header');
    if (!header) return;

    let isDragging = false,
        offset = { x: 0, y: 0 };

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
        // Prevent dragging from interactive elements inside the header
        if (e.target.closest('button, input, select, .close-btn, #delete-session-btn, #chat-mode-selector, #api-settings-btn')) {
            return;
        }
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

export function togglePanel(panelElement, forceShow = null) {
    if (!panelElement) return;
    const show = forceShow !== null ? forceShow : panelElement.style.display !== 'flex';
    panelElement.style.display = show ? 'flex' : 'none';
}

export function setupNavigator() {
    const scrollNav = document.getElementById('scroll-nav');
    const learningContent = document.getElementById('learning-content');
    const wrapper = document.querySelector('.wrapper');

    if (!scrollNav || !learningContent || !wrapper) return;

    const headers = learningContent.querySelectorAll('h2, #section-4 h3, #section-5 h3, #section-6 h3');
    if (headers.length === 0) {
        scrollNav.style.display = 'none';
        wrapper.classList.add('toc-hidden');
        return;
    }

    scrollNav.style.display = 'block';
    wrapper.classList.remove('toc-hidden');

    const navList = document.createElement('ul');
    headers.forEach((header, index) => {
        let targetElement = header.closest('.content-section');
        if (targetElement && !targetElement.id) {
            targetElement.id = `nav-target-${index}`;
        }
        if (targetElement) {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            let navText = header.textContent.trim().replace(/\[|\]|🤓|⏳|📖/g, '').trim();
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

export function handleTextSelection(e) {
    // Prevent selection popover from appearing when interacting with UI elements
    if (e.target.closest('.draggable-panel, #selection-popover, .fixed-tool-container, #system-info-widget, .project-context-menu, .session-context-menu')) {
        return;
    }

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    const selectionPopover = document.getElementById('selection-popover');
    if (!selectionPopover) return;

    if (state.currentOpenContextMenu) {
        state.currentOpenContextMenu.remove();
        state.currentOpenContextMenu = null;
    }

    if (selectedText.length > 3) {
        state.lastSelectedText = selectedText;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        let top = rect.top + window.scrollY - selectionPopover.offsetHeight - 10;
        let left = rect.left + window.scrollX + (rect.width / 2) - (selectionPopover.offsetWidth / 2);

        // Adjust position if it goes off-screen
        if (top < window.scrollY) {
            top = rect.bottom + window.scrollY + 10;
        }
        left = Math.max(5, Math.min(left, window.innerWidth - selectionPopover.offsetWidth - 5));

        selectionPopover.style.top = `${top}px`;
        selectionPopover.style.left = `${left}px`;
        selectionPopover.style.display = 'flex';
    } else if (!e.target.closest('#selection-popover')) {
        selectionPopover.style.display = 'none';
    }
}

export function showModal(message, onConfirm) {
    const customModal = document.getElementById('custom-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');

    if (!customModal || !modalMessage || !modalConfirmBtn || !modalCancelBtn) return;
    
    modalMessage.textContent = message;
    customModal.style.display = 'flex';
    
    // To prevent multiple listeners, we clone and replace the button
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