/* --- FILE: /scripts/utils/10_utils_helpers.js --- */
function getRelativeDateGroup(timestamp, isPinned = false) {
    if (isPinned) {
        return { key: 0, label: '📌 고정됨' };
    }

    if (!timestamp) {
        return { key: 99, label: '날짜 정보 없음' };
    }

    const now = new Date();
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    
    now.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const diffTime = now.getTime() - date.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays < 1) return { key: 1, label: '오늘' };
    if (diffDays < 2) return { key: 2, label: '어제' };
    if (diffDays < 7) return { key: 3, label: '지난 7일' };

    const nowMonth = now.getMonth();
    const dateMonth = date.getMonth();
    const nowYear = now.getFullYear();
    const dateYear = date.getFullYear();

    if (nowYear === dateYear && nowMonth === dateMonth) {
        return { key: 4, label: '이번 달' };
    }

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    if (dateYear === lastMonth.getFullYear() && dateMonth === lastMonth.getMonth()) {
         return { key: 5, label: '지난 달' };
    }

    return { key: 6 + (nowYear - dateYear) * 12 + (nowMonth - dateMonth), label: `${dateYear}년 ${dateMonth + 1}월` };
}

function clearTimers(blockId) {
    if (activeTimers[blockId]) {
        activeTimers[blockId].forEach(clearInterval);
        delete activeTimers[blockId];
    }
}

function startSummaryAnimation(blockElement, reasoningSteps) {
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
                }, 500); 
                 if (!activeTimers[blockId]) activeTimers[blockId] = [];
                 activeTimers[blockId].push(fadeTimer);
            }, 2000); 
             if (!activeTimers[blockId]) activeTimers[blockId] = [];
             activeTimers[blockId].push(waitTimer);
        });
    };
    
    cycleSummary();
    const summaryInterval = setInterval(cycleSummary, 4000); 
    if (!activeTimers[blockId]) activeTimers[blockId] = [];
    activeTimers[blockId].push(summaryInterval);
}

function typewriterEffect(element, text, onComplete) {
    if (!element || !text) {
        if (onComplete) onComplete();
        return;
    }

    element.innerHTML = '';
    element.classList.add('blinking-cursor');
    let i = 0;
    const blockId = element.closest('.reasoning-block')?.id;
    
    const typingInterval = setInterval(() => {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
        } else {
            clearInterval(typingInterval);
            element.classList.remove('blinking-cursor');
            if (onComplete) onComplete();
        }
    }, 30); 

    if (blockId && activeTimers[blockId]) {
        activeTimers[blockId].push(typingInterval);
    } else {
        // Fallback for elements not in a managed block, though this is less ideal.
    }
}