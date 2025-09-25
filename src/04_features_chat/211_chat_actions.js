/* --- Ailey & Bailey Canvas --- */
// File: 211_chat_actions.js
// Version: 4.5 (Regeneration Context Fix)
// Description: Fixed regeneration logic to pass the correct conversation history.

function handleMessageCopy(messageId) {
    if (!currentSessionId) return;
    const session = (currentSessionId === 'temporary-chat')
        ? temporarySession
        : localChatSessionsCache.find(s => s.id === currentSessionId);
    
    if (!session || !session.messages) return;

    const messageToCopy = session.messages.find(m => getMessageId(m) === messageId);
    if (!messageToCopy) {
        console.error("Message to copy not found:", messageId);
        return;
    }

    let content = messageToCopy.content || '';
    if (messageToCopy.role === 'ai') {
        const reasoningRegex = /^\[REASONING_START\]([\s\S]*?)\[REASONING_END\]\s*/;
        content = content.replace(reasoningRegex, '');
    }

    const formattedString = content.trim();

    if (copyModalOverlay && copyModalTextarea) {
        copyModalTextarea.value = formattedString;
        copyModalOverlay.style.display = 'flex';
        copyModalTextarea.focus();
        copyModalTextarea.select();

        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
                setTimeout(() => {
                    closeCopyModal();
                    showToastNotification("✅ 복사되었습니다!", "클립보드", `copy-toast-${Date.now()}`);
                }, 100);
                copyModalTextarea.removeEventListener('keydown', handleKeyDown);
            }
        };

        const closeModalOnClickOutside = (e) => {
            if (e.target === copyModalOverlay) {
                closeCopyModal();
                copyModalOverlay.removeEventListener('click', closeModalOnClickOutside);
                copyModalTextarea.removeEventListener('keydown', handleKeyDown);
            }
        };

        copyModalOverlay.addEventListener('click', closeModalOnClickOutside);
        copyModalTextarea.addEventListener('keydown', handleKeyDown);
    }
}

function closeCopyModal() {
    if (copyModalOverlay) {
        copyModalOverlay.style.display = 'none';
    }
}

async function handleMessageDelete(messageId, messageElement) {
    if (!currentSessionId) return;
    
    messageElement.closest('.ai-response-container, .chat-message.user')?.remove();

    if (currentSessionId === 'temporary-chat') {
        const messageIndex = temporarySession.messages.findIndex(m => getMessageId(m) === messageId);
        if (messageIndex > -1) {
            temporarySession.messages.splice(messageIndex, 1);
        }
        return;
    }

    const session = localChatSessionsCache.find(s => s.id === currentSessionId);
    if (!session || !session.messages) return;

    const messageToDelete = session.messages.find(m => getMessageId(m) === messageId);
    if (!messageToDelete) return;

    try {
        await chatSessionsCollectionRef.doc(currentSessionId).update({
            messages: firebase.firestore.FieldValue.arrayRemove(messageToDelete)
        });
    } catch (err) {
        console.error("Failed to delete message from Firestore:", err);
        alert("메시지 삭제에 실패했습니다. 페이지를 새로고침합니다.");
        location.reload();
    }
}

async function handleMessageRegenerate(messageId, messageElement) {
    if (!currentSessionId) return;

    const isTemporary = currentSessionId === 'temporary-chat';
    const session = isTemporary
        ? temporarySession
        : localChatSessionsCache.find(s => s.id === currentSessionId);

    if (!session || !session.messages) return;

    const aiMessageIndex = session.messages.findIndex(m => getMessageId(m) === messageId);
    if (aiMessageIndex < 1) return;

    const userMessage = session.messages[aiMessageIndex - 1];
    if (userMessage.role !== 'user') return;

    // [FIX] Correctly slice the history to include the user's message.
    const historyForApi = session.messages.slice(0, aiMessageIndex);

    messageElement.closest('.ai-response-container')?.remove();

    if (isTemporary) {
        session.messages.splice(aiMessageIndex);
        sendQueryToAI(userMessage, historyForApi, currentSessionId, true);
    } else {
        const aiMessageToDelete = session.messages[aiMessageIndex];
        try {
            await chatSessionsCollectionRef.doc(currentSessionId).update({
                messages: firebase.firestore.FieldValue.arrayRemove(aiMessageToDelete)
            });
            sendQueryToAI(userMessage, historyForApi, currentSessionId, false);
        } catch (err) {
            console.error("Failed to regenerate message:", err);
            alert("답변 재생성에 실패했습니다.");
            location.reload();
        }
    }
}