// js/ui/toc.js
// 학습 콘텐츠의 목차(Table of Contents)를 동적으로 생성하고 스크롤에 따라 활성화합니다.

import * as DOM from '../utils/domElements.js';

/**
 * 목차(TOC) 기능과 관련 이벤트 리스너를 설정합니다.
 */
export function initializeToc() {
    setupNavigator();
    if (DOM.tocToggleBtn) {
        DOM.tocToggleBtn.addEventListener('click', () => {
            DOM.wrapper.classList.toggle('toc-hidden');
            DOM.systemInfoWidget?.classList.toggle('tucked');
        });
    }
}

/**
 * h2, h3 태그를 기반으로 스크롤 네비게이션(목차)을 생성합니다.
 */
function setupNavigator() {
    const scrollNav = document.getElementById('scroll-nav');
    if (!scrollNav || !DOM.learningContent) return;

    const headers = DOM.learningContent.querySelectorAll('h2, #section-4 h3, #section-5 h3, #section-6 h3');
    
    if (headers.length === 0) {
        scrollNav.style.display = 'none';
        if(DOM.wrapper) DOM.wrapper.classList.add('toc-hidden');
        return;
    }
    
    scrollNav.style.display = 'block';
    if(DOM.wrapper) DOM.wrapper.classList.remove('toc-hidden');
    
    const navList = document.createElement('ul');
    headers.forEach((header, index) => {
        let targetElement = header.closest('.content-section');
        if (targetElement && !targetElement.id) {
            targetElement.id = 
av-target-;
        }
        
        if (targetElement) {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            
            let navText = header.textContent.trim().replace(/\[|\]|??|?|??/g, '').trim();
            link.textContent = navText.substring(0, 25);
            link.href = #;
            
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
            const navLink = scrollNav.querySelector([href="#"]);
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
