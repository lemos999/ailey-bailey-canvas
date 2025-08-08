/*
--- Ailey & Bailey Canvas ---
File: 011_utils_helpers.js
Version: 1.0 (Bundled)
Description: Contains generic, reusable UI helper functions.
*/

function updateClock() { 
    const clockElement = document.getElementById('real-time-clock'); 
    if (!clockElement) return; 
    const now = new Date(); 
    const options = { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }; 
    clockElement.textContent = now.toLocaleString('ko-KR', options); 
}

function setupSystemInfoWidget() { 
    if (!systemInfoWidget || !currentUser) return; 
    const canvasIdDisplay = document.getElementById('canvas-id-display'); 
    if (canvasIdDisplay) { 
        canvasIdDisplay.textContent = canvasId.substring(0, 8) + '...'; 
    } 
    const copyBtn = document.getElementById('copy-canvas-id'); 
    if (copyBtn) { 
        copyBtn.addEventListener('click', () => { 
            navigator.clipboard.writeText(canvasId).then(() => { 
                copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" /></svg>'; 
                setTimeout(() => { 
                    copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" /></svg>'; 
                }, 1500); 
            }); 
        }); 
    } 
    const tooltip = document.createElement('div'); 
    tooltip.className = 'system-tooltip'; 
    tooltip.innerHTML = `<div><strong>Canvas ID:</strong> ${canvasId}</div><div><strong>User ID:</strong> ${currentUser.uid}</div>`; 
    systemInfoWidget.appendChild(tooltip); 
}

function initializeTooltips() { 
    document.querySelectorAll('.keyword-chip[data-tooltip]').forEach(chip => { 
        if (chip.querySelector('.tooltip')) { 
            chip.classList.add('has-tooltip'); 
            chip.querySelector('.tooltip').textContent = chip.dataset.tooltip; 
        } 
    }); 
    document.querySelectorAll('.content-section strong[data-tooltip]').forEach(highlight => { 
        if(!highlight.querySelector('.tooltip')) { 
            highlight.classList.add('has-tooltip'); 
            const tooltipElement = document.createElement('span'); 
            tooltipElement.className = 'tooltip'; 
            tooltipElement.textContent = highlight.dataset.tooltip; 
            highlight.appendChild(tooltipElement); 
        } 
    }); 
}

function makePanelDraggable(panelElement) { 
    if(!panelElement) return; 
    const header = panelElement.querySelector('.panel-header'); 
    if(!header) return; 
    let isDragging = false, offset = { x: 0, y: 0 }; 
    const onMouseMove = (e) => { 
        if (isDragging) { 
            panelElement.style.left = (e.clientX + offset.x) + 'px'; 
            panelElement.style.top = (e.clientY + offset.y) + 'px'; 
        } 
    }; 
    const onMouseUp = () => { 
        isDragging = false; 
        panelElement.classList.remove('is-dragging'); 
        document.removeEventListener('mousemove', onMouseMove); 
        document.removeEventListener('mouseup', onMouseUp); 
    }; 
    header.addEventListener('mousedown', e => { 
        if (e.target.closest('button, input, select, .close-btn, #delete-session-btn, #chat-mode-selector, #api-settings-btn')) return; 
        isDragging = true; 
        panelElement.classList.add('is-dragging'); 
        offset = { x: panelElement.offsetLeft - e.clientX, y: panelElement.offsetTop - e.clientY }; 
        document.addEventListener('mousemove', onMouseMove); 
        document.addEventListener('mouseup', onMouseUp); 
    }); 
}

function togglePanel(panelElement, forceShow = null) { 
    if (!panelElement) return; 
    const show = forceShow !== null ? forceShow : panelElement.style.display !== 'flex'; 
    panelElement.style.display = show ? 'flex' : 'none'; 
}

function setupNavigator() { 
    const scrollNav = document.getElementById('scroll-nav'); 
    if (!scrollNav || !learningContent) return; 
    const headers = learningContent.querySelectorAll('h2, #section-4 h3, #section-5 h3, #section-6 h3'); 
    if (headers.length === 0) { 
        scrollNav.style.display = 'none'; 
        if(wrapper) wrapper.classList.add('toc-hidden'); 
        return; 
    } 
    scrollNav.style.display = 'block'; 
    if(wrapper) wrapper.classList.remove('toc-hidden'); 
    const navList = document.createElement('ul'); 
    headers.forEach((header, index) => { 
        let targetElement = header.closest('.content-section'); 
        if (targetElement && !targetElement.id) targetElement.id = `nav-target-${index}`; 
        if (targetElement) { 
            const listItem = document.createElement('li'); 
            const link = document.createElement('a'); 
            let navText = header.textContent.trim().replace(/[\[\]🤓⏳📖]/g, '').trim(); 
            link.textContent = navText.substring(0, 25); 
            link.href = `#${targetElement.id}`; 
            if (header.tagName === 'H3') { 
                link.style.paddingLeft = '25px'; 
                link.style.fontSize = '0.9em'; 
            } 
            listItem.appendChild(link); 
            navList.appendChild(listItem); 
        } 
    }); 
    scrollNav.innerHTML = '<h3>학습 내비게이션</h3>'; 
    scrollNav.appendChild(navList); 
    const links = scrollNav.querySelectorAll('a'); 
    const observer = new IntersectionObserver(entries => { 
        entries.forEach(entry => { 
            const id = entry.target.getAttribute('id'); 
            const navLink = scrollNav.querySelector(`a[href="#${id}"]`); 
            if (navLink && entry.isIntersecting && entry.intersectionRatio > 0.5) { 
                links.forEach(l => l.classList.remove('active')); 
                navLink.classList.add('active'); 
            } 
        }); 
    }, { rootMargin: "0px 0px -70% 0px", threshold: 0.6 }); 
    headers.forEach(header => { 
        const target = header.closest('.content-section'); 
        if (target) observer.observe(target); 
    }); 
}

function handleTextSelection(e) { 
    if (e.target.closest('.draggable-panel, #selection-popover, .fixed-tool-container, #system-info-widget, .project-context-menu, .session-context-menu')) return; 
    const selection = window.getSelection(); 
    const selectedText = selection.toString().trim(); 
    removeContextMenu(); 
    if (selectedText.length > 3) { 
        lastSelectedText = selectedText; 
        const range = selection.getRangeAt(0); 
        const rect = range.getBoundingClientRect(); 
        const popover = selectionPopover; 
        let top = rect.top + window.scrollY - popover.offsetHeight - 10; 
        let left = rect.left + window.scrollX + (rect.width / 2) - (popover.offsetWidth / 2); 
        popover.style.top = `${top < window.scrollY ? rect.bottom + window.scrollY + 10 : top}px`; 
        popover.style.left = `${Math.max(5, Math.min(left, window.innerWidth - popover.offsetWidth - 5))}px`; 
        popover.style.display = 'flex'; 
    } else if (!e.target.closest('#selection-popover')) { 
        selectionPopover.style.display = 'none'; 
    } 
}

function handlePopoverAskAi() { 
    if (!lastSelectedText || !chatInput) return; 
    togglePanel(chatPanel, true); 
    handleNewChat(); 
    setTimeout(() => { 
        chatInput.value = `"${lastSelectedText}"\n\n이 내용에 대해 더 자세히 설명해줄래?`; 
        chatInput.style.height = (chatInput.scrollHeight) + 'px'; 
        chatInput.focus(); 
    }, 100); 
    selectionPopover.style.display = 'none'; 
}

function handlePopoverAddNote() { 
    if (!lastSelectedText) return; 
    addNote(`> ${lastSelectedText}\n\n`); 
    selectionPopover.style.display = 'none'; 
}

function openPromptModal() { 
    if (customPromptInput) customPromptInput.value = customPrompt; 
    if (promptModalOverlay) promptModalOverlay.style.display = 'flex'; 
}

function closePromptModal() { 
    if (promptModalOverlay) promptModalOverlay.style.display = 'none'; 
}

function saveCustomPrompt() { 
    if (customPromptInput) { 
        customPrompt = customPromptInput.value; 
        localStorage.setItem('customTutorPrompt', customPrompt); 
        closePromptModal(); 
    } 
}

function showModal(message, onConfirm) { 
    if (!customModal || !modalMessage || !modalConfirmBtn || !modalCancelBtn) return; 
    modalMessage.textContent = message; 
    customModal.style.display = 'flex'; 
    modalConfirmBtn.onclick = () => { 
        onConfirm(); 
        customModal.style.display = 'none'; 
    }; 
    modalCancelBtn.onclick = () => { 
        customModal.style.display = 'none'; 
    }; 
}

function updateStatus(msg, success) { 
    if (!autoSaveStatus) return; 
    autoSaveStatus.textContent = msg; 
    autoSaveStatus.style.color = success ? 'lightgreen' : 'lightcoral'; 
    setTimeout(() => { autoSaveStatus.textContent = ''; }, 3000); 
}

function applyFormat(fmt) { 
    if (!noteContentTextarea) return; 
    const s = noteContentTextarea.selectionStart, e = noteContentTextarea.selectionEnd, t = noteContentTextarea.value.substring(s, e); 
    const m = fmt === 'bold' ? '**' : (fmt === 'italic' ? '*' : '`'); 
    noteContentTextarea.value = `${noteContentTextarea.value.substring(0,s)}${m}${t}${m}${noteContentTextarea.value.substring(e)}`; 
    noteContentTextarea.focus(); 
}

async function startQuiz() { 
    if (!quizModalOverlay) return; 
    const k = Array.from(document.querySelectorAll('.keyword-chip')).map(c => c.textContent.trim()).join(', '); 
    if (!k) { 
        showModal("퀴즈 생성 키워드가 없습니다.", ()=>{}); 
        return; 
    } 
    if (quizContainer) quizContainer.innerHTML = '<div class="loading-indicator">퀴즈 생성 중...</div>'; 
    if (quizResults) quizResults.innerHTML = ''; 
    quizModalOverlay.style.display = 'flex'; 
    try { 
        const res = await new Promise(r => setTimeout(() => r(JSON.stringify({ "questions": [{"q":"(e.g)...","o":["..."],"a":"..."}]})), 500)); 
        currentQuizData = JSON.parse(res); 
        renderQuiz(currentQuizData); 
    } catch (e) { 
        if(quizContainer) quizContainer.innerHTML = '퀴즈 생성 실패.'; 
    } 
}

function renderQuiz(data) { 
    if (!quizContainer || !data.questions) return; 
    quizContainer.innerHTML = ''; 
    data.questions.forEach((q, i) => { 
        const b = document.createElement('div'); 
        b.className = 'quiz-question-block'; 
        const p = document.createElement('p'); 
        p.textContent = `${i + 1}. ${q.q}`; 
        const o = document.createElement('div'); 
        o.className = 'quiz-options'; 
        q.o.forEach(opt => { 
            const l = document.createElement('label'); 
            const r = document.createElement('input'); 
            r.type = 'radio'; 
            r.name = `q-${i}`; 
            r.value = opt; 
            l.append(r,` ${opt}`); 
            o.appendChild(l); 
        }); 
        b.append(p, o); 
        quizContainer.appendChild(b); 
    }); 
}