// main_test.js
// This script tries to import a module from a sub-folder.

import { message } from './js_test/module_test.js';

console.log(message); // "Hello from module_test.js!"
console.log('Hello from main_test.js!');
