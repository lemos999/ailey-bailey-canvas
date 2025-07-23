import { state, setState } from '../../core/state.js';
import { dom } from '../../ui/dom.js';
import { togglePanel } from '../../core/utils.js';
import { addNote } from './notes.js';

export function renderNoteList() {
    if (!dom.notesList || !dom.searchInput) return;
    const term = dom.searchInput.value.toLowerCase();
    const filtered = state.localNotesCache.filter(n =>
        n.title?.toLowerCase().includes(term) || n.content?.toLowerCase().includes(term)
    );

    // Pinned notes first, then by date
    filtered.sort((a,b) => (b.isPinned - a.isPinned) || (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
    
    dom.notesList.innerHTML = filtered.length === 0 ? '<div>표시할 메모가 없습니다.</div>' : '';
    filtered.forEach(n => {
        const item = document.createElement('div');
        item.className = 'note-item';
        item.dataset.id = n.id;
        if (n.isPinned) item.classList.add('pinned');
        item.innerHTML = 
            <div class="note-item-content">
                <div class="note-item-title"></div>
                <div class="note-item-date"></div>
            </div>
            <div class="note-item-actions">
                <button class="item-action-btn pin-btn " title="고정"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg></button>
                <button class="item-action-btn delete-btn" title="삭제"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z" /></svg></button>
            </div>
        ;
        dom.notesList.appendChild(item);
    });
}

export function switchView(view) {
    if (view === 'editor') {
        if(dom.noteListView) dom.noteListView.classList.remove('active');
        if(dom.noteEditorView) dom.noteEditorView.classList.add('active');
    } else {
        if(dom.noteEditorView) dom.noteEditorView.classList.remove('active');
        if(dom.noteListView) dom.noteListView.classList.add('active');
        setState('currentNoteId', null);
    }
}

export function openNoteEditor(id) {
    const note = state.localNotesCache.find(n => n.id === id);
    if (note && dom.noteTitleInput && dom.noteContentTextarea) {
        setState('currentNoteId', id);
        dom.noteTitleInput.value = note.title || '';
        dom.noteContentTextarea.value = note.content || '';
        switchView('editor');
    }
}

function applyFormat(fmt) {
    if (!dom.noteContentTextarea) return;
    const s = dom.noteContentTextarea.selectionStart;
    const e = dom.noteContentTextarea.selectionEnd;
    const t = dom.noteContentTextarea.value.substring(s, e);
    const m = fmt === 'bold' ? '**' : (fmt === 'italic' ? '*' : '');
    dom.noteContentTextarea.value = ${dom.noteContentTextarea.value.substring(0,s)};
    dom.noteContentTextarea.focus();
}

export function initializeNotesUI(handleDeleteRequest, togglePin, addNoteFromPopover) {
    if (dom.notesAppToggleBtn) {
        dom.notesAppToggleBtn.addEventListener('click', () => {
            togglePanel(dom.notesAppPanel);
            if(dom.notesAppPanel.style.display === 'flex') renderNoteList();
        });
    }
    if (dom.addNewNoteBtn) dom.addNewNoteBtn.addEventListener('click', () => addNote());
    if (dom.backToListBtn) dom.backToListBtn.addEventListener('click', () => switchView('list'));
    if (dom.searchInput) dom.searchInput.addEventListener('input', renderNoteList);
    
    if (dom.notesList) {
        dom.notesList.addEventListener('click', e => {
            const item = e.target.closest('.note-item');
            if (!item) return;
            const id = item.dataset.id;
            if (e.target.closest('.delete-btn')) {
                handleDeleteRequest(id);
            } else if (e.target.closest('.pin-btn')) {
                togglePin(id);
            } else {
                openNoteEditor(id);
            }
        });
    }

    if (dom.formatToolbar) {
        dom.formatToolbar.addEventListener('click', e => {
            const btn = e.target.closest('.format-btn');
            if (btn) applyFormat(btn.dataset.format);
        });
    }

    if (dom.linkTopicBtn) {
        dom.linkTopicBtn.addEventListener('click', () => {
            if(!dom.noteContentTextarea) return;
            const title = document.title || '현재 학습';
            dom.noteContentTextarea.value += \n\n?? 연관 학습: [];
            // Trigger save
            dom.noteContentTextarea.dispatchEvent(new Event('input', { bubbles:true, cancelable:true }));
        });
    }
    
    // Connect popover to notes module
    if (dom.popoverAddNote) {
        dom.popoverAddNote.addEventListener('click', () => {
            if (state.lastSelectedText) {
                addNoteFromPopover(> \n\n);
            }
            dom.selectionPopover.style.display = 'none';
        });
    }
}
