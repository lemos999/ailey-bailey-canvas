
// --- [MAJOR REFACTOR & ADDITION] Chat Send Logic with State-Based Rendering ---
async function handleChatSend() {
    if (!chatInput || chatInput.disabled) return;
    const query = chatInput.value.trim();
    if (!query) return;

    chatInput.value = '';
    chatInput.style.height = 'auto';
    chatInput.disabled = true;
    chatSendBtn.disabled = true;

    const userMessage = {
        role: 'user',
        content: query,
        timestamp: new Date()
    };
    const loadingMessage = {
        role: 'ai',
        status: 'loading',
        id: `loading-${Date.now()}`
    };
    let sessionRef;
    let currentMessages = [];
    let isNewSession = false;

    if (!currentSessionId) {
        isNewSession = true;
        const activeProject = document.querySelector('.project-header.active-drop-target');
        const newSessionProjectId = activeProject ? activeProject.closest('.project-container').dataset.projectId : null;
        if (chatWelcomeMessage) chatWelcomeMessage.style.display = 'none';
        if (chatMessages) chatMessages.style.display = 'flex';
        currentMessages = [userMessage, loadingMessage];
        // Render immediately with loading state
        renderChatMessages({
            messages: currentMessages
        });

        const newSession = {
            title: query.substring(0, 40) + (query.length > 40 ? '...' : ''),
            messages: [userMessage], // Start with only the user message in Firestore
            mode: selectedMode,
            projectId: newSessionProjectId,
            isPinned: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        sessionRef = await chatSessionsCollectionRef.add(newSession);
        currentSessionId = sessionRef.id;
    } else {
        sessionRef = chatSessionsCollectionRef.doc(currentSessionId);
        const currentSessionData = localChatSessionsCache.find(s => s.id === currentSessionId);
        currentMessages = [...(currentSessionData.messages || []), userMessage, loadingMessage];
        // Render immediately with loading state
        renderChatMessages({
            messages: currentMessages
        });

        await sessionRef.update({
            messages: firebase.firestore.FieldValue.arrayUnion(userMessage),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    const startTime = performance.now();
    try {
        let aiRes, usageData;
        // The API call logic remains the same
        const historyForApi = isNewSession ? [userMessage] : localChatSessionsCache.find(s => s.id === currentSessionId)?.messages || [userMessage];

        if (userApiSettings.provider && userApiSettings.apiKey && userApiSettings.selectedModel) {
            const requestDetails = buildApiRequest(userApiSettings.provider, userApiSettings.selectedModel, historyForApi, userApiSettings.maxOutputTokens);
            const res = await fetch(requestDetails.url, requestDetails.options);
            if (!res.ok) {
                const errorBody = await res.text();
                throw new Error(`API Error ${res.status}: ${errorBody}`);
            }
            const result = await res.json();
            const parsed = parseApiResponse(userApiSettings.provider, result);
            aiRes = parsed.content;
            usageData = parsed.usage;
            if (usageData) {
                userApiSettings.tokenUsage.prompt += usageData.prompt;
                userApiSettings.tokenUsage.completion += usageData.completion;
                saveApiSettings(false);
            }
        } else {
            let promptWithReasoning;
            const lastUserMessage = historyForApi[historyForApi.length - 1].content;
            promptWithReasoning = `You are Ailey. Based on the following query, provide a step-by-step reasoning process if the query is complex. For simple queries, omit the reasoning part. The reasoning, if present, must follow the format: [REASONING_START]SUMMARY:{one-line summary}|||DETAIL:{detailed explanation}SUMMARY:{another summary}|||DETAIL:{another detail}[REASONING_END]. The final answer should be in a friendly, informal Korean tone. Query: "${lastUserMessage}"`;
            const apiMessages = [{
                role: 'user',
                parts: [{
                    text: promptWithReasoning
                }]
            }];
            const selectedDefaultModel = localStorage.getItem('selectedAiModel') || defaultModel;
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedDefaultModel}:generateContent?key=`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: apiMessages
                })
            });
            if (!res.ok) throw new Error(`Google API Error ${res.status}`);
            const result = await res.json();
            aiRes = result.candidates?.[0]?.content?.parts?.[0]?.text || "답변을 가져올 수 없습니다.";
        }

        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        const aiMessage = {
            role: 'ai',
            content: aiRes,
            timestamp: new Date(),
            duration: duration
        };

        await sessionRef.update({
            messages: firebase.firestore.FieldValue.arrayUnion(aiMessage),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // The listener will pick up the change and re-render automatically.

    } catch (e) {
        console.error("Chat send error:", e);
        const errorMessage = {
            role: 'ai',
            content: `API 오류가 발생했습니다: ${e.message}`,
            timestamp: new Date()
        };
        await sessionRef.update({
            messages: firebase.firestore.FieldValue.arrayUnion(errorMessage)
        });
    } finally {
        chatInput.disabled = false;
        chatSendBtn.disabled = false;
        chatInput.focus();
        if (isNewSession) {
            renderSidebarContent();
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
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userApiSettings.apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: history,
                    max_tokens: Number(maxTokens) || 2048
                })
            }
        };
    } else if (provider === 'anthropic') {
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
    } else if (provider === 'google_paid') {
        const googleHistory = messages.map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{
                text: msg.content
            }]
        }));
        return {
            url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${userApiSettings.apiKey}`,
            options: {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: googleHistory,
                    generationConfig: {
                        maxOutputTokens: Number(maxTokens) || 2048
                    }
                })
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
                usage: {
                    prompt: result.usage.prompt_tokens,
                    completion: result.usage.completion_tokens
                }
            };
        } else if (provider === 'anthropic') {
            return {
                content: result.content[0].text,
                usage: {
                    prompt: result.usage.input_tokens,
                    completion: result.usage.output_tokens
                }
            };
        } else if (provider === 'google_paid') {
            return {
                content: result.candidates[0].content.parts[0].text,
                usage: null
            };
        }
    } catch (error) {
        console.error(`Error parsing ${provider} response:`, error, result);
        return {
            content: 'API 응답을 파싱하는 중 오류가 발생했습니다.',
            usage: null
        };
    }
    return {
        content: '알 수 없는 제공사입니다.',
        usage: null
    };
}
