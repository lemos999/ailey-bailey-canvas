/* js/events/_noteEvents.js */
import * as state from '../_state.js';
import { renderNoteList, switchView } from '../ui/_render.js';
import { showModal, updateStatus } from '../_utils.js';

export function initializeNoteEventListeners() {
    const notesList = document.getElementById('notes-list');
    const addNewNoteBtn = document.getElementById('add-new-note-btn');
    const backToListBtn = document.getElementById('back-to-list-btn');
    const searchInput = document.getElementById('search-input');
    const noteTitleInput = document.getElementById('note-title-input');
    const noteContentTextarea = document.getElementById('note-content-textarea');
    const formatToolbar = document.querySelector('.format-toolbar');
    const linkTopicBtn = document.getElementById('link-topic-btn');

    if (addNewNoteBtn) addNewNoteBtn.addEventListener('click', () => addNote());
    if (backToListBtn) backToListBtn.addEventListener('click', () => switchView('list'));
    if (searchInput) searchInput.addEventListener('input', renderNoteList);
    
    const handleInput = () => { 
        updateStatus('입력 중...', true); 
        if (state.debounceTimer) clearTimeout(state.debounceTimer); 
        state.setDebounceTimer(setTimeout(saveNote, 1000)); 
    };
    if (noteTitleInput) noteTitleInput.addEventListener('input', handleInput);
    if (noteContentTextarea) noteContentTextarea.addEventListener('input', handleInput);

    if (notesList) {
        notesList.addEventListener('click', e => { 
            const i = e.target.closest('.note-item'); 
            if (!i) return; 
            const id = i.dataset.id; 
            if (e.target.closest('.delete-btn')) handleDeleteRequest(id); 
            else if (e.target.closest('.pin-btn')) togglePin(id); 
            else openNoteEditor(id); 
        });
    }
    
    if (formatToolbar) {
        formatToolbar.addEventListener('click', e => { 
            const b = e.target.closest('.format-btn'); 
            if (b) applyFormat(b.dataset.format); 
        });
    }

    if (linkTopicBtn) {
        linkTopicBtn.addEventListener('click', () => { 
            if(!noteContentTextarea) return; 
            const t = document.title || '현재 학습'; 
            noteContentTextarea.value += `

🔗 연관 학습: [${t}]`; 
            saveNote(); 
        });
    }
}

async function addNote(content = '') { 
    if (!state.notesCollection) return; 
    try { 
        const ref = await state.notesCollection.add({ 
            title: '새 메모', 
            content: content, 
            isPinned: false, 
            createdAt: firebase.firestore.FieldValue.serverTimestamp(), 
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
        }); 
        openNoteEditor(ref.id); 
    } catch (e) { 
        console.error("새 메모 추가 실패:", e); 
    } 
}

function saveNote() { 
    if (state.debounceTimer) clearTimeout(state.debounceTimer); 
    if (!state.currentNoteId || !state.notesCollection) return; 
    const noteTitleInput = document.getElementById('note-title-input');
    const noteContentTextarea = document.getElementById('note-content-textarea');
    const data = { 
        title: noteTitleInput.value, 
        content: noteContentTextarea.value, 
        updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
    }; 
    state.notesCollection.doc(state.currentNoteId).update(data)
        .then(() => updateStatus('저장됨 ✓', true))
        .catch(e => { 
            console.error("메모 저장 실패:", e); 
            updateStatus('저장 실패 ❌', false); 
        }); 
}

function handleDeleteRequest(id) { 
    showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => { 
        if (state.notesCollection) {
            state.notesCollection.doc(id).delete().catch(e => console.error("메모 삭제 실패:", e));
        } 
    }); 
}

async function togglePin(id) { 
    if (!state.notesCollection) return; 
    const note = state.localNotesCache.find(n => n.id === id); 
    if (note) {
        await state.notesCollection.doc(id).update({ isPinned: !note.isPinned }); 
    }
}

function openNoteEditor(id) { 
    const note = state.localNotesCache.find(n => n.id === id); 
    const noteTitleInput = document.getElementById('note-title-input');
    const noteContentTextarea = document.getElementById('note-content-textarea');
    if (note && noteTitleInput && noteContentTextarea) { 
        state.setCurrentNoteId(id); 
        noteTitleInput.value = note.title || ''; 
        noteContentTextarea.value = note.content || ''; 
        switchView('editor'); 
    } 
}

function applyFormat(fmt) { 
    const noteContentTextarea = document.getElementById('note-content-textarea');
    if (!noteContentTextarea) return; 
    const s = noteContentTextarea.selectionStart, e = noteContentTextarea.selectionEnd, t = noteContentTextarea.value.substring(s, e); 
    const m = fmt === 'bold' ? '**' : (fmt === 'italic' ? '*' : '`'); 
    noteContentTextarea.value = `${noteContentTextarea.value.substring(0,s)}${m}${t}${m}${noteContentTextarea.value.substring(e)}`; 
    noteContentTextarea.focus(); 
}
