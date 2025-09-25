/* --- Ailey & Bailey Canvas --- */
// File: 222_chat_ui_messages.js
// Version: 9.2 (Highlighting Robustness Fix)
// Description: Added a DOM sanitizer to remove empty text nodes post-markdown rendering, preventing highlight offset calculation errors.

const CHAR_PER_SECOND = 150; // Kept for legacy calculations, but not used for rendering.
let activeToolbar = null;
let toolbarHideTimeout = null;
let lastHoveredMessageElement = null;

function createMessageToolbar(messageElement) {
    if (toolbarHideTimeout) clearTimeout(toolbarHideTimeout);

    const parentContainer = messageElement.closest('.ai-response-container, .chat-message.user');
    if (!parentContainer) return;

    if (activeToolbar && activeToolbar.parentElement !== parentContainer) {
        activeToolbar.remove();
        activeToolbar = null;
        document.querySelectorAll('.toolbar-active').forEach(el => el.classList.remove('toolbar-active'));
    }

    if (!activeToolbar) {
        parentContainer.classList.add('toolbar-active');
        const isUser = messageElement.classList.contains('user');
        const toolbar = document.createElement('div');
        toolbar.className = `message-toolbar ${isUser ? 'user-toolbar' : 'ai-toolbar'}`;

        const copySVG = '<svg viewBox="0 0 24 24"><path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" /></svg>';
        const deleteSVG = '<svg viewBox="0 0 24 24"><path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z" /></svg>';
        const regenerateSVG = '<svg viewBox="0 0 24 24"><path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z" /></svg>';

        toolbar.innerHTML = `
            <button class="toolbar-button" data-action="copy" title="대화 내용 복사">${copySVG}</button>
            <button class="toolbar-button" data-action="delete" title="메시지 삭제">${deleteSVG}</button>
        `;

        if (!isUser) {
            toolbar.innerHTML += `<button class="toolbar-button" data-action="regenerate" title="답변 재생성">${regenerateSVG}</button>`;
        }

        parentContainer.appendChild(toolbar);
        activeToolbar = toolbar;

        toolbar.addEventListener('click', (e) => {
            const button = e.target.closest('.toolbar-button');
            if (!button) return;
            const action = button.dataset.action;
            const msgId = messageElement.dataset.messageId;
            if (!msgId) return;

            switch (action) {
                case 'copy': handleMessageCopy(msgId); break;
                case 'delete': handleMessageDelete(msgId, messageElement); break;
                case 'regenerate': handleMessageRegenerate(msgId, messageElement); break;
            }
        });
    }
}

function updateToolbarPosition(e, messageElement) {
    if (!activeToolbar) return;
    const parentContainer = messageElement.closest('.ai-response-container, .chat-message.user');
    if (!parentContainer) return;

    const parentRect = parentContainer.getBoundingClientRect();
    const toolbarHeight = activeToolbar.offsetHeight;
    let top = e.clientY - parentRect.top - (toolbarHeight / 2);

    top = Math.max(4, top);
    top = Math.min(top, parentContainer.clientHeight - toolbarHeight - 4);

    activeToolbar.style.top = `${top}px`;
}

function removeToolbarWithDelay() {
    if (toolbarHideTimeout) clearTimeout(toolbarHideTimeout);
    toolbarHideTimeout = setTimeout(() => {
        if (activeToolbar) {
            const parent = activeToolbar.parentElement;
            activeToolbar.remove();
            if (parent) parent.classList.remove('toolbar-active');
            activeToolbar = null;
            lastHoveredMessageElement = null;
        }
    }, 300);
}

function autoScrollChat() {
    if (!chatMessages) return;
    const tolerance = 100;
    const isScrolledToBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < tolerance;
    if (isScrolledToBottom) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function getMessageId(msg) {
    if (msg.id) return msg.id;
    if (msg.timestamp instanceof Date) return msg.timestamp.getTime().toString();
    if (msg.timestamp?.toDate) return msg.timestamp.toDate().getTime().toString();
    return `msg-${Math.random()}`;
}

function renderChatMessages(sessionData) {
    if (!chatMessages || !sessionData) return;
    if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
    const messages = sessionData.messages || [];
    const fragment = document.createDocumentFragment();
    messages.forEach((msg, index) => {
        let element;
        if (msg.role === 'user') {
            element = createUserMessageElement(msg);
        } else if (msg.role === 'ai') {
            element = createAiMessageContainer(msg, index, false);
        }
        if (element) {
            fragment.appendChild(element);
        }
    });
    if (fragment.children.length > 0) {
        chatMessages.innerHTML = '';
        chatMessages.appendChild(fragment);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function renderNewMessages(messages) {
    if(messages && messages.length > 0) {
        const msg = messages[0];
        trace("UI.Render", "renderNewMessages.exec", { count: messages.length, role: msg.role }, { sessionId: currentSessionId, msgId: getMessageId(msg) });
    }
    if (!chatMessages) return;
    if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
    const fragment = document.createDocumentFragment();
    messages.forEach((msg, index) => {
        let element;
        if (msg.role === 'user') {
            element = createUserMessageElement(msg);
        } else if (msg.role === 'ai') {
            element = createAiMessageContainer(msg, index, true);
        }
        if (element) {
            fragment.appendChild(element);
        }
    });
    chatMessages.appendChild(fragment);
    autoScrollChat();
}

function prependMessages(messages) {
    if (!chatMessages || messages.length === 0) return;
    trace("UI", "prependMessages.start", { count: messages.length });

    const fragment = document.createDocumentFragment();
    messages.forEach((msg) => {
        const msgId = getMessageId(msg);
        // [FIX] Duplication Guard Clause
        if (document.querySelector(`.chat-message[data-message-id="${msgId}"]`)) {
            trace("UI", "prependMessages.duplicateSkip", { msgId: msgId.substring(0,10) }, {}, "WARN");
            return;
        }

        let element;
        if (msg.role === 'user') element = createUserMessageElement(msg);
        else if (msg.role === 'ai') element = createAiMessageContainer(msg, 0, false);
        
        if (element) fragment.appendChild(element);
    });

    if (fragment.children.length > 0) {
        const oldScrollHeight = chatMessages.scrollHeight;
        chatMessages.prepend(fragment);
        const newScrollHeight = chatMessages.scrollHeight;
        chatMessages.scrollTop += (newScrollHeight - oldScrollHeight);
    }
}

const handleChatScroll = debounce(async (e) => {
    const { scrollTop } = e.target;
    // [REFACTORED] Use currentSessionState for flags
    if (scrollTop < 100 && !currentSessionState.isLoadingMore && currentSessionState.hasMoreMessages) {
        currentSessionState.isLoadingMore = true;
        trace("UI", "handleChatScroll.loadMore.start", {}, { oldest: currentSessionState.oldestMessageTimestamp });

        const pastMessages = await fetchPastMessages(currentSessionId, currentSessionState.oldestMessageTimestamp);
        
        if (pastMessages.length > 0) {
            const sessionInCache = localChatSessionsCache.find(s => s.id === currentSessionId);
            if (sessionInCache) {
                sessionInCache.messages.unshift(...pastMessages.slice().reverse());
            }
            prependMessages(pastMessages.slice().reverse());
            currentSessionState.oldestMessageTimestamp = pastMessages[pastMessages.length - 1].timestamp;
        } else {
            currentSessionState.hasMoreMessages = false;
            trace("UI", "handleChatScroll.loadMore.end", { message: "No more messages" });
        }
        currentSessionState.isLoadingMore = false;
    }
}, 200);

function createUserMessageElement(msg) {
    const element = document.createElement('div');
    // [MODIFIED] Added .content-section and data-block-id for highlighting compatibility
    element.className = 'chat-message user content-section';
    element.dataset.messageId = getMessageId(msg);
    element.dataset.blockId = getMessageId(msg);

    const textContent = msg.displayName || msg.content || '';
    const sanitizedText = textContent.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    if (msg.attachment && msg.attachment.type === 'image') {
        const textHTML = sanitizedText ? `<p>${sanitizedText}</p>` : '';
        element.innerHTML = `
            ${textHTML}
            <img src="${msg.attachment.content}" alt="${msg.attachment.name}" class="message-attachment-thumbnail">
        `;
    } else if (msg.attachment && (msg.attachment.type === 'text' || msg.attachment.type === 'pdf')) {
        const textHTML = sanitizedText ? `<p>${sanitizedText}</p>` : '';
        const sanitizedFileName = msg.attachment.name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        let iconSVG = '';
        if (msg.attachment.type === 'text') {
            iconSVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16.5,6V17.5A4,4 0 0,1 12.5,21.5A4,4 0 0,1 8.5,17.5V5A2.5,2.5 0 0,1 11,2.5A2.5,2.5 0 0,1 13.5,5V15.5A1,1 0 0,1 12.5,16.5A1,1 0 0,1 11.5,15.5V6H10V15.5A2.5,2.5 0 0,0 12.5,18A2.5,2.5 0 0,0 15,15.5V5A4,4 0 0,0 11,1A4,4 0 0,0 7,5V17.5A5.5,5.5 0 0,0 12.5,23A5.5,5.5 0 0,0 18,17.5V6H16.5Z" /></svg>';
        } else if (msg.attachment.type === 'pdf') {
            iconSVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M9.5,11.5A1.5,1.5 0 0,1 8,10A1.5,1.5 0 0,1 9.5,8.5A1.5,1.5 0 0,1 11,10A1.5,1.5 0 0,1 9.5,11.5M14.5,10.5H12.5V15H11V10.5H9V9H14.5V10.5M18.5,10.5H16.5V15H15V9H18.5V10.5Z" /></svg>';
        }
        element.innerHTML = `
            ${textHTML}
            <div class="attachment-chip">
                ${iconSVG}
                <span>${sanitizedFileName}</span>
            </div>
        `;
    } else {
        element.textContent = textContent;
    }
    return element;
}

// isLive parameter is now ignored, but kept for function signature compatibility.
function createAiMessageContainer(msg, index, isLive) {
    const aiContainer = document.createElement('div');
    aiContainer.className = 'ai-response-container';
    if (msg.status === 'loading') {
        aiContainer.dataset.messageId = msg.id;
        aiContainer.innerHTML = `<div class="chat-message ai loading-animation"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
        return aiContainer;
    }

    const messageBubble = document.createElement('div');
    // [MODIFIED] Added .content-section and data-block-id for highlighting compatibility
    messageBubble.className = 'chat-message ai content-section';
    messageBubble.dataset.messageId = getMessageId(msg);
    messageBubble.dataset.blockId = getMessageId(msg);

    const content = msg.content;
    const reasoningRegex = /^\[REASONING_START\]([\s\S]*?)\[REASONING_END\]/;
    const match = content.match(reasoningRegex);
    let finalContent = content;
    if (match) {
        finalContent = content.replace(reasoningRegex, '').trim();
    }
    
    // [MODIFIED] Always call renderStaticMarkdown for instant display
    renderStaticMarkdown(messageBubble, finalContent);

    aiContainer.appendChild(messageBubble);

    if (msg.duration) {
        const metaDiv = document.createElement('div');
        metaDiv.className = 'ai-response-meta';
        metaDiv.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14"><path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" /></svg><span>응답 생성: ${msg.duration}초</span>`;
        aiContainer.appendChild(metaDiv);
    }
    return aiContainer;
}

function renderFinalMessage(finalMsg, loadingId) {
    if (!chatMessages) return;
    const loadingContainer = chatMessages.querySelector(`.ai-response-container[data-message-id="${loadingId}"]`);
    if (loadingContainer) {
        loadingContainer.remove();
    }

    // [SIMPLIFIED] Directly create and append the final message container.
    const newContainer = createAiMessageContainer(finalMsg, -1, false);
    chatMessages.appendChild(newContainer);

    const streamInfo = activeStreams[currentSessionId];
    if (streamInfo) {
        streamInfo.isComplete = true;
        delete activeStreams[currentSessionId];
    }
    autoScrollChat();
    renderSidebarContent(); // Update sidebar to remove loading indicator
}

// [NEW] Helper function to remove empty text nodes created by the markdown parser.
function cleanupWhitespaceNodes(element) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    const nodesToRemove = [];
    let node;
    while (node = walker.nextNode()) {
        // A text node is empty if it only contains whitespace characters.
        if (!/\S/.test(node.nodeValue)) {
            nodesToRemove.push(node);
        }
    }
    // Remove collected nodes after traversal to avoid modifying the list while iterating.
    nodesToRemove.forEach(node => node.parentNode.removeChild(node));
}

function renderStaticMarkdown(element, text) {
    if (!element || typeof text !== 'string') return;
    const processedText = renderKatexInString(text);
    if (typeof marked === 'undefined') {
        element.innerHTML = processedText;
        return;
    }
    element.innerHTML = marked.parse(processedText, { gfm: true, breaks: true, sanitize: false });
    
    // [ADDED] Sanitize the DOM to remove empty text nodes that can break highlight offset calculations.
    cleanupWhitespaceNodes(element);

    if (typeof Prism !== 'undefined') {
        Prism.highlightAllUnder(element);
    }
}

// [OBSOLETE] This function is no longer called but kept for reference.
function renderStreamingMarkdown(element, text, offset = 0) {
    renderStaticMarkdown(element, text);
}

function startSummaryAnimation(blockElement, reasoningSteps) {}
function typewriterEffect(element, text, onComplete) {}
function clearTimers(blockId) {
    if (activeTimers[blockId]) {
        activeTimers[blockId].forEach(clearInterval);
        delete activeTimers[blockId];
    }
}