// Migrated content for js/features/notes/notes.js

export function listenToNotes() { return new Promise(resolve => { if (!notesCollection) return resolve(); if (unsubscribeFromNotes) unsubscribeFromNotes(); unsubscribeFromNotes = notesCollection.orderBy("updatedAt", "desc").onSnapshot(s => { localNotesCache = s.docs.map(d => ({ id: d.id, ...d.data() }

export function renderNoteList() { if (!notesList || !searchInput) return; const term = searchInput.value.toLowerCase(); const filtered = localNotesCache.filter(n => n.title?.toLowerCase().includes(term) || n.content?.toLowerCase().includes(term)); filtered.sort((a,b) => (b.isPinned - a.isPinned) || (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0)); notesList.innerHTML = filtered.length === 0 ? '<div>표시할 메모가 없습니다.</div>' : ''; filtered.forEach(n => { const i = document.createElement('div'); i.className = 'note-item'; i.dataset.id = n.id; if (n.isPinned) i.classList.add('pinned'); i.innerHTML = `<div class="note-item-content"><div class="note-item-title">${n.title||'무제'}

export async function addNote(content = '') { if (!notesCollection) return; try { const ref = await notesCollection.add({ title: '새 메모', content: content, isPinned: false, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }

export function saveNote() { if (debounceTimer) clearTimeout(debounceTimer); if (!currentNoteId || !notesCollection) return; const data = { title: noteTitleInput.value, content: noteContentTextarea.value, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }

export function handleDeleteRequest(id) { showModal('이 메모를 영구적으로 삭제하시겠습니까?', () => { if (notesCollection) notesCollection.doc(id).delete().catch(e => console.error("메모 삭제 실패:", e)); }

export async function togglePin(id) { if (!notesCollection) return; const note = localNotesCache.find(n => n.id === id); if (note) await notesCollection.doc(id).update({ isPinned: !note.isPinned }

export function switchView(view) { if (view === 'editor') { if(noteListView) noteListView.classList.remove('active'); if(noteEditorView) noteEditorView.classList.add('active'); }

export function openNoteEditor(id) { const note = localNotesCache.find(n => n.id === id); if (note && noteTitleInput && noteContentTextarea) { currentNoteId = id; noteTitleInput.value = note.title || ''; noteContentTextarea.value = note.content || ''; switchView('editor'); }

export function applyFormat(fmt) { if (!noteContentTextarea) return; const s = noteContentTextarea.selectionStart, e = noteContentTextarea.selectionEnd, t = noteContentTextarea.value.substring(s, e); const m = fmt === 'bold' ? '**' : (fmt === 'italic' ? '*' : '`'); noteContentTextarea.value = `${noteContentTextarea.value.substring(0,s)}