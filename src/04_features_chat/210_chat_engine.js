/* --- Ailey & Bailey Canvas --- */
// File: 210_chat_engine.js
// Version: 8.3 (UI Polish)
// Description: Changed loading placeholder text.

function checkStreamCompletions() {
    let changed = false;
    for (const sessionId in activeStreams) {
        const stream = activeStreams[sessionId];
        if (!stream.isComplete) {
            const elapsed = (Date.now() - stream.startTime) / 1000;
            const estimatedDuration = stream.content.length / CHAR_PER_SECOND + 0.5;
            if (elapsed > estimatedDuration) {
                trace("System", "StreamTimeout", { sessionId: sessionId.substring(0,5) }, {}, "WARN");
                stream.isComplete = true;
                delete activeStreams[sessionId];
                changed = true;
            }
        }
    }
    if (changed) {
        renderSidebarContent();
    }
}

async function handleQuickQuerySend() {
    if (!quickQueryInput) return;
    await handleChatSend({ inputElement: quickQueryInput });
}

async function handleChatSend({ inputElement }) {
    const isQuickQuery = inputElement && inputElement.id === 'quick-query-input';
    const element = inputElement || chatInput;
    if (!element || element.disabled) return;

    let hiddenContext = null;
    if (stagedHiddenContext) {
        hiddenContext = stagedHiddenContext;
        stagedHiddenContext = null;
    }

    const queryText = element.value.trim();
    if (!queryText && !attachedFile) return;

    let userMessage = {
        role: 'user',
        content: queryText,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (attachedFile) {
        userMessage.attachment = { ...attachedFile };
        userMessage.displayName = queryText;
        if (attachedFile.type === 'text') {
            userMessage.content = `${queryText}\n\n--- ATTACHED FILE: ${attachedFile.name} ---\n${attachedFile.content}`;
        }
    }

    if (element) {
        element.value = '';
        // [ADDED] Reset height after send
        autoResizeTextarea(element);
    }
    removeAttachment();

    const tempUserMessageForUI = { ...userMessage, timestamp: new Date() };

    if (currentSessionId === 'temporary-chat' || (isQuickQuery && isQuickQueryTempMode)) {
        temporarySession.messages.push(tempUserMessageForUI);
        renderNewMessages([tempUserMessageForUI]);
        await sendQueryToAI(tempUserMessageForUI, [...temporarySession.messages], 'temporary-chat', true, isQuickQuery, hiddenContext);
        return;
    }

    try {
        let sessionIdToUse;
        let historyForApi;

        if (!currentSessionId) {
            const title = userMessage.displayName || userMessage.content;
            const newSessionData = {
                title: title.substring(0, 40) + (title.length > 40 ? '...' : ''),
                projectId: null, isPinned: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                contextSent: !!hiddenContext
            };
            const sessionRef = await chatSessionsCollectionRef.add(newSessionData);
            sessionIdToUse = sessionRef.id;
            await chatSessionsCollectionRef.doc(sessionIdToUse).collection("messages").add(userMessage);
            historyForApi = [userMessage];
            if (!isQuickQuery) await selectSession(sessionIdToUse);
            else renderSidebarContent();
        } else {
            sessionIdToUse = currentSessionId;
            const currentSession = localChatSessionsCache.find(s => s.id === sessionIdToUse);
            if (hiddenContext && currentSession && currentSession.contextSent) {
                hiddenContext = null;
            }
            const batch = db.batch();
            const sessionDocRef = chatSessionsCollectionRef.doc(sessionIdToUse);
            const messageDocRef = sessionDocRef.collection("messages").doc();
            batch.set(messageDocRef, userMessage);
            const updateData = { updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
            if (hiddenContext) updateData.contextSent = true;
            batch.update(sessionDocRef, updateData);
            await batch.commit();
            historyForApi = (await fetchPastMessages(sessionIdToUse, null)).slice(0, 20).reverse();
        }
        sendQueryToAI(userMessage, historyForApi, sessionIdToUse, false, isQuickQuery, hiddenContext);
    } catch (error) {
        console.error("Failed to prepare session or send message:", error);
        trace("Firestore", "handleChatSend.error", { error: error.message }, {}, "ERROR");
        alert("메시지를 보내는 데 실패했습니다.");
        if(chatInput) { chatInput.disabled = false; chatInput.placeholder = "Ailey & Bailey에게 질문하기..."; }
        if(chatSendBtn) chatSendBtn.disabled = false;
    }
}

function getMimeTypeFromDataUrl(dataUrl) {
    if (!dataUrl) return 'application/octet-stream';
    return dataUrl.substring(dataUrl.indexOf(":") + 1, dataUrl.indexOf(";"));
}

function getBase64FromDataUrl(dataUrl) {
    if (!dataUrl) return '';
    return dataUrl.substring(dataUrl.indexOf(",") + 1);
}

async function sendQueryToAI(userMessage, history, sessionId, isTemporary = false, fromQuickQuery = false, hiddenContext = null) {
    const inputToManage = fromQuickQuery ? quickQueryInput : chatInput;
    const buttonToManage = fromQuickQuery ? quickQuerySendBtn : chatSendBtn;

    if (inputToManage) inputToManage.disabled = true;
    if (buttonToManage) buttonToManage.disabled = true;
    if (!fromQuickQuery && chatInput) chatInput.placeholder = "생각중...";

    if (!isTemporary) {
        pendingResponses.add(sessionId);
        renderSidebarContent();
    }

    if (currentSessionId === sessionId) {
        renderNewMessages([{ role: 'ai', status: 'loading', id: sessionId }]);
    }

    const startTime = performance.now();
    try {
        let aiRes;
        let usageData = null;
        const providerForLog = userApiSettings.provider || 'default_google';
        const modelForLog = userApiSettings.provider ? userApiSettings.selectedModel : (localStorage.getItem('selectedAiModel') || defaultModel);

        let systemInstruction = "You are Ailey. ...";
        if (activePromptId) {
            const template = promptTemplatesCache.find(t => t.id === activePromptId);
            if (template && template.promptText) systemInstruction = template.promptText;
        }
        const contextForApi = hiddenContext ? [{ role: 'user', parts: [{ text: `Here is the full context...\n${hiddenContext}` }] }, { role: 'model', parts: [{ text: "알겠습니다." }] }] : [];
        
        // [UNIFIED DATA PREP]
        const historyForApi = [
             { role: 'user', parts: [{ text: systemInstruction }] },
             { role: 'model', parts: [{ text: "알겠습니다." }] },
             ...contextForApi,
             ...history.map(m => {
                const parts = [];
                const textContent = m.content;
                if (textContent) { parts.push({ text: textContent }); }
                if (m.attachment?.type === 'image') {
                    parts[0] = { text: m.displayName || m.content };
                    parts.push({ inlineData: { mimeType: getMimeTypeFromDataUrl(m.attachment.content), data: getBase64FromDataUrl(m.attachment.content) } });
                } else if (m.attachment?.type === 'pdf') {
                    parts[0] = { text: m.displayName || m.content };
                    parts.push({ inlineData: { mimeType: 'application/pdf', data: getBase64FromDataUrl(m.attachment.content) } });
                }
                return { role: m.role === 'user' ? 'user' : 'model', parts: parts.length > 0 ? parts : [{ text: '' }] };
            })
        ];

        trace("API.Request", "sendQueryToAI.Pre-flight", { provider: providerForLog, model: modelForLog, history: history.length, attachment: !!userMessage.attachment, context: !!hiddenContext, temp: isTemporary }, { sessionId: sessionId });

        if (userApiSettings.provider && userApiSettings.apiKey) {
            trace("API.Route", "Using personal API key path");
            const { url, options } = buildApiRequest(userApiSettings.provider, modelForLog, historyForApi, userApiSettings.maxOutputTokens);
            const res = await fetch(url, options);
            if (!res.ok) {
                const errorBody = await res.text();
                throw new Error(`${userApiSettings.provider} API Error ${res.status}: ${errorBody}`);
            }
            const result = await res.json();
            const parsed = parseApiResponse(userApiSettings.provider, result);
            aiRes = parsed.content;
            usageData = parsed.usage;
        } else {
            trace("API.Route", "Using default (public) API key path");
            const generationConfig = { stopSequences: [], maxOutputTokens: Number(userApiSettings.maxOutputTokens) || 65536 };
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelForLog}:generateContent?key=`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: historyForApi, generationConfig }) });
            if (!res.ok) throw new Error(`Google API Error ${res.status}`);
            const result = await res.json();
            aiRes = result.candidates?.[0]?.content?.parts?.[0]?.text || "답변을 가져올 수 없습니다.";
        }

        if (usageData && userApiSettings.tokenUsage) {
            userApiSettings.tokenUsage.prompt += usageData.prompt;
            userApiSettings.tokenUsage.completion += usageData.completion;
            saveUserSettingsToFirebase(true);
        }
        
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        const aiMessage = { role: 'ai', content: aiRes, timestamp: firebase.firestore.FieldValue.serverTimestamp(), duration: duration };
        const aiMessageForUI = { ...aiMessage, timestamp: new Date() };

        activeStreams[sessionId] = { startTime: Date.now(), content: aiMessage.content, duration: aiMessage.duration, isComplete: false, isRendering: false };

        if (isTemporary) {
            temporarySession.messages.push(aiMessageForUI);
            if (hiddenContext) temporarySession.contextSent = true;
            if (currentSessionId === 'temporary-chat') {
                renderFinalMessage(aiMessageForUI, 'temporary-chat');
            } else if (fromQuickQuery) {
                showToastNotification("임시 답변 도착!", aiMessage.content.substring(0, 50) + "...", `temp-response-${Date.now()}`);
            }
        } else {
            const batch = db.batch();
            const sessionDocRef = chatSessionsCollectionRef.doc(sessionId);
            const messageDocRef = sessionDocRef.collection("messages").doc();
            batch.set(messageDocRef, aiMessage);
            batch.update(sessionDocRef, { updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
            await batch.commit();

            if (currentSessionId !== sessionId) {
                completedButUnseenResponses.add(sessionId);
                renderSidebarContent();
                const sessionData = localChatSessionsCache.find(s => s.id === sessionId);
                showToastNotification("새로운 답변이 도착했습니다.", sessionData?.title || "이전 대화", sessionId);
            }
            if (fromQuickQuery) {
                const sessionForToast = localChatSessionsCache.find(s => s.id === sessionId);
                const titleForToast = sessionForToast ? sessionForToast.title : "새 대화";
                showToastNotification("✅ 질문이 전송되었습니다.", `'${titleForToast}'에 저장됨`, sessionId);
            }
        }
    } catch (e) {
        console.error("Chat send error:", e);
        trace("API.Request", "sendQueryToAI.Error", { error: e.message }, { sessionId: sessionId }, "ERROR");
        const errorMessage = { role: 'ai', content: 'API 오류가 발생했습니다: ' + e.message, timestamp: new Date() };
        if (isTemporary) {
            temporarySession.messages.push(errorMessage);
            if (currentSessionId === 'temporary-chat') {
                 renderFinalMessage(errorMessage, 'temporary-chat');
            } else if (fromQuickQuery) {
                 showToastNotification("❌ 임시 질문 실패", e.message, `temp-error-${Date.now()}`);
            }
        } else if (chatSessionsCollectionRef && sessionId) {
           const errorForDb = { ...errorMessage, timestamp: firebase.firestore.FieldValue.serverTimestamp() };
           await chatSessionsCollectionRef.doc(sessionId).collection("messages").add(errorForDb);
        }
    } finally {
        if (inputToManage) {
            inputToManage.disabled = false;
            if (document.hasFocus()) {
                inputToManage.focus();
            }
        }
        if (buttonToManage) buttonToManage.disabled = false;
        if (!fromQuickQuery && chatInput) chatInput.placeholder = "Ailey & Bailey에게 질문하기...";

        if (!isTemporary) {
            pendingResponses.delete(sessionId);
            renderSidebarContent();
        }
    }
}

function buildApiRequest(provider, model, messages, maxTokens) {
    // [CORE FIX] This function now receives the fully-processed `apiContents` array.
    // It is responsible for wrapping it in the provider-specific final payload.
    if (provider === 'openai') { 
        // OpenAI needs a flat [{role, content}] structure
        const openAiMessages = messages.map(msg => ({
             role: msg.role === 'model' ? 'assistant' : msg.role, 
             content: msg.parts.map(p => p.text).join('\n')
        }));
        return { url: 'https://api.openai.com/v1/chat/completions', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + userApiSettings.apiKey }, body: JSON.stringify({ model: model, messages: openAiMessages, max_tokens: Number(maxTokens) || 65536 }) } }; 
    }
    else if (provider === 'anthropic') { 
        const anthropicMessages = messages.map(msg => ({
             role: msg.role === 'model' ? 'assistant' : msg.role, 
             content: msg.parts.map(p => p.text).join('\n')
        }));
        return { url: 'https://api.anthropic.com/v1/messages', options: { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': userApiSettings.apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: model, messages: anthropicMessages, max_tokens: Number(maxTokens) || 65536 }) } }; 
    }
    else if (provider === 'google_paid') { 
        // The `messages` array is already in the google `contents` format.
        return { url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${userApiSettings.apiKey}`, options: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: messages, generationConfig: { maxOutputTokens: Number(maxTokens) || 65536 } }) } }; }
    throw new Error('Unsupported provider: ' + provider);
}

function parseApiResponse(provider, result) {
    try {
        if (provider === 'openai') { return { content: result.choices[0].message.content, usage: { prompt: result.usage.prompt_tokens, completion: result.usage.completion_tokens } }; }
        else if (provider === 'anthropic') { return { content: result.content[0].text, usage: { prompt: result.usage.input_tokens, completion: result.usage.output_tokens } }; }
        else if (provider === 'google_paid') { return { content: result.candidates[0].content.parts[0].text, usage: null }; }
    } catch (error) { console.error(`Error parsing ${provider} response:`, error, result); return { content: 'API 응답을 파싱하는 중 오류가 발생했습니다.', usage: null }; }
    return { content: '알 수 없는 제공사입니다.', usage: null };
}