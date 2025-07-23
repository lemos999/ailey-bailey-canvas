// Migrated content for js/features/chat/sidebar.js

export function renderSidebarContent() {
        if (!sessionListContainer) return;
        const searchTerm = searchSessionsInput.value.toLowerCase();
        sessionListContainer.innerHTML = ''; 
    
        const filteredProjects = localProjectsCache.filter(p => p.name?.toLowerCase().includes(searchTerm));
        const filteredSessions = localChatSessionsCache.filter(s => (s.title || '새 대화').toLowerCase().includes(searchTerm));
    
        const fragment = document.createDocumentFragment();
    
        if (filteredProjects.length > 0 || localProjectsCache.length > 0) {
            const projectGroupHeader = document.createElement('div');
            projectGroupHeader.className = 'session-group-header';
            projectGroupHeader.textContent = '📁 프로젝트';
            fragment.appendChild(projectGroupHeader);
    
            const sortedProjects = [...(searchTerm ? filteredProjects : localProjectsCache)].sort((a, b) => {
                 const timeA = a.updatedAt?.toMillis() || 0;
                 const timeB = b.updatedAt?.toMillis() || 0;
                 return timeB - timeA;
            }

export function createSessionItem(session) {
        const item = document.createElement('div');
        item.className = 'session-item';
        item.dataset.sessionId = session.id;
        item.draggable = true;
        if (session.id === currentSessionId) item.classList.add('active');
        
        const createdAt = session.createdAt?.toDate()?.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }