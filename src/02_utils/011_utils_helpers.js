
/* --- Ailey & Bailey Canvas --- */
// File: 011_utils_helpers.js
// Version: 6.1 (Enhanced Panel Interactions)
// Description: Implemented 'Header Peeking' to prevent panels from being dragged off-screen and added a 'double-click to reset' feature on resize handles.

function trace(source, eventName, details = {}, context = {}, stateSnapshot = {}, level = 'INFO') {
    if (!debuggerContent) return;

    const timestamp = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + `.${String(new Date().getMilliseconds()).padStart(3, '0')}`;
    const entry = document.createElement('div');
    entry.className = `trace-log-entry trace-level-${level}`;

    let contextHtml = '';
    if (context.sessionId) {
        contextHtml += `(sid:${context.sessionId.substring(0, 5)})`;
    }
     if (context.msgId) {
        contextHtml += `(mid:${String(context.msgId).substring(0, 10)})`;
    }

    let html = `<span class="trace-timestamp">[${timestamp}]</span>`;
    html += `<span class="trace-source trace-source-${source}">[${source}]</span>`;
    if(contextHtml) html += `<span class="trace-context">${contextHtml}</span>`;
    html += `<span class="trace-eventName">${eventName}</span>`;

    const detailsHtml = Object.entries(details).map(([key, value]) => ` | <span class="trace-details">${key}=${value}</span>`).join('');
    html += detailsHtml;

    const snapshotHtml = Object.entries(stateSnapshot).map(([key, value]) => {
        let formattedValue;
        if (value instanceof firebase.firestore.Timestamp) {
            formattedValue = value.toDate().toISOString();
        } else if (value instanceof Date) {
            formattedValue = value.toISOString();
        } else if (value instanceof Set) {
            formattedValue = `Set(${value.size}) {[...value].map(v => String(v).substring(0, 10)).join(', ')}}`;
        } else if (typeof value === 'object' && value !== null) {
            try { formattedValue = JSON.stringify(value); } catch (e) { formattedValue = '[Unserializable Object]'; }
        } else {
            formattedValue = value;
        }
        return `<div><strong class="trace-snapshot-key">${key}:</strong> <span class="trace-snapshot-value">${formattedValue}</span></div>`;
    }).join('');

    if (snapshotHtml) {
        html += `<div class="trace-snapshot">${snapshotHtml}</div>`;
    }

    entry.innerHTML = html;
    debuggerContent.appendChild(entry);
    debuggerContent.scrollTop = debuggerContent.scrollHeight;
}

function setupDebugger() {
    if (!debuggerCopyBtn || !debuggerClearBtn || !debuggerContent) return;
    debuggerCopyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(debuggerContent.innerText);
        showToastNotification("✅ 디버그 로그가 복사되었습니다.", "", `debug-copy-${Date.now()}`);
    });
    debuggerClearBtn.addEventListener('click', () => {
        debuggerContent.innerHTML = '';
        trace("System", "Debugger Cleared");
    });
    trace("System", "Debugger Initialized");
}

function renderKatexInString(text) {
    if (typeof katex === 'undefined' || !text) return text;
    const regex = /\$\$([\s\S]*?)\$\$|\$([\s\S]*?)\$|\\\(([\s\S]*?)\\\)/g;
    return text.replace(regex, (match, display, inline, parenthesis) => {
        const formula = display || inline || parenthesis;
        if (!formula) return match;
        const decodedFormula = formula.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        try {
            return katex.renderToString(decodedFormula, {
                throwOnError: false,
                displayMode: !!display,
                macros: {
                    "\\Dslash": "{\\not\\!D}"
                }
            });
        } catch (e) {
            console.warn("KaTeX rendering error:", e);
            return match;
        }
    });
}

function updateClock() { 
    const clockElement = document.getElementById('real-time-clock'); 
    if (!clockElement) return; 
    const now = new Date(); 
    const options = { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }; 
    clockElement.textContent = now.toLocaleString('ko-KR', options); 
}

function setupSystemInfoWidget() { 
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
}

function makePanelDraggable(panelElement) {
    if (!panelElement) return;
    const header = panelElement.querySelector('.panel-header');
    if (!header) return;
    let isDragging = false, offset = { x: 0, y: 0 };

    const onMouseMove = (e) => {
        if (isDragging) {
            let newX = e.clientX + offset.x;
            let newY = e.clientY + offset.y;
            const panelRect = panelElement.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // [MODIFIED] Header Peeking Logic
            const headerHeight = header ? header.offsetHeight : 42; // Fallback height
            const HEADER_PEEK_AMOUNT = 10;
            const minY = -(headerHeight - HEADER_PEEK_AMOUNT);

            if (newX < 0) newX = 0;
            if (newX + panelRect.width > viewportWidth) newX = viewportWidth - panelRect.width;
            if (newY < minY) newY = minY; // Apply peeking logic
            if (newY + panelRect.height > viewportHeight) newY = viewportHeight - panelRect.height;
            
            panelElement.style.left = `${newX}px`;
            panelElement.style.top = `${newY}px`;
        }
    };

    const onMouseUp = () => {
        isDragging = false;
        panelElement.classList.remove('is-dragging');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        savePanelState(panelElement);
    };

    header.addEventListener('mousedown', e => {
        if (e.target.closest('button, input, select, .resizer')) return;
        if (panelElement.classList.contains('maximized')) return;
        isDragging = true;
        panelElement.classList.add('is-dragging');
        offset = { x: panelElement.offsetLeft - e.clientX, y: panelElement.offsetTop - e.clientY };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

// [NEW] Custom resize logic
function makePanelResizable(panelElement) {
    const MIN_WIDTH = 300;
    const MIN_HEIGHT = 200;

    panelElement.querySelectorAll('.resizer').forEach(handle => {
        handle.addEventListener('mousedown', initResize);
        
        // [ADDED] Double-click to reset feature
        handle.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Remove special states that conflict with reset
            panelElement.classList.remove('maximized', 'minimized');
            const maximizeBtn = panelElement.querySelector('.panel-maximize-btn');
            if (maximizeBtn) maximizeBtn.classList.remove('is-maximized');

            // Define default size relative to viewport, with caps
            const defaultWidth = Math.min(700, window.innerWidth * 0.6);
            const defaultHeight = Math.min(600, window.innerHeight * 0.7);

            // Calculate centered position
            const centeredLeft = (window.innerWidth - defaultWidth) / 2;
            const centeredTop = (window.innerHeight - defaultHeight) / 2;

            // Apply styles
            panelElement.style.width = `${defaultWidth}px`;
            panelElement.style.height = `${defaultHeight}px`;
            panelElement.style.left = `${centeredLeft}px`;
            panelElement.style.top = `${centeredTop}px`;
            
            // Persist the new state
            savePanelState(panelElement);
            trace("UI.Panel", "ResetToDefault", { panelId: panelElement.id });
        });
    });

    function initResize(e) {
        e.preventDefault();
        const handle = e.target;
        
        let original_width = panelElement.offsetWidth;
        let original_height = panelElement.offsetHeight;
        let original_mouse_x = e.clientX;
        let original_mouse_y = e.clientY;
        
        const resize = (e) => {
            if (handle.classList.contains('right') || handle.classList.contains('bottom-right')) {
                const width = original_width + (e.clientX - original_mouse_x);
                if (width > MIN_WIDTH) panelElement.style.width = width + 'px';
            }
            if (handle.classList.contains('bottom') || handle.classList.contains('bottom-right')) {
                const height = original_height + (e.clientY - original_mouse_y);
                if (height > MIN_HEIGHT) panelElement.style.height = height + 'px';
            }
        };
        
        const stopResize = () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResize);
            savePanelState(panelElement);
        };
        
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResize);
    }
}

// [NEW] Unified initializer for panels
function initializeDraggableAndResizablePanel(panelElement) {
    if (!panelElement || panelElement.querySelector('.resize-handles')) return; // Already initialized

    const resizers = document.createElement('div');
    resizers.className = 'resize-handles';
    resizers.innerHTML = `
        <div class="resizer right"></div>
        <div class="resizer bottom"></div>
        <div class="resizer bottom-right"></div>
    `;
    panelElement.appendChild(resizers);

    makePanelDraggable(panelElement);
    makePanelResizable(panelElement);
}


function savePanelState(panelElement) {
    if (!panelElement || panelElement.classList.contains('maximized')) return;
    const panelId = panelElement.id;
    if (!userApiSettings.panelStates) {
        userApiSettings.panelStates = {};
    }
    userApiSettings.panelStates[panelId] = {
        top: panelElement.style.top,
        left: panelElement.style.left,
        width: panelElement.style.width,
        height: panelElement.style.height,
    };
    if (debouncedSaveUserSettings) {
        debouncedSaveUserSettings();
    }
}

function focusPanel(panelElement) {
    if (!panelElement) return;
    document.querySelectorAll('.draggable-panel').forEach(p => {
        p.classList.remove('panel-focused');
    });
    panelElement.classList.add('panel-focused');
    highestZIndex++;
    panelElement.style.zIndex = highestZIndex;
    trace("UI", "PanelFocused", { panelId: panelElement.id, zIndex: highestZIndex });
}

function togglePanel(panelElement, forceShow = null) { 
    if (!panelElement) return; 
    const show = forceShow !== null ? forceShow : panelElement.style.display !== 'flex'; 
    panelElement.style.display = show ? 'flex' : 'none'; 
    if (show) {
        focusPanel(panelElement);
    }
}

function handleTextSelection(e) { 
    const selection = window.getSelection(); 
    const selectedText = selection.toString().trim(); 

    const isInsideChatMessages = e.target.closest('.chat-messages');
    const isDisallowed = e.target.closest('#selection-popover, #immersive-header, .project-context-menu, .session-context-menu') || (e.target.closest('.draggable-panel') && !isInsideChatMessages);
    if (isDisallowed) return;

    removeContextMenu(); 
    if (selectedText.length > 3) { 
        lastSelectedText = selectedText;
        const range = selection.getRangeAt(0); 
        const rect = range.getBoundingClientRect(); 
        const popover = selectionPopover; 
        let top = rect.top + window.scrollY - popover.offsetHeight - 10; 
        let left = rect.left + window.scrollX + (rect.width / 2) - (popover.offsetWidth / 2); 
        popover.style.top = `${top < window.scrollY ? rect.bottom + window.scrollY + 10 : top}px`; 
        popover.style.left = `${Math.max(5, Math.min(left, window.innerWidth - popover.offsetWidth - 5))}px`; 
        popover.style.display = 'flex'; 
    } else if (!e.target.closest('#selection-popover')) { 
        if(selectionPopover) selectionPopover.style.display = 'none'; 
    } 
}

function autoResizeTextarea(element) {
    if (!element) return;
    element.style.height = 'auto';
    const scrollHeight = element.scrollHeight;
    const maxHeight = parseInt(window.getComputedStyle(element).maxHeight, 10);
    if (scrollHeight > maxHeight) {
        element.style.height = `${maxHeight}px`;
        element.scrollTop = element.scrollHeight;
    } else {
        element.style.height = `${scrollHeight}px`;
    }
}

function handlePopoverAskAi() {
    if (!lastSelectedText || !chatInput) return;
    if (chatPanel && chatPanel.classList.contains('minimized')) {
        handlePanelMinimize(chatPanel);
    }
    togglePanel(chatPanel, true);
    const userQuery = `"${lastSelectedText}"\n\n이 내용에 대해 더 자세히 설명해줄래?`;
    chatInput.value = userQuery;
    const selection = window.getSelection();
    const selectionSource = selection.anchorNode?.parentElement?.closest('#learning-content, .chat-messages');
    if (selectionSource && selectionSource.id === 'learning-content') {
        stagedHiddenContext = selectionSource.innerText || '';
        trace("UI", "PopoverAskAi", { context: "Staged FULL page" });
    } else {
        stagedHiddenContext = null;
        trace("UI", "PopoverAskAi", { context: "No context staged" });
    }
    autoResizeTextarea(chatInput);
    chatInput.focus();
    if (selectionPopover) selectionPopover.style.display = 'none';
}

async function handlePopoverAddNote() {
    if (!lastSelectedText) return;
    togglePanel(notesAppPanel, true);
    ensureNotePanelHeader();
    const newNoteId = await addNote(`> ${lastSelectedText}\n\n`);
    if (newNoteId) {
        openNoteEditor(newNoteId);
    }
    if (selectionPopover) {
        selectionPopover.style.display = 'none';
    }
}

function openPromptModal() { 
    if (customPromptInput) customPromptInput.value = customPrompt; 
    if (promptModalOverlay) promptModalOverlay.style.display = 'flex'; 
}

function closePromptModal() { 
    if (promptModalOverlay) promptModalOverlay.style.display = 'none'; 
}

function saveCustomPrompt() { 
    if (customPromptInput) { 
        customPrompt = customPromptInput.value; 
        localStorage.setItem('customTutorPrompt', customPrompt); 
        closePromptModal(); 
    } 
}

function showModal(message, onConfirm) { 
    if (!customModal || !modalMessage || !modalConfirmBtn || !modalCancelBtn) return; 
    modalMessage.textContent = message; 
    customModal.style.display = 'flex'; 
    modalConfirmBtn.onclick = () => { 
        onConfirm(); 
        customModal.style.display = 'none'; 
    }; 
    modalCancelBtn.onclick = () => { 
        customModal.style.display = 'none'; 
    }; 
}

function updateStatus(msg, success) { 
    if (!autoSaveStatus) return; 
    autoSaveStatus.textContent = msg; 
    autoSaveStatus.style.color = success ? 'lightgreen' : 'lightcoral'; 
    setTimeout(() => { autoSaveStatus.textContent = ''; }, 3000); 
}

function showToastNotification(message, content, sessionId) {
    const existingToast = document.querySelector(`.toast-notification[data-session-id="${sessionId}"]`);
    if (existingToast) return;
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.dataset.sessionId = sessionId;
    toast.innerHTML = `
        <div class="toast-icon">💬</div>
        <div class="toast-content">
            <p>${message}</p>
            <small>${content}</small>
        </div>
    `;
    toast.addEventListener('click', () => {
        const isTemp = sessionId.startsWith('temp-response');
        if (isTemp) {
            togglePanel(chatPanel, true);
            handleNewChat(true);
        } else {
            togglePanel(chatPanel, true);
            selectSession(sessionId);
        }
        removeToast(toast);
    });
    document.body.appendChild(toast);
    setTimeout(() => {
        removeToast(toast);
    }, 5000);
}

function removeToast(toastElement) {
    if (toastElement) {
        toastElement.classList.add('exiting');
        toastElement.addEventListener('animationend', () => {
            toastElement.remove();
        });
    }
}