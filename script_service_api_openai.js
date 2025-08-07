/*
--- Ailey & Bailey Canvas ---
File: script_service_api_openai.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 2: SERVICE] OpenAI API와의 통신(요청/응답 처리)을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const OpenAiApiService = {
        async fetchModels(apiKey) {
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (!response.ok) {
                throw new Error('OpenAI 서버에서 모델 목록을 가져올 수 없습니다.');
            }
            const data = await response.json();
            return data.data.filter(m => m.id.includes('gpt')).map(m => m.id).sort().reverse();
        },

        buildRequest(model, messages, maxTokens, apiKey) {
            const history = messages.map(msg => ({
                role: msg.role === 'ai' ? 'assistant' : 'user',
                content: msg.content
            }));
            return {
                url: 'https://api.openai.com/v1/chat/completions',
                options: {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                    body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 })
                }
            };
        },

        parseResponse(result) {
            try {
                return {
                    content: result.choices[0].message.content,
                    usage: {
                        prompt: result.usage.prompt_tokens,
                        completion: result.usage.completion_tokens
                    }
                };
            } catch (error) {
                console.error("OpenAI 응답 파싱 오류:", error, result);
                return { content: 'API 응답을 파싱하는 중 오류가 발생했습니다.', usage: null };
            }
        }
    };

    // 전역 네임스페이스에 서비스 등록
    window.Services = window.Services || {};
    window.Services.Api = window.Services.Api || {};
    window.Services.Api.openai = OpenAiApiService;

})(window);