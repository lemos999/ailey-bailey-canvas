/*
--- Ailey & Bailey Canvas ---
File: script_service_api_anthropic.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 2: SERVICE] Anthropic (Claude) API와의 통신을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const AnthropicApiService = {
        fetchModels(apiKey) {
            // Anthropic은 모델 목록을 가져오는 API를 제공하지 않으므로, 주요 모델을 하드코딩합니다.
            return Promise.resolve([
                'claude-3-opus-20240229',
                'claude-3-sonnet-20240229',
                'claude-3-haiku-20240307',
                'claude-2.1'
            ]);
        },

        buildRequest(model, messages, maxTokens, apiKey) {
            const history = messages.map(msg => ({
                role: msg.role === 'ai' ? 'assistant' : 'user',
                content: msg.content
            }));
            return {
                url: 'https://api.anthropic.com/v1/messages',
                options: {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 })
                }
            };
        },

        parseResponse(result) {
            try {
                return {
                    content: result.content[0].text,
                    usage: {
                        prompt: result.usage.input_tokens,
                        completion: result.usage.output_tokens
                    }
                };
            } catch (error) {
                console.error("Anthropic 응답 파싱 오류:", error, result);
                return { content: 'API 응답을 파싱하는 중 오류가 발생했습니다.', usage: null };
            }
        }
    };

    // 전역 네임스페이스에 서비스 등록
    window.Services = window.Services || {};
    window.Services.Api = window.Services.Api || {};
    window.Services.Api.anthropic = AnthropicApiService;

})(window);