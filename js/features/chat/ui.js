// Migrated content for js/features/chat/ui.js

export function renderChatMessages(sessionData) {
        if (!chatMessages || !sessionData) return;
        
        // Use the messages from the provided session data. If it's a temporary render (like for loading), it will have a 'status' property.
        const messages = sessionData.messages || [];
        chatMessages.innerHTML = '';

        messages.forEach((msg, index) => {
            if (msg.role === 'user') {
                const d = document.createElement('div');
                d.className = `chat-message user`;
                d.textContent = msg.content;
                chatMessages.appendChild(d);

            }

export function startSummaryAnimation(blockElement, reasoningSteps) {
        const blockId = blockElement.id;
        clearTimers(blockId);
        activeTimers[blockId] = [];

        const summaryElement = blockElement.querySelector('.reasoning-summary');
        if (!summaryElement || !reasoningSteps || reasoningSteps.length === 0) return;

        let stepIndex = 0;
        const cycleSummary = () => {
            if (!reasoningSteps[stepIndex] || !reasoningSteps[stepIndex].summary) return;
            const summaryText = reasoningSteps[stepIndex].summary;
            typewriterEffect(summaryElement, summaryText, () => {
                const waitTimer = setTimeout(() => {
                    summaryElement.style.opacity = '0';
                    const fadeTimer = setTimeout(() => {
                        stepIndex = (stepIndex + 1) % reasoningSteps.length;
                        summaryElement.style.opacity = '1';
                    }

export function clearTimers(blockId) {
        if (activeTimers[blockId]) {
            activeTimers[blockId].forEach(clearInterval);
            delete activeTimers[blockId];
        }