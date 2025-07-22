/* js/ui/_createNoteCard.js */
export function createNoteCard(note) {
    const item = document.createElement('div');
    item.className = 'note-item';
    item.dataset.id = note.id;
    if (note.isPinned) {
        item.classList.add('pinned');
    }
    item.innerHTML = `
        <div class="note-item-content">
            <div class="note-item-title">${note.title || '무제'}</div>
            <div class="note-item-date">${note.updatedAt?.toDate().toLocaleString('ko-KR') || '날짜 없음'}</div>
        </div>
        <div class="note-item-actions">
            <button class="item-action-btn pin-btn ${note.isPinned ? 'pinned-active' : ''}" title="고정">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>
            </button>
            <button class="item-action-btn delete-btn" title="삭제">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z" /></svg>
            </button>
        </div>
    `;
    return item;
}
