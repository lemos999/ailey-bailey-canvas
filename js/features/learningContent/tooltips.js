/*
--- Module: tooltips.js ---
Description: Initializes all tooltips in the learning content.
*/

export function initializeTooltips() {
    document.querySelectorAll('.keyword-chip[data-tooltip]').forEach(chip => {
        if (chip.querySelector('.tooltip')) {
            chip.classList.add('has-tooltip');
            chip.querySelector('.tooltip').textContent = chip.dataset.tooltip;
        }
    });

    document.querySelectorAll('.content-section strong[data-tooltip]').forEach(highlight => {
        if(!highlight.querySelector('.tooltip')) {
            highlight.classList.add('has-tooltip');
            const tooltipElement = document.createElement('span');
            tooltipElement.className = 'tooltip';
            tooltipElement.textContent = highlight.dataset.tooltip;
            highlight.appendChild(tooltipElement);
        }
    });
}