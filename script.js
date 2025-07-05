// --- [Ailey & Bailey Canvas v5.1] script.js ---
// This version is a data-driven UI renderer. It takes JSON data and builds the page.
document.addEventListener('DOMContentLoaded', function () {
    // --- Global State & Element References ---
    const learningContent = document.getElementById('learning-content');
    const scrollNavContainer = document.getElementById('scroll-nav');
    // ... (other element references from v5.0 remain the same)
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const chatPanel = document.getElementById('chat-panel');
    const notesAppPanel = document.getElementById('notes-app-panel');

    // --- Core Data-Driven Rendering Engine ---
    function renderPageFromData(data) {
        if (!data || !data.title) {
            learningContent.innerHTML = "<h2>오류: 학습 데이터를 불러올 수 없습니다.</h2>";
            return;
        }

        // 1. Set Page Title
        document.title = data.title;

        // 2. Render Main Content
        let html = '';
        html += `<div class="header"><h1>${data.title}</h1>`;
        if (data.subtitle) html += `<p class="subtitle">${data.subtitle}</p>`;
        html += `</div>`;

        if(data.learningGoal) {
             html += `<div class="info-box"><p><strong>🎯 오늘의 학습 목표:</strong> ${data.learningGoal}</p></div>`;
        }

        if(data.keywords && data.keywords.length > 0) {
            html += `<div class="keyword-list"><strong>🔑 핵심 키워드:</strong> ${data.keywords.map(k => `<span class="keyword-chip">${k}</span>`).join('')}</div>`;
        }

        data.sections.forEach(section => {
            html += `
                <div class="content-section">
                    <h2 id="${section.id}">${section.title}</h2>
                    ${section.content}
                </div>
            `;
        });
        
        if (data.summary) {
            html += `<div class="content-section"><h2>최종 핵심 요약 🤓</h2>${data.summary}</div>`;
        }

        if (data.explorationGateway) {
            html += `<div class="exploration-gateway">
                        <h3>🚀 지식 확장 탐험!</h3>
                        <p>${data.explorationGateway.prompt}</p>
                        <ul>
                            ${data.explorationGateway.options.map(opt => `<li><a href="#" onclick="alert('준비 중입니다!')"><strong>${opt.title}:</strong> ${opt.description}</a></li>`).join('')}
                        </ul>
                    </div>`;
        }
        
        learningContent.innerHTML = html;

        // 3. Render Scroll Navigator
        let navHtml = '<h3>학습 네비게이션</h3><ul>';
        data.sections.forEach(section => {
            navHtml += `<li><a href="#${section.id}">${section.title}</a></li>`;
        });
        navHtml += '</ul>';
        scrollNavContainer.innerHTML = navHtml;
        setupNavigatorScrollSpy();
    }

    // --- Navigator Scroll Spy ---
    function setupNavigatorScrollSpy() {
        const sections = document.querySelectorAll('.content-section h2');
        const navLinks = document.querySelectorAll('.scroll-nav a');

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    navLinks.forEach(link => {
                        link.classList.toggle('active', link.getAttribute('href').substring(1) === entry.target.id);
                    });
                }
            });
        }, { rootMargin: "-30% 0px -70% 0px" });

        sections.forEach(section => observer.observe(section));
    }


    // --- Main Initialization Function ---
    function init() {
        // This global variable is expected to be defined in the HTML <script> tag by the AI.
        if (typeof __lecture_data__ !== 'undefined') {
            renderPageFromData(__lecture_data__);
        } else {
            learningContent.innerHTML = "<h2>학습 내용을 기다리고 있어요...</h2>";
        }
        
        // The rest of the initialization logic for theme, panels, firebase remains the same...
        // Assuming the rest of your v5.0 script.js (theme toggle, panel dragging, firebase) is here.
        // For brevity, I'm only showing the new/modified parts. The original script should be merged.
        
        // Placeholder for other init functions from previous script
        const savedTheme = localStorage.getItem('ailey-bailey-theme') || 'dark';
        applyTheme(savedTheme);
        setupEventListeners(); // This would set up listeners for toggles, chat, notes app etc.
        // initializeFirebase(); // This would init firebase
    }
    
    // --- Utility functions (placeholders, assuming they exist from your previous script) ---
    function applyTheme(theme) { 
        body.className = theme === 'dark' ? 'dark-mode' : '';
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        localStorage.setItem('ailey-bailey-theme', theme);
    }
    
    function makePanelDraggable(panel) {
        const header = panel.querySelector('.panel-header');
        if (!header) return;
        let isDragging = false, offset = { x: 0, y: 0 };
        header.addEventListener('mousedown', e => {
            isDragging = true;
            offset = { x: panel.offsetLeft - e.clientX, y: panel.offsetTop - e.clientY };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        function onMouseMove(e) { if (isDragging) { panel.style.left = `${e.clientX + offset.x}px`; panel.style.top = `${e.clientY + offset.y}px`; } }
        function onMouseUp() { isDragging = false; document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); }
    }
    
    function togglePanel(panel) { panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex'; }
    
    function setupEventListeners() {
        themeToggle.addEventListener('click', () => applyTheme(body.classList.contains('dark-mode') ? 'light' : 'dark'));
        ['chat-panel', 'notes-app-panel'].forEach(id => {
            const panel = document.getElementById(id);
            if (panel) {
                makePanelDraggable(panel);
                const toggleBtn = document.getElementById(id.replace('-panel', '-toggle-btn'));
                if (toggleBtn) toggleBtn.addEventListener('click', () => togglePanel(panel));
                const closeBtn = panel.querySelector('.close-btn');
                if (closeBtn) closeBtn.addEventListener('click', () => panel.style.display = 'none');
            }
        });
        // Add other event listeners for chat, notes etc. here
    }

    // Run Initialization
    init();
});
