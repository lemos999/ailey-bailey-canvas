/* --- FILE: /scripts/features/09_feature_content_interaction.js --- */
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
            let navText = header.textContent.trim().replace(/\[|\]|🤓|⏳|📖/g, '').trim();
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

function setupChatModeSelector() { 
    if (!chatModeSelector) return; 
    chatModeSelector.innerHTML = ''; 
    const modes = [
        { id: 'ailey_coaching', t: '기본 코칭', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M20,16H5.17L4,17.17V4H20V16Z" /></svg>' }, 
        { id: 'deep_learning', t: '심화 학습', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4M12,14A4,4 0 0,1 8,10H10A2,2 0 0,0 12,12A2,2 0 0,0 14,10H16A4,4 0 0,1 12,14M7.5,15.6C8.8,17.2 10.3,18 12,18C13.7,18 15.2,17.2 16.5,15.6C15.2,14.8 13.7,14 12,14C10.3,14 8.8,14.8 7.5,15.6Z" /></svg>' }, 
        { id: 'custom', t: '커스텀', i: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M19.03,7.39L20.45,5.97C20,5.46 19.54,5 19.03,4.55L17.61,5.97C16.07,4.74 14.12,4 12,4C9.88,4 7.93,4.74 6.39,5.97L5,4.55C4.5,5 4,5.46 3.55,5.97L4.97,7.39C3.74,8.93 3,10.88 3,13C3,15.12 3.74,17.07 4.97,18.61L3.55,20.03C4,20.54 4.5,21 5,21.45L6.39,20.03C7.93,21.26 9.88,22 12,22C14.12,22 16.07,21.26 17.61,20.03L19.03,21.45C19.54,21 20,20.54 20.45,20.03L19.03,18.61C20.26,17.07 21,15.12 21,13C21,10.88 20.26,8.93 19.03,7.39Z" /></svg>' }
    ]; 
    modes.forEach(m => { 
        const b = document.createElement('button'); 
        b.dataset.mode = m.id; 
        b.innerHTML = `${m.i}<span>${m.t}</span>`; 
        if (m.id === selectedMode) b.classList.add('active'); 
        b.addEventListener('click', () => { 
            selectedMode = m.id; 
            chatModeSelector.querySelectorAll('button').forEach(btn => btn.classList.remove('active')); 
            b.classList.add('active'); 
            if (selectedMode === 'custom') openPromptModal(); 
        }); 
        chatModeSelector.appendChild(b); 
    }); 
}