// [Node.js Gen] /js_modules/utils/logger.js
console.log('✅ [LOADED] /js_modules/utils/logger.js');
export const log = (module, message) => {
    // The '%c' is now 100% safe from parsing errors.
    console.log(`%c[${module}]%c ${message}`, 'color: yellow; font-weight: bold;', 'color: unset;');
};
