/*
--- Ailey & Bailey Canvas ---
File: script_notes_app.js
Version: 14.0 (Smart Editor)
Architect: [Username] & System Architect Ailey
Description: Contains all business logic and UI rendering for the enhanced Notes App with Quill.js.
*/

// --- 3.1: Project/Folder Management (Unchanged from previous version) ---
// ... (All project management functions like createNewNoteProject, renameNoteProject, etc. remain the same) ...

// --- 3.2: Main UI Rendering (Unchanged from previous version) ---
// ... (The renderNoteList function remains the same) ...

// --- 3.3: Note CRUD & Editor Logic (HEAVILY MODIFIED) ---
function initializeQuillEditor() {
    if (quillEditor) {
        quillEditor = null;
    }
    const editorContainer = document.getElementById('note-editor-container');
    if (!editorContainer) return;
    
    const toolbarOptions = [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'blockquote', 'code-block'],
      ['clean']
    ];

    quillEditor = new Quill(editorContainer, {
      modules: { toolbar: toolbarOptions },
      theme: 'snow',
      placeholder: '내용을 입력하세요...'
    });

    quillEditor.on('text-change', () => {
        updateStatus('입력 중...', true);
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(saveNote, 1500);
    });
}

async function addNote(content = '') { 
    if (!notesCollectionRef) return; 
    try { 
        const ref = await notesCollectionRef.add({ 
            title: '새 메모', 
            content: content, 
            projectId: null, isPinned: false, 
            createdAt: firebase.firestore.FieldValue.serverTimestamp(), 
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
        }); 
        openNoteEditor(ref.id); 
    } catch (e) { console.error("새 메모 추가 실패:", e); } 
}

function saveNote() { 
    if (debounceTimer) clearTimeout(debounceTimer); 
    if (!currentNoteId || !notesCollectionRef || !quillEditor) return; 

    const data = { 
        title: noteTitleInput.value, 
        content: quillEditor.root.innerHTML, // Save HTML content from Quill
        updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
    }; 
    notesCollectionRef.doc(currentNoteId).update(data)
        .then(() => updateStatus('저장됨 ✓', true))
        .catch(e => { console.error("메모 저장 실패:", e); updateStatus('저장 실패 ❌', false); }); 
}

function handleDeleteRequest(id) { /* ... Unchanged ... */ }
async function togglePin(id) { /* ... Unchanged ... */ }

function switchView(view) { 
    if (view === 'editor') {
        noteListView?.classList.remove('active'); 
        noteEditorView?.classList.add('active'); 
        initializeQuillEditor(); // Initialize Quill when switching to editor view
    } else { 
        noteEditorView?.classList.remove('active'); 
        noteListView?.classList.add('active'); 
        currentNoteId = null; 
        if (quillEditor) { quillEditor = null; }
    } 
}

function openNoteEditor(id) { 
    const note = localNotesCache.find(n => n.id === id); 
    if (!note) return;
    
    switchView('editor');

    // Wait for switchView to complete initialization
    setTimeout(() => {
        if (!noteTitleInput || !quillEditor) return;

        currentNoteId = id; 
        noteTitleInput.value = note.title || ''; 

        // Auto-clear "새 메모" title on first focus
        if (noteTitleInput.value === '새 메모') {
            const handleFocus = () => {
                if (noteTitleInput.value === '새 메모') {
                    noteTitleInput.value = '';
                }
                noteTitleInput.removeEventListener('focus', handleFocus);
            };
            noteTitleInput.addEventListener('focus', handleFocus);
        }

        // Set content in Quill editor
        quillEditor.root.innerHTML = note.content || '';
        quillEditor.focus();
    }, 0);
}


// --- 3.4: System & Data Management Functions (Unchanged) ---
// ... (handleSystemReset, exportAllData, handleRestoreClick, importAllData, etc. remain the same) ...