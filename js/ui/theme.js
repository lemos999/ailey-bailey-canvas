import { dom } from './dom.js';

function applyTheme(theme) {
    if (theme === 'dark') {
        dom.body.classList.add('dark-mode');
    } else {
        dom.body.classList.remove('dark-mode');
    }
}

function toggleTheme() {
    const isDarkMode = dom.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

export function initializeTheme() {
    if (dom.themeToggle) {
        dom.themeToggle.addEventListener('click', toggleTheme);
    }
    const savedTheme = localStorage.getItem('theme') || 'dark'; // 기본값을 다크로 설정
    applyTheme(savedTheme);
}
