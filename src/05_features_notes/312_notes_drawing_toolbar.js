/* --- Ailey & Bailey Canvas --- */
// File: 312_notes_drawing_toolbar.js
// Version: 4.0 (Undo Button)
// Description: Replaced the eraser tool with an 'Undo' button, providing a more reliable way to correct drawing mistakes.

const DrawingToolbar = (() => {

    const _render = () => {
        if (!drawingToolbar) return;
        
        const isDarkMode = document.body.classList.contains('dark-mode');
        const defaultPenColor = isDarkMode ? '#FFFFFF' : '#000000';

        drawingToolbar.innerHTML = `
            <button class="toolbar-btn" data-tool="select" title="선택"><svg viewBox="0 0 24 24" width="24" height="24"><path d="M13.6,12.3L24,22.7L22.7,24L12.3,13.6L11,12.3V11H9.7L2.3,3.6L3.6,2.3L11,9.7H12.3L13.6,11M17.5,1C19.4,1 21,2.6 21,4.5C21,5.5 20.6,6.5 19.9,7.1L19.2,7.8L16.2,4.8L16.9,4.1C17.5,3.4 18.5,3 19.5,3C20.4,3 21,3.6 21,4.5C21,5.4 20.4,6 19.5,6C19.2,6 19,5.9 18.8,5.8L17.5,7.1C18.1,7.7 19,8 20,8C21.7,8 23,6.7 23,5C23,2.8 21.2,1 19.5,1M1,17.5C1,15.6 2.6,14 4.5,14C5.5,14 6.5,14.4 7.1,15.1L7.8,15.8L4.8,18.8L4.1,18.1C3.4,17.5 3,16.5 3,15.5C3,14.6 3.6,14 4.5,14C5.4,14 6,14.6 6,15.5C6,15.8 5.9,16 5.8,16.2L7.1,17.5C7.7,16.9 8,16 8,15C8,13.3 6.7,12 5,12C2.8,12 1,13.8 1,15.5Z" /></svg></button>
            <button class="toolbar-btn active" data-tool="pen" title="펜 (1-4)"><svg viewBox="0 0 24 24" width="24" height="24"><path d="M14.06,9L15,9.94L5.92,19H5V18.08L14.06,9M17.66,3C17.41,3 17.15,3.1 16.96,3.29L15.13,5.12L18.88,8.87L20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18.17,3.09 17.92,3 17.66,3M14.06,6.19L3,17.25V21H6.75L17.81,9.94L14.06,6.19Z" /></svg></button>
            <button class="toolbar-btn" data-tool="highlighter" title="형광펜 (5)"><svg viewBox="0 0 24 24" width="24" height="24"><path d="M18.5,1.15L17.35,0L7,10.35L8.15,11.5L18.5,1.15M7,12.5L12.35,7.15L16.85,11.65L11.5,17H9.5V15L7,12.5M17,14.88V22H15V14.88L13.85,13.73L15,12.6L16,13.6L17,12.6L18.15,13.73L17,14.88M5,20H2V22H5V20Z" /></svg></button>
            <button class="toolbar-btn" data-tool="undo" title="실행 취소 (6)"><svg viewBox="0 0 24 24" width="24" height="24"><path d="M12.5,8C9.85,8 7.45,9 5.6,10.6L2,7V16H11L7.38,12.38C8.77,11.22 10.54,10.5 12.5,10.5C16.04,10.5 19.05,12.81 20.1,16L22.47,15.22C21.07,11.03 17.15,8 12.5,8Z" /></svg></button>
            <div class="toolbar-separator"></div>
            <input type="color" id="drawing-color-picker" class="toolbar-color-picker" value="${defaultPenColor}" title="색상 선택">
            <div class="toolbar-slider-container">
                <input type="range" id="drawing-width-slider" min="1" max="50" value="2" title="선 굵기 (Q/E 키로 조절)">
                <span id="drawing-width-value">2</span>
            </div>
             <div class="toolbar-separator"></div>
             <button class="toolbar-btn" data-tool="clear" title="모두 지우기 (7)"><svg viewBox="0 0 24 24" width="24" height="24"><path d="M19.36,2.72L20.78,4.14L15.06,9.85L16.48,11.27L22.19,5.56L23.61,6.97C23.22,7.95 22.54,8.78 21.66,9.38L20.41,8.13C20.83,7.5 21.05,6.78 21.05,6C21.05,4.82 20.39,3.78 19.36,2.72M12,9C13.66,9 15,10.34 15,12C15,13.66 13.66,15 12,15C10.34,15 9,13.66 9,12C9,10.34 10.34,9 12,9M2.39,6.97L3.81,5.56L9.52,11.27L8.1,9.85L2.39,4.14L0.97,2.72C1.5,2.14 2.16,1.64 2.93,1.27L4.18,2.53C3.55,3.17 3,3.96 3,4.87C3,6.05 3.67,7.09 4.7,8.14L2.39,6.97M20.41,15.87L21.66,14.62C22.54,15.22 23.22,16.05 23.61,17.03L22.19,18.44L16.48,12.73L15.06,14.15L20.78,19.86L19.36,21.28C18.4,22.26 17.18,23 15.87,23C14.96,23 14.17,22.45 13.54,21.82L14.79,20.57C15.17,20.84 15.58,21 16,21C17.22,21 18.22,20.33 19.14,19.31L12,12.17L4.86,19.31C3.95,20.33 2.78,21 1.5,21C1.09,21 0.68,20.84 0.3,20.57L1.55,19.31C2.46,18.4 3,17.22 3,16C3,15.22 3.16,14.5 3.47,13.82L2.39,17.03L0.97,18.44C1.36,19.42 2,20.24 2.93,20.73L4.18,21.47L2.93,22.72C3.5,23.3 4.22,23.75 5,23.95V22C5,20.95 5.32,19.95 5.88,19.12L12,13L18.12,19.12C18.68,19.68 19.05,20.4 19.05,21.13V22C19.84,21.75 20.5,21.3 21.07,20.72L22.32,21.97L20.41,15.87Z" /></svg></button>
        `;
    };

    const _updateActiveButton = (tool) => {
        if (!drawingToolbar) return;
        const buttons = drawingToolbar.querySelectorAll('.toolbar-btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        const activeBtn = drawingToolbar.querySelector(`[data-tool="${tool}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    };

    const updateBrushSizeUI = (size) => {
        if (!drawingToolbar) return;
        const widthSlider = document.getElementById('drawing-width-slider');
        const widthValue = document.getElementById('drawing-width-value');
        if (widthSlider && widthValue) {
            const newSize = parseInt(size, 10);
            widthSlider.value = newSize;
            widthValue.textContent = newSize;
        }
    };
    
    const setActiveTool = (tool, options = {}) => {
        if (!drawingToolbar || !DrawingCanvas) return;
        trace("UI.Drawing", "setActiveTool", { tool, options: JSON.stringify(options) });
        
        const colorPicker = document.getElementById('drawing-color-picker');
        
        DrawingCanvas.setTool(tool);
        _updateActiveButton(tool);

        let newBrushSize;
        switch(tool) {
            case 'pen':
                const color = options.color || (document.body.classList.contains('dark-mode') ? '#FFFFFF' : '#000000');
                DrawingCanvas.setBrushColor(color);
                if (colorPicker) colorPicker.value = options.color || (document.body.classList.contains('dark-mode') ? '#FFFFFF' : '#000000');
                newBrushSize = 2;
                break;
            case 'highlighter':
                DrawingCanvas.setBrushColor('rgba(255, 230, 0, 0.35)');
                if (colorPicker) colorPicker.value = '#ffe600';
                newBrushSize = 20;
                break;
        }
        
        if (newBrushSize !== undefined) {
            DrawingCanvas.setBrushWidth(newBrushSize);
            updateBrushSizeUI(newBrushSize);
        }
    };

    const initialize = () => {
        _render();

        drawingToolbar.addEventListener('click', (e) => {
            const btn = e.target.closest('.toolbar-btn');
            if (btn) {
                const tool = btn.dataset.tool;
                if (tool === 'clear') {
                    DrawingCanvas.clearCanvas();
                    return;
                }
                if (tool === 'undo') {
                    DrawingCanvas.undo();
                    return; // Undo is an action, not a tool state
                }
                setActiveTool(tool);
            }
        });

        const colorPicker = document.getElementById('drawing-color-picker');
        colorPicker.addEventListener('input', (e) => {
            let color = e.target.value;
             const activeTool = drawingToolbar.querySelector('.toolbar-btn.active')?.dataset.tool;
             if (activeTool === 'highlighter') {
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                color = `rgba(${r}, ${g}, ${b}, 0.35)`;
             }
            DrawingCanvas.setBrushColor(color);
        });

        const widthSlider = document.getElementById('drawing-width-slider');
        const widthValue = document.getElementById('drawing-width-value');
        widthSlider.addEventListener('input', (e) => {
            const width = e.target.value;
            widthValue.textContent = width;
            DrawingCanvas.setBrushWidth(width);
        });

        setActiveTool('pen');
    };

    return {
        initialize,
        setActiveTool,
        updateBrushSizeUI
    };

})();