/*
--- Ailey & Bailey Canvas ---
File: script_service_api_settings.js
Version: 1.0 (Atomic Responsibility Architecture)
Architect: [Username] & System Architect Ailey
Description: [LAYER 2: SERVICE] API 설정 모달의 상태 관리 및 키 검증 로직을 책임집니다.
---
*/

(function(window) {
    'use strict';

    const ApiSettingsService = {
        load() {
            const savedSettings = localStorage.getItem('userApiSettings');
            if (savedSettings) {
                userApiSettings = JSON.parse(savedSettings);
                if (!userApiSettings.tokenUsage) { userApiSettings.tokenUsage = { prompt: 0, completion: 0 }; }
                if (!userApiSettings.availableModels) { userApiSettings.availableModels = []; }
            } else {
                // 기본값으로 초기화
                userApiSettings = { provider: null, apiKey: '', selectedModel: '', availableModels: [], maxOutputTokens: 2048, tokenUsage: { prompt: 0, completion: 0 } };
            }
        },

        save() {
            localStorage.setItem('userApiSettings', JSON.stringify(userApiSettings));
            // UI 업데이트 로직은 다른 모듈에서 처리합니다.
        },

        detectProvider(key) {
            if (key.startsWith('sk-ant-api')) return 'anthropic';
            if (key.startsWith('sk-')) return 'openai';
            if (key.length > 35 && key.startsWith('AIza')) return 'google';
            return null;
        },

        async fetchAvailableModels(provider, key) {
            const service = window.Services.Api[provider];
            if (service && typeof service.fetchModels === 'function') {
                return await service.fetchModels(key);
            }
            throw new Error(`${provider} 서비스의 모델 로드 기능이 정의되지 않았습니다.`);
        },

        resetTokenUsage() {
             userApiSettings.tokenUsage = { prompt: 0, completion: 0 };
             this.save();
        }
    };

    // 전역 네임스페이스에 서비스 등록
    window.Services = window.Services || {};
    window.Services.ApiSettings = ApiSettingsService;

})(window);