/* --- Ailey & Bailey Canvas --- */
// File: 311_notes_drawing_canvas.js
// Version: 9.1 (Context Menu Fix)
// Description: Replaced Fabric.js event listener with a standard 'contextmenu' event on the wrapper to reliably prevent the default browser menu.

const DrawingCanvas = (() => {
    const FABRIC_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js';
    let _isInitialized = false;
    let _debouncedSave;
    let lastReceivedDrawingData = null;

    // --- History/Undo State ---
    let _historyStack = [];
    let _historyIndex = -1;
    let _isProcessingHistory = false;
    const HISTORY_LIMIT = 50;

    const _loadScript = () => {
        return new Promise((resolve, reject) => {
            if (typeof fabric !== 'undefined') {
                trace("System.Drawing", "loadScript.cacheHit");
                return resolve();
            }
            trace("System.Drawing", "loadScript.request", { url: FABRIC_CDN_URL });
            const script = document.createElement('script');
            script.src = FABRIC_CDN_URL;
            script.onload = () => {
                trace("System.Drawing", "loadScript.success");
                resolve();
            };
            script.onerror = () => {
                trace("System.Drawing", "loadScript.error", {}, {}, "ERROR");
                reject(new Error('Failed to load Fabric.js library.'));
            };
            document.head.appendChild(script);
        });
    };
    
    const _setupCanvas = () => {
        if (!drawingCanvasOverlay) {
            console.error("Drawing canvas overlay element not found.");
            return;
        }

        fabricCanvasInstance = new fabric.Canvas(drawingCanvasOverlay, {
            isDrawingMode: false,
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: 'transparent'
        });

        _debouncedSave = debounce(() => _saveToFirestore(), 1000);
        
        fabricCanvasInstance.on('mouse:up', (options) => {
             // Do not save state on right-click up, as it's for context menu.
             if (options.e.button === 2) return;
             // Save state after user finishes a drawing or modification action.
             _saveState();
             _debouncedSave();
        });

        // [FIX] Use the standard 'contextmenu' event on the wrapper element to prevent default browser menu.
        fabricCanvasInstance.wrapperEl.addEventListener('contextmenu', (event) => {
            event.preventDefault();

            if (!fabricCanvasInstance) return;

            const activeSelection = fabricCanvasInstance.getActiveObject();
            
            const menuItems = [
                {
                    label: '삭제',
                    disabled: !activeSelection,
                    action: () => {
                        if (activeSelection && fabricCanvasInstance) {
                            fabricCanvasInstance.getActiveObjects().forEach(obj => {
                                fabricCanvasInstance.remove(obj);
                            });
                            fabricCanvasInstance.discardActiveObject().renderAll();
                            // Save state after deletion for undo and persistence
                            _saveState();
                            _debouncedSave();
                        }
                    }
                }
            ];
            
            // Use the global context menu utility
            createContextMenu(menuItems, event);
        });
        
        let isTicking = false;
        const handleScroll = () => {
            if (!isTicking) {
                window.requestAnimationFrame(() => {
                    if (fabricCanvasInstance) {
                        fabricCanvasInstance.viewportTransform[5] = -window.scrollY;
                        fabricCanvasInstance.renderAll();
                    }
                    isTicking = false;
                });
                isTicking = true;
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });

        const debouncedResizeHandler = debounce(() => {
            if (!fabricCanvasInstance) return;
            fabricCanvasInstance.setWidth(window.innerWidth);
            fabricCanvasInstance.setHeight(window.innerHeight);
            fabricCanvasInstance.renderAll();
        }, 150);
        window.addEventListener('resize', debouncedResizeHandler);
        
        _saveState(); // Save the initial empty state.
        trace("System.Drawing", "CanvasSetup.success");
        _listenToFirestore();
    };

    const _listenToFirestore = () => {
        if (unsubscribeFromDrawing) unsubscribeFromDrawing();
        if (!canvasDrawingsCollectionRef) return;
        
        const docRef = canvasDrawingsCollectionRef.doc(canvasId);
        unsubscribeFromDrawing = docRef.onSnapshot(doc => {
            trace("Firestore", "drawing.onSnapshot", { hasData: doc.exists });
            if (doc.exists) {
                const data = doc.data();
                if (data.drawingData && data.drawingData !== lastReceivedDrawingData) {
                    lastReceivedDrawingData = data.drawingData;
                    _loadFromData(data.drawingData);
                }
            } else {
                if (fabricCanvasInstance) fabricCanvasInstance.clear();
                lastReceivedDrawingData = null;
                 _historyStack = [];
                 _historyIndex = -1;
                 _saveState(); // Re-initialize history for a cleared canvas
            }
        }, err => {
            console.error("Error listening to drawing data:", err);
            trace("Firestore", "drawing.onSnapshot.error", { error: err.message }, {}, "ERROR");
        });
    };

    const _loadFromData = (firestoreData) => {
        if (!fabricCanvasInstance) return;
        trace("System.Drawing", "loadFromData.start");

        _isProcessingHistory = true; // Prevent re-saving during load
        fabricCanvasInstance.loadFromJSON(firestoreData, () => {
            fabricCanvasInstance.viewportTransform[5] = -window.scrollY;
            fabricCanvasInstance.renderAll();
            // After loading, reset and save this as the new initial state.
            _historyStack = [fabricCanvasInstance.toJSON()];
            _historyIndex = 0;
            _isProcessingHistory = false;
            trace("System.Drawing", "loadFromData.success");
        });
    };
    
    // --- History Management ---
    const _saveState = () => {
        if (_isProcessingHistory || !fabricCanvasInstance) return;
        
        // Clear any 'redo' history
        _historyStack.splice(_historyIndex + 1);

        const state = fabricCanvasInstance.toJSON();
        _historyStack.push(state);
        
        // Enforce history limit
        if (_historyStack.length > HISTORY_LIMIT) {
            _historyStack.shift();
        }

        _historyIndex = _historyStack.length - 1;
        trace("System.Drawing", "saveState", { historySize: _historyStack.length, index: _historyIndex });
    };

    const _saveToFirestore = () => {
        if (!fabricCanvasInstance || !canvasDrawingsCollectionRef) return;
        
        // Save the current state which is the last in the stack
        const jsonString = JSON.stringify(_historyStack[_historyIndex]);
        lastReceivedDrawingData = jsonString;

        trace("Firestore", "drawing.save.request");
        canvasDrawingsCollectionRef.doc(canvasId).set({
            drawingData: jsonString,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(err => {
            console.error("Error saving drawing:", err);
            trace("Firestore", "drawing.save.error", { error: err.message }, {}, "ERROR");
        });
    };
    
    // --- Public API ---
    
    const initialize = async () => {
        if (_isInitialized) return;
        try {
            await _loadScript();
            _setupCanvas();
            if (drawingToolbar) drawingToolbar.style.display = 'none';
            _isInitialized = true;
        } catch (error) {
            console.error(error);
            alert("드로잉 라이브러리를 불러오는 데 실패했습니다. 페이지를 새로고침 해주세요.");
        }
    };

    const toggleMode = () => {
        if (!fabricCanvasInstance || !fabricCanvasInstance.wrapperEl) return;

        isDrawingModeActive = !isDrawingModeActive;
        trace("System.Drawing", "toggleMode", { active: isDrawingModeActive });
        
        const wrapperEl = fabricCanvasInstance.wrapperEl;
        const toolbarEl = drawingToolbar;

        if (isDrawingModeActive) {
            wrapperEl.style.pointerEvents = 'auto';
            if (toolbarEl) {
                toolbarEl.style.display = 'flex';
                if (typeof DrawingToolbar.setActiveTool === 'function') {
                    const penButton = toolbarEl.querySelector('[data-tool="pen"]');
                    if (penButton && !penButton.classList.contains('active')) {
                         DrawingToolbar.setActiveTool('pen');
                    }
                }
            }
            document.body.classList.add('drawing-mode-active');
        } else {
            wrapperEl.style.pointerEvents = 'none';
            if (toolbarEl) toolbarEl.style.display = 'none';
            document.body.classList.remove('drawing-mode-active');
            fabricCanvasInstance.isDrawingMode = false;
        }
    };
    
    const setTool = (tool) => {
        if (!fabricCanvasInstance) return;
        trace("System.Drawing", "setTool", { tool });
        
        fabricCanvasInstance.isDrawingMode = (tool !== 'select');

        if (tool === 'pen' || tool === 'highlighter') {
            fabricCanvasInstance.freeDrawingBrush = new fabric.PencilBrush(fabricCanvasInstance);
            const isDarkMode = document.body.classList.contains('dark-mode');
            fabricCanvasInstance.freeDrawingBrush.color = (tool === 'highlighter') 
                ? 'rgba(255, 230, 0, 0.35)' 
                : (isDarkMode ? '#FFFFFF' : '#000000');
            fabricCanvasInstance.freeDrawingBrush.width = (tool === 'highlighter') ? 20 : 2;
        }
    };
    
    const undo = () => {
        if (_historyIndex <= 0) {
            trace("System.Drawing", "undo.ignored", { reason: "At initial state" });
            return;
        }

        trace("System.Drawing", "undo.start", { fromIndex: _historyIndex });
        _isProcessingHistory = true;
        _historyIndex--;
        const prevState = _historyStack[_historyIndex];

        fabricCanvasInstance.loadFromJSON(prevState, () => {
            fabricCanvasInstance.renderAll();
            _isProcessingHistory = false;
            // After undoing, we should also save this state to Firestore
            _debouncedSave();
            trace("System.Drawing", "undo.end", { toIndex: _historyIndex });
        });
    };

    const setBrushColor = (color) => {
        if (fabricCanvasInstance && fabricCanvasInstance.freeDrawingBrush) {
            fabricCanvasInstance.freeDrawingBrush.color = color;
        }
    };
    
    const setBrushWidth = (width) => {
        if (fabricCanvasInstance && fabricCanvasInstance.freeDrawingBrush) {
            fabricCanvasInstance.freeDrawingBrush.width = parseInt(width, 10) || 2;
        }
    };

    const clearCanvas = () => {
        if (fabricCanvasInstance) {
            showModal("현재 캔버스의 모든 그림을 지우시겠습니까?", () => {
                fabricCanvasInstance.clear();
                // Save this new cleared state to history and Firestore
                _saveState();
                _saveToFirestore();
            });
        }
    };

    return {
        initialize,
        toggleMode,
        setTool,
        setBrushColor,
        setBrushWidth,
        clearCanvas,
        undo
    };
})();