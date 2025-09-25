/* --- Ailey & Bailey Canvas --- */
// File: 201_chat_realtime.js
// Version: 1.3 (Single Source of Truth)
// Description: The listener is now the single source of truth for rendering new messages.

function listenToNewMessages(sessionId) {
    if (unsubscribeFromMessages) {
        unsubscribeFromMessages();
        unsubscribeFromMessages = null;
    }

    if (!chatSessionsCollectionRef || !sessionId || sessionId === 'temporary-chat') return;

    const queryStartTime = currentSessionState.lastMessageTimestamp || new Date(0);
    trace("Firestore", "listenNewMessages.start", { sessionId: sessionId.substring(0,5) }, { since: queryStartTime });

    const messagesQuery = chatSessionsCollectionRef.doc(sessionId).collection("messages")
        .orderBy("timestamp", "asc")
        .where("timestamp", ">", queryStartTime);

    unsubscribeFromMessages = messagesQuery.onSnapshot(snapshot => {
        trace("Firestore", "listenNewMessages.triggered", { changeCount: snapshot.docChanges().length });
        const newMessages = [];
                snapshot.docChanges().forEach(change => {
            const messageDataForLog = { id: change.doc.id, ...change.doc.data() };
            trace("Firestore", "onSnapshot.messageReceived", { type: change.type }, { sessionId: sessionId, msgId: change.doc.id });
            if (change.type === "added") {
                const messageData = { id: change.doc.id, ...change.doc.data() };
                if (messageData.timestamp && messageData.timestamp.toDate) {
                    messageData.timestamp = messageData.timestamp.toDate();
                }
                newMessages.push(messageData);
            }
        });

        if (newMessages.length > 0) {
            const latestTimestamp = newMessages[newMessages.length - 1].timestamp;
            if (latestTimestamp) {
                currentSessionState.lastMessageTimestamp = latestTimestamp;
            }
            
            // We still need a duplication guard for race conditions or listener overlaps.
            const messagesToRender = newMessages.filter(msg => {
                const msgId = getMessageId(msg);
                return !document.querySelector(`.chat-message[data-message-id="${msgId}"]`);
            });
            
                        if(messagesToRender.length > 0) {
                trace("UI.Listener", "render.start", { count: messagesToRender.length }, { sessionId: sessionId, msgId: getMessageId(messagesToRender[0]) });
                trace("Firestore", "listenNewMessages.render", { count: messagesToRender.length });
                // Handle different message roles
                messagesToRender.forEach(msg => {
                    if (msg.role === 'user') {
                        renderNewMessages([msg]);
                    } else if (msg.role === 'ai') {
                        // For AI messages, we use renderFinalMessage to handle streaming state
                        renderFinalMessage(msg, sessionId);
                    }
                });
            }
        }
    }, error => {
        console.error("Error listening to new messages:", error);
        trace("Firestore", "listenNewMessages.error", { error: error.message }, {}, "ERROR");
    });
}