import { dom } from './dom.js';

export function setupNavigator() {
    const scrollNav = document.getElementById('scroll-nav');
    if (!scrollNav || !dom.learningContent) return;

    const headers = dom.learningContent.querySelectorAll('h2, #section-4 h3, #section-5 h3, #section-6 h3');
    if (headers.length === 0) {
        scrollNav.style.display = 'none';
        if(dom.wrapper) dom.wrapper.classList.add('toc-hidden');
        return;
    }

    scrollNav.style.display = 'block';
    if(dom.wrapper) dom.wrapper.classList.remove('toc-hidden');

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

export function initializeNavigator() {
    setupNavigator();
    if (dom.tocToggleBtn) {
        dom.tocToggleBtn.addEventListener('click', () => {
            dom.wrapper.classList.toggle('toc-hidden');
            dom.systemInfoWidget?.classList.toggle('tucked');
        });
    }
}
