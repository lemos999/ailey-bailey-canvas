/*
--- Ailey & Bailey Canvas ---
File: script_service_api_google.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 2: SERVICE] Google (Gemini) API와의 통신을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const GoogleApiService = {
        async fetchModels(apiKey) {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            if (!response.ok) {
                throw new Error('Google 서버에서 모델 목록을 가져올 수 없습니다.');
            }
            const data = await response.json();
            return data.models.map(m => m.name.replace('models/', '')).filter(m => m.includes('gemini'));
        },

        buildRequest(model, messages, maxTokens, apiKey) {
            const googleHistory = messages.map(msg => ({
                role: msg.role === 'ai' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));
            return {
                url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                options: {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: googleHistory,
                        generationConfig: { maxOutputTokens: Number(maxTokens) || 2048 }
                    })
                }
            };
        },

        parseResponse(result) {
            try {
                return {
                    content: result.candidates[0].content.parts[0].text,
                    // Google API는 응답에서 토큰 사용량을 제공하지 않습니다.
                    usage: null
                };
            } catch (error) {
                console.error("Google 응답 파싱 오류:", error, result);
                return { content: 'API 응답을 파싱하는 중 오류가 발생했습니다.', usage: null };
            }
        }
    };

    // 전역 네임스페이스에 서비스 등록
    window.Services = window.Services || {};
    window.Services.Api = window.Services.Api || {};
    window.Services.Api.google = GoogleApiService;

})(window);