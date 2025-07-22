/*
--- Ailey & Bailey Canvas ---
File: api-handler.js
Version: 12.0 (Chat Module Refactor)
Architect: [Username] & System Architect CodeMaster
Description: This module is responsible for all interactions with external AI APIs. It handles sending chat messages, constructing API requests, and parsing the responses.
*/

import { state } from './state.js';
import { renderChatMessages } from './chat-ui.js';
import { saveApiSettings } from './api-settings.js';
import { renderSidebarContent } from './chat-ui.js';

let chatInput, chatSendBtn, chatWelcomeMessage, chatMessages;

function queryElements() {
    chatInput = document.getElementById('chat-input');
    chatSendBtn = document.getElementById('chat-send-btn');
    chatWelcomeMessage = document.getElementById('chat-welcome-message');
    chatMessages = document.getElementById('chat-messages');
}

export function initializeApiHandler() {
    queryElements();
}

export async function handleChatSend() {
    if (!chatInput || chatInput.disabled) return;
    const query = chatInput.value.trim();
    if (!query) return;

    chatInput.value = '';
    chatInput.style.height = 'auto';
    chatInput.disabled = true;
    chatSendBtn.disabled = true;

    const userMessage = { role: 'user', content: query, timestamp: firebase.firestore.FieldValue.serverTimestamp() };
    const loadingMessage = { role: 'ai', status: 'loading', id: `loading-${Date.now()}` };
    let sessionRef;
    let isNewSession = false;

    if (!state.currentSessionId) {
        isNewSession = true;
        const activeProject = document.querySelector('.project-header.active-drop-target');
        const newSessionProjectId = activeProject ? activeProject.closest('.project-container').dataset.projectId : null;
        if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
        if (chatMessages) chatMessages.style.display = 'flex';
        
        // Temporarily convert server timestamp to a Date object for immediate rendering
        const displayUserMessage = { ...userMessage, timestamp: new Date() };
        renderChatMessages({ messages: [displayUserMessage, loadingMessage] });
        
        const newSessionData = {
            title: query.substring(0, 40) + (query.length > 40 ? '...' : ''),
            messages: [userMessage],
            mode: state.selectedMode,
            projectId: newSessionProjectId,
            isPinned: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        sessionRef = await state.chatSessionsCollectionRef.add(newSessionData);
        state.currentSessionId = sessionRef.id;
    } else {
        sessionRef = state.chatSessionsCollectionRef.doc(state.currentSessionId);
        const currentSessionData = state.localChatSessionsCache.find(s => s.id === state.currentSessionId);
        
        const displayMessages = (currentSessionData.messages || []).map(m => ({ ...m, timestamp: m.timestamp?.toDate() }));
        displayMessages.push({ ...userMessage, timestamp: new Date() }, loadingMessage);
        renderChatMessages({ messages: displayMessages });
        
        await sessionRef.update({
            messages: firebase.firestore.FieldValue.arrayUnion(userMessage),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
    
    const startTime = performance.now();
    try {
        const currentSessionData = state.localChatSessionsCache.find(s => s.id === state.currentSessionId);
        // The last message is the one we just added, so we include it.
        const historyForApi = (currentSessionData?.messages || []).concat(userMessage)
                                .map(m => ({ role: m.role, content: m.content }));

        let aiRes, usageData;
        
        if (state.userApiSettings.provider && state.userApiSettings.apiKey && state.userApiSettings.selectedModel) {
            // Paid API logic
            const requestDetails = buildApiRequest(state.userApiSettings.provider, state.userApiSettings.selectedModel, historyForApi, state.userApiSettings.maxOutputTokens);
            const res = await fetch(requestDetails.url, requestDetails.options);
            if (!res.ok) { const errorBody = await res.text(); throw new Error(`API Error ${res.status}: ${errorBody}`); }
            const result = await res.json();
            const parsed = parseApiResponse(state.userApiSettings.provider, result);
            aiRes = parsed.content;
            usageData = parsed.usage;
            if (usageData) { 
                state.userApiSettings.tokenUsage.prompt += usageData.prompt;
                state.userApiSettings.tokenUsage.completion += usageData.completion;
                saveApiSettings(false); // Save without closing modal
            }
        } else {
            // Default Google API logic
            const prompt = `Based on the following query, provide a step-by-step reasoning process if it is complex. The reasoning must be encapsulated within [REASONING_START] and [REASONING_END] tags. Each step must follow the format: SUMMARY:{one-line summary}|||DETAIL:{detailed explanation}. For simple queries, omit the reasoning part. The final answer should be in a friendly, informal Korean tone. Query: "${query}"`;
            const apiMessages = [{ role: 'user', parts: [{ text: prompt }] }];
            const selectedDefaultModel = localStorage.getItem('selectedAiModel') || 'gemini-1.5-flash-latest';
            const GOOGLE_API_KEY = typeof __google_api_key !== 'undefined' ? __google_api_key : null;
            if (!GOOGLE_API_KEY) throw new Error("Default API Key is not configured.");
            
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedDefaultModel}:generateContent?key=${GOOGLE_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: apiMessages })
            });
            if (!res.ok) throw new Error(`Google API Error ${res.status}`);
            const result = await res.json();
            aiRes = result.candidates?.[0]?.content?.parts?.[0]?.text || "답변을 가져올 수 없습니다.";
        }
        
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        const aiMessage = { role: 'ai', content: aiRes, timestamp: firebase.firestore.FieldValue.serverTimestamp(), duration: duration };
        
        await sessionRef.update({
            messages: firebase.firestore.FieldValue.arrayUnion(aiMessage),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

    } catch (e) {
        console.error("Chat send error:", e);
        const errorMessage = { role: 'ai', content: `API 오류가 발생했습니다: ${e.message}`, timestamp: firebase.firestore.FieldValue.serverTimestamp() };
        await sessionRef.update({ messages: firebase.firestore.FieldValue.arrayUnion(errorMessage) });
    } finally {
        chatInput.disabled = false;
        chatSendBtn.disabled = false;
        chatInput.focus();
        if (isNewSession) {
            renderSidebarContent(); // Update sidebar to show the new session
        }
    }
}

function buildApiRequest(provider, model, messages, maxTokens) {
    const history = messages.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.content
    }));

    if (provider === 'openai') {
        return {
            url: 'https://api.openai.com/v1/chat/completions',
            options: {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.userApiSettings.apiKey}` },
                body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 })
            }
        };
    } else if (provider === 'anthropic') {
         return {
             url: 'https://api.anthropic.com/v1/messages',
             options: {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json', 'x-api-key': state.userApiSettings.apiKey, 'anthropic-version': '2023-06-01' },
                 body: JSON.stringify({ model: model, messages: history, max_tokens: Number(maxTokens) || 2048 })
             }
         };
    } else if (provider === 'google_paid') {
        const googleHistory = messages.map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));
        return {
            url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${state.userApiSettings.apiKey}`,
            options: {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: googleHistory, generationConfig: { maxOutputTokens: Number(maxTokens) || 2048 } })
            }
        };
    }
    throw new Error(`Unsupported provider: ${provider}`);
}

function parseApiResponse(provider, result) {
    try {
        if (provider === 'openai') {
            return {
                content: result.choices[0].message.content,
                usage: { prompt: result.usage.prompt_tokens, completion: result.usage.completion_tokens }
            };
        }
        else if (provider === 'anthropic') {
            return {
                content: result.content[0].text,
                usage: { prompt: result.usage.input_tokens, completion: result.usage.output_tokens }
            };
        }
        else if (provider === 'google_paid') {
            return {
                content: result.candidates[0].content.parts[0].text,
                usage: null // Google's API response for this endpoint doesn't provide token usage details.
            };
        }
    } catch (error) {
        console.error(`Error parsing ${provider} response:`, error, result);
        return { content: 'API 응답을 파싱하는 중 오류가 발생했습니다.', usage: null };
    }
    return { content: '알 수 없는 제공사입니다.', usage: null };
}