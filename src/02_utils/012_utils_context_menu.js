/* --- Ailey & Bailey Canvas --- */
// File: 012_utils_context_menu.js
// Version: 2.2 (Positioning Fix)
// Description: Switched to clientX/Y and position:fixed for accurate positioning regardless of scroll.

let currentOpenContextMenu = null;
const handleCloseEvents = () => removeContextMenu();

function removeContextMenu() {
    if (currentOpenContextMenu) {
        document.removeEventListener('click', handleCloseEvents);
        document.removeEventListener('scroll', handleCloseEvents, true);
        currentOpenContextMenu.remove();
        currentOpenContextMenu = null;
    }
}

function createContextMenu(items, event) {
    event.preventDefault();
    event.stopPropagation();
    removeContextMenu();

    const menu = document.createElement('div');
    menu.className = 'custom-context-menu';

    const createMenuItem = (item) => {
        if (item.separator) {
            const separator = document.createElement('div');
            separator.className = 'context-menu-separator';
            return separator;
        }

        const button = document.createElement('button');
        button.className = 'context-menu-item';
        button.disabled = item.disabled || false;

        if (item.submenu) {
            button.classList.add('submenu-container');
            button.innerHTML = `<span>${item.label}</span><span class="submenu-arrow">▶</span>`;
            const submenu = document.createElement('div');
            submenu.className = 'context-submenu';
            item.submenu.forEach(subItem => submenu.appendChild(createMenuItem(subItem)));
            button.appendChild(submenu);
        } else {
            button.textContent = item.label;
            if (item.action) {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    item.action();
                    removeContextMenu();
                });
            }
        }
        return button;
    };

    items.forEach(item => menu.appendChild(createMenuItem(item)));

    menu.style.visibility = 'hidden';
    document.body.appendChild(menu);

    const { offsetWidth: menuWidth, offsetHeight: menuHeight } = menu;
    const { innerWidth: windowWidth, innerHeight: windowHeight } = window;
    let left = event.clientX; // [FIX] Use clientX for viewport-relative coordinate
    let top = event.clientY;   // [FIX] Use clientY for viewport-relative coordinate

    if (left + menuWidth > windowWidth) left = windowWidth - menuWidth - 5;
    if (top + menuHeight > windowHeight) top = windowHeight - menuHeight - 5;
    left = Math.max(5, left);
    top = Math.max(5, top);

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.visibility = 'visible';

    currentOpenContextMenu = menu;
    menu.addEventListener('click', e => e.stopPropagation());
    
    setTimeout(() => {
        document.addEventListener('click', handleCloseEvents, { once: true });
        document.addEventListener('scroll', handleCloseEvents, { once: true, capture: true });
    }, 0);
}