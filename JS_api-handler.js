/* --- JS_api-handler.js --- */
import { getUserApiSettings } from 'https://lemos999.github.io/ailey-bailey-canvas/JS_state.js';

export function buildApiRequest(provider, model, messages, maxTokens) {
    const userApiSettings = getUserApiSettings();
    const history = messages.map(msg => ({ 
        role: msg.role === 'ai' ? 'assistant' : 'user', 
        content: msg.content 
    }));

    if (provider === 'openai') {
        return {
            url: 'https://api.openai.com/v1/chat/completions',
            options: {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': Bearer \
                },
                body: JSON.stringify({
                    model: model,
                    messages: history,
                    max_tokens: Number(maxTokens) || 2048
                })
            }
        };
    }
    
    if (provider === 'anthropic') {
        return {
            url: 'https://api.anthropic.com/v1/messages',
            options: {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': userApiSettings.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: model,
                    messages: history,
                    max_tokens: Number(maxTokens) || 2048
                })
            }
        };
    }
    
    if (provider === 'google_paid') {
        const googleHistory = messages.map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));
        return {
            url: https://generativelanguage.googleapis.com/v1beta/models/\:generateContent?key=\,
            options: {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: googleHistory,
                    generationConfig: { maxOutputTokens: Number(maxTokens) || 2048 }
                })
            }
        };
    }

    throw new Error(Unsupported provider: \);
}

export function parseApiResponse(provider, result) {
    try {
        if (provider === 'openai') {
            return {
                content: result.choices[0].message.content,
                usage: {
                    prompt: result.usage.prompt_tokens,
                    completion: result.usage.completion_tokens
                }
            };
        }
        if (provider === 'anthropic') {
            return {
                content: result.content[0].text,
                usage: {
                    prompt: result.usage.input_tokens,
                    completion: result.usage.output_tokens
                }
            };
        }
        if (provider === 'google_paid') {
            return {
                content: result.candidates[0].content.parts[0].text,
                usage: null
            };
        }
    } catch (error) {
        console.error(Error parsing \ response:, error, result);
        return { content: 'API 응답을 파싱하는 중 오류가 발생했습니다.', usage: null };
    }
    return { content: '알 수 없는 제공사입니다.', usage: null };
}
