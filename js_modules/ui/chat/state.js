/*
 * chat/state.js: Manages the state specifically for the chat and project UI.
 * This is now largely a wrapper around the global state for chat-related concerns.
 * Most state has been moved to core/state.js
 */
import * as State from '../../core/state.js';

// This file is kept for architectural clarity, but most of its original
// content has been promoted to the global state module (core/state.js)
// to allow other modules (like Notes backup) to access chat data.

// You can add chat-specific, non-persistent UI state here if needed in the future.
// For example:
// export let isTypingIndicatorVisible = false;
// export function setTypingIndicator(visible) { isTypingIndicatorVisible = visible; }
