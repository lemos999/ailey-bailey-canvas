// Migrated content for js/features/chat/api.js

export async function handleChatSend() {
        if (!chatInput || chatInput.disabled) return;
        const query = chatInput.value.trim();
        if (!query) return;

        chatInput.value = '';
        chatInput.style.height = 'auto';
        chatInput.disabled = true;
        chatSendBtn.disabled = true;

        const userMessage = { role: 'user', content: query, timestamp: new Date() }

export function buildApiRequest(provider, model, messages, maxTokens) {
        const history = messages.map(msg => ({
            role: msg.role === 'ai' ? 'assistant' : 'user',
            content: msg.content
        }

export function parseApiResponse(provider, result) {
        try {
            if (provider === 'openai') { return { content: result.choices[0].message.content, usage: { prompt: result.usage.prompt_tokens, completion: result.usage.completion_tokens }