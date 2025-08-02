/*
 * File: patch.js
 * Author: System Architect Ailey
 * Description: This script applies a patch to fix the bug where the note editor view is always visible.
 * Version: 14.1
 *
 * Changes:
 * - Patches `style_notes.css` to remove the `display: flex;` rule from the `#note-editor-view` selector,
 *   resolving the CSS specificity issue.
 */

(function() {
    console.log("Starting patch process: v14.1");

    const filesToPatch = {
        "style_notes.css": `
/*
--- Ailey & Bailey Canvas ---
File: style_notes.css
Version: 14.1 (Bug Fix)
Architect: [Username] & System Architect Ailey
Description: Styles for the enhanced Notes App panel, now integrating Toast UI Editor. Fixes a bug where the editor view was always visible due to a CSS specificity issue.
*/

/* Notes App Panel General */
#notes-app-panel { bottom: 100px; left: 100px; width: 600px; /* Increased default width */ height: 700px; /* Increased default height */ padding: 0; overflow: hidden; /* Prevent internal scrollbar */ }
.notes-view { display: none; flex-direction: column; height: 100%; }
.notes-view.active { display: flex; }
#notes-app-panel .panel-header { width: 100%; box-sizing: border-box; }

/* Action Bar (Replaces .list-header) */
.action-bar { padding: 10px 15px; display: flex; gap: 10px; align-items: center; border-bottom: 1px solid var(--border-color-dark); justify-content: space-between; flex-wrap: wrap; }
body:not(.dark-mode) .action-bar { border-bottom-color: var(--border-color-light); }
.action-bar-group { display: flex; gap: 10px; align-items: center; }
.action-bar-group.left { justify-content: flex-start; }
.action-bar-group.center { flex-grow: 1; justify-content: center; min-width: 120px; }
.action-bar-group.right { justify-content: flex-end; }
.search-input-notes { flex-grow: 1; padding: 8px 12px; border-radius: 20px; border: 1px solid var(--border-color-dark); background-color: var(--quote-bg-dark); color: var(--text-color-dark); }
body:not(.dark-mode) .search-input-notes { border-color: var(--border-color-light); background-color: var(--quote-bg-light); color: var(--text-color-light); }
.notes-btn { padding: 8px 15px; border-radius: 20px; border: none; cursor: pointer; background-color: var(--h2-color-dark); color: white; display: flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; }
body:not(.dark-mode) .notes-btn { background-color: var(--h2-color-light); }
.notes-btn svg { width: 16px; height: 16px; fill: currentColor; }

/* More Options Dropdown */
.more-options-container { position: relative; }
.more-options-btn { background: none; border: none; padding: 5px; cursor: pointer; line-height: 0; border-radius: 50%; }
.more-options-btn:hover { background-color: rgba(128, 128, 128, 0.2); }
.dropdown-menu { display: none; position: absolute; top: 100%; right: 0; background-color: var(--container-bg-dark); border: 1px solid var(--border-color-dark); border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 1550; padding: 5px; min-width: 180px; }
body:not(.dark-mode) .dropdown-menu { background-color: var(--container-bg-light); border-color: var(--border-color-light); }
.dropdown-menu.show { display: block; }
.dropdown-item { background: none; border: none; color: inherit; padding: 8px 12px; width: 100%; text-align: left; cursor: pointer; border-radius: 4px; font-family: 'Gowun Batang', serif; font-size: 1em; display: flex; align-items: center; gap: 8px; }
body:not(.dark-mode) .dropdown-item:hover { background-color: var(--quote-bg-light); }
body.dark-mode .dropdown-item:hover { background-color: var(--quote-bg-dark); }
.dropdown-separator { height: 1px; background-color: var(--border-color-dark); margin: 4px 8px; }
body:not(.dark-mode) .dropdown-separator { background-color: var(--border-color-light); }

/* Note List & Project Styles */
#notes-list { flex-grow: 1; overflow-y: auto; padding: 10px; }
.note-group-header { font-size: 0.9em; font-weight: bold; padding: 15px 5px 5px 5px; color: var(--sub-text-color-dark); }
body:not(.dark-mode) .note-group-header { color: var(--sub-text-color-light); }
.note-project-container { margin-bottom: 5px; }
.note-project-header { display: flex; align-items: center; padding: 10px 5px; border-radius: 6px; cursor: pointer; transition: background-color 0.2s, border 0.2s; position: relative; }
body:not(.dark-mode) .note-project-header:hover { background-color: var(--quote-bg-light); }
body.dark-mode .note-project-header:hover { background-color: var(--quote-bg-dark); }

.note-project-header.drag-over { background-color: var(--h2-border-light) !important; border: 1px dashed var(--h2-color-light); }
body.dark-mode .note-project-header.drag-over { background-color: var(--h2-border-dark) !important; border-color: var(--h2-color-dark); }

.note-project-toggle-icon { transition: transform 0.2s ease-in-out; margin-right: 5px; line-height: 0; }
.note-project-toggle-icon.expanded { transform: rotate(90deg); }
.note-project-icon { margin-right: 8px; line-height: 0; }
.note-project-header svg { fill: currentColor; }
.note-project-title { font-weight: bold; flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.note-count { font-size: 0.8em; color: var(--sub-text-color-dark); margin-left: 8px; font-weight: normal; }
body:not(.dark-mode) .note-count { color: var(--sub-text-color-light); }

.note-project-title-input, .note-item-title-input { font-weight: bold; flex-grow: 1; border: none; background: transparent; color: inherit; padding: 2px 4px; border-radius: 4px; outline: 1px solid; font-family: 'Gowun Batang', serif; font-size: 1em; box-sizing: border-box; }
body.dark-mode .note-project-title-input, body.dark-mode .note-item-title-input { outline-color: var(--header-color-dark); }
body:not(.dark-mode) .note-project-title-input, body:not(.dark-mode) .note-item-title-input { outline-color: var(--header-color-light); }

.notes-in-project { padding-left: 20px; max-height: 0; overflow: hidden; transition: max-height 0.3s ease-in-out; }
.notes-in-project.expanded { max-height: 1000px; }

.note-context-menu { position: absolute; background-color: var(--container-bg-dark); border: 1px solid var(--border-color-dark); border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 1550; padding: 5px; display: none; min-width: 200px; font-size: 0.95em; }
body:not(.dark-mode) .note-context-menu { background-color: var(--container-bg-light); border-color: var(--border-color-light); }
.note-context-menu .context-menu-item { background: none; border: none; color: inherit; padding: 8px 12px; width: 100%; text-align: left; cursor: pointer; border-radius: 4px; font-family: 'Gowun Batang', serif; font-size: 1em; display: flex; justify-content: space-between; align-items: center; }
body:not(.dark-mode) .note-context-menu .context-menu-item:not([disabled]):hover { background-color: var(--quote-bg-light); }
body.dark-mode .note-context-menu .context-menu-item:not([disabled]):hover { background-color: var(--quote-bg-dark); }
.note-context-menu .context-menu-item span { flex-grow: 1; }
.note-context-menu .context-menu-item .icon { margin-right: 10px; opacity: 0.8; }
.note-context-menu .context-menu-item .submenu-arrow { font-size: 0.8em; }
.note-context-menu .context-menu-item[disabled] { opacity: 0.5; cursor: not-allowed; }
.note-context-menu .context-menu-separator { height: 1px; background-color: var(--border-color-dark); margin: 4px 8px; }
body:not(.dark-mode) .note-context-menu .context-menu-separator { background-color: var(--border-color-light); }
.note-context-menu .context-submenu-container { position: relative; }
.note-context-menu .context-submenu { display: none; position: absolute; left: 100%; top: -6px; background-color: inherit; border: 1px solid var(--border-color-dark); border-radius: 6px; box-shadow: inherit; padding: 5px; min-width: 150px; }
body:not(.dark-mode) .note-context-menu .context-submenu { border-color: var(--border-color-light); }
.note-context-menu .context-submenu-container:hover > .context-submenu { display: block; }
.note-context-menu .context-meta-info { font-size: 0.8em; opacity: 0.6; padding: 6px 12px; }

/* Note Item */
.note-item { padding: 12px 15px; border-radius: 6px; margin-bottom: 8px; cursor: pointer; transition: background-color 0.2s; position: relative; }
.note-item.is-dragging { opacity: 0.5; background-color: var(--h2-border-dark); cursor: grabbing; }
.note-item.pinned { /* You can add a specific style for pinned notes if needed */ }
.note-item:hover { background-color: var(--quote-bg-dark); }
body:not(.dark-mode) .note-item:hover { background-color: var(--quote-bg-light); }
.note-item-title { font-weight: bold; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.note-item-date { font-size: 0.8em; opacity: 0.7; }
.note-item-actions { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); display: flex; gap: 5px; opacity: 0; transition: opacity 0.2s; pointer-events: none; }
.note-item:hover .note-item-actions { opacity: 1; pointer-events: auto; }

/* --- [NEW & FIXED] Editor View Styles for Toast UI Editor --- */
#note-editor-view {
    flex-direction: column;
    height: 100%;
}
#note-editor-view .editor-header { padding: 10px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color-dark); }
body:not(.dark-mode) #note-editor-view .editor-header { border-bottom-color: var(--border-color-light); }
#note-title-input { font-size: 1.2em; font-weight: bold; width: 100%; border: none; background: transparent; padding: 10px 15px; color: inherit; }

/* [NEW] Toast UI Editor Container */
#toast-editor {
    flex-grow: 1; /* Makes the editor fill the available space */
    width: 100%;
    box-sizing: border-box;
}

#auto-save-status { font-size: 0.8em; padding: 5px 15px; text-align: right; opacity: 0.7; }

/* Placeholder Styles for Intelligent Features */
.tag-container { padding: 5px 15px 10px; display: flex; flex-wrap: wrap; gap: 8px; }
.note-tag { background-color: var(--h2-border-dark); color: var(--text-color-dark); padding: 3px 10px; border-radius: 15px; font-size: 0.85em; cursor: pointer; }
body:not(.dark-mode) .note-tag { background-color: var(--h2-border-light); color: var(--text-color-light); }
`
    };

    function downloadFile(filename, content) {
        const element = document.createElement('a');
        const isCSS = filename.endsWith('.css');
        
        let fileContent = content;
        if (!isCSS) {
           fileContent = `--- START OF FILE ${filename} ---\n\n${content}`;
        }

        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(fileContent));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    let modifiedCount = 0;
    for (const filename in filesToPatch) {
        if (Object.hasOwnProperty.call(filesToPatch, filename)) {
            downloadFile(filename, filesToPatch[filename].trim());
            modifiedCount++;
        }
    }

    console.log(`Patch process completed. ${modifiedCount} file(s) patched and downloaded.`);
    alert(`[System Architect] 패치 완료: ${modifiedCount}개의 파일이 수정되었습니다.\n\n다운로드된 'style_notes.css' 파일의 전체 내용을 복사하여 기존 파일에 덮어쓰십시오.`);

})();