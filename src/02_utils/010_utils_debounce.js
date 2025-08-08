/*
--- Ailey & Bailey Canvas ---
File: 010_utils_debounce.js
Version: 1.0 (Bundled)
Description: Provides a generic debounce utility function.
*/

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}