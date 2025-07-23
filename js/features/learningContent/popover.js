/*
--- Module: popover.js ---
Description: Handles the logic for the text selection popover.
*/
import { getState, setLastSelectedText } from '../../core/state.js';
import { togglePanel } from '../../core/ui.js';
// import { addNote } from '../notes/notes.main.js'; // Would be used in a full implementation

export function handlePopoverAskAi() {
    const state = getState();
    const { chatInput, chatPanel } = state.elements;

    if (!state.lastSelectedText || !chatInput) return;

    togglePanel(chatPanel, true);
    // handleNewChat(); // This would need to be imported from chat.main

    setTimeout(() => {
        chatInput.value = `"${state.lastSelectedText}"\n\n이 내용에 대해 더 자세히 설명해줄래?`;
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
        chatInput.focus();
    }, 100);

    state.elements.selectionPopover.style.display = 'none';
}

export function handlePopoverAddNote() {
    const state = getState();
    if (!state.lastSelectedText) return;

    const noteContent = `> ${state.lastSelectedText}\n\n`;
    // addNote(noteContent); // This would call the function from notes.main.js
    console.log("Adding to note (placeholder):", noteContent);

    state.elements.selectionPopover.style.display = 'none';
}