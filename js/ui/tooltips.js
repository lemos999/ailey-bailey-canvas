/*
--- Ailey & Bailey Canvas ---
File: js/ui/tooltips.js
Version: 11.0 (Modular)
Description: Handles tooltip initialization and selection popover logic.
*/

import { selectionPopover } from '../utils/domElements.js';
import { updateState } from '../core/state.js';

/**
 * Initializes all tooltips on the page by taking content from data-tooltip attributes.
 */
export function initializeTooltips() {
    // For keyword chips that are pre-rendered with a tooltip span
    document.querySelectorAll('.keyword-chip[data-tooltip]').forEach(chip => {
        const tooltipSpan = chip.querySelector('.tooltip');
        if (tooltipSpan) {
            chip.classList.add('has-tooltip');
            tooltipSpan.textContent = chip.dataset.tooltip;
        }
    });

    // For dynamically added tooltips on strong tags
    document.querySelectorAll('.content-section strong[data-tooltip]').forEach(highlight => {
        if (!highlight.querySelector('.tooltip')) {
            highlight.classList.add('has-tooltip');
            const tooltipElement = document.createElement('span');
            tooltipElement.className = 'tooltip';
            tooltipElement.textContent = highlight.dataset.tooltip;
            highlight.appendChild(tooltipElement);
        }
    });
}

/**
 * Handles text selection to show the custom popover menu.
 * @param {Event} e - The mouseup or click event.
 */
export function handleTextSelection(e) {
    // Do not trigger popover if interacting with UI elements
    if (e.target.closest('.draggable-panel, #selection-popover, .fixed-tool-container, #system-info-widget, .project-context-menu, .session-context-menu')) {
        return;
    }

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // removeContextMenu(); // This should be handled in a more central place

    if (selectedText.length > 3) {
        updateState('lastSelectedText', selectedText);
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        let top = rect.top + window.scrollY - selectionPopover.offsetHeight - 10;
        let left = rect.left + window.scrollX + (rect.width / 2) - (selectionPopover.offsetWidth / 2);

        // Adjust position to stay within viewport
        if (top < window.scrollY) {
            top = rect.bottom + window.scrollY + 10;
        }
        left = Math.max(5, Math.min(left, window.innerWidth - selectionPopover.offsetWidth - 5));

        selectionPopover.style.top = \px;
        selectionPopover.style.left = \px;
        selectionPopover.style.display = 'flex';
    } else if (!e.target.closest('#selection-popover')) {
        selectionPopover.style.display = 'none';
    }
}
