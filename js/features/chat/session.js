// Migrated content for js/features/chat/session.js

export function listenToChatSessions() {
        return new Promise((resolve) => {
            if (!chatSessionsCollectionRef) return resolve();
            if (unsubscribeFromChatSessions) unsubscribeFromChatSessions();
            unsubscribeFromChatSessions = chatSessionsCollectionRef.onSnapshot(snapshot => {
                localChatSessionsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }

export function selectSession(sessionId) {
        removeContextMenu();
        if (!sessionId) return;
        const sessionData = localChatSessionsCache.find(s => s.id === sessionId);
        if (!sessionData) return;
        currentSessionId = sessionId;
        Object.values(activeTimers).forEach(timers => timers.forEach(clearInterval));
        renderSidebarContent();
        if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
        if (chatMessages) chatMessages.style.display = 'flex';
        renderChatMessages(sessionData);
        if (chatSessionTitle) chatSessionTitle.textContent = sessionData.title || '대화';
        if (deleteSessionBtn) deleteSessionBtn.style.display = 'inline-block';
        if (chatInput) chatInput.disabled = false;
        if (chatSendBtn) chatSendBtn.disabled = false;
        chatInput.focus();
    }

export function handleNewChat() { currentSessionId = null; Object.values(activeTimers).forEach(timers => timers.forEach(clearInterval)); renderSidebarContent(); if (chatMessages) { chatMessages.innerHTML = ''; chatMessages.style.display = 'none'; }

export function handleDeleteSession(sessionId) {
        if (!sessionId) return;
        const sessionToDelete = localChatSessionsCache.find(s => s.id === sessionId);
        if (!sessionToDelete) return;
        
        showModal(`'${sessionToDelete?.title || '이 대화'}

export async function renameSession(sessionId, newTitle) {
        if (!newTitle || !sessionId) return;
        try { await chatSessionsCollectionRef.doc(sessionId).update({ title: newTitle, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }

export async function toggleChatPin(sessionId) {
        if (!chatSessionsCollectionRef || !sessionId) return;
        const sessionRef = chatSessionsCollectionRef.doc(sessionId);
        const currentSession = localChatSessionsCache.find(s => s.id === sessionId);
        if (!currentSession) return;
        try {
            await sessionRef.update({ 
                isPinned: !(currentSession.isPinned || false),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
            }