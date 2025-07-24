// [V3.1] /js_modules/utils/logger.js
console.log('✅ [LOADED] /js_modules/utils/logger.js');
export const log = (module, message) => {
    // This '%c' caused the error with @"..."@ strings. Now it's safe.
    console.log(`%c[${module}]%c ${message}`, 'color: yellow; font-weight: bold;', 'color: unset;');
};
