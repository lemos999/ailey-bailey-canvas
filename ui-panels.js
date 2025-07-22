
function makePanelDraggable(panelElement) {
    if (!panelElement) return;
    const header = panelElement.querySelector('.panel-header');
    if (!header) return;

    let isDragging = false,
        offset = { x: 0, y: 0 };

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
        // Prevent dragging when clicking on buttons, inputs, etc.
        if (e.target.closest('button, input, select, .close-btn, #delete-session-btn, #chat-mode-selector, #api-settings-btn')) {
            return;
        }
        isDragging = true;
        panelElement.classList.add('is-dragging');
        offset = {
            x: panelElement.offsetLeft - e.clientX,
            y: panelElement.offsetTop - e.clientY
        };
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
        if (wrapper) wrapper.classList.add('toc-hidden');
        return;
    }
    scrollNav.style.display = 'block';
    if (wrapper) wrapper.classList.remove('toc-hidden');

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
    }, {
        rootMargin: "0px 0px -70% 0px",
        threshold: 0.6
    });

    headers.forEach(header => {
        const target = header.closest('.content-section');
        if (target) observer.observe(target);
    });
}
