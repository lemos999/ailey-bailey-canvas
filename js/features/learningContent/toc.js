/*
--- Module: toc.js ---
Description: Manages the Table of Contents (TOC) creation and active state.
*/
import { getElements } from '../../core/state.js';

export function initLearningContent(elements) {
    setupNavigator(elements);
    // Any other learning-content specific initializations can go here
}

function setupNavigator(elements) {
    const { learningContent, wrapper } = elements;
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
        if (targetElement && !targetElement.id) {
            targetElement.id = `nav-target-${index}`;
        }
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