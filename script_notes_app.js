/*
--- Ailey & Bailey Canvas ---
File: script_notes_app.js
Version: 13.1 (Editor Upgrade & Bugfix)
Architect: [Username] & System Architect Ailey
Description: Implements the Toast UI Editor, smart title functionality, and robust event handling.
*/

let toastEditor = null; // Global reference for the editor instance

// --- 3.1: Project/Folder Management (unchanged) ---
// ... (omitted for brevity)

// --- 3.2: Main UI Rendering ---
function renderNoteList() { 
    // This function remains largely the same as the previous version,
    // which dynamically creates the Action Bar and lists projects/notes.
    // ... (omitted for brevity, assume the full function from previous step is here)
}

function createNoteItem(noteData) {
    // This function also remains the same.
    // ... (omitted for brevity)
}

// --- 3.3: Note CRUD & Core Logic ---

async function addNote(content = '') { 
    if (!notesCollectionRef) return; 
    try { 
        const ref = await notesCollectionRef.add({ 
            title: '새 메모', content: content, projectId: null, isPinned: false, tags: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(), 
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
        }); 
        openNoteEditor(ref.id, true); // Pass a flag for new note
    } catch (e) { console.error("새 메모 추가 실패:", e); } 
}

function saveNote() { 
    if (debounceTimer) clearTimeout(debounceTimer); 
    if (!currentNoteId || !notesCollectionRef || !toastEditor) return; 
    const data = { 
        title: document.getElementById('note-title-input').value,
        content: toastEditor.getMarkdown(), 
        updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
    }; 
    notesCollectionRef.doc(currentNoteId).update(data)
        .then(() => updateStatus('저장됨 ✓', true))
        .catch(e => { console.error("메모 저장 실패:", e); updateStatus('저장 실패 ❌', false); }); 
}

function handleDeleteRequest(id) { /* ... unchanged ... */ }
async function togglePin(id) { /* ... unchanged ... */ }

function switchView(view) { 
    if (view === 'editor') { 
        noteListView?.classList.remove('active'); 
        noteEditorView?.classList.add('active'); 
    } else { 
        noteEditorView?.classList.remove('active'); 
        noteListView?.classList.add('active'); 
        currentNoteId = null; 
        // [CRITICAL] Destroy editor instance on view switch to prevent memory leaks
        if (toastEditor) {
            toastEditor.destroy();
            toastEditor = null;
        }
    } 
}

function openNoteEditor(id, isNewNote = false) { 
    const note = localNotesCache.find(n => n.id === id); 
    if (!note) return;

    switchView('editor');
    currentNoteId = id;

    const titleInput = document.getElementById('note-title-input');
    titleInput.value = note.title || '';

    // [NEW] Smart Title functionality
    if (isNewNote && titleInput.value === '새 메모') {
        const clearOnFocus = () => {
            if (titleInput.value === '새 메모') {
                titleInput.value = '';
            }
            titleInput.removeEventListener('focus', clearOnFocus);
        };
        titleInput.addEventListener('focus', clearOnFocus);
    }
    
    // [NEW] Toast UI Editor implementation
    if (toastEditor) {
        toastEditor.destroy();
        toastEditor = null;
    }

    const editorContainer = document.getElementById('toast-editor-container');
    if (!editorContainer) {
        // Create the container if it doesn't exist
        const contentTextarea = document.getElementById('note-content-textarea');
        const container = document.createElement('div');
        container.id = 'toast-editor-container';
        contentTextarea.parentNode.insertBefore(container, contentTextarea);
        contentTextarea.style.display = 'none'; // Hide the original textarea
    }
    
    toastEditor = new toastui.Editor({
        el: document.querySelector('#toast-editor-container'),
        height: '100%',
        initialEditType: 'markdown',
        previewStyle: 'vertical',
        initialValue: note.content || '',
        theme: document.body.classList.contains('dark-mode') ? 'dark' : 'default',
        events: {
            change: () => {
                // Debounced save on content change
                updateStatus('입력 중...', true);
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(saveNote, 1500);
            }
        }
    });

    // Debounced save for title input
    titleInput.oninput = () => {
        updateStatus('입력 중...', true);
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(saveNote, 1500);
    };
}


// --- 3.4: Other Functions ---
// ... (All other functions like handleSystemReset, export, import remain the same)